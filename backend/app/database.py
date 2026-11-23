import json
import sqlite3
from contextlib import contextmanager

from fastapi import HTTPException

from .config import Settings


class Store:
    def __init__(self, settings: Settings):
        self.settings = settings
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        self.path = settings.data_dir / "devclub.sqlite3"

    @contextmanager
    def transaction(self):
        conn = sqlite3.connect(self.path, timeout=15)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA foreign_keys=ON")
            conn.execute("BEGIN IMMEDIATE")
            yield conn
            conn.commit()
        except BaseException:
            conn.rollback()
            raise
        finally:
            conn.close()

    def initialize(self):
        with self.transaction() as conn:
            conn.execute("CREATE TABLE IF NOT EXISTS documents (kind TEXT NOT NULL, id TEXT NOT NULL, data TEXT NOT NULL CHECK(json_valid(data)), PRIMARY KEY(kind,id))")
            conn.execute("CREATE TABLE IF NOT EXISTS admins (email TEXT PRIMARY KEY, password_hash TEXT NOT NULL)")
            conn.execute("CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, email TEXT NOT NULL REFERENCES admins(email) ON DELETE CASCADE, created_at TEXT NOT NULL, expires_at INTEGER NOT NULL)")
            conn.execute("CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, filename TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL, public INTEGER NOT NULL)")
            conn.execute("CREATE TABLE IF NOT EXISTS login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL, expires_at INTEGER NOT NULL)")
            for section in ("site", "home", "recruitment", "legal"):
                if self.find(conn, "content", section) is None:
                    self.put(conn, "content", section, self.read_seed(section))
            if self.find(conn, "meta", "seeded") is None:
                for filename, kind in (("events", "event"), ("media", "media")):
                    for record in self.read_seed(filename):
                        self.put(conn, kind, record["id"], record)
                self.put(conn, "meta", "seeded", {"version": 1})

    def read_seed(self, name):
        return json.loads((self.settings.seed_dir / f"{name}.json").read_text(encoding="utf-8-sig"))

    def seed_content(self, conn):
        for section in ("site", "home", "recruitment", "legal"):
            self.put(conn, "content", section, self.read_seed(section))

    @staticmethod
    def find(conn, kind, id):
        row = conn.execute("SELECT data FROM documents WHERE kind=? AND id=?", (kind, id)).fetchone()
        return json.loads(row["data"]) if row else None

    @staticmethod
    def get(conn, kind, id):
        data = Store.find(conn, kind, id)
        if data is None:
            raise HTTPException(404, detail=f"{kind.capitalize()} not found")
        return data

    @staticmethod
    def list(conn, kind):
        return [json.loads(row[0]) for row in conn.execute("SELECT data FROM documents WHERE kind=? ORDER BY id", (kind,))]

    @staticmethod
    def put(conn, kind, id, data):
        conn.execute("INSERT INTO documents(kind,id,data) VALUES(?,?,?) ON CONFLICT(kind,id) DO UPDATE SET data=excluded.data", (kind, id, json.dumps(data, ensure_ascii=False)))

    @staticmethod
    def delete(conn, kind, id):
        Store.get(conn, kind, id)
        conn.execute("DELETE FROM documents WHERE kind=? AND id=?", (kind, id))
