from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.dependencies import get_db, get_current_user
from backend.app.models.user import User
from backend.app.models.transaction import Transaction
from backend.app.schemas.transaction import TransactionResponse

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