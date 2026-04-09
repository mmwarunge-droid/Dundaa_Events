import os
from io import BytesIO
from uuid import uuid4

import boto3


AWS_REGION = os.getenv("AWS_REGION")
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET")
AWS_S3_PUBLIC_BASE_URL = os.getenv("AWS_S3_PUBLIC_BASE_URL")

s3 = boto3.client("s3", region_name=AWS_REGION)


def upload_event_images_to_s3(
    *,
    original_bytes: bytes,
    thumb_bytes: bytes,
    extension: str,
    content_type: str,
) -> dict:
    image_id = uuid4().hex
    original_key = f"events/posters/{image_id}.{extension}"
    thumb_key = f"events/posters/{image_id}_thumb.{extension}"

    extra_args = {
        "ContentType": content_type,
        "CacheControl": "public, max-age=31536000, immutable",
    }

    s3.upload_fileobj(
        BytesIO(original_bytes),
        AWS_S3_BUCKET,
        original_key,
        ExtraArgs=extra_args,
    )

    s3.upload_fileobj(
        BytesIO(thumb_bytes),
        AWS_S3_BUCKET,
        thumb_key,
        ExtraArgs=extra_args,
    )

    return {
        "poster_url": f"{AWS_S3_PUBLIC_BASE_URL}/{original_key}",
        "poster_thumb_url": f"{AWS_S3_PUBLIC_BASE_URL}/{thumb_key}",
        "poster_storage_key": original_key,
    }