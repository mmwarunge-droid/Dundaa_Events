from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from backend.app.db import Base


class VotingCampaign(Base):
    """
    Admin-created voting campaign.
    """

    __tablename__ = "voting_campaigns"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=True)

    linked_campaign_id = Column(Integer, ForeignKey("campaigns.id"), nullable=True, index=True)

    start_at = Column(DateTime(timezone=True), nullable=False, index=True)
    end_at = Column(DateTime(timezone=True), nullable=False, index=True)

    prize_pool_amount = Column(Float, nullable=False, default=0.0)

    # configurable per campaign
    first_prize_percentage = Column(Float, nullable=False, default=50.0)
    second_prize_percentage = Column(Float, nullable=False, default=30.0)
    third_prize_percentage = Column(Float, nullable=False, default=20.0)

    is_active = Column(Boolean, nullable=False, default=True, index=True)
    prizes_distributed = Column(Boolean, nullable=False, default=False)

    created_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    contestants = relationship(
        "Contestant",
        back_populates="voting_campaign",
        cascade="all, delete",
    )