# TRD: Orin Todo App

## 1. Tech Stack

| Layer | Choice | Reason |
|-------|--------|--------|
| Framework | Next.js 15 (App Router) | SSR, API routes, file-based routing |
| Language | TypeScript | Type safety across data models |
| Styling | Tailwind CSS + shadcn/ui | Rapid, accessible UI components |
| Database | Supabase (PostgreSQL) | Relational data, RRULE storage, built-in auth |
| ORM | Prisma | Type-safe queries, migrations |
| Auth | Supabase Auth | Built into Supabase, no separate service needed |
| State | Zustand + TanStack Query | Local UI state + server data sync |
| Drag & Drop | dnd-kit | Accessible, headless drag primitives |
| Quadrant Map | D3.js | Custom SVG scatter plot with full interaction control |
| Recurring Rules | rrule.js | RFC 5545 RRULE parsing and generation |
| Deployment | Vercel | Zero-config Next.js, Supabase integration |

---

## 2. System Architecture

```
Browser (Next.js Client)
    │
    ├── App Router Pages (RSC + Client Components)
    ├── Zustand Store (UI state: sort order, active nudges, tooltip state)
    └── TanStack Query (server state: tasks, deferrals, weekly report)
         │
         ▼
Next.js API Routes (/app/api/*)
    │
    ├── Prisma ORM
    │    └── Supabase PostgreSQL
    │
    └── Supabase Auth (validates session on every API route)
```

---

## 3. Database Schema

### `profiles`
Supabase Auth manages the core `auth.users` table internally. We extend it with a `profiles` table for app-level user data.

| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | References `auth.users(id)` |
| email | text | |
| created_at | timestamptz | |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| user_id | uuid FK → auth.users | |
| title | text NOT NULL | |
| due_at | timestamptz | nullable — tasks without a deadline |
| emotional_state | enum | DREADING, ANXIOUS, NEUTRAL, WILLING, EXCITED — default NEUTRAL |
| is_completed | boolean | default false |
| completed_at | timestamptz | nullable |
| parent_task_id | uuid FK → tasks | nullable — for subtasks |
| recurrence_rule | text | nullable — RRULE string (RFC 5545) |
| sort_order | integer | for manual drag ordering |
| deferred_count | integer | default 0 |
| last_touched_at | timestamptz | updated on any user interaction |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### `emotional_state_history`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| task_id | uuid FK → tasks | |
| previous_state | enum | nullable (first log has no previous) |
| new_state | enum | |
| changed_at | timestamptz | |

### `deferral_log`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| task_id | uuid FK → tasks | |
| original_due_at | timestamptz | |
| new_due_at | timestamptz | |
| emotional_state | enum | state at time of deferral |
| deferred_at | timestamptz | |

### `nudge_dismissals`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | |
| task_id | uuid FK → tasks | |
| user_id | uuid FK → auth.users | |
| dismissed_at | timestamptz | |

---

## 4. Emotional State Enum

```ts
enum EmotionalState {
  DREADING  = 1,  // red-orange
  ANXIOUS   = 2,  // amber
  NEUTRAL   = 3,  // gray
  WILLING   = 4,  // teal
  EXCITED   = 5,  // green
}
```

Higher numeric value = more positive. Used directly in Quadrant Map Y-axis.

---

## 5. API Routes

All routes are under `/app/api/`. All require a valid Supabase Auth session.

### Tasks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks` | List tasks. Query params: `date` (ISO date), `status` (active\|completed\|all) |
| POST | `/api/tasks` | Create task |
| PATCH | `/api/tasks/:id` | Update title, due_at, emotional_state, sort_order, is_completed |
| DELETE | `/api/tasks/:id` | Delete task and all subtasks |
| POST | `/api/tasks/:id/defer` | Log deferral, update due_at (requires confirmation payload) |
| PATCH | `/api/tasks/:id/emotional-state` | Update state + write to emotional_state_history |
| GET | `/api/tasks/:id/deferrals` | Fetch deferral log for a task |
| POST | `/api/tasks/:id/complete` | Mark complete, generate next recurrence if applicable |

### Reporting

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/reports/weekly` | Returns deferral count by state, emotional trends for past 7 days |

### Quadrant

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tasks/quadrant` | Returns all active tasks with `urgency_score` and `emotional_weight` pre-calculated for plotting |

---

## 7. Deferral Flow

1. User taps "Push this task" on a task card.
2. Client opens deferral modal (no API call yet).
3. User selects a defer option — calculated new `due_at` is shown.
4. User taps confirm → `POST /api/tasks/:id/defer` with `{ new_due_at, confirmed: true }`.
5. Server writes to `deferral_log`, increments `deferred_count`, updates `due_at`, sets `last_touched_at = now`.
6. Server rejects any request without `confirmed: true` — enforces consent at the API level.

---

## 8. Nudge System

Nudges are evaluated **client-side** on a polling interval (every 5 minutes via `setInterval` in a root layout effect). No background jobs required for MVP.

**Trigger conditions (both evaluated per task on each poll):**

```
shouldNudge(task):
  A: (now - task.last_touched_at) > 6 hours
  B: task.emotional_state in [DREADING, ANXIOUS]
     AND task.due_at is within 12 hours
     AND task.is_completed = false

  return A OR B
```

**Dismissal check:**
Before surfacing a nudge, check `nudge_dismissals` for a record where `dismissed_at > now - 2h`. If found, suppress.

**On dismiss:**
`POST /api/nudge-dismissals` with `{ task_id }` — server writes dismissal record.

**UI:**
Non-blocking inline banner on the task card. Does not shift layout. Offers four actions: Defer · Reschedule · Dismiss · Mark Done.

---

## 9. Quadrant Map

**Rendering:** SVG via D3.js inside a client component `<QuadrantMap />`.

**Data mapping:**
- X-axis: `urgency_score` (0 = far, 1 = imminent) — pre-computed server-side: `clamp(1 - (hoursRemaining / 168), 0, 1)`.
- Y-axis: `emotional_weight` (1 = excited at bottom, 5 = dreading at top) — inverted on the SVG scale.
- Dot color: matches emotional state color token.
- Dot size: uniform 8px radius.

**Quadrant fills:**
- Top-right (urgency > 0.5, weight > 3): `rgba(239, 68, 68, 0.08)` (muted red)
- Bottom-left (urgency ≤ 0.5, weight ≤ 3): `rgba(20, 184, 166, 0.08)` (muted teal)
- Other quadrants: no fill

**Tooltip (desktop — mouseover):**
```
Position: dot.x + 14px (flips to dot.x - tooltipWidth - 14px if near right edge)
Content:
  - Emotional state label (colored)
  - Relative deadline string (computed from due_at)
  - "deferred N×" (only if deferred_count > 0)
Dismiss: mouseleave
```

**Tooltip (mobile — tap):**
Tap dot → show tooltip. Tap anywhere else → dismiss. Managed via `useState` with a `taskId | null` active tooltip tracker.

---

## 10. Recurring Tasks

- Stored as an RRULE string on the `tasks` row (e.g. `FREQ=WEEKLY;BYDAY=MO`).
- On `POST /api/tasks/:id/complete`:
  1. Mark current task `is_completed = true`.
  2. If `recurrence_rule` is set, parse with `rrule.js`.
  3. Compute `next_occurrence = rule.after(now)`.
  4. Insert a new task row cloning all fields except `id`, `created_at`, `is_completed`, `deferred_count`, `completed_at` — set `due_at = next_occurrence`.
- Recurring tasks are independent rows after creation. No parent-child link between recurrence instances (keeps queries simple).

---

## 11. Subtasks

- Subtasks are task rows with `parent_task_id` set.
- Max depth: 1 level (no nested subtasks).
- `GET /api/tasks` returns subtasks nested under their parent in the response shape.
- Deleting a parent cascades to all subtasks (`ON DELETE CASCADE` in schema).
- Subtasks do not appear in the Quadrant Map.
- Subtasks can have their own emotional state and due date.

---

## 12. Drag-to-Reorder

- Implemented with `dnd-kit` `<SortableContext>`.
- Active only when sort mode is `MANUAL`.
- On drag end: optimistically reorder in Zustand, then `PATCH /api/tasks/reorder` with `{ ordered_ids: string[] }`.
- Server writes new `sort_order` integer values (spaced by 1000 to allow future insertions without full rewrite).
- Debounce write by 500ms to avoid rapid sequential patches.

---

## 13. Sort Modes

```ts
type SortMode = 'DUE_DATE' | 'EMOTIONAL_STATE' | 'MANUAL'
```

- `DUE_DATE` (default): sort by `due_at` ascending, nulls last.
- `EMOTIONAL_STATE`: sort by `emotional_state` ascending (DREADING first).
- `MANUAL`: sort by `sort_order` ascending.

Sort mode is stored in Zustand and persisted to `localStorage`. Not synced to server.

---

## 14. Weekly Emotional Review

`GET /api/reports/weekly` returns:

```ts
{
  week_start: string,          // ISO date
  week_end: string,
  deferrals_by_state: {
    DREADING: number,
    ANXIOUS: number,
    NEUTRAL: number,
    WILLING: number,
    EXCITED: number,
  },
  total_deferrals: number,
  total_completed: number,
  most_deferred_task: { id, title, deferred_count } | null,
}
```

Displayed as a non-intrusive summary card — surfaced once per week on the first app open after Sunday midnight.

---

## 15. Frontend Component Tree

```
app/
├── layout.tsx                  — Supabase provider, Zustand provider, nudge polling effect
├── page.tsx                    — Daily task view (default route)
├── quadrant/page.tsx           — Quadrant map full-screen view
├── calendar/page.tsx           — Calendar view
└── components/
    ├── TaskList.tsx             — SortableContext wrapper + sort toggle
    ├── TaskCard.tsx             — Individual task row, nudge banner, emotional state badge
    ├── TaskCreateModal.tsx      — Title, due date/time, emotional state picker
    ├── DeferralModal.tsx        — Defer by hours / reschedule options + confirm
    ├── EmotionalStatePicker.tsx — 5-state selector (icon + label, no color-only)
    ├── QuadrantMap.tsx          — D3 SVG scatter plot
    ├── QuadrantTooltip.tsx      — Hover/tap tooltip
    ├── WeeklyReviewCard.tsx     — Weekly emotional summary
    └── NudgeBanner.tsx          — Inline non-blocking nudge UI
```

---

## 16. Accessibility Requirements

- Every emotional state must have a distinct **icon** and **text label** in addition to color (WCAG 1.4.1).
- All interactive elements keyboard-navigable (Tab, Enter, Space, Escape).
- Quadrant Map dots have `aria-label="[Task title] — [Emotional state], due [relative date]"`.
- Modals use `role="dialog"` with focus trap.
- Nudge banner uses `role="status"` (non-intrusive live region).
- Minimum touch target: 44×44px (WCAG 2.5.5).

---

## 17. Performance Targets

| Metric | Target |
|--------|--------|
| LCP | < 2.5s |
| Task list load (50 tasks) | < 300ms |
| Deferral confirm round-trip | < 400ms |
| Quadrant map render (100 dots) | < 100ms |
| Sort mode toggle | < 16ms (no re-fetch) |

---

## 18. Security

- All API routes validate session via `supabase.auth.getUser()`. Requests without a valid session return 401.
- All DB queries are scoped to `user_id = session.user.id` — no cross-user data access possible.
- `confirmed: true` is required in the deferral request body — enforced server-side to prevent accidental or scripted deferrals.
- No user-generated content is rendered as HTML (`dangerouslySetInnerHTML` is never used).

---

## 19. Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase PostgreSQL connection string (used by Prisma) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |
