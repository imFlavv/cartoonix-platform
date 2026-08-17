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
- BUGFIX chat 500 (live) ROOT CAUSE: `chat_messages` had a leftover unique index `id_1` (PHP migration).
  Inserts didn't set top-level `id` (derived from `_id` post-insert) → every doc `id:null` → E11000
  DuplicateKeyError on 2nd+ message. Fix: (1) startup drops erroneous `id_1` index on chat_messages +
  other app collections (best-effort); (2) `post_chat` pre-generates ObjectId and sets `id=str(oid)`
  before insert. Also wrapped post_chat in try/except logging full traceback. Verified on preview.
- BUGFIX chat 500 (live): `mute_remaining()` crashed with TypeError when `muted_until` was a
  timezone-naive ISO string (legacy PHP-imported users) — naive vs aware datetime comparison. Now
  parses robustly (assumes UTC for naive, handles non-datetime/parse errors, fail-safe → not muted).
  Verified on preview: naive future date → 403 (correctly muted) instead of 500; null/past → 200.
- Floating widget STACK (bottom-right): chat widget + PLUS widget (crown bg `/plus-widget-bg.webp`).
  `ChatWidget.jsx` fetches both `/settings/chat-widget` + `/settings/plus-widget`, stacks them (one front,
  one behind offset), auto-rotates front every 6s, closing the front reveals the other. Close is in-memory
  only → both reappear on refresh. Both editable + enable/disable from Admin → Platformă. Backend keys
  `chat_widget` + `plus_widget` with GET `/settings/*-widget` + POST `/admin/*-widget`.
- Jellyfin config robustness: `_jellyfin_conf()` reads env at runtime and accepts multiple names —
  URL: `JELLYFIN_URL` | `JELLYFIN_SERVER_URL`; KEY: `JELLYFIN_API_KEY` | `JELLYFIN_SECRET_KEY` |
  `JELLYFIN_KEY` | `JELLYFIN_TOKEN`. Logs `[jellyfin] not configured (url_set=.., key_set=..)` when missing.
- Payment robustness: rewrote `/payments/status` polling + `/webhook/stripe` to use direct stripe SDK
  (`stripe.checkout.Session.retrieve`) instead of the emergentintegrations wrapper, with logging
  (`[pay-poll]`, `[webhook]`). Grants PLUS when session `status=="complete"` OR
  `payment_status in ("paid","no_payment_required")` → covers 0-RON voucher orders. Verified E2E paid
  flow in preview (test card 4242 → status paid → PLUS granted) + simulated free-order webhook.
  NOTE: amount_off coupons "invalid" = Stripe coupon currency mismatch (must be RON); percent_off is
  currency-agnostic. This is user-side Stripe Dashboard config, not code.
- Fix comenzi 0 RON (voucher 100%): la total 0, Stripe trimite `payment_status="no_payment_required"`
  (nu "paid"). Webhook-ul `POST /api/webhook/stripe` acum activează PLUS și pentru `no_payment_required`.
  Polling-ul deja acoperă `status=="complete"`. Verificat E2E cu webhook simulat → PLUS activat.
- Stripe Checkout: enabled promotion/discount codes (`allow_promotion_codes=True`) + custom message
  (`custom_text.submit.message`, editable via env `PLUS_CHECKOUT_MESSAGE`) + product name/description +
  prefilled email. Session now built directly with stripe SDK in `POST /api/payments/checkout`
  (kept dynamic flow + auto PLUS activation). api_base routes via Emergent proxy for `sk_test_emergent`,
  direct api.stripe.com for real live key. Verified: checkout page shows "Add promotion code" + message.
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

## Recent changes (Aug 2026)
- Chat scroll: /lobby/chat now h-screen; only the messages container scrolls (flex-1 min-h-0 overflow-y-auto).
  Initial load 25 messages + "Afișează mai multe" (ChatRoom.jsx).
- Chat quote/reply: click any bubble → quote bar above input (X to cancel) → sent message renders quote
  block above its bubble. Backend POST /api/chat accepts optional quote {name,text} (server.py).
- Chat limits: max 120 chars per message (ChatInput max_length=120 + input maxLength=120 + 120 counter);
  10s cooldown between messages for non-admins (backend 429; frontend countdown on send button). Admins exempt.
- WatchParty: ShowPicker & PlaylistList extracted to module-level stable components → fixes scroll jumping
  to top during 2s polling; added title search field in the picker (WatchParty.jsx).
- Chat reactions: one reaction per user per message (👍/❤️/😂), toggle-off, switch replaces.
  Backend POST /api/chat/{id}/react + POST /api/chat/reactions (sync); GET /api/chat returns
  reaction_counts + my_reaction. Frontend shows reaction row under each bubble (zero-count hidden until
  hover), polls reactions every 4s. Verified e2e 100% (iteration_3.json).
- Chat scroll fix: onScroll handler binds auto-scroll to real scroll position (only sticks to bottom when
  near bottom / on own send) → no more jump-to-bottom during the 4s reaction poll (iteration_4.json).
- Watch page: right-side episode list sidebar (data-testid watch-episode-list / watch-ep-<n>), active
  episode highlighted with border (fits box, not clipped by scroll) + Play icon, auto-scrolls into view.
- Whole-show favorites: favorite an entire cartoon via episode_number=0 sentinel. ShowDetail header button
  (detail-fav-show); Profile shows 'Serial complet' and links to /show/<id>. Episode favorites unchanged.
  Verified e2e 100% (iteration_5.json).
- Chat verified badge: admins get a blue verified checkmark (VerifiedBadge.jsx, inline SVG) next to their
  name in chat, shown BEFORE the PLUS badge; both can appear. Same size (h-3.5 w-3.5) and aligned via
  flex items-center gap-1. Gated by m.role === "admin".

## Credentials
See `/app/memory/test_credentials.md` (admin@cartoonix.ro).
