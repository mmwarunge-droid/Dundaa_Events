from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, Date, func
from sqlalchemy.orm import relationship
from app.db import Base


class Event(Base):
    """
    Event model.

    Supports:
    - poster URL or uploaded poster file
    - poster_type for frontend rendering decisions
    - category/date/price/payment data
    """
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)

    # Media / poster details
    # poster_url can point to either:
    # - an external URL pasted by the user
    # - a local uploaded file URL like /uploads/posters/xyz.jpg
    poster_url = Column(String, nullable=True)
    poster_type = Column(String, nullable=True)

    # Venue / map details
    google_map_link = Column(String, nullable=True)
    location_name = Column(String, nullable=True)

    # Business-facing event fields
    category = Column(String, nullable=True, index=True)
    event_date = Column(Date, nullable=True, index=True)
    price = Column(Float, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_link = Column(String, nullable=True)

    # Event owner
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    # Audit timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="events")
    comments = relationship("Comment", back_populates="event", cascade="all, delete")
    ratings = relationship("Rating", back_populates="event", cascade="all, delete")