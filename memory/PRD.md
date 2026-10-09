# Cartoonix — PRD & Status

## Original Problem Statement
React + FastAPI + MongoDB full-stack app (Cartoonix): streaming, chat, /spin reward wheel,
admin dashboard, rewards shop, public profiles, decorative APNG avatar frames, and now a
fully standalone Cartoonix Wiki at /wiki.

## Architecture
- Frontend: /app/frontend/src (CRA, Tailwind, shadcn/ui)
- Backend: /app/backend/server.py (monolithic FastAPI, 5600+ lines)
- DB: MongoDB (users, reward_claims, shop_purchases, points_ledger, spin_history, etc.)

## Implemented This Session (2026-10-06)
1. **Avatar frame CSS bug**: Fixed `.cx-avatar-frame-overlay` being capped by Tailwind
   preflight `img{max-width:100%}` — added explicit `max-width:none` override in index.css.
2. **PLUS preference — hide floating widgets**: New `hide_widgets` field on user, PUT
   `/api/auth/hide-widgets` (403 for non-PLUS). Toggle in Settings > Preferințe. ChatWidget
   respects it.
3. **2 new avatar frames**: `dragon-ring.png` (Cercul de Dragon) and `zombie-hands.png`
   (Mâinile Zombie) added to `/app/frontend/public/frames/` + `AVATAR_FRAMES` (frontend
   constants.js + backend whitelist).
4. **Frame unlock economy**: `witch-hat.png` (Pălărie de Vrăjitoare) is now a `/spin` prize
   (key `frame_witch`, weight 3) that unlocks instantly. `pumpkin-ring.png` and
   `zombie-hands.png` are purchasable in `/lobby/rewards` → Ediție Limitată, 50 NIX each.
   New `frames_unlocked` array on user; `LOCKED_AVATAR_FRAMES` set gates
   `PUT /api/auth/avatar-frame` with 403 if not unlocked. `fire-ring.png` and
   `dragon-ring.png` remain free for everyone.
5. **UI fixes**: lock icon in Settings frame picker now centered on avatar (was
   offset below due to label text inflating the "inset-0" box — fixed by wrapping avatar
   in its own `aspect-square` div). Rewards shop frame preview now uses `AvatarFrame` with
   a new `/default-avatar.jpg` placeholder instead of a plain black square; "owned"
   checkmark overlay is `rounded-full` for frame items (was a visible black square corner
   artifact).
6. **Nickname fonts (PLUS)**: New `name_font` field on `chat_style` (separate from the
   existing message-text `font`). Two custom fonts added: **Jellybean** and **Headbang**
   (woff2 files in `src/fonts/`, referenced via relative `url()` in index.css — CRA's
   css-loader fails to resolve root-absolute `/fonts/...` paths, so fonts must live under
   `src/` not `public/`). New dropdown in Settings > Personalizare > Text & efecte, applied
   to the chat sender name span in ChatRoom.jsx.
7. **Cartoonix Wiki (/wiki)** — brand-new standalone public section, fully independent from
   the main app (no auth, no main navbar/ChatWidget/AnnouncementPopup, own dark
   navy/purple/pink/gold identity). Structure: `/app/frontend/src/wiki/`
   - `data/`: articles.js (11 articles: getting-started, platform, nix, rewards,
     mystery-box, plus, cinema, live, events, profiles, faq), announcements.js (6 seeded),
     updates.js (3 changelog entries), categories.js, nav.js (sidebar + header + article
     order), helpers.js (slugify, TOC builder, search index).
   - `components/`: WikiHeader, WikiFooter, WikiSidebar (collapsible), WikiSearch
     (cmdk-based, Cmd/Ctrl+K), WikiBreadcrumbs, WikiInfoBox, WikiCategoryCard,
     AnnouncementCard/Badge, UpdateNoteCard, ArticleTableOfContents, RelatedArticles,
     ArticleBlocks (renders heading/paragraph/list/warning/infobox/rarities/channels/
     seats/faq block types), HelpfulWidget.
   - `pages/`: WikiHome, WikiArticlePage (generic, slug-driven), AnnouncementsPage
     (filters+search+sort+pinned-first), AnnouncementArticlePage, UpdatesPage
     (filters+search+sort).
   - Routes added in App.js: `/wiki`, `/wiki/announcements`, `/wiki/announcements/:slug`,
     `/wiki/updates`, `/wiki/:slug` (catch-all article renderer).
   - `AuthGate.jsx` and `MaintenanceGate.jsx` updated to allow any `/wiki*` path through
     without login / during maintenance.
   - `GlobalWidgets` wrapper in App.js hides ChatWidget + AnnouncementPopup on `/wiki*`.
   - Discreet "Wiki" link added to main app footer (Home.jsx).
   - All content in Romanian. Self-tested via screenshots (home, nix, mystery-box,
     announcements, updates, faq accordion, Cmd+K search, footer link) — user opted for
     manual testing over testing_agent for this feature.

## Implemented (2026-10-06, session 2)
8. **Audio language badge (RO/EN)**: New `audio_lang` field on Show (`ShowInput`/`ShowUpdate`,
   default `"ro"`, `serialize_show` falls back to `"ro"` if missing). Admin "Adaugă desen"
   form + `AdminShowEditor.jsx` both have a Română/Engleză select. Badge shown on
   `ShowCard.jsx` (top-right corner), `ShowDetail.jsx` (info row) and `Watch.jsx` (player
   header). Existing shows default to RO (DB was empty at migration time, nothing to
   backfill).
9. **Admin Feedback pagination**: Already implemented (25/page, `AdminFeedback.jsx`,
   pre-existing from an earlier session) — confirmed working, no change needed; pager
   auto-hides when ≤25 entries.
10. **Admin Statistics tab**: New `GET /api/admin/stats` (total_shows, total_episodes via
    aggregation) + new `AdminStats.jsx` component + "Statistici" tab in Admin.jsx.

## Implemented (2026-10-06, session 3)
11. **Multi-season import**: New `POST /api/admin/import-season` (scans one folder, tags all
    episodes with a fixed `season_label`, no subfolder recursion). Admin "Adaugă desen" form
    now has a "Acest desen are mai multe sezoane" toggle (Switch) — when off, behaves exactly
    as before (single `vps_path` + Detectează, which already auto-detects "Sezonul X"
    subfolders on its own); when on, shows dynamic season rows (label + folder path, add/
    remove), with "Detectează toate sezoanele" scanning each path and concatenating +
    renumbering episodes globally, tagged per season.
12. **"Adaugă desen" → modal dialog**: Converted the inline add-show form into a wide
    `Dialog` (`max-w-4xl`), triggered by a dedicated button card in the Desene tab. Same
    fields/logic, just relocated; existing shows list and "Import rapid" bulk-folder import
    are unchanged.

13. **Add new season to an existing show (editor)**: `AdminShowEditor.jsx` now has an
    "Adaugă sezon nou" section (reuses `POST /api/admin/import-season`) — admin enters a
    season label + folder path, clicks "Detectează și adaugă", and the new episodes are
    appended to the existing list (renumbered continuing from the last episode), without
    touching episodes already there. Smart default season label suggested from existing
    distinct seasons count. Tested end-to-end (create show with 1 season → add 2nd season
    via editor → save → verified via GET /api/shows/:id that all 4 episodes persisted with
    correct season tags).

## Implemented (2026-10-07, session 4)
14. **Fixed Cloudflare 524 timeout on "Adaugă Desen" for shows WITHOUT seasons**: Root
    cause — `/admin/import-folder` and `/admin/import-season` ran ffprobe duration-probing
    synchronously over ALL detected episodes before responding; a flat folder with many
    episodes (no season subfolders, so one single big batch instead of split per-season
    calls) could exceed Cloudflare's upstream timeout and come back as a 524. Fix: both
    detect endpoints now return instantly (`probe=False`, no ffprobe call at preview time).
    Real durations are now probed in a **fire-and-forget background task**
    (`_probe_show_durations_bg`, triggered from `POST /admin/shows` and from
    `PUT /admin/shows/{sid}` whenever `episodes` changes) that reverse-maps each
    `video_url` back to its filesystem path (`_video_url_to_path`) and patches durations
    into the DB after the response has already been sent — zero risk of gateway timeout.
    Verified via curl end-to-end on the live preview: detect (12-episode flat folder) and
    create both returned in ~0.1-0.2s (previously could hang up to the Cloudflare limit);
    background task ran with no errors in backend logs.

## Implemented (2026-10-09, session 5)
15. **Aprobare manuală conturi (admin-gated registration)**: New `account_approval` setting
    (`GET /settings/account-approval`, `POST /admin/account-approval`). When ON, `register/verify`
    creates the user with `status="pending"` (still issues a token so they can pay PLUS while
    pending) and returns `pending:true`. `login` blocks `pending` (await-approval msg) and
    `rejected` (shows admin's `rejection_reason`). New admin tab **"Aprobări"**
    (`AdminPendingAccounts.jsx`): approval-mode toggle + pending list (25/page, select-all/
    individual, bulk/single approve & reject). Reject requires a reason (shown to the user).
    Each row shows whether the user took PLUS at registration. Endpoints:
    `GET /admin/pending-users`, `POST /admin/pending-users/approve`,
    `POST /admin/pending-users/reject`. User sees `PendingAccount.jsx` screen via `AuthGate`
    (pending/rejected users are gated out of the app but `/register` + `/payment/*` stay
    reachable so PLUS payment completes). Verified end-to-end via curl (pending block, reject
    w/wo reason, approve → login works) + screenshots.
16. **Dezactivare globală playere**: New `players_disabled` setting (`GET /settings/players`,
    `POST /admin/players-disabled`). Toggle in Admin → Platformă. When ON, `Watch.jsx` shows a
    "MOMENTAN INDISPONIBIL" box instead of the `<video>` for ALL episodes (Cinema/Live
    untouched). Verified via screenshot.

17. **Bonus NIX la donații**: New admin-configurable % setting (`GET/POST /settings/donation-bonus`,
    `POST /admin/settings/donation-bonus`). `POST /payments/donate` now grants
    `round(base_points * (1+percent/100))` NIX instead of flat 1 RON = 1 NIX (base_points +
    bonus_percent stored in `payment_transactions` for audit). Admin → Platformă has a %
    input + Salvează button under Donații. Donate.jsx shows a "Bonus activ: +X% NIX" badge and
    a breakdown line (normal + bonus) in the preview. Default set to 50% per user request.
    Verified via curl (10 RON → 15 NIX math) + screenshot (25 RON → 38 NIX w/ 50% bonus).
18. **Bibliotecă + Acasă legate de kill-switch playere**: When `players_disabled` is ON:
    `/browse` (Bibliotecă) shows an "indisponibilă" page for non-admin members (CTA → Live TV);
    admin still sees the library with a red banner. NavBar hides the "Bibliotecă" link for
    non-admin when disabled. `/home` redirects to `/live` for ALL users (so entering the
    platform shows Live TV directly). Does NOT affect `/cinema` or `/watch`. Fixed a hooks-order
    bug introduced in `Home.jsx` while wiring the redirect. Verified via screenshot as admin
    and as test member (test@cartoonix.ro/test1234); `players_disabled` reset to false after
    testing (unchanged default).

## Known Pending Issues (carried over, not yet done this session)
- **P0**: `/spin` rapid-click exploit — testing_agent verification still not run
  (recurring across many sessions).
- **P1**: Avatar frame missing on `/profile/:id` (PublicProfile.jsx uses raw `<img>`
  instead of `<AvatarFrame>`).
- **P1**: Full E2E test of `/feedback` flow not run.
- **P2**: Delete `/app/frontend/src/pages/CastTest.jsx` + route + test video.
- **P2**: PLUS-exclusive animated avatar frame (separate from the 2 shop frames added now).
- **P2**: Distinct channel logos/colors on `/live` selector; custom channel ordering.

## Test Credentials
See /app/memory/test_credentials.md
