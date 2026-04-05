import os
import sys
from pathlib import Path
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add project root to Python path so "backend.app..." imports work
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

# Load backend/.env
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from backend.app.db import Base

# Import all models so Alembic sees them
from backend.app.models.user import User
from backend.app.models.event import Event
from backend.app.models.comment import Comment
from backend.app.models.rating import Rating
from backend.app.models.transaction import Transaction
from backend.app.models.kyc_submission import KYCSubmission
from backend.app.models.kyc_document import KYCDocument
from backend.app.models.notification import Notification
from backend.app.models.influencer_star import InfluencerStar
from backend.app.models.event_share_click import EventShareClick
from backend.app.models.guest_order import GuestOrder
from backend.app.models.campaign import Campaign
from backend.app.models.donation import Donation
from backend.app.models.coin_purchase import CoinPurchase
from backend.app.models.voting_campaign import VotingCampaign
from backend.app.models.contestant import Contestant
from backend.app.models.vote_transaction import VoteTransaction
from backend.app.models.featured_promotion import FeaturedPromotion
from backend.app.models.mfa_challenge import MFAChallenge
from backend.app.models.contact_message import ContactMessage

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Please define it in backend/.env")

config.set_main_option("sqlalchemy.url", DATABASE_URL)


def run_migrations_offline() -> None:
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()