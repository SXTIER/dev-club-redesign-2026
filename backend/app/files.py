import hashlib
import hmac
import io
import secrets
import time
import warnings
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from defusedxml.ElementTree import fromstring
from defusedxml.common import DefusedXmlException
from fastapi import APIRouter, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse
from PIL import Image, UnidentifiedImageError

from .common import new_id, now
from .database import Store
from .security import optional_session

router = APIRouter()
MAX_BYTES = 10 * 1024 * 1024
SLOTS = {"site.logoDark", "site.logoLight", "home.hero.heroArtwork", "home.location.image"}
IMAGE_TYPES = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml"}


def fail(message):
    raise HTTPException(400, detail=message)


async def upload_bytes(upload):
    # Multipart parsing has finished; do not yield while a SQLite transaction is held.
    data = upload.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(413, detail="File exceeds 10 MB")
    if not data:
        fail("File is empty")
    filename = (upload.filename or "upload").replace("\\", "/").split("/")[-1]
    return filename, data


def bind_slot(conn, asset, slot):
    if slot not in SLOTS:
        fail("Unknown editable image slot")
    section, *parts = slot.split(".")
    content = Store.get(conn, "content", section)
    node = content
    for part in parts[:-1]:
        node = node[part]
    node[parts[-1]] = {"id": asset["id"], "src": asset["url"], "alt": asset["title"]}
    Store.put(conn, "content", section, content)
    for previous in Store.list(conn, "media"):
        if previous.get("sourceSlot") == slot and previous["id"] != asset["id"]:
            previous.pop("sourceSlot", None)
            Store.put(conn, "media", previous["id"], previous)
    asset["sourceSlot"] = slot
    Store.put(conn, "media", asset["id"], asset)
    return asset


def persist_file(request, conn, filename, mime, data, public):
    file_id = new_id("media" if public else "cv")
    directory = request.app.state.settings.data_dir / "uploads"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / file_id
    try:
        path.write_bytes(data)
        conn.execute("INSERT INTO files VALUES(?,?,?,?,?)", (file_id, filename, mime, len(data), int(public)))
    except BaseException:
        path.unlink(missing_ok=True)
        raise
    return file_id


def discard_file(request, file_id):
    # Only server-generated opaque IDs may become filesystem paths.
    if Path(file_id).name != file_id or "/" in file_id or "\\" in file_id:
        fail("Invalid file identifier")
    (request.app.state.settings.data_dir / "uploads" / file_id).unlink(missing_ok=True)


def sanitize_svg(data):
    try:
        root = fromstring(data)
    except Exception as error:
        raise HTTPException(400, detail="Invalid or unsafe SVG") from error
    if root.tag.split("}")[-1].lower() != "svg":
        fail("File is not an SVG")
    # Keep only inert vector geometry; no scripts, CSS, animations, links or embeds.
    allowed = {"svg", "g", "path", "rect", "circle", "ellipse", "line", "polyline", "polygon", "text", "tspan", "defs", "lineargradient", "radialgradient", "stop", "clippath", "mask", "title", "desc", "symbol", "use"}
    def clean(node):
        for child in list(node):
            if child.tag.split("}")[-1].lower() not in allowed:
                node.remove(child)
            else:
                clean(child)
        for key, value in list(node.attrib.items()):
            name = key.split("}")[-1].lower()
            normalized = "".join(value.split()).lower()
            if name.startswith("on") or name in {"style", "base"} or "javascript:" in normalized or "data:" in normalized or (name in {"href", "src"} and not normalized.startswith("#")) or ("url(" in normalized and not normalized.startswith("url(#")):
                del node.attrib[key]
    clean(root)
    return ET.tostring(root, encoding="utf-8", xml_declaration=True)


async def save_image(request, conn, upload: UploadFile, title=None, source_slot=None):
    if source_slot is not None and source_slot not in SLOTS:
        fail("Unknown editable image slot")
    filename, data = await upload_bytes(upload)
    suffix = Path(filename).suffix.lower()
    mime = IMAGE_TYPES.get(suffix)
    if not mime or upload.content_type not in {mime, "application/octet-stream"}:
        fail("Image extension and MIME type do not match")
    dimensions = {}
    if suffix == ".svg":
        original = data
        data = sanitize_svg(data)
        changed = data != original
    else:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                with Image.open(io.BytesIO(data)) as image:
                    if Image.MIME.get(image.format) != mime:
                        fail("Image contents do not match file type")
                    dimensions = {"width": image.width, "height": image.height}
                    image.verify()
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError) as error:
            raise HTTPException(400, detail="Invalid or oversized image contents") from error
    id = persist_file(request, conn, filename, mime, data, True)
    asset = {"id": id, "filename": filename, "title": title or filename, "mimeType": mime, "kind": "svg" if suffix == ".svg" else "image", "sizeBytes": len(data), "url": f"{request.app.state.settings.public_api_base.rstrip('/')}/files/{id}", "createdAt": now(), **dimensions}
    try:
        Store.put(conn, "media", id, asset)
        if source_slot:
            bind_slot(conn, asset, source_slot)
    except BaseException:
        discard_file(request, id)
        raise
    if suffix == ".svg":
        asset = {**asset, "sanitized": True, "sanitizationNote": "SVG restricted to inert vector markup." if changed else "SVG verified."}
    return asset


async def save_cv(request, conn, upload: UploadFile):
    filename, data = await upload_bytes(upload)
    suffix = Path(filename).suffix.lower()
    mime = {".pdf": "application/pdf", ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}.get(suffix)
    if not mime or upload.content_type not in {mime, "application/octet-stream"}:
        fail("CV must be PDF or DOCX with matching MIME type")
    if suffix == ".pdf" and not data.startswith(b"%PDF-"):
        fail("Invalid PDF contents")
    if suffix == ".docx":
        try:
            with zipfile.ZipFile(io.BytesIO(data)) as archive:
                entries = archive.infolist()
                if len(entries) > 2000 or sum(item.file_size for item in entries) > 50 * 1024 * 1024:
                    fail("DOCX expands beyond safe limits")
                names = set(archive.namelist())
                if not {"[Content_Types].xml", "word/document.xml"}.issubset(names) or any("vbaproject" in name.lower() for name in names):
                    fail("Invalid or macro-enabled DOCX")
                for name in ("[Content_Types].xml", "word/document.xml"):
                    fromstring(archive.read(name))
        except (zipfile.BadZipFile, KeyError, ET.ParseError, DefusedXmlException) as error:
            raise HTTPException(400, detail="Invalid DOCX contents") from error
    id = persist_file(request, conn, filename, mime, data, False)
    return {"fileRef": id, "filename": filename, "mimeType": mime, "sizeBytes": len(data)}


def signing_key(settings):
    path = settings.data_dir / "download.key"
    try:
        with path.open("xb") as file:
            file.write(secrets.token_bytes(32))
        path.chmod(0o600)
    except FileExistsError:
        pass
    return path.read_bytes()


def sign_download(settings, id, expires):
    return hmac.new(signing_key(settings), f"{id}:{expires}".encode(), hashlib.sha256).hexdigest()


def cv_download_info(request, cv):
    settings = request.app.state.settings
    expires = int(time.time()) + settings.cv_url_seconds
    id = cv["fileRef"]
    return {"url": f"{settings.public_api_base.rstrip('/')}/files/{id}?expires={expires}&signature={sign_download(settings, id, expires)}", "filename": cv["filename"], "mimeType": cv["mimeType"]}


@router.get("/files/{file_id}")
def download(file_id: str, request: Request, expires: int = 0, signature: str = ""):
    settings = request.app.state.settings
    with request.app.state.store.transaction() as conn:
        record = conn.execute("SELECT * FROM files WHERE id=?", (file_id,)).fetchone()
    if not record:
        raise HTTPException(404, detail="File not found")
    if not record["public"] and not optional_session(request):
        if expires <= int(time.time()) or not hmac.compare_digest(signature, sign_download(settings, file_id, expires)):
            raise HTTPException(403, detail="Download link is invalid or expired")
    path = settings.data_dir / "uploads" / record["id"]
    if not path.is_file():
        raise HTTPException(404, detail="File not found")
    return FileResponse(path, media_type=record["mime_type"], filename=record["filename"], content_disposition_type="inline" if record["public"] or record["mime_type"] == "application/pdf" else "attachment", headers={"X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'", "Cache-Control": "no-store"})
