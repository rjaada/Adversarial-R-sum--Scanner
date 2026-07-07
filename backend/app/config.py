from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    llm_endpoint: str = ""
    llm_model: str = "llama3"
    llm_timeout: int = 30
    llm_api_key: str = ""
    ats_simulation_enabled: bool = False
    analytics_enabled: bool = False

    # Deployment environment. "development" relaxes CORS to "*" for local work;
    # any other value (e.g. "production") requires an explicit ALLOWED_ORIGINS.
    environment: str = "development"

    # Clerk — JWKS endpoint for JWT verification
    # Format: https://<your-clerk-frontend-api>/.well-known/jwks.json
    # Find in: Clerk Dashboard → API Keys → Advanced
    # Defaults to the current Clerk instance so a missing env var degrades
    # auth loudly-visible features (history, ungated scans) rather than
    # silently rejecting every token. Override when the Clerk instance moves
    # to production.
    clerk_jwks_url: str = "https://usable-chow-5.clerk.accounts.dev/.well-known/jwks.json"

    # Stripe (Phase 2 — referenced in env now, used in Phase 2)
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""

    # Internal cron secret for /api/internal/purge-expired
    internal_cron_secret: str = ""

    # CORS — comma-separated allowed origins. In production set this to the
    # frontend URL(s), e.g. "https://tracerank.vercel.app". Left empty in a
    # non-development environment, the app falls back to that production URL
    # rather than the wide-open "*" (audit security hardening).
    allowed_origins: str = ""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        """Resolve the effective list of allowed CORS origins."""
        explicit = [o.strip() for o in self.allowed_origins.split(",") if o.strip()]
        if self.environment.lower() == "development":
            # Local dev: allow everything unless origins were explicitly set.
            return explicit or ["*"]
        # Production/staging: never default to "*".
        return explicit or ["https://tracerank.vercel.app"]


settings = Settings()
