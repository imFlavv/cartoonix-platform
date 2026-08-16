# Cartoonix — PRD & Changelog

## Problem statement
Cartoonix is a Romanian cartoon streaming platform (FastAPI + MongoDB + React).
Features: auth (JWT + Brevo OTP), role-based admin, VPS video streaming with Range,
Watch Party, live chat, leaderboards, lobby, Stripe PLUS (lifetime, 50 RON), admin panel
(users, shows, tickets, chat moderation, promo popup). Live prod runs on MongoDB Atlas (30k+ users).
UI language: Romanian only.

## Architecture
- Backend: `/app/backend/server.py` (~2650 lines, all routes/schemas/auth).
- Frontend: React SPA, TailwindCSS, `/app/frontend/src/pages` + `/components`.
- Auth: JWT in localStorage. Legacy PHP bcrypt ($2y$) hashes supported.
- Media: `GET /api/media/videos/{path}` range streaming from VIDEO_DIR.

## Implemented (2026-06)
- Admin: global avatar reset button (Platformă tab) → `POST /api/admin/reset-avatars` sets all users'
  avatar to `/avatars/default-user.jpg`. Verified (updated N users).
- Cartoonix TV (Jellyfin) account provisioning — PLUS only. Page `/cont-tv` (`TvAccount.jsx`):
  email locked = username, password + confirm → `POST /api/jellyfin/register` (Jellyfin `POST /Users/New`).
  `GET /api/jellyfin/status` checks existing. NavBar dropdown link for PLUS users. Uses
  JELLYFIN_URL + JELLYFIN_API_KEY from backend/.env (user must add same on live). Auth header:
  `Authorization: MediaBrowser Token="..."`. Live connectivity verified via status call.
- Legal & community pages (card layout, public routes, linked in Home footer):
  `/termeni` (Terms.jsx, text oficial complet), `/confidentialitate` (Privacy.jsx),
  `/regulament` (Rules.jsx — Regulamentul Comunității, text oficial complet),
  `/cookies` (Cookies.jsx — Politică Cookie-uri, text oficial complet).
- Register: checkbox obligatoriu „Am citit Termenii și sunt de acord cu Regulamentul" cu linkuri;
  butonul Continuă e blocat până e bifat (`Register.jsx`).
- Legal pages: `Terms.jsx` (/termeni) + `Privacy.jsx` (/confidentialitate), public routes (added to AuthGate PUBLIC_PATHS),
  linked in Home footer. (No legal pages existed before.)
- Verified working (no change needed): chat auto-refresh already polls every 4s in `ChatRoom.jsx`;
  promo popup shows for FREE users on Home — admin doesn't see it because admin is subscription:plus.
- Episodes: ALL episodes free — removed PLUS lock in `ShowDetail.jsx` & `Watch.jsx` (`locked = false`).
  Download remains PLUS-only (unchanged).
- Admin tickets pagination: 10/page, client-side, prev/next in `AdminTickets.jsx`.
- Admin "Clear Chat" button in `AdminChat.jsx` → `DELETE /api/admin/chat/clear?room=` (clears selected room only).
- (Earlier) Drag&Drop episode sort, VPS import-all + ffprobe durations, Lobby/Leaderboard/Cinema/WatchParty,
  Watch Party invites, Atlas 520 fix + dnspython, WebP images, hero carousel, navbar search,
  promo popup, chat crash fix, admin members pagination + FREE/PLUS stats.

## Backlog
- P1: Watch Party WebSockets (replace polling); auto-play next episode for all participants.
- P2: Upload poster from computer; filter members Only PLUS / Only FREE; promo popup start/end schedule.

## Credentials
See `/app/memory/test_credentials.md` (admin@cartoonix.ro).
