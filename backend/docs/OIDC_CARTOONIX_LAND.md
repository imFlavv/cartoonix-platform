# Cartoonix.ro – OpenID Connect pentru Cartoonix Land

Cartoonix.ro este **furnizorul de identitate** (OpenID Provider). Cartoonix Land (backend-ul jocului) este un
**client confidențial**. Flux suportat: **Authorization Code + PKCE (S256)**, nimic altceva
(fără implicit, fără refresh token, fără `plain`, fără înregistrare dinamică).

Cod: `backend/oidc_provider.py`, UI consimțământ: `frontend/src/pages/OAuthAuthorize.jsx`,
administrare clienți: `backend/scripts/oidc_clients.py`, teste: `backend/tests/test_oidc.py`.

## 1. Endpoint-uri (producție)

| Ce | URL |
|---|---|
| Issuer | `https://cartoonix.ro/api/oidc` |
| Discovery | `https://cartoonix.ro/api/oidc/.well-known/openid-configuration` |
| Authorization | `https://cartoonix.ro/api/oidc/authorize` (validează, apoi trimite browserul la `https://cartoonix.ro/oauth/authorize`) |
| Token | `https://cartoonix.ro/api/oidc/token` (doar server-to-server, `client_secret_basic`) |
| UserInfo | `https://cartoonix.ro/api/oidc/userinfo` |
| JWKS | `https://cartoonix.ro/api/oidc/jwks.json` |

Issuer-ul are path (`/api/oidc`) pentru că pe Cartoonix.ro tot ce e sub `/api` ajunge la backend.
Valoarea `iss` din token este exact `OIDC_ISSUER`, fără `/` la final.

## 2. Configurare pe VPS (o singură dată)

```bash
# 1) cheia de semnare RS256 – în afara repo-ului, citibilă doar de userul serviciului
sudo install -d -m 700 -o <user-backend> /etc/cartoonix/oidc
sudo -u <user-backend> openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 \
     -out /etc/cartoonix/oidc/signing-2026-06.pem
sudo chmod 600 /etc/cartoonix/oidc/signing-2026-06.pem
```

Adaugă în `backend/.env` (nu sunt secrete; secretul este fișierul cheii):

```
OIDC_ISSUER=https://cartoonix.ro/api/oidc
OIDC_FRONTEND_AUTHORIZE_URL=https://cartoonix.ro/oauth/authorize
OIDC_SIGNING_KEY_PATH=/etc/cartoonix/oidc/signing-2026-06.pem
OIDC_SIGNING_KEY_ID=cx-2026-06
```

Restart backend. Dacă oricare variabilă lipsește sau cheia nu se poate citi, endpoint-urile OIDC răspund 503
iar restul site-ului funcționează normal (în log apare `OIDC provider disabled: ...`).

Reverse proxy / Cloudflare: `/api/oidc/*` trebuie să ajungă neschimbat la backend; nu cache-ui `/token` și `/userinfo`;
nu loga query string-ul pe `/oauth/authorize` sau callback (conține `code`). Dacă există WAF/bot-protection,
permite cererile server-to-server ale jocului către `/api/oidc/token`, `/userinfo`, `/jwks.json`
(în preview, user-agent-ul implicit `Python-urllib` a fost blocat cu 403 — setați un User-Agent propriu).

## 3. Înregistrarea clientului jocului

Pe VPS, din directorul `backend` (folosește `MONGO_URL`/`DB_NAME` din `.env`):

```bash
python scripts/oidc_clients.py create --client-id cartoonix-land --name "Cartoonix Land" \
       --redirect-uri https://<HOST-JOC>/<CALEA-CALLBACK>
```

Scriptul afișează **o singură dată** `client_id` și `client_secret`; în MongoDB se salvează doar hash-ul bcrypt.
Secretul se pune direct în managerul de secrete al backend-ului jocului (nu în chat, email, cod sau PR).

Alte comenzi: `list`, `add-redirect`, `remove-redirect`, `rotate-secret`, `disable`, `enable`.
Reguli redirect URI: absolut, `https` (http doar pentru `localhost`), fără fragment `#`, fără `*`.
La runtime comparația este **exactă, caracter cu caracter** (fără normalizare, fără `/` final implicit).

## 4. Fluxul, pas cu pas

1. Jocul (backend) generează: `state` (≥128 biți random), `nonce` (≥128 biți random), `code_verifier`
   (43–128 caractere `[A-Za-z0-9-._~]`) și `code_challenge = BASE64URL(SHA256(code_verifier))`.
   Le leagă de sesiunea browserului (cookie HttpOnly, Secure, SameSite=Lax), cu expirare ~10 min.
2. Jocul trimite browserul la:
   ```
   https://cartoonix.ro/api/oidc/authorize?response_type=code&client_id=cartoonix-land
     &redirect_uri=<exact-ca-la-înregistrare>&scope=openid%20profile
     &state=...&nonce=...&code_challenge=...&code_challenge_method=S256
   ```
3. Cartoonix.ro validează clientul și redirect_uri. Dacă nu se potrivesc → pagină de eroare, **fără redirect**.
   Alte erori de parametri → redirect la callback cu `error`, `error_description`, `state`, `iss`.
4. Utilizatorul se conectează pe Cartoonix.ro (parola se introduce doar aici) și vede ecranul
   „Continui ca X în Cartoonix Land?” → Permite / Refuză.
5. Permite → `https://<callback>?code=...&state=...&iss=https://cartoonix.ro/api/oidc`.
   Refuză → `...?error=access_denied&state=...&iss=...`.
   Codul: opac, 64 caractere, stocat doar ca hash SHA-256, **valabil 60 s, de unică folosință**
   (consum atomic; a doua încercare, inclusiv concurentă, primește `invalid_grant`), legat de
   client, redirect_uri, utilizator, nonce și code_challenge.
6. Backend-ul jocului face schimbul (niciodată din browser):
   ```
   POST https://cartoonix.ro/api/oidc/token
   Authorization: Basic base64(urlencode(client_id) ":" urlencode(client_secret))
   Content-Type: application/x-www-form-urlencoded

   grant_type=authorization_code&code=...&redirect_uri=<același>&code_verifier=...
   ```

## 5. Ce TREBUIE să verifice backend-ul jocului

**La callback, înainte de schimb:**
- `state` din query == `state` salvat în sesiune (comparație în timp constant), apoi șterge-l (unică folosință).
  Nepotrivire/lipsă → oprește fluxul (protecție CSRF / login injection).
- `iss` din query == `https://cartoonix.ro/api/oidc` (protecție mix-up, RFC 9207).
- dacă există `error`, nu face schimbul; afișează mesaj (ex. `access_denied`).

**La id_token (JWT RS256):**
- algoritm fixat la `RS256` (nu accepta `alg` din header, niciodată `none`/HS256);
- semnătura cu cheia din `jwks_uri` după `kid` (cache JWKS; reîncarcă la `kid` necunoscut);
- `iss` == issuer exact; `aud` == `client_id` al jocului; `exp` în viitor, `iat` rezonabil (toleranță ≤ 60 s);
- `nonce` == nonce-ul salvat în sesiune, apoi șterge-l (protecție replay).
- identitatea contului = perechea **(`iss`, `sub`)**. Nu folosiți `name` ca identificator (se poate schimba).

`access_token` este opac (nu e JWT), valabil 5 minute, folosit doar pentru `/userinfo`. Nu există refresh token:
jocul își creează propria sesiune după login.

Biblioteci recomandate pentru joc: Node `openid-client`, Python `Authlib`, PHP `league/oauth2-client` +
`firebase/php-jwt` / `jumbojett/openid-connect-php`. Toate fac automat PKCE, state, nonce și validarea tokenului.

## 6. Exemplu de răspunsuri (date fictive)

`POST /api/oidc/token` → 200
```json
{
  "access_token": "Qm9ndXMtYWNjZXNzLXRva2VuLWV4YW1wbGUtMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAw",
  "token_type": "Bearer",
  "expires_in": 300,
  "id_token": "eyJhbGciOiJSUzI1NiIsImtpZCI6ImN4LTIwMjYtMDYiLCJ0eXAiOiJKV1QifQ.<payload>.<semnătură>",
  "scope": "openid profile"
}
```

Header id_token: `{"alg": "RS256", "kid": "cx-2026-06", "typ": "JWT"}`

Payload id_token:
```json
{
  "iss": "https://cartoonix.ro/api/oidc",
  "sub": "3f6c1a52-8d2e-4b7a-9c1f-0e4d5a6b7c8d",
  "aud": "cartoonix-land",
  "iat": 1781000000,
  "exp": 1781000300,
  "nonce": "n-0S6_WzA2Mj",
  "name": "Andrei"
}
```
`name` lipsește dacă utilizatorul nu are nume afișat sau dacă scope-ul a fost doar `openid`.
Nu se trimit niciodată email, parolă, hash, rol, sold NIX etc.

`GET /api/oidc/userinfo` (Bearer access_token) → `{"sub": "3f6c1a52-8d2e-4b7a-9c1f-0e4d5a6b7c8d", "name": "Andrei"}`

Erori token (RFC 6749): 400 `{"error":"invalid_grant","error_description":"..."}` (cod invalid/expirat/folosit,
verifier greșit, redirect_uri diferit, cont inactiv), 401 `invalid_client` (autentificare client eșuată),
400 `unsupported_grant_type`, 400 `invalid_request`.

## 7. Reguli de cont

- `sub` = ID-ul existent al contului din MongoDB (`users.id`, sau `_id` pentru conturile vechi fără `id`).
  Nu se modifică și nu se importă nimic în conturi; nu se creează câmpuri noi pe utilizatori.
- Pot intra conturile active; cele suspendate, în așteptare sau respinse sunt refuzate (și la aprobare, și la schimbul de cod).
- Când site-ul e în mentenanță sau pe pagina „Viitorul Cartoonix”, loginul pentru joc merge în continuare:
  utilizatorul primește un token de 10 minute valabil **doar** pentru ecranul de consimțământ (nu deschide site-ul).

## 8. Rotirea cheii de semnare

1. Generează o cheie nouă (ex. `signing-2027-01.pem`) și extrage publicul vechi:
   `openssl pkey -in signing-2026-06.pem -pubout -out signing-2026-06.pub.pem`.
2. Setează `OIDC_SIGNING_KEY_PATH`/`OIDC_SIGNING_KEY_ID` pe cheia nouă și
   `OIDC_PREVIOUS_PUBLIC_KEYS=cx-2026-06=/etc/cartoonix/oidc/signing-2026-06.pub.pem`; restart.
3. După ≥ 1 zi (durata cache-ului JWKS la joc + viața tokenului), scoate `OIDC_PREVIOUS_PUBLIC_KEYS`.

## 9. Teste

`cd backend && python -m pytest tests/test_oidc.py -q` (rulează pe backend-ul pornit; creează și șterge doar
date `TEST_`/`test_oidc_`). Acoperă: discovery/JWKS, potrivire exactă redirect_uri, erori de parametri, PKCE,
cod de unică folosință (inclusiv concurent), expirare, legare de client, autentificare client, id_token
semnat + claims, userinfo, conturi suspendate/în așteptare, login existent neschimbat, mod mentenanță.
