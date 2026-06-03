# Cartoonix — PRD

## Original Problem Statement
Cartoonix este o platformă nostalgică de streaming dedicată desenelor din epoca Jetix, Cartoon Network și Minimax, cu rol de comunitate (chat live, playlist-uri, favorite, badge-uri PLUS, concursuri, transmisiuni live).

## Recent Issues Handled
1. ✅ Player video nu pornea automat primul episod — REZOLVAT (anterior). `<video src>` declarativ + `useEffect` pe `activeEp.id` care apelează `load()+play()`.
2. ✅ Statusul „Vizionat" se pierde la refresh — REZOLVAT (anterior). `GET /api/me/cartoons/{id}/watched-episodes` populează `watchedIds` la mount + persistă imediat după 5s + reîmprospătare la 30s.
3. ✅ Contor utilizatori online în colțul stânga-jos — REZOLVAT (Feb 2026).
   - Componentă nouă: `/app/frontend/src/components/OnlinePresenceBadge.jsx`
   - Montată global în `PublicLayout.jsx` (apare pe toate paginile publice)
   - Folosește endpoint-ul lightweight existent `GET /api/presence/online` (count indexat pe `chat_online.last_seen`)
   - Polling 60s, doar când tab-ul e vizibil (pauză automat în background)
   - Trimite heartbeat la `/api/chat/heartbeat` la 60s pentru utilizatorii autentificați
   - Design: pill cu blur, punct verde pulsatil + iconiță Users + count + label "online"
   - data-testid: `online-presence-badge`, `online-presence-count`

## Architecture
- Backend: FastAPI (`/app/backend/server.py`, ~3.3k linii) + MongoDB
- Frontend: React + Vite + Tailwind + shadcn/ui
- Auth: JWT custom
- Chat / Presence: `chat_online` collection cu TTL index pe `last_seen` (expiră la 600s)
- Live: maraton programat configurabil din admin

## Key Endpoints (presence)
- `GET /api/presence/online` — public, returnează `{online_total: int}` cu prag 90s
- `POST /api/chat/heartbeat` — autentificat, actualizează `chat_online.last_seen`
- `GET /api/chat/presence` — autentificat, întoarce și `online_plus`

## Roadmap (Backlog)
- P2: Hoist presence state into React context dacă tot mai multe componente vor avea nevoie (acum doar `ChatWidget` + `OnlinePresenceBadge` o consumă, fiecare cu propriul polling — acceptabil).
- P2: Animație număr (count-up) când contorul se schimbă, pentru efect WOW.
