from fastapi import APIRouter

from app.api.deps import EuAtual

router = APIRouter()


@router.get("/api/health", include_in_schema=False)
async def saude() -> dict:
    """Para o Hub mostrar se o Estoque está no ar (contrato do Hub)."""
    return {"status": "ok"}


@router.get("/api/v1/eu")
async def eu(eu: EuAtual) -> dict:
    return eu.json()
