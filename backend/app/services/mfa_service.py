import random
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.config import settings
from app.models.mfa_challenge import MFAChallenge
from app.models.user import User
from app.services.email_service import send_email


def generate_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def create_mfa_challenge(
    db: Session,
    user: User,
    method: str,
    destination: str,
    transaction_id: int | None = None,
) -> MFAChallenge:
    code = generate_otp()
    challenge = MFAChallenge(
        user_id=user.id,
        transaction_id=transaction_id,
        method=method,
        code=code,
        destination=destination,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.OTP_EXPIRE_MINUTES),
    )
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    if method == "email":
        send_email(
            destination,
            "Your Dundaa verification code",
            f"Your verification code is {code}. It expires in {settings.OTP_EXPIRE_MINUTES} minutes.",
        )
    elif method == "sms":
        # Replace with real SMS provider later
        print(f"[SMS-DRY-RUN] To: {destination} | OTP: {code}")

    return challenge


def verify_mfa_challenge(db: Session, challenge_id: int, code: str) -> MFAChallenge:
    challenge = db.query(MFAChallenge).filter(MFAChallenge.id == challenge_id).first()
    if not challenge:
        raise HTTPException(status_code=404, detail="MFA challenge not found")

    if challenge.is_used:
        raise HTTPException(status_code=400, detail="MFA challenge has already been used")

    if challenge.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="MFA challenge has expired")

    challenge.attempts += 1
    if challenge.attempts > settings.OTP_MAX_ATTEMPTS:
        db.add(challenge)
        db.commit()
        raise HTTPException(status_code=400, detail="Too many invalid attempts")

    if challenge.code != code.strip():
        db.add(challenge)
        db.commit()
        raise HTTPException(status_code=400, detail="Invalid verification code")

    challenge.is_used = True
    db.add(challenge)
    db.commit()
    db.refresh(challenge)

    return challenge