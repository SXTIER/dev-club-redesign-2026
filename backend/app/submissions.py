"""Persistent inquiries, FAQ bank and recruitment application endpoints."""
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from starlette.datastructures import UploadFile

from pydantic import StrictBool
from .common import Model, new_id, now, parse_payload
from .files import cv_download_info, discard_file, save_cv
from .mailer import send_reply
from .security import require_admin
from .submission_models import (
    ApplicationCreate, ApplicationStatus, FaqCreate, FaqUpdate,
    InquiryCreate, ReplyInput, TagsInput,
)

router = APIRouter()


@router.get("/inquiries", dependencies=[Depends(require_admin)])
def list_inquiries(request: Request):
    with request.app.state.store.transaction() as conn:
        return request.app.state.store.list(conn, "inquiry")


@router.post("/inquiries", status_code=201)
def create_inquiry(request: Request, payload: InquiryCreate):
    item = payload.model_dump(by_alias=True, exclude={"consent"})
    item.update(id=new_id("inquiry"), status="Unanswered", tags=[], createdAt=now())
    with request.app.state.store.transaction() as conn:
        request.app.state.store.put(conn, "inquiry", item["id"], item)
    return item


@router.post("/inquiries/{item_id}/reply")
def reply_inquiry(item_id: str, request: Request, payload: ReplyInput,
                        session: dict = Depends(require_admin)):
    store = request.app.state.store
    with store.transaction() as conn:
        item = store.get(conn, "inquiry", item_id)
    send_reply(request.app.state.settings, item["senderEmail"], item["question"], payload.body)
    with store.transaction() as conn:
        item = store.get(conn, "inquiry", item_id)
        item["reply"] = {"body": payload.body, "sentAt": now(), "sentBy": session["email"]}
        if payload.mark_answered:
            item["status"] = "Answered"
        store.put(conn, "inquiry", item_id, item)
    return item


@router.patch("/inquiries/{item_id}/tags", dependencies=[Depends(require_admin)])
def update_tags(item_id: str, request: Request, payload: TagsInput):
    store = request.app.state.store
    with store.transaction() as conn:
        item = store.get(conn, "inquiry", item_id)
        item["tags"] = payload.tags
        store.put(conn, "inquiry", item_id, item)
    return item


@router.get("/faq-bank", dependencies=[Depends(require_admin)])
def list_faq(request: Request):
    with request.app.state.store.transaction() as conn:
        return request.app.state.store.list(conn, "faq")


@router.post("/faq-bank", status_code=201, dependencies=[Depends(require_admin)])
def create_faq(request: Request, payload: FaqCreate):
    item = payload.model_dump(by_alias=True)
    item.update(id=new_id("faq-bank"), createdAt=now(), updatedAt=now())
    with request.app.state.store.transaction() as conn:
        request.app.state.store.put(conn, "faq", item["id"], item)
    return item


@router.patch("/faq-bank/{item_id}", dependencies=[Depends(require_admin)])
def update_faq(item_id: str, request: Request, payload: FaqUpdate):
    store = request.app.state.store
    with store.transaction() as conn:
        item = store.get(conn, "faq", item_id)
        item.update(payload.model_dump(by_alias=True, exclude_unset=True))
        item["updatedAt"] = now()
        store.put(conn, "faq", item_id, item)
    return item


@router.delete("/faq-bank/{item_id}", status_code=204, dependencies=[Depends(require_admin)])
def delete_faq(item_id: str, request: Request):
    with request.app.state.store.transaction() as conn:
        request.app.state.store.delete(conn, "faq", item_id)
    return Response(status_code=204)


@router.post("/faq-bank/{item_id}/copy-to-home", dependencies=[Depends(require_admin)])
def copy_faq(item_id: str, request: Request):
    store = request.app.state.store
    with store.transaction() as conn:
        item = store.get(conn, "faq", item_id)
        home = store.get(conn, "content", "home")
        public = {"id": f"faq-{item_id}", "question": item["question"], "answer": item["answer"]}
        items = home["faq"]["items"]
        for index, existing in enumerate(items):
            if existing["id"] == public["id"]:
                items[index] = public
                break
        else:
            items.append(public)
        item.update(promotedToHome=True, updatedAt=now())
        store.put(conn, "content", "home", home)
        store.put(conn, "faq", item_id, item)
    return public


@router.get("/recruitment/applications", dependencies=[Depends(require_admin)])
def list_applications(request: Request):
    with request.app.state.store.transaction() as conn:
        return request.app.state.store.list(conn, "application")


@router.post("/recruitment/applications", status_code=201)
async def submit_application(request: Request):
    upload = None
    if request.headers.get("content-type", "").startswith("multipart/form-data"):
        form = await request.form()
        if set(form.keys()) - {"payload", "cv"}:
            raise HTTPException(422, "Unexpected application fields")
        raw = form.get("payload")
        if not isinstance(raw, str):
            raise HTTPException(422, "A JSON payload is required")
        upload = form.get("cv")
        if upload is not None and not isinstance(upload, UploadFile):
            raise HTTPException(422, "CV must be an uploaded file")
    else:
        try:
            raw = await request.json()
        except ValueError as exc:
            raise HTTPException(422, "Invalid JSON payload") from exc
    payload = parse_payload(ApplicationCreate, raw)
    store = request.app.state.store
    file_id = None
    try:
        with store.transaction() as conn:
            config = store.get(conn, "content", "recruitment")
            if not config["isOpen"]:
                raise HTTPException(409, "Recruitment is closed")
            if payload.personal.program not in config["programs"] or payload.personal.year not in config["years"]:
                raise HTTPException(422, "Program or year is not currently eligible")
            roles = config["projectsTeamRoles" if payload.team == "projects" else "marketingTeamRoles"]
            role = next((role for role in roles if role["id"] == payload.role_id), None)
            if role is None:
                raise HTTPException(422, "Role is not available for this team")
            if role.get("isOther") and not payload.custom_role:
                raise HTTPException(422, "A custom role is required")
            if not role.get("isOther") and payload.custom_role:
                raise HTTPException(422, "This role does not accept a custom role")
            item = payload.model_dump(by_alias=True, exclude_none=True)
            item.update(id=new_id("application"), createdAt=now(), status="Pending", roleLabel=role["title"])
            if upload is not None:
                item["cv"] = await save_cv(request, conn, upload)
                file_id = item["cv"]["fileRef"]
            store.put(conn, "application", item["id"], item)
        return item
    except BaseException:
        if file_id:
            discard_file(request, file_id)
        raise
    finally:
        if upload is not None:
            await upload.close()


@router.patch("/recruitment/applications/{item_id}/status", dependencies=[Depends(require_admin)])
def update_status(item_id: str, request: Request, payload: ApplicationStatus):
    store = request.app.state.store
    with store.transaction() as conn:
        item = store.get(conn, "application", item_id)
        item["status"] = payload.status
        store.put(conn, "application", item_id, item)
    return item


@router.get("/recruitment/applications/{item_id}/cv", dependencies=[Depends(require_admin)])
def download_cv(item_id: str, request: Request):
    with request.app.state.store.transaction() as conn:
        item = request.app.state.store.get(conn, "application", item_id)
        if not item.get("cv"):
            raise HTTPException(404, "Application has no CV")
        return cv_download_info(request, item["cv"])


class RecruitmentStatus(Model):
    is_open: StrictBool


@router.patch("/recruitment/status", dependencies=[Depends(require_admin)])
def recruitment_status(request: Request, payload: RecruitmentStatus):
    store = request.app.state.store
    with store.transaction() as conn:
        config = store.get(conn, "content", "recruitment")
        config["isOpen"] = payload.is_open
        store.put(conn, "content", "recruitment", config)
    return config
