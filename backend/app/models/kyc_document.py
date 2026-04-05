from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship

from app.db import Base


class KYCDocument(Base):
    """
    Stores uploaded KYC document files.
    """
    __tablename__ = "kyc_documents"

    id = Column(Integer, primary_key=True, index=True)

    submission_id = Column(Integer, ForeignKey("kyc_submissions.id"), nullable=False, index=True)
    document_type = Column(String, nullable=False, index=True)
    file_url = Column(String, nullable=False)
    original_filename = Column(String, nullable=True)
    verification_status = Column(String, nullable=False, default="pending", index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    submission = relationship("KYCSubmission", back_populates="documents")