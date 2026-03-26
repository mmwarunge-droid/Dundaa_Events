import os
from math import ceil
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session, joinedload
from app.services.notifications import create_notification

from app.dependencies import get_current_user, get_db, get_optional_current_user
from app.models.campaign import Campaign
from app.models.donation import Donation
from app.models.event import Event
from app.models.kyc_submission import KYCSubmission
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.campaign import (
    CampaignCreateRequest,
    CampaignDiscoveryResponse,
    CampaignResponse,
    CampaignShareClickRequest,
    CampaignShareClickResponse,
    CampaignUpdateRequest,
    DonationActivityItem,
    DonationCreateRequest,
    DonationCreateResponse,
)
from app.utils.payments import generate_reference

router = APIRouter(tags=["Campaigns"])

FRONTEND_BASE_URL = os.getenv("FRONTEND_BASE_URL", "http://localhost:5173")
SUPPORTED_PAYMENT_METHODS = {"mpesa", "card", "bank"}
SUPPORTED_CAMPAIGN_TYPES = {"free_event_crowdfund", "creator_fundraiser"}
SUPPORTED_CONTRIBUTION_TYPES = {"one_time", "recurring"}


def owner_has_approved_kyc(db: Session, owner_id: int) -> bool:
    submission = db.query(KYCSubmission).filter(
        KYCSubmission.user_id == owner_id,
        KYCSubmission.status == "approved"
    ).first()
    return submission is not None


def ensure_share_slug(campaign: Campaign) -> str:
    if campaign.share_slug:
        return campaign.share_slug
    campaign.share_slug = f"cmp-{campaign.id}-{uuid4().hex[:8]}"
    return campaign.share_slug


def build_share_url(campaign: Campaign) -> str:
    slug = campaign.share_slug or ensure_share_slug(campaign)
    return f"{FRONTEND_BASE_URL}/campaigns/{campaign.id}?share={slug}"


def progress_percentage(campaign: Campaign) -> float:
    if not campaign.goal_amount or campaign.goal_amount <= 0:
        return 0.0
    pct = (campaign.current_amount / campaign.goal_amount) * 100
    return round(min(pct, 999.0), 2)


def is_publicly_visible(campaign: Campaign, current_user: User | None) -> bool:
    is_public = campaign.is_live and campaign.approval_status == "approved"
    is_owner = current_user is not None and campaign.owner_id == current_user.id
    return is_public or is_owner


def serialize_campaign(campaign: Campaign, db: Session) -> dict:
    owner = campaign.owner
    verified = owner_has_approved_kyc(db, campaign.owner_id)

    payload = CampaignResponse.model_validate(campaign).model_dump()
    payload["progress_percentage"] = progress_percentage(campaign)
    payload["share_url"] = build_share_url(campaign)
    payload["owner_username"] = owner.username if owner else None
    payload["owner_verified"] = verified
    return payload


def build_payment_next_action(payment_method: str, reference: str, amount: float, phone: str) -> dict:
    if payment_method == "mpesa":
        return {
            "type": "mpesa_prompt",
            "message": "An M-Pesa payment prompt should be sent to the donor phone number.",
            "phone": phone,
            "reference": reference,
            "amount": amount,
        }

    if payment_method == "card":
        return {
            "type": "card_checkout",
            "message": "Redirect the donor to card payment flow.",
            "reference": reference,
            "amount": amount,
        }

    return {
        "type": "bank_transfer",
        "message": "Display Dundaa bank transfer details to the donor.",
        "reference": reference,
        "amount": amount,
        "bank_details": {
            "account_name": os.getenv("DUNDAA_BANK_ACCOUNT_NAME", "Dundaa Limited"),
            "account_number": os.getenv("DUNDAA_BANK_ACCOUNT_NUMBER", "0000000000"),
            "bank_name": os.getenv("DUNDAA_BANK_NAME", "Your Bank Name"),
            "branch": os.getenv("DUNDAA_BANK_BRANCH", "Main Branch"),
        },
    }


@router.get("/campaigns/discover", response_model=CampaignDiscoveryResponse)
def discover_campaigns(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    query: str | None = Query(default=None),
    campaign_type: str | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    campaigns = db.query(Campaign).options(
        joinedload(Campaign.owner),
        joinedload(Campaign.donations),
    ).all()

    query_lower = (query or "").strip().lower()
    type_lower = (campaign_type or "").strip().lower()

    filtered = []

    for campaign in campaigns:
        if not is_publicly_visible(campaign, current_user):
            continue

        if type_lower and campaign.campaign_type.strip().lower() != type_lower:
            continue

        if query_lower:
            haystack = " ".join([
                campaign.title or "",
                campaign.description or "",
                campaign.cause_description or "",
                campaign.beneficiary_name or "",
            ]).lower()

            if query_lower not in haystack and not all(token in haystack for token in query_lower.split()):
                continue

            campaign.search_hit_count = (campaign.search_hit_count or 0) + 1

        filtered.append(campaign)

    db.commit()

    filtered.sort(
        key=lambda c: (
            -(1 if c.is_live and c.approval_status == "approved" else 0),
            -((c.share_click_count or 0) * 3 + (c.search_hit_count or 0) * 2 + (c.donation_count or 0) * 4),
            c.deadline.isoformat() if c.deadline else "9999-12-31T00:00:00",
            c.created_at.isoformat() if c.created_at else "",
        )
    )

    total = len(filtered)
    total_pages = max(1, ceil(total / page_size))
    start = (page - 1) * page_size
    end = start + page_size

    items = [serialize_campaign(campaign, db) for campaign in filtered[start:end]]

    return CampaignDiscoveryResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/campaigns/mine", response_model=list[CampaignResponse])
def list_my_campaigns(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaigns = db.query(Campaign).options(
        joinedload(Campaign.owner)
    ).filter(
        Campaign.owner_id == current_user.id
    ).order_by(
        Campaign.created_at.desc()
    ).all()

    return [serialize_campaign(campaign, db) for campaign in campaigns]


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
def get_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    campaign = db.query(Campaign).options(
        joinedload(Campaign.owner),
        joinedload(Campaign.donations),
    ).filter(Campaign.id == campaign_id).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not is_publicly_visible(campaign, current_user):
        raise HTTPException(status_code=403, detail="This campaign is not currently available")

    return serialize_campaign(campaign, db)


@router.get("/campaigns/{campaign_id}/activity", response_model=list[DonationActivityItem])
def get_campaign_activity(
    campaign_id: int,
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not is_publicly_visible(campaign, current_user):
        raise HTTPException(status_code=403, detail="This campaign is not currently available")

    donations = db.query(Donation).filter(
        Donation.campaign_id == campaign_id,
        Donation.status == "succeeded",
    ).order_by(
        Donation.created_at.desc()
    ).limit(limit).all()

    items = []
    for donation in donations:
        donor_name = "Anonymous supporter" if donation.is_anonymous else donation.donor_name
        items.append(DonationActivityItem(
            id=donation.id,
            donor_display_name=donor_name,
            amount=donation.amount,
            contribution_type=donation.contribution_type,
            created_at=donation.created_at,
        ))
    return items


@router.post("/campaigns", response_model=CampaignResponse)
def create_campaign(
    payload: CampaignCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign_type = payload.campaign_type.strip()
    if campaign_type not in SUPPORTED_CAMPAIGN_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported campaign type")

    if campaign_type == "free_event_crowdfund":
        if not payload.linked_event_id:
            raise HTTPException(status_code=400, detail="linked_event_id is required for free event crowdfunding")

        event = db.query(Event).filter(
            Event.id == payload.linked_event_id,
            Event.owner_id == current_user.id,
        ).first()

        if not event:
            raise HTTPException(status_code=404, detail="Linked event not found or access denied")

        if event.has_ticket_sales:
            raise HTTPException(status_code=400, detail="Crowdfunding can only be attached to free events")

    campaign = Campaign(
        title=payload.title.strip(),
        description=payload.description.strip(),
        cause_description=payload.cause_description.strip() if payload.cause_description else None,
        beneficiary_name=payload.beneficiary_name.strip() if payload.beneficiary_name else None,
        campaign_type=campaign_type,
        cover_image_url=payload.cover_image_url.strip() if payload.cover_image_url else None,
        goal_amount=payload.goal_amount,
        current_amount=0.0,
        deadline=payload.deadline,
        linked_event_id=payload.linked_event_id,
        owner_id=current_user.id,
        allow_anonymous=payload.allow_anonymous,
        recurring_enabled=payload.recurring_enabled,
        is_live=True,
        approval_status="approved",
        share_click_count=0,
        search_hit_count=0,
        donation_count=0,
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    ensure_share_slug(campaign)
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return serialize_campaign(campaign, db)


@router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
def update_campaign(
    campaign_id: int,
    payload: CampaignUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = db.query(Campaign).filter(
        Campaign.id == campaign_id,
        Campaign.owner_id == current_user.id,
    ).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found or access denied")

    update_data = payload.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(campaign, field, value)

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return serialize_campaign(campaign, db)


@router.post("/campaigns/{campaign_id}/share/click", response_model=CampaignShareClickResponse)
def track_campaign_share_click(
    campaign_id: int,
    payload: CampaignShareClickRequest,
    db: Session = Depends(get_db),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.is_live or campaign.approval_status != "approved":
        raise HTTPException(status_code=403, detail="This campaign is not publicly shareable")

    ensure_share_slug(campaign)
    campaign.share_click_count = (campaign.share_click_count or 0) + 1

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return CampaignShareClickResponse(
        share_slug=campaign.share_slug,
        share_url=build_share_url(campaign),
        share_click_count=campaign.share_click_count,
    )


@router.post("/campaigns/{campaign_id}/donate", response_model=DonationCreateResponse)
async def donate_to_campaign(
    campaign_id: int,
    payload: DonationCreateRequest,
    db: Session = Depends(get_db),
    current_user: User | None = Depends(get_optional_current_user),
):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()

    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")

    if not campaign.is_live or campaign.approval_status != "approved":
        raise HTTPException(status_code=403, detail="This campaign is not accepting donations")

    payment_method = payload.payment_method.strip().lower()
    if payment_method not in SUPPORTED_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Unsupported payment method")

    contribution_type = payload.contribution_type.strip().lower()
    if contribution_type not in SUPPORTED_CONTRIBUTION_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported contribution type")

    if contribution_type == "recurring" and not campaign.recurring_enabled:
        raise HTTPException(status_code=400, detail="Recurring contributions are not enabled for this campaign")

    if payload.is_anonymous and not campaign.allow_anonymous:
        raise HTTPException(status_code=400, detail="Anonymous donations are not allowed for this campaign")

    reference = generate_reference("DONA")

    donation = Donation(
        campaign_id=campaign.id,
        donor_user_id=current_user.id if current_user else None,
        donor_name=payload.donor_name.strip(),
        donor_email=payload.donor_email.strip().lower(),
        donor_phone=payload.donor_phone.strip(),
        amount=payload.amount,
        payment_method=payment_method,
        contribution_type=contribution_type,
        is_anonymous=payload.is_anonymous,
        status="succeeded",  # production: set pending and finalize after webhook
        reference=reference,
    )
    db.add(donation)

    campaign.current_amount = float(campaign.current_amount or 0) + float(payload.amount)
    campaign.donation_count = int(campaign.donation_count or 0) + 1
    db.add(campaign)

    owner = db.query(User).filter(User.id == campaign.owner_id).first()
    if owner:
        owner.wallet_balance = float(owner.wallet_balance or 0) + float(payload.amount)
        db.add(owner)

    tx = Transaction(
        user_id=campaign.owner_id,
        tx_type="campaign_donation",
        provider=payment_method,
        gross_amount=payload.amount,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        influencer_amount=payload.amount,
        status="succeeded",
        reference=reference,
    )
    db.add(tx)

    db.commit()
    db.refresh(donation)

    if campaign.owner_id != (current_user.id if current_user else None):
        donor_name = "An anonymous supporter" if payload.is_anonymous else payload.donor_name.strip()

        await create_notification(
            db,
            user_id=campaign.owner_id,
            type="donation",
            title="New donation received",
            message=f"{donor_name} donated KES {payload.amount} to {campaign.title}.",
            link=f"/campaigns/{campaign.id}",
            entity_type="campaign",
            entity_id=campaign.id,
        )

    return DonationCreateResponse(
        donation_id=donation.id,
        reference=donation.reference,
        status=donation.status,
        total_amount=donation.amount,
        contribution_type=donation.contribution_type,
        next_action=build_payment_next_action(
            payment_method=payment_method,
            reference=reference,
            amount=donation.amount,
            phone=donation.donor_phone,
        ),
    )