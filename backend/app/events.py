"""Event CRUD, with public draft isolation and atomic image uploads."""
import json
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response
from pydantic import Field, StrictBool, StrictInt
from starlette.datastructures import UploadFile

from .common import Model, NonEmpty, new_id, now, parse_payload
from .content_models import ImageAsset
from .files import discard_file, save_image
from .security import optional_session, require_admin

router = APIRouter()


class EventInput(Model):
    marker: NonEmpty
    title: NonEmpty
    subtitle: NonEmpty
    category: Literal['Event', 'News']
    date_label: NonEmpty
    location: NonEmpty
    description: NonEmpty
    cover_image: ImageAsset | None = None
    status: Literal['Published', 'Draft']
    show_on_home: StrictBool
    order: Annotated[StrictInt, Field(ge=0)]


class EventItem(EventInput):
    id: NonEmpty
    updated_at: NonEmpty


async def event_payload(request: Request) -> tuple[dict, UploadFile | None]:
    content_type = request.headers.get('content-type', '').split(';', 1)[0].lower()
    cover = None
    try:
        if content_type == 'application/json':
            data = await request.json()
        elif content_type == 'multipart/form-data':
            form = await request.form()
            if set(form.keys()) - {'payload', 'cover'}:
                raise HTTPException(422, detail='Unexpected multipart fields')
            if len(form.getlist('payload')) != 1 or len(form.getlist('cover')) > 1:
                raise HTTPException(422, detail='Expected one payload and at most one cover')
            raw = form.get('payload')
            if not isinstance(raw, str):
                raise HTTPException(422, detail='payload must be a JSON string')
            data = json.loads(raw)
            cover = form.get('cover')
            if cover is not None and not isinstance(cover, UploadFile):
                raise HTTPException(422, detail='cover must be an uploaded file')
        else:
            raise HTTPException(415, detail='Use application/json or multipart/form-data')
    except (ValueError, UnicodeDecodeError) as exc:
        raise HTTPException(422, detail='Invalid JSON payload') from exc
    if not isinstance(data, dict):
        raise HTTPException(422, detail='payload must be an object')
    return data, cover


@router.get('/events')
def list_events(
    request: Request,
    published: bool | None = None,
    show_on_home: Annotated[bool | None, Query(alias='showOnHome')] = None,
    session=Depends(optional_session),
):
    store = request.app.state.store
    with store.transaction() as conn:
        events = store.list(conn, 'event')
    # A query parameter is never an authorization mechanism.
    if session is None:
        events = [item for item in events if item['status'] == 'Published']
    if published is not None:
        events = [item for item in events if (item['status'] == 'Published') == published]
    if show_on_home is not None:
        events = [item for item in events if item['showOnHome'] == show_on_home]
    return sorted(events, key=lambda item: item['order'])


async def save_event(request: Request, event_id: str | None):
    payload, cover = await event_payload(request)
    store = request.app.state.store
    uploaded_id = None
    try:
        with store.transaction() as conn:
            if event_id is None:
                validated = parse_payload(EventInput, payload)
                event_id = new_id('evt')
            else:
                existing = store.get(conn, 'event', event_id)
                # Validate the patch through the complete input model, never accepting
                # client-owned IDs/timestamps or null required fields.
                patchable = set(EventInput.model_fields)
                aliases = {field.alias for field in EventInput.model_fields.values()}
                if set(payload) - patchable - aliases:
                    raise HTTPException(422, detail='Unexpected event fields')
                merged = {key: value for key, value in existing.items() if key not in {'id', 'updatedAt'}}
                # Normalize names before merging so snake/camel aliases cannot mask a patch.
                for name, field in EventInput.model_fields.items():
                    alias = field.alias or name
                    if name in payload and alias != name and alias in payload:
                        raise HTTPException(422, detail=f'Duplicate field: {alias}')
                    if name in payload:
                        merged[alias] = payload[name]
                    elif alias in payload:
                        merged[alias] = payload[alias]
                validated = parse_payload(EventInput, merged)
            result = validated.model_dump(by_alias=True, exclude_none=True)
            if cover is not None:
                asset = await save_image(request, conn, cover, title=validated.title)
                uploaded_id = asset['id']
                result['coverImage'] = {'id': asset['id'], 'src': asset['url'], 'alt': validated.title}
            result.update(id=event_id, updatedAt=now())
            result = parse_payload(EventItem, result).model_dump(by_alias=True, exclude_none=True)
            store.put(conn, 'event', event_id, result)
        return result
    except BaseException:
        if uploaded_id is not None:
            discard_file(request, uploaded_id)
        raise
    finally:
        if cover is not None:
            await cover.close()


@router.post('/events', status_code=201, dependencies=[Depends(require_admin)])
async def create_event(request: Request):
    return await save_event(request, None)


@router.patch('/events/{event_id}', dependencies=[Depends(require_admin)])
async def update_event(event_id: str, request: Request):
    return await save_event(request, event_id)


@router.delete('/events/{event_id}', status_code=204, dependencies=[Depends(require_admin)])
def delete_event(event_id: str, request: Request):
    store = request.app.state.store
    with store.transaction() as conn:
        store.delete(conn, 'event', event_id)
    return Response(status_code=204)
