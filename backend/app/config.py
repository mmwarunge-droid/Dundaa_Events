from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    REDIS_URL: str | None = None
    CACHE_TTL_SECONDS: int = 300

    DATABASE_URL: str
    JWT_SECRET_KEY: str

    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    MPESA_CONSUMER_KEY: str = ""
    MPESA_CONSUMER_SECRET: str = ""

    BANK_PAYOUT_KEY: str = ""
    CARD_PROCESSOR_KEY: str = ""

    APP_BASE_URL: str
    FRONTEND_BASE_URL: str

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()