from sqlalchemy import Boolean, Column, Date, DateTime, Float, Integer, String, func
from sqlalchemy.orm import relationship

from backend.app.db import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    profile_picture = Column(String, nullable=True)
    contact_info = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)

    location_name = Column(String, nullable=True)
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)

    influencer_tier = Column(String, default="none")
    wallet_balance = Column(Float, default=0.0)
    coin_balance = Column(Integer, default=0)

    role = Column(String, nullable=False, default="user")
    account_status = Column(String, nullable=False, default="active")
    is_deleted = Column(Boolean, nullable=False, default=False)

    deactivated_at = Column(DateTime(timezone=True), nullable=True)
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    suspended_at = Column(DateTime(timezone=True), nullable=True)

    notification_consent = Column(Boolean, nullable=True)
    promotional_updates_consent = Column(Boolean, nullable=True)

    last_login_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

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