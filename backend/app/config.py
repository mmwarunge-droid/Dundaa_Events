from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Core database connection URL.
    DATABASE_URL: str = "sqlite:///./dundaa.db"
    # JWT settings for authentication.
    JWT_SECRET_KEY: str = "REPLACE_ME"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    # Payment credentials placeholders.
    MPESA_CONSUMER_KEY: str = "REPLACE_ME"
    MPESA_CONSUMER_SECRET: str = "REPLACE_ME"
    BANK_PAYOUT_KEY: str = "REPLACE_ME"
    CARD_PROCESSOR_KEY: str = "REPLACE_ME"
    # Application base URL.
    APP_BASE_URL: str = "http://localhost:8000"

    # Load values from .env and ignore extras.
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


# Single shared settings object imported across the app.
settings = Settings()
