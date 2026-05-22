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
### 2026-02 (latest — Yahoo Messenger ASCII shortcuts full set)
- **ASCII shortcuts aliniate la legenda Yahoo Messenger** (imaginea oficială) — 47 de coduri exacte din spec mapate la GIF-urile din `/emoticons/`:
  - `:)` happy, `:(` sad, `;)` winking, `:D` big grin, `;;)` batting eyelashes (blush), `>:D<` big hug, `:-/` confused, `:x` love struck (heart), `:">` blushing, `:P` tongue, `:-*` kiss, `=((` broken heart, `:-O` surprise, `X(` angry, `:>` smug (smirk), `B-)` cool (sunglasses), `:-S` worried, `#:-S` whew (relieved), `>:)` devil (joker), `:((` crying, `:))` laughing (joy), `:|` straight face (neutral), `/:)` raised eyebrow (confounded), `=))` rolling on floor (rofl), `O:-)` angel (innocent), `:-B` nerd (glasses), `=;` talk to the hand (ohstop)
  - Plus: `~X(` at wits' end, `:-t` time out, `8->` daydreaming (pensive), `I-)` sleepy, `8-|` rolling eyes (unamused), `L-)` loser, `:-&` sick, `:-$` don't tell anyone (no_mouth), `[-(` not talking (not_listening), `8-}` silly (giggle), `(:|` yawn (tired_face), `:-?` thinking (how_interesting), `#-o` d'oh (scream), `=D>` applause (clap), `:-SS` nailbiting (fearful), `@-)` hypnotized (dizzy), `:^o` liar, `:-w` waiting (look_at_the_time), `:-<` sigh (frowning), `>:P` phbbbbt (tongue), `<):)` cowboy
- Ordine ASCII_SHORTCUTS optimizată: cele mai lungi/specifice (`:-SS`, `:))`, `=((`, `O:-)`) listate ÎNAINTEA scurtelor pentru ca regex-ul alternation să nu fure caractere
- **Verificat live**: 6 mesaje cu toate shortcurile din poză → 62 GIF-uri Yahoo randate inline corect

### 2026-02 (earlier — CartoonixTV bot + ASCII shortcuts + fix /forgot-password)
- **CartoonixTV bot** (gen Nightbot pe YouTube):
  - Backend `chat.py`: scheduler asyncio în background, endpoints admin `GET/PATCH /api/chat/admin/cartoonixtv` + `POST /api/chat/admin/cartoonixtv/post-now`
  - Settings noi în DB: `cartoonixtv_enabled`, `cartoonixtv_interval_minutes`, `cartoonixtv_messages`, `cartoonixtv_random_order`, `cartoonixtv_rooms`, `cartoonixtv_last_sent_at`
  - 5 mesaje default seed-uite la prima pornire
  - Mesajele bot au `role=bot`, `is_bot=true`, badge cyan "BOT" + iconiță TV, fundal cyan ușor
  - Admin UI în `/admin/chat` (secțiune dedicată): toggle, interval, camere (global/plus toggle), ordine random/rotație, listă editabilă mesaje, post ad-hoc one-shot
- **ASCII shortcuts (stil anii 2000)** — `emoticons.js > convertAsciiShortcuts()`:
  - `:)` `:-)` → smile, `:D` `=D` → lol, `xD` → joy, `:P` → tongue, `;)` → wink, `:(` → disappointed, `:'(` → cry, `:o` `:O` → open_mouth, `:|` → neutral, `B)` `8)` → sunglasses, `:*` → kiss, `<3` → heart, `</3` → heartbreak, `O:)` → innocent
  - Detectează doar la word boundary (nu mangle-uiește URL-uri sau ore gen 8:30)
- **Fix `/forgot-password` 404/blank** — ruta era importată în `App.js` dar lipsea din `<Routes>`. Adăugat și `/reset-password`.

### 2026-02 (earlier — Chat + Yahoo Emoticoane)
- **Chat live Cartoonix** (`/app/backend/chat.py` + `/app/frontend/src/components/chat/ChatWidget.jsx`):
  - 2 camere (Global / PLUS), cooldown progresiv 5→15→60s, restricție utilizatori noi (3 zile)
  - Filtru cuvinte vulgare RO+EN, block linkuri, anti-CAPS, anti-duplicate
  - Admin panel `/admin/chat` (1147 linii): moderare (mute 5m/1h/24h/perm, ban), pin, settings global toggle
  - Endpoints `/api/chat/*` user + `/api/chat/admin/*` admin
- **Yahoo Emoticoane (93 GIFs)** — `/app/frontend/public/emoticons/*.gif`
  - Registru `emoticons.json` (cod + dimensiuni native)
  - Componente: `EmoticonPicker.jsx` (picker grid 8-col + search) + helper `parseEmoticons()`
  - Inserare în mesaj prin click pe picker (`:cod:`) sau tastare manuală
  - Render inline cu dimensiunile ORIGINALE ale fiecărui GIF (fără resize), atât în chat widget cât și în AdminChat (lista mesaje + history)

### 2026-02 (earlier — Inbox + Announcements)
- **Update Announcement Popup** — `GET /api/announcements/latest` + `POST /api/announcements/{id}/dismiss`. Apare o singură dată / user (persistat în `users.seen_announcements`). Anunț curent: Resetare parolă + Schimbare parolă + Inbox real.
- **Inbox real** — colecție `notifications`, endpoints: `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /api/notifications/{id}/read`, `POST /api/notifications/read-all`, `DELETE /api/notifications/{id}`.
- **Admin Notificări** — pagină nouă `/admin/notifications` (`AdminNotifications.jsx`), endpoint `POST /api/admin/notifications` (target: all/free/plus/user) + `GET /api/admin/notifications` pentru istoric grupat.
- **Badge unread** pe iconul cog (gradient roșu cu count) + badge inline pe itemul Inbox din dropdown.
- Inbox dialog refăcut cu list real (mark read / mark all / delete, relative time RO).

### 2026-02 (earlier — Stripe + Forgot Password)
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
- Refactor `server.py` (~2000 linii) în routere FastAPI separate (auth, admin, contests, notifications)
- Mutare date concursuri din `CONTESTS` hardcoded în DB
- Admin view of `contest_entries` (list + export CSV)
- Anti-spam: rate limit `/api/contests/enter` by IP
- Public results page for past contests (winners)
- Stripe link customization (collect billing name automatically)
- Real-time push pentru notificări (WebSocket / SSE) — momentan se poll-uiește la 60s
