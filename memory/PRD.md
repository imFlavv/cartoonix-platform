# Cartoonix — PRD

Romanian nostalgic cartoon streaming platform. React (CRA/craco + Tailwind) frontend, FastAPI + MongoDB (Motor) backend. UI/UX entirely in Romanian.

## Core features (built)
- **Roles, rank titles & chat badges** — NEW (Jul 2025): roles = user/moderator/admin/founder (founder=Hall of Fame→FONDATOR badge), validated in `PUT /api/admin/users/{uid}`; assign via Admin → Membri edit dialog. Chat shows single role-badge pill by priority FONDATOR>ADMIN>MODERATOR>PLUS>DONATOR + rank title under name from message count (`src/lib/roles.js`: Membru/Membru Activ/Membru Avansat/Veteran/Super Fan/Legendă Cartoonix). Moderator chat tools via `require_moderator`: `POST /api/mod/chat/mute` (5m/10m/15m only, can't mute staff) + `DELETE /api/mod/chat/message/{id}`; admins keep `/api/admin/chat/*`. `_enrich_messages` refreshes role/plus/donor live. ChatRoom 3-dot menu: admins full (pin/mute/ban/delete), moderators limited (suspendă 5/10/15 + delete).
- **Settings → Personalizare tab** — NEW (Jul 2025): renamed 'Chat' tab to 'Personalizare' (`pages/Settings.jsx`). Avatar picker dialog ('Alege avatar') with normal + PLUS avatars (locked if not PLUS). PLUS-only: name color (`name_color`), message styles incl. NEW CSS bubbles `neon`/`retro` (`SkinnedBubble` CSS_SKINS), font/glow/gradient/bold/italic/sparkle + NEW `shadow` (Umbră text). Backend chat_style extended: ALLOWED_BUBBLES+neon/retro, ALLOWED_NAME_COLORS, default_chat_style/sanitize_chat_style/ChatStyleInput add name_color+shadow. Badge & identitate card is read-only (Membru / PLUS). Name color applied to chat sender name for PLUS.
- **Mystery Box case-opening (/spin reskin)** — NEW (Jun 2026): pagina `/spin` refăcută din roată în sistem de tip case-opening (reel orizontal care derulează și se oprește pe premiu, marker central portocaliu, glow pe cardul câștigat, ~6s cubic-bezier). Integrat din arhiva "Vaultline" (adaptat în React, `pages/Spin.jsx`). Moneda `spins` = **Cheie Mystery Box** (afișată ca badge cu KeyRound); toți userii încep cu 0, cheile vin din recompensa Halloween "key" (`spins++`) și din grant admin. Backend NESCHIMBAT — `POST /api/spin` are deja premiile+probabilitățile cerute: retry 55%, p5 20%, p10 12%, p15 7%, p50 4%, plus 2% (`SPIN_PRIZES`). Șansele NU se afișează în pagină. Modal reveal: Mai încearcă / +puncte / Invitație PLUS (voucher cod copiabil).
- **Time-tracking anti-cheat + farming dovleci** — NEW (Jun 2026): `POST /api/presence` rescris ca update atomic cu aggregation-pipeline — delta se calculează din `last_active_ts` (BSON Date) live al documentului, nu din valoarea citită de `get_current_user`. MongoDB serializează scrierile pe un doc, deci pinguri concurente din mai multe tab-uri/dispozitive NU mai pot multiplica timpul (înainte N tab-uri adăugau Nx). Cap delta 0<Δ≤90s. Frontend `AuthContext` pinguiește doar când `document.visibilityState==="visible"` (+ la revenirea în tab). Farming dovleci pe timp era deja funcțional: `_hw_sync_earn` folosește `presence_seconds`, `ACTIVE_SECONDS_PER_PUMPKIN=7200` (2h=1 dovleac). Verificat: 10 cereri concurente/7s → +7s, nu +70s.
- **Halloween inventory in grid** — NEW (Jun 2026): în Profile → Inventar, dovlecii apar direct ca celule în grilă (nu banner separat). O casetă per tip (Dovleci / Dovleci sculptați) cu badge `×N` (afișat doar dacă N>1). Buton mic "🎃 Mergi la eveniment" lângă "Câștigă mai multe". Sursă date: `GET /api/halloween/status` (`pumpkins` recalculat server-side, `carved`). `Profile.jsx` tab rewards.
- **Robust favorites removal** — NEW (Jul 2025): `DELETE /api/favorites/{id}` (by ObjectId, fallback key/id) removes favorites even for shows no longer on server (old VPS). LibraryContext `removeFavorite` (optimistic). Profile 'Recompense' tab renamed to 'Inventar'.
- **Env note**: this environment had NO `frontend/.env`/`backend/.env`; recreated. REACT_APP_BACKEND_URL must equal the current preview origin (same-origin to avoid CORS). backend/.env: MONGO_URL, DB_NAME=cartoonix, JWT_SECRET.

- **Multi-root media storage** — NEW (Jun 2026): backend serves videos from multiple roots via `MEDIA_ROOTS` = [("videos", VIDEO_DIR=/media/videos), ("storage", STORAGE_DIR=/mnt/cartoonix-storage)]. Stream route generalized to `/api/media/{root}/{path}` (Range/seek). video_url stored as `/media/<root>/<rel>`. Admin import (`/admin/import-folder`, `/admin/import-all`) accepts absolute paths under any root via `_resolve_media_dir`. Frontend `resolveVideoUrl` routes any `media/*` path. Legacy `/media/videos/...` fully compatible. STORAGE_DIR overridable via env.
- **Spin the Wheel** — (Jun 2026): `/spin` wheel, admin grant spins + odds editor (Admin → Roata).
- **Facturi (invoices)** — (Jun 2026): `/profile` tab "Facturi", `GET /api/invoices`, PIXELVERSE SRL seller details, print modal.
- **Live TV player UX** — NEW (Jun 2026): `/live` custom controls auto-hide after 3s inactivity (fullscreen TV/PC/mobile), cursor hidden when idle; center play/pause button (YouTube-style) via `togglePlay`. Series `/watch` uses native controls.
- **Announcements redesign** (Jun 2026): `/lobby/announcements` list + detail, admin CRUD.
- Auth: JWT (Bearer token in localStorage `cx_token`), bcrypt hashing, OTP email verification on register via Brevo, admin seeding.
- **Password reset (forgot password)** — NEW (Jun 2026): `/login` has "Ai uitat parola?" → email input → Brevo reset link (from no-reply@cartoonix.ro) → `/reset-password?token=` page to set new password. Secure token: `secrets.token_urlsafe`, sha256-hashed in `password_reset_tokens`, 45 min expiry, single-use, anti-enumeration.
- WatchParty, Live TV (`/live`), synchronized Cinema (`/cinema`, 2 halls, seat map, polling sync, admin controls), Lobby chat with donor badges.
- Stripe (PLUS subscription + donations), Points/Rewards (`/rewards`, `/shop`), Leaderboard (`/clasament`).
- Gamified map Cartoonix Land (`/land`), Admin panel (`/admin`).
- Branding: autumn Cartoonix logo (`/cartoonix-logo-autumn.webp`) used in NavBar + splash + HTML boot; boot/splash background `/boot-bg.webp` (autumn "Bun venit" scene). HTML boot loader is background-only (no logo/text) → seamless into React SplashScreen.

## Key files
- Backend: `/app/backend/server.py` (monolith, >4400 lines). Email fns: `send_otp_email`, `send_reset_email`. Reset endpoints: `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`.
- Frontend: `pages/Login.jsx` (login + forgot modes), `pages/ResetPassword.jsx`, `components/SplashScreen.jsx`, `components/NavBar.jsx`, `components/AuthGate.jsx` (PUBLIC_PATHS incl. `/reset-password`), `data/constants.js` (LOGO_AUTUMN), `App.js` (routes).

## Integrations
- Brevo/Sendinblue (transactional email) — BREVO_API_KEY, BREVO_SENDER_EMAIL in backend/.env.
- Stripe (test key in env). Jellyfin media server (JELLYFIN_URL).

## Env of note
- `RESET_TTL_MINUTES` (default 45), `OTP_TTL_MINUTES` (default 10), `PUBLIC_APP_URL` fallback for reset link (defaults request Origin → https://cartoonix.ro).

## Backlog / pending
- P1: Hetzner Storage Box mount for `/media/videos` (awaiting user). Filter members (Only PLUS / Only FREE) in Admin.
- P2: Image upload in chat (object storage), connect `/land` building click, upload poster in admin, hide PLUS widget for PLUS users, promo popup schedule, DB cleanup script, websockets for WatchParty, cinema push notifications.
- P2: rate-limit feedback UI on forgot-password.

## Notes
- Real-time features use polling (not websockets) by user preference.
- Splash covers first load ~2.8s (sessionStorage `cx_splash_seen`).
- Test creds in `/app/memory/test_credentials.md`.
