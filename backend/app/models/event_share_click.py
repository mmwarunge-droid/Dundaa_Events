from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship

from app.db import Base


class EventShareClick(Base):
    """
    Stores click-through events for shareable links.

    This is useful for:
    - referral analytics
    - trending signals
    - future viral-loop reporting
    """
    __tablename__ = "event_share_clicks"

    id = Column(Integer, primary_key=True, index=True)

    event_id = Column(Integer, ForeignKey("events.id"), nullable=False, index=True)
    share_slug = Column(String, nullable=False, index=True)

    source = Column(String, nullable=True)       # whatsapp | instagram | direct | etc
    referrer = Column(String, nullable=True)     # optional external referrer string
    clicked_ip = Column(String, nullable=True)   # optional lightweight audit field
    user_agent = Column(String, nullable=True)   # optional lightweight audit field

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="share_clicks")