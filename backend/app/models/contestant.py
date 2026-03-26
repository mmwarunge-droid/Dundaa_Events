from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db import Base


class Contestant(Base):
    """
    A KYC-approved user participating in a voting campaign.
    """

    __tablename__ = "contestants"
    __table_args__ = (
        UniqueConstraint("voting_campaign_id", "user_id", name="uq_contestant_campaign_user"),
    )

    id = Column(Integer, primary_key=True, index=True)

    voting_campaign_id = Column(Integer, ForeignKey("voting_campaigns.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    display_name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)

    total_votes = Column(Integer, nullable=False, default=0)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    voting_campaign = relationship("VotingCampaign", back_populates="contestants")