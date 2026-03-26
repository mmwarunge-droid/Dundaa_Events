from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from backend.app.db import Base


class Campaign(Base):
    """
    Public fundraising campaign.

    campaign_type:
    - free_event_crowdfund
    - creator_fundraiser
    """
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    cause_description = Column(Text, nullable=True)
    beneficiary_name = Column(String, nullable=True)

    campaign_type = Column(String, nullable=False, index=True)

    cover_image_url = Column(String, nullable=True)

    goal_amount = Column(Float, nullable=False, default=0.0)
    current_amount = Column(Float, nullable=False, default=0.0)

    deadline = Column(DateTime(timezone=True), nullable=True, index=True)

    linked_event_id = Column(Integer, ForeignKey("events.id"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    is_live = Column(Boolean, nullable=False, default=True)
    approval_status = Column(String, nullable=False, default="approved", index=True)

    allow_anonymous = Column(Boolean, nullable=False, default=True)
    recurring_enabled = Column(Boolean, nullable=False, default=False)

    share_slug = Column(String, unique=True, nullable=True, index=True)
    share_click_count = Column(Integer, nullable=False, default=0)
    search_hit_count = Column(Integer, nullable=False, default=0)
    donation_count = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", foreign_keys=[owner_id])
    linked_event = relationship("Event", foreign_keys=[linked_event_id])

    donations = relationship(
        "Donation",
        back_populates="campaign",
        cascade="all, delete",
    )