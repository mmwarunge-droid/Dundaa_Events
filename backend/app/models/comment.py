from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from backend.app.db import Base


class Comment(Base):
    """Short user comment attached to an event."""
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    # Kept short to resemble tweet-length feedback.
    body = Column(String(300), nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="comments")
    user = relationship("User", back_populates="comments")
