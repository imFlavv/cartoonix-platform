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
### 2026-06-01 — Optimizare performanță pentru 100+ useri concurenți
- **ChatWidget**: polling delta cu parametrul `since` în loc de a re-cere tot istoricul; intervalul mesajelor 3s→5s, state 5s→15s, presence/heartbeat 30s→45s, payload mesaje 200→max 50 per delta (load inițial 80).
- **Tab ascuns**: toate polling-urile (chat messages/state/presence/heartbeat + notificări) sunt **oprite** când `document.visibilityState === "hidden"` și se reîncarcă o singură dată la revenire.
- **Notificări**: poll 60s → 120s.
- **Admin chat**: poll 3s→5s, full refresh 8s→20s.
- **Impact măsurat**: pentru un user idle pe `/`, cererile către `/api/*` au scăzut de la ~25 req/30s la ~8 req/30s (~70% reducere); payload-ul `/chat/messages` aproape zero (delta gol vs 200 mesaje full). Proiectat la 100 useri concurenți: ~27 req/s în loc de ~70 req/s.

### 2026-06-01 — Centrul de Support (utilizator & admin)
- **Backend** (server.py): nouă colecție `support_tickets` + endpoint-uri:
  - `POST /api/support/tickets` (auth) — creează ticket (title, message, attachment_url opțional)
  - `GET /api/support/tickets` — listează ticketele utilizatorului
  - `GET /api/support/tickets/{id}` — detalii (owner sau admin)
  - `POST /api/support/tickets/{id}/reply` — adaugă răspuns (user sau admin); când admin răspunde pe ticket `open` → trece automat în `in_progress`
  - `POST /api/support/upload` — upload atașament (max 8 MB, MIME whitelist: imagini, PDF, txt, log, csv, json, mp4/mov/webm, zip)
  - `GET /api/admin/support/tickets` (admin) — listă cu filtre `status_filter` + `q` (caută în titlu/mesaj/email/nickname)
  - `PATCH /api/admin/support/tickets/{id}` (admin) — actualizează status: open/in_progress/resolved/closed
- **Frontend**:
  - `/support` (`SupportPage.jsx`): pagină elegantă cu listă tickete, dialog "Solicitare nouă" (titlu + mesaj + atașament cu drag-area buton), dialog conversațional cu bule de mesaj (admin badge auriu cu Shield), reply în thread, lock când ticketul e închis.
  - `/admin/support` (`AdminSupport.jsx`): tabel cu toate ticketele, filtru de status + search, dialog detaliu cu butoane pentru schimbarea statusului + reply.
  - Link **Support** în header (vizibil doar la utilizatori autentificați) + în sidebar-ul admin (icon LifeBuoy).
- **Testat E2E**: create ticket (curl + UI), admin listează 2 tichete, admin răspunde → status devine in_progress automat, admin marchează rezolvat → toast & badge actualizate, alt user primește 403 la /tickets/{id}, neautentificat → 401. DB curățat la final.

### 2026-06-01 — Download episoade (PLUS only)
- Backend nou: `POST /api/me/episodes/{id}/download-link` (auth + PLUS) returnează un URL semnat `/api/episodes/download?dt=<JWT 5min>` + `filename`.
- Backend nou: `GET /api/episodes/download?dt=...` validează JWT (scope=download), reverificăm PLUS-ul, rezolvăm `video_url` la calea reală sub `VIDEO_DIR`/`UPLOAD_DIR` (protecție path-traversal), streamăm fișierul cu `Content-Disposition: attachment` + `Cache-Control: private, no-store`.
- Frontend (`CartoonDetailPage.jsx`): pe rândul fiecărui episod, pentru utilizatorii PLUS apare iconița **Download** (lângă „+ playlist"). Click → cere link semnat → declanșează `<a download>` cu `filename` (ex. `Episodul 1.mp4`). Buton blocat în timpul cererii ca să nu se genereze 2 link-uri.
- Testat E2E: 5 butoane în DOM pentru PLUS, descărcare confirmată cu Playwright `download` event (`Episodul 1.mp4`, 51200 bytes), 0 butoane pentru free, 403 pe API pentru free, 401 pentru token invalid/expirat.

### 2026-06-01 — Playlist player: păstrează fullscreen la auto-advance
- `PlaylistPlayerPage.jsx`: eliminat `key={active.episode_id}` de pe `<video>` (forțarea unmount/remount era cauza ieșirii din fullscreen). Acum păstrăm același element DOM între episoade și schimbăm `src` imperativ (`v.src = ...; v.load(); v.play()`).
- Pentru iOS Safari, care iese nativ din fullscreen la swap-ul de `src`, am adăugat detectare cu `webkitDisplayingFullscreen` + re-intrare automată în fullscreen pe `loadeddata` dacă era activ înainte de tranziție.
- Testat în Playwright: același element (`data-tag` persistat) după Next și după `onEnded` auto-advance pe toate cele 3 episoade.

### 2026-05-31 — Cartoon page: admin DnD episode reorder + copy tweaks
- New backend endpoint `POST /api/admin/cartoons/{cartoon_id}/episodes/reorder` body `{episode_ids:[...]}` — writes `sort_index` on episodes via bulk_write.
- Detail query now sorts by `(sort_index, season, episode_number)` so the order is persisted for every viewer.
- `CartoonDetailPage.jsx`: when `user.role === "admin"`, episode cards become HTML5-draggable with a `GripVertical` handle, a "Trage pentru a reordona" hint, ring highlight on drag-over, optimistic UI, and toast rollback on failure.
- Non-admin users see the same custom order but no drag affordances.
- Homepage copy: "Tezaurul este deschis" → "Bine ai venit în platformă!"; section eyebrow "Tezaur" → "Colecție".

### 2026-05-31 — Admin Users: last activity, IP & ban controls
- `/admin/users` tabel acum afișează coloana **Ultimă activitate** cu:
  - timpul relativ (Online / acum X min / acum X h / dată absolută pentru >7z)
  - timestamp absolut (format `dd.mm.yyyy, HH:MM`)
  - IP-ul ultimei activități (`last_ip`)
  - indicator verde pulsativ "Online" dacă activitatea e ≤90 s
- Dropdown de acțiuni pe fiecare utilizator (`MoreHorizontal` button):
  - **Banează utilizator** → modal cu motiv opțional → `POST /api/admin/users/{id}/ban`
  - **Deblochează utilizator** (apare doar când e banat) → `POST /api/admin/users/{id}/unban`
  - **Banează IP (xxx.xxx.xxx.xxx)** → modal cu motiv → `POST /api/admin/users/{id}/ban-ip` (folosește `last_ip`)
  - **Șterge utilizator** (existent)
- Badge `BANAT` (roșu) afișat în rândul utilizatorilor suspendați.
- Auto-refresh la 30 s pentru a păstra "ultima activitate" actualizată.
- Acțiunile pe rândul admin-ului propriu sunt dezactivate.
- Backend tracking deja existent: middleware actualizează `last_active` + `last_ip` la fiecare cerere autentificată; cererile de la IP-uri din colecția `banned_ips` sunt respinse.
- Testat E2E (testing_agent_v3_fork iteration_4) — 100% pass pe 8 scenarii: afișare, ban, unban, ban IP, search, self-row disabled.


### 2026-05 (latest — Playlist with episode-level items + auto-advance player)
- **CartoonDetailPage scroll fix**: lista de episoade are acum `max-h-[70vh] overflow-y-auto` cu scrollbar custom (`.ep-scroll` în index.css). Lista de 10+ episoade este complet accesibilă.
- **Playlist-uri cu items la nivel de episod** (`models.Playlist.items: List[PlaylistItem]`, fiecare `{cartoon_id, episode_id}`):
  - `POST /api/me/playlists/{id}/episodes` body `{cartoon_id, episode_id}` — adaugă un singur episod
  - `POST /api/me/playlists/{id}/items` body `{cartoon_id}` (legacy) — adaugă toate episoadele unui desen
  - `GET /api/me/playlists/{id}` — returnează `resolved_items[]` cu episode + cartoon rezolvate (pentru player)
  - `POST /api/me/playlists/{id}/reorder` body `{episode_ids: [...]}` — reordonare
  - `DELETE /api/me/playlists/{id}/episodes/{episode_id}` — elimină un episod
- **UI nou pe CartoonDetailPage** (PLUS only):
  - Buton „Adaugă în playlist" lângă favorite — deschide `AddToPlaylistDialog` în mod `cartoon`
  - Buton „+" pe fiecare rând de episod (apare la hover) — deschide dialog în mod `episode`
- **Component nou `AddToPlaylistDialog`**: listă playlist-uri existente cu număr de episoade, indicator „Adăugat" pe playlist-urile care conțin deja episodul, + creare inline cu un singur click
- **Pagină nouă `/playlist/:id` (`PlaylistPlayerPage`)**:
  - Layout split: video player + sidebar queue „În coadă"
  - **Auto-advance**: `<video onEnded={goNext}>` — la final, trece automat la următorul episod
  - Buton Anterior/Următor + buton Loop (repetă playlist-ul la final)
  - Buton X pe hover pentru a elimina un episod din coadă
  - Auto-play la schimbarea episodului activ
- **ProfilePage**: card-uri playlist cu buton „Redă" (navighează la /playlist/:id) + buton ștergere pe hover
- **Tests**: `/app/backend/tests/test_playlists.py` (13/13 passing)
- **Pagina `/staff`** — formular pentru a aplica la staff Cartoonix:
  - Accesibilă și în Presentation Mode + Early Access Mode (adăugată în ambele allow-list)
  - 6 secțiuni: Informații de bază (vârstă, vechime, frecvență), Motivație, Experiență (moderare + gestionare conflict), 3 scenarii practice (spam/toxic-joke/prieten încalcă reguli), Disponibilitate (ore + intervale), Extra (sugestii)
  - Card de status elegant care înlocuiește formularul după aplicare: 🟡 În revizuire, 🟢 Acceptat, 🔴 Respins — cu notă opțională de la admin
  - Permite re-aplicare după respingere
- **Backend `staff.py`**: colecție nouă `staff_applications` (indexat unique pe `user_id`)
  - User endpoints: `GET /api/staff/me`, `POST /api/staff/apply`
  - Admin endpoints: `GET /api/staff/admin/applications?status=...`, `GET /admin/applications/{id}`, `PATCH /admin/applications/{id}/status`
  - La schimbare status admin → notificare auto în Inbox-ul utilizatorului
- **Admin Panel `/admin/staff`** (link nou în sidebar AdminLayout): stats pe 4 categorii, filtre pending/accepted/rejected/all, căutare nickname/email, dialog cu toate răspunsurile + selector status + notă admin
- **Chat live limitat la 200 mesaje** — atât la fetch (`limit=200`) cât și la append-ul optimistic (`slice(-200)`) — backend cap-uia deja la 200

### 2026-02 (earlier — Yahoo Messenger ASCII shortcuts full set)
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
