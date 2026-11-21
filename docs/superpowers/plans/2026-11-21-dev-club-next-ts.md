# MUICT Dev Club Website & Admin Portal (Next.js + TypeScript) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the production-grade, responsive Next.js + TypeScript public website (`For User`) and committee Admin Portal (`For Admin`) for MUICT Dev Club 2026 directly from Figma Dev Mode (`oHvTdXpz2zHXKAn4JWSCOp`), backed by 100% `.json`-driven editable site content, working 10 MB file uploads, and a swappable `MockAdapter` (Vercel-safe `localStorage` + `IndexedDB`) ↔ `HttpAdapter` (Python REST backend-ready) service layer.

**Architecture:** All editable website copy, image references, events, recruitment config, and bilingual legal documents live in modular, Zod-validated `src/content/*.json` files. Every UI page talks exclusively to typed services in `src/lib/services/` — never directly to `localStorage`, `IndexedDB`, or `fetch`. In `NEXT_PUBLIC_DATA_MODE=mock` (default for Vercel staging), JSON overrides persist in versioned `localStorage` and uploaded binary files (PNG/JPG/WebP/GIF/SVG and PDF/DOCX CVs up to 10 MB) persist in IndexedDB under stable `idb://<assetId>` tokens resolved by `<ContentImage>`. Flipping to `NEXT_PUBLIC_DATA_MODE=api` routes the exact same interfaces through `HttpAdapter` (`application/json` + Python-friendly `multipart/form-data` with `payload` + `file`/`cv`) documented 1-for-1 in `docs/api-contract.md`.

**Tech Stack:** Next.js (App Router, stable 15/16), React, TypeScript (`strict: true`), Tailwind CSS (v4), Zod, Lucide React, Vitest + React Testing Library + `jsdom` + `fake-indexeddb`, Figma MCP (`figma-design-to-code`).

**Spec:** `docs/superpowers/specs/2026-11-21-dev-club-next-ts-design.md`

## Global Constraints

- **Figma Scope:** Strictly implement pages `For User` (`26:160`) and `For Admin` (`26:161`) from Figma file `oHvTdXpz2zHXKAn4JWSCOp`. Do not implement `Page 1`, `Component`, or out-of-scope routes (`/projects`, `/game-dev`, `/structure`).
- **Figma Design-to-Code Discipline:** Every screen/section must call `get_design_context` (`skillNames: "figma-design-to-code"`) with screenshot as visual target, translate absolute positioning to responsive Tailwind layout, download ALL visible static assets locally into `public/images/figma/` (zero temporary `figma.com/api/mcp/asset/...` URLs in code), and preserve root SVG aspect ratios.
- **2026 CI Tokens (Locked — no dark mode, color pickers, or layout builders):** Primary `#0038E1` (dark `#002BAA`, base `#2E5DE9`, light `#A6C0FF`), Secondary `#E25BE9` (dark `#9E00A7`, light `#F3BFF9`), Tertiary `#A9E041` (dark `#548000`, light `#E7FDA7`), Surface `#FFFFFF`, Canvas `#F8FAFC`/`#F4F5F7`, Ink `#1C1B1F`, Dark Gray `#4A5565`, Gray `#757E91`, Borders `#A1A7B4`/`#E2E8F0`/`#E4E4E7`, Dark Footer `#11151C`, Status accents (`#E7FDA7`/`#548000`, `#FFF194`/`#AA5000`, `#FAAF98`/`#B41B00`/`#FB4A2A`, `#BDFBCC`/`#006C6C`).
- **Typography:** `Inter Thai Loopless` (with `Inter` + `Noto Sans Thai` fallback via `next/font/google`) for EN/TH UI & body; `JetBrains Mono` for indices, Student IDs, badges, and filenames.
- **100% JSON-Driven Editable Copy & Media:** Zero user-facing site copy or editable image URLs hard-coded inside `.tsx` files; all read from `src/content/*.json` via `ContentService` / `EventsService`.
- **Vercel Read-Only Filesystem Safety:** Zero runtime `fs.writeFile` calls. Uploaded binary files (`<= 10 MB`) never stored as Base64 in `localStorage` (must use IndexedDB in `mock` mode and `multipart/form-data` in `api` mode).
- **Single Sources of Truth:** `home.json` (`faq.items[]`) is the sole source of truth for FAQs on `/` Home (`FAQ Bank` is private admin-only with one-way `"Copy to Home FAQ"`). `events.json` is the sole source of truth for Events & News items (`home.json` holds only Timeline section header copy).
- **Security & Privacy:** Uploaded SVGs sanitized via DOMParser and rendered only via `<img>` (never `dangerouslySetInnerHTML`); PDPA consent checkboxes mandatory on Recruitment and Ask Question forms.
- **Responsive Range:** `375px` mobile (Hamburger drawers + stacked cards replacing Admin multi-column tables) to `1920px` desktop without horizontal overflow.

## Review Focus

1. **Malicious SVG upload payload** (`<script>`, `onload=`, `<foreignObject>`, `javascript:` href in uploaded `.svg`) → `svgSanitizer` must strip all executable nodes/attributes before persistence and render only via `<img>` (pinned in **Task 3** & **Task 10**).
2. **Oversized (`> 10 MB`) or invalid-type file upload** (e.g., 11 MB image in `Media & Assets` or `.exe`/wrong MIME in Recruitment CV) → rejected before IndexedDB/network write with clear inline error while preserving all entered form fields (pinned in **Task 3** & **Task 7**).
3. **In-use `MediaAsset` deletion & `idb://` image reload persistence** (deleting an image referenced by `site.json`, `home.json`, or `events.json`; reloading after assigning an uploaded image) → deletion must block with `ApiError(409, 'ASSET_IN_USE', usedBy)` and `<ContentImage>` must re-resolve `idb://` from IndexedDB and revoke ObjectURLs on unmount (pinned in **Task 4**, **Task 5**, **Task 10**).
4. **Corrupted `localStorage` JSON or stale schema keys** (malformed JSON or missing fields in `muict_devclub_v1_*`) → `localOverlay` must safely ignore corrupt data and fall back to default `src/content/*.json` without crashing hydration or rendering (pinned in **Task 3**).
5. **CSV formula injection / special characters in `Export CSV` & FastAPI `422 { detail }` error shapes in `HttpAdapter`** (commas, quotes, newlines, or leading `=`, `+`, `-`, `@` in applicant fields; Python FastAPI validation arrays) → CSV export must escape RFC 4180 fields and neutralize formula prefixes; `HttpAdapter` must normalize both FastAPI `{ detail }` and `{ message, code }` into typed `ApiError` (pinned in **Task 4** & **Task 12**).

---

## File Structure Map

```text
dev-club/
├── .env.example
├── next.config.ts
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── docs/
│   ├── api-contract.md                     # Python/FastAPI-ready REST + multipart contract
│   └── superpowers/specs/2026-11-21-dev-club-next-ts-design.md
├── public/
│   └── images/figma/                       # Locally downloaded static Figma assets (zero temp URLs)
├── src/
│   ├── content/                            # Modular JSON content & seed manifests
│   │   ├── site.json
│   │   ├── home.json
│   │   ├── events.json
│   │   ├── recruitment.json
│   │   ├── legal.json
│   │   ├── media.json
│   │   └── admin-seed.json
│   ├── lib/
│   │   ├── types/                          # TS interfaces + Zod schemas
│   │   │   ├── content.ts
│   │   │   ├── events.ts
│   │   │   ├── media.ts
│   │   │   ├── recruitment.ts
│   │   │   ├── inquiries.ts
│   │   │   ├── auth.ts
│   │   │   └── adminSeed.ts
│   │   ├── storage/                        # Browser storage & file safety utilities
│   │   │   ├── svgSanitizer.ts
│   │   │   ├── indexedDbFiles.ts
│   │   │   └── localOverlay.ts
│   │   ├── services/                       # Swappable data layer
│   │   │   ├── contracts.ts
│   │   │   ├── mockAdapter.ts
│   │   │   ├── httpAdapter.ts
│   │   │   └── index.ts
│   │   └── utils/
│   │       └── csvExport.ts
│   ├── context/
│   │   └── AppDataContext.tsx
│   ├── components/
│   │   ├── ui/                             # Button, Badge, Modal, ContentImage, FileDropzone, Pagination, MediaPickerModal
│   │   ├── public/                         # PublicNavbar, PublicFooter
│   │   ├── home/                           # HeroSection, AboutSection, WhyUsSection, TeamsSection, TimelineSection, EventDetailModal, LocationSection, FaqSection, AskQuestionModal
│   │   ├── recruitment/                    # RecruitmentClosedView, RecruitmentOpenedForm
│   │   ├── legal/                          # LegalDocumentView
│   │   └── admin/                          # AdminShell, AdminLoginView, OverviewDashboard, WebsiteCopyTab, MediaLibraryTab, EventsManager, EventEditorModal, InquiriesManager, ReplyEmailModal, AddFaqModal, RecruitmentManager, ViewApplicationModal
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       ├── page.tsx                        # / (User Home)
│       ├── joining-information/page.tsx    # /joining-information (Closed / Opened)
│       ├── privacy-policy/page.tsx         # /privacy-policy (EN / TH)
│       ├── terms-of-use/page.tsx           # /terms-of-use (EN / TH)
│       ├── acknowledgement/page.tsx        # /acknowledgement (EN / TH)
│       └── admin/
│           ├── page.tsx                    # Redirect -> /admin/overview or /admin/login
│           ├── login/page.tsx
│           ├── overview/page.tsx
│           ├── site-content/page.tsx
│           ├── events/page.tsx
│           ├── inquiries/page.tsx
│           └── recruitment/page.tsx
└── tests/
    ├── setup.ts
    ├── content-schemas.test.ts
    ├── storage.test.ts
    ├── services.test.ts
    ├── public-shell.test.tsx
    ├── home-page.test.tsx
    ├── recruitment-page.test.tsx
    ├── legal-pages.test.tsx
    ├── admin-auth-overview.test.tsx
    ├── admin-site-content.test.tsx
    ├── admin-events-inquiries.test.tsx
    └── admin-recruitment.test.tsx
```

---

### Task 1: Project Scaffold, 2026 CI Design Tokens, Fonts & Test Harness

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`, `src/app/globals.css`, `src/app/layout.tsx`, `tests/setup.ts`
- Modify: `.gitignore` (ensure `.env.local`, `.next/`, `coverage/` are ignored while keeping `docs/` and HTML reference files untouched)
- Test: `tests/smoke-tokens.test.ts`

**Interfaces:**
- Consumes: None (foundation task)
- Produces:
  - npm scripts: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`)
  - CSS variables in `src/app/globals.css`: `--color-primary` (`#0038E1`), `--color-secondary` (`#E25BE9`), `--color-tertiary` (`#A9E041`), `--color-surface` (`#FFFFFF`), `--color-canvas` (`#F8FAFC`), `--color-ink` (`#1C1B1F`), `--color-dark-gray` (`#4A5565`), `--color-gray` (`#757E91`), `--color-border` (`#E2E8F0`), `--color-footer` (`#11151C`), semantic status vars, `--font-sans`, `--font-mono`
  - `next.config.ts` optional same-origin rewrite `/api/backend/:path*` → `${process.env.BACKEND_INTERNAL_URL}/:path*` when `BACKEND_INTERNAL_URL` is set

- [ ] **Step 1: Initialize clean Next.js + TypeScript + Tailwind v4 + Vitest workspace**

Remove stale root `.next/`, `node_modules/`, and orphan `package-lock.json` (preserving `docs/`, `Prototype/`, `design.md`, and `*.html`). Create `package.json` with `next`, `react`, `react-dom`, `zod`, `lucide-react`, and devDependencies `typescript`, `@types/react`, `@types/node`, `tailwindcss`, `@tailwindcss/postcss`, `eslint`, `eslint-config-next`, `vitest`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `jsdom`, `fake-indexeddb`. Run `npm install`.

- [ ] **Step 2: Create `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`, and `tests/setup.ts`**

Configure `"strict": true`, `@/*` → `./src/*`, `resolveJsonModule: true` in `tsconfig.json`; `images: { unoptimized: true }` (so local/ObjectURL images work cleanly on Vercel) and conditional `/api/backend/:path*` rewrite in `next.config.ts`; `jsdom` + `fake-indexeddb/auto` + `@testing-library/jest-dom` in `vitest.config.ts` and `tests/setup.ts`. Populate `.env.example` with `NEXT_PUBLIC_DATA_MODE=mock`, `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1`, and `BACKEND_INTERNAL_URL=http://localhost:8000/api/v1`.

- [ ] **Step 3: Write failing token & layout smoke test in `tests/smoke-tokens.test.ts`**

```ts
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("2026 CI design tokens", () => {
  it("defines required primary, neutral, and semantic tokens in globals.css", () => {
    const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
    for (const hex of ["#0038E1", "#E25BE9", "#A9E041", "#1C1B1F", "#F8FAFC", "#E7FDA7", "#FFF194", "#FAAF98"]) {
      expect(css.toUpperCase()).toContain(hex);
    }
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npx vitest run tests/smoke-tokens.test.ts`
Expected: FAIL (`ENOENT` on `src/app/globals.css`)

- [ ] **Step 5: Implement `src/app/globals.css` and `src/app/layout.tsx`**

Define Tailwind v4 `@import "tailwindcss";` + `@theme` & `:root` tokens matching Section 3.1 verbatim (`Inter Thai Loopless` optional `@font-face` + `Inter`, `Noto Sans Thai`, `JetBrains Mono` loaded via `next/font/google` in `src/app/layout.tsx`, plus smooth scrolling `scroll-behavior: smooth`).

- [ ] **Step 6: Verify tests, typecheck, and build**

Run: `npx vitest run tests/smoke-tokens.test.ts && npm run typecheck`
Expected: PASS (1 test passed, 0 TypeScript errors)

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.ts postcss.config.mjs vitest.config.ts .env.example .gitignore src/app/globals.css src/app/layout.tsx tests/setup.ts tests/smoke-tokens.test.ts
git commit -m "chore: scaffold Next.js TypeScript project with 2026 CI tokens and Vitest"
```

---

### Task 2: Figma Static Asset Extraction, TypeScript/Zod Schemas & Modular `src/content/*.json`

**Files:**
- Create: `public/images/figma/*` (all downloaded brand logos, hero artwork, campus photo, Admin Signin meme images, vector accents from Figma `26:160` & `26:161`)
- Create: `src/lib/types/content.ts`, `src/lib/types/events.ts`, `src/lib/types/media.ts`, `src/lib/types/recruitment.ts`, `src/lib/types/inquiries.ts`, `src/lib/types/auth.ts`, `src/lib/types/adminSeed.ts`
- Create: `src/content/site.json`, `src/content/home.json`, `src/content/events.json`, `src/content/recruitment.json`, `src/content/legal.json`, `src/content/media.json`, `src/content/admin-seed.json`
- Test: `tests/content-schemas.test.ts`

**Interfaces:**
- Consumes: `zod` from Task 1
- Produces:
  - `ImageAsset` (`{ id?: string; src: string; alt: string }`), `imageAssetSchema`, and `EditableImageSlot = 'site.logoDark' | 'site.logoLight' | 'home.hero.heroArtwork' | 'home.location.image'` in `src/lib/types/content.ts`
  - `SiteContent` (`siteContentSchema`), `HomeContent` (`homeContentSchema`), `RecruitmentContent` (`recruitmentContentSchema`), `LegalContent` (`legalContentSchema`), `ContentSectionKey = 'site' | 'home' | 'recruitment' | 'legal'`
  - `EventItem` (`eventItemSchema`: `{ id, marker, title, subtitle, category: 'Event' | 'News', dateLabel, location, description, coverImage?: ImageAsset, status: 'Published' | 'Draft', showOnHome: boolean, order: number, updatedAt }`)
  - `MediaAsset` (`mediaAssetSchema`: `{ id, filename, title, sourceSlot?, mimeType, kind: 'image' | 'svg', sizeBytes, width?, height?, url, createdAt }`)
  - `RecruitmentApplication` (`recruitmentApplicationSchema`: `{ id, createdAt, status: 'Pending' | 'Accepted' | 'Rejected', personal: { firstName, lastName, nickname, studentId, email, phone, program, year }, team: 'projects' | 'marketing', roleId, roleLabel, customRole?, motivation: { expectation, contribution, projectIdea, teamExperience }, cv?: { fileRef, filename, mimeType, sizeBytes }, portfolioUrl?, agreedRequirements: true, agreedPdpa: true }`)
  - `InquiryItem` (`inquiryItemSchema`), `FaqBankItem` (`faqBankItemSchema`), `AdminSession` (`adminSessionSchema`), `AdminSeedData` (`adminSeedSchema` in `src/lib/types/adminSeed.ts`: `{ applications, inquiries, faqBank, signinMemes }`)

- [ ] **Step 1: Extract and download all static Figma assets into `public/images/figma/`**

Following `figma-design-to-code`, call `get_design_context` (`skillNames: "figma-design-to-code"`, `fileKey: "oHvTdXpz2zHXKAn4JWSCOp"`) on key frames in `For User` (`160:532` Onboarding/Hero, `160:1020` Navbar, `160:966` Location, `160:993` Footer) and `For Admin` (`160:1492` Admin Signin) and download every visible brand/artwork asset (dark wordmark logo, white logo, hero artwork SVG/PNG, campus location photo, Admin Signin meme images + background pattern) into `public/images/figma/`. Verify every downloaded file is non-empty.

- [ ] **Step 2: Write failing schema & asset integrity tests in `tests/content-schemas.test.ts`**

```ts
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import siteJson from "@/content/site.json";
import homeJson from "@/content/home.json";
import eventsJson from "@/content/events.json";
import recruitmentJson from "@/content/recruitment.json";
import legalJson from "@/content/legal.json";
import mediaJson from "@/content/media.json";
import adminSeedJson from "@/content/admin-seed.json";
import {
  siteContentSchema,
  homeContentSchema,
  recruitmentContentSchema,
  legalContentSchema,
} from "@/lib/types/content";
import { eventsListSchema } from "@/lib/types/events";
import { mediaListSchema } from "@/lib/types/media";
import { adminSeedSchema } from "@/lib/types/adminSeed";

describe("Modular src/content/*.json schemas & local Figma assets", () => {
  it("validates all 7 JSON files against Zod schemas", () => {
    expect(() => siteContentSchema.parse(siteJson)).not.toThrow();
    const home = homeContentSchema.parse(homeJson);
    expect(home.whyUs.cards).toHaveLength(3);
    expect(home.teams.items).toHaveLength(5);
    expect(() => eventsListSchema.parse(eventsJson)).not.toThrow();
    const rec = recruitmentContentSchema.parse(recruitmentJson);
    expect(rec.projectsTeamRoles).toHaveLength(8);
    expect(rec.marketingTeamRoles).toHaveLength(4);
    const legal = legalContentSchema.parse(legalJson);
    expect(legal.privacyPolicy.en.sections.length).toBeGreaterThan(0);
    expect(legal.privacyPolicy.th.sections.length).toBeGreaterThan(0);
    expect(() => mediaListSchema.parse(mediaJson)).not.toThrow();
    expect(() => adminSeedSchema.parse(adminSeedJson)).not.toThrow();
  });

  it("ensures every /images/figma/* path in JSON points to a non-empty local file and zero temp Figma URLs exist", () => {
    const raw = JSON.stringify([siteJson, homeJson, eventsJson, mediaJson, adminSeedJson]);
    expect(raw).not.toContain("figma.com/api/mcp/asset");
    const matches = raw.match(/\/images\/figma\/[^"]+/g) ?? [];
    expect(matches.length).toBeGreaterThan(0);
    for (const rel of matches) {
      const full = resolve(process.cwd(), "public", rel.slice(1));
      expect(existsSync(full), `Missing asset: ${rel}`).toBe(true);
      expect(statSync(full).size, `Empty asset: ${rel}`).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/content-schemas.test.ts`
Expected: FAIL (cannot resolve `@/content/*.json` and `@/lib/types/*`)

- [ ] **Step 4: Implement all Zod/TS types in `src/lib/types/*.ts` and populate all 7 `src/content/*.json` files**

Populate real MUICT Dev Club 2026 copy matching Figma `For User` (`26:160`) and `For Admin` (`26:161`), replacing Home Timeline's `Help Dogs` placeholder in `events.json` with realistic MUICT Dev Club 2026 Events & News items (`showOnHome: true` on 5 featured items), real EN/TH clauses in `legal.json` (extracted from Figma `165:4482`, `165:4557`, `180:287`, `180:979`, `180:1140`), and realistic staging seed entries in `admin-seed.json`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/content-schemas.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add public/images/figma src/lib/types src/content tests/content-schemas.test.ts
git commit -m "feat(content): add Figma local assets, Zod types, and modular JSON content files"
```

---

### Task 3: Storage Helpers (`svgSanitizer`, `indexedDbFiles`, `localOverlay`) & File Validation

**Files:**
- Create: `src/lib/storage/svgSanitizer.ts`, `src/lib/storage/indexedDbFiles.ts`, `src/lib/storage/localOverlay.ts`
- Test: `tests/storage.test.ts`

**Interfaces:**
- Consumes: `src/lib/types/*` (Task 2)
- Produces:
  - `MAX_UPLOAD_BYTES = 10 * 1024 * 1024`
  - `validateImageFile(file: File): { ok: true; kind: 'image' | 'svg' } | { ok: false; error: string }`
  - `validateCvFile(file: File): { ok: true } | { ok: false; error: string }`
  - `sanitizeSvgText(rawSvg: string): { sanitized: string; removedUnsafe: boolean }`
  - `putFile(id: string, blob: Blob, meta: { filename: string; mimeType: string }): Promise<void>`
  - `getFileBlob(id: string): Promise<{ blob: Blob; filename: string; mimeType: string } | null>`
  - `deleteFile(id: string): Promise<void>`
  - `clearAllFiles(): Promise<void>`
  - `readOverlay<T>(key: string, schema: z.ZodType<T>, fallback: T): T`
  - `writeOverlay<T>(key: string, value: T): void`
  - `clearAllOverlays(): void`
  - `findIdbRefs(obj: unknown): string[]` (scans JSON for `idb://<id>` tokens to warn during `Export .json`)

- [ ] **Step 1: Write failing tests in `tests/storage.test.ts` (pins Review Focus #1, #2, #4)**

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { z } from "zod";
import { sanitizeSvgText, validateCvFile, validateImageFile, MAX_UPLOAD_BYTES } from "@/lib/storage/svgSanitizer";
import { putFile, getFileBlob, deleteFile, clearAllFiles } from "@/lib/storage/indexedDbFiles";
import { readOverlay, writeOverlay, clearAllOverlays, findIdbRefs } from "@/lib/storage/localOverlay";

describe("File safety, SVG sanitization, IndexedDB, and localOverlay", () => {
  beforeEach(async () => {
    clearAllOverlays();
    await clearAllFiles();
  });

  it("strips script, foreignObject, on* handlers, and javascript: hrefs from SVG (Review Focus #1)", () => {
    const dirty = `<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><script>evil()</script><foreignObject><div>x</div></foreignObject><a href="javascript:alert(2)"><rect width="10" height="10" onclick="boom()"/></a></svg>`;
    const { sanitized, removedUnsafe } = sanitizeSvgText(dirty);
    expect(removedUnsafe).toBe(true);
    expect(sanitized.toLowerCase()).not.toContain("<script");
    expect(sanitized.toLowerCase()).not.toContain("foreignobject");
    expect(sanitized.toLowerCase()).not.toContain("onload");
    expect(sanitized.toLowerCase()).not.toContain("onclick");
    expect(sanitized.toLowerCase()).not.toContain("javascript:");
  });

  it("rejects files exceeding 10 MB or disallowed MIME/extension (Review Focus #2)", () => {
    const tooBig = new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "huge.png", { type: "image/png" });
    expect(validateImageFile(tooBig).ok).toBe(false);
    const badCv = new File(["binary"], "virus.exe", { type: "application/x-msdownload" });
    expect(validateCvFile(badCv).ok).toBe(false);
    const okPdf = new File(["%PDF-1.4"], "resume.pdf", { type: "application/pdf" });
    expect(validateCvFile(okPdf).ok).toBe(true);
  });

  it("stores, reads, and deletes blobs in IndexedDB", async () => {
    const blob = new Blob(["hello pdf"], { type: "application/pdf" });
    await putFile("cv-1", blob, { filename: "resume.pdf", mimeType: "application/pdf" });
    const loaded = await getFileBlob("cv-1");
    expect(loaded?.filename).toBe("resume.pdf");
    expect(loaded?.blob.size).toBe(blob.size);
    await deleteFile("cv-1");
    expect(await getFileBlob("cv-1")).toBeNull();
  });

  it("falls back cleanly to default JSON when localStorage is corrupt (Review Focus #4)", () => {
    const schema = z.object({ title: z.string() });
    localStorage.setItem("muict_devclub_v1_home", "{not-valid-json");
    expect(readOverlay("home", schema, { title: "Default" })).toEqual({ title: "Default" });
    localStorage.setItem("muict_devclub_v1_home", JSON.stringify({ wrongKey: 123 }));
    expect(readOverlay("home", schema, { title: "Default" })).toEqual({ title: "Default" });
    writeOverlay("home", { title: "Updated" });
    expect(readOverlay("home", schema, { title: "Default" })).toEqual({ title: "Updated" });
  });

  it("detects idb:// image references inside nested JSON objects", () => {
    expect(findIdbRefs({ hero: { src: "idb://asset-1" }, other: "/images/figma/a.png" })).toEqual(["asset-1"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/storage.test.ts`
Expected: FAIL (modules not found)

- [ ] **Step 3: Implement `svgSanitizer.ts`, `indexedDbFiles.ts`, and `localOverlay.ts`**

Use `DOMParser` (`image/svg+xml` with `text/html` fallback if needed) in `svgSanitizer.ts` to remove `<script>`, `<foreignObject>`, `<iframe>`, `<object>`, `<embed>`, every `on*` attribute, and `javascript:`/`data:text/html` on `href`/`xlink:href`. Use IndexedDB DB name `muict_devclub_files_db` store `files` in `indexedDbFiles.ts`. Prefix all `localStorage` keys with `muict_devclub_v1_` in `localOverlay.ts` and swallow JSON/Zod errors with safe fallback.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/storage.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/storage tests/storage.test.ts
git commit -m "feat(storage): add SVG sanitizer, file validators, IndexedDB blob store, and safe localStorage overlay"
```

---

### Task 4: Service Contracts, `MockAdapter`, `HttpAdapter`, `AppDataContext` & `docs/api-contract.md`

**Files:**
- Create: `src/lib/services/contracts.ts`, `src/lib/services/mockAdapter.ts`, `src/lib/services/httpAdapter.ts`, `src/lib/services/index.ts`, `src/context/AppDataContext.tsx`, `docs/api-contract.md`
- Test: `tests/services.test.ts`

**Interfaces:**
- Consumes: `src/lib/types/*` (Task 2), `src/lib/storage/*` (Task 3), `src/content/*.json` (Task 2)
- Produces:
  - `ApiError` class (`status: number`, `code: string`, `message: string`, `details?: unknown`)
  - `ServiceBundle` containing:
    - `content`: `getSection<K>(key)`, `updateSection<K>(key, data)`, `resetAll()`, `exportSectionJson(key)`
    - `media`: `listMedia()`, `uploadMedia(input: { file: File; title?: string; sourceSlot?: string })`, `assignMediaToSlot(assetId: string, slot: EditableImageSlot)`, `deleteMedia(assetId: string)` (throws `ApiError(409, 'ASSET_IN_USE', ..., usedBy)` if referenced)
    - `events`: `listEvents()`, `createEvent(input, coverFile?)`, `updateEvent(id, input, coverFile?)`, `deleteEvent(id)`
    - `recruitment`: `listApplications()`, `submitApplication(input, cvFile?)`, `updateStatus(id, status)`, `getCvDownloadUrl(id): Promise<{ url: string; filename: string; mimeType: string }>`
    - `inquiries`: `listInquiries()`, `submitInquiry(input)`, `replyInquiry(id, reply)`, `updateTags(id, tags)`, `listFaqBank()`, `createFaqBankItem(input)`, `updateFaqBankItem(id, input)`, `deleteFaqBankItem(id)`, `copyFaqBankToHome(faqBankId)`
    - `auth`: `login(input)`, `logout()`, `getSession(): Promise<AdminSession | null>`
  - `getServices(): ServiceBundle` & `useAppData()` hook from `AppDataContext` (exposes `mode: 'mock' | 'api'`, loaded `site`, `home`, `events`, `recruitment`, `legal`, `media`, `session`, and refresh helpers)

- [ ] **Step 1: Write failing service tests in `tests/services.test.ts` (pins Review Focus #3 & #5)**

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMockServices } from "@/lib/services/mockAdapter";
import { createHttpServices } from "@/lib/services/httpAdapter";
import { ApiError } from "@/lib/services/contracts";
import { clearAllOverlays } from "@/lib/storage/localOverlay";
import { clearAllFiles } from "@/lib/storage/indexedDbFiles";

describe("Service layer (MockAdapter & HttpAdapter)", () => {
  beforeEach(async () => {
    clearAllOverlays();
    await clearAllFiles();
  });

  it("blocks deleting a MediaAsset currently referenced by a site slot with 409 ASSET_IN_USE (Review Focus #3)", async () => {
    const svc = createMockServices();
    const media = await svc.media.listMedia();
    const heroAsset = media.find((m) => m.sourceSlot === "home.hero.heroArtwork");
    expect(heroAsset).toBeDefined();
    await expect(svc.media.deleteMedia(heroAsset!.id)).rejects.toMatchObject({
      status: 409,
      code: "ASSET_IN_USE",
    });
  });

  it("uploads CV with Recruitment application and resolves downloadable URL", async () => {
    const svc = createMockServices();
    const cv = new File(["%PDF-1.4 demo"], "somchai-cv.pdf", { type: "application/pdf" });
    const created = await svc.recruitment.submitApplication(
      {
        personal: {
          firstName: "Somchai",
          lastName: "Narin",
          nickname: "Chai",
          studentId: "6987777",
          email: "somchai@student.mahidol.ac.th",
          phone: "0894567890",
          program: "DST",
          year: "1",
        },
        team: "projects",
        roleId: "frontend-dev",
        roleLabel: "Front End Developer",
        motivation: {
          expectation: "Learn Next.js",
          contribution: "Build UI",
          projectIdea: "Campus hub",
          teamExperience: "Class project",
        },
        agreedRequirements: true,
        agreedPdpa: true,
      },
      cv,
    );
    const dl = await svc.recruitment.getCvDownloadUrl(created.id);
    expect(dl.filename).toBe("somchai-cv.pdf");
    expect(dl.mimeType).toBe("application/pdf");
    expect(dl.url).toBeTruthy();
  });

  it("keeps FAQ Bank private until copyFaqBankToHome writes one-way into home.json", async () => {
    const svc = createMockServices();
    const beforeHome = await svc.content.getSection("home");
    const saved = await svc.inquiries.createFaqBankItem({
      question: "Can freshmen join?",
      answer: "Yes, all ICT and DST years are welcome.",
      category: "Recruitment",
    });
    const afterBankOnly = await svc.content.getSection("home");
    expect(afterBankOnly.faq.items.length).toBe(beforeHome.faq.items.length);
    await svc.inquiries.copyFaqBankToHome(saved.id);
    const afterPromote = await svc.content.getSection("home");
    expect(afterPromote.faq.items.some((q) => q.question === "Can freshmen join?")).toBe(true);
  });

  it("HttpAdapter sends Python-friendly FormData (payload + cv) and normalizes FastAPI 422 detail errors (Review Focus #5)", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ detail: [{ loc: ["body", "studentId"], msg: "must be 7 digits" }] }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const svc = createHttpServices({ baseUrl: "http://localhost:8000/api/v1", fetchImpl: fetchMock });
    const cv = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });
    await expect(
      svc.recruitment.submitApplication(
        {
          personal: {
            firstName: "A", lastName: "B", nickname: "C", studentId: "123",
            email: "a@b.com", phone: "0812345678", program: "ICT", year: "1",
          },
          team: "projects", roleId: "frontend-dev", roleLabel: "Front End Developer",
          motivation: { expectation: "e", contribution: "c", projectIdea: "p", teamExperience: "t" },
          agreedRequirements: true, agreedPdpa: true,
        },
        cv,
      ),
    ).rejects.toSatisfy((err: unknown) => err instanceof ApiError && err.status === 422 && err.message.includes("must be 7 digits"));

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://localhost:8000/api/v1/recruitment/applications");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).has("payload")).toBe(true);
    expect((init.body as FormData).has("cv")).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/services.test.ts`
Expected: FAIL (service modules not found)

- [ ] **Step 3: Implement `contracts.ts`, `mockAdapter.ts`, `httpAdapter.ts`, `index.ts`, `AppDataContext.tsx`, and `docs/api-contract.md`**

Implement `MockAdapter` with full `ASSET_IN_USE` usage scanning across `site.json`, `home.json`, `events.json`, and `admin-seed.json`; register cover images uploaded via `eventsService` into `Media & Assets`; store `idb://<assetId>` tokens for IndexedDB uploads; implement `HttpAdapter` with `credentials: 'include'`, optional Bearer token hook, `payload` + `file`/`cv` multipart encoding, and FastAPI `422 { detail }` error normalization. Write `docs/api-contract.md` matching `httpAdapter.ts` 1-for-1 (endpoints, Pydantic-friendly `camelCase` JSON examples, multipart specs, `409 ASSET_IN_USE`, `422` validation errors, and CV presigned URL contract). Wrap `src/app/layout.tsx` children in `<AppDataProvider>`.

- [ ] **Step 4: Run tests and typecheck**

Run: `npx vitest run tests/services.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/services src/context/AppDataContext.tsx src/app/layout.tsx docs/api-contract.md tests/services.test.ts
git commit -m "feat(services): add MockAdapter, Python-ready HttpAdapter, AppDataContext, and api-contract.md"
```

---

### Task 5: Shared UI Primitives & Public Layout Shell (`Navbar`, `Footer`, `ContentImage`, `Modal`, `FileDropzone`)

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Badge.tsx`, `src/components/ui/Modal.tsx`, `src/components/ui/ContentImage.tsx`, `src/components/ui/FileDropzone.tsx`, `src/components/ui/Pagination.tsx`, `src/components/ui/MediaPickerModal.tsx`
- Create: `src/components/public/PublicNavbar.tsx`, `src/components/public/PublicFooter.tsx`
- Test: `tests/public-shell.test.tsx`

**Interfaces:**
- Consumes: `useAppData()` (Task 4), `getFileBlob()` (Task 3), `validateImageFile()` / `validateCvFile()` (Task 3)
- Produces:
  - `<ContentImage asset={ImageAsset} className? width? height? />` — resolves `idb://<assetId>` via IndexedDB `URL.createObjectURL` and calls `URL.revokeObjectURL` on cleanup/change
  - `<Modal open onClose title maxWidthClass children />` — Escape key + backdrop click close, scroll-safe on `375px`
  - `<FileDropzone accept maxBytes label helper onFileSelected error />`
  - `<MediaPickerModal open onClose onSelectAsset={(asset: MediaAsset) => void} />`
  - `<PublicNavbar />` & `<PublicFooter />` reading 100% of labels, links, logos, and address from `site.json`

- [ ] **Step 1: Fetch Figma Navbar & Footer design context**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on `Navigation Main` (`160:1020`) and `Footer` (`160:993`) to match exact padding, borders, typography, and colors.

- [ ] **Step 2: Write failing tests in `tests/public-shell.test.tsx` (pins Review Focus #3 `<ContentImage>` reload + cleanup)**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import { ContentImage } from "@/components/ui/ContentImage";
import { PublicNavbar } from "@/components/public/PublicNavbar";
import { PublicFooter } from "@/components/public/PublicFooter";
import { putFile } from "@/lib/storage/indexedDbFiles";

describe("Shared UI primitives and Public shell", () => {
  it("resolves idb:// ImageAsset from IndexedDB and revokes ObjectURL on unmount (Review Focus #3)", async () => {
    await putFile("hero-custom", new Blob(["png"], { type: "image/png" }), { filename: "hero.png", mimeType: "image/png" });
    const createSpy = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:hero-custom");
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const { unmount } = render(<ContentImage asset={{ id: "hero-custom", src: "idb://hero-custom", alt: "Hero" }} />);
    await waitFor(() => expect(screen.getByAltText("Hero")).toHaveAttribute("src", "blob:hero-custom"));
    unmount();
    expect(revokeSpy).toHaveBeenCalledWith("blob:hero-custom");
    createSpy.mockRestore();
    revokeSpy.mockRestore();
  });

  it("renders PublicNavbar links and PublicFooter legal links from site.json and toggles mobile menu", async () => {
    const user = userEvent.setup();
    render(
      <AppDataProvider>
        <PublicNavbar />
        <PublicFooter />
      </AppDataProvider>,
    );
    expect(screen.getByRole("link", { name: /Joining information/i })).toHaveAttribute("href", "/joining-information");
    expect(screen.getByRole("link", { name: /Privacy Policy/i })).toHaveAttribute("href", "/privacy-policy");
    expect(screen.getByRole("link", { name: /Terms of Use/i })).toHaveAttribute("href", "/terms-of-use");
    expect(screen.getByRole("link", { name: /Acknowledgement/i })).toHaveAttribute("href", "/acknowledgement");
    const menuBtn = screen.getByRole("button", { name: /toggle navigation/i });
    await user.click(menuBtn);
    expect(screen.getByRole("dialog", { name: /mobile navigation/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/public-shell.test.tsx`
Expected: FAIL (components not found)

- [ ] **Step 4: Implement `src/components/ui/*` and `src/components/public/*`**

Build clean, accessible Tailwind components strictly matching 2026 CI tokens, sticky `PublicNavbar` (non-clickable brand logo on Home per spec/Figma, smooth anchor links + mobile drawer), dark `#11151C` `PublicFooter`, and `MediaPickerModal` connecting to `mediaService`.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/public-shell.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/ui src/components/public tests/public-shell.test.tsx
git commit -m "feat(ui): add shared UI primitives, ContentImage idb resolver, and public Navbar/Footer"
```

---

### Task 6: User Home Page (`/`) — All Sections, Event Detail Modal & Ask Question Modal

**Files:**
- Create: `src/components/home/HeroSection.tsx`, `src/components/home/AboutSection.tsx`, `src/components/home/WhyUsSection.tsx`, `src/components/home/TeamsSection.tsx`, `src/components/home/TimelineSection.tsx`, `src/components/home/EventDetailModal.tsx`, `src/components/home/LocationSection.tsx`, `src/components/home/FaqSection.tsx`, `src/components/home/AskQuestionModal.tsx`
- Create: `src/app/page.tsx`
- Test: `tests/home-page.test.tsx`

**Interfaces:**
- Consumes: `useAppData()` (`home`, `events`, `services.inquiries`), `PublicNavbar`, `PublicFooter`, `ContentImage`, `Modal`, `Badge`
- Produces: Complete `/` Home route matching Figma `160:530` + `194:145`

- [ ] **Step 1: Fetch Figma design context for all `Home` sections & Ask Question modal**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on `Onboarding` (`160:532`), `About us` (`160:669`), `Why us` (`160:676`), `Teams` (`160:726`), `Timeline` slot (`160:931`), `Location` (`160:966`), `FAQ` (`160:976`), and `Ask MUICT Dev Club dialog` (`165:4814`) so every spacing rhythm, border, index badge (`01 / ...`–`05 / ...`), and typographic hierarchy matches Figma.

- [ ] **Step 2: Write failing tests in `tests/home-page.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import HomePage from "@/app/page";

describe("User Home page (/)", () => {
  it("renders JSON-driven sections and opens EventDetailModal on Timeline click (showing only Published + showOnHome)", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><HomePage /></AppDataProvider>);
    expect(await screen.findByText(/They were wrong/i)).toBeInTheDocument();
    expect(screen.queryByText(/Help Dogs/i)).not.toBeInTheDocument();

    const firstEventBtn = screen.getAllByRole("button", { name: /view details/i })[0];
    await user.click(firstEventBtn);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("blocks Ask MUICT Dev Club submission without PDPA consent and submits cleanly when checked", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><HomePage /></AppDataProvider>);
    await user.click(await screen.findByRole("button", { name: /Ask us Question/i }));

    await user.type(screen.getByLabelText(/Question/i), "Can first-year DST join?");
    await user.type(screen.getByLabelText(/Sender Email/i), "6981234@student.mahidol.ac.th");
    await user.click(screen.getByRole("button", { name: /Send Question/i }));
    expect(screen.getByText(/consent/i)).toBeInTheDocument();

    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /Send Question/i }));
    await waitFor(() => expect(screen.getByText(/question received|thank you/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/home-page.test.tsx`
Expected: FAIL (`src/app/page.tsx` not implemented)

- [ ] **Step 4: Implement all 9 Home components and `src/app/page.tsx`**

Render every heading, body paragraph, team card, FAQ item, and image exclusively from `home.json` and `events.json`. Add `scroll-mt-28` on every anchor target (`#about`, `#why-us`, `#teams`, `#timeline`, `#location`, `#faq`) so sticky navbar never covers section indices. Show `Event` vs `News` category badge on `TimelineSection` cards (`Published` + `showOnHome: true`, sorted by `order`) and open `EventDetailModal` with `<ContentImage>` cover, date/time, location, and description.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/home-page.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/home src/app/page.tsx tests/home-page.test.tsx
git commit -m "feat(user): implement Home page sections, Timeline detail modal, and Ask Question modal"
```

---

### Task 7: User Recruitment Page (`/joining-information`) — Closed & Opened States + CV Upload

**Files:**
- Create: `src/components/recruitment/RecruitmentClosedView.tsx`, `src/components/recruitment/RecruitmentOpenedForm.tsx`
- Create: `src/app/joining-information/page.tsx`
- Test: `tests/recruitment-page.test.tsx`

**Interfaces:**
- Consumes: `useAppData()` (`recruitment`, `services.recruitment`), `validateCvFile()` (Task 3), `PublicNavbar`, `PublicFooter`
- Produces: Complete `/joining-information` page supporting `isOpen: false` (Closed), `isOpen: true` (Opened), and `?preview=closed|open`

- [ ] **Step 1: Fetch Figma design context for `Recruitment Closed` (`160:1158`) and `Recruitment -Opened` (`160:1208`)**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on both frames to match the Closed banner layout and the 2-column Opened form layout (left `01–03` onboarding column + right 3-section form card).

- [ ] **Step 2: Write failing tests in `tests/recruitment-page.test.tsx` (pins Review Focus #2)**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import RecruitmentClosedView from "@/components/recruitment/RecruitmentClosedView";
import RecruitmentOpenedForm from "@/components/recruitment/RecruitmentOpenedForm";
import recruitmentJson from "@/content/recruitment.json";

describe("Recruitment page (/joining-information)", () => {
  it("renders Closed state copy from recruitment.json", () => {
    render(<AppDataProvider><RecruitmentClosedView content={recruitmentJson} /></AppDataProvider>);
    expect(screen.getByText(/Applications are currently closed/i)).toBeInTheDocument();
  });

  it("rejects invalid CV file type while preserving form values, then submits valid form + PDF CV (Review Focus #2)", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><RecruitmentOpenedForm content={recruitmentJson} /></AppDataProvider>);

    await user.type(screen.getByLabelText(/First Name/i), "Somchai");
    await user.type(screen.getByLabelText(/Last Name/i), "Narin");
    await user.type(screen.getByLabelText(/NickName/i), "Chai");
    await user.type(screen.getByLabelText(/Student ID/i), "6987777");
    await user.type(screen.getByLabelText(/^Email/i), "6987777@student.mahidol.ac.th");
    await user.type(screen.getByLabelText(/Phone/i), "0812345678");
    await user.selectOptions(screen.getByLabelText(/Program/i), "DST");
    await user.selectOptions(screen.getByLabelText(/Year/i), "1");
    await user.click(screen.getByRole("radio", { name: /Front End Developer/i }));
    await user.type(screen.getByLabelText(/Expectation/i), "Build real web apps");
    await user.type(screen.getByLabelText(/Contribution/i), "Frontend UI");
    await user.type(screen.getByLabelText(/Project Idea/i), "Club portal");
    await user.type(screen.getByLabelText(/Team Project Experience/i), "ICT course project");

    // Attempt invalid CV file -> error shown, First Name preserved
    const fileInput = screen.getByLabelText(/Upload CV/i) as HTMLInputElement;
    await user.upload(fileInput, new File(["bad"], "malware.exe", { type: "application/x-msdownload" }), { applyAccept: false });
    expect(screen.getByText(/PDF|DOCX/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/First Name/i)).toHaveValue("Somchai");

    // Upload valid PDF CV + check both agreements + submit
    await user.upload(fileInput, new File(["%PDF-1.4"], "somchai.pdf", { type: "application/pdf" }));
    expect(screen.getByText("somchai.pdf")).toBeInTheDocument();
    for (const cb of screen.getAllByRole("checkbox")) await user.click(cb);
    await user.click(screen.getByRole("button", { name: /Submit Application/i }));

    await waitFor(() => expect(screen.getByText(/Pending/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/recruitment-page.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement `RecruitmentClosedView.tsx`, `RecruitmentOpenedForm.tsx`, and `src/app/joining-information/page.tsx`**

Validate all required fields (7-digit numeric Student ID, 10-digit Phone, valid Email, Program, Year `1..4`, Role selection + custom role text if `Other`, all 4 Motivation textareas, optional valid URL for Portfolio, optional `.pdf`/`.docx` ≤ 10 MB CV, both mandatory checkboxes). Show crisp `#FB4A2A`/`#B41B00` inline validation errors and post-submit `Pending` receipt card with application ID.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/recruitment-page.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/recruitment src/app/joining-information tests/recruitment-page.test.tsx
git commit -m "feat(user): implement Recruitment Closed/Opened page with role cards and CV upload"
```

---

### Task 8: User Legal Pages (`/privacy-policy`, `/terms-of-use`, `/acknowledgement`) with EN/TH Toggle

**Files:**
- Create: `src/components/legal/LegalDocumentView.tsx`
- Create: `src/app/privacy-policy/page.tsx`, `src/app/terms-of-use/page.tsx`, `src/app/acknowledgement/page.tsx`
- Test: `tests/legal-pages.test.tsx`

**Interfaces:**
- Consumes: `useAppData()` (`legal`), `PublicNavbar`, `PublicFooter`
- Produces: Bilingual (`EN` default / `TH` toggle) Legal pages rendering structured plain-text clauses from `legal.json`

- [ ] **Step 1: Fetch Figma design context for Legal frames (`165:4557`, `165:4482`, `180:287`, `180:1140`)**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on `Privacy Policy (EN)` (`165:4557`) and `Acknowledgement` (`180:1140`) to match document max-width (`840px`), metadata row (`← Back to Home`, `Last updated`), and `EN / TH` pill toggle.

- [ ] **Step 2: Write failing tests in `tests/legal-pages.test.tsx`**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import PrivacyPolicyPage from "@/app/privacy-policy/page";
import TermsOfUsePage from "@/app/terms-of-use/page";
import AcknowledgementPage from "@/app/acknowledgement/page";

describe("User Legal pages (EN / TH)", () => {
  it("defaults Privacy Policy to EN and toggles cleanly to TH", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><PrivacyPolicyPage /></AppDataProvider>);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Privacy Policy/i);
    await user.click(screen.getByRole("button", { name: /TH/i }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/นโยบายความเป็นส่วนตัว/);
  });

  it("renders Terms of Use (EN/TH) and Acknowledgement developer credits from legal.json", () => {
    render(<AppDataProvider><TermsOfUsePage /><AcknowledgementPage /></AppDataProvider>);
    expect(screen.getByText(/Terms of Use/i)).toBeInTheDocument();
    expect(screen.getByText(/Poonyawatt Klumnaim/i)).toBeInTheDocument();
    expect(screen.getByText(/Pakawat Sanboonsri/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/legal-pages.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement `LegalDocumentView.tsx` and the 3 Legal App Router pages**

Render structured `sections` (`heading`, `paragraphs[]`, `bullets[]`) cleanly with `Inter Thai Loopless` / `Noto Sans Thai` line-height for Thai readability.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/legal-pages.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/legal src/app/privacy-policy src/app/terms-of-use src/app/acknowledgement tests/legal-pages.test.tsx
git commit -m "feat(user): add bilingual EN/TH Privacy Policy, Terms of Use, and Acknowledgement pages"
```

---

### Task 9: Admin Login (`/admin/login`), `AdminShell` (`AdminAuthGuard`) & Overview (`/admin/overview`)

**Files:**
- Create: `src/components/admin/AdminLoginView.tsx`, `src/components/admin/AdminShell.tsx`, `src/components/admin/OverviewDashboard.tsx`
- Create: `src/app/admin/page.tsx`, `src/app/admin/login/page.tsx`, `src/app/admin/overview/page.tsx`
- Test: `tests/admin-auth-overview.test.tsx`

**Interfaces:**
- Consumes: `useAppData()` (`services.auth`, `events`, `recruitment`, `inquiries`, `mode`), `ContentImage`
- Produces:
  - `<AdminShell activeNav="overview" | "site-content" | "events" | "recruitment" | "inquiries" title subtitle headerAction? children />` — enforces client-side `AdminAuthGuard` redirecting unauthenticated users to `/admin/login`, renders `120px`-proportion responsive Topbar + mobile `64px` Hamburger drawer + subtle `Preview / Mock Mode` pill when `mode === 'mock'`

- [ ] **Step 1: Fetch Figma design context for `Admin Signin` (`160:1492`) and `Stats` (`160:1538`)**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on `160:1492` and `160:1538` to match `<Admin SignIn /> !`, lime green rounded-right `Submit` button, meme carousel arrows, Topbar blue bottom divider, and 3-column KPI + 2-column Latest lists layout.

- [ ] **Step 2: Write failing tests in `tests/admin-auth-overview.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import { AdminLoginView } from "@/components/admin/AdminLoginView";
import { OverviewDashboard } from "@/components/admin/OverviewDashboard";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/admin/overview",
}));

describe("Admin Login and Overview", () => {
  it("shows inline red error when password and confirm password mismatch and cycles meme slides", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><AdminLoginView /></AppDataProvider>);

    await user.type(screen.getByPlaceholderText(/Enter your email/i), "admin@muictdev.club");
    await user.type(screen.getByPlaceholderText(/Enter your password/i), "secret123");
    await user.type(screen.getByPlaceholderText(/Confirm your password/i), "different");
    await user.click(screen.getByRole("button", { name: /Submit/i }));
    expect(screen.getByText(/do not match/i)).toBeInTheDocument();

    const counterBefore = screen.getByTestId("meme-counter").textContent;
    await user.click(screen.getByRole("button", { name: /next meme/i }));
    expect(screen.getByTestId("meme-counter").textContent).not.toBe(counterBefore);
  });

  it("renders live Overview KPIs and Preview/Mock Mode indicator", async () => {
    render(<AppDataProvider><OverviewDashboard /></AppDataProvider>);
    await waitFor(() => expect(screen.getByText(/Club Overview & Statistics/i)).toBeInTheDocument());
    expect(screen.getByText(/Latest Recruitment/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest Questions/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/admin-auth-overview.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement `AdminLoginView.tsx`, `AdminShell.tsx`, `OverviewDashboard.tsx`, and `/admin`, `/admin/login`, `/admin/overview` routes**

Wire `AdminLoginView` to `services.auth.login()` with password eye toggles, red validation state, and interactive Sliding Memes carousel driven by `admin-seed.json`. Wire `OverviewDashboard` KPIs (`Unchecked`, `total submitted`, `events in month`, `unread inquiries`, `Latest Recruitment`, `Latest Questions`) live from services.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/admin-auth-overview.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/AdminLoginView.tsx src/components/admin/AdminShell.tsx src/components/admin/OverviewDashboard.tsx src/app/admin/page.tsx src/app/admin/login src/app/admin/overview tests/admin-auth-overview.test.tsx
git commit -m "feat(admin): implement Admin Signin with meme carousel, AdminShell auth guard, and Overview stats"
```

---

### Task 10: Admin Site Content (`/admin/site-content`) — `Website copy` JSON Editor & `Media & Assets` Library

**Files:**
- Create: `src/components/admin/WebsiteCopyTab.tsx`, `src/components/admin/MediaLibraryTab.tsx`
- Create: `src/app/admin/site-content/page.tsx`
- Test: `tests/admin-site-content.test.tsx`

**Interfaces:**
- Consumes: `AdminShell` (Task 9), `useAppData()` (`services.content`, `services.media`), `FileDropzone`, `MediaPickerModal`, `ContentImage`, `Pagination`, `findIdbRefs()` (Task 3)
- Produces: Complete `/admin/site-content` page editing 100% of `.json` text & image slots + full 10 MB file/SVG asset library

- [ ] **Step 1: Fetch Figma design context for `Content & Text Management` (`160:1696`) and `Media & Asset Library` (`160:1790`)**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on both frames to match the `Website copy | Media & Assets` tab bar, left section list with monospace counts (`02`, `03`, `05`), saved confirmation banner, drag-and-drop upload card, `All / Images / SVG` filter tabs, sort dropdown, and asset cards.

- [ ] **Step 2: Write failing tests in `tests/admin-site-content.test.tsx` (pins Review Focus #1 & #3)**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import { WebsiteCopyTab } from "@/components/admin/WebsiteCopyTab";
import { MediaLibraryTab } from "@/components/admin/MediaLibraryTab";

describe("Admin Site Content (Website copy & Media & Assets)", () => {
  it("saves edited Home Hero headline into contentService and shows confirmation", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><WebsiteCopyTab /></AppDataProvider>);
    const headlineInput = await screen.findByLabelText(/Headline/i);
    await user.clear(headlineInput);
    await user.type(headlineInput, "<Build. Ship. Repeat. />");
    await user.click(screen.getByRole("button", { name: /Save Changes/i }));
    await waitFor(() => expect(screen.getByText(/Changes saved successfully/i)).toBeInTheDocument());
  });

  it("uploads sanitized SVG, increments SVG filter count, and blocks deleting an in-use asset (Review Focus #1 & #3)", async () => {
    const user = userEvent.setup();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:svg-test");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    render(<AppDataProvider><MediaLibraryTab /></AppDataProvider>);
    const uploadInput = screen.getByLabelText(/Upload media/i) as HTMLInputElement;
    const dirtySvg = new File(
      [`<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect width="10" height="10"/></svg>`],
      "badge.svg",
      { type: "image/svg+xml" },
    );
    await user.upload(uploadInput, dirtySvg);
    await waitFor(() => expect(screen.getByText("badge.svg")).toBeInTheDocument());
    expect(screen.getByText(/sanitized/i)).toBeInTheDocument();

    // Attempt deleting an in-use featured asset -> inline "In use" error
    const deleteBtns = screen.getAllByRole("button", { name: /^Delete$/i });
    await user.click(deleteBtns[0]);
    await waitFor(() => expect(screen.getByText(/in use/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/admin-site-content.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement `WebsiteCopyTab.tsx`, `MediaLibraryTab.tsx`, and `src/app/admin/site-content/page.tsx`**

Enforce fixed-slot editing for locked CI sections (`Home`, `About Us`, `Why MUICT Dev Club`, `Teams`, `Timeline` header, `Location`, `Footer`) and dynamic add/remove for `FAQ`, `Recruitment` roles, and `Legal` clauses. Include inline `MediaPickerModal` on editable `ImageAsset` slots, `Discard Changes`, `Save Changes`, `Export .json` (checking `findIdbRefs()` to alert about local `idb://` files), and `Reset Defaults`. On `MediaLibraryTab`, extract natural image dimensions (`width × height`), run `sanitizeSvgText()`, and support `All / Images / SVG`, search, sort (`Newest first`, `Oldest first`, `Alphabetical`), `Copy URL`, `Assign to Slot`, and `Delete` with `ASSET_IN_USE` feedback.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/admin-site-content.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/WebsiteCopyTab.tsx src/components/admin/MediaLibraryTab.tsx src/app/admin/site-content tests/admin-site-content.test.tsx
git commit -m "feat(admin): implement Site Content JSON editor and Media & Asset Library with SVG sanitization"
```

---

### Task 11: Admin Events (`/admin/events`) & Inquiries / FAQ Bank (`/admin/inquiries`)

**Files:**
- Create: `src/components/admin/EventsManager.tsx`, `src/components/admin/EventEditorModal.tsx`, `src/app/admin/events/page.tsx`
- Create: `src/components/admin/InquiriesManager.tsx`, `src/components/admin/ReplyEmailModal.tsx`, `src/components/admin/AddFaqModal.tsx`, `src/app/admin/inquiries/page.tsx`
- Test: `tests/admin-events-inquiries.test.tsx`

**Interfaces:**
- Consumes: `AdminShell`, `useAppData()` (`services.events`, `services.inquiries`, `services.content`), `Modal`, `MediaPickerModal`, `FileDropzone`, `Pagination`, `Badge`
- Produces: Complete `/admin/events` and `/admin/inquiries` routes with all 3 dialogs (`Edit Event`, `Reply via Dev Club Email`, `Add / Edit FAQ`)

- [ ] **Step 1: Fetch Figma design context for Events (`160:1869`, `160:2469`) and Inquiries (`160:1994`, `160:2238`, `160:2348`, `160:2710`)**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on these frames to match filter pills, table/card columns, split inbox/detail panel, tag chips, and modal button placement.

- [ ] **Step 2: Write failing tests in `tests/admin-events-inquiries.test.tsx`**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppDataProvider } from "@/context/AppDataContext";
import { EventsManager } from "@/components/admin/EventsManager";
import { InquiriesManager } from "@/components/admin/InquiriesManager";

describe("Admin Events & Inquiries management", () => {
  it("creates a Published showOnHome Event and displays it in the list", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><EventsManager /></AppDataProvider>);
    await user.click(await screen.findByRole("button", { name: /\+ Add Event/i }));

    await user.type(screen.getByLabelText(/Title/i), "ICT Hackathon 2026");
    await user.type(screen.getByLabelText(/Date/i), "15 Dec 2026 · 09:00");
    await user.type(screen.getByLabelText(/Location/i), "ICT Building");
    await user.click(screen.getByLabelText(/Show on Home/i));
    await user.click(screen.getByRole("button", { name: /^Publish$/i }));

    await waitFor(() => expect(screen.getByText("ICT Hackathon 2026")).toBeInTheDocument());
  });

  it("replies to an inquiry, saves to private FAQ Bank, and promotes one-way to Home FAQ", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><InquiriesManager /></AppDataProvider>);

    await user.click(await screen.findByRole("button", { name: /Reply via Dev Club Email/i }));
    await user.type(screen.getByLabelText(/Reply message/i), "Welcome to MUICT Dev Club!");
    await user.click(screen.getByRole("button", { name: /Send Reply/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: /FAQ Bank/i }));
    await user.click(screen.getByRole("button", { name: /\+ Add FAQ/i }));
    await user.type(screen.getByLabelText(/Question/i), "Do I need a Mac?");
    await user.type(screen.getByLabelText(/Answer/i), "No, Windows and Linux work great.");
    await user.click(screen.getByRole("button", { name: /Save to FAQ Bank/i }));
    await waitFor(() => expect(screen.getByText("Do I need a Mac?")).toBeInTheDocument());

    await user.click(screen.getAllByRole("button", { name: /Copy to Home FAQ/i })[0]);
    await waitFor(() => expect(screen.getByText(/Copied to Home FAQ/i)).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/admin-events-inquiries.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement `EventsManager`, `EventEditorModal`, `InquiriesManager`, `ReplyEmailModal`, `AddFaqModal`, and both pages**

Ensure mobile stacked card layout `< 1024px`, Event cover upload registers in `Media & Assets`, `Published FAQs` KPI counts live from `home.json`, `InquiriesManager` auto-selects the first inquiry on load so the split detail panel is immediately active, and `FAQ Bank` displays `"Private · Admins only"` banner with explicit `"Copy to Home FAQ"` button.

- [ ] **Step 5: Run tests and typecheck**

Run: `npx vitest run tests/admin-events-inquiries.test.tsx && npm run typecheck`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/admin/EventsManager.tsx src/components/admin/EventEditorModal.tsx src/components/admin/InquiriesManager.tsx src/components/admin/ReplyEmailModal.tsx src/components/admin/AddFaqModal.tsx src/app/admin/events src/app/admin/inquiries tests/admin-events-inquiries.test.tsx
git commit -m "feat(admin): implement Events & News management and Inquiries / private FAQ Bank tracker"
```

---

### Task 12: Admin Recruitment Checklist (`/admin/recruitment`), CSV Export, View Form + Full Browser Verification

**Files:**
- Create: `src/lib/utils/csvExport.ts`
- Create: `src/components/admin/RecruitmentManager.tsx`, `src/components/admin/ViewApplicationModal.tsx`, `src/app/admin/recruitment/page.tsx`
- Test: `tests/admin-recruitment.test.tsx`

**Interfaces:**
- Consumes: `AdminShell`, `useAppData()` (`services.recruitment`, `services.content`), `Modal`, `Badge`, `Pagination`
- Produces:
  - `buildApplicationsCsv(apps: RecruitmentApplication[]): string` (RFC 4180 quoting + formula injection neutralization for leading `=`, `+`, `-`, `@`)
  - Complete `/admin/recruitment` page with live Open/Closed switch, dynamic Role filter, Status filter, `Export CSV`, and `View Form →` modal with working `View File →` CV preview/download

- [ ] **Step 1: Fetch Figma design context for `Recruitment Checklist` (`160:2094`) and `View Form` (`160:2630`)**

Call `get_design_context` (`skillNames: "figma-design-to-code"`) on `160:2094` and `160:2630` to match KPI tiles, filters, checklist row anatomy, and the 3-section scrollable Application Details modal.

- [ ] **Step 2: Write failing tests in `tests/admin-recruitment.test.tsx` (pins Review Focus #5 CSV safety)**

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { buildApplicationsCsv } from "@/lib/utils/csvExport";
import { AppDataProvider } from "@/context/AppDataContext";
import { RecruitmentManager } from "@/components/admin/RecruitmentManager";
import type { RecruitmentApplication } from "@/lib/types/recruitment";

describe("Admin Recruitment Checklist & CSV export", () => {
  it("escapes quotes/newlines and neutralizes CSV formula injection prefixes (Review Focus #5)", () => {
    const app: RecruitmentApplication = {
      id: "app-1",
      createdAt: "2026-11-14T09:00:00Z",
      status: "Pending",
      personal: {
        firstName: "=CMD()",
        lastName: 'O"Brien, Jr.',
        nickname: "+hack",
        studentId: "6987777",
        email: "a@student.mahidol.ac.th",
        phone: "0891234567",
        program: "DST",
        year: "1",
      },
      team: "projects",
      roleId: "frontend-dev",
      roleLabel: "Front End Developer",
      motivation: { expectation: "line1\nline2", contribution: "c", projectIdea: "p", teamExperience: "t" },
      agreedRequirements: true,
      agreedPdpa: true,
    };
    const csv = buildApplicationsCsv([app]);
    expect(csv).toContain(`"'=CMD()"`);
    expect(csv).toContain(`"O""Brien, Jr."`);
    expect(csv).toContain(`"'+hack"`);
  });

  it("filters applications, toggles Recruitment Open/Closed, opens View Form modal, and updates status", async () => {
    const user = userEvent.setup();
    render(<AppDataProvider><RecruitmentManager /></AppDataProvider>);
    const viewButtons = await screen.findAllByRole("button", { name: /View Form/i });
    await user.click(viewButtons[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^Accepted$/i }));
    await user.click(screen.getByRole("button", { name: /^Done$/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/admin-recruitment.test.tsx`
Expected: FAIL

- [ ] **Step 4: Implement `csvExport.ts`, `RecruitmentManager.tsx`, `ViewApplicationModal.tsx`, and `src/app/admin/recruitment/page.tsx`**

Derive the Position filter options dynamically from `recruitment.json` roles + any `roleLabel` found in submitted applications. Wire `View File →` to `services.recruitment.getCvDownloadUrl(app.id)` to open PDFs in a new tab or trigger `.docx` download cleanly.

- [ ] **Step 5: Run full test suite, typecheck, lint, and production Vercel-compatible build**

Run: `npm run typecheck && npx vitest run && npm run lint && npm run build`
Expected: All tests PASS, 0 type errors, 0 lint errors, production Next.js build succeeds cleanly with zero `fs.writeFile` calls.

- [ ] **Step 6: Live visual & asset verification across Desktop (`1440px` / `1920px`) and Mobile (`390px`)**

Start `npm run dev`, inspect `/`, `/joining-information`, `/privacy-policy`, `/terms-of-use`, `/acknowledgement`, `/admin/login`, `/admin/overview`, `/admin/site-content`, `/admin/events`, `/admin/inquiries`, and `/admin/recruitment` in browser across Desktop and Mobile viewports: confirm visual fidelity against Figma screenshots, confirm every static image/SVG loads with non-zero rendered geometry, test end-to-end User → Admin flows (edit Home text + upload image in Site Content → verify on `/`; submit Recruitment + PDF CV → verify `View Form` & `View File →` in Admin; submit Ask Question → reply & promote FAQ), and verify zero console/hydration errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/utils/csvExport.ts src/components/admin/RecruitmentManager.tsx src/components/admin/ViewApplicationModal.tsx src/app/admin/recruitment tests/admin-recruitment.test.tsx
git commit -m "feat(admin): implement Recruitment Checklist, safe CSV export, View Form CV viewer, and final verification"
```
