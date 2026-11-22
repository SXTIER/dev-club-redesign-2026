# MUICT Dev Club 2026 — Official Website & Admin Portal

ระบบเว็บไซต์หลัก (`For User`) และระบบจัดการหลังบ้าน (`For Admin`) ของชมรม **MUICT Dev Club** พัฒนาด้วย **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4** อ้างอิงดีไซน์และ CI ปี 2026 จาก Figma (`Dev-Club`)

---

## 1. สรุปความคืบหน้าโครงการ (Task Status Report สำหรับ PM)

สถานะปัจจุบัน: **Frontend พร้อม Python FastAPI backend (`backend/`); เชื่อมต่อผ่าน HTTP adapter ได้**

### 1.1 Tech Stack & Infrastructure
- **Framework:** Next.js `16.4.6` (App Router + Turbopack)
- **Language & Validation:** TypeScript `5.7` + Zod Schema Validation (`src/lib/types/`)
- **Styling & Typography:** Tailwind CSS v4, ฟอนต์ `Inter` + `Noto Sans Thai` (Self-hosted ผ่าน `@fontsource`), สีอัตลักษณ์ 2026 CI (`#0038E1`, `#E25BE9`, `#A9E041`, `#1C1B1F`, `#F8FAFC`)
- **Automated Testing:** Vitest + React Testing Library (**ผ่านครบ 12 ไฟล์ / 77 Unit & Integration Tests**)
- **Hosting Readiness:** รองรับการ Deploy บน **Vercel** ทันที (ไม่มีการเขียนไฟล์ลงดิสก์ตอนรันไทม์ `fs.writeFile`)

---

### 1.2 งานฝั่งหน้าบ้าน (Public Website — `For User`) ที่ทำเสร็จแล้ว
| หน้า / ฟีเจอร์ | Route | รายละเอียดสิ่งที่ทำเสร็จแล้ว |
| :--- | :--- | :--- |
| **Home Page** | `/` | • **01 / Hero:** พื้นหลังลายตาราง CI, สโลแกน `<Learn. Hack. Deliver. />`, ปุ่ม CTA<br>• **02 / About Us:** ข้อมูลแนะนำชมรม<br>• **03 / Why MUICT Dev Club:** การ์ด 3 เสาหลักตามสี CI (`#0038E1`, `#E25BE9`, `#A9E041`)<br>• **04 / Teams:** แนะนำ 5 ทีมของชมรมพร้อม Tools ที่ใช้<br>• **05 / Event Roadmap:** แสดงลำดับเลข (`01`..`05`) และวันที่ กดดูรายละเอียดใน `EventDetailModal` ได้ (กรองเฉพาะสถานะ `Published` + `showOnHome`)<br>• **06 / Location:** แผนที่ตั้งห้องชมรม คณะ ICT ม.มหิดล ศาลายา พร้อมลิงก์ Google Maps<br>• **07 / FAQ & Ask Question Modal:** Accordion คำถามที่พบบ่อย + ฟอร์มส่งคำถามถึงชมรมพร้อม PDPA Consent |
| **Joining Information (Recruitment)** | `/joining-information` | • รองรับ **2 สถานะอัตโนมัติ** ตามการเปิด-ปิดของ Admin:<br>  1. **Closed State:** หน้าแจ้งปิดรับสมัครแบบ Frameless พร้อมปุ่มกลับหน้าแรก<br>  2. **Opened State:** ฟอร์มสมัครสมาชิก 3 ส่วน (ข้อมูลนักศึกษา 7 หลัก `6xxxxxx`, เลือกทีม Projects / Marketing + Role อื่นๆ, กรอกเหตุผล/ประสบการณ์/Portfolio และอัปโหลด CV `.pdf`/`.docx` ไม่เกิน 10 MB) |
| **Legal Pages (2 ภาษา EN / TH)** | `/privacy-policy`<br>`/terms-of-use`<br>`/acknowledgement` | • รองรับสลับภาษา **`EN / TH`** แบบทันที<br>• หน้า Acknowledgement แสดงรายชื่อและบทบาททีมผู้พัฒนาเว็บไซต์ |
| **Responsive & Navigation** | ทุกหน้า | • Navbar (Desktop + Mobile Drawer) และ Footer กดโลโก้กลับหน้าแรกได้ทุกจุด |

---

### 1.3 งานฝั่งหลังบ้าน (Admin Portal — `For Admin`) ที่ทำเสร็จแล้ว
| หน้า / โมดูล | Route | รายละเอียดสิ่งที่ทำเสร็จแล้ว |
| :--- | :--- | :--- |
| **Admin Sign In** | `/admin/login` | • หน้าล็อกอินดีไซน์ Doge Mascot + Meme Carousel, ตรวจสอบรหัสผ่านตรงกัน, ปุ่มเปิด/ปิดดูรหัสผ่าน และระบบ Session Guard (`AdminShell`) |
| **Overview Dashboard** | `/admin/overview` | • สรุป KPI แบบเรียลไทม์ (จำนวนผู้สมัคร, คำถามรอตอบ, กิจกรรมที่เผยแพร่, ไฟล์ในระบบ) พร้อมตารางผู้สมัครล่าสุดและคำถามล่าสุด |
| **Site Content & Media Library** | `/admin/site-content` | • **แท็บ Website Copy:** แก้ไขข้อความทุกส่วนของเว็บ (10 หมวด) จาก JSON ได้ 100%, มีระบบ **Full-Screen Mobile Text Editor Modal** สำหรับแก้ข้อความบนมือถือ, ปุ่ม `Export .json`, `Discard Changes` และ `Reset Defaults`<br>• **แท็บ Media & Assets:** อัปโหลดรูปภาพและ `.svg` (ไม่เกิน 10 MB), ค้นหา/กรองไฟล์, ผูกรูปเข้ากับจุดแสดงผลบนเว็บ (`Assign to Slot`) และป้องกันการลบไฟล์ที่กำลังใช้งานอยู่ (`409 ASSET_IN_USE`) |
| **Events & Roadmap Manager** | `/admin/events` | • เพิ่ม/แก้ไข/ลบ กิจกรรมและข่าวสาร, อัปโหลดภาพปก, เลือกสถานะ `Published` / `Draft`, เลือกแสดงบนหน้าแรก (`showOnHome`) และจัดลำดับ (`order`) |
| **Inquiries & FAQ Bank** | `/admin/inquiries` | • ดูรายการคำถามจากผู้ใช้, กรองตามสถานะ (`Pending` / `Answered`), ตอบกลับทางอีเมล (`ReplyEmailModal`), ติดแท็ก, บันทึกเข้า **FAQ Bank (คลังคำถามส่วนตัวของกรรมการ)** และปุ่ม **Promote to Home FAQ** เพื่อนำขึ้นหน้าเว็บหลัก |
| **Recruitment Checklist** | `/admin/recruitment` | • สวิตช์เปิด-ปิดรับสมัคร (`Open / Closed`), KPI แยกตามสถานะ (`New`, `Interview`, `Accepted`, `Rejected`), กรองตามทีม/ตำแหน่ง/ค้นหาชื่อ-รหัสนักศึกษา, เปิดดูใบสมัคร (`ViewApplicationModal`), เปิดดูไฟล์ PDF CV ในแท็บใหม่หรือดาวน์โหลด DOCX, และปุ่ม **Export CSV** |

---

### 1.4 ความปลอดภัยของข้อมูล (Security & Data Hygiene)
- **SVG Sanitization (`src/lib/security/svgSanitizer.ts`):** ล้าง `<script>`, `<foreignObject>`, `<iframe>`, `on*` event handlers และ `javascript:` URIs ก่อนบันทึกหรือแสดงผล
- **File Upload Validation (`src/lib/security/fileValidation.ts`):** ตรวจทั้งนามสกุลไฟล์, MIME Type และขนาดไฟล์ (`<= 10 MB`) สำหรับรูปภาพและไฟล์ CV (`.pdf`, `.docx`)
- **CSV Formula Injection Protection (`src/lib/utils/csvExport.ts`):** ป้องกัน Excel Formula Injection (`=`, `+`, `-`, `@`, `\t`, `\r`) ตามมาตรฐาน RFC 4180
- **Safe URL Guard:** ตรวจสอบลิงก์ Portfolio และ URL ดาวน์โหลดไฟล์ CV (`isSafeDownloadUrl`) ป้องกัน XSS / Unsafe Schemes

---

## 2. สิ่งที่เตรียมไว้ให้ทีม Backend เรียบร้อยแล้ว (Backend Handoff)

ทีม Frontend ได้ออกแบบสถาปัตยกรรมแบบ **Adapter Pattern** แยกชั้นข้อมูลไว้ให้เรียบร้อย ทำให้ทีม Backend (Python FastAPI / Django / Flask) **ไม่ต้องแก้โค้ดฝั่ง UI แม้แต่บรรทัดเดียว** เมื่อสร้าง API ตามสัญญาเสร็จ

### 2.1 เอกสารและไฟล์สำคัญสำหรับทีม Backend
1. **[`docs/api-contract.md`](docs/api-contract.md)** — **เอกสาร API Specification ฉบับสมบูรณ์** ระบุทุก Endpoint, HTTP Method, Request/Response JSON Payload, Status Code และตัวอย่างโค้ด FastAPI + Pydantic v2
2. **[`src/lib/services/contracts.ts`](src/lib/services/contracts.ts)** — TypeScript Interfaces ของทั้ง 6 Services (`auth`, `content`, `media`, `events`, `inquiries`, `recruitment`) และโครงสร้าง `ApiError`
3. **[`src/lib/services/httpAdapter.ts`](src/lib/services/httpAdapter.ts)** — ตัวเชื่อมต่อ HTTP REST + `multipart/form-data` ที่เขียนรอไว้เสร็จแล้ว 100% (รวมระบบแปลง Error ของ FastAPI `422 detail` และการตัด trailing slash ป้องกัน `307 Redirect`)
4. **[`src/lib/types/*.ts`](src/lib/types/)** — Zod Schemas ทั้งหมด (`content.ts`, `media.ts`, `events.ts`, `inquiries.ts`, `recruitment.ts`) ที่ทีม Backend สามารถนำไปเทียบสร้าง Pydantic Models / Database Tables ได้แบบ 1:1
5. **[`src/content/*.json`](src/content/)** — ข้อมูลเริ่มต้น (Seed Data) ทั้ง 6 ไฟล์ (`site.json`, `home.json`, `events.json`, `recruitment.json`, `legal.json`, `media.json`) สำหรับทำ Database Seeding

---

### 2.2 สรุป 23 REST API Endpoints ที่เตรียมไว้ใน `HttpAdapter`

| หมวด (Service) | Method & Path | สิทธิ์ | หน้าที่ |
| :--- | :--- | :--- | :--- |
| **1. Auth** | `POST /auth/login`<br>`POST /auth/logout`<br>`GET /auth/me` | Public<br>Public/Admin<br>Admin | ล็อกอินด้วยบัญชีที่ provision ไว้, HttpOnly session cookie, ล็อกเอาต์ และเช็ก Session ปัจจุบัน |
| **2. Site Content** | `GET /content/{section}`<br>`PUT /content/{section}`<br>`POST /content/reset` | Public<br>Admin<br>Admin | อ่าน/บันทึกข้อมูล JSON ทั้ง 4 ส่วน (`site`, `home`, `recruitment`, `legal`) และรีเซ็ตค่าเริ่มต้น |
| **3. Media Library** | `GET /media`<br>`POST /media`<br>`PATCH /media/{assetId}/slot`<br>`DELETE /media/{assetId}` | Public<br>Admin<br>Admin<br>Admin | ดึงรายการไฟล์, อัปโหลดรูป/SVG (`multipart/form-data`), ผูกรูปเข้ากับ Slot บนเว็บ และลบไฟล์ (คืน `409 ASSET_IN_USE` หากไฟล์ถูกใช้อยู่) |
| **4. Events** | `GET /events`<br>`POST /events`<br>`PATCH /events/{id}`<br>`DELETE /events/{id}` | Public/Admin<br>Admin<br>Admin<br>Admin | ดึงรายการกิจกรรม, สร้าง/แก้ไขกิจกรรมพร้อมอัปโหลดภาพปก (`payload` + `cover`) และลบกิจกรรม |
| **5. Inquiries & FAQ Bank** | `GET /inquiries`<br>`POST /inquiries`<br>`POST /inquiries/{id}/reply`<br>`PATCH /inquiries/{id}/tags`<br>`GET /faq-bank`<br>`POST /faq-bank`<br>`PATCH /faq-bank/{id}`<br>`DELETE /faq-bank/{id}`<br>`POST /faq-bank/{id}/copy-to-home` | Admin ยกเว้น public submit | รับคำถาม, ส่งอีเมลจริงผ่าน SMTP, จัดการ FAQ Bank และคัดลอกขึ้นหน้า Home |
| **6. Recruitment** | `GET /recruitment/applications`<br>`POST /recruitment/applications`<br>`PATCH /recruitment/applications/{id}/status`<br>`PATCH /recruitment/status`<br>`GET /recruitment/applications/{id}/cv` | Admin<br>Public<br>Admin<br>Admin<br>Admin | ส่งใบสมัครพร้อมไฟล์ CV (`payload` + `cv`), ดึงรายชื่อผู้สมัคร, เปลี่ยนสถานะผู้สมัคร, เปิด/ปิดรับสมัคร และขอลิงก์เปิด/ดาวน์โหลดไฟล์ CV |

---

### 2.3 วิธีสลับจากโหมด Mock (`localStorage`/`IndexedDB`) ไปใช้ Backend จริง
เมื่อทีม Backend รันเซิร์ฟเวอร์พร้อมแล้ว เพียงตั้งค่าในไฟล์ `.env.local` (ไม่ต้องแก้โค้ด):

```env
# เปลี่ยนจาก mock เป็น api
NEXT_PUBLIC_DATA_MODE=api

# กรณีเรียกผ่าน Next.js Rewrite Proxy (แนะนำเพื่อเลี่ยงปัญหา CORS และใช้ HttpOnly Cookie ได้ทันที)
NEXT_PUBLIC_API_BASE_URL=/api/backend
BACKEND_INTERNAL_URL=http://localhost:8000/api/v1
```

---

## 3. การรันโปรเจกต์ในเครื่อง (Getting Started)

```bash
# 1. ติดตั้ง Dependencies
npm install

# 2. รัน Development Server (Next.js 16 + Turbopack)
npm run dev

# 3. ตรวจสอบ Type, Lint และรัน Automated Tests (77 tests)
npm run typecheck
npm run lint
npm test

# 4. สร้าง Production Build
npm run build
npm run start
```

## 4. Python backend

The backend lives in `backend/` and matches the existing HTTP adapter under `/api/v1`. It uses FastAPI, SQLite, and persistent local uploads. Public content, event and media manifests are seeded from `src/content/` once; demo applicant/inquiry records are **not** imported.

### Setup (Python 3.12+)

Run from the repository root. On Windows:

```powershell
python -m venv backend/.venv
backend/.venv/Scripts/python.exe -m pip install -r backend/requirements-dev.txt
Copy-Item backend/.env.example backend/.env
backend/.venv/Scripts/python.exe -m backend.app create-admin admin@muictdev.club
backend/.venv/Scripts/python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```

On macOS/Linux, use `backend/.venv/bin/python` instead and `cp` for copying files. The provisioning command prompts for a password of at least 12 characters; running it again changes the password and revokes existing sessions. There are no default administrator credentials or public account-registration endpoints.

In a second terminal, copy the root `.env.example` to `.env.local` and run `npm run dev`. The example selects API mode with the same-origin Next.js proxy:

```env
NEXT_PUBLIC_DATA_MODE=api
NEXT_PUBLIC_API_BASE_URL=/api/backend
BACKEND_INTERNAL_URL=http://127.0.0.1:8000/api/v1
```

Restart Next.js after changing environment values. To use only the original mock frontend, set `NEXT_PUBLIC_DATA_MODE=mock`.

- Frontend: `http://localhost:3000`; admin login: `/admin/login`.
- API documentation: `http://127.0.0.1:8000/docs`; health: `/api/v1/health`.
- Tests: `backend/.venv/Scripts/python.exe -m pytest backend/tests -q`.
- Data: `backend/data/devclub.sqlite3`, `backend/data/uploads/`, and the download-signing key. These and virtual environments are ignored by Git. Back up the **entire** data directory, including the key; content reset restores only the four content documents, not applications, events, correspondence, or files.

### Email and deployment

Configure `DEVCLUB_SMTP_HOST`, `DEVCLUB_SMTP_PORT`, `DEVCLUB_MAIL_FROM` and optional SMTP credentials/TLS in `backend/.env`. Local development can use a local SMTP capture service such as Mailpit on port 1025. Without SMTP configured, replying returns `503` and does not mark an inquiry answered; failed SMTP delivery returns `502`. Successful replies record SMTP acceptance, not guaranteed final inbox delivery.

API administration uses hashed-password authentication and revocable, expiring HttpOnly cookies. Private application/CV/inquiry/FAQ reads require authentication; CV links expire after five minutes by default. Public event reads never return drafts. Uploads are capped at 10 MB, images are inspected, SVGs are restricted to inert geometry, and private CVs are not exposed through a static directory. Use trusted documents only: PDF/DOCX validation is not antivirus scanning.

For deployment, run the Python API separately from Vercel with a persistent disk for SQLite/uploads, keep its listening port private behind a reverse proxy, use HTTPS and `DEVCLUB_COOKIE_SECURE=true`, and set `DEVCLUB_ALLOWED_ORIGINS` to a JSON array of the actual frontend origins. The default allows only `http://localhost:3000` and `http://127.0.0.1:3000`; phone/network previews need their exact frontend origin added. `DEVCLUB_PUBLIC_API_BASE` defaults to `/api/backend` so file URLs use the same proxy; set an absolute public API URL only for a direct cross-origin deployment. Do not expose the database, environment file, or signing key. Add edge rate limits for public submissions and scheduled backups before public launch.
