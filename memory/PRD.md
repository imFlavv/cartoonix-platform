# Cartoonix — PRD

## Original Problem Statement
Cartoonix este o platformă nostalgică de streaming dedicată desenelor din epoca Jetix, Cartoon Network și Minimax, cu rol de comunitate (chat live, playlist-uri, favorite, badge-uri PLUS, concursuri, transmisiuni live).

## Recent Fixes (Feb 2026)

### ✅ Popup promoțional WEEKEND20 pentru FREE (P0) — Feb 2026
- Componentă nouă `/app/frontend/src/components/PromoUpgradeModal.jsx`, montată în `App.js` ca overlay global.
- Reguli vizibilitate:
  - **Doar useri FREE logați** (`subscription !== 'plus'`, `role !== 'admin'`).
  - Ascuns pe `/login`, `/register`, `/verify`, `/reset-password`, `/forgot-password`, `/early-access`, `/admin`, `/festival`, `/terms-and-conditions`, `/gdpr`.
  - Ascuns când `maintenance_mode` sau `early_access_mode` e activ.
  - Apare cu un delay de 1.4s ca să nu lovească instant la încărcare.
- Persistență dismiss: `localStorage.cartoonix_promo_weekend20_v1` cu map `{userId: timestamp}` — apăsare pe ✕ / „Poate altă dată" / backdrop oprește definitiv apariția.
- UI: card glass amber cu glow, eyebrow „Ofertă de weekend", titlu „Treci pe Cartoonix PLUS cu −20%", code box cu border dashed și buton de copiere (clipboard API + toast feedback), CTA principal „Aplică reducerea" (deschide checkout-ul Stripe + copiază codul automat în clipboard) și buton secundar „Poate altă dată".
- Hint dedesubt: „Codul se introduce în câmpul Add promotion code din pagina de plată Stripe."
- **De activat manual în Stripe Dashboard**: pe Payment Link-ul de upgrade — toggle „Promotion codes" + crearea cuponului `WEEKEND20` 20% off.

### ✅ /festival v3 — fără italic, efecte și casete + secțiune Pass (P0) — Feb 2026
- Eliminat tot textul italic înclinat. Hierarhia este realizată acum prin weight, scale și gradient.
- Hero re-stilizat: titlu „CARTOONIX FEST" cu gradient amber→orange + pastilă neon, countdown afișat în 4 stat-boxes glass cu hairline neon (orange / amber / pink / purple) și halo radial.
- Manifest: copy mutat într-un card glass cu border subtil, accentul „ne întoarcem acasă" cu gradient amber→pink→purple.
- **Nouă secțiune Pass** (`/festival/pass-lanyard.png`): lanyard real cu halo conic-spin animat (`festSpin 22s`), spotlight purple, sway 7s. Lângă imagine: 4 perks (QR, tier-uri, acces, boost-uri) ca grid de carduri cu iconițe pink, plus chip-uri pentru tier-urile Standard / Creator / MVP cu dots glow colorate.
- Piloni rescriși: fiecare card primește un accent color propriu (orange, amber, pink, purple), iconiță în box glow + watermark de zi.
- Adăugat overlay subtil tip grilă pentru un feel „festival floor".

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
