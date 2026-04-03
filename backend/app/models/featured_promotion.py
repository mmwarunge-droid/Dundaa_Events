from sqlalchemy import Boolean, Column, Integer, String, Text, DateTime, func

from backend.app.db import Base


class FeaturedPromotion(Base):
    __tablename__ = "featured_promotions"

    id = Column(Integer, primary_key=True, index=True)
    image_url = Column(String, nullable=False)
    click_url = Column(String, nullable=True)
    title = Column(String, nullable=True)
    text = Column(Text, nullable=True)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())