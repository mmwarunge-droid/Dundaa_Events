from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.config import settings
from backend.app.db import Base
from backend.app.dependencies import get_db
from backend.app.models.contact_message import ContactMessage
from backend.app.schemas.contact import ContactFormRequest, ContactFormResponse
from backend.app.services.email_service import send_email

router = APIRouter(prefix="/contact", tags=["Contact"])


def count_words(value: str) -> int:
    return len([part for part in value.strip().split() if part])


@router.post("", response_model=ContactFormResponse)
def send_contact_form(payload: ContactFormRequest, db: Session = Depends(get_db)):
    if payload.to_email != settings.ADMIN_CONTACT_EMAIL:
        raise HTTPException(status_code=400, detail="Invalid destination email")

    if count_words(payload.message) > 50:
        raise HTTPException(
            status_code=400,
            detail="Please send an official email instead",
        )

    record = ContactMessage(
        sender_email=payload.sender_email,
        to_email=payload.to_email,
        message=payload.message.strip(),
    )
    db.add(record)
    db.commit()

    send_email(
        settings.ADMIN_CONTACT_EMAIL,
        "New Dundaa contact form message",
        f"From: {payload.sender_email or 'anonymous'}\n\n{payload.message.strip()}",
    )

    return ContactFormResponse(success=True, message="Your message has been sent.")