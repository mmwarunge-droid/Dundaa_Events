from sqlalchemy import Column, Integer, String, Text, DateTime, func

from app.db import Base


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id = Column(Integer, primary_key=True, index=True)
    sender_email = Column(String, nullable=True)
    to_email = Column(String, nullable=False, default="hello@dundaa.com")
    message = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())