from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ENV_FILE_PATH = Path(__file__).resolve().parents[2] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(ENV_FILE_PATH), extra="ignore")

    app_name: str = "Gimpa Research Repository API"
    env: str = "development"
    api_prefix: str = "/api"

    secret_key: str
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 30

    database_url: str
    allowed_email_domains: str = "gimpa.edu.gh"
    # Comma-separated list of roles allowed to self-register via the public signup endpoint
    self_registration_roles: str = "staff"

    smtp_enabled: bool = False
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_use_tls: bool = True
    smtp_use_ssl: bool = False
    smtp_from_email: str | None = None
    smtp_from_name: str = "Gimpa Research Repository"
    smtp_timeout_seconds: int = 30
    smtp_max_retries: int = 3
    smtp_retry_backoff_seconds: float = 1.5

    # OnlyOffice integration
    onlyoffice_doc_server_url: str | None = None
    # Publicly reachable backend base URL for OnlyOffice callbacks/file fetch
    public_api_base_url: str = "http://127.0.0.1:8001"
    # Optional dedicated callback base URL used by OnlyOffice server container.
    # Use this when browser and container need different backend hostnames.
    onlyoffice_callback_base_url: str | None = None


settings = Settings()
