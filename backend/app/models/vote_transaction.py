from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db import Base


class VoteTransaction(Base):
    """
    Ledger for every voting action.
    """

    __tablename__ = "vote_transactions"

    id = Column(Integer, primary_key=True, index=True)

    voter_user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    voting_campaign_id = Column(Integer, ForeignKey("voting_campaigns.id"), nullable=False, index=True)
    contestant_id = Column(Integer, ForeignKey("contestants.id"), nullable=False, index=True)

    coins_used = Column(Integer, nullable=False)
    reference = Column(String, unique=True, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())