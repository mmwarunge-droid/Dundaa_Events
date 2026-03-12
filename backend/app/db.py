from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings


# SQLite needs check_same_thread disabled for local dev.
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}
# Create the SQLAlchemy engine.
engine = create_engine(settings.DATABASE_URL, connect_args=connect_args)
# Create DB sessions for dependency injection.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Base class for all ORM models.
Base = declarative_base()
