from sqlalchemy import Column, Integer, String, Float, DateTime, func
from sqlalchemy.orm import relationship
from app.db import Base


class User(Base):
    """
    Dundaa user model.

    profile_picture stores either:
    - a public external URL
    - or a local uploaded file URL like /uploads/profiles/abc123.jpg

    contact_info stores the organizer/influencer contact details
    that can be shown on event pages.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Publicly renderable profile picture path/URL.
    profile_picture = Column(String, nullable=True)

    # Public organizer contact details entered by the influencer.
    contact_info = Column(String, nullable=True)

    gender = Column(String, nullable=True)
    location_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    influencer_tier = Column(String, default="none")
    wallet_balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    events = relationship("Event", back_populates="owner", cascade="all, delete")
    comments = relationship("Comment", back_populates="user", cascade="all, delete")

    # Ratings this user has GIVEN
    ratings = relationship(
        "Rating",
        back_populates="user",
        cascade="all, delete",
        foreign_keys="Rating.user_id",
    )

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete")
    stars = relationship("InfluencerStar", back_populates="user", cascade="all, delete")