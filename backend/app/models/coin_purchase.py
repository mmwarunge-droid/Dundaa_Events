from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db import Base


class CoinPurchase(Base):
    """
    Records a Dundaa Coin purchase.
    """

    __tablename__ = "coin_purchases"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    coins = Column(Integer, nullable=False)
    amount_paid = Column(Float, nullable=False)

    payment_method = Column(String, nullable=False)
    reference = Column(String, unique=True, nullable=False, index=True)

    status = Column(String, nullable=False, default="pending", index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())