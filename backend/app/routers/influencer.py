from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.models.transaction import Transaction
from app.schemas.influencer import StarsResponse, CashoutRequest
from app.utils.influencer import recalculate_user_tier
from app.utils.payments import generate_reference


router = APIRouter(tags=["Influencer"])


@router.get("/stars", response_model=StarsResponse)
def get_stars(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Return the authenticated user's current active star summary."""
    summary = recalculate_user_tier(db, current_user)
    return StarsResponse(**summary)


@router.post("/stars/decay")
def run_decay(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Manually trigger a decay recalculation for the authenticated user."""
    summary = recalculate_user_tier(db, current_user)
    return {"message": "Star decay recalculated", **summary}


@router.post("/influencer/cashout")
def cashout(payload: CashoutRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Allow super influencers to request a payout once minimum threshold is met."""
    if current_user.influencer_tier != "super":
        raise HTTPException(status_code=403, detail="Only super influencers can cash out")
    if payload.amount < 1000:
        raise HTTPException(status_code=400, detail="Minimum cashout is KES 1000")
    if current_user.wallet_balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")

    current_user.wallet_balance -= payload.amount
    tx = Transaction(
        user_id=current_user.id,
        tx_type="cashout",
        provider=payload.provider,
        gross_amount=payload.amount,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        influencer_amount=payload.amount,
        status="pending",
        reference=generate_reference("CASH"),
    )
    db.add(current_user)
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return {"message": "Cashout requested", "transaction": tx.reference, "amount": payload.amount}
