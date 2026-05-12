# plan.md — Cartoonix (Updated)

## 1) Objectives
- ✅ Prove the **core workflow** works end-to-end with real integrations: **email verification (Brevo)** + **AI avatar generation (Gemini Nano Banana)** + **video ingestion (upload + URL)**.
- ✅ Build a V1 streaming app around the proven core: public browsing → registration wizard → verified login → play episodes.
- ✅ Deliver an admin panel where the first user is auto-admin and can manage cartoons/episodes/users.
- ✅ Ship a polished nostalgic/premium UI (dark default) with reliable data flow (MongoDB) and stable deployment (supervisorctl).
- 🎯 **Current objective:** production-ready stabilization + user testing feedback loop, then incremental enhancements (search, better content workflows, tier limits, etc.).

---

## 2) Implementation Steps

### Phase 1 — Core POC (Isolation; do not proceed until green) — **COMPLETE**
**Goal:** One Python script proves: Brevo send/verify code, Gemini avatar generation, and video storage decision + test upload.

1) **Integration playbook + storage decision**
   - Completed: MVP storage path implemented as **local storage** for uploads with a clear backend upload API.

2) **Created `poc_core.py` (single script)**
   - ✅ Brevo: sends 6-digit code email (HTML template, sender `no-reply@cartoonix.ro`).
   - ✅ Gemini Nano Banana: generates cartoon avatar image(s).
   - ✅ Storage: writes MP4 test file and returns a URL path.

3) **POC success gate**
   - ✅ Passed: `BREVO_OK`, `AVATAR_OK`, `UPLOAD_OK`.

**Phase 1 user stories (POC-focused) — COMPLETE**
1. ✅ Send verification email via Brevo and receive it.
2. ✅ Generate a cartoon avatar via Gemini and save it.
3. ✅ Upload/store video artifact and produce a playable URL path.

---

### Phase 2 — V1 App Development (build around proven core; minimal MVP) — **COMPLETE**
**Goal:** Working streaming platform with public browsing + verified accounts + admin CRUD + playback.

1) **Backend (FastAPI, `/api`, bind `0.0.0.0:8001`) — COMPLETE**
   - Auth:
     - ✅ Register creates user unverified + issues verification code + sends Brevo email.
     - ✅ Verify email (6-digit code) → set `email_verified=true`.
     - ✅ Login (JWT).
     - ✅ Role-based guard (`user/admin`).
     - ✅ First registered user → `role=admin`.
   - Content:
     - ✅ Seed fixed categories: **JETIX & Fox Kids**, **Cartoon Network**, **Minimax**.
     - ✅ CRUD cartoons/series.
     - ✅ CRUD episodes.
     - ✅ Episode video source supports:
       - `upload` (local file upload)
       - `external` URL (MP4/HLS)
   - User features:
     - ✅ Favorites.
     - ✅ Watch history (upsert per user+episode).
     - ✅ Playlists (Plus only) with gating.
   - Uploads:
     - ✅ Video upload endpoint (admin).
     - ✅ Thumbnail upload endpoint (admin).
     - ✅ Folder import endpoint (admin) restricted to `/app/backend/uploads`.

2) **Frontend (React + shadcn/ui + Tailwind + Framer Motion; dark default) — COMPLETE**
   - Public:
     - ✅ Home hero + 3 channel cards.
     - ✅ Category page with grid + empty state.
     - ✅ Cartoon detail page with episode list + embedded ReactPlayer.
   - Registration wizard (3 steps):
     - ✅ Step 1: avatar picker (14 AI avatars), nickname/email/password+confirm, T&C checkbox linking `/terms-and-conditions`.
     - ✅ Step 2: plan selection UI (Free vs Plus) + “payments coming soon”.
     - ✅ Step 3: OTP-style verification input + resend.
   - Authenticated:
     - ✅ Dashboard: profile, subscription badge, history, favorites.
     - ✅ Playlists tab (Plus-only) + upgrade CTA when locked.
   - Admin panel:
     - ✅ Sidebar: Overview, Cartoons, Episodes (upload OR URL), Users, Subscriptions.
     - ✅ Admin CRUD UI for cartoons/episodes/users.
   - Theming:
     - ✅ Dark/light mode toggle with localStorage persistence.

3) **Static media serving fix — COMPLETE**
   - ✅ Fixed Kubernetes ingress routing issue by serving static uploads via **`/api/uploads/*`** (instead of `/uploads/*`).
   - ✅ Avatars and uploads now load correctly via public preview URL.

4) **Error handling hardening — COMPLETE**
   - ✅ Added `getErrorMessage()` helper to properly format FastAPI/Pydantic 422 validation errors.
   - ✅ Applied across auth flows + admin flows (register/login/verify/admin CRUD).

5) **Close Phase 2 with testing — COMPLETE**
   - Backend testing: ✅ **52/53** tests passed (**98.1%**). Initial static routing issue fixed.
   - Frontend testing: ✅ **17/18** tests passed (**94%**). 422 formatting issue fixed.
   - ✅ Manual curl verification confirmed register → code fetch (Mongo) → verify flow works.

**Phase 2 user stories (V1) — COMPLETE**
1. ✅ Visitor can browse by the 3 channels without signup.
2. ✅ Visitor can view cartoon details and episode lists.
3. ✅ User can complete 3-step signup with AI avatar selection.
4. ✅ User receives 6-digit verification code via Brevo.
5. ✅ Free/Plus plan selection works (display-only as requested).
6. ✅ First user becomes admin automatically.
7. ✅ Admin manages cartoons/episodes/users/subscriptions.
8. ✅ Admin can upload video files or paste external URLs.
9. ✅ Favorites + watch history working.
10. ✅ Plus playlists working with gating.
11. ✅ Dark/light toggle works with persistence.

---

### Phase 3 — Expand Features + Hardening (Post-V1) — **NEXT**
**Goal:** Polish UX, add content workflows, improve scalability, and prepare for optional paid subscriptions.

1) **Tier enforcement (optional next)**
   - Implement Free-tier daily watch limit (3 hours/day) with server-side tracking + UI messaging.
   - Keep playlists Plus-only (already enforced); expand Plus-only perks as needed.

2) **Content management improvements**
   - Bulk episode upload + ordering controls.
   - Better thumbnail management (per-episode thumbnails, fallbacks).
   - Optional search and filters (title, year, genre).

3) **Video/storage hardening**
   - Consider adding an abstraction to swap from local uploads → S3-compatible storage.
   - Add streaming-optimized formats (HLS generation) if required.

4) **Email and auth hardening**
   - Improve deliverability monitoring.
   - Add verification code UX enhancements (attempt messaging, expiry UI, resend cooldown messaging polish).

5) **UX polish + accessibility**
   - More skeleton loaders + empty states.
   - Keyboard navigation improvements.
   - Reduced motion support refinement.

6) **Payments (future; user requested “coming soon” for now)**
   - Add Stripe integration when ready.
   - Add billing portal + subscription lifecycle.

**Phase 3 user stories (future)**
1. As a Free user, I’m clearly informed when I hit the daily watch limit.
2. As a Plus user, I can manage richer playlists and collections.
3. As an admin, I can bulk add episodes and reorder them.
4. As a user, I can search cartoons quickly.
5. As a user, I can recover gracefully from expired/invalid verification codes.

---

## 3) Next Actions
1) ✅ Phase 1 complete; ✅ Phase 2 complete.
2) **User acceptance testing**:
   - Create real admin account via UI.
   - Add 1–2 cartoons and multiple episodes.
   - Validate playback for MP4 and (optionally) HLS.
3) **Polish backlog triage**:
   - Review UI/UX feedback.
   - Prioritize Phase 3 items.
4) **Optional:** decide whether to move uploads from local storage → S3/Cloudinary for production scale.

---

## 4) Success Criteria
- ✅ **POC:** Brevo email delivery + avatar generation + upload path tested and passing.
- ✅ **V1:** Browse → register → verify → login → watch episode with history recorded.
- ✅ **Admin:** First user admin; CRUD cartoons/episodes/users; episodes via upload or URL.
- ✅ **Stability:** Runs under supervisorctl; all `/api` routes functional; env var constraints respected.
- ✅ **UX:** Dark-mode default, responsive UI, premium nostalgic look-and-feel, solid error handling.
- 🎯 **Ready for production user testing**: all core user stories validated; remaining work is enhancements and polish.
