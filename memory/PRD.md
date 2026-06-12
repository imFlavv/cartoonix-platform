# Cartoonix — PRD

## Original Problem Statement
Cartoonix este o platformă nostalgică de streaming dedicată desenelor din epoca Jetix, Cartoon Network și Minimax, cu rol de comunitate (chat live, playlist-uri, favorite, badge-uri PLUS, concursuri, transmisiuni live).

## Recent Fixes (Feb 2026)

### ✅ Pagina /festival — redesign cinematic independent (P0) — Feb 2026
- `FestivalPage.jsx` rescris complet ca pagină **standalone**: fără `PublicLayout`, fără `TopNav`, `AnnouncementBar`, `Footer`. Sesiunea utilizatorului rămâne intactă prin `RequireAuth` la nivel de rută.
- `/festival` adăugat în `HIDDEN_PREFIXES` din `OnlineUsersMount` ca să ascundă și widget-ul de online.
- Layout nou, editorial / cinematic:
  - Hero full-viewport cu titlul „CARTOONIX / Fest" în 2 niveluri (gradient amber → orange peste italic light)
  - Countdown minimal (zile · ore · min · sec) cu typography mare, tabular-nums, separatori discreți
  - Manifest asimetric (titlu pe stânga, copy pe dreapta)
  - 4 piloni glass cu watermark de zi (01–04), hover lift + linie aurie
  - Secțiune de închidere cu citat italic + chip „Pregătește-ți Festival Pass-ul"
- Singura piesă de UI globală: link discret „Înapoi la Cartoonix" fix sus-stânga.
- Fallback mobil: `background-attachment: scroll` pe ≤768px (fix iOS).
- Verificat vizual desktop + mobil.

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
