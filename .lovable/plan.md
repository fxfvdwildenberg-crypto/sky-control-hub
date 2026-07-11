# ATC365 — UX, Personalization, Themes & Owner Tools

Big batch of changes across UX polish, a new Settings surface, seasonal themes, richer owner controls, and a small social layer. Below is scoped so it can ship in a couple of migration + code passes.

## 1. New Settings page (`/settings`)
Sidebar link under "Others". Stores per-user prefs in a new `user_prefs` table (JSON) + local mirror for instant apply.

Controls:
- **Mini stats panel** toggle (on by default) — floating compact card top-right showing: tokens, level, active flight count, ATC role status. Rendered globally in `__root.tsx` when enabled.
- **Keyboard shortcuts editor** — remap the defaults below. Bindings live in a global `useShortcuts` hook.
  - `g f` → Flight Plan, `g a` → ATIS, `g v` → Voice, `g m` → My Flights, `g p` → Profile, `g s` → Shop, `g c` → Charts, `?` → shortcut cheatsheet.
- **Pinned pages** — pick favorites; shown at top of sidebar in a "Pinned" group.
- **Theme selection** — light/dark + seasonal pick (only among enabled themes; forced theme locks selector).
- **Reset smart defaults** button.

## 2. Navigation & UX polish
- **Compact sidebar** — tighter spacing, smaller icons, section labels only when expanded. Categories: Pinned, Flight, ATC, Social, Others.
- **Contextual tooltips** — wrap key controls (squawk field, ATIS info letter, claim ATC button, tier badge, etc.) in shadcn Tooltip with a one-line explanation.
- **Hover animations** — add `transition-all hover:-translate-y-0.5 hover:shadow-md` utility on cards/buttons via a `.lift` utility class in `styles.css`.
- **Credit-earning animation** — toast + a floating `+N 🪙` that flies from click point to the ProfileChip when tokens are awarded (listens on a `tokens-earned` window event; server fns dispatch after success).
- **Micro-tutorials** — first-visit dismissable coach-marks per new page (stored in `user_prefs.seen_tours[]`). One-liner + "Got it".

## 3. Smart defaults (prefill)
Server-side heuristic: on `getFlightPlanDefaults()` return the user's most-used values from their last 10 flight plans (aircraft type, departure, cruise level, flight rules, gate). Same for ATIS (icao, dep/arr runways). Flight Plan and ATIS forms preload these on mount, users can overwrite freely.

## 4. Edit own flight plans
- Add "Edit" button on `/my-flights` for plans the user filed, regardless of status (only status stays owner-locked once denied). Reuse Flight Plan form in dialog; PATCH via `updateMyFlightPlan` server fn checking `filer_discord_id = session.discordId`. Denied plans remain delete-only (already implemented).

## 5. Seasonal themes (Summer / Winter / Halloween / Easter)
- Each theme has light + dark palettes defined as CSS variable sets in `styles.css` under classes `.theme-summer.light`, `.theme-summer.dark`, etc.
- Owner controls in `/owner`: enable/disable each theme (visible in Settings picker only if enabled) + optional **force theme** (all users locked to that theme; user can still toggle light/dark).
- State stored in new `site_theme` table (single row: enabled_themes[], forced_theme nullable). Root reads via realtime subscription; overrides local pref when forced.

## 6. Owner-managed partner dashboards
In `/owner`, add a "Partners" panel:
- Create: name, slug (auto), owner_code, primary color, accent color.
- Delete: cascades announcements/messages.
- Uses existing `partners` table; adds a `created_by_owner` boolean for cleanup safety.

## 7. Owner-managed shop tags
Move `SHOP_TAGS` from code constant → new `shop_tags` table (tag, cost, created_at). Owner can add/delete in `/owner`. `buyTag` reads from DB. Existing hardcoded tags seeded on migration.

## 8. Users list & profiles
- New `/users` page (Social section): searchable list of all users with avatar, tier, tokens, flightplans filed count, ATIS created count. Click → `/users/$discordId` profile view (already have `getUserProfile`, extend with counts).
- Counts computed via COUNT queries per user (small set, fine).

## 9. Friends system
- New `friendships` table: `user_id`, `friend_id`, `status` (pending/accepted), unique pair.
- On `/users/$discordId`: "Add friend" button; on `/friends` page: incoming requests + accepted list.
- No feature depends on this yet — purely social scaffold.

## 10. Secure Discord server link
- New `/server` page: if signed in AND `hasAtcRole`, shows a "Join private server" button with a server-fn-generated single-use Discord invite (or a static invite from env `DISCORD_PRIVATE_INVITE`). Otherwise a locked state explaining ATC role required.

## Technical section

**New tables**
- `user_prefs (discord_id PK, mini_stats bool, shortcuts jsonb, pinned_pages text[], seen_tours text[], theme_choice text)`
- `site_theme (id=1 singleton, enabled_themes text[], forced_theme text nullable)`
- `shop_tags (id, tag unique, cost int, created_at)`
- `friendships (id, user_id, friend_id, status, created_at, unique(user_id, friend_id))`

All get GRANT + RLS with owner-write / self-read patterns; `site_theme` and `shop_tags` public read.

**Server functions (new file `src/lib/prefs.functions.ts`)**
- `getMyPrefs`, `updateMyPrefs`
- `getFlightPlanDefaults`, `getAtisDefaults`
- `listUsers`, `getUserStats`
- `sendFriendRequest`, `acceptFriend`, `listFriends`
- `getSiteTheme` (public), owner: `updateSiteTheme`
- Shop: `listShopTags` (public), owner `createShopTag` / `deleteShopTag`
- Partners owner: `createPartner`, `deletePartner`
- Flight: `updateMyFlightPlan`

**Client**
- `src/lib/prefs.tsx` context providing prefs + `useShortcuts()` + `useMiniStats()`.
- `src/components/MiniStats.tsx`, `TokenFlyAnimation.tsx`, `CoachMark.tsx`, `ShortcutCheatsheet.tsx`.
- `src/routes/settings.tsx`, `users.tsx`, `users.$discordId.tsx`, `friends.tsx`, `server.tsx`.

**Themes**
Defined entirely via CSS variables; `<html>` gets `data-theme="summer|winter|halloween|easter|none"` class in addition to existing `.dark`. Partner theme override still wins when applied inside a partner dashboard.

## Rollout order
1. Migration (all 4 tables + partner column) + seed `shop_tags`.
2. Prefs infra + Settings page + sidebar/nav polish + tooltips + hover utility.
3. Smart defaults + flight plan edit.
4. Owner panel: themes, partners, shop tags.
5. Users list, profile counts, friends, secure server page.
6. Credit fly animation + micro-tutorials.
