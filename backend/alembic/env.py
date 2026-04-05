import os
import sys
from pathlib import Path
from logging.config import fileConfig

from dotenv import load_dotenv
from sqlalchemy import engine_from_config, pool
from alembic import context

# Add project root to Python path so "app..." imports work
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

# Load backend/.env
load_dotenv(PROJECT_ROOT / "backend" / ".env")

from app.db import Base

# Import all models so Alembic sees them
from app.models.user import User
from app.models.event import Event
from app.models.comment import Comment
from app.models.rating import Rating
from app.models.transaction import Transaction
from app.models.kyc_submission import KYCSubmission
from app.models.kyc_document import KYCDocument
from app.models.notification import Notification
from app.models.influencer_star import InfluencerStar
from app.models.event_share_click import EventShareClick
from app.models.guest_order import GuestOrder
from app.models.campaign import Campaign
from app.models.donation import Donation
from app.models.coin_purchase import CoinPurchase
from app.models.voting_campaign import VotingCampaign
from app.models.contestant import Contestant
from app.models.vote_transaction import VoteTransaction
from app.models.featured_promotion import FeaturedPromotion
from app.models.mfa_challenge import MFAChallenge
from app.models.contact_message import ContactMessage

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