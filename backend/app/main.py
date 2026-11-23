from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exception_handlers import http_exception_handler
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from . import content, events, files, media, security, submissions
from .config import Settings
from .database import Store


class BodyLimitMiddleware:
    def __init__(self, app, limit=11 * 1024 * 1024):
        self.app, self.limit = app, limit

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers", []))
        try:
            too_large = int(headers.get(b"content-length", b"0")) > self.limit
        except ValueError:
            too_large = True
        if too_large:
            return await JSONResponse({"detail": "Request exceeds upload limit"}, status_code=413)(scope, receive, send)
        consumed = 0
        async def bounded_receive():
            nonlocal consumed
            message = await receive()
            consumed += len(message.get("body", b""))
            if consumed > self.limit:
                raise HTTPException(413, detail="Request exceeds upload limit")
            return message
        await self.app(scope, bounded_receive, send)


def create_app(settings: Settings | None = None):
    settings = settings or Settings()
    store = Store(settings)

    @asynccontextmanager
    async def lifespan(app):
        store.initialize()
        files.signing_key(settings)
        yield

    app = FastAPI(title="MUICT Dev Club API", version="1.0.0", lifespan=lifespan)
    app.state.settings, app.state.store = settings, store
    app.add_middleware(BodyLimitMiddleware)
    app.add_middleware(CORSMiddleware, allow_origins=list(settings.allowed_origins), allow_credentials=True, allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"], allow_headers=["Content-Type", "Authorization"])

    @app.middleware("http")
    async def origin_and_cache(request: Request, call_next):
        origin = request.headers.get("origin")
        if request.method not in {"GET", "HEAD", "OPTIONS"} and origin and origin not in settings.allowed_origins:
            return JSONResponse({"detail": "Origin is not allowed"}, status_code=403)
        response = await call_next(request)
        if request.url.path.startswith("/api/"):
            response.headers["Cache-Control"] = "no-store"
        response.headers["X-Content-Type-Options"] = "nosniff"
        return response

    @app.exception_handler(HTTPException)
    async def structured_errors(request, error):
        if isinstance(error.detail, dict) and "code" in error.detail:
            return JSONResponse(error.detail, status_code=error.status_code, headers=error.headers)
        return await http_exception_handler(request, error)

    @app.get("/api/v1/health")
    def health():
        return {"status": "ok"}

    for router in (security.router, content.router, media.router, files.router, events.router, submissions.router):
        app.include_router(router, prefix="/api/v1")
    app.mount("/images", StaticFiles(directory=settings.public_dir / "images"), name="seed-images")
    return app


app = create_app()
