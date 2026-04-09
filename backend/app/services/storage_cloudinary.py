import cloudinary
import cloudinary.uploader

cloudinary.config(secure=True)


def upload_event_images_to_cloudinary(
    *,
    original_bytes: bytes,
    thumb_bytes: bytes,
) -> dict:
    original_result = cloudinary.uploader.upload(
        original_bytes,
        folder="dundaa/events/posters",
        resource_type="image",
        format="webp",
    )

    thumb_result = cloudinary.uploader.upload(
        thumb_bytes,
        folder="dundaa/events/posters",
        resource_type="image",
        format="webp",
    )

    return {
        "poster_url": original_result["secure_url"],
        "poster_thumb_url": thumb_result["secure_url"],
        "poster_storage_key": original_result.get("public_id"),
    }