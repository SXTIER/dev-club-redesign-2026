import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile

from .common import Model, NonEmpty, parse_payload
from .database import Store
from .files import bind_slot, discard_file, save_image
from .security import require_admin

router = APIRouter()


class MediaMeta(Model):
    title: NonEmpty | None = None
    source_slot: str | None = None


class Slot(Model):
    slot: str


def references(conn, asset):
    used = []
    def scan(node, path):
        if isinstance(node, dict):
            if node.get("id") == asset["id"] or node.get("src") == asset["url"]:
                used.append(path)
                return
            for key, value in node.items():
                scan(value, f"{path}.{key}")
        elif isinstance(node, list):
            for index, value in enumerate(node):
                scan(value, f"{path}.{index}")
    for section in ("site", "home"):
        scan(Store.get(conn, "content", section), section)
    for event in Store.list(conn, "event"):
        scan(event.get("coverImage"), f"events.{event['id']}.coverImage")
    return used


@router.get("/media")
def list_media(request: Request):
    with request.app.state.store.transaction() as conn:
        return Store.list(conn, "media")


@router.post("/media", status_code=201, dependencies=[Depends(require_admin)])
async def upload_media(request: Request, payload: str = Form("{}"), file: UploadFile = File(...)):
    meta = parse_payload(MediaMeta, payload)
    with request.app.state.store.transaction() as conn:
        return await save_image(request, conn, file, title=meta.title, source_slot=meta.source_slot)


@router.patch("/media/{asset_id}/slot", dependencies=[Depends(require_admin)])
def assign_slot(asset_id: str, data: Slot, request: Request):
    with request.app.state.store.transaction() as conn:
        return bind_slot(conn, Store.get(conn, "media", asset_id), data.slot)


@router.delete("/media/{asset_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_media(asset_id: str, request: Request):
    store = request.app.state.store
    with store.transaction() as conn:
        asset = Store.get(conn, "media", asset_id)
        used = references(conn, asset)
        for index, meme in enumerate(store.read_seed("admin-seed").get("signinMemes", [])):
            if asset["id"] in json.dumps(meme) or asset["url"] in json.dumps(meme):
                used.append(f"admin.signinMemes.{index}")
        if used:
            raise HTTPException(409, detail={"code": "ASSET_IN_USE", "message": "Asset is currently in use", "usedBy": used})
        Store.delete(conn, "media", asset_id)
        conn.execute("DELETE FROM files WHERE id=?", (asset_id,))
    discard_file(request, asset_id)
