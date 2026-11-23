"""Public content reads and authenticated full-document replacement."""
from typing import Literal

from fastapi import APIRouter, Body, Depends, Request, Response

from .common import parse_payload
from .content_models import CONTENT_MODELS
from .security import require_admin

router = APIRouter()
Section = Literal['site', 'home', 'recruitment', 'legal']


@router.post('/content/reset', status_code=204, dependencies=[Depends(require_admin)])
def reset_content(request: Request):
    store = request.app.state.store
    with store.transaction() as conn:
        store.seed_content(conn)
    return Response(status_code=204)


@router.get('/content/{section}')
def get_content(section: Section, request: Request):
    store = request.app.state.store
    with store.transaction() as conn:
        return store.get(conn, 'content', section)


@router.put('/content/{section}', dependencies=[Depends(require_admin)])
def replace_content(section: Section, request: Request, payload: dict = Body(...)):
    content = parse_payload(CONTENT_MODELS[section], payload).model_dump(
        by_alias=True, exclude_none=True
    )
    store = request.app.state.store
    with store.transaction() as conn:
        store.put(conn, 'content', section, content)
    return content
