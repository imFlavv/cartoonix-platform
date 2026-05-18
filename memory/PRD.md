# Cartoonix — PRD

## Original Problem Statement
Cartoonix este o platformă premium de streaming pentru desene animate retro (Cartoon Network, JETIX/Fox Kids, Minimax). Branding gold/dark, copy în limba română.

## Personas
- Părinți / adulți nostalgici (anii 90 & 2000)
- Copiii lor (consumatori secundari)
- Admin (manage cartoons, episodes, users, subscriptions, settings)

## Core Requirements
- Streaming de desene animate organizate pe categorii
- Autentificare cu verificare email (Brevo)
- Roluri: user / admin
- Subscription: free / plus (playlists for plus)
- Admin Dashboard: cartoons, episodes, users, subscriptions, settings
- Presentation Mode (lock down app to landing + register)
- Brand identity (logo + cursor custom + sonner toasts personalizate)
- Concursuri publice (3 contests, 2 free + 1 paid via Stripe)

## Implemented (CHANGELOG)
### 2026-02 (latest session)
- **Stripe Upgrade FREE → PLUS** pe `/early-access/` (`POST /api/users/me/upgrade-checkout`, `POST /api/users/me/confirm-upgrade`, pagina `EarlyAccessSuccessPage`)
- **Admin /admin/users/** — paginare (50/pagină) + bara de căutare (email/nickname) (`GET /api/admin/users?page=&limit=&search=`)
- **Pagina Concursuri** (`CartoonixContestsPage`) cu 4 concursuri (2 FREE / 2 PLUS), countdown timer (deadline 25 mai, 20:00) + buton „VEZI CONCURSURI" pe `/early-access/`
- **AdminContests** — vizualizare entries
- **Profile settings dropdown** (icon cog) pe early-access cu Inbox, Avatar, Parolă (`UserBar.jsx`, `EarlyAccessSuccessPage.jsx`)
- **Forgot / Reset Password** via Brevo (`no-reply@cartoonix.ro`): `POST /api/auth/forgot-password`, `POST /api/auth/reset-password`, `PATCH /api/auth/change-password`
- Pagini noi: `/forgot-password`, `/reset-password` + componenta `PasswordStrengthMeter`
- Colecție nouă: `password_resets`

### 2026-02 (earlier this month)
- **Concursuri page** `/concursuri` — 3 carduri premium (Toy Story 5, 15 × PLUS, Disneyland Paris)
- **Backend free contest endpoint** `POST /api/contests/enter` — email validation, duplicate detection, Brevo confirmation
- **Stripe webhook** `POST /api/webhooks/stripe` — handles `checkout.session.completed`, sends confirmation email
- **Simple contest confirmation email** (Brevo) — fără cod participare / fără sumă (per user choice 3b)
- `/concursuri` adăugat în lista `PRESENTATION_ALLOWED_PREFIXES` (accesibil public chiar și în modul Prezentare)
- Link „Concursuri" adăugat în navul PresentationPage

### Earlier sessions
- Custom Cartoonix logo throughout UI
- Premium sonner toast styling (brand colors)
- Presentation Mode toggle (Admin) + landing page
- Custom global cursor (base64)
- Premium PresentationPage redesign (Playfair Display, gold accents)
- Brevo email service (verification + contest)

## API Endpoints (new this session)
- `POST /api/contests/enter` — body: `{ email, contest_id }` → 200 `{ success, duplicate, email_sent }`
- `POST /api/webhooks/stripe` — receives Stripe events; on `checkout.session.completed` sends confirmation email

## Data Models
- `users`, `categories`, `cartoons`, `episodes`, `verification_codes`, `watch_history`, `favorites`, `playlists`, `settings`
- **NEW** `contest_entries`: `{ id, email, contest_id, contest_name, type, amount_total?, currency?, stripe_session_id?, created_at }`

## Integrations
- Brevo (transactional emails) — `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`
- Stripe (Payment Link + Webhook) — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (currently empty — must be set after user creates webhook in Stripe Dashboard)
- Payment Link: `https://buy.stripe.com/00w3co5oZgFO2ydfoO9EI01`

## Pending / Action Required from User
- **Brevo IP whitelist**: New pod IP `34.124.130.98` blocked → user must add it at https://app.brevo.com/security/authorised_ips. Otherwise contest confirmation emails will fail with HTTP 401.
- **Stripe Webhook configuration**: User must add `{REACT_APP_BACKEND_URL}/api/webhooks/stripe` in Stripe Dashboard, listen for `checkout.session.completed`, and paste the `whsec_...` secret into `STRIPE_WEBHOOK_SECRET` in `/app/backend/.env`. Until then, signature verification is bypassed (dev mode with WARN log).

## Backlog (P1/P2)
- Inbox real în settings dropdown (acum doar placeholder)
- Refactor `server.py` (~1700 linii) în routere FastAPI separate
- Mutare date concursuri din `CONTESTS` hardcoded în DB
- Admin view of `contest_entries` (list + export CSV)
- Anti-spam: rate limit `/api/contests/enter` by IP
- Public results page for past contests (winners)
- Stripe link customization (collect billing name automatically)
