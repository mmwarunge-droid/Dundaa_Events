from pydantic import BaseModel, HttpUrl


class FeaturedPromotionResponse(BaseModel):
    image_url: str
    click_url: str | None = None
    title: str | None = None
    text: str | None = None


class FeaturedPromotionUpdateRequest(BaseModel):
    image_url: str
    click_url: str | None = None
    title: str | None = None
    text: str | None = None