from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):

    DATABASE_URL: str = "sqlite:///./dundaa.db"

    JWT_SECRET_KEY: str = "REPLACE_ME"
    JWT_ALGORITHM: str = "HS256"

    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    MPESA_CONSUMER_KEY: str = "REPLACE_ME"
    MPESA_CONSUMER_SECRET: str = "REPLACE_ME"

    BANK_PAYOUT_KEY: str = "REPLACE_ME"
    CARD_PROCESSOR_KEY: str = "REPLACE_ME"

    APP_BASE_URL: str = "http://localhost:8000"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore"
    )


settings = Settings()