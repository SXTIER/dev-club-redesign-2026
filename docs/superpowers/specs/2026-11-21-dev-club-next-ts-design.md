# MUICT Dev Club Website & Admin Portal — Next.js + TypeScript Design Specification

- **Date:** 2026-11-21
- **Project:** MUICT Dev Club Website 2026 (`For User` + `For Admin`)
- **Figma Source of Truth:** File `Dev-Club` (`oHvTdXpz2zHXKAn4JWSCOp`) — strictly limited to pages **`For User` (`26:160`)** and **`For Admin` (`26:161`)**
- **Target Hosting:** Vercel (production deployment for ICT students & Dev Club committee)
- **Work Size:** Project

---

## 1. Intent and Why

MUICT Dev Club needs to launch its 2026 public website and committee Admin Portal on **Vercel** for real ICT/DST students and club committee members. The UI designs for both sides are finalized on two dedicated Figma pages (`For User` and `For Admin`), accessible via Figma Dev Mode.

A separate backend team will later build and attach the real backend services using **Python** (e.g., FastAPI, Django REST Framework, or Flask — hosted separately from Vercel with database, authentication, real email sending, and cloud object storage). Until that Python backend is ready, the Vercel deployment in `mock` mode serves as a **Staging / Preview environment** for the Dev Club committee and Backend team to test end-to-end flows and hand off contracts; real public launch to students occurs once `api` mode is connected.

The frontend team must ship a **production-grade, responsive Next.js + TypeScript codebase** where:
1. Visual layout, tokens, typography, and static brand assets faithfully match the Figma `For User` and `For Admin` pages.
2. **100% of editable site text and image references live in typed `.json` files (`src/content/*.json`)** so committee members can edit copy and media via Admin `Site content` without touching React code.
3. **All file uploads genuinely work in the UI** (`Media & Assets` image/SVG drag-and-drop up to 10 MB with SVG safety checks, `Edit Event` cover image replacement, and `Recruitment` CV `.pdf`/`.docx` upload + Admin `View File →`) even while hosted on Vercel's read-only serverless filesystem.
4. All data and file operations sit behind a **swappable typed Service Adapter Layer** (`Mock/IndexedDB` ↔ `HTTP REST`), so the backend team can connect their API later without rewriting any page or UI component.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
1. **Complete `For User` Public Website:**
   - `Home` (`/`): Sticky navigation (`About Us`, `Why MUICT Dev Club`, `Teams`, `Timeline`, `Location`, `FAQ`, `Joining information`), Hero/Onboarding, About Us, Why Us (3 pillars), Teams (5 tracks), Event Roadmap / Timeline (driven by `events.json`), Campus Location + Google Maps link, FAQ Accordion + `Ask MUICT Dev Club` modal (with PDPA consent), and Footer.
   - `Recruitment` (`/joining-information`): Supports both **Closed** (`User - Recruitment Closed`) and **Opened** (`User - Recruitment -Opened -new`) states driven by `recruitment.json` (`isOpen`), including full multi-section form validation, Projects Team (8 roles) & Marketing Team (4 roles), CV file upload (`.pdf`, `.docx`), and mandatory agreements/PDPA checkboxes.
   - `Legal Pages`: `Privacy Policy` (`/privacy-policy`), `Terms of Use` (`/terms-of-use`), and `Acknowledgement` (`/acknowledgement`) with `EN / TH` switching and all clauses stored in `legal.json`.
2. **Complete `For Admin` Committee Portal:**
   - `Admin Signin` (`/admin/login`): `<Admin SignIn /> !` email/password/confirm-password form with visibility toggles, validation feedback, and interactive Sliding Memes carousel.
   - Shared Admin Topbar Shell (`Overview`, `Site content`, `Events`, `Recruitment`, `Inquiries`, `admin@example.com`, `Log out`, `← View Home`).
   - `Overview / Stats` (`/admin/overview`): KPI cards (`Recruitment`, `Events & News`, `Questions`), `Latest Recruitment`, `Latest Questions`, and `+ Add Event`.
   - `Site Content` (`/admin/site-content`): Two tabs — **`Website copy`** (section-by-section JSON copy editor for `Home`, `About Us`, `Why MUICT Dev Club`, `Teams`, `Timeline`, `Location`, `FAQ`, `Footer`, plus `Recruitment` & `Legal`, with Discard/Save/Export `.json`) and **`Media & Assets`** (drag-and-drop PNG/JPG/WebP/GIF/SVG up to 10 MB, SVG safety check, `All / Images / SVG` tabs, filename search, sort, Copy URL, Delete, pagination).
   - `Events & News Management` (`/admin/events`): Tabs (`All`, `Events`, `News`), search, table with Published/Draft badges, `+ Add Event / News`, and `Edit Event / News` modal (including cover image upload/replace/remove).
   - `Inquiries & FAQ Tracker` (`/admin/inquiries`): KPI cards, tabs (`All Questions`, `Unanswered`, `FAQ Bank`), search, sort, split inbox/detail view, tag management, `Reply via Dev Club Email` modal, `Save to FAQ Bank`, and `Add / Edit FAQ` modal.
   - `Recruitment Checklist` (`/admin/recruitment`): KPI cards (`Total`, `Checked`, `Pending`), search, Position/Status filters, `Export CSV`, checklist table with toggleable review status (`Pending`, `Accepted`, `Rejected`), Open/Closed recruitment toggle, and `View Form →` scrollable application detail modal (with `View File →` to open/download uploaded CV).
3. **100% JSON-Driven Editable Content:** Zero visible page copy or editable image URLs hard-coded in `.tsx` components.
4. **Full Responsive Support (`375px` → `1920px`):** Faithfully matches Figma `1920px` desktop target while adapting cleanly to laptop (`1280px–1440px`), tablet, and mobile (`375px+`) viewports.
5. **Backend-Ready Handoff:** Typed Service Adapter (`MockAdapter` ↔ `HttpAdapter`) + `docs/api-contract.md` specifying every REST endpoint, JSON payload, and `multipart/form-data` contract.

### Non-Goals
- Implementing a real production database (PostgreSQL/Prisma/Supabase), real server-side OAuth/JWT auth, or real Gmail/SMTP sending (deferred to the Backend team).
- Implementing out-of-scope Figma pages (`Page 1`, `Component`) or extra routes not present in `For User` / `For Admin` (such as `/projects`, `/game-dev`, `/structure`, or a standalone `/developers` page beyond `/acknowledgement`).
- Dark mode switcher, color pickers, font selectors, or drag-and-drop layout builders in Admin (2026 CI colors & layout structure are strictly locked).

### Anti-Goals (Failure Conditions)
- Using Node.js `fs.writeFile` at runtime to save `.json` or uploaded files (crashes on Vercel's read-only serverless filesystem with `EROFS`).
- Storing uploaded images/CVs as Base64 inside `localStorage` (hits the ~5 MB quota and crashes with `QuotaExceededError`).
- Hard-coding user-facing text or editable image URLs inside `.tsx` files instead of reading from `src/content/*.json`.
- Leaving temporary Figma MCP asset URLs (`figma.com/api/mcp/asset/...`) in source code instead of locally downloaded files in `public/images/figma/`.
- Coupling page/UI components directly to `localStorage` or raw `fetch`, forcing the backend team to rewrite UI code when integrating the real API.

---

## 3. Constraints & 2026 Corporate Identity (CI)

### 3.1 Verified Design Tokens (Figma `get_variable_defs` & `Prototype/styleguide.css`)
- **Brand:** `MUICT Dev Club` — Slogan: *"Your Career's Trial Run"*
- **Primary Palette:**
  - Primary Blue: `#0038E1` (dark `#002BAA`, base `#2E5DE9`, light `#A6C0FF`; text on primary `#FFFFFF`)
  - Secondary Magenta: `#E25BE9` (dark `#9E00A7`, light `#F3BFF9`)
  - Tertiary Lime Green: `#A9E041` (dark `#548000`, light `#E7FDA7`; text `#1C1B1F`)
- **Neutrals:**
  - Surface / Card: `#FFFFFF`
  - Canvas / Subtle Background: `#F8FAFC` / `#F4F5F7`
  - Primary Ink: `#1C1B1F`
  - Dark Gray: `#4A5565`
  - Gray (Muted): `#757E91`
  - Light Gray / Borders: `#A1A7B4` / `#E2E8F0` / `#E4E4E7`
  - Dark Footer: `#11151C` / `#1C1B1F`
- **Semantic Status Colors:**
  - Success / Published / Accepted: `#E7FDA7` bg / `#548000` text (or `#A9E041` accent)
  - Pending / Draft / Warning: `#FFF194` bg / `#AA5000`–`#B48700` text
  - Danger / Error / Rejected: `#FAAF98` bg / `#B41B00` text, border `#FB4A2A`
  - Active / Info: `#A6C0FF` bg / `#002BAA` text; Turquoise `#BDFBCC` / `#006C6C`
- **Typography:**
  - Primary UI & Body (EN/TH): `Inter Thai Loopless` (loaded if font files are provided in `public/fonts/`, seamlessly falling back to `Inter` via `next/font/google` and `Noto Sans Thai` for crisp Thai legibility on Legal pages).
  - Technical / Indices / Student IDs / Badges / Filenames: `JetBrains Mono` via `next/font/google`.

### 3.2 Technical & Deployment Constraints
- **Framework:** Next.js (App Router) + React + TypeScript (`strict: true`) + Tailwind CSS.
- **Vercel Read-Only Filesystem:** Zero runtime server disk writes (`fs.writeFile`). All mock persistence runs client-side (`localStorage` for small JSON overlays + `IndexedDB` for uploaded file blobs up to 10 MB each).
- **Figma Design-to-Code Discipline:** Every screen/section must be implemented from high-fidelity `get_design_context` calls with screenshots as visual targets. Raw absolute positioning from Figma code snippets must be translated into responsive Tailwind flex/grid layouts. Every visible static asset (brand logos, hero artwork, meme slides, campus photo, custom icons) must be downloaded locally into `public/images/figma/` and verified non-empty; SVG root `width`/`height` proportions must not be distorted.
- **File Security & PDPA:**
  - Uploaded SVGs must be sanitized (stripping `<script>`, `<foreignObject>`, `<iframe>`, `on*` handlers, and `javascript:`/`data:text/html` URIs) and rendered safely via `<img>` (never raw `dangerouslySetInnerHTML`).
  - Recruitment (`Information Confirmation *`) and Ask Question (`Consent *`) forms must block submission unless PDPA consent is checked.
- **Existing Workspace State:** The workspace currently has no `package.json` or `src/` directory (only legacy HTML prototypes, `docs/`, and stale `.next`/`node_modules`/`package-lock.json` artifacts). The Next.js project will be scaffolded cleanly at workspace root while preserving `docs/` and git history (builder call: remove or replace stale `package-lock.json` / `.next` when initializing clean Next.js dependencies).

---

## 4. Approaches Considered & Selection

| Approach | How It Works | Trade-offs | Verdict |
| :--- | :--- | :--- | :--- |
| **1. Typed Service Adapter (`Mock/IndexedDB` ↔ `HTTP REST`) + `src/content/*.json`** | Default copy & asset metadata live in `src/content/*.json`. All UI calls go through typed services (`src/lib/services/`). `NEXT_PUBLIC_DATA_MODE=mock` merges `localStorage` JSON overrides + stores uploaded image/SVG/CV blobs (up to 10 MB) in **IndexedDB** with `.json` export. Flipping to `api` sends JSON + `multipart/form-data` to `NEXT_PUBLIC_API_BASE_URL` (separate Express API or Next.js `/api/*`). | Adds a small adapter/service layer (~5–6 files), but runs 100% cleanly on Vercel, supports real 10 MB file uploads without quota crashes, and decouples UI from backend choice. | **Selected** |
| **2. Next.js BFF Route Handlers (`/api/*`)** | UI always calls `/api/*` inside Next.js; backend team replaces internals or proxies to Express. | Breaks saving `.json` and file uploads on Vercel immediately (read-only FS) unless external Vercel Blob/KV is provisioned now. | Rejected |
| **3. Pure Static `.json` + `localStorage` Only** | Context loads `.json` directly; edits and Base64 files stored in `localStorage`. | `localStorage` (~5 MB cap) crashes on multi-MB image or CV PDF uploads, and requires rewriting UI components when backend arrives. | Rejected |

**Selection Rationale:** The user selected **Approach 1** because the site targets Vercel hosting immediately, requires genuine file upload support (images, SVGs, CVs), and must hand off cleanly to a backend team that has not yet locked in separate API vs. Next.js Route Handlers.

---

## 5. Architecture & Detailed Design

### 5.1 Route Map & Figma Node Traceability

#### `For User` (`Page 26:160`)
| App Router Path | Figma Source Node(s) | Key Interactive Behavior |
| :--- | :--- | :--- |
| `/` | `Home` (`160:530`), `User - Ask Question Overlay` (`194:145` / `165:4814`) | Sticky navbar with smooth scroll (`#about`, `#why-us`, `#teams`, `#timeline`, `#location`, `#faq`) + mobile hamburger drawer; Hero + `Joining information` CTA; About Us; Why Us (3 pillars); Teams (5 tracks); **Timeline / Event Roadmap** displaying `Published` items (`Event` and `News`, with distinct category badges) marked `showOnHome: true` from `events.json` (replacing Figma placeholder `Help Dogs / Help Cats`), where clicking any item opens a clean **Event / News Detail Modal** showing cover image, category badge, date/time, location, and full description; Campus Location + Google Maps link; FAQ Accordion (reading exclusively from `home.json`) + `Ask MUICT Dev Club` modal (submits inquiry via `inquiriesService`); Footer. |
| `/joining-information` | `Recruitment Closed` (`160:1158`), `Recruitment -Opened` (`160:1208`) | Reads `recruitment.json` (`isOpen`). When `false`, displays Closed state with `Back to MUICT Dev Club`. When `true`, renders 2-column layout (sticky left onboarding steps `01–03`, right 3-section form: Personal Info, Projects Team 8 roles + Marketing Team 4 roles + custom `Other` input, Motivation/Portfolio/CV `.pdf` & `.docx` uploader, Agreements/PDPA, inline red validation errors, and post-submit confirmation receipt). Also supports `?preview=closed` or `?preview=open` for committee QA (*Our Call*). |
| `/privacy-policy` | `Privacy Policy (EN)` (`165:4557`), `Privacy Policy (TH)` (`165:4482`) | Shared Navbar & Footer, `← Back to Home`, `Last updated`, `EN / TH` toggle switching between `legal.json` `en` and `th` content (default `EN`). |
| `/terms-of-use` | `Terms of Use (EN)` (`180:287`), `Terms of Use (TH)` (`180:979`) | Shared Navbar & Footer, `← Back to Home`, `Last updated`, `EN / TH` toggle (default `EN`). |
| `/acknowledgement` | `Acknowledgement` (`180:1140`) | Shared Navbar & Footer, `← Back to Home`, optional `EN / TH` toggle reading from `legal.json` (`Poonyawatt Klumnaim`, `Pakawat Sanboonsri`, plus editable credits list). |

#### `For Admin` (`Page 26:161`)
| App Router Path | Figma Source Node(s) | Key Interactive Behavior |
| :--- | :--- | :--- |
| `/admin` | Redirect route | Redirects to `/admin/overview` if session exists, otherwise `/admin/login`. |
| `/admin/login` | `Admin Signin` (`160:1492`) | Top public nav + `<Admin SignIn /> !` card (Email, Password w/ eye toggle, Confirm Password w/ eye toggle, inline red validation errors on empty/mismatch, lime green `Submit` button) + right-side interactive **Sliding Memes carousel** (prev/next chevrons, dots, slide counter). |
| `/admin/overview` | `Stats` (`160:1538`) | Shared Admin Topbar (`Overview`, `Site content`, `Events`, `Recruitment`, `Inquiries`, user email, `Log out`, `← View Home`, plus a subtle `Preview / Mock Mode` pill when `NEXT_PUBLIC_DATA_MODE=mock`); KPI cards computed live from current service data; `Latest Recruitment` & `Latest Questions` previews with direct links (`Review recruitment →`, `View roadmap →`, `Review inquiries →`, `Reply via email →`); `+ Add Event` shortcut. |
| `/admin/site-content` | `Content & Text Management` (`160:1696`), `Media & Asset Library` (`160:1790`) | Tab switcher **`Website copy` \| `Media & Assets`**. **Website copy:** left section list (`Home`, `About Us`, `Why MUICT Dev Club`, `Teams`, `Timeline` [header copy only — items live in Events], `Location`, `FAQ` [published Home FAQs], `Footer`, plus `Recruitment` & `Legal` so 100% of `.json` copy is editable), dynamic form fields with inline **Media Picker** for editable image slots, `Discard Changes`, `Save Changes`, `Export .json` (warns if local `idb://` image refs exist and offers downloading uploaded files alongside JSON), and `Reset Defaults`. **Media & Assets:** drag-and-drop + Browse Files (`PNG, JPG, WebP, GIF, SVG` ≤ 10 MB), SVG sanitizer check, `All / Images / SVG` count tabs, filename search, sort (`Newest first`, `Oldest first`, `Alphabetical`), paginated asset cards with thumbnail preview, metadata (format/dimensions/KB), `Copy URL`, `Assign to Slot` (updates target `ImageAsset` slot in `.json`), and `Delete` (blocked with `"In use"` warning if referenced by any site slot or event). |
| `/admin/events` | `Events & News Management` (`160:1869`), `Edit event dialog` (`160:2469`) | Tabs (`All`, `Events`, `News`), search by title/category/location, `+ Add Event / News`, table/mobile cards (`Cover/Marker`, `Title`, `Category`, `Date/Time`, `Status`, `Show on Home`, `Edit / Delete`), pagination. `Add/Edit` modal edits Title, Category (`Event` \| `News`), Date/Time, Location, **`Show on Home`** toggle + display order, Roadmap marker / Cover image picker (`Choose from Media Library` or `Upload New` — new uploads also register in `Media & Assets`, plus `Replace` / `Remove`), Description, and `Save Draft` / `Publish` — immediately updating `/` Home Timeline. |
| `/admin/inquiries` | `Inquiries & FAQ Tracker` (`160:1994`), `FAQ Bank saved state` (`160:2238`), `Reply via Dev Club Email` (`160:2348`), `Add FAQ` (`160:2710`) | 3 KPI cards (`Total Questions`, `Unanswered`, `Published FAQs` counted live from `home.json`), tabs (`All Questions`, `Unanswered`, `FAQ Bank`), search, sort (`Newest first`, `Oldest first`, `Alphabetical`, `Category`), split Inbox + Detail panel with editable category tags (`+ Add Tag` / remove `×`), `Reply via Dev Club Email` modal (records reply & optionally marks Answered), `Save to FAQ Bank`, and private `FAQ Bank` table (`Private · Admins only`, matching Figma) with `+ Add FAQ`, `Edit FAQ`, `Remove`, and a one-way **"Copy to Home FAQ"** action that appends into `home.json` via `ContentService`. |
| `/admin/recruitment` | `Recruitment Checklist` (`160:2094`), `View Form` (`160:2630`) | 3 KPI cards (`Total`, `Checked / %`, `Pending / new today`), Recruitment `Open / Closed` status switch (updates `recruitment.json` live), search by name or Student ID, Role/Team filter (derived dynamically from `recruitment.json` + historical submissions), Status filter (`All`, `Pending`, `Accepted`, `Rejected`), `Export CSV` download, interactive checklist table/cards, and `View Form →` scrollable modal showing all 3 application sections, **`View File →`** button to open/download the applicant's uploaded CV, and status selector (`Pending` / `Accepted` / `Rejected`). |

### 5.2 Modular `.json` Content Architecture, Source-of-Truth & Mutability Rules (`src/content/`)

All editable site content and seed data live in modular, strictly typed `.json` files under `src/content/`:

```text
src/
├── content/
│   ├── site.json           # Brand logos (logoDark, logoLight ImageAssets), navbar items, footer address/legal links, copyright
│   ├── home.json           # Hero (headline, description, CTA, heroArtwork ImageAsset), About Us, Why Us (3 fixed pillars), Teams (5 fixed tracks), Timeline section header copy, Location (campus info, mapUrl, image ImageAsset), FAQ section copy + SOLE source of truth for Published Home FAQs (faq.items[])
│   ├── events.json         # SOLE source of truth for Events & News items (powers BOTH Home Timeline + Detail Modal AND Admin Events Management)
│   ├── recruitment.json    # isOpen flag, Closed page copy, Opened page copy, roles (Projects 8 + Marketing 4 with stable roleId), programs, years, agreements
│   ├── legal.json          # Privacy Policy (EN/TH), Terms of Use (EN/TH), Acknowledgement (EN/TH) using structured plain-text clauses: sections: [{ heading, paragraphs[], bullets?[] }]
│   ├── media.json          # Initial Media & Asset Library manifest referencing public/images/figma/*
│   └── admin-seed.json     # Staging/preview demo data: seeded Recruitment applications, Inquiries, private FAQ Bank items, and Admin Signin meme slides (ImageAsset[])
```

#### Explicit Ownership & Mutability Rules (*Settled from Figma & Builder Calls*)
1. **FAQ Single Source of Truth (From Figma):** `home.json` (`faq.items[]`) is the **sole source of truth** for FAQs displayed on `/` Home. `FAQ Bank` (`admin-seed.json` / `/faq-bank`) is a **private admin-only repository** (matching Figma's `"Private · Admins only · Saving to the FAQ Bank does not publish on Home"`). Promoting a saved Q&A to Home is an explicit one-way `"Copy to Home FAQ"` write into `home.json` — eliminating dual-write drift.
2. **Timeline vs. Events Ownership:** `home.json` owns ONLY the Timeline section heading/index text (`Site Content -> Timeline`). Individual `Event` and `News` items (including `showOnHome`, `order`, `coverImage`, `location`, `description`) are owned exclusively by `events.json` and edited in `/admin/events`.
3. **Fixed-Slot vs. Dynamic Lists in `Site Content` (*Our Call*):**
   - **Fixed-slot text/image editing** (locked 2026 CI layout): `Home Hero`, `About Us`, `Why Us` (3 pillars), `Teams` (5 tracks), `Timeline` header, `Location`, `Footer`.
   - **Dynamic add/remove arrays:** `home.json` `faq.items[]`, `recruitment.json` roles (each with a stable `id`; submitted `RecruitmentApplication` stores `{ roleId, roleLabel }` snapshots so historical applications never break on rename/removal), `legal.json` clause sections & acknowledgement credits.
4. **Structured Legal Body Format (*Our Call*):** `legal.json` stores `en` and `th` documents as structured plain-text `{ title, subtitle, lastUpdated, sections: [{ heading, paragraphs: string[], bullets?: string[] }] }` — zero unsafe HTML/Markdown parsing, clean form editing, and crisp typography in `Inter Thai Loopless` / `Noto Sans Thai`.
5. **Editable `ImageAsset` Slot Registry & Deletion Guard (*Our Call*):**
   - Named editable image slots in `.json`: `site.logoDark`, `site.logoLight`, `home.hero.heroArtwork`, `home.location.image`, `events[].coverImage`, and `admin.signinMemes[]`. Small decorative UI icons remain static SVGs.
   - Every image reference follows one typed schema:
     ```ts
     export interface ImageAsset {
       id?: string;       // Optional MediaAsset.id reference for usage tracking
       src: string;       // /images/figma/..., idb://<assetId> (mock mode), or https://... (api mode)
       alt: string;       // Accessible alt text
     }
     ```
   - `<ContentImage asset={...} />` transparently resolves `idb://<assetId>` from IndexedDB into a live ObjectURL (surviving page reloads in `mock` mode) and renders `/images/...` or `https://...` directly in `api` mode.
   - Uploading a cover image inside `Edit Event` also registers it in `Media & Assets`. Deleting a `MediaAsset` referenced by any site slot or event is blocked (`409 Conflict` in `api` mode / inline `"In use"` guard in `mock` mode) until the slot is replaced.

### 5.3 Service Adapter, Auth Transport & Data Layer (`src/lib/services/`)

```text
src/lib/
├── types/                  # TypeScript interfaces + Zod schemas for all JSON files & entities
│   ├── content.ts          # SiteContent, HomeContent, RecruitmentContent, LegalContent, ImageAsset
│   ├── events.ts           # EventItem, EventUpsertInput
│   ├── media.ts            # MediaAsset, MediaUploadInput
│   ├── recruitment.ts      # RecruitmentApplication, ApplicationStatus, RecruitmentSubmitInput
│   ├── inquiries.ts        # InquiryItem, FaqBankItem, ReplyInput
│   └── auth.ts             # AdminSession, LoginInput
├── storage/
│   ├── localOverlay.ts     # Versioned localStorage JSON read/write/export/reset helpers
│   ├── indexedDbFiles.ts   # IndexedDB blob store (putFile, getFileBlob, deleteFile, listFiles)
│   └── svgSanitizer.ts     # Client-side SVG validation & sanitization + file MIME/size guard (<= 10 MB)
└── services/
    ├── index.ts            # Factory selecting MockAdapter vs HttpAdapter via NEXT_PUBLIC_DATA_MODE
    ├── contracts.ts        # Service interfaces (ContentService, MediaService, EventsService, etc.)
    ├── mockAdapter.ts      # Vercel-safe staging/preview persistence (JSON seed + localStorage + IndexedDB)
    └── httpAdapter.ts      # Backend-ready REST client (JSON + FormData multipart/form-data)
```

**Environment Variables (`.env.example`):**
```env
# "mock" (default on Vercel staging before Python backend exists) | "api" (real Python backend)
NEXT_PUBLIC_DATA_MODE=mock

# Used when NEXT_PUBLIC_DATA_MODE=api (points to Python API, e.g. FastAPI http://localhost:8000/api/v1 or same-origin /api/backend)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1

# Optional server-side target for Next.js rewrite proxy (/api/backend/:path* -> BACKEND_INTERNAL_URL/:path*)
BACKEND_INTERNAL_URL=http://localhost:8000/api/v1
```

#### Python Backend Integration Conventions (*Our Call — Prescriptive in `docs/api-contract.md`*)
- **Separate Server Topology & Proxy:** Because the backend runs in **Python** (FastAPI / Django / Flask) separately from Vercel, `next.config.ts` provides an optional same-origin rewrite (`/api/backend/:path*` → `BACKEND_INTERNAL_URL/:path*`) so production traffic avoids CORS preflight friction and Safari ITP third-party cookie blocking.
- **Auth Transport:** `httpAdapter.ts` supports both **`HttpOnly` Cookie sessions** (`credentials: 'include'`) and **`Authorization: Bearer <token>` JWT** (common in FastAPI `OAuth2PasswordBearer`) via a single auth strategy helper, with client-side `AdminAuthGuard` calling `GET /auth/me`.
- **JSON Naming (`camelCase` vs `snake_case`):** `docs/api-contract.md` specifies `camelCase` JSON payloads (easy in FastAPI/Pydantic v2 via `alias_generator=to_camel`), and `httpAdapter.ts` centralizes request/response serialization so even if the Python team prefers `snake_case`, mapping happens in one adapter file with zero UI changes.
- **Python-Friendly `multipart/form-data` Uploads:** Endpoints combining structured data and files (`POST /recruitment/applications`, `POST /events` with cover) send two clean multipart fields: **`payload`** (JSON string) + **`cv` / `file`** (binary upload). This avoids nested bracket form-field parsing issues across FastAPI (`Form(...)` + `UploadFile`), Django, and Flask.
- **Error Normalization & Trailing Slashes:** `httpAdapter.ts` normalizes FastAPI/DRF errors (`422 Unprocessable Entity`, `{ detail: ... }`) alongside standard `{ message, code }` JSON errors into one typed `ApiError`, and avoids mismatched trailing-slash redirects that can drop `POST`/`PATCH` bodies.
- **CV File Delivery (`View File →`):** `recruitmentService.getCvDownloadUrl(applicationId)` returns `{ url, filename, mimeType }` (`GET /recruitment/applications/:id/cv` returns a short-lived presigned URL from S3/R2/Supabase Storage in `api` mode, or an IndexedDB Blob ObjectURL in `mock` mode). Clicking `View File →` opens PDFs in a new tab or downloads `.docx` cleanly without auth-header or popup-blocker failures.

### 5.4 Backend Handoff Contract (`docs/api-contract.md`)

Implementation will ship `docs/api-contract.md` (with Python/FastAPI Pydantic-friendly schemas, exact JSON examples, and `multipart/form-data` specs) matching `httpAdapter.ts` 1-for-1:
- `GET /content/:section` & `PUT /content/:section` (`site`, `home`, `recruitment`, `legal`) — JSON read/update (`GET` is public; `PUT` requires admin auth)
- `GET /media`, `POST /media` (`multipart/form-data`: `file` + optional `title`, `sourceSlot`), `DELETE /media/:id` (returns `409 Conflict` with `{ code: "ASSET_IN_USE", usedBy: [...] }` if still referenced)
- `GET /events` (public supports `?published=true&showOnHome=true`), `POST /events`, `PATCH /events/:id`, `DELETE /events/:id` (JSON or `multipart/form-data`: `payload` JSON string + optional `cover` file)
- `GET /recruitment/applications`, `POST /recruitment/applications` (public `multipart/form-data`: `payload` JSON string + optional `cv` file), `PATCH /recruitment/applications/:id/status`, `GET /recruitment/applications/:id/cv` (returns `{ url, filename, mimeType }`)
- `GET /inquiries`, `POST /inquiries` (public Ask Question), `POST /inquiries/:id/reply`, `PATCH /inquiries/:id/tags`, `GET/POST/PATCH/DELETE /faq-bank` (admin-only private FAQ Bank)
- `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`

### 5.5 File Upload & Validation Rules
1. **`Media & Assets` & `Event Cover` Upload:**
   - Allowed MIME/extensions: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.svg`.
   - Max size: `10 MB` (`10 * 1024 * 1024` bytes); reject oversized or unsupported files with clear inline error.
   - SVG files undergo client-side sanitization (`DOMParser` removing `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, any `on*` event attributes, and `javascript:` / `data:text/html` URLs) before storing and previewing.
   - Extracts natural `width × height` on upload so asset cards show accurate `PNG · 125 × 125 px · 48 KB` metadata.
2. **`Recruitment` CV Upload:**
   - Allowed MIME/extensions: `.pdf`, `.docx`.
   - Max size: `10 MB`.
   - Displays selected filename + formatted size + remove button; in Admin `View Form`, clicking `View File →` opens PDF in a new browser tab or downloads `.docx` from IndexedDB (`MockAdapter`) or signed URL (`HttpAdapter`).

### 5.6 Responsive Strategy (Builder Call, Confirmed Direction)
- **Desktop (`1280px–1920px`):** Matches Figma `1920px` visual proportions cleanly inside a responsive container (`max-w-[1920px]` with fluid horizontal padding `px-6 lg:px-16 xl:px-32`) so it never overflows `1280px` or `1440px` laptops.
- **Tablet & Mobile (`375px–1023px`):**
  - Public Navbar collapses to logo + hamburger drawer with smooth section links and full-width `Joining information` CTA.
  - Admin Topbar collapses to compact header (`64px`) + slide-out navigation drawer (`Overview`, `Site content`, `Events`, `Recruitment`, `Inquiries`, email, `← View Home`, `Log out`).
  - Admin multi-column tables (`Events`, `Recruitment Checklist`, `FAQ Bank`) render as stacked 1-column cards on mobile with direct tap actions (`Edit`, `Delete`, `View Form →`).
  - Modals (`Ask Question`, `Edit Event`, `Reply Email`, `Add FAQ`, `View Form`) become responsive scrollable dialogs fitting `375px` screens without horizontal scroll.

### 5.7 Figma-to-Code Asset & Fidelity Workflow (`figma-design-to-code`)
During implementation, each screen/section follows the strict `figma-design-to-code` protocol against `oHvTdXpz2zHXKAn4JWSCOp`:
1. Call `get_design_context` (with `skillNames: "figma-design-to-code"`) + inspect the returned screenshot as visual target for each top-level section/screen in `For User` and `For Admin`.
2. Download ALL static Figma assets (logos, hero graphics, campus photo, Admin Signin meme images, custom vector marks) into `public/images/figma/` and verify non-empty local files — zero temporary Figma asset URLs left in code.
3. Map extracted tokens to CSS variables in `src/app/globals.css` (aligned with Section 3.1) and reuse shared UI primitives (`Button`, `Badge`, `Modal`, `FileDropzone`, `ContentImage`, `Pagination`).
4. Visually inspect rendered pages in the browser across desktop (`1440px` / `1920px`) and mobile (`390px`) viewports and verify every static asset & interactive flow before completion.

---

## 6. What Is Left to the Builder

The builder has autonomy over the following details (without needing to ask back):
- Exact Next.js (15/16 stable) + Tailwind CSS (v4) configuration, ESLint/Prettier setup, and Vitest/Playwright verification commands.
- Exact UI icon library (`lucide-react`) for standard chrome icons (chevrons, eye toggle, upload cloud, search, trash, copy) where Figma does not use custom brand SVGs.
- Exact form validation implementation (`zod` + controlled React state or `react-hook-form`).
- Exact `Admin Signin` mock credential rules (e.g., accept any valid email + matching non-empty password ≥ 6 chars, or predefined demo account shown as a subtle helper note in `mock` mode).
- Exact clean-up of stale root build artifacts (`.next`, `node_modules`, legacy `package-lock.json`) while keeping `docs/` and HTML reference prototypes untouched unless explicitly asked to delete them.
