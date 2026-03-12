from sqlalchemy import Column, Integer, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.db import Base


class InfluencerStar(Base):
    """Stores raw rating signals that later convert into active five-star equivalents."""
    __tablename__ = "influencer_stars"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Original rating source: 3, 4, or 5.
    source_rating = Column(Integer, nullable=False)
    # Direct five-star events can store 1 here; converted totals are computed dynamically.
    equivalent_five_star_value = Column(Integer, nullable=False, default=0)
    rating_id = Column(Integer, ForeignKey("ratings.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="stars")
