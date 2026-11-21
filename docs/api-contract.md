# MUICT Dev Club Website & Admin Portal — Python Backend API Contract

This document defines the HTTP REST + `multipart/form-data` contract implemented 1-for-1 by [`src/lib/services/httpAdapter.ts`](../src/lib/services/httpAdapter.ts) and typed by [`src/lib/types/`](../src/lib/types/).

When `NEXT_PUBLIC_DATA_MODE=api`, the Next.js frontend routes every service operation through `createHttpServices({ baseUrl })` against this contract.

---

## 1. Base URL, Proxy, Auth & Conventions

### 1.1 Base URL & Trailing Slashes
- Configured via `NEXT_PUBLIC_API_BASE_URL` (e.g. `http://localhost:8000/api/v1` in local dev, or `/api/backend` when proxying through Next.js rewrites to `BACKEND_INTERNAL_URL`).
- `HttpAdapter` strips trailing slashes from `baseUrl` (`baseUrl.replace(/\/+$/, "")`) and **never appends trailing slashes** to route paths so FastAPI/Django do not issue `307`/`301` redirects that can drop `POST`/`PATCH` bodies.

### 1.2 Authentication Transport
All requests are sent with `credentials: "include"`. The backend may use either or both:
1. **`HttpOnly` Session Cookie** (recommended for same-origin `/api/backend/*` proxy deployments).
2. **Bearer JWT** (`Authorization: Bearer <token>`), attached automatically whenever `getBearerToken?.()` returns a token or `POST /auth/login` returns `{ token }`.

### 1.3 JSON Casing (`camelCase`) & FastAPI Pydantic v2 Setup
All JSON payloads use `camelCase` field names matching the TypeScript/Zod schemas in `src/lib/types/`. In FastAPI + Pydantic v2, configure a shared base model:

```python
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

class CamelModel(BaseModel):
    model_config = ConfigDict(
        alias_generator=to_camel,
        populate_by_name=True,
    )
```

### 1.4 Python-Friendly `multipart/form-data` Uploads
Endpoints that accept both structured fields and a binary upload encode the JSON object as a single string field named **`payload`**, alongside a single file field (**`file`**, **`cover`**, or **`cv`**). This avoids nested bracket parsing differences across FastAPI (`Form(...)` + `UploadFile`), Django REST Framework, and Flask.

FastAPI example:
```python
@router.post("/recruitment/applications", status_code=201)
async def submit_application(
    payload: str = Form(...),
    cv: UploadFile | None = File(None),
):
    data = RecruitmentSubmitInput.model_validate_json(payload)
    ...
```

### 1.5 Error Normalization Contract
`HttpAdapter` normalizes non-2xx responses into `ApiError(status, code, message, details)`:

| Backend Error Payload | Example | Normalized `ApiError` |
| :--- | :--- | :--- |
| **FastAPI `422` validation array** | `{ "detail": [{ "loc": ["body", "studentId"], "msg": "must be 7 digits", "type": "value_error" }] }` | `status: 422`, `code: "VALIDATION_ERROR"`, `message: "studentId: must be 7 digits"`, `details: [...]` |
| **FastAPI string `detail`** | `{ "detail": "Not authenticated" }` | `status: 401`, `code: "UNAUTHORIZED"`, `message: "Not authenticated"` |
| **Structured conflict (`409 ASSET_IN_USE`)** | `{ "code": "ASSET_IN_USE", "message": "Asset is currently in use", "usedBy": ["home.hero.heroArtwork"] }` | `status: 409`, `code: "ASSET_IN_USE"`, `message: "Asset is currently in use"`, `details: { usedBy: [...] }` |
| **Generic JSON `{ code, message }`** | `{ "code": "INVALID_FILE", "message": "File exceeds 10 MB" }` | `status: 400`, `code: "INVALID_FILE"`, `message: "File exceeds 10 MB"` |
| **Non-JSON / HTML Gateway Error** | `502 Bad Gateway` HTML | `status: 502`, `code: "HTTP_502"`, `message: "Bad Gateway"` |

---

## 2. Endpoints Reference

### 2.1 Site Content (`src/lib/types/content.ts`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/content/{section}` | Public | Read `site`, `home`, `recruitment`, or `legal` JSON object |
| `PUT` | `/content/{section}` | Admin | Validate and replace `site`, `home`, `recruitment`, or `legal` |
| `POST` | `/content/reset` | Admin | Restore default seed content for all 4 sections (`204 No Content`) |

#### `GET /content/{section}` & `PUT /content/{section}`
- **Path Parameter:** `section` ∈ `"site" | "home" | "recruitment" | "legal"`
- **Request Body (`PUT`, `application/json`):** Full validated section object matching `siteContentSchema`, `homeContentSchema`, `recruitmentContentSchema`, or `legalContentSchema`.
- **Response (`200 OK`, `application/json`):** Saved section object.

Example (`PUT /content/recruitment`, abbreviated):
```json
{
  "isOpen": false,
  "banner": {
    "eyebrow": "MUICT DEV CLUB  /  JOINING INFORMATION",
    "headline": "Learn. Hack. Deliver."
  }
}
```

#### `POST /content/reset`
- **Response:** `204 No Content` (empty body) or `200 OK`.

---

### 2.2 Media & Asset Library (`src/lib/types/media.ts`)

Allowed image uploads: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg` up to **10 MB** (`10 * 1024 * 1024` bytes). Uploaded `.svg` files must be sanitized server-side (stripping `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, `on*` event attributes, and `javascript:` / `data:text/html` URIs).

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/media` | Public | List all `MediaAsset` records |
| `POST` | `/media` | Admin | Upload image/SVG (`multipart/form-data`) |
| `PATCH` | `/media/{assetId}/slot` | Admin | Assign an existing `MediaAsset` to an `EditableImageSlot` |
| `DELETE` | `/media/{assetId}` | Admin | Delete asset if unreferenced; returns `409 ASSET_IN_USE` otherwise |

#### `GET /media`
- **Response (`200 OK`, `application/json`):** Array of `MediaAsset`:
```json
[
  {
    "id": "media-head-banner",
    "filename": "head-banner.svg",
    "title": "Hero Sticker Artwork",
    "sourceSlot": "home.hero.heroArtwork",
    "mimeType": "image/svg+xml",
    "kind": "svg",
    "sizeBytes": 83929,
    "width": 689,
    "height": 467,
    "url": "https://cdn.muictdev.club/media/head-banner.svg",
    "createdAt": "2026-11-01T08:02:00.000Z"
  }
]
```

#### `POST /media` (`multipart/form-data`)
- **Form Fields:**
  - `payload` *(string, JSON)*: `{ "title"?: string, "sourceSlot"?: "site.logoDark" | "site.logoLight" | "home.hero.heroArtwork" | "home.location.image" }`
  - `file` *(binary file)*: Image or SVG file (`<= 10 MB`)
- **Slot Side Effect:** When `sourceSlot` is provided in `payload`, the backend must atomically update the corresponding `ImageAsset` slot in `site` (`logoDark`, `logoLight`) or `home` (`hero.heroArtwork`, `location.image`) with `{ "id": asset.id, "src": asset.url, "alt": asset.title }` and clear `sourceSlot` from any previously bound `MediaAsset`.
- **Response (`201 Created`, `application/json`):** `MediaAsset` with optional SVG sanitization metadata:
```json
{
  "id": "media-a1b2c3d4",
  "filename": "badge.svg",
  "title": "Club Badge",
  "sourceSlot": "home.hero.heroArtwork",
  "mimeType": "image/svg+xml",
  "kind": "svg",
  "sizeBytes": 1240,
  "width": 120,
  "height": 120,
  "url": "https://cdn.muictdev.club/media/media-a1b2c3d4.svg",
  "createdAt": "2026-11-21T12:00:00.000Z",
  "sanitized": true,
  "sanitizationNote": "Unsafe SVG markup was stripped before saving."
}
```

#### `PATCH /media/{assetId}/slot`
- **Request Body (`application/json`):**
```json
{
  "slot": "home.hero.heroArtwork"
}
```
- **Slot Side Effect:** Atomically updates the corresponding `ImageAsset` slot in `site` (`logoDark`, `logoLight`) or `home` (`hero.heroArtwork`, `location.image`) with `{ "id": asset.id, "src": asset.url, "alt": asset.title }`, sets `sourceSlot` on `{assetId}`, and clears `sourceSlot` from any previously bound `MediaAsset`.
- **Response (`200 OK`, `application/json`):** Updated `MediaAsset` with `sourceSlot` set.

#### `DELETE /media/{assetId}`
- **Success Response:** `204 No Content`
- **Conflict Response (`409 Conflict`, `application/json`):** Returned when `assetId` is referenced by `site` (`logoDark`, `logoLight`), `home` (`heroArtwork`, `mascotImage`, `patternImage`, `pinIcon`, `location.image`), any `event.coverImage`, or `admin.signinMemes`.
```json
{
  "code": "ASSET_IN_USE",
  "message": "Asset is currently in use",
  "usedBy": [
    "home.hero.heroArtwork",
    "events.evt-2026-recruitment-open.coverImage"
  ]
}
```

---

### 2.3 Events & News (`src/lib/types/events.ts`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/events` | Public | List events (optional `?published=true&showOnHome=true`) |
| `POST` | `/events` | Admin | Create event (`application/json` or `multipart/form-data`) |
| `PATCH` | `/events/{id}` | Admin | Update event (`application/json` or `multipart/form-data`) |
| `DELETE` | `/events/{id}` | Admin | Delete event (`204 No Content`) |

#### `GET /events`
- **Query Params (optional):**
  - `published`: `"true" | "false"`
  - `showOnHome`: `"true" | "false"`
- **Response (`200 OK`, `application/json`):** `EventItem[]` sorted by `order` ascending.

#### `POST /events` & `PATCH /events/{id}`
- **Without `coverFile` (`application/json`):**
  - `POST`: full `EventUpsertInput` JSON
  - `PATCH`: partial `EventUpdateInput` JSON. Passing `{ "coverImage": null }` explicitly removes an existing cover image (and `HttpAdapter` automatically serializes an explicit `{ coverImage: undefined }` or `{ coverImage: null }` as `"coverImage": null`); omitting `coverImage` preserves the existing cover image.
- **With `coverFile` (`multipart/form-data`):**
  - `payload` *(string, JSON)*: `EventUpsertInput` (for `POST`) or `EventUpdateInput` (for `PATCH`)
  - `cover` *(binary file)*: Image/SVG `<= 10 MB`. Backend must also register the uploaded cover as a `MediaAsset` in `/media` and populate `coverImage: { id, src, alt }`.

Example `payload` JSON:
```json
{
  "marker": "Tools: Next.js, FastAPI",
  "title": "Modern Web Workshop",
  "subtitle": "From Design Tokens to Production",
  "category": "Event",
  "dateLabel": "10 DEC 2026 · 16:30",
  "location": "Lab IT-302, Faculty of ICT",
  "description": "Hands-on engineering workshop covering Next.js and FastAPI.",
  "status": "Published",
  "showOnHome": true,
  "order": 3
}
```

- **Response (`201 Created` / `200 OK`, `application/json`):** Full `EventItem`:
```json
{
  "id": "evt-2026-nextjs-workshop",
  "marker": "Tools: Next.js, FastAPI",
  "title": "Modern Web Workshop",
  "subtitle": "From Design Tokens to Production",
  "category": "Event",
  "dateLabel": "10 DEC 2026 · 16:30",
  "location": "Lab IT-302, Faculty of ICT",
  "description": "Hands-on engineering workshop covering Next.js and FastAPI.",
  "coverImage": {
    "id": "media-c1d2e3f4",
    "src": "https://cdn.muictdev.club/media/media-c1d2e3f4.png",
    "alt": "Modern Web Workshop"
  },
  "status": "Published",
  "showOnHome": true,
  "order": 3,
  "updatedAt": "2026-11-21T12:00:00.000Z"
}
```

#### `DELETE /events/{id}`
- **Response:** `204 No Content` (associated cover `MediaAsset` remains in `/media`).

---

### 2.4 Recruitment Applications (`src/lib/types/recruitment.ts`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/recruitment/applications` | Admin | List all submitted recruitment applications |
| `POST` | `/recruitment/applications` | Public | Submit application (`multipart/form-data`: `payload` + optional `cv`) |
| `PATCH` | `/recruitment/applications/{id}/status` | Admin | Update review status (`Pending` \| `Accepted` \| `Rejected`) |
| `GET` | `/recruitment/applications/{id}/cv` | Admin | Resolve short-lived CV download/preview URL |

#### `POST /recruitment/applications` (`multipart/form-data`)
- **Form Fields:**
  - `payload` *(string, JSON)*:
    ```json
    {
      "personal": {
        "firstName": "Somchai",
        "lastName": "Narin",
        "nickname": "Chai",
        "studentId": "6987777",
        "email": "somchai@student.mahidol.ac.th",
        "phone": "0894567890",
        "program": "DST",
        "year": "1"
      },
      "team": "projects",
      "roleId": "frontend-dev",
      "roleLabel": "Front End Developer",
      "customRole": null,
      "motivation": {
        "expectation": "Learn production React and Next.js",
        "contribution": "Build accessible UI components",
        "projectIdea": "Campus shuttle tracker",
        "teamExperience": "Orientation group prototype"
      },
      "portfolioUrl": "https://github.com/somchai",
      "agreedRequirements": true,
      "agreedPdpa": true
    }
    ```
  - `cv` *(optional binary file)*: `.pdf` or `.docx`, `<= 10 MB`.
- **Response (`201 Created`, `application/json`):** `RecruitmentApplication` with generated `id`, `createdAt`, `status: "Pending"`, and `cv` metadata if uploaded.
- **Validation Error (`422 Unprocessable Entity`):**
```json
{
  "detail": [
    {
      "loc": ["body", "studentId"],
      "msg": "must be 7 digits",
      "type": "value_error"
    }
  ]
}
```

#### `PATCH /recruitment/applications/{id}/status`
- **Request Body (`application/json`):**
```json
{
  "status": "Accepted"
}
```
- **Response (`200 OK`, `application/json`):** Updated `RecruitmentApplication`.

#### `GET /recruitment/applications/{id}/cv`
- **Response (`200 OK`, `application/json`):** Returns a short-lived presigned storage URL (S3 / Cloudflare R2 / Supabase Storage) so the frontend can open PDFs in a new tab or download `.docx` files directly without auth-header conflicts.
```json
{
  "url": "https://storage.example.com/cvs/APP-2026-0001.pdf?X-Amz-Signature=...",
  "filename": "somchai-cv.pdf",
  "mimeType": "application/pdf"
}
```

---

### 2.5 Inquiries & Private FAQ Bank (`src/lib/types/inquiries.ts`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/inquiries` | Admin | List all inquiries |
| `POST` | `/inquiries` | Public | Submit question from Home `Ask MUICT Dev Club` modal |
| `POST` | `/inquiries/{id}/reply` | Admin | Send email reply and optionally mark `Answered` |
| `PATCH` | `/inquiries/{id}/tags` | Admin | Replace inquiry tags array |
| `GET` | `/faq-bank` | Admin | List private admin-only FAQ Bank items |
| `POST` | `/faq-bank` | Admin | Create private FAQ Bank item |
| `PATCH` | `/faq-bank/{id}` | Admin | Update private FAQ Bank item |
| `DELETE` | `/faq-bank/{id}` | Admin | Delete private FAQ Bank item |
| `POST` | `/faq-bank/{id}/copy-to-home` | Admin | One-way copy into public `home.json` (`faq.items[]`) |

#### `POST /inquiries`
- **Request Body (`application/json`):**
```json
{
  "question": "Can first-year DST students join project squads?",
  "senderEmail": "6981234@student.mahidol.ac.th",
  "category": "Recruitment",
  "consent": true
}
```
- **Response (`201 Created`, `application/json`):** `InquiryItem` (`status: "Unanswered"`).

#### `POST /inquiries/{id}/reply`
- **Request Body (`application/json`):**
```json
{
  "body": "Yes! Both ICT and DST Year 1 students are welcome.",
  "markAnswered": true
}
```
- **Response (`200 OK`, `application/json`):** Updated `InquiryItem` with `reply: { body, sentAt, sentBy }` and updated `status`.

#### `PATCH /inquiries/{id}/tags`
- **Request Body (`application/json`):**
```json
{
  "tags": ["Recruitment", "DST"]
}
```
- **Response (`200 OK`, `application/json`):** Updated `InquiryItem`.

#### `POST /faq-bank` & `PATCH /faq-bank/{id}`
- **Request Body (`POST`, `application/json`):**
```json
{
  "question": "Can freshmen join?",
  "answer": "Yes, all ICT and DST years are welcome.",
  "category": "Recruitment",
  "tags": ["DST", "Recruitment"]
}
```
- **Response (`201 Created` / `200 OK`, `application/json`):** `FaqBankItem`.

#### `POST /faq-bank/{id}/copy-to-home`
- **Request Body:** None.
- **Behavior:** Appends `{ id, question, answer }` into public `home.faq.items[]` and sets `promotedToHome: true` on the FAQ Bank entry.
- **Response (`200 OK`, `application/json`):** Created public `FaqItem`:
```json
{
  "id": "faq-f1e2d3c4",
  "question": "Can freshmen join?",
  "answer": "Yes, all ICT and DST years are welcome."
}
```

---

### 2.6 Admin Authentication (`src/lib/types/auth.ts`)

| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/auth/login` | Public | Authenticate committee admin account |
| `POST` | `/auth/logout` | Public/Admin | Clear admin cookie/session |
| `GET` | `/auth/me` | Optional | Return current `AdminSession` or `401 Unauthorized` |

#### `POST /auth/login`
- **Request Body (`application/json`):**
```json
{
  "email": "admin@muictdev.club",
  "password": "********",
  "confirmPassword": "********"
}
```
- **Response (`200 OK`, `application/json`):** May set an `HttpOnly` cookie and/or include `token` for Bearer auth:
```json
{
  "email": "admin@muictdev.club",
  "authenticated": true,
  "loggedInAt": "2026-11-21T12:00:00.000Z",
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### `POST /auth/logout`
- **Response:** `204 No Content`.

#### `GET /auth/me`
- **Response (`200 OK`, `application/json`):** `AdminSession` (`{ email, authenticated: true, loggedInAt }`).
- **Unauthenticated Response (`401 Unauthorized`):** `{ "detail": "Not authenticated" }` (normalized by `HttpAdapter.auth.getSession()` to `null`).
