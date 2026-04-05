from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)

    poster_url = Column(String, nullable=True)
    poster_type = Column(String, nullable=True)

    google_map_link = Column(String, nullable=True)
    location_name = Column(String, nullable=True)

    category = Column(String, nullable=True, index=True)
    event_date = Column(Date, nullable=True, index=True)
    price = Column(Float, nullable=True)
    payment_method = Column(String, nullable=True)
    payment_link = Column(String, nullable=True)

    has_ticket_sales = Column(Boolean, nullable=False, default=False)
    approval_status = Column(String, nullable=False, default="approved", index=True)
    rejection_reason = Column(Text, nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    approved_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    is_live = Column(Boolean, nullable=False, default=True)

    share_slug = Column(String, unique=True, index=True, nullable=True)
    share_click_count = Column(Integer, nullable=False, default=0)
    search_hit_count = Column(Integer, nullable=False, default=0)

    featured_promo_image_url = Column(String, nullable=True)
    featured_promo_click_url = Column(String, nullable=True)

    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="events", foreign_keys=[owner_id])
    approved_by = relationship("User", foreign_keys=[approved_by_user_id])

    comments = relationship("Comment", back_populates="event", cascade="all, delete")
    ratings = relationship("Rating", back_populates="event", cascade="all, delete")
    guest_orders = relationship("GuestOrder", back_populates="event", cascade="all, delete")
    share_clicks = relationship("EventShareClick", back_populates="event", cascade="all, delete")