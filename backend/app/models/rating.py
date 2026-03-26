from sqlalchemy import Column, Integer, ForeignKey, DateTime, func, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.app.db import Base


class Rating(Base):
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_rating_event_user"),)

    id = Column(Integer, primary_key=True, index=True)
    value = Column(Integer, nullable=False)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    event_owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    event = relationship("Event", back_populates="ratings")

    # The user who submitted the rating
    user = relationship(
        "User",
        back_populates="ratings",
        foreign_keys=[user_id],
    )