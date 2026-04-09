from io import BytesIO
from typing import NamedTuple

from PIL import Image, ImageOps


class ProcessedImage(NamedTuple):
    original_bytes: bytes
    thumb_bytes: bytes
    content_type: str
    extension: str
    width: int
    height: int
    size_bytes: int


ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}


def process_uploaded_image(
    raw_bytes: bytes,
    *,
    max_width: int = 1600,
    thumb_width: int = 480,
    webp_quality: int = 82,
) -> ProcessedImage:
    image = Image.open(BytesIO(raw_bytes))
    image = ImageOps.exif_transpose(image)

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    # Flatten transparency for consistent WebP/JPEG output
    if image.mode == "RGBA":
        bg = Image.new("RGBA", image.size, (255, 255, 255, 255))
        image = Image.alpha_composite(bg, image).convert("RGB")
    else:
        image = image.convert("RGB")

    original = image.copy()
    original.thumbnail((max_width, max_width))

    thumb = image.copy()
    thumb.thumbnail((thumb_width, thumb_width))

    original_buf = BytesIO()
    thumb_buf = BytesIO()

    # Pillow supports saving WebP with quality options.
    original.save(original_buf, format="WEBP", quality=webp_quality, method=6)
    thumb.save(thumb_buf, format="WEBP", quality=76, method=6)

    original_bytes = original_buf.getvalue()
    thumb_bytes = thumb_buf.getvalue()

    return ProcessedImage(
        original_bytes=original_bytes,
        thumb_bytes=thumb_bytes,
        content_type="image/webp",
        extension="webp",
        width=original.width,
        height=original.height,
        size_bytes=len(original_bytes),
    )