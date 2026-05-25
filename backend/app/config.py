from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = ""
    llm_endpoint: str = ""
    llm_model: str = "llama3"
    llm_timeout: int = 30
    llm_api_key: str = ""
    ats_simulation_enabled: bool = False
    analytics_enabled: bool = False
    # Comma-separated list of allowed CORS origins.
    # Local default covers both Next.js dev ports.
    # Comma-separated origins, or "*" to allow all (default for easy deployment).
    # Override in production by setting ALLOWED_ORIGINS env var explicitly.
    allowed_origins: str = "*"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
