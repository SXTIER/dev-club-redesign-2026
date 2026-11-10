# MUICT Dev Club Website (Team A) — Prototype Design Specification

- **Date:** 2026-11-10
- **Project:** MUICT Dev Club Initiation Project 2026 — Team A (Dev Club Website)
- **Reference Site:** `https://www.muictdev.club/`
- **Reference Spec:** `doc/DevClub-Initiation-Booklet-2026 (2).pdf`

---

## 1. Intent and Why

Prospective members, ICT students, and faculty hear about **MUICT Dev Club** in the hallway, from friends, or on social media and look up `muictdev.club`. Currently, the live site is a single-page brochure with outdated club structure information, old branding, broken secondary routes (`/events`, `/projects`, `/contact` return 404), and no working forms (`Recruitment` simply says "Applications are currently closed").

The goal of this project is to build **a complete, interactive Next.js Frontend Prototype** of the new **MUICT Dev Club Website** that:
1. Preserves the signature interactive energy of the current `muictdev.club` homepage (terminal typing hero, "Pause animations" accessibility toggle, Why Us cards, interactive stacked Teams showcase, and legal pages).
2. Upgrades the entire site to the **2026 Corporate Identity (CI)** and updated club Mission, Direction, Slogan (*"Your Career's Trial Run"*), and Core Values (*Bridge, Community, Practice, Continuity*).
3. Completes every **Must** and **Should** page required by **Section 2A** of the Initiation Project Booklet.
4. Stores **100% of text (English) and image paths/metadata in `.json` files (`src/content/*.json`)** so that no copy or image URL is hard-coded inside React components.
5. Provides an interactive **Admin View (`/admin`)** where the committee can review submitted Recruitment applications and Contact questions, and **directly edit all `.json` text and images** in the browser with real-time preview across the site and one-click `.json` file export—all working as a self-contained frontend prototype without requiring a backend database server.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Clone + Upgrade Homepage & Core Interactions:** Recreate the `muictdev.club` homepage structure (Navbar, Typing Hero + sticker banner graphic, Location card, Why Us 3 pillars, interactive Teams deck, FAQ accordion, and dark Footer) restyled with the 2026 CI.
- **Complete All 12 Booklet Pages + Admin View:**
  - **Must Pages:** `Home` (`/`), `About Us` (`/about`), `Recruitment` (`/recruit`), `Club Structure` (`/structure`), `Contact` (`/contact`), `Privacy Policy` (`/privacy-policy`), `Terms of Use` (`/terms`), `Developers` (`/developers`), plus `Admin View` (`/admin`).
  - **Should Pages & Features:** `Events` (`/events`), `Projects` (`/projects` featuring IOSS), `Game Dev` (`/game-dev`), `Acknowledgement` (`/acknowledgement`).
- **100% JSON-Driven Content & Images (English-Only for Prototype):** Every page reads its text (`string`) and images (`{ src, alt }`) from modular `.json` files in `src/content/`.
- **Interactive Frontend Prototype Flows (Zero Backend Dependency):**
  - Visitors can submit the **Recruitment Application Form** (`/recruit`) and **Ask Us a Question Form** (`/contact`) with mandatory PDPA consent checkboxes (`T9`).
  - Submissions persist in browser `localStorage` (seeded from `src/content/mock-submissions.json`) and immediately appear in the **Admin View (`/admin`)**.
  - Admins can edit any page's `.json` text or image paths/uploads inside `/admin`, see changes reflected immediately across all pages via React Context + `localStorage` overlay, **Export `.json`** files to disk to commit into Git, or **Reset** to the repository's default `.json` files.

### Non-Goals (Current Prototype Phase)
- Connecting to a live PostgreSQL database or external backend API (the data layer is isolated behind a clean provider interface so PostgreSQL/API integration can be swapped in later without touching UI components).
- Multi-language / Thai translation switching (English-only for now, matching the current `muictdev.club` site).
- Sending real transactional emails on form submission.
- Production cloud deployment configuration (Booklet `T7`: site only needs to run on `localhost`).

### Anti-Goals (What Would Make This a Failure Even If It Works)
- **Hard-coded strings or image URLs in `.tsx` components:** Any visible heading, paragraph, button label, member entry, event item, or image path hard-coded in JSX violates the user's core requirement and Booklet Section 4.2.
- **Disconnected prototype state:** Submitting a form on `/recruit` or editing homepage text in `/admin` that fails to reflect when navigating back to `/` or `/admin`.
- **Violating the 2026 CI:** Keeping the old `Poppins` font or `#001C26` primary color instead of `Inter Thai Loopless`, `JetBrains Mono`, Bright Blue `#0038E1`, Magenta `#E25BE9`, and Green `#A9E041`.

---

## 3. Constraints & Corporate Identity (CI)

### 3.1 Technical & Maintainability Constraints (Booklet Section 4)
- **Framework (`T1`):** Next.js (App Router) with React and TypeScript.
- **Responsive (`T5`):** Fully responsive across mobile (`375px+`) and desktop (`1280px+`) viewports.
- **Personal Data (`T9`):** Recruitment and Contact forms must include a required PDPA / data-privacy consent checkbox linking to `/privacy-policy` and collect only necessary fields.
- **Maintainability (Section 4.2):**
  - `README.md` with clear setup and run instructions (`< 30 minutes` for a new member to run on `localhost`).
  - `.env.example` file included (e.g., `NEXT_PUBLIC_ADMIN_PASSCODE=devclub2026`), no real secrets committed.
  - Consistent folder structure, ESLint, and Prettier configured.

### 3.2 Corporate Identity (Booklet Section 3.1)
- **Typography:**
  - **Main Font:** `Inter Thai Loopless` (loaded via `@font-face` from `public/fonts/` with fallback to `Inter`, `Inter Variable`, `Noto Sans Thai`, `sans-serif`).
    - *Titles & Headings:* Regular weight (or clean medium display where appropriate), Title Case for English headings.
    - *Body:* Regular, **Bold**, *Italic*.
  - **Code Font:** `JetBrains Mono` (used for terminal typing effect, tags, version badges, and JSON/code snippets).
- **Color Palette:**
  - **Primary:** Bright Blue `#0038E1` (Text on it: White `#FFFFFF`)
  - **Secondary:** Magenta `#E25BE9` (Text on it: White `#FFFFFF`)
  - **Tertiary:** Green `#A9E041` (Text on it: Black `#1C1B1F`)
  - **Neutrals:**
    - White: `#FFFFFF`
    - Black: `#1C1B1F`
    - Dark Gray: `#4A5565`
    - Gray: `#757E91`
    - Light Gray: `#A1A7B4`
  - **Accent Colors (use sparingly):**
    - Blue: Dark `#002BAA` | Base `#2E5DE9` | Light `#A6C0FF`
    - Magenta: Dark `#9E00A7` | Base `#E25BE9` | Light `#F3BFF9`
    - Red: Dark `#B41B00` | Base `#FB4A2A` | Light `#FAAF98`
    - Orange: Dark `#AA5000` | Base `#FAA100` | Light `#FAD288`
    - Yellow: Dark `#B48700` | Base `#F8DD2F` | Light `#FFF194`
    - Green: Dark `#548000` | Base `#A9E041` | Light `#E7FDA7`
    - Turquoise: Dark `#006C6C` | Base `#41E0A8` | Light `#BDFBCC`

---

## 4. Approaches Considered & Selection

During brainstorming, we evaluated three ways to build the Next.js + `.json` Content + Editable `/admin` prototype:

1. **Approach 1 (Selected): Static `src/content/*.json` Files + `localStorage` State Overlay + `.json` Export in `/admin` (100% Client-Side Prototype)**
   - *How it works:* All default English text and image paths live in modular `src/content/*.json` files. A global React `ContentProvider` loads these `.json` files on startup and merges any edits saved in `localStorage`. Editing text/images in `/admin` or submitting Recruitment/Contact forms updates `localStorage` immediately so every route reflects changes in real time. `/admin` includes **"Export `.json`"** (downloads the modified JSON file to replace in `src/content/`) and **"Reset to Default `.json`"**.
   - *Trade-off:* Permanent repo changes require clicking "Export `.json`" and placing the file in `src/content/`, but it requires zero backend/database setup, works both on `localhost` and static preview hosts, and lets the team demo the full end-to-end flow immediately.
2. **Approach 2: Read-Only Static `.json` + In-Memory Preview in `/admin`**
   - *Trade-off:* Simpler state, but changes made in `/admin` or form submissions on `/recruit` disappear when navigating between pages, breaking the end-to-end interactive demo.
3. **Approach 3: Next.js API Routes + PostgreSQL Database / `fs` Write**
   - *Trade-off:* Persists directly to disk/DB, but introduces backend/database setup overhead when the team only needs a frontend prototype right now.

**Decision:** The user selected **Approach 1** (English-only content in `.json` files).

---

## 5. Architecture & Detailed Design (As Decided)

### 5.1 Folder Structure
```text
dev-club/
├── public/
│   ├── fonts/                  # Inter Thai Loopless & JetBrains Mono font files (or README placeholder)
│   └── images/                 # Club logos, hero banner SVG, Why Us icons, event photos, team/member avatars
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── layout.tsx          # Root layout with CI fonts, Navbar, Footer, AppPrototypeContext
│   │   ├── page.tsx            # Home (/) — Cloned & upgraded landing page
│   │   ├── about/page.tsx      # About Us (/about)
│   │   ├── recruit/page.tsx    # Recruitment application form (/recruit)
│   │   ├── structure/page.tsx  # Club Structure: members, positions, teams (/structure)
│   │   ├── contact/page.tsx    # Contact: Social links, FAQ, Ask us a question form (/contact)
│   │   ├── events/page.tsx     # Events: 2026 Roadmap, First Meet gallery, past roadmaps, ICTPC (/events)
│   │   ├── projects/page.tsx   # Projects: IOSS & club software projects (/projects)
│   │   ├── game-dev/page.tsx   # Game Dev: Game Dev team & showcase (/game-dev)
│   │   ├── privacy-policy/page.tsx  # Privacy Policy (/privacy-policy)
│   │   ├── terms/page.tsx           # Terms of Use (/terms)
│   │   ├── acknowledgement/page.tsx # Acknowledgement / Credits (/acknowledgement)
│   │   ├── developers/page.tsx      # Developers who built this site (/developers)
│   │   └── admin/page.tsx           # Admin View: Submissions review + Visual JSON & Image Editor (/admin)
│   ├── content/                # All site text (English) and image paths in JSON format
│   │   ├── site.json           # Global branding, navbar links, footer text, social media URLs, UI labels
│   │   ├── home.json           # Hero typing text, location card, Why Us cards, Teams deck, CTA banners
│   │   ├── about.json          # Who we are, Mission, Direction, Slogan, Core Values (Bridge/Community/Practice/Continuity)
│   │   ├── recruitment.json    # Open/closed flag, role descriptions, form field definitions & labels
│   │   ├── structure.json      # Committee positions, sub-teams, and member directory with photos/roles
│   │   ├── contact.json        # Social channels (IG, TikTok, LinkedIn), FAQ items, question form labels
│   │   ├── events.json         # 2026 Roadmap (noting combined AWYL 0001+0010), First Meet gallery, past years, ICTPC
│   │   ├── projects.json       # IOSS project details, screenshots, tech stack, features
│   │   ├── gamedev.json        # Game Dev division intro, activities, game jam showcase
│   │   ├── legal.json          # Privacy Policy and Terms of Use sections (adapted from current site)
│   │   ├── acknowledgement.json # Credits for past & current contributors and faculty advisors
│   │   ├── developers.json     # Team A members, roles, responsibilities, and profile images/links
│   │   └── mock-submissions.json # Initial sample Recruitment & Contact submissions for the Admin prototype
│   ├── context/
│   │   └── AppPrototypeContext.tsx # Manages Motion state, JSON content overlay, and Submissions in localStorage
│   ├── components/
│   │   ├── layout/             # Navbar (with drawer, Pause Animations toggle), Footer
│   │   ├── home/               # HeroTypingSection, LocationCard, WhyUsSection, TeamsStackSection, HomeFaqPreview
│   │   ├── admin/              # AdminLoginGate, RecruitmentReviewTab, QuestionsInboxTab, JsonContentEditorTab
│   │   └── ui/                 # Reusable EditableImage, Badge, Card, Accordion, ConsentCheckbox
│   └── types/
│       └── content.ts          # TypeScript interfaces for ImageAsset and all JSON schemas
├── .env.example
├── README.md
└── package.json
```

### 5.2 Text & Image JSON Schema Pattern
Every text string across `src/content/*.json` is a plain `string` (English), and every image follows a strict `ImageAsset` interface:
```ts
export interface ImageAsset {
  src: string;       // Path under /images/... or Data URL / external URL set in Admin
  alt: string;       // Accessible English alt text
}
```
- Components render text and image fields directly from the typed JSON object provided by `usePrototypeContent()`.
- Zero text strings or image URLs are hard-coded inside `.tsx` components.

### 5.3 Page-by-Page Functional Specification
1. **Home (`/`):**
   - Clones the flow of `https://www.muictdev.club/` upgraded to 2026 CI:
     - **Hero (`#about`):** Terminal typing animation (`JetBrains Mono` badge + `Inter Thai Loopless` headline), club intro, `Joining information` CTA (`/recruit`), `Pause animations` toggle, and vector IDE/sticker hero graphic (`home.json`).
     - **Quick Entry Strip:** Direct cards/links to `Events`, `Projects (IOSS)`, `Game Dev`, and `Club Structure` (fulfilling Booklet requirement: *"Landing page, entry points to everything below"*).
     - **Location Section:** ICT Mahidol Building card with image and `Open in Map` link.
     - **Why Us (`#why-us`):** 3 core benefit cards (`Academic Growth`, `Expanded Community`, `Enhanced Experience`) + 4 Core Values strip (`Bridge`, `Community`, `Practice`, `Continuity`).
     - **Teams (`#teams`):** Interactive stacked/carousel cards for Dev Club's teams with tools & descriptions.
     - **FAQ Preview (`#faqs`):** Accordion preview with link to full `/contact` page.
2. **About Us (`/about`):**
   - Full story of MUICT Dev Club, **Mission**, **Direction**, **Slogan** (*"Your Career's Trial Run"*), and the 4 **Core Values** table/cards (*Bridge, Community, Practice, Continuity*) from Booklet Section 01.
3. **Recruitment (`/recruit`):**
   - Controlled by `recruitment.json` (`isOpen: boolean`). Includes an interactive toggle in `/admin` (and a preview switch for demoing both states) so the team can show both the *"Applications are currently closed"* state (cloned from the live site) and the **Active Application Form** state.
   - **Active Form Fields (based on Recruitment Google Form):** Full Name, Student ID (`67xxxxx`), ICT/DST Major & Year, Email, Discord/LINE ID, First & Second Team Preferences, Portfolio/GitHub link, "Why do you want to join Dev Club?", and mandatory **PDPA Consent Checkbox (`T9`)**.
   - Submitting appends the application to `localStorage` and shows a confirmation state.
4. **Club Structure (`/structure`):**
   - Displays current club hierarchy, Executive Committee, and Sub-teams (with filter tabs by team) loaded from `structure.json`.
5. **Contact (`/contact`):**
   - Official social media cards linking to Instagram (`@muict_devclub`), TikTok (`@devclub_muict`), and LinkedIn (`ict-mahidol-dev-club`).
   - Full searchable/expandable **FAQ** accordion.
   - Working **"Ask us a question"** form (Name, Email, Topic, Message, mandatory **PDPA Consent Checkbox `T9`**) that saves to `localStorage` and appears in `/admin`.
6. **Events (`/events`):**
   - **2026 Event Roadmap** timeline (including the combined *Apply What You Learn 0001 & 0010* note from Booklet Section 02).
   - **Event Photos: First Meet** gallery section.
   - **ICTPC Highlight Banner** linking to `https://ictpc.muictdev.club/` and past roadmaps archive.
7. **Projects (`/projects`):**
   - Dedicated showcase featuring **IOSS** (the club's meeting log & operations system referenced in Booklet Section 2A) and club project cards.
8. **Game Dev (`/game-dev`):**
   - Showcases the club's **Game Dev** division, game jams (`itch.io`), tools (Unity/Godot/Unreal/Art), and student game projects.
9. **Privacy Policy (`/privacy-policy`) & Terms of Use (`/terms`):**
   - Adapted from the existing `muictdev.club` legal pages, structured cleanly in `legal.json`.
10. **Acknowledgement (`/acknowledgement`) & Developers (`/developers`):**
    - `/acknowledgement`: Credits original site creators (*Poonyawatt Klumnaim*, *Pakawat Sanboonsri*), faculty advisors, and club committee.
    - `/developers`: Dedicated showcase of **Team A members**, their roles (PM, Frontend, UI/UX, QA), and responsibilities on this project (`developers.json`).
11. **Admin View (`/admin`):**
    - Simple passcode login gate (checks against `process.env.NEXT_PUBLIC_ADMIN_PASSCODE || "devclub2026"`, with the demo passcode shown in a helper hint for easy grading).
    - **Tab 1 — Recruitment Submissions:** Table + detail drawer of submitted applications, status filter (`Pending`, `Reviewed`, `Accepted`, `Rejected`), and ability to add committee review notes.
    - **Tab 2 — Q&A Inbox ("Ask us a question"):** List of submitted questions with status toggle (`Unread`, `Resolved`).
    - **Tab 3 — Visual JSON & Image Content Editor:**
      - Dropdown/sidebar to pick any JSON file (`site`, `home`, `about`, `recruitment`, `structure`, `contact`, `events`, `projects`, `gamedev`, `legal`, `acknowledgement`, `developers`).
      - Recursive form editor that renders text inputs for strings, image URL / file-upload-to-DataURL pickers with live image thumbnails for `ImageAsset` (`src` + `alt`), boolean toggles, and array item add/remove buttons (e.g., adding a new member, event, or FAQ item).
      - Also provides a **Raw JSON Editor** tab with syntax validation for power users.
      - Action bar: **Save to Prototype (`localStorage`)**, **Download `.json` File**, and **Reset to Repo Default**.

---

## 6. What Is Left to the Builder

The builder has full autonomy to decide:
- Exact Tailwind CSS v4 utility classes, spacing scales, and responsive breakpoints, provided they strictly adhere to the Section 3.2 color hex codes and font stack.
- Whether to implement the Teams 3D card deck and typing hero using lightweight CSS/Framer Motion or GSAP, as long as the `Pause animations` toggle disables motion cleanly.
- Clean SVG illustrations and placeholder assets in `public/images/` inspired by the live site's assets (`/logo_k.svg`, `/logo_w.svg`, `/head_banner.svg`, `/whyUs/*.svg`), all referenced through `src/content/*.json`.
