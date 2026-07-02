# Cartoonix — PRD

## Original Problem Statement
Cartoonix este o platformă nostalgică de streaming dedicată desenelor din epoca Jetix, Cartoon Network și Minimax, cu rol de comunitate (chat live, playlist-uri, favorite, badge-uri PLUS, concursuri, transmisiuni live).

## Recent Fixes (Feb 2026)

### ✅ Shop oficial Cartoonix pe /shop (P0) — Jun 2026
Magazin complet (obiecte printate 3D etc.), aceeași bază Mongo + aceleași conturi de utilizatori. Testat integral (backend pytest 28/28 + Playwright E2E: iteration_5/6.json).
- **Alegeri user**: plăți Stripe (RON), livrare gratuită peste prag configurabil + cost fix sub el, admin = rolul admin existent, recenzii DOAR de la cumpărători, stoc per produs activabil/dezactivabil.
- **Backend** (`/app/backend/shop.py`, modul nou montat în `server.py` cu `attach_shop_handlers`):
  - Colecții: `shop_products`, `shop_orders`, `shop_reviews`, `shop_settings` (key="main": shipping_cost=19.99, free_shipping_threshold=200), `payment_transactions`.
  - Public: `GET /api/shop/products` (category/search/sort), `GET /api/shop/products/{id}`, `GET /api/shop/config`, recenzii `GET/POST /api/shop/products/{id}/reviews` (403 fără comandă plătită, 409 duplicat), `GET /api/shop/reviews/eligibility/{id}`.
  - Checkout: `POST /api/shop/checkout` (prețuri calculate DOAR server-side, validare stoc, creează order `pending_payment` + tranzacție) → Stripe Checkout (emergentintegrations, `STRIPE_API_KEY` cu fallback pe `STRIPE_SECRET_KEY` existent al clientului); `GET /api/shop/checkout/status/{session_id}` (idempotent, decrementează stocul o singură dată, fallback grațios dacă Stripe retrieve eșuează); webhook `POST /api/shop/webhook/stripe`.
  - Admin (`require_admin`): CRUD produse, upload imagini (max 8MB, `/api/uploads/shop/`), comenzi + schimbare status, ștergere recenzii, setări livrare, stats (venituri/comenzi/produse/recenzii).
  - Statusuri comandă: pending_payment → paid → processing → shipped → delivered; cancelled.
  - Seed: `/app/backend/seed_shop.py` (6 produse demo cu imagini generate în `/app/backend/uploads/shop/`).
  - Teste: `/app/backend/tests/test_shop.py` (28 pass).
- **Frontend**:
  - `CartContext.js` (coș în localStorage `cartoonix_cart`), `components/shop/ProductCard.jsx` + `CartDrawer.jsx` (buton plutitor + sheet).
  - Pagini `pages/shop/`: ShopPage (hero, filtre categorie, căutare, sortare), ShopProductPage (galerie, qty, recenzii cu gating), ShopCheckoutPage (formular livrare + logică livrare gratuită), ShopSuccessPage (polling 8×2s + buton „Verifică din nou"), ShopOrdersPage (comenzile mele).
  - Admin: `pages/admin/AdminShop.jsx` (tab-uri Produse/Comenzi/Recenzii/Setări + stats) la `/admin/shop`; link „Shop" în sidebar admin.
  - Rute protejate `RequireAuth` în App.js: /shop, /shop/product/:id, /shop/checkout, /shop/success, /shop/orders; „Shop" cu badge NOU în meniul principal; `/shop` adăugat în `EARLY_ACCESS_ALLOWED_PREFIXES`.
- **Dev-only fix**: `craco.config.js` — proxy devServer `/api → localhost:8001` cu `fixRequestBody` (nu afectează build-ul de producție; producția folosește nginx-ul clientului).
- ⚠️ Preview Stripe: cheia `sk_test_emergent` nu permite retrieve pe sesiuni (proxy limitation) — status polling cade grațios pe „pending". Cu cheia reală a clientului în producție totul funcționează. Recomandat: setează `STRIPE_API_KEY` în .env-ul de producție (altfel folosește automat `STRIPE_SECRET_KEY`).

### ✅ Pagina nouă /live-tv — Cartoonix Live (HLS) — Jun 2026
- Pagină nouă `/app/frontend/src/pages/LiveTvPage.jsx`, separată de `/live`, protejată cu `RequireAuth` (orice user logat).
- Player HLS folosind `hls.js@1.6.16` (adăugat în package.json). Stream URL păstrat EXACT ca în codul clientului: `https://stream.cartoonix.ro/iptv/channel/1.m3u8?mode=segmenter`. Config-ul hls.js (buffer/retry/timeout) și logica de reconectare sunt identice cu HTML-ul original.
- Design re-stilizat în identitatea platformei (accent amber `hsl(var(--accent))`, glass, `PublicLayout`): kicker „Transmisiune în direct", titlu „Cartoonix Live" cu shimmer, badge live, overlay loading/eroare cu retry, ceas RO, contor spectatori, 4 stat-pills.
- Rută adăugată în `App.js` + `/live-tv` în `EARLY_ACCESS_ALLOWED_PREFIXES`. Keyframe `shimmer` adăugat în `index.css`.
- ⚠️ CORS: `stream.cartoonix.ro` returnează `Access-Control-Allow-Origin: https://live-tv.cartoonix.ro`. Pentru ca player-ul să încarce la `https://cartoonix.ro/live-tv`, serverul de stream trebuie să permită și origin-ul `https://cartoonix.ro` (sau `*`). Cod corect, config server = pe partea clientului.

### ✅ Watch Party — PLUS-only synchronized rooms (P0) — Feb 2026
Modul complet, fără mock-uri:
- **Backend** (`/app/backend/watch_party.py` — modul nou, ~970 LOC):
  - 16 endpoint-uri REST sub `/api/watch-parties/...` + WebSocket `/api/watch-parties/ws/{public_code}`.
  - `WatchPartyManager` in-memory (broadcast, chat istorie, reacții, rate-limit, host grace 120s) izolat ca service.
  - Algoritm sync: heartbeat 5s host, threshold-uri 0.75s/1.5s, snapshot la join/reconnect, flag anti-loop pe client.
  - Verificare PLUS server-side la **fiecare** acțiune (REST + WS handshake + fiecare comandă WS).
  - Coduri publice cu `secrets.token_urlsafe` (≈60 biți entropie) — nu se expun ObjectId-uri.
  - Notificări inbox la invitație (`db.notifications`).
  - Index-uri Mongo + TTL pe `expires_at_dt` (4h inactivitate, 10min după `end`).
- **Frontend** (componente noi):
  - `/app/frontend/src/pages/WatchPartyRoomPage.jsx` — pagina principală (player + chat + queue + reacții + sync).
  - `/app/frontend/src/components/watchparty/CreateWatchPartyButton.jsx` — 3 variante (primary/subtle/card).
  - `/app/frontend/src/components/watchparty/WatchPartyInviteModal.jsx` — invitație prin nickname.
  - `/app/frontend/src/hooks/useWatchPartySocket.js` — WS hook cu reconnect exponential + queue offline.
  - `/app/frontend/src/lib/watchparty.js` — wrapper REST + `resolveVideoUrl` partajat.
  - Buton plasat: `/lobby` (right rail), `/profile` (sub stats), `/cartoon/:id` (banner peste player), meniu dropdown user.
  - Ruta `/watch-party/:code` cu `RequireAuth`.
- **Teste** (`/app/backend/tests/test_watch_party.py`): 11 teste pytest, toate trec — FREE create/join blocat, PLUS create, max 5 invitați, invite duplicat / self / Free / kicked respinse, guest fără control queue, episod inexistent, kicked nu poate reveni, transfer host, end party, WS endpoint înregistrat.
- **Constante configurabile**: `WATCH_PARTY_MAX_GUESTS=5`, `WATCH_PARTY_MAX_QUEUE=100`, `WATCH_PARTY_INACTIVITY_HOURS=4`, `WATCH_PARTY_HOST_GRACE_SECONDS=120`.
- **Nginx** (de adăugat ÎNAINTE de blocul generic `/api/`):
  ```nginx
  location /api/watch-parties/ws/ {
    proxy_pass http://127.0.0.1:8002;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_buffering off;
    proxy_read_timeout 3600s;
    proxy_send_timeout 3600s;
  }
  ```

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
