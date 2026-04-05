"""init_clean

Revision ID: e042de5de56e
Revises:
Create Date: 2026-04-05 13:21:08.612441
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e042de5de56e"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("sender_email", sa.String(), nullable=True),
        sa.Column("to_email", sa.String(), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "featured_promotions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("image_url", sa.String(), nullable=False),
        sa.Column("click_url", sa.String(), nullable=True),
        sa.Column("title", sa.String(), nullable=True),
        sa.Column("text", sa.Text(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=True,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    op.add_column("events", sa.Column("featured_promo_image_url", sa.String(), nullable=True))
    op.add_column("events", sa.Column("featured_promo_click_url", sa.String(), nullable=True))
    op.create_index(op.f("ix_events_owner_id"), "events", ["owner_id"], unique=False)

    op.add_column("transactions", sa.Column("destination_reference", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("mfa_required", sa.String(), nullable=True))
    op.add_column("transactions", sa.Column("mfa_verified_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f("ix_transactions_reference"), "transactions", ["reference"], unique=False)
    op.create_index(op.f("ix_transactions_status"), "transactions", ["status"], unique=False)
    op.create_index(op.f("ix_transactions_tx_type"), "transactions", ["tx_type"], unique=False)
    op.create_index(op.f("ix_transactions_user_id"), "transactions", ["user_id"], unique=False)

    op.add_column("users", sa.Column("promotional_updates_consent", sa.Boolean(), nullable=True))
    op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))

    # Composite indexes for performance
    op.create_index(
        "ix_events_live_approval_date",
        "events",
        ["is_live", "approval_status", "event_date"],
        unique=False,
    )

    op.create_index(
        "ix_kyc_user_status",
        "kyc_submissions",
        ["user_id", "status"],
        unique=False,
    )

    op.create_index(
        "ix_transactions_user_status",
        "transactions",
        ["user_id", "status"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_transactions_user_status", table_name="transactions")
    op.drop_index("ix_kyc_user_status", table_name="kyc_submissions")
    op.drop_index("ix_events_live_approval_date", table_name="events")

    op.drop_column("users", "last_login_at")
    op.drop_column("users", "promotional_updates_consent")

    op.drop_index(op.f("ix_transactions_user_id"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_tx_type"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_status"), table_name="transactions")
    op.drop_index(op.f("ix_transactions_reference"), table_name="transactions")
    op.drop_column("transactions", "mfa_verified_at")
    op.drop_column("transactions", "mfa_required")
    op.drop_column("transactions", "destination_reference")

    op.drop_index(op.f("ix_events_owner_id"), table_name="events")
    op.drop_column("events", "featured_promo_click_url")
    op.drop_column("events", "featured_promo_image_url")

    op.drop_table("featured_promotions")
    op.drop_table("contact_messages")