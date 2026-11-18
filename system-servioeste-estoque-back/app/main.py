"""API do Servioeste Estoque.

    uvicorn app.main:app --reload
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.routes import cadastros, compras, contagens, eu, movimentacoes, painel, relatorios
from app.core.config import get_settings

settings = get_settings()
UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}

app = FastAPI(
    title="Servioeste Estoque API",
    # Documentação interativa só em desenvolvimento: em produção não expomos o mapa da API (núcleo III).
    docs_url=None if settings.is_production else "/api/docs",
    redoc_url=None,
    openapi_url=None if settings.is_production else "/api/openapi.json",
)


@app.middleware("http")
async def csrf_e_cabecalhos(request: Request, call_next):
    """CSRF: requisições que alteram dados só valem vindas do próprio front-end (Origin conferido), como no Hub."""
    if request.method in UNSAFE_METHODS:
        origin = request.headers.get("origin")
        cross_site = request.headers.get("sec-fetch-site") == "cross-site"
        if (origin and origin not in settings.origins) or (not origin and cross_site):
            return JSONResponse({"detail": "Origem não permitida."}, status_code=403)
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("Cache-Control", "no-store")
    return response


for modulo in (eu, cadastros, contagens, movimentacoes, painel, compras, relatorios):
    app.include_router(modulo.router)
