import json
import smtplib
from urllib.parse import urlsplit

from fastapi.testclient import TestClient
import pytest


@pytest.fixture
def client(app):
    with TestClient(app, base_url="http://testserver/api/v1/") as session:
        yield session


@pytest.fixture
def admin(client):
    response = client.post("/auth/login", json={"email": "admin@example.com", "password": "password123!", "confirmPassword": "password123!"})
    assert response.status_code == 200
    return client


def inquiry(client):
    response = client.post("/inquiries", json={"question": "Can I join?", "senderEmail": "student@example.com", "category": "Recruitment", "consent": True})
    assert response.status_code == 201
    return response.json()


def application(client):
    config = client.get("/content/recruitment").json()
    role = next(role for role in config["projectsTeamRoles"] if not role.get("isOther"))
    return {"personal": {"firstName": "First", "lastName": "Last", "nickname": "Name", "studentId": "6981234", "email": "student@example.com", "phone": "0891234567", "program": config["programs"][0], "year": config["years"][0]}, "team": "projects", "roleId": role["id"], "roleLabel": "Caller forged label", "motivation": {"expectation": "Learn", "contribution": "Build", "projectIdea": "A website", "teamExperience": "School"}, "agreedRequirements": True, "agreedPdpa": True}


def submit(client, payload, cv=None):
    files = {"payload": (None, json.dumps(payload))}
    if cv:
        files["cv"] = cv
    return client.post("/recruitment/applications", files=files)


def test_private_lists_require_auth(client):
    for path in ("/inquiries", "/faq-bank", "/recruitment/applications"):
        assert client.get(path).status_code == 401


@pytest.mark.parametrize("change", [{"consent": False}, {"consent": 1}, {"senderEmail": "invalid"}, {"senderEmail": "x@example.com\r\nBcc: victim@example.com"}, {"question": " "}])
def test_inquiry_validation(client, change):
    payload = {"question": "Question", "senderEmail": "a@example.com", "category": "General", "consent": True}
    payload.update(change)
    assert client.post("/inquiries", json=payload).status_code == 422


def test_unconfigured_email_keeps_inquiry_unanswered(admin, monkeypatch):
    from backend.app import mailer
    item = inquiry(admin)
    monkeypatch.setattr(admin.app.state.settings, "smtp_host", None)
    response = admin.post(f"/inquiries/{item['id']}/reply", json={"body": "Welcome"})
    assert response.status_code == 503
    stored = next(row for row in admin.get("/inquiries").json() if row["id"] == item["id"])
    assert stored["status"] == "Unanswered"
    assert "reply" not in stored


def test_reply_uses_real_smtp_and_session_identity(admin, monkeypatch):
    item = inquiry(admin)
    sent = []

    class SMTP:
        def __init__(self, *args, **kwargs):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *args):
            pass

        def send_message(self, message):
            sent.append(message)
            return {}

    monkeypatch.setattr(admin.app.state.settings, "smtp_host", "localhost")
    monkeypatch.setattr(smtplib, "SMTP", SMTP)
    response = admin.post(f"/inquiries/{item['id']}/reply", json={"body": "Welcome", "markAnswered": False})
    assert response.status_code == 200
    assert response.json()["status"] == "Unanswered"
    assert response.json()["reply"]["sentBy"] == "admin@example.com"
    assert sent[0]["To"] == item["senderEmail"]
    assert "Welcome" in sent[0].get_content()
    assert admin.post(f"/inquiries/{item['id']}/reply", json={"body": "x", "sentBy": "forged"}).status_code == 422


def test_smtp_failure_does_not_record_reply(admin, monkeypatch):
    item = inquiry(admin)
    monkeypatch.setattr(admin.app.state.settings, "smtp_host", "localhost")

    def fail(*args, **kwargs):
        raise smtplib.SMTPException("delivery failed")

    monkeypatch.setattr(smtplib, "SMTP", fail)
    assert admin.post(f"/inquiries/{item['id']}/reply", json={"body": "Welcome"}).status_code == 502
    stored = next(row for row in admin.get("/inquiries").json() if row["id"] == item["id"])
    assert stored["status"] == "Unanswered"
    assert "reply" not in stored


def test_faq_copy_is_idempotent_one_way_and_persistent(admin):
    response = admin.post("/faq-bank", json={"question": "Who can join?", "answer": "Everyone", "category": "General"})
    assert response.status_code == 201
    item_id = response.json()["id"]
    first = admin.post(f"/faq-bank/{item_id}/copy-to-home").json()
    assert admin.post(f"/faq-bank/{item_id}/copy-to-home").json() == first
    items = admin.get("/content/home").json()["faq"]["items"]
    assert sum(item["id"] == first["id"] for item in items) == 1
    assert admin.patch(f"/faq-bank/{item_id}", json={"answer": "Updated"}).status_code == 200
    assert next(item for item in admin.get("/content/home").json()["faq"]["items"] if item["id"] == first["id"])["answer"] == "Everyone"
    assert admin.delete(f"/faq-bank/{item_id}").status_code == 204
    assert any(item["id"] == first["id"] for item in admin.get("/content/home").json()["faq"]["items"])


def test_application_authoritative_role_status_and_current_config(admin):
    payload = application(admin)
    response = submit(admin, payload)
    assert response.status_code == 201
    item = response.json()
    config = admin.get("/content/recruitment").json()
    assert item["roleLabel"] == next(role["title"] for role in config["projectsTeamRoles"] if role["id"] == payload["roleId"])
    assert item["status"] == "Pending"
    assert admin.patch(f"/recruitment/applications/{item['id']}/status", json={"status": "Accepted"}).json()["status"] == "Accepted"
    assert any(row["id"] == item["id"] and row["status"] == "Accepted" for row in admin.get("/recruitment/applications").json())
    config["isOpen"] = False
    assert admin.put("/content/recruitment", json=config).status_code == 200
    assert submit(admin, payload).status_code == 409


@pytest.mark.parametrize("change", [{"cv": {"fileRef": "forged", "filename": "cv.pdf", "mimeType": "application/pdf", "sizeBytes": 10}}, {"roleId": "nonexistent"}, {"customRole": "Unexpected"}, {"agreedPdpa": False}, {"agreedRequirements": 1}])
def test_application_rejects_invalid_or_forged_fields(client, change):
    payload = application(client)
    payload.update(change)
    assert submit(client, payload).status_code == 422


def test_application_validates_program_year_and_custom_role(admin):
    payload = application(admin)
    payload["personal"]["program"] = "Unknown"
    assert submit(admin, payload).status_code == 422
    payload = application(admin)
    payload["personal"]["year"] = "99"
    assert submit(admin, payload).status_code == 422
    config = admin.get("/content/recruitment").json()
    role = next(role for role in config["projectsTeamRoles"] if role.get("isOther"))
    payload = application(admin)
    payload["roleId"] = role["id"]
    assert submit(admin, payload).status_code == 422
    payload["customRole"] = "Accessibility engineer"
    assert submit(admin, payload).status_code == 201


def test_cv_private_signed_link_and_invalid_upload_rollback(admin, app):
    client = TestClient(app, base_url="http://testserver/api/v1/")
    payload = application(admin)
    before = len(admin.get("/recruitment/applications").json())
    assert submit(admin, payload, ("cv.exe", b"bad", "application/octet-stream")).status_code in (400, 422)
    assert len(admin.get("/recruitment/applications").json()) == before
    response = submit(admin, payload, ("cv.pdf", b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "application/pdf"))
    assert response.status_code == 201
    item = response.json()
    assert "url" not in item["cv"]
    assert admin.get(f"/recruitment/applications/{item['id']}/cv").status_code == 200
    assert client.get(f"/recruitment/applications/{item['id']}/cv").status_code == 401
    info = admin.get(f"/recruitment/applications/{item['id']}/cv").json()
    assert "signature=" in info["url"]
    parsed = urlsplit(info["url"])
    path = parsed.path
    if path.startswith("/api/backend"):
        path = path[len("/api/backend"):]
    assert client.get(path).status_code in (401, 403)
    assert client.get(path + "?" + parsed.query).status_code == 200


def test_cv_file_removed_when_application_write_fails(admin, settings, monkeypatch):
    payload = application(admin)
    store = admin.app.state.store
    original_put = store.put
    uploads = settings.data_dir / "uploads"
    before = set(uploads.iterdir()) if uploads.exists() else set()

    def failing_put(conn, kind, item_id, data):
        if kind == "application":
            raise RuntimeError("Application persistence failed")
        return original_put(conn, kind, item_id, data)

    with monkeypatch.context() as patch:
        patch.setattr(store, "put", failing_put)
        with pytest.raises(RuntimeError, match="Application persistence failed"):
            submit(admin, payload, ("cv.pdf", b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF", "application/pdf"))
    assert (set(uploads.iterdir()) if uploads.exists() else set()) == before
