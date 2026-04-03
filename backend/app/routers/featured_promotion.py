from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.dependencies import get_current_admin_user, get_db
from backend.app.models.featured_promotion import FeaturedPromotion
from backend.app.models.user import User
from backend.app.schemas.featured_promotion import (
    FeaturedPromotionResponse,
    FeaturedPromotionUpdateRequest,
)

router = APIRouter(prefix="/featured-promotion", tags=["Featured Promotion"])


@router.get("/active", response_model=FeaturedPromotionResponse | None)
def get_active_featured_promotion(db: Session = Depends(get_db)):
    promo = db.query(FeaturedPromotion).filter(FeaturedPromotion.is_active.is_(True)).order_by(
        FeaturedPromotion.created_at.desc()
    ).first()

    if not promo:
        return None

    return FeaturedPromotionResponse(
        image_url=promo.image_url,
        click_url=promo.click_url,
        title=promo.title,
        text=promo.text,
    )


@router.put("/active", response_model=FeaturedPromotionResponse)
def update_active_featured_promotion(
    payload: FeaturedPromotionUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    db.query(FeaturedPromotion).update({"is_active": False})

    promo = FeaturedPromotion(
        image_url=payload.image_url,
        click_url=payload.click_url,
        title=payload.title,
        text=payload.text,
        is_active=True,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)

    return FeaturedPromotionResponse(
        image_url=promo.image_url,
        click_url=promo.click_url,
        title=promo.title,
        text=promo.text,
    )