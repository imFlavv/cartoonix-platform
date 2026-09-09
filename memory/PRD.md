# Cartoonix — PRD

Romanian nostalgic cartoon streaming platform. React (CRA/craco + Tailwind) frontend, FastAPI + MongoDB (Motor) backend. UI/UX entirely in Romanian.

## Core features (built)
- **Spin the Wheel** — NEW (Jun 2026): `/spin` animated SVG wheel (8 slices), prizes 5/10/15/50 puncte, Invitație PLUS (generates a giftable `type:"plus"` voucher + reward_claim), "Mai încearcă". Requires `user.spins` (new users get 1). `GET/POST /api/spin` (weighted pick server-side, atomic spin consume, points→ledger). Admin: grant spins per-user (`POST /api/admin/users/{id}/spins`) + bulk (`POST /api/admin/spins/grant-all`) in Members tab; edit odds in Admin → Roata tab (`GET/POST /api/admin/spin-config`, weights stored in `db.settings._id="spin_config"`, defaults retry55/p5 20/p10 12/p15 7/p50 4/plus 2). Files: `pages/Spin.jsx`, `components/AdminSpin.jsx`, `components/AdminMembers.jsx`.
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
