from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Boolean, func
from sqlalchemy.orm import relationship

from app.db import Base


class Donation(Base):
    """
    Supports guest and authenticated donations.

    contribution_type:
    - one_time
    - recurring
    """
    __tablename__ = "donations"

    id = Column(Integer, primary_key=True, index=True)

    campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=False, index=True)
    donor_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    donor_name = Column(String, nullable=False)
    donor_email = Column(String, nullable=False, index=True)
    donor_phone = Column(String, nullable=False)

    amount = Column(Float, nullable=False)

    payment_method = Column(String, nullable=False)  # mpesa | card | bank
    contribution_type = Column(String, nullable=False, default="one_time")

    is_anonymous = Column(Boolean, nullable=False, default=False)

    status = Column(String, nullable=False, default="pending", index=True)
    reference = Column(String, nullable=False, unique=True, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    campaign = relationship("Campaign", back_populates="donations")