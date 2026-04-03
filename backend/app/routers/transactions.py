from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.dependencies import get_db, get_current_user
from backend.app.models.transaction import Transaction
from backend.app.models.user import User
from backend.app.schemas.transaction import (
    TransactionResponse,
    WithdrawalInitiateRequest,
    WithdrawalInitiateResponse,
    WithdrawalVerifyRequest,
    WithdrawalVerifyResponse,
)
from backend.app.services.mfa_service import create_mfa_challenge, verify_mfa_challenge

router = APIRouter(tags=["Transactions"])


@router.get("/transactions", response_model=list[TransactionResponse])
def list_transactions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    txs = (
        db.query(Transaction)
        .filter(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .all()
    )
    return txs


@router.post("/transactions/withdraw/initiate", response_model=WithdrawalInitiateResponse)
def initiate_withdrawal(
    payload: WithdrawalInitiateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.wallet_balance < payload.amount:
        raise HTTPException(status_code=400, detail="Insufficient wallet balance")

    if payload.mfa_method not in {"email", "sms"}:
        raise HTTPException(status_code=400, detail="Invalid MFA method")

    tx = Transaction(
        user_id=current_user.id,
        tx_type="withdrawal",
        provider=payload.provider,
        gross_amount=payload.amount,
        tax_fee_amount=0.0,
        platform_fee_amount=0.0,
        influencer_amount=payload.amount,
        status="otp_pending",
        reference=f"wd-{uuid4().hex[:12]}",
        destination_reference=payload.destination_reference,
        mfa_required=payload.mfa_method,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)

    destination = current_user.email if payload.mfa_method == "email" else (current_user.contact_info or "")
    if not destination:
        raise HTTPException(status_code=400, detail="No valid destination found for selected MFA method")

    challenge = create_mfa_challenge(
        db=db,
        user=current_user,
        method=payload.mfa_method,
        destination=destination,
        transaction_id=tx.id,
    )

    return WithdrawalInitiateResponse(
        transaction_id=tx.id,
        challenge_id=challenge.id,
        message="Verification code sent successfully",
    )


@router.post("/transactions/withdraw/verify", response_model=WithdrawalVerifyResponse)
def verify_withdrawal(
    payload: WithdrawalVerifyRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    challenge = verify_mfa_challenge(db, payload.challenge_id, payload.code)

    tx = db.query(Transaction).filter(
        Transaction.id == challenge.transaction_id,
        Transaction.user_id == current_user.id,
    ).first()

    if not tx:
        raise HTTPException(status_code=404, detail="Withdrawal transaction not found")

    if tx.status != "otp_pending":
        raise HTTPException(status_code=400, detail="Withdrawal is not awaiting verification")

    tx.status = "verified_pending_payout"
    tx.mfa_verified_at = datetime.now(timezone.utc)

    current_user.wallet_balance -= tx.gross_amount

    db.add(tx)
    db.add(current_user)
    db.commit()
    db.refresh(tx)

    return WithdrawalVerifyResponse(
        success=True,
        transaction_id=tx.id,
        status=tx.status,
    )