import hashlib
import hmac
import secrets
import time

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import EmailStr, Field, model_validator

from .common import Model, now

router = APIRouter()
COOKIE = "devclub_session"


def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return f"{salt}:{digest}"


def verify_password(password: str, stored: str) -> bool:
    salt, expected = stored.split(":")
    actual = hashlib.scrypt(password.encode(), salt=bytes.fromhex(salt), n=16384, r=8, p=1).hex()
    return hmac.compare_digest(actual, expected)


DUMMY_HASH = hash_password(secrets.token_urlsafe(32))


def set_admin(store, email: str, password: str):
    if len(password) < 12:
        raise ValueError("Admin password must contain at least 12 characters")
    with store.transaction() as conn:
        conn.execute("INSERT INTO admins(email,password_hash) VALUES(?,?) ON CONFLICT(email) DO UPDATE SET password_hash=excluded.password_hash", (email.lower(), hash_password(password)))
        conn.execute("DELETE FROM sessions WHERE email=?", (email.lower(),))


def session_token(request: Request):
    return request.cookies.get(COOKIE)


def optional_session(request: Request) -> dict | None:
    token = session_token(request)
    if not token:
        return None
    with request.app.state.store.transaction() as conn:
        row = conn.execute("SELECT email,created_at FROM sessions WHERE token_hash=? AND expires_at>?", (hashlib.sha256(token.encode()).hexdigest(), int(time.time()))).fetchone()
    return {"email": row["email"], "authenticated": True, "loggedInAt": row["created_at"]} if row else None


def require_admin(request: Request) -> dict:
    session = optional_session(request)
    if not session:
        raise HTTPException(401, detail="Not authenticated")
    return session


class Login(Model):
    email: EmailStr
    password: str = Field(min_length=6, max_length=1024)
    confirm_password: str

    @model_validator(mode="after")
    def matching_passwords(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


@router.post("/auth/login")
def login(data: Login, request: Request, response: Response):
    store, settings = request.app.state.store, request.app.state.settings
    email = str(data.email).lower()
    key = f"{request.client.host if request.client else 'unknown'}:{email}"
    current = int(time.time())
    with store.transaction() as conn:
        conn.execute("DELETE FROM sessions WHERE expires_at<=?", (current,))
        conn.execute("DELETE FROM login_attempts WHERE expires_at<=?", (current,))
        attempts = conn.execute("SELECT failures FROM login_attempts WHERE key=?", (key,)).fetchone()
        if attempts and attempts["failures"] >= 10:
            raise HTTPException(429, detail="Too many login attempts; try again in 15 minutes")
        admin = conn.execute("SELECT password_hash FROM admins WHERE email=?", (email,)).fetchone()
        valid = verify_password(data.password, admin[0] if admin else DUMMY_HASH) and admin is not None
        if not valid:
            conn.execute("INSERT INTO login_attempts(key,failures,expires_at) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET failures=failures+1", (key, current + 900))
        else:
            token, created = secrets.token_urlsafe(32), now()
            old = session_token(request)
            if old:
                conn.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(old.encode()).hexdigest(),))
            conn.execute("DELETE FROM login_attempts WHERE key=?", (key,))
            conn.execute("INSERT INTO sessions VALUES(?,?,?,?)", (hashlib.sha256(token.encode()).hexdigest(), email, created, current + settings.session_seconds))
    if not valid:
        raise HTTPException(401, detail="Invalid email or password")
    response.set_cookie(COOKIE, token, httponly=True, secure=settings.cookie_secure, samesite="lax", max_age=settings.session_seconds, path="/")
    response.headers["Cache-Control"] = "no-store"
    return {"email": email, "authenticated": True, "loggedInAt": created}


@router.get("/auth/me")
def me(session: dict = Depends(require_admin)):
    return session


@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response):
    token = session_token(request)
    if token:
        with request.app.state.store.transaction() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash=?", (hashlib.sha256(token.encode()).hexdigest(),))
    response.delete_cookie(COOKIE, path="/", secure=request.app.state.settings.cookie_secure, httponly=True, samesite="lax")
