from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey, func
from sqlalchemy.orm import relationship

from app.db import Base


class MFAChallenge(Base):
    __tablename__ = "mfa_challenges"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transaction_id = Column(Integer, ForeignKey("transactions.id"), nullable=True, index=True)

    method = Column(String, nullable=False)  # email | sms
    code = Column(String, nullable=False)
    destination = Column(String, nullable=False)

    is_used = Column(Boolean, nullable=False, default=False)
    attempts = Column(Integer, nullable=False, default=0)

    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    transaction = relationship("Transaction")