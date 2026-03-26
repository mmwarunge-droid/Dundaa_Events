from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.dependencies import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.schemas.influencer import StarsResponse, CashoutRequest
from backend.app.utils.influencer import recalculate_user_tier
from backend.app.utils.payments import generate_reference

router = APIRouter(tags=["Influencer"])


@router.get("/stars", response_model=StarsResponse)
def get_stars(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    summary = recalculate_user_tier(db, current_user)
    return StarsResponse(**summary)


@router.post("/stars/decay")
def run_decay(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    summary = recalculate_user_tier(db, current_user)
    return {"message": "Star decay recalculated", **summary}


@router.post("/influencer/cashout")
def cashout(
    payload: CashoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):

    if current_user.influencer_tier != "super":
        raise HTTPException(403, "Only super influencers can cash out")

    if payload.amount < 1000:
        raise HTTPException(400, "Minimum cashout is KES 1000")

    if current_user.wallet_balance < payload.amount:
        raise HTTPException(400, "Insufficient balance")

    current_user.wallet_balance -= payload.amount

    tx = Transaction(
        user_id=current_user.id,
        tx_type="cashout",
        provider=payload.provider,
        gross_amount=payload.amount,
        influencer_amount=payload.amount,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        status="pending",
        reference=generate_reference("CASH"),
    )

    db.add(tx)
    db.add(current_user)
    db.commit()
    db.refresh(tx)

    return {
        "message": "Cashout requested",
        "reference": tx.reference,
        "amount": payload.amount
    }