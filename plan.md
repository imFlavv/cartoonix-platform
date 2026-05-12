# plan.md — Cartoonix

## 1) Objectives
- Prove the **core workflow** works end-to-end with real integrations: **email verification (Brevo)** + **AI avatar generation (Gemini Nano Banana)** + **video ingestion (upload + URL)**.
- Build a V1 streaming app around the proven core: public browsing → registration wizard → verified login → play episodes.
- Deliver an admin panel where the first user is auto-admin and can manage cartoons/episodes/users.
- Ship a polished nostalgic/premium UI (dark default) with reliable data flow (MongoDB) and stable deployment (supervisorctl).

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation; do not proceed until green)
**Goal:** One Python script proves: Brevo send/verify code, Gemini avatar generation, and video storage decision + test upload.

1) **Integration playbook + web search (storage choice)**
   - Use `integration_playbook_expert_v2` + quick web search for best practice.
   - Decide MVP storage path:
     - Preferred: **S3-compatible (presigned URLs)** if available.
     - Fallback: **local storage** (dev) + clear interface so it can be swapped later.

2) **Create `poc_core.py` (single script)**
   - Brevo: send 6-digit code email (HTML template, sender `no-reply@cartoonix.ro`).
   - MongoDB: store `{email, code_hash, expires_at}` and validate a provided code.
   - Gemini Nano Banana: generate 1–2 avatar images (save URLs or files), verify output is usable by frontend.
   - Storage: upload a small MP4 (or dummy file) using chosen path and return a playable URL.

3) **POC success gate**
   - Script output prints:
     - `BREVO_OK`, `VERIFY_OK`, `AVATAR_OK`, `UPLOAD_OK` with URLs.
   - If any fails: iterate until stable (no app build until pass).

**Phase 1 user stories (POC-focused)**
1. As a developer, I can send a verification email via Brevo and see it arrive in an inbox.
2. As a developer, I can validate a 6-digit code against MongoDB with expiry.
3. As a developer, I can generate a cartoon avatar image via Gemini and obtain a usable URL.
4. As a developer, I can upload a video file and receive a playable URL.
5. As a developer, I can store and retrieve all POC artifacts (codes, avatars, videos) reliably.

---

### Phase 2 — V1 App Development (build around proven core; minimal MVP)
**Goal:** Working streaming platform with public browsing + verified accounts + admin CRUD + playback.

1) **Backend (FastAPI, `/api`, bind `0.0.0.0:8001`)**
   - Auth:
     - Register (creates user unverified + issues verification code).
     - Verify email (6-digit code) → set `email_verified=true`.
     - Login (JWT), role-based guard (`user/admin`).
     - First registered user → `role=admin`.
   - Content:
     - Seed fixed categories (JETIX & Fox Kids, Cartoon Network, Minimax) + logo fields.
     - CRUD series (cartoons) + episodes.
     - Episode video source supports:
       - `upload` (stored URL from storage adapter)
       - `external_url` (MP4/HLS link)
   - User features:
     - Favorites, watch history (append on playback start/end), playlists (enforce Plus-only).
   - Email templates:
     - Use the same verified HTML from POC; keep branding consistent.

2) **Frontend (React + shadcn/ui + Tailwind + Framer Motion; dark default)**
   - Public:
     - Home hero + 3 category cards; category grids; cartoon details with episode list.
   - Registration wizard (3 steps):
     - Step 1: avatar picker (AI-generated set), nickname, email, password+confirm, T&C checkbox linking `/terms-and-conditions`.
     - Step 2: plan selection UI (Free vs Plus; “coming soon” note for payments).
     - Step 3: verify code entry + resend.
   - Authenticated:
     - User dashboard: profile, subscription badge, favorites, history; playlists visible only for Plus.
   - Playback:
     - Episode page/modal uses React Player (MP4/HLS) + updates watch history.
   - Admin panel:
     - Sidebar: Overview, Cartoons, Episodes (upload OR URL), Users, Subscriptions.

3) **Storage adapter integration**
   - Unified API on backend: `POST /api/uploads/video` returns `{url}`.
   - Frontend admin episode form supports:
     - Upload file → backend returns URL
     - Paste URL → store as-is

4) **Data model (MongoDB)**
   - Users: role, subscription_tier (free/plus), avatar_url, email_verified, favorites, history, playlists.
   - Categories: fixed 3.
   - Cartoons: title, description, year, category_id, thumbnail.
   - Episodes: cartoon_id, season, number, title, video_url, source_type.
   - VerificationCodes: email, code_hash, expires_at, used.

5) **Close Phase 2 with 1 round E2E testing**
   - Run app via supervisorctl.
   - Execute testing_agent end-to-end: browse → register → verify → login → play → admin CRUD.

**Phase 2 user stories (V1)**
1. As a visitor, I can browse cartoons by channel without creating an account.
2. As a user, I can complete a 3-step signup with avatar selection and receive a verification code email.
3. As a user, I can verify my email with a 6-digit code and then log in.
4. As a user, I can play an episode (MP4/HLS) and see it appear in my watch history.
5. As an admin, I can create a cartoon and add episodes via upload or external URL.

---

### Phase 3 — Expand Features + Hardening
**Goal:** Fill remaining UX gaps, enforce tiers, and improve admin/content workflows.

1) **Plus-tier enforcement**
   - Playlist creation gated to Plus.
   - Free-tier limits (3 hours daily) implemented as MVP counter (server-side) + UI messaging.

2) **Better content management**
   - Bulk episode creation (optional) + episode ordering.
   - Thumbnails: upload or URL; ensure consistent rendering.

3) **Quality/UX polish**
   - Loading/empty/error states across all pages.
   - Resend verification throttling + clear expiry messaging.
   - Responsive layout refinements.

4) **Close Phase 3 with 1 round E2E testing**
   - Testing_agent: tier gating, admin flows, playback stability, regressions.

**Phase 3 user stories**
1. As a Free user, I’m clearly informed when I hit the daily watch limit.
2. As a Plus user, I can create and manage playlists.
3. As an admin, I can quickly add and reorder episodes for a series.
4. As a user, I can favorite a cartoon and see it in my dashboard.
5. As a user, I can recover gracefully from expired/invalid verification codes.

---

## 3) Next Actions
1) Run Phase 1: finalize storage approach (playbook + web search) and implement `poc_core.py`.
2) Execute POC until all four checks are green (`BREVO_OK/VERIFY_OK/AVATAR_OK/UPLOAD_OK`).
3) Start Phase 2 with minimal bulk edits: build backend + frontend core pages + admin CRUD + playback.
4) Run 1 full E2E test pass; fix issues before expanding scope.

---

## 4) Success Criteria
- **POC:** Single script proves Brevo email delivery + code verification + avatar generation + video upload/URL works.
- **V1:** A new user can browse → register → verify → login → watch an episode with history recorded.
- **Admin:** First user is admin; can CRUD cartoons/episodes/users; can add episode via upload or pasted URL.
- **Stability:** App runs under supervisorctl; all `/api` routes functional; no env var constraints violated.
- **UX:** Dark-mode default, responsive UI, clear empty/error states, premium nostalgic look-and-feel.
