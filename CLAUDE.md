# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Dev server at http://localhost:5173 (add `-- --host` to test on a phone)
npm run build    # Production build
npm run preview  # Preview production build locally
```

Requires a `.env` at the root with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. The database is created by running `schema.sql` in the Supabase SQL Editor.

## Architecture

**Stack:** React 18 + Vite · Supabase (PostgreSQL + Realtime) · Vercel. Design reference lives in `design_handoff_tareas_hogar/` (HTML prototype + README).

**Styles:** Nocturne design system in `src/nocturne.css` (tokens + `.btn`, `.card`, `.tag`, `.dialog`…); app keyframes (`dcRise`, `dcPop`, …) in `src/index.css`. Components use inline styles on top of those classes. Icons: `@phosphor-icons/web` classes (`ph ph-x` / `ph-fill ph-x`). Primary buttons are accent outline, never filled; Inter weight ≤ 500.

**No login:** session is `{ groupId, memberId }` in `localStorage` (`hogar_session`). Groups are joined via a 6-char code, then picking a member created by the admin.

### Data flow

- `src/lib/api.js` — every Supabase call (tables + RPCs `create_group`, `mark_dish`).
- `src/hooks/useGroupData.js` — loads all group data and refetches on Realtime changes (per-mount unique channel topic).
- `src/App.jsx` — screen flow (welcome → create/created or join → pick → app) and global overlays exposed as `ui` (`toast`, `burst`, `confirm`, `withLoading`).
- `src/components/GroupApp.jsx` — derives `ctx` (turns, rotation, permissions) and all `actions`; renders header, bottom nav and tabs `TodayTab`, `CleaningTab`, `HistoryTab`, `GroupTab`.

### Turn logic (`src/lib/logic.js`)

- **Dishwasher:** `dishInfo` — next turn is the non-skipped member with fewest `dish_log` entries, tie → oldest last turn, tie → `order_index`. One entry per day enforced by `unique(group_id, done_date)` (Madrid date); `23505` means already done today.
- **Weekly cleaning:** room `i` in week `w` → `rotations.order_ids[(i + w) % n]`; extra people rest.
- Admin-only: start/reset rotation, manual order, next week, mark others' rooms, undo last dish entry, add members/rooms. Admin can preview the member view.
