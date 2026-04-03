from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from backend.app.db import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    tx_type = Column(String, nullable=False, index=True)
    provider = Column(String, nullable=False)

    gross_amount = Column(Float, nullable=False)
    tax_fee_amount = Column(Float, default=0.0)
    platform_fee_amount = Column(Float, default=0.0)
    influencer_amount = Column(Float, default=0.0)

    status = Column(String, default="pending", index=True)
    reference = Column(String, nullable=True, index=True)
    destination_reference = Column(String, nullable=True)

    mfa_required = Column(String, nullable=True)   # email | sms
    mfa_verified_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="transactions")