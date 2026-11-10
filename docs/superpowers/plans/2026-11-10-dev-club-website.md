# MUICT Dev Club Website (Team A) Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete, interactive Next.js (App Router) frontend prototype of the MUICT Dev Club Website (Team A) that clones and upgrades `https://www.muictdev.club/` to the 2026 Corporate Identity, implements all 12 Booklet pages plus `/admin`, stores 100% of English text and image paths in `src/content/*.json`, and allows live form submissions and visual `.json` content/image editing via `localStorage` without a backend server.

**Architecture:** A Next.js (App Router, TypeScript, Tailwind CSS v4) single-repo frontend application. All static copy and image references (`ImageAsset`) live in 12 modular JSON files under `src/content/*.json` (plus `mock-submissions.json`), hydrated through `AppPrototypeContext` which merges default JSON files with browser `localStorage` overrides (`devclub_content_overrides_v1` and `devclub_submissions_v1`). Every route reads exclusively from this context so edits in `/admin` and submissions from `/recruit` or `/contact` update the entire site in real time and can be exported back as `.json` files.

**Tech Stack:** Next.js 15+ (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React (icons), Vitest + React Testing Library + jsdom (unit/integration testing).

**Spec:** `docs/superpowers/specs/2026-11-10-dev-club-website-design.md`

## Global Constraints

- **100% JSON-Driven Content & Images (English-Only):** Every visible heading, paragraph, button label, badge, member entry, event item, and image (`{ src: string, alt: string }`) must come from `src/content/*.json`. Hard-coding visible copy or image paths inside `.tsx` components is forbidden.
- **2026 Corporate Identity (CI):**
  - Fonts: `Inter Thai Loopless` (main text; fallback `Inter`, `Inter Variable`, `sans-serif`) and `JetBrains Mono` (code/terminal text).
  - Primary Colors: Bright Blue `#0038E1` (text `#FFFFFF`), Secondary Magenta `#E25BE9` (text `#FFFFFF`), Tertiary Green `#A9E041` (text `#1C1B1F`).
  - Neutrals: White `#FFFFFF`, Black `#1C1B1F`, Dark Gray `#4A5565`, Gray `#757E91`, Light Gray `#A1A7B4`.
- **PDPA Personal Data (`T9`):** Both Recruitment (`/recruit`) and Ask Us a Question (`/contact`) forms must enforce a mandatory consent checkbox before allowing submission.
- **Zero Backend Dependency:** Must run cleanly on `localhost` via `npm install && npm run dev` with `.env.example` (`NEXT_PUBLIC_ADMIN_PASSCODE=devclub2026`).

## Review Focus

1. **Corrupted or partial `localStorage` JSON override (`devclub_content_overrides_v1`):** If `localStorage` contains malformed JSON or partial keys, `loadMergedContent()` must safely fall back to the default `src/content/*.json` modules without throwing a runtime exception. (Tested in Task 1)
2. **`Pause animations` (`motionPaused = true`) on Typing Hero:** When animations are paused, the Hero component must immediately render the complete target string without waiting for typing intervals, and keep motion state across navigation. (Tested in Task 2)
3. **Empty filter state & missing image `src` fallback on Content Pages:** Filtering `/structure` by a team with no matching members or rendering an `EditableImage` with an empty `src` string must render a clean fallback placeholder instead of crashing `<img>` / Next rendering. (Tested in Task 3)
4. **Form submission with unchecked PDPA consent (`T9`) or whitespace-only inputs:** Submitting `/recruit` or `/contact` with whitespace-only required strings (`"   "`) or an unchecked consent box must fail validation, show an error message, and never append a submission record. (Tested in Task 4)
5. **Invalid JSON syntax in Admin Raw JSON Editor & single-module reset:** Attempting to save malformed JSON in `/admin` must display a validation error without overwriting `localStorage`, and resetting one module (e.g., `home`) must restore `home.json` defaults while preserving overrides in other modules. (Tested in Task 5)

---

### Task 1: Project Scaffolding, 2026 CI Theme, JSON Content Modules, & State Layer

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.env.example`
- Create: `src/app/globals.css`
- Create: `src/types/content.ts`
- Create: `src/content/site.json`, `src/content/home.json`, `src/content/about.json`, `src/content/recruitment.json`, `src/content/structure.json`, `src/content/contact.json`, `src/content/events.json`, `src/content/projects.json`, `src/content/gamedev.json`, `src/content/legal.json`, `src/content/acknowledgement.json`, `src/content/developers.json`, `src/content/mock-submissions.json`
- Create: `src/lib/storage.ts`
- Create: `src/context/AppPrototypeContext.tsx`
- Test: `src/lib/__tests__/storage.test.ts`

**Interfaces:**
- Consumes: none (foundational task)
- Produces:
  - `src/types/content.ts`:
    - `ImageAsset = { src: string; alt: string }`
    - `ContentModuleKey = "site" | "home" | "about" | "recruitment" | "structure" | "contact" | "events" | "projects" | "gamedev" | "legal" | "acknowledgement" | "developers"`
    - `AllSiteContent` (typed map of all 12 JSON modules)
    - `RecruitmentSubmission = { id: string; createdAt: string; fullName: string; studentId: string; majorYear: string; email: string; contactHandle: string; primaryTeam: string; secondaryTeam: string; portfolioUrl: string; motivation: string; consent: boolean; status: "Pending" | "Reviewed" | "Accepted" | "Rejected"; notes?: string }`
    - `QuestionSubmission = { id: string; createdAt: string; name: string; email: string; topic: string; message: string; consent: boolean; status: "Unread" | "Resolved" }`
  - `src/lib/storage.ts`:
    - `getDefaultContent(): AllSiteContent`
    - `loadMergedContent(storage?: Storage): AllSiteContent`
    - `saveModuleContent<K extends ContentModuleKey>(key: K, data: AllSiteContent[K], storage?: Storage): AllSiteContent`
    - `resetModuleContent(key?: ContentModuleKey, storage?: Storage): AllSiteContent`
    - `loadSubmissions(storage?: Storage): { applications: RecruitmentSubmission[]; questions: QuestionSubmission[] }`
    - `exportModuleJsonString(key: ContentModuleKey, content: AllSiteContent): string`
  - `src/context/AppPrototypeContext.tsx`:
    - `AppPrototypeProvider({ children }: { children: React.ReactNode })`
    - `usePrototype(): { content: AllSiteContent; motionPaused: boolean; toggleMotion: () => void; updateModule: <K extends ContentModuleKey>(key: K, data: AllSiteContent[K]) => void; resetModule: (key?: ContentModuleKey) => void; applications: RecruitmentSubmission[]; addApplication: (input: Omit<RecruitmentSubmission, "id" | "createdAt" | "status">) => RecruitmentSubmission; updateApplicationStatus: (id: string, status: RecruitmentSubmission["status"], notes?: string) => void; questions: QuestionSubmission[]; addQuestion: (input: Omit<QuestionSubmission, "id" | "createdAt" | "status">) => QuestionSubmission; toggleQuestionStatus: (id: string) => void }`

- [ ] **Step 1: Initialize Next.js + TypeScript + Tailwind CSS v4 + Vitest project files**
  Create `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `vitest.config.ts` (with `@` alias -> `./src` and `jsdom` environment), `.env.example` (`NEXT_PUBLIC_ADMIN_PASSCODE=devclub2026`), and `src/app/globals.css` defining CSS variables for `#0038E1` (`--color-primary`), `#E25BE9` (`--color-secondary`), `#A9E041` (`--color-tertiary`), `#1C1B1F` (`--color-ink`), `#4A5565`, `#757E91`, `#A1A7B4`, `#FFFFFF`, plus font families `Inter Thai Loopless` and `JetBrains Mono`. Run `npm install` to install dependencies.

- [ ] **Step 2: Write the failing unit tests for `src/lib/storage.ts` (including Review Focus #1)**

```ts
// src/lib/__tests__/storage.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  getDefaultContent,
  loadMergedContent,
  saveModuleContent,
  resetModuleContent,
  loadSubmissions,
  STORAGE_KEYS,
} from "../storage";

describe("storage content & submissions layer", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("loads all 12 default JSON modules with English text and ImageAsset objects", () => {
    const defaults = getDefaultContent();
    expect(defaults.site.brandName).toBe("MUICT Dev Club");
    expect(defaults.about.slogan).toBe("Your Career's Trial Run");
    expect(defaults.home.hero.bannerImage.src).toMatch(/^\/images\//);
  });

  it("falls back safely to default content when localStorage contains corrupted JSON (Review Focus #1)", () => {
    window.localStorage.setItem(STORAGE_KEYS.CONTENT, "{not-valid-json");
    const merged = loadMergedContent(window.localStorage);
    expect(merged.home.hero.typingText).toContain("where passion meets creation");
  });

  it("saves a single module override and resets only the targeted module (Review Focus #5)", () => {
    const defaults = getDefaultContent();
    saveModuleContent("about", { ...defaults.about, slogan: "Edited Slogan" }, window.localStorage);
    saveModuleContent("site", { ...defaults.site, brandName: "Edited Brand" }, window.localStorage);

    expect(loadMergedContent(window.localStorage).about.slogan).toBe("Edited Slogan");
    const afterSingleReset = resetModuleContent("about", window.localStorage);
    expect(afterSingleReset.about.slogan).toBe("Your Career's Trial Run");
    expect(afterSingleReset.site.brandName).toBe("Edited Brand");
  });

  it("seeds initial mock submissions when localStorage is empty", () => {
    const subs = loadSubmissions(window.localStorage);
    expect(subs.applications.length).toBeGreaterThan(0);
    expect(subs.questions.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run Vitest to verify the test fails**
  Run: `npx vitest run src/lib/__tests__/storage.test.ts`
  Expected: FAIL with module `../storage` not found.

- [ ] **Step 4: Create `src/types/content.ts`, all 13 JSON files in `src/content/*.json`, `src/lib/storage.ts`, and `src/context/AppPrototypeContext.tsx`**
  Populate all 12 content JSON files (`site.json`, `home.json`, `about.json`, `recruitment.json`, `structure.json`, `contact.json`, `events.json`, `projects.json`, `gamedev.json`, `legal.json`, `acknowledgement.json`, `developers.json`) and `mock-submissions.json` using the authentic copy from `https://www.muictdev.club/` and Booklet Sections 01–04 (including the combined Apply What You Learn 0001 + 0010 note in `events.json`, Core Values `Bridge`, `Community`, `Practice`, `Continuity` in `about.json`, and full Privacy/Terms text in `legal.json`). Implement `src/lib/storage.ts` and `src/context/AppPrototypeContext.tsx`.

- [ ] **Step 5: Run Vitest to verify `storage.test.ts` passes**
  Run: `npx vitest run src/lib/__tests__/storage.test.ts`
  Expected: PASS (4 passed).

---

### Task 2: Global Layout, SVG Brand Assets, & Cloned/Upgraded Homepage (`/`)

**Files:**
- Create: `public/images/logo_k.svg`, `public/images/logo_w.svg`, `public/images/head_banner.svg`, `public/images/ict_building.svg`, `public/images/why_ag.svg`, `public/images/why_ec.svg`, `public/images/why_ee.svg`, `public/images/event_first_meet.svg`, `public/images/project_ioss.svg`, `public/images/gamedev_banner.svg`, `public/images/avatar_placeholder.svg`
- Create: `src/components/ui/EditableImage.tsx`
- Create: `src/components/layout/Navbar.tsx`
- Create: `src/components/layout/Footer.tsx`
- Create: `src/components/home/HeroTypingSection.tsx`
- Create: `src/components/home/WhyUsSection.tsx`
- Create: `src/components/home/TeamsStackSection.tsx`
- Create: `src/components/home/HomeFaqPreview.tsx`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`
- Test: `src/components/home/__tests__/Homepage.test.tsx`

**Interfaces:**
- Consumes: `usePrototype()` from `src/context/AppPrototypeContext.tsx`, `ImageAsset` from `src/types/content.ts`
- Produces:
  - `EditableImage({ image, className }: { image: ImageAsset; className?: string })` (renders fallback SVG placeholder if `image.src` is empty or missing)
  - `Navbar()`, `Footer()`, and `HomePage()` (`/`)

- [ ] **Step 1: Write the failing test for Homepage rendering & `Pause animations` toggle (Review Focus #2)**

```tsx
// src/components/home/__tests__/Homepage.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppPrototypeProvider } from "@/context/AppPrototypeContext";
import Navbar from "@/components/layout/Navbar";
import HomePage from "@/app/page";

describe("Homepage & Motion Accessibility", () => {
  it("renders JSON-driven Hero, Why Us pillars, Teams deck, and immediately shows full typing text when animations are paused (Review Focus #2)", () => {
    render(
      <AppPrototypeProvider>
        <Navbar />
        <HomePage />
      </AppPrototypeProvider>
    );

    const pauseBtn = screen.getByRole("button", { name: /pause animations/i });
    fireEvent.click(pauseBtn);

    expect(
      screen.getByText(/MUICT Dev Club: where passion meets creation\./i)
    ).toBeDefined();
    expect(screen.getByText(/ACADEMIC GROWTH/i)).toBeDefined();
    expect(screen.getByText(/FRONTEND WEB/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run Vitest to verify `Homepage.test.tsx` fails**
  Run: `npx vitest run src/components/home/__tests__/Homepage.test.tsx`
  Expected: FAIL with missing component modules.

- [ ] **Step 3: Create SVG assets in `public/images/`, `EditableImage`, `Navbar`, `Footer`, Homepage sections, and `src/app/page.tsx`**
  Create clean vector SVG graphics in `public/images/` matching all `ImageAsset.src` paths in `src/content/*.json`. Implement `EditableImage`, `Navbar` (with Dev Club smiling-D gradient logo, navigation links, drawer toggle, `Pause animations` button, and `Joining information` CTA + Admin shortcut badge), `Footer` (solid `#1C1B1F` dark footer with white logo, Salaya address, links to Privacy Policy, Terms of Use, Acknowledgement, Developers, Admin), and all Homepage sections (`HeroTypingSection`, Quick Entry Strip to all Booklet pages, `LocationCard`, `WhyUsSection`, `TeamsStackSection` interactive card switcher/deck, and `HomeFaqPreview`).

- [ ] **Step 4: Run Vitest to verify `Homepage.test.tsx` passes**
  Run: `npx vitest run src/components/home/__tests__/Homepage.test.tsx`
  Expected: PASS.

---

### Task 3: Identity, Showcase, & Legal Pages (`/about`, `/structure`, `/events`, `/projects`, `/game-dev`, `/privacy-policy`, `/terms`, `/acknowledgement`, `/developers`)

**Files:**
- Create: `src/app/about/page.tsx`
- Create: `src/app/structure/page.tsx`
- Create: `src/app/events/page.tsx`
- Create: `src/app/projects/page.tsx`
- Create: `src/app/game-dev/page.tsx`
- Create: `src/app/privacy-policy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Create: `src/app/acknowledgement/page.tsx`
- Create: `src/app/developers/page.tsx`
- Test: `src/app/__tests__/ShowcasePages.test.tsx`

**Interfaces:**
- Consumes: `usePrototype()` from `src/context/AppPrototypeContext.tsx`, `EditableImage` from `src/components/ui/EditableImage.tsx`
- Produces: Next.js route pages for `/about`, `/structure`, `/events`, `/projects`, `/game-dev`, `/privacy-policy`, `/terms`, `/acknowledgement`, and `/developers`.

- [ ] **Step 1: Write the failing test for `/about`, `/structure` team filtering, `/events` roadmap note, and `EditableImage` empty `src` fallback (Review Focus #3)**

```tsx
// src/app/__tests__/ShowcasePages.test.tsx
import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppPrototypeProvider } from "@/context/AppPrototypeContext";
import AboutPage from "@/app/about/page";
import StructurePage from "@/app/structure/page";
import EventsPage from "@/app/events/page";
import EditableImage from "@/components/ui/EditableImage";

describe("Showcase & Content Pages", () => {
  it("renders About Us with slogan 'Your Career's Trial Run' and all 4 Core Values from JSON", () => {
    render(
      <AppPrototypeProvider>
        <AboutPage />
      </AppPrototypeProvider>
    );
    expect(screen.getByText(/Your Career's Trial Run/i)).toBeDefined();
    expect(screen.getByText("Bridge")).toBeDefined();
    expect(screen.getByText("Continuity")).toBeDefined();
  });

  it("filters Club Structure members by team and renders events roadmap with combined AWYL note", () => {
    render(
      <AppPrototypeProvider>
        <StructurePage />
        <EventsPage />
      </AppPrototypeProvider>
    );
    const filterButtons = screen.getAllByRole("button");
    expect(filterButtons.length).toBeGreaterThan(1);
    expect(screen.getByText(/Apply What You Learn 0010/i)).toBeDefined();
  });

  it("renders a safe fallback placeholder when EditableImage receives an empty src (Review Focus #3)", () => {
    render(<EditableImage image={{ src: "", alt: "Missing photo" }} />);
    expect(screen.getByLabelText("Missing photo")).toBeDefined();
  });
});
```

- [ ] **Step 2: Run Vitest to verify `ShowcasePages.test.tsx` fails**
  Run: `npx vitest run src/app/__tests__/ShowcasePages.test.tsx`
  Expected: FAIL with missing page files.

- [ ] **Step 3: Implement the 9 JSON-driven pages (`/about`, `/structure`, `/events`, `/projects`, `/game-dev`, `/privacy-policy`, `/terms`, `/acknowledgement`, `/developers`)**
  Build each page reading 100% of headings, descriptions, badges, member cards, roadmap milestones, IOSS details, Game Dev cards, legal sections, credits, and developer responsibilities from `usePrototype().content`.

- [ ] **Step 4: Run Vitest to verify `ShowcasePages.test.tsx` passes**
  Run: `npx vitest run src/app/__tests__/ShowcasePages.test.tsx`
  Expected: PASS.

---

### Task 4: Interactive Forms (`/recruit` & `/contact`) with PDPA Consent & Live Persistence

**Files:**
- Create: `src/app/recruit/page.tsx`
- Create: `src/app/contact/page.tsx`
- Test: `src/app/__tests__/Forms.test.tsx`

**Interfaces:**
- Consumes: `usePrototype()` (`content.recruitment`, `content.contact`, `addApplication`, `addQuestion`, `updateModule`)
- Produces: `/recruit` (with open/closed state switch + validated application form) and `/contact` (Instagram/TikTok/LinkedIn cards, FAQ accordion, and validated "Ask us a question" form).

- [ ] **Step 1: Write the failing test for `/recruit` and `/contact` form validation & PDPA consent (`T9`, Review Focus #4)**

```tsx
// src/app/__tests__/Forms.test.tsx
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppPrototypeProvider } from "@/context/AppPrototypeContext";
import RecruitPage from "@/app/recruit/page";
import ContactPage from "@/app/contact/page";

describe("Recruitment & Contact Forms (PDPA T9 & Persistence)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("blocks Contact form submission when PDPA consent is unchecked or fields are whitespace-only, and persists valid submissions (Review Focus #4)", () => {
    render(
      <AppPrototypeProvider>
        <ContactPage />
      </AppPrototypeProvider>
    );

    const submitBtn = screen.getByRole("button", { name: /send question/i });
    fireEvent.click(submitBtn);
    expect(screen.getByRole("alert")).toBeDefined();

    fireEvent.change(screen.getByLabelText(/your name/i), { target: { value: "Napat Student" } });
    fireEvent.change(screen.getByLabelText(/email address/i), { target: { value: "napat@student.mahidol.edu" } });
    fireEvent.change(screen.getByLabelText(/topic/i), { target: { value: "Joining Dev Club" } });
    fireEvent.change(screen.getByLabelText(/question or message/i), { target: { value: "Can 1st year students join?" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(submitBtn);

    expect(screen.getByText(/thank you/i)).toBeDefined();
  });

  it("allows toggling between Closed state and Open Recruitment Form and submitting an application", () => {
    render(
      <AppPrototypeProvider>
        <RecruitPage />
      </AppPrototypeProvider>
    );

    expect(screen.getByText(/Student ID/i)).toBeDefined();
  });
});
```

- [ ] **Step 2: Run Vitest to verify `Forms.test.tsx` fails**
  Run: `npx vitest run src/app/__tests__/Forms.test.tsx`
  Expected: FAIL with missing `/recruit` and `/contact` pages.

- [ ] **Step 3: Implement `src/app/recruit/page.tsx` and `src/app/contact/page.tsx`**
  - In `src/app/recruit/page.tsx`: Render a top prototype control bar allowing instant toggle between the **Open Application Form** and the cloned **"Applications are currently closed"** card (`recruitment.isOpen`). Validate all required inputs with `.trim()` and mandatory PDPA consent checkbox linking to `/privacy-policy` before calling `addApplication()`.
  - In `src/app/contact/page.tsx`: Render social cards (`Instagram`, `TikTok`, `LinkedIn`) from `contact.json`, interactive FAQ accordion, and the "Ask us a question" form with `.trim()` validation and mandatory PDPA consent checkbox before calling `addQuestion()`.

- [ ] **Step 4: Run Vitest to verify `Forms.test.tsx` passes**
  Run: `npx vitest run src/app/__tests__/Forms.test.tsx`
  Expected: PASS.

---

### Task 5: Interactive Admin View (`/admin`) — Submissions Review, Visual JSON + Image Editor, & Documentation

**Files:**
- Create: `src/components/admin/JsonValueEditor.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `README.md`
- Test: `src/app/__tests__/AdminPage.test.tsx`

**Interfaces:**
- Consumes: `usePrototype()` (`content`, `updateModule`, `resetModule`, `applications`, `updateApplicationStatus`, `questions`, `toggleQuestionStatus`), `exportModuleJsonString` from `src/lib/storage.ts`
- Produces:
  - `JsonValueEditor({ value, onChange, path }: { value: unknown; onChange: (next: unknown) => void; path: string })` (recursive visual editor supporting `string` inputs/textareas, `boolean` switches, `ImageAsset` `{ src, alt }` with image preview + file-upload-to-DataURL picker, arrays with Add/Remove item buttons, and nested objects)
  - `AdminPage()` (`/admin`) with passcode login gate, Tab 1 (Recruitment Submissions review), Tab 2 (Q&A Inbox review), and Tab 3 (Visual + Raw JSON Content & Image Editor with Save to `localStorage`, Download `.json`, and Reset Module/All).

- [ ] **Step 1: Write the failing test for `/admin` login, submission review, visual JSON editing, and invalid Raw JSON rejection (Review Focus #5)**

```tsx
// src/app/__tests__/AdminPage.test.tsx
import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AppPrototypeProvider } from "@/context/AppPrototypeContext";
import AdminPage from "@/app/admin/page";

describe("Admin View Prototype (/admin)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("authenticates with passcode, reviews submissions, edits JSON content live, and rejects malformed Raw JSON (Review Focus #5)", () => {
    render(
      <AppPrototypeProvider>
        <AdminPage />
      </AppPrototypeProvider>
    );

    fireEvent.change(screen.getByPlaceholderText(/enter admin passcode/i), {
      target: { value: "devclub2026" },
    });
    fireEvent.click(screen.getByRole("button", { name: /unlock admin/i }));

    // Tab 1: Recruitment Submissions visible
    expect(screen.getByText(/Recruitment Submissions/i)).toBeDefined();

    // Switch to Site Content Editor (JSON)
    fireEvent.click(screen.getByRole("button", { name: /Site Content Editor/i }));
    fireEvent.click(screen.getByRole("button", { name: /Raw JSON/i }));

    const rawTextarea = screen.getByLabelText(/Raw JSON Editor/i);
    fireEvent.change(rawTextarea, { target: { value: "{broken json" } });
    fireEvent.click(screen.getByRole("button", { name: /Apply Raw JSON/i }));

    expect(screen.getByRole("alert").textContent).toMatch(/Invalid JSON/i);
  });
});
```

- [ ] **Step 2: Run Vitest to verify `AdminPage.test.tsx` fails**
  Run: `npx vitest run src/app/__tests__/AdminPage.test.tsx`
  Expected: FAIL with missing `/admin/page.tsx`.

- [ ] **Step 3: Implement `src/components/admin/JsonValueEditor.tsx`, `src/app/admin/page.tsx`, and `README.md`**
  - Implement `JsonValueEditor.tsx` so any field in `src/content/*.json` can be edited visually (strings, booleans, arrays, objects, and `ImageAsset` objects with both URL input and `<input type="file" accept="image/*" />` FileReader DataURL upload + live image preview).
  - Implement `src/app/admin/page.tsx` with the passcode gate (`devclub2026`), Recruitment review tab, Questions inbox tab, and JSON Content Editor tab (Visual mode + Raw JSON mode, Save to `localStorage`, Download `<module>.json` file, Reset module, and Reset all).
  - Write `README.md` with `< 30 minutes` quickstart instructions, architecture overview, guide on editing `src/content/*.json` vs using `/admin`, and Team A workflow notes.

- [ ] **Step 4: Run the full test suite and production build to verify zero errors**
  Run: `npx vitest run && npm run build`
  Expected: All test suites PASS and `next build` succeeds with 0 TypeScript or build errors.

---

## Appendix: Team A Workflow & Timeline Plan (Booklet Sections 06–08)

| Week / Milestone | Dates | Focus for Team A (Dev Club Website) | Booklet Deliverable |
|---|---|---|---|
| **Week 1 (Kickoff)** | Nov 4 – Nov 9 | Agree on Next.js stack, lock 2026 CI tokens, prepare client questions | **Kickoff Report (Mon Nov 9):** Timeline, Tech stack, Team roles, Client questions |
| **Week 2 (Prototype & Core Pages)** | Nov 10 – Nov 16 | Deliver this Next.js + `.json` Frontend Prototype (all 12 pages + `/admin` editor) and demo to client for content confirmation | **Weekly Report #2 (Mon Nov 16)** + IOSS SCRUM log |
| **Week 3 (Backend/DB Connection & Content Polish)** | Nov 17 – Nov 23 | Swap `localStorage` submission handlers with PostgreSQL (Prisma) if moving from prototype to full DB, finalize confirmed client copy in `src/content/*.json` | **Weekly Report #3 (Mon Nov 23)** + IOSS SCRUM log |
| **Week 4 (QA, README Verification & Freeze)** | Nov 24 – Nov 30 | Cross-device responsive QA, fresh-clone `< 30 min` README test, finalize `/developers` page and all IOSS logs | **Final Submission (Mon Nov 30, 23:59)** — Code Freeze |
| **Final Presentation** | Wed Jan 6, 2027 | 15-minute English presentation: Tech stack, Responsibilities, Biggest problem, Live demo, Feedback, Reflections | Slides + Live Demo on `localhost` |
