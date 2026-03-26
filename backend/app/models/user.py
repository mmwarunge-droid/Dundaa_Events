from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, func
from sqlalchemy.orm import relationship

from app.db import Base


class User(Base):
    """
    Dundaa user model.

    Added lifecycle and authorization fields for:
    - age-gated signup
    - optional gender
    - welcome / consent UX
    - account deactivation / deletion / suspension handling
    - admin authorization
    - internal Dundaa Coins wallet
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    # Basic profile
    profile_picture = Column(String, nullable=True)
    contact_info = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)

    # Location / personalization
    location_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    # Influencer / earnings system
    influencer_tier = Column(String, default="none")
    wallet_balance = Column(Float, default=0.0)   # cash balance
    coin_balance = Column(Integer, default=0)     # Dundaa Coins

    # Authorization / platform role
    role = Column(String, nullable=False, default="user")
    # expected values: user, admin, super_admin

    # Account lifecycle
    account_status = Column(String, nullable=False, default="active")
    # expected values:
    # - active
    # - deactivated
    # - suspended
    # - deleted

    is_deleted = Column(Boolean, nullable=False, default=False)

    deactivated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)

    # Consent / onboarding UX
    notification_consent = Column(Boolean, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    events = relationship(
        "Event",
        back_populates="owner",
        cascade="all, delete",
        foreign_keys="Event.owner_id",
    )
    comments = relationship("Comment", back_populates="user", cascade="all, delete")

    ratings = relationship(
        "Rating",
        back_populates="user",
        cascade="all, delete",
        foreign_keys="Rating.user_id",
    )

    transactions = relationship("Transaction", back_populates="user", cascade="all, delete")
    stars = relationship("InfluencerStar", back_populates="user", cascade="all, delete")