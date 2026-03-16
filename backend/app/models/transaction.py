from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.db import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    tx_type = Column(String, nullable=False)
    provider = Column(String, nullable=False)

    gross_amount = Column(Float, nullable=False)
    tax_fee_amount = Column(Float, default=0.0)
    platform_fee_amount = Column(Float, default=0.0)
    influencer_amount = Column(Float, default=0.0)

    status = Column(String, default="pending")

    reference = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")