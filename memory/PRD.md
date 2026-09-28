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

## Pending / Next (v2)
- User să testeze vizual: fundalul nou pe /halloween, galeria de avatare din Profil → Inventar.
- Dacă fundalul generat nu se potrivește exact cu imaginea originală, poate fi înlocuit
  ulterior dacă user retrimite imaginea (posibil ca nou asset într-un job nou).
