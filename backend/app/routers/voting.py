from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.services.notifications import create_notification

from app.dependencies import get_current_admin_user, get_current_user, get_db
from app.models.coin_purchase import CoinPurchase
from app.models.contestant import Contestant
from app.models.kyc_submission import KYCSubmission
from app.models.transaction import Transaction
from app.models.user import User
from app.models.vote_transaction import VoteTransaction
from app.models.voting_campaign import VotingCampaign
from app.schemas.voting import (
    BuyCoinsRequest,
    BuyCoinsResponse,
    ContestantJoinRequest,
    ContestantResponse,
    LeaderboardItem,
    PrizeDistributionRequest,
    PrizeDistributionResult,
    VoteRequest,
    VoteResponse,
    VotingCampaignCreateRequest,
    VotingCampaignResponse,
    WalletResponse,
)
from app.utils.payments import generate_reference

router = APIRouter(tags=["Voting"])

SUPPORTED_PAYMENT_METHODS = {"mpesa", "card", "bank"}
COIN_PRICE_KES = 10.0
MAX_VOTE_CALLS_PER_MINUTE = 20

def build_rank_map(contestants: list[Contestant]) -> dict[int, int]:
    return {
        contestant.user_id: index + 1
        for index, contestant in enumerate(contestants)
    }

def build_payment_next_action(payment_method: str, reference: str, amount: float) -> dict:
    if payment_method == "mpesa":
        return {
            "type": "mpesa_prompt",
            "message": "An M-Pesa prompt should be sent to the user.",
            "reference": reference,
            "amount": amount,
        }

    if payment_method == "card":
        return {
            "type": "card_checkout",
            "message": "Redirect the user to card payment flow.",
            "reference": reference,
            "amount": amount,
        }

    return {
        "type": "bank_transfer",
        "message": "Display Dundaa bank details.",
        "reference": reference,
        "amount": amount,
    }


def user_has_approved_kyc(db: Session, user_id: int) -> bool:
    submission = db.query(KYCSubmission).filter(
        KYCSubmission.user_id == user_id,
        KYCSubmission.status == "approved",
    ).first()
    return submission is not None


def get_active_campaign_or_error(db: Session, campaign_id: int) -> VotingCampaign:
    campaign = db.query(VotingCampaign).filter(VotingCampaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(status_code=404, detail="Voting campaign not found")
    return campaign


def validate_vote_window(campaign: VotingCampaign) -> None:
    now = datetime.now(timezone.utc)

    if not campaign.is_active:
        raise HTTPException(status_code=400, detail="This voting campaign is inactive")

    if now < campaign.start_at:
        raise HTTPException(status_code=400, detail="Voting has not started yet")

    if now > campaign.end_at:
        raise HTTPException(status_code=400, detail="Voting has ended")


def enforce_vote_rate_limit(db: Session, voter_user_id: int) -> None:
    """
    Simple anti-fraud throttle:
    max vote actions per minute per user.
    """
    cutoff = datetime.now(timezone.utc) - timedelta(minutes=1)

    recent_count = db.query(VoteTransaction).filter(
        VoteTransaction.voter_user_id == voter_user_id,
        VoteTransaction.created_at >= cutoff,
    ).count()

    if recent_count >= MAX_VOTE_CALLS_PER_MINUTE:
        raise HTTPException(
            status_code=429,
            detail="Too many voting actions. Please slow down.",
        )


@router.get("/wallet", response_model=WalletResponse)
def get_wallet(
    current_user: User = Depends(get_current_user),
):
    return WalletResponse(
        cash_balance=float(current_user.wallet_balance or 0),
        coin_balance=int(current_user.coin_balance or 0),
    )


@router.post("/wallet/buy-coins", response_model=BuyCoinsResponse)
def buy_coins(
    payload: BuyCoinsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    payment_method = payload.payment_method.strip().lower()
    if payment_method not in SUPPORTED_PAYMENT_METHODS:
        raise HTTPException(status_code=400, detail="Unsupported payment method")

    amount_kes = payload.coins * COIN_PRICE_KES
    reference = generate_reference("COIN")

    purchase = CoinPurchase(
        user_id=current_user.id,
        coins=payload.coins,
        amount_paid=amount_kes,
        payment_method=payment_method,
        reference=reference,
        status="succeeded",  # production: pending until provider confirmation
    )
    db.add(purchase)

    current_user.coin_balance = int(current_user.coin_balance or 0) + int(payload.coins)
    db.add(current_user)

    tx = Transaction(
        user_id=current_user.id,
        tx_type="coin_purchase",
        provider=payment_method,
        gross_amount=amount_kes,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        influencer_amount=0.0,
        status="succeeded",
        reference=reference,
    )
    db.add(tx)

    db.commit()

    return BuyCoinsResponse(
        reference=reference,
        coins=payload.coins,
        amount_kes=amount_kes,
        status="succeeded",
        next_action=build_payment_next_action(payment_method, reference, amount_kes),
    )


@router.post("/voting-campaigns", response_model=VotingCampaignResponse)
def create_voting_campaign(
    payload: VotingCampaignCreateRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    if payload.end_at <= payload.start_at:
        raise HTTPException(status_code=400, detail="end_at must be later than start_at")

    total_pct = (
        float(payload.first_prize_percentage)
        + float(payload.second_prize_percentage)
        + float(payload.third_prize_percentage)
    )
    if round(total_pct, 2) != 100.0:
        raise HTTPException(status_code=400, detail="Prize percentages must total 100")

    campaign = VotingCampaign(
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
        linked_campaign_id=payload.linked_campaign_id,
        start_at=payload.start_at,
        end_at=payload.end_at,
        prize_pool_amount=payload.prize_pool_amount,
        first_prize_percentage=payload.first_prize_percentage,
        second_prize_percentage=payload.second_prize_percentage,
        third_prize_percentage=payload.third_prize_percentage,
        is_active=True,
        prizes_distributed=False,
        created_by_user_id=current_admin.id,
    )

    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    return campaign


@router.get("/voting-campaigns", response_model=list[VotingCampaignResponse])
def list_voting_campaigns(
    db: Session = Depends(get_db),
):
    campaigns = db.query(VotingCampaign).order_by(VotingCampaign.created_at.desc()).all()
    return campaigns


@router.get("/voting-campaigns/{campaign_id}", response_model=VotingCampaignResponse)
def get_voting_campaign(
    campaign_id: int,
    db: Session = Depends(get_db),
):
    campaign = get_active_campaign_or_error(db, campaign_id)
    return campaign


@router.post("/voting-campaigns/{campaign_id}/join", response_model=ContestantResponse)
def join_voting_campaign(
    campaign_id: int,
    payload: ContestantJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    campaign = get_active_campaign_or_error(db, campaign_id)

    if not user_has_approved_kyc(db, current_user.id):
        raise HTTPException(
            status_code=403,
            detail="Only KYC-approved users can join as contestants",
        )

    existing = db.query(Contestant).filter(
        Contestant.voting_campaign_id == campaign.id,
        Contestant.user_id == current_user.id,
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You have already joined this campaign")

    contestant = Contestant(
        voting_campaign_id=campaign.id,
        user_id=current_user.id,
        display_name=payload.display_name.strip(),
        avatar_url=payload.avatar_url.strip() if payload.avatar_url else None,
        total_votes=0,
    )
    db.add(contestant)
    db.commit()
    db.refresh(contestant)

    return contestant


@router.post("/vote", response_model=VoteResponse)
async def cast_vote(
    payload: VoteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    previous_contestants = db.query(Contestant).filter(
        Contestant.voting_campaign_id == payload.voting_campaign_id
    ).order_by(
        Contestant.total_votes.desc(),
        Contestant.created_at.asc(),
    ).all()
    previous_rank_map = build_rank_map(previous_contestants)

    contestant = db.query(Contestant).filter(Contestant.id == payload.contestant_id).first()
    if not contestant:
        raise HTTPException(status_code=404, detail="Contestant not found")

    campaign = get_active_campaign_or_error(db, contestant.voting_campaign_id)
    validate_vote_window(campaign)
    enforce_vote_rate_limit(db, current_user.id)

    if payload.coins <= 0:
        raise HTTPException(status_code=400, detail="Coins must be greater than zero")

    current_balance = int(current_user.coin_balance or 0)
    if current_balance < payload.coins:
        raise HTTPException(status_code=400, detail="Insufficient coin balance")

    reference = generate_reference("VOTE")

    current_user.coin_balance = current_balance - int(payload.coins)
    contestant.total_votes = int(contestant.total_votes or 0) + int(payload.coins)

    vote_tx = VoteTransaction(
        voter_user_id=current_user.id,
        voting_campaign_id=campaign.id,
        contestant_id=contestant.id,
        coins_used=payload.coins,
        reference=reference,
    )
    db.add(vote_tx)
    db.add(current_user)
    db.add(contestant)

    tx = Transaction(
        user_id=current_user.id,
        tx_type="vote_spend",
        provider="coin_wallet",
        gross_amount=float(payload.coins) * COIN_PRICE_KES,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        influencer_amount=0.0,
        status="succeeded",
        reference=reference,
    )
    db.add(tx)

    db.commit()
    db.refresh(contestant)
    updated_contestants = db.query(Contestant).filter(
        Contestant.voting_campaign_id == campaign.id
    ).order_by(
        Contestant.total_votes.desc(),
        Contestant.created_at.asc(),
    ).all()
    updated_rank_map = build_rank_map(updated_contestants)

    # notify the contestant who received the vote
    await create_notification(
        db,
        user_id=contestant.user_id,
        type="vote",
        title="You received new votes",
        message=f"{payload.coins} Dundaa Coin vote(s) were added to your contest entry.",
        link=f"/voting-campaigns/{campaign.id}",
        entity_type="voting_campaign",
        entity_id=campaign.id,
    )

    # notify contestants whose rank improved
    for ranked_contestant in updated_contestants:
        old_rank = previous_rank_map.get(ranked_contestant.user_id)
        new_rank = updated_rank_map.get(ranked_contestant.user_id)

        if old_rank is not None and new_rank is not None and new_rank < old_rank:
            await create_notification(
                db,
                user_id=ranked_contestant.user_id,
                type="rank_change",
                title="Your leaderboard rank improved",
                message=f"You moved from rank #{old_rank} to rank #{new_rank}.",
                link=f"/voting-campaigns/{campaign.id}",
                entity_type="voting_campaign",
                entity_id=campaign.id,
            )

    return VoteResponse(
        reference=reference,
        coins_used=payload.coins,
        remaining_coin_balance=int(current_user.coin_balance or 0),
        contestant_total_votes=int(contestant.total_votes or 0),
    )


@router.get("/voting-campaigns/{campaign_id}/leaderboard", response_model=list[LeaderboardItem])
def get_leaderboard(
    campaign_id: int,
    db: Session = Depends(get_db),
):
    campaign = get_active_campaign_or_error(db, campaign_id)

    contestants = db.query(Contestant).filter(
        Contestant.voting_campaign_id == campaign.id
    ).order_by(
        Contestant.total_votes.desc(),
        Contestant.created_at.asc(),
    ).all()

    leaderboard = []
    for index, contestant in enumerate(contestants, start=1):
        leaderboard.append(
            LeaderboardItem(
                rank=index,
                contestant_id=contestant.id,
                user_id=contestant.user_id,
                display_name=contestant.display_name,
                avatar_url=contestant.avatar_url,
                total_votes=int(contestant.total_votes or 0),
            )
        )

    return leaderboard


@router.post("/voting-campaigns/{campaign_id}/distribute-prizes", response_model=list[PrizeDistributionResult])
def distribute_prizes(
    campaign_id: int,
    payload: PrizeDistributionRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin_user),
):
    campaign = get_active_campaign_or_error(db, campaign_id)

    if campaign.prizes_distributed:
        raise HTTPException(status_code=400, detail="Prizes have already been distributed")

    if payload.first_prize_percentage is not None:
        campaign.first_prize_percentage = payload.first_prize_percentage
    if payload.second_prize_percentage is not None:
        campaign.second_prize_percentage = payload.second_prize_percentage
    if payload.third_prize_percentage is not None:
        campaign.third_prize_percentage = payload.third_prize_percentage

    total_pct = (
        float(campaign.first_prize_percentage)
        + float(campaign.second_prize_percentage)
        + float(campaign.third_prize_percentage)
    )
    if round(total_pct, 2) != 100.0:
        raise HTTPException(status_code=400, detail="Prize percentages must total 100")

    contestants = db.query(Contestant).filter(
        Contestant.voting_campaign_id == campaign.id
    ).order_by(
        Contestant.total_votes.desc(),
        Contestant.created_at.asc(),
    ).all()

    winners = contestants[:3]
    if not winners:
        raise HTTPException(status_code=400, detail="No contestants available for prize distribution")

    prize_percentages = [
        float(campaign.first_prize_percentage),
        float(campaign.second_prize_percentage),
        float(campaign.third_prize_percentage),
    ]

    results = []

    for rank, contestant in enumerate(winners, start=1):
        pct = prize_percentages[rank - 1]
        prize_amount = round((float(campaign.prize_pool_amount) * pct) / 100.0, 2)

        winner = db.query(User).filter(User.id == contestant.user_id).first()
        if winner:
            winner.wallet_balance = float(winner.wallet_balance or 0) + prize_amount
            db.add(winner)

        tx = Transaction(
            user_id=contestant.user_id,
            tx_type=f"voting_prize_rank_{rank}",
            provider="internal",
            gross_amount=prize_amount,
            tax_fee_amount=0.0,
            platform_fee_amount=0.0,
            influencer_amount=prize_amount,
            status="succeeded",
            reference=generate_reference(f"PRZ{rank}"),
        )
        db.add(tx)

        results.append(
            PrizeDistributionResult(
                contestant_id=contestant.id,
                user_id=contestant.user_id,
                display_name=contestant.display_name,
                rank=rank,
                prize_amount=prize_amount,
            )
        )

    campaign.prizes_distributed = True
    campaign.is_active = False
    db.add(campaign)

    db.commit()

    return results