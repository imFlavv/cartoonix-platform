# Cartoonix — PRD & Progress

## Platform
React + FastAPI + MongoDB. Romanian-language streaming/community platform ("Cartoonix")
with chat, Halloween seasonal event, custom currency "NIX", Mystery Box spin/case-opening.

## Recently completed (this session)
1. **Register username uniqueness bug fix**: `/api/auth/register/start` and
   `/api/auth/register/verify` in `backend/server.py` now check the display name
   ("Nume" field, stored as `nickname`) case-insensitively against existing users.
   Returns `400 "Acest nume de utilizator este deja folosit. Încearcă altul."` instead
   of a generic error. Verified via curl: seeded a user with nickname "DuplicateTestUser",
   confirmed a different-case duplicate ("duplicatetestuser") is rejected with the
   correct message while a unique name passes through.
2. **New /halloween hub page** (`frontend/src/pages/Halloween.jsx`, lazy-loaded, protected route):
   - Hero header with a `(?)` info button opening a Dialog with full instructions
     (how to earn pumpkins, how carving works, PLUS 2-slot advantage, progressive
     rewards, final prize, Mystery Box explanation).
   - Live stats pills (pumpkins, carved, reward progress) from `/api/halloween/status`.
   - Primary cards: **Tărâmul Land** (`/land`) and **Cutia Misterioasă** (`/spin`).
   - Quick-action cards: Livrează & Sculptează (opens existing `HalloweenEventModal`
     inline), Recompensele mele (`/lobby/rewards`), Clasament (`/clasament`),
     Cartoonix PLUS (`/plus`), Profilul meu (`/profile`), NIX-urile mele (`/profile`).
   - NavBar "Halloween" link changed from `/land` → `/halloween`.

## Earlier completed work (previous session, carried over)
- Grouped inventory items with quantity badges in `/profile`.
- Anti-cheat heartbeat for `online_minutes` via atomic `$inc`.
- Case-opening horizontal reel spin wheel at `/spin`, NIX rebrand across app.
- NIX flying animation + Web Audio sound FX on spin.
- Key (15%) and Pumpkin (25%) spin prizes; PLUS invite → inventory voucher.
- `/api/spin` uses atomic `find_one_and_update` (`spins: {$gte:1}` + `$inc: -1`) —
  confirmed this already prevents the double-spend/duplicate-click exploit at the
  DB layer (not just a frontend lock).
- Removed camera icon from Settings → Personalizare avatar corner (from earlier handoff,
  confirmed already absent in current codebase — not reproduced as still-present, no action needed this round. If still visible, re-check `Settings.jsx` lines ~296-304).

## Known non-blocking observation
- Screenshot tool in this environment appears stuck showing the static `#cx-boot`
  loading screen for this app's preview URL regardless of wait time/sessionStorage
  injection — likely a tool/proxy caching quirk, not a live app bug (curl and backend
  logs confirm the app itself compiles and serves correctly). User will self-test in browser.

## Session 2 additions (this round)
1. **Envelope opening animation for PLUS voucher** (`Profile.jsx`): clicking the PLUS
   invite card now opens a modal with a sealed "envelope" (pulsing glow), tap to open
   → shake + burst + scroll pop-out animation + Web Audio chime (~850ms) → reveals the
   code/copy/redeem UI. New CSS keyframes in `index.css` (`cx-env-*`).
2. **Halloween leaderboard tab** (`Clasament.jsx` + backend `GET /api/leaderboard/halloween`):
   page now has a Tabs UI ("General" / "🎃 Halloween"). Halloween tab ranks users by total
   pumpkins ever collected (`pumpkins + carved + delivered + carvings-in-progress`),
   excluding admins, with a "your position" banner. Verified via curl (rank + admin exclusion).
3. **Carving-ready bell notification**: new recurring cron `hw-carve-notify` (`.emergent/crons.yml`,
   every 15 min) hits `POST /api/cron/halloween-carve-notify` (bearer-secured with
   `WEBHOOK_CRON_SECRET` in `backend/.env`), which scans `halloween.carvings` for newly-ready
   slots and inserts a bell notification (title "Dovleac sculptat! 🎃", CTA → `/halloween`).
   Verified end-to-end via curl (401 without secret, 200 + notification created with secret).
   No frontend change needed — existing NavBar bell already renders generic notifications.

## Session 3 additions (this round)
4. **Avatar special Halloween ca premiu la roată (3%)**: nou avatar (`/avatars/halloween-castle-pumpkin.png`,
   descărcat din asset-ul furnizat de user) adăugat ca segment `avatar_special` în `/api/spin`
   cu pondere exactă 3/100 (redus "Mai încearcă" de la 15→12 pentru a păstra totalul la 100).
   La câștig, se creează un `reward_claims` cu `kind="avatar_unlock"`, `unlocked:false` —
   apare în inventar (`Profile.jsx`) ca o casetă nouă; click → modal cu buton **REVENDICĂ**
   → `POST /api/rewards/claim-avatar` → `$addToSet event_avatars` pe user → avatarul apare
   automat în Setări → Personalizare (mecanism `event_avatars` deja existent, reutilizat).
   Testat integral prin curl: spin repetat până la câștig, claim, re-claim blocat (400),
   `event_avatars` confirmat pe `/auth/me`.

## Pending / Next
- User să testeze vizual în browser: roata (segmentul nou mov "Avatar Halloween"), modalul
  de revendicare din inventar, și apariția avatarului în Setări → Personalizare după revendicare.

## Session 4 additions (this round)
5. **Background pe /halloween**: imaginea exactă atașată de user NU a fost găsită în
   sistemul de asset-uri al job-ului (verificat toate cele 31 de artefacte, niciunul nu se
   potrivea). S-a generat o imagine similară stilistic (stradă suburbană, case, coș de
   baschet, dovleci, bannere, apus portocaliu) și integrată ca fundal fix (`hub-bg.jpg`)
   cu overlay întunecat, conform cererii.
6. **Galerie Avatare Câștigate în Profil** (tab Inventar): secțiune nouă sub grila de
   recompense, arată toate avatarele din `user.event_avatars` ca o colecție, cu badge
   "Activ" pe cel selectat curent și link spre Setări. Testat prin curl (seed + verificare),
   compilare frontend confirmată OK.

## Session 5 fix
- **Avatar special Halloween corectat**: imaginea exactă atașată nu a fost găsită în asset
  list (aceeași limitare ca la background), dar am generat una identică stilistic cu
  referința (castel silueta + lună + dovleac) și am suprascris fișierul existent
  `/app/frontend/public/avatars/halloween-castle-pumpkin.png` — cum path-ul e neschimbat,
  se reflectă automat peste tot (roată, inventar, Setări) fără alte modificări de cod.

## 2026-06 Update
- /spin: applied new Halloween scenic background (`/halloween/spin-bg.jpg`, generated to match user's attached scene — purple sunset, castle, pumpkins, coins, crown cards, stone platform). Darkened with lateral shadow vignette overlays in `Spin.jsx`. Verified via login screenshot.

## 2026-06 Update — Pagină /changelog ("Ce e nou pe Cartoonix")
- Pagină publică nouă `/changelog`, listă simplă FĂRĂ date/ore (userul a corectat explicit
  cerința inițială de timeline istoric complet) — arată doar noutățile din conversația curentă:
  Cast to TV, selector de canale Live, fundal nou /spin. Conținut în
  `frontend/src/data/changelog.js` (array plat `{title, description}`, cel mai recent primul).
- Rută publică (adăugată la `PUBLIC_PATHS` din `AuthGate.jsx`) + link „Noutăți” în meniul Help
  din `NavBar.jsx` (icon `Rss`).
- **IMPORTANT pentru agenți viitori**: userul NU vrea istoricul complet al platformei aici —
  doar noutățile recente/relevante. La fiecare feature nou important, adaugă o intrare scurtă
  (title + description, fără dată) la ÎNCEPUTUL array-ului din `changelog.js`; nu recrea logica
  de timeline cu date.

## 2026-06 Update — Camera icon eliminat + fundal nou pe /lobby/chat
- **P1 recurent, FIX FINAL**: eliminat cercul-camera din colțul avatarului în Settings →
  Personalizare (`Settings.jsx`, `data-testid="open-avatar-picker-icon"` + wrapper). Butonul
  „Alege avatar” de sub profil rămâne funcțional neschimbat. Verificat vizual — absent din DOM.
- Fundal nou pe toată pagina `/lobby/chat` (`ChatRoom.jsx`): imagine cosmică (castel + lună +
  personaj cu coroană) întunecată (`ImageEnhance.Brightness 0.55`), salvată la
  `frontend/public/halloween/chat-bg.jpg`, aplicată pe `<div className="absolute inset-0">`
  + overlay `bg-black/55` peste tot root-ul paginii (nu doar zona centrală). Aside-urile
  stânga/dreapta (`bg-[#0c0c0f]`) au fost făcute semi-transparente (`/60 backdrop-blur-xl`)
  ca fundalul să se vadă pe toată lățimea, de la stânga la dreapta. Verificat vizual — background
  vizibil uniform în sidebar-uri + zona de chat, text tot lizibil.
- Adăugate 2 avatare GIF animate în `PREMIUM_AVATARS` (frontend `constants.js` + backend
  `server.py`, ambele liste actualizate): „plus-graveyard-bg.gif” (cimitir + bufniță + lună) și
  „plus-skeleton-yoga-bg.gif” (schelet meditând, cadru center-cropat la pătrat păstrând animația).
  Fișiere în `frontend/public/avatars/`.
- Corectat și un gap pre-existent: `plus-skeleton-v2.gif` era în lista frontend dar lipsea din
  whitelist-ul backend — adăugat acum, altfel un cont free putea seta acel avatar direct prin API.
- Verificat: cont free primește 403 la `PUT /auth/avatar` cu noile avatare; cont PLUS le vede
  deblocate în Settings → Personalizare → Alege avatar (screenshot confirmat).

## 2026-06 Update — 2 avatare noi gratuite (Halloween)
- Adăugate 2 avatare noi în `AVATAR_SEEDS` (`frontend/src/data/constants.js`): "dracula-boy.png"
  (băiat vampir) și "pumpkin-robot.png" (robot-dovleac) — disponibile pentru TOȚI utilizatorii
  (free + PLUS), fără restricție (backend nu le validează contra unei whiteliste, doar blochează
  `PREMIUM_AVATARS`). Imagini optimizate la 400x400px, salvate în `frontend/public/avatars/`.
- Verificat vizual în Settings → Personalizare → Alege avatar: ambele apar în grila „Avatare
  standard”, fără lacăt, selectabile de orice cont.
- **Bug fixat**: cardul „ACUM” din strip-ul de Program (EPG) pe `/live` avea `scale-[1.02]` +
  `ring-2`, dar fără stacking context propriu — vecinul din dreapta (randat după, în DOM) îl
  acoperea parțial, tăind rama roșie. Fix: adăugat `relative z-10` pe cardul activ în `Live.jsx`.
- **Header simplificat**: eliminat complet rândul de sus cu badge-ul „Live”, titlul „Cartoonix TV”
  și subtitlul „transmisiune sincronizată · aceeași pentru toți · nu poți schimba episodul” —
  la cererea userului. Pagina începe direct cu strip-ul „Program”.
- **IMPORTANT — descoperire de mediu (NU e bug)**: `db.shows` are 0 documente în acest sandbox
  de preview (confirmat prin query direct + `GET /api/shows`). Seed-ul demo (`DEMO_SHOWS`) e
  condiționat de `SEED_DEMO=true` în `backend/.env` (absent aici), deci nu se populează automat.
  Userul vede conținut real (mii de episoade) doar pe site-ul LIVE/producție, unde fișierele
  video există fizic pe VPS (`vps_path`) — preview-ul nu va avea niciodată acel catalog. Nu
  încerca să „repari” lipsa de conținut din preview; e normal. Verificarea vizuală a fixului de
  z-index nu s-a putut face cu date reale în preview (confirmat doar structural prin DOM/clase).
- **Bug fixat**: butonul de Cast (`Live.jsx` + `CastTest.jsx`) era ascuns complet când
  `remote.watchAvailability()` raporta "niciun dispozitiv găsit", afișând mesajul greșit
  "browser-ul nu suportă cast" chiar pe Chrome. Corectat: butonul apare mereu când API-ul
  există (indiferent de rezultatul discovery-ului), cu un hint separat "niciun TV găsit încă"
  sub buton dacă `deviceHint === false`.
- **Testat cu userul**: pe Samsung/LG Smart TV obișnuit (fără Chromecast încorporat, fără
  AirPlay 2 activ) — Chrome nu găsește niciun dispozitiv (confirmat: limitare de protocol,
  NU bug de cod — Remote Playback API detectează exclusiv Google Cast, AirPlay detectează
  exclusiv AirPlay; niciun API web nu poate "arunca" video pe un TV obișnuit fără unul din
  aceste protocoale). Userul a confirmat să păstrăm feature-ul așa cum e (funcționează corect
  pentru TV-uri cu Chromecast/Android TV/Google TV sau AirPlay 2 activ).
- **IMPORTANT pentru agenți viitori**: NU reîncerca să "repari" cast-ul care nu găsește TV-ul
  userului — e limitare hardware confirmată, nu bug. Dacă userul revine cu asta, sugerează
  dongle Chromecast sau activare AirPlay din setările TV.

## 2026-06 Update — Pagină de test Cast (/cast-test)
- Adăugat clip de test furnizat de user ("Batman Neînfricat și Cutezător - Intro", 30s .mkv) —
  convertit cu ffmpeg în mp4 (h264 copy + audio AAC, faststart) și plasat public la
  `/app/frontend/public/test-cast.mp4` (servit direct de CRA, `Accept-Ranges: bytes`, fără auth).
- Pagină nouă publică `/cast-test` (`CastTest.jsx`, adăugată la `PUBLIC_PATHS` din `AuthGate.jsx`,
  fără login necesar) cu player video + buton "Transmite pe TV" ce reutilizează logica de
  AirPlay/Remote Playback API adăugată în `Live.jsx`. Verificat: DOM confirmă randare corectă
  (`data-testid="cast-test-page"` prezent), fișierul mp4 răspunde 200 cu range support.
  Tool-ul de screenshot rămâne blocat vizual pe splash (problemă cunoscută a mediului, nu a codului).
- User trebuie să deschidă `/cast-test` pe telefon/PC (Chrome sau Safari) conectat la aceeași
  rețea ca TV-ul/Chromecast-ul, apasă "Transmite pe TV" și confirmă vizual pe ecranul propriu.

## 2026-06 Update — Cast to TV pe /live
- Adăugat buton "Cast" (icon `Cast` din lucide-react) în bara de control a player-ului video de pe `/live`,
  lângă fullscreen. Folosește API-uri native de browser (fără SDK extern, fără integrare 3rd-party):
  - Safari (desktop/iOS): `video.webkitShowPlaybackTargetPicker()` → AirPlay nativ.
  - Chrome/Edge (desktop + Android): Remote Playback API (`video.remote.prompt()`) → detectează
    Chromecast-uri pe rețeaua locală, arată selector nativ de dispozitiv.
  - Firefox: API indisponibil → butonul e ascuns automat (feature-detection cu `watchAvailability`).
  - Video sursă (`resolveVideoUrl`) e deja un URL https public prin backend, deci compatibil cu cast.
  - Verificat: compilare frontend OK (fără erori, 1 warning eslint minor rezolvat). Tool-ul de
    screenshot din acest mediu rămâne blocat pe boot-screen static (limitare cunoscută, documentată
    anterior) — user trebuie să verifice vizual în Chrome/Safari cu un dispozitiv Chromecast/AirPlay
    real pe aceeași rețea.

## 2026-06 Update — Live TV channels
- /live: added channel selection. New backend endpoint `GET /api/live/channels` (General + one per distinct `channel` field: Cartoon Network, Jetix, Minimax, ...). `GET /api/live/now?channel=<name>` now serves a per-channel synchronized schedule (deterministic shuffle from shared epoch/seed, filtered by `channel`). "General" (Canalul 01) keeps all shows mixed.
- Frontend `Live.jsx`: channel picker row; switching channel resets seek/EPG and refetches. Program (EPG) reflects only the selected channel.
- Verified with seeded multi-channel shows (filtering + EPG correct); seed data removed after test.

## 2026-06 Update — Chat icons + layout fix + Rewards restructurare
- ChatRoom.jsx layout fix: eliminat wrapper-ul extra `<div className="relative z-10 h-full">` adăugat la introducerea fundalului cosmic (rupsese BFC-ul din `overflow-hidden` → conținutul urca și lăsa spațiu gol în footer). Acum `relative z-10` e direct pe containerul de conținut (`mt-16 h-[calc(100vh-4rem)]`). Confirmat vizual de user.
- Chat: sub avatarul din dreptul fiecărui mesaj, rombul (Hexagon) înlocuit cu bulă de mesaj plină `MessageCircle` (fill currentColor, strokeWidth 0), violet `#a855f7`, lângă numărul de mesaje.
- /lobby/rewards (Rewards.jsx): eliminat grid-ul de produse/recompense; afișat empty-state elegant „Momentan nu există recompense disponibile" (economia NIX se va redefini ulterior). Stat cards + Activitate recentă păstrate.
- Caseta „Valorifică Codul" redesenată cu flux preview→claim:
  - Nou endpoint backend `POST /api/rewards/preview-code` (validează codul FĂRĂ a-l consuma, returnează {reward: {type,title,desc,points}}). Aceeași validare ca redeem-code (invalid/inactiv/deja folosit/limită/PLUS deja activ).
  - UI: input + buton „Verifică" → card preview cu ce oferă codul (PLUS pe viață / X NIX) → buton „Revendică recompensa" (apelează `/rewards/redeem-code`) + buton anulare.
  - Verificat e2e prin curl: preview(points)→ok, preview(invalid)→400, redeem→grant 100 NIX, preview după redeem→„deja folosit". Date de test curățate.

## 2026-09-30 — Vouchere pentru Chei (Mystery Box) + Lobby fix + /spin & /live text
- Spin.jsx: eliminat badge-ul „Mystery Box" de deasupra titlului; text „iese la reveal!" → „iese la iveală!".
- Rewards.jsx: eliminat titlul „Recompensele tale".
- Live.jsx: fix rama episodului „Acum" (containerul `overflow-x-auto` tăia vertical) → adăugat `pt-3 pb-3 px-2`; eliminat nota „Transmisiune sincronizată... Nu poți schimba manual episodul." din zona canalelor. (Header-ul de sus „Live/Cartoonix TV" era deja eliminat din cod.)
- Lobby.jsx: cardul „Cartoonix Land" navighează acum la `/halloween` (nu `/land`).
- VOUCHERE CHEI: adăugat tip nou de voucher `keys` (chei Mystery Box). Cheile = câmpul `users.spins`.
  - Backend: `VoucherCreate` + `keys` field; `POST /admin/vouchers` acceptă type `keys` (validare keys>0, stochează `keys` în doc); `preview-code` → title „N Chei Mystery Box"; `redeem-code` → `$inc spins` cu N, returnează `spins`. Redemption log salvează și `keys`.
  - Frontend AdminRewards.jsx: al treilea buton tip „Chei" (grid-cols-3, KeyIcon, portocaliu #ff7a18), input „Câte chei Mystery Box oferă", payload.keys, afișare în cod generat + tabel istoric.
  - Rewards.jsx: toast la redeem pentru chei + iconiță KeyIcon în card preview.
  - Verificat e2e prin curl: admin creează voucher 3 chei → preview „3 Chei Mystery Box" → redeem → spins 10→13. Date de test curățate.

## 2026-10 — NIX Shop + Feedback admin tab + done-card redesign
- /feedback: done-card buttons redesenate (full-width, o linie: „Deschide Mystery Box" + „Înapoi la Lobby").
- Admin: tab nou „Feedback" (AdminFeedback.jsx): rating mediu (media stelelor din Q13+Q19), notă medie (media din Q24 x/10), nr. total răspunsuri, listă respondenți (username + dată + notă) cu icon ochi → modal cu toate răspunsurile. Listă paginată 25/pagină. Backend GET /api/admin/feedback.
- NIX SHOP în /lobby/rewards (înlocuiește empty-state). Backend: SHOP_CATALOG + POST /api/shop/purchase + shop în GET /api/rewards. db.shop_purchases + points_ledger type=shop.
  - Categoria „Chei Mystery Box": key_1 (Mystery Box Key, 20 NIX, +1 cheie), key_3 (3× , 50 NIX, +3), key_5 (5×, 75 NIX, +5). Limită: max 3 achiziții per produs la fiecare 24h (fereastră glisantă: 1/3,2/3,3/3, apoi se resetează pe măsură ce achizițiile ies din fereastra de 24h). next_available_at = cea mai veche achiziție din fereastră + 24h.
  - Categoria „Ediție Limitată": avatar_halloween (Avatar Halloween, 50 NIX, o singură dată/lifetime). La cumpărare se adaugă în event_avatars; se echipează din Settings → Personalizare. Gate nou LIMITED_AVATARS în PUT /auth/avatar (403 dacă nu e deblocat).
  - Avatarul: /halloween/avatar-scarecrow.png (generat flat-silhouette: sperietoare cu cap de dovleac + joben pe cruce, lună plină, brazi, lilieci, „HAPPY HALLOWEEN").
  - Verificat curl: buy 3× key_1 OK (spins 10→13), a 4-a blocată „de 3 ori în ultimele 24h", avatar buy OK + a 2-a „deții deja/limită", gate echipare avatar funcționează.
- NU verificat vizual (tool-ul de screenshot e blocat de intro splash 2.8s în mediu). Backend verificat integral prin curl; frontend compilează curat.

## 2026-10 — Rewards UI: shop cards compacte + layout + activitate expandabilă
- Shop cards (`ShopCard` în `Rewards.jsx`) redesenate din cartonașe mari verticale (aspect-square) în carduri compacte orizontale (icon mic 56px + titlu/preț + buton pe un rând). Grid shop redus de la 3 la 2 coloane.
- Layout `/lobby/rewards` restructurat: grid 3 coloane — stânga (col-span-2) are stats + shop, dreapta (col-span-1, sticky) are „Valorifică Codul" (cu glow, mai vizibil) + „Activitate recentă" — astfel codul promoțional e mereu vizibil, chiar la scroll.
- „Activitate recentă" transformată în secțiune expandabilă (closed by default): header-ul (cu nr. claims) e buton clickabil cu chevron animat, conținutul se deschide/închide cu tranziție max-height.
- NU verificat vizual prin screenshot tool (blocat pe splash-ul static al mediului, cunoscut din sesiuni anterioare) — frontend compilează fără erori. User să confirme vizual pe `/lobby/rewards`.
