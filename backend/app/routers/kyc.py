import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session, joinedload

from app.dependencies import get_current_user, get_db
from app.models.kyc_document import KYCDocument
from app.models.kyc_submission import KYCSubmission
from app.models.user import User
from app.schemas.kyc import KYCSubmissionCreate, KYCSubmissionResponse

router = APIRouter(tags=["KYC"])

KYC_UPLOAD_DIR = Path("uploads/kyc")
KYC_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_KYC_EXTENSIONS = {".jpg", ".jpeg", ".png", ".pdf", ".webp"}


def save_kyc_document(upload: UploadFile) -> tuple[str, str]:
    if not upload.filename:
        raise HTTPException(status_code=400, detail="Uploaded file has no filename")

    extension = Path(upload.filename).suffix.lower()

    if extension not in ALLOWED_KYC_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail="KYC file must be JPG, JPEG, PNG, WEBP, or PDF",
        )

    generated_name = f"{uuid4().hex}{extension}"
    destination = KYC_UPLOAD_DIR / generated_name

    with destination.open("wb") as buffer:
        shutil.copyfileobj(upload.file, buffer)

    return f"/uploads/kyc/{generated_name}", upload.filename


@router.post("/kyc/submissions", response_model=KYCSubmissionResponse)
def create_kyc_submission(
    payload: KYCSubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.accepted_terms:
        raise HTTPException(status_code=400, detail="Terms of service must be accepted")
    if not payload.accepted_anti_fraud:
        raise HTTPException(status_code=400, detail="Anti-fraud declaration must be accepted")
    if not payload.accepted_aml:
        raise HTTPException(status_code=400, detail="AML compliance must be accepted")
    if not payload.accepted_refund_policy:
        raise HTTPException(status_code=400, detail="Refund policy must be accepted")

    submission = KYCSubmission(
        user_id=current_user.id,
        entity_type=payload.entity_type,
        status="pending",
        identity_document_type=payload.identity_document_type,
        phone_number=payload.phone_number,
        email_verified=payload.email_verified,
        phone_verified=payload.phone_verified,
        proof_of_address_type=payload.proof_of_address_type,
        business_name=payload.business_name,
        trading_name=payload.trading_name,
        business_registration_number=payload.business_registration_number,
        tax_identification_number=payload.tax_identification_number,
        business_address=payload.business_address,
        website_or_social=payload.website_or_social,
        event_description=payload.event_description,
        venue_confirmation_text=payload.venue_confirmation_text,
        event_date_text=payload.event_date_text,
        event_location_text=payload.event_location_text,
        ticket_pricing_text=payload.ticket_pricing_text,
        event_category=payload.event_category,
        accepted_terms=payload.accepted_terms,
        accepted_anti_fraud=payload.accepted_anti_fraud,
        accepted_aml=payload.accepted_aml,
        accepted_refund_policy=payload.accepted_refund_policy,
    )

    db.add(submission)
    db.commit()
    db.refresh(submission)

    return submission


@router.post("/kyc/submissions/{submission_id}/documents")
def upload_kyc_document(
    submission_id: int,
    document_type: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submission = db.query(KYCSubmission).filter(
        KYCSubmission.id == submission_id,
        KYCSubmission.user_id == current_user.id,
    ).first()

    if not submission:
        raise HTTPException(status_code=404, detail="KYC submission not found")

    file_url, original_filename = save_kyc_document(file)

    document = KYCDocument(
        submission_id=submission.id,
        document_type=document_type.strip(),
        file_url=file_url,
        original_filename=original_filename,
        verification_status="pending",
    )

    db.add(document)
    db.commit()
    db.refresh(document)

    return {
        "message": "Document uploaded successfully",
        "document_id": document.id,
        "file_url": document.file_url,
    }


@router.get("/kyc/me", response_model=list[KYCSubmissionResponse])
def get_my_kyc_submissions(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    submissions = db.query(KYCSubmission).options(
        joinedload(KYCSubmission.documents)
    ).filter(
        KYCSubmission.user_id == current_user.id
    ).order_by(
        KYCSubmission.submitted_at.desc()
    ).all()

    return submissions