from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db import Base


class KYCSubmission(Base):
    """
    Stores one KYC submission / draft per organizer attempt.

    Status values:
    - draft
    - pending
    - approved
    - rejected
    - needs_more_info
    - archived

    Draft rules:
    - users can save and resume later
    - incomplete drafts may be archived after 3 days of inactivity
    - archived drafts remain recoverable
    """

    __tablename__ = "kyc_submissions"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    entity_type = Column(String, nullable=False, default="individual", index=True)
    status = Column(String, nullable=False, default="draft", index=True)

    identity_document_type = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    email_verified = Column(Boolean, nullable=False, default=False)
    phone_verified = Column(Boolean, nullable=False, default=False)

    proof_of_address_type = Column(String, nullable=True)

    business_name = Column(String, nullable=True)
    trading_name = Column(String, nullable=True)
    business_registration_number = Column(String, nullable=True)
    tax_identification_number = Column(String, nullable=True)
    business_address = Column(String, nullable=True)
    website_or_social = Column(String, nullable=True)

    event_description = Column(Text, nullable=True)
    venue_confirmation_text = Column(Text, nullable=True)
    event_date_text = Column(String, nullable=True)
    event_location_text = Column(String, nullable=True)
    ticket_pricing_text = Column(String, nullable=True)
    event_category = Column(String, nullable=True)

    accepted_terms = Column(Boolean, nullable=False, default=False)
    accepted_anti_fraud = Column(Boolean, nullable=False, default=False)
    accepted_aml = Column(Boolean, nullable=False, default=False)
    accepted_refund_policy = Column(Boolean, nullable=False, default=False)

    progress_percentage = Column(Integer, nullable=False, default=0)
    last_updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    archived_at = Column(DateTime(timezone=True), nullable=True)

    review_notes = Column(Text, nullable=True)
    submitted_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    reviewed_by_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    user = relationship("User", foreign_keys=[user_id])
    reviewed_by = relationship("User", foreign_keys=[reviewed_by_user_id])
    documents = relationship(
        "KYCDocument",
        back_populates="submission",
        cascade="all, delete",
    )