"""Guarda e lê fotos e anexos (spec 005). O tipo é conferido pelos primeiros bytes, não pela extensão; o arquivo fica
com nome sorteado em pastas por mês e o nome original só no banco. Nada disso entra no git (constituição).
"""
import uuid
from pathlib import Path

from fastapi import HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import Eu
from app.core.config import get_settings
from app.core.tempo import agora
from app.models import Arquivo

EXTENSAO = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp", "image/heic": ".heic",
            "application/pdf": ".pdf"}


def tipo_pelo_conteudo(inicio: bytes) -> str | None:
    if inicio.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if inicio.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if inicio[:4] == b"RIFF" and inicio[8:12] == b"WEBP":
        return "image/webp"
    if inicio[4:8] == b"ftyp" and inicio[8:12] in (b"heic", b"heix", b"mif1", b"heim", b"heis"):
        return "image/heic"
    if inicio.startswith(b"%PDF-"):
        return "application/pdf"
    return None


def raiz() -> Path:
    return Path(get_settings().arquivos_dir).resolve()


def url(arquivo_id: object | None) -> str | None:
    return f"/api/v1/arquivos/{arquivo_id}" if arquivo_id else None


def view(a: Arquivo) -> dict:
    return {"id": str(a.id), "nome": a.nome, "tipo": a.tipo, "tamanho": a.tamanho, "url": url(a.id)}


async def salvar(db: AsyncSession, eu: Eu, unidade_id: uuid.UUID, upload: UploadFile, *,
                 so_imagem: bool = False) -> Arquivo:
    """Confere tamanho e tipo, grava no disco e insere a linha (flush, sem commit: quem chama faz o commit).

    O flush vem já porque o anexo e o item da contagem apontam para o arquivo: sem ele, o Postgres pode receber o
    anexo antes do arquivo e recusar pela chave estrangeira.
    """
    limite = get_settings().arquivo_max_bytes
    conteudo = await upload.read(limite + 1)
    if len(conteudo) > limite:
        raise HTTPException(413, f"O arquivo passa de {limite // (1024 * 1024)} MB.")
    if not conteudo:
        raise HTTPException(422, "O arquivo está vazio.")
    tipo = tipo_pelo_conteudo(conteudo[:16])
    if tipo is None or (so_imagem and not tipo.startswith("image/")):
        aceitos = "foto (JPEG, PNG, WebP ou HEIC)" if so_imagem else "foto (JPEG, PNG, WebP ou HEIC) ou PDF"
        raise HTTPException(422, f"Tipo de arquivo não aceito. Envie uma {aceitos}.")
    arquivo_id = uuid.uuid4()
    relativo = Path(agora().strftime("%Y-%m")) / f"{arquivo_id}{EXTENSAO[tipo]}"
    destino = raiz() / relativo
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_bytes(conteudo)
    nome = Path(upload.filename or "arquivo").name[:200] or "arquivo"
    a = Arquivo(id=arquivo_id, nome=nome, tipo=tipo, tamanho=len(conteudo), caminho=relativo.as_posix(),
                unidade_id=unidade_id, autor=eu.nome)
    db.add(a)
    await db.flush()
    return a


def caminho_no_disco(a: Arquivo) -> Path:
    p = (raiz() / a.caminho).resolve()
    if raiz() not in p.parents:  # o caminho vem do banco, mas conferimos assim mesmo
        raise HTTPException(404, "Arquivo não encontrado.")
    return p
