# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Production build
npm run preview  # Preview production build locally
```

Requires a `.env` file at the root with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack:** React 19 + Vite · Supabase (PostgreSQL + Realtime) · Deployed on Vercel

All styles live in `src/index.css` — no CSS modules or Tailwind. The design uses CSS custom properties defined in `:root` (dark theme, `--primary` is purple `#c8b4ff`, `--accent` is amber). Fonts: DM Sans (body) + DM Serif Display (headings), loaded from Google Fonts in `index.html`.

### Data flow

`App.jsx` is the single data-fetching layer. It fetches all data on mount (and on `onRefresh` calls) and passes it down as props. There is no client-side state library. Children never fetch directly — they receive data and call `onRefresh()` after mutations, which re-fetches everything.

`App.jsx` also sets up a Supabase Realtime channel (`completions-notify`) to push browser notifications to other logged-in users when someone marks a task done.

### Auth

Simple username + bcrypt password stored in `people.password_hash`. On login, `localStorage` stores the person's UUID as `hogar_person_id`. `Login.jsx` handles both login and registration (registration can also claim an existing rotation slot that has no password yet).

### Turn rotation logic

**Dishwasher (daily):** `turnIndex = daysSinceEpoch % people.length` where epoch is `2025-01-06`. The index maps into the `people` array sorted by `order_index`.

**Rooms (weekly):** `turnIndex = weekNumber + roomIndex`. Each room gets a different person each week based on its position in the list.

Both task types support **absence voting**: users can vote that someone is absent (`absence_votes` table). If more than half the people vote someone absent, that person is skipped and the next in rotation takes over. This logic is computed client-side in `Dashboard.jsx` (`getEffectivePerson`, `isVotedAbsent`).

### Database tables

- `people` — `id, name, order_index, password_hash, created_at`
- `rooms` — `id, name, emoji, order_index, created_at`
- `completions` — `id, task_type ('dishwasher'|'room'), person_id, room_id, due_date, completed_at`
- `absence_votes` — `id, task_type, due_date, target_person_id, voter_person_id, is_absent`

### Component responsibilities

| File | Role |
|------|------|
| `App.jsx` | Auth gate, data fetching, Realtime listener, tab navigation |
| `Dashboard.jsx` | Turn calculation, mark-done actions, vote casting, renders TaskCard + room grid |
| `TaskCard.jsx` | Presentational card for the dishwasher task |
| `History.jsx` | Filtered list + stats from passed-in completions |
| `PeopleManager.jsx` | Add/remove/reorder people, updates `order_index` via swap |
| `RoomsManager.jsx` | Add/remove/reorder rooms |
| `Login.jsx` | Login + registration form with bcrypt |
