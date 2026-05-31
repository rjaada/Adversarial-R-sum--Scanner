from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    llm_endpoint: str = ""
    llm_model: str = "llama3"
    llm_timeout: int = 30
    llm_api_key: str = ""
    ats_simulation_enabled: bool = False
    analytics_enabled: bool = False

    # Clerk — JWKS endpoint for JWT verification
    # Format: https://<your-clerk-frontend-api>/.well-known/jwks.json
    # Find in: Clerk Dashboard → API Keys → Advanced
    clerk_jwks_url: str = ""

    # Stripe (Phase 2 — referenced in env now, used in Phase 2)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Internal cron secret for /api/internal/purge-expired
    internal_cron_secret: str = ""

    # CORS — restrict to production frontend in production env
    # Default "*" is fine for local dev. Set to https://tracerank.vercel.app in prod.
    allowed_origins: str = "*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
