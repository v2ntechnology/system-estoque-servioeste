"""Envio e leitura de fotos e anexos (spec 005). Só quem vê a unidade do arquivo consegue abri-lo."""
from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse

from app.api.deps import DB, EuAtual, uuid_ou_404
from app.models import Arquivo
from app.papeis import pode
from app.services import arquivos

router = APIRouter(prefix="/api/v1")


@router.post("/arquivos")
async def enviar(eu: EuAtual, db: DB, arquivo: UploadFile = File(...), unidade_id: str = Form(...)) -> dict:  # noqa: B008
    """Foto de item da contagem. Os anexos de cotação vão pela própria cotação."""
    if not pode(eu.papeis, "contagem.registrar"):
        raise HTTPException(403, "Seu papel não permite esta ação.")
    u = uuid_ou_404(unidade_id, "Unidade não encontrada.")
    if not eu.ve(u):
        raise HTTPException(403, "Esta unidade não está liberada para você.")
    a = await arquivos.salvar(db, eu, u, arquivo, so_imagem=True)
    await db.commit()
    return arquivos.view(a)


@router.get("/arquivos/{id}")
async def abrir(id: str, eu: EuAtual, db: DB) -> FileResponse:
    a = await db.get(Arquivo, uuid_ou_404(id, "Arquivo não encontrado."))
    if a is None or not eu.ve(a.unidade_id):
        raise HTTPException(404, "Arquivo não encontrado.")
    caminho = arquivos.caminho_no_disco(a)
    if not caminho.is_file():
        raise HTTPException(404, "Arquivo não encontrado.")
    imagem = a.tipo.startswith("image/")
    return FileResponse(caminho, media_type=a.tipo, filename=a.nome,
                        content_disposition_type="inline" if imagem else "attachment")
