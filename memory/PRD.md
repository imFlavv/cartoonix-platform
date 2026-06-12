# Cartoonix — PRD

## Original Problem Statement
Cartoonix este o platformă nostalgică de streaming dedicată desenelor din epoca Jetix, Cartoon Network și Minimax, cu rol de comunitate (chat live, playlist-uri, favorite, badge-uri PLUS, concursuri, transmisiuni live).

## Recent Fixes (Feb 2026)

### ✅ Pagina /festival — Cartoonix Fest (P0) — Feb 2026
- Pagină nouă `/app/frontend/src/pages/FestivalPage.jsx`, rută protejată cu `RequireAuth` în `App.js`.
- Fundal artwork (`/festival/bg.jpg` — sunset / deal / copac) afișat fix prin `background-attachment: fixed` cu overlay gradient subtil (0.30 → 0.55 → 0.82) ca textul să rămână lizibil fără a strivi culorile.
- Countdown elegant până la 1 iulie 2026 00:00 (Europe/Bucharest), unități rotunjite cu gradient amber → orange.
- Imaginea `pass.png` (preview comunitate) afișată în cadru cu glass + drop-shadow + animație float blândă (`festPassFloat 7s`).
- Copy nostalgic: maratoane Cinema Retro, Scena Live, quiz-uri, Lobby, Watch Parties, Festival Pass + insigne, obiecte ascunse.
- Link `Festival` în `TopNav` (desktop + burger mobil) cu badge subtil „IULIE" pentru a semnala evenimentul.
- Verificat: screenshot desktop + mobil — fundalul, countdown-ul și pass-ul afișate corect.

### ✅ Player video — primul episod se încarcă automat (P0)
- Fix anterior. `<video src>` declarativ + `useEffect` pe `activeEp.id` apelează `load()+play()`.

### ✅ Persistență „Vizionat" tied to account (P0) — Feb 2026
- **Root cause**: Statusul era salvat doar după ≥5s de redare (în `onTimeUpdate`). Dacă autoplay era blocat sau utilizatorul ieșea repede, nimic nu se salva în backend. În plus, badge-ul local apărea chiar dacă POST-ul către `/me/history` eșua silent (catch swallowing).
- **Fix** (`/app/frontend/src/pages/CartoonDetailPage.jsx`):
  - Adăugat handler `onPlay` care marchează episodul ca „Vizionat" IMEDIAT ce playback-ul începe (POST + setWatchedIds doar după success).
  - Funcție nouă `persistWatched(epId, progress)` — POST mai întâi, apoi actualizează UI-ul local DOAR la succes. Toast de eroare la eșec (nu mai există catch silent).
  - `onTimeUpdate` reține rolul de progres-refresh la fiecare 30s pentru resume.
- **Verificat**: Test e2e cu Playwright — episodul rămâne marcat ca „Vizionat" după navigare la home și retur, plus în backend (`GET /me/cartoons/{id}/watched-episodes` returnează corect).

### ✅ Contor utilizatori online stânga-jos (P1) — Feb 2026
- Componentă nouă `/app/frontend/src/components/OnlinePresenceBadge.jsx`, montată în `PublicLayout`.
- Endpoint backend: `GET /api/presence/online` (count Mongo cu index TTL pe `chat_online.last_seen`).
- Polling 60s + heartbeat 60s, doar când tab-ul e vizibil. Fără lag.
- Design: pill blur, punct verde pulsatil, iconiță Users, count + label „online".
- data-testid: `online-presence-badge`, `online-presence-count`

## Architecture
- Backend: FastAPI (`/app/backend/server.py`, ~3.3k linii) + MongoDB
- Frontend: React + Vite + Tailwind + shadcn/ui
- Auth: JWT custom (interceptor în `/app/frontend/src/lib/api.js`)
- Chat / Presence: `chat_online` collection cu TTL index pe `last_seen` (expiră la 600s)

## Key Endpoints
- `GET /api/presence/online` — public, returnează `{online_total: int}` cu prag 90s
- `POST /api/chat/heartbeat` — autentificat, actualizează `chat_online.last_seen`
- `POST /api/me/history` — upsert watch entry (user_id + episode_id)
- `GET /api/me/cartoons/{cartoon_id}/watched-episodes` — list of watched episode ids for current user

## Roadmap (Backlog)
- P2: Animație count-up când contorul online se schimbă
- P2: Hover pe badge online → popover cu top 10 nicknames + avatare (social proof / engagement)
- P2: Hoist presence state într-un React context (acum doar 2 consumatori — acceptabil)
