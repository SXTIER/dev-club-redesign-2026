import io

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import create_app

BASE = "/api/v1"
LOGIN = {"email": "admin@example.com", "password": "password123!", "confirmPassword": "password123!"}


def image_bytes():
    data = io.BytesIO()
    Image.new("RGB", (2, 3), "blue").save(data, format="PNG")
    return data.getvalue()


def test_private_routes_require_real_credentials_and_logout_revokes_session(client):
    assert client.get(f"{BASE}/auth/me").status_code == 401
    assert client.get(f"{BASE}/inquiries").status_code == 401
    assert client.post(f"{BASE}/auth/login", json={**LOGIN, "password": "incorrect123", "confirmPassword": "incorrect123"}).status_code == 401
    response = client.post(f"{BASE}/auth/login", json=LOGIN)
    cookie = response.headers["set-cookie"]
    assert "HttpOnly" in cookie and "SameSite=lax" in cookie
    saved = dict(client.cookies)
    assert client.get(f"{BASE}/auth/me").json()["email"] == LOGIN["email"]
    assert client.post(f"{BASE}/auth/logout").status_code == 204
    client.cookies.update(saved)
    assert client.get(f"{BASE}/auth/me").status_code == 401


def test_cross_origin_writes_are_rejected(admin):
    assert admin.post(f"{BASE}/content/reset", headers={"Origin": "https://attacker.example"}).status_code == 403


def test_login_rate_limit_is_persistent(client):
    bad = {**LOGIN, "password": "incorrect123", "confirmPassword": "incorrect123"}
    for _ in range(10):
        assert client.post(f"{BASE}/auth/login", json=bad).status_code == 401
    assert client.post(f"{BASE}/auth/login", json=LOGIN).status_code == 429


def test_media_upload_slot_and_reference_protection(admin, settings):
    uploaded = admin.post(f"{BASE}/media", data={"payload": '{"title":"New logo","sourceSlot":"site.logoDark"}'}, files={"file": ("logo.png", image_bytes(), "image/png")})
    assert uploaded.status_code == 201, uploaded.text
    asset = uploaded.json()
    assert (asset["width"], asset["height"]) == (2, 3)
    assert admin.get(f"{BASE}/content/site").json()["logoDark"]["id"] == asset["id"]
    conflict = admin.delete(f"{BASE}/media/{asset['id']}")
    assert conflict.status_code == 409
    assert "site.logoDark" in conflict.json()["usedBy"]
    with TestClient(create_app(settings)) as anonymous:
        assert anonymous.get(f"{BASE}/files/{asset['id']}").content == image_bytes()
        assert anonymous.delete(f"{BASE}/media/{asset['id']}").status_code == 401
    assert admin.post(f"{BASE}/content/reset").status_code == 204
    assert admin.delete(f"{BASE}/media/{asset['id']}").status_code == 204
    assert admin.get(f"{BASE}/files/{asset['id']}").status_code == 404


def test_svg_active_content_removed_and_mismatched_images_rejected(admin):
    svg = b'<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>alert(1)</script><foreignObject/><rect width="2" height="2" fill="blue"/><use href="https://evil.example/x.svg"/></svg>'
    response = admin.post(f"{BASE}/media", files={"file": ("safe.svg", svg, "image/svg+xml")})
    assert response.status_code == 201
    asset = response.json()
    result = admin.get(f"{BASE}/files/{asset['id']}")
    assert b"script" not in result.content and b"onload" not in result.content and b"foreignObject" not in result.content and b"evil.example" not in result.content
    assert b"rect" in result.content
    assert result.headers["x-content-type-options"] == "nosniff"
    invalid = admin.post(f"{BASE}/media", files={"file": ("fake.png", b"not an image", "image/png")})
    assert invalid.status_code == 400
    too_large = admin.post(f"{BASE}/media", files={"file": ("big.png", b"x" * (10 * 1024 * 1024 + 1), "image/png")})
    assert too_large.status_code == 413


def test_content_and_session_survive_restart(admin, settings):
    content = admin.get(f"{BASE}/content/site").json()
    content["brandName"] = "Persisted club"
    assert admin.put(f"{BASE}/content/site", json=content).status_code == 200
    with TestClient(create_app(settings)) as restarted:
        restarted.cookies.update(dict(admin.cookies))
        assert restarted.get(f"{BASE}/auth/me").status_code == 200
        assert restarted.get(f"{BASE}/content/site").json()["brandName"] == "Persisted club"
