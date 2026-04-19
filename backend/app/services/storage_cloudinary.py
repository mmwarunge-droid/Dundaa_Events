import uuid

import cloudinary
import cloudinary.uploader

cloudinary.config(secure=True)


def upload_event_images_to_cloudinary(
    *,
    original_bytes: bytes,
    thumb_bytes: bytes,
) -> dict:
    base_id = f"dundaa/events/posters/{uuid.uuid4().hex}"

    original_result = cloudinary.uploader.upload(
        original_bytes,
        public_id=f"{base_id}_original",
        resource_type="image",
        format="webp",
        overwrite=True,
    )

    thumb_result = cloudinary.uploader.upload(
        thumb_bytes,
        public_id=f"{base_id}_thumb",
        resource_type="image",
        format="webp",
        overwrite=True,
    )

    return {
        "poster_url": original_result["secure_url"],
        "poster_thumb_url": thumb_result["secure_url"],
        "poster_storage_key": original_result.get("public_id"),
    }