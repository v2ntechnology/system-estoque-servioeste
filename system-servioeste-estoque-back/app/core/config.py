"""Configuração lida do ambiente (ou do .env da raiz do projeto)."""
import uuid
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    environment: str = "development"  # development | production
    database_url: str = "postgresql+asyncpg://estoque:estoque@localhost:5435/estoque"

    # Origens do front-end que podem fazer requisições que alteram dados (proteção CSRF).
    allowed_origins: str = "http://localhost:5177"

    # Pessoa usada em desenvolvimento quando a requisição não vem do Hub (sem cabeçalhos X-Hub-User-*).
    # Nunca vale em produção (spec 004, research D2).
    dev_usuario_id: uuid.UUID = uuid.UUID("00000000-0000-4000-8000-000000000001")
    dev_usuario_email: str = "ana.souza@exemplo.com.br"
    dev_usuario_nome: str = "Ana Paula Souza"
    dev_usuario_papel_hub: str = "admin"

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def origins(self) -> list[str]:
        return [o.strip() for o in self.allowed_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
