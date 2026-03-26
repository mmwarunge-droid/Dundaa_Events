from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.db import Base


class GuestOrder(Base):
    """
    Stores guest and authenticated public checkout orders for ticket purchases.

    Notes:
    - buyer_user_id is optional so guests can checkout without an account
    - payment status is tracked here independently of Transaction until
      provider confirmation is implemented
    """
    __tablename__ = "guest_orders"

    id = Column(Integer, primary_key=True, index=True)

    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    buyer_user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)

    buyer_name = Column(String, nullable=False)
    buyer_email = Column(String, nullable=False, index=True)
    buyer_phone = Column(String, nullable=False)

    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)

    payment_method = Column(String, nullable=False)  # mpesa | card | bank
    status = Column(String, nullable=False, default="pending_payment", index=True)
    reference = Column(String, nullable=False, unique=True, index=True)

    # Optional marketing / attribution support
    referral_slug = Column(String, nullable=True)
    notes = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="guest_orders")