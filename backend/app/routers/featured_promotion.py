from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.app.dependencies import get_current_admin_user, get_db
from backend.app.models.featured_promotion import FeaturedPromotion
from backend.app.models.user import User
from backend.app.schemas.featured_promotion import (
    FeaturedPromotionResponse,
    FeaturedPromotionUpdateRequest,
)
from backend.app.services.cache_service import cache_get, cache_set, cache_delete

router = APIRouter(prefix="/featured-promotion", tags=["Featured Promotion"])


@router.get("/active", response_model=FeaturedPromotionResponse | None)
def get_active_featured_promotion(db: Session = Depends(get_db)):
    cache_key = "featured_promotion:active"
    cached = cache_get(cache_key)
    if cached is not None:
        return cached

    promo = (
        db.query(FeaturedPromotion)
        .filter(FeaturedPromotion.is_active.is_(True))
        .order_by(FeaturedPromotion.created_at.desc())
        .first()
    )

    if not promo:
        return None

    payload = {
        "image_url": promo.image_url,
        "click_url": promo.click_url,
        "title": promo.title,
        "text": promo.text,
    }

    cache_set(cache_key, payload, ttl=600)
    return payload


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

    cache_delete("featured_promotion:active")

    db.refresh(promo)

    return FeaturedPromotionResponse(
        image_url=promo.image_url,
        click_url=promo.click_url,
        title=promo.title,
        text=promo.text,
    )