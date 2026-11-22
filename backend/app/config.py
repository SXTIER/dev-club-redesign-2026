from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="DEVCLUB_", env_file=ROOT / "backend/.env", extra="ignore")

    data_dir: Path = ROOT / "backend/data"
    seed_dir: Path = ROOT / "src/content"
    public_dir: Path = ROOT / "public"
    public_api_base: str = "/api/backend"
    allowed_origins: tuple[str, ...] = ("http://localhost:3000", "http://127.0.0.1:3000")
    cookie_secure: bool = False
    session_seconds: int = Field(default=28800, ge=60)
    cv_url_seconds: int = Field(default=300, ge=1, le=3600)
    smtp_host: str | None = None
    smtp_port: int = Field(default=1025, ge=1, le=65535)
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_starttls: bool = False
    smtp_ssl: bool = False
    mail_from: str = "devclub@example.com"
