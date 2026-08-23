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
- Chat perf: /chat/stats + /chat/leaderboard now use a global TTL cache (30s/45s) so the heavy
  aggregations over chat_messages run at most once per interval across ALL users (was per-user-per-poll,
  which loaded the live DB and slowed /shows). Leaderboard OWNER/PLUS text pills removed.
- Watch progress: sidebar shows watched (green check + 'Vizionat') and 'continuă X%' + progress bar;
  fixed vanishing green check after autoplay-next (unmount save no longer overwrites completed=true).
  Verified e2e (iteration_7.json).
- Watch Party guests (non-owner) get a custom control bar with ONLY volume + fullscreen (no play/pause/seek).
- PERF FIX (/shows): the list endpoint used to embed ALL episodes per show (thousands on live → several MB,
  ~4.3s response). Now GET /api/shows returns a LIGHT payload (episodes excluded, adds episode_count) via
  aggregation; pass ?full=true for full episodes. Callers: Home/Browse/Cinema/NavBar use light (fast);
  Admin.jsx and WatchParty.jsx pass full=true (need episodes). ShowDetail/Watch use /shows/{id} (unchanged).
- Chat verified badge: admins get a blue verified checkmark (VerifiedBadge.jsx, inline SVG) next to their
  name in chat, shown BEFORE the PLUS badge; both can appear. Same size (h-3.5 w-3.5) and aligned via
  flex items-center gap-1. Gated by m.role === "admin".

## Credentials
See `/app/memory/test_credentials.md` (admin@cartoonix.ro).

## Recent changes (Aug 2026, Live TV / Cartoonix TV)
- Pagină nouă `/live` (Cartoonix TV): canal stil TV care redă TOATE desenele din platformă
  aleator și non-stop, unul după altul, FĂRĂ posibilitatea de a schimba episodul (doar volum + fullscreen).
  - Backend: `GET /api/live/playlist?count=N` (auth). Aplatizează episoadele (unwind + project lightweight:
    show_id, show_title, channel, thumbnail, episode_number/title, video_url, duration) și întoarce un
    eșantion RANDOM. Index-ul aplatizat e ținut într-un cache in-memory `_LIVE_CACHE` cu TTL 300s
    (`allowDiskUse=True`) → agregarea grea rulează cel mult o dată la 5 min, NU atinge /shows sau /watch.
  - Frontend: `pages/Live.jsx`, lazy-loaded în App.js (bundle separat, ca /land), rută ProtectedRoute
    (doar logați). Link „Live TV" în NavBar (icon Tv). Player: `<video>` fără controale native, autoPlay,
    start muted (pentru autoplay), custom bar DOAR volum + fullscreen (pattern de la WatchParty guest).
    Același element `<video>` (schimbă doar src) → fullscreen persistă între episoade. onEnded → următorul.
    Robustețe: `onError` + watchdog 12s → auto-skip episod stricat/lipsă ca stream-ul să nu se blocheze.
    Prefetch alt lot când index >= len-4. "Bug" logo TV în colț dreapta-sus (placeholder CSS „Cartoonix ●LIVE",
    de înlocuit cu logo-ul oficial). EPG „Program" în dreapta: 5 rânduri cu offset [-1,0,1,2,3] → poziția 2
    e mereu „ACUM" (chenar roșu), poziția 1 „A rulat" (precedent), pozițiile 3-5 „Urmează"; la trecerea la
    următorul, lista urcă automat (curentul rămâne pe poziția 2). NU e clickabil (nu poți schimba episodul).
  - NOTĂ preview: redarea efectivă NU se poate demonstra în preview — URL-urile sample Google sunt blocate
    de browser (ERR_BLOCKED_BY_ORB) și fișierele reale de bibliotecă (/api/media/videos/...) dau 404
    (fișierele fizice sunt doar pe VPS-ul live). Pe live, fișierele reale se redau normal. Logica (autoplay,
    auto-skip, derulare EPG, bara volum/fullscreen, link NavBar, endpoint random) verificată în preview.
- Live TV BETA gate + logo oficial: `/api/live/playlist` acum cere PLUS (403 pentru FREE). Frontend:
  utilizatorii FREE văd un ecran BETA (data-testid live-beta-gate) cu badge LIVE+BETA, mesaj că e
  disponibil doar pentru PLUS momentan, și buton spre /plus (live-beta-upsell). Utilizatorii PLUS văd
  player-ul. Logo-ul din colț (live-logo-bug) e acum imaginea oficială `/cartoonix-live-logo.png`
  (fundal făcut transparent prin flood-fill din colțuri, păstrând textul alb „LIVE TV"). Ambele stări
  verificate vizual (FREE→gate, PLUS→player cu logo).
- Live TV SINCRONIZAT (aceeași transmisiune pentru toți): în loc de playlist random per-client, acum e
  un „broadcast" real. Backend păstrează în db.settings `live_schedule` = {epoch, seed}; din seed se
  reconstruiește DETERMINIST ordinea amestecată a episoadelor + durata fiecăruia (_dur_to_seconds).
  `GET /api/live/now` (PLUS-only) calculează din ceasul serverului: pos=(now-epoch)%total → index curent
  + offset în episod + prev + next[4]. Astfel orice utilizator/cont/dispozitiv vede exact același desen
  la aceeași secundă; la reintrare NU mai pornește alt desen. Programul se rotește automat la 24h.
  Frontend Live.jsx: nu mai ține coadă locală; face poll la /live/now la 8s, setează src pe current și
  face seek la `offset % video.duration` (modulo → chiar și clipurile scurte se buclează în lockstep la
  toți), corectează drift-ul >4s, iar la `ended` re-sincronizează. EPG afișează prev/ACUM/next[0..2].
  Verificat: /live/now determinist (offset avansează cu timpul, index stabil), persistat în DB, ecranul
  PLUS afișează exact currentul serverului (Ninja Force Ep1). Redarea efectivă nu se poate demonstra în
  preview (404/ORB), dar pe live se va reda stream-ul sincronizat.
- FIX Live TV repetări/tăieri: cauza = slotul din program folosea eticheta duratei ("22 min"=1320s),
  care nu se potrivea cu lungimea reală a fișierului → dacă real > slot, episodul era tăiat; dacă
  real < slot, clientul îl bucla (offset % durata) de 3-4 ori. Soluție: durate reale. Client raportează
  `POST /api/live/report_duration` {show_id, episode_number, duration} la loadedmetadata (o dată/episod);
  serverul salvează în colecția `live_durations`, bumpează `_LIVE_DUR_VER` și reconstruiește programul
  folosind durata reală când e cunoscută (altfel eticheta). Clientul NU mai buclează (fără modulo, seek
  direct la offset), iar la `ended` face poll scurt (600ms x8) până serverul trece la următorul → handoff
  fără pauză. Se auto-corectează din prima redare. Verificat cap-coadă cu curl: raportarea persistă în DB
  și slotul episodului trece de la 1320 la valoarea reală (ex. 95s), programul se recalculează corect.

## Recent changes (Aug 2026, redare playlist)
- Redare continuă din playlist / favorite ("queue mode"): user pornește redarea DOAR pentru episoadele
  din playlist-ul lui sau din favorite, cu auto-advance între episoade (chiar din desene diferite).
  - Profile.jsx: buton "Redă tot" (testid play-all-favorites + play-playlist-<id>) → funcția playQueue()
    filtrează favoritele de tip serial complet (episode_number===0), salvează coada în sessionStorage
    (lib/queue.js) și navighează la primul episod cu `?queue=1`.
  - Watch.jsx: detectează `?queue=1`, încarcă coada din sessionStorage. onEnded + butonul "Următorul"
    avansează la următorul item din coadă (nu la ep+1 al aceluiași desen). Sidebar dedicat
    (watch-queue-list) cu itemii cozii + item activ evidențiat + buton X (watch-queue-exit) pentru a ieși.
    Badge în bara de sus (watch-queue-badge) "Nume playlist · index/total". Când NU e queue mode,
    rămâne sidebar-ul normal de episoade. Verificat vizual e2e: play-all favorite (filtrează ep0),
    avans "Următorul" între desene diferite (Space Buddies Ep1 → Captain Nova Ep2), badge 2/2,
    buton "Următorul" ascuns la ultimul item. Fără modificări backend (folosește /favorites + /playlists).

## Recent changes (Aug 2026, cont.)
- Admin: creare manuală utilizator. Buton `create-user-btn` în tab Membri deschide dialog
  (`create-name` / `create-email` / `create-password` / `create-plus` toggle / `save-new-user`) →
  POST /api/admin/users (name,email,password,plus). Contul e creat `email_verified=true` (fără OTP),
  se poate loga imediat. Duplicat → 400 "Acest email este deja folosit". Verificat e2e (iteration_8, 100%).
- FIX "A apărut o eroare" la OTP (ROOT CAUSE): backend răspundea cu 5xx (502 Brevo eșuat / 500
  register_verify), iar proxy-ul Cloudflare ÎNLOCUIA corpul JSON cu propria pagină "Bad gateway" →
  frontend-ul nu primea `detail` → afișa mesajul generic. Fix: aceste erori user-facing întorc acum
  status 400 (register/start Brevo fail + register/verify catch-all), deci `detail` ajunge la
  `formatApiErrorDetail` și se afișează mesajul specific român. Verificat e2e (iteration_8).
- Fullscreen la autoplay: Watch.jsx refolosește același element <video> (schimbă src la navigate,
  fără remount/key) ca fullscreen-ul să persiste la trecerea la episodul următor. NU a putut fi
  testat automat (fullscreen greu de automatizat) — necesită validare manuală de către user.
- Download dezactivabil per desen: câmp `download_disabled` (bool) pe show. Toggle în AdminShowEditor
  ("Dezactivează descărcarea", testid edit-show-download-disabled). Backend: ShowUpdate acceptă câmpul;
  GET /api/download/{sid}/{ep} întoarce 403 "Descărcarea este dezactivată pentru acest desen" dacă e activ.
  Frontend ascunde butonul Descarcă în ShowDetail.jsx + Watch.jsx când show.download_disabled. Verificat
  backend cu curl (403) + toggle vizibil în UI.
- FIX /land 403 pe LIVE (ROOT CAUSE): folderul de assets `frontend/public/land/` (ORIGINAL.png etc.)
  se ciocnea cu ruta React `/land`. La accesarea `cartoonix.ro/land/` (cu slash final), serverul web
  găsea directorul fizic `land/` (fără index, listare off) → 403 Forbidden. Fix: redenumit folderul în
  `public/land-assets/` + actualizat căile în Land.jsx (`/land-assets/ORIGINAL.png`,
  `/land-assets/building-glow.webp`). Verificat în preview la `/land/` (HD 4128px se încarcă). ⚠️ Necesită
  REDEPLOY pe live ca fix-ul să ajungă pe cartoonix.ro.

