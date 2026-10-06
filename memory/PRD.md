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
