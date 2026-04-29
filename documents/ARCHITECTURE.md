# Architecture: Orin Todo App

## 1. System Overview

Orin is a full-stack Next.js application. The frontend, API layer, and background logic all live in a single Next.js project deployed on Vercel. Supabase provides the database and authentication — no other external services are required.

```
┌─────────────────────────────────────────────────────┐
│                     Browser                         │
│                                                     │
│   Next.js Client (RSC + Client Components)          │
│   ├── Zustand      (UI state)                       │
│   └── TanStack Query (server cache)                 │
└────────────────────┬────────────────────────────────┘
                     │ HTTPS
┌────────────────────▼────────────────────────────────┐
│              Vercel (Next.js 15)                    │
│                                                     │
│   App Router Pages    API Routes (/app/api/*)       │
│   ├── /               ├── /api/tasks                │
│   ├── /quadrant       ├── /api/tasks/:id/defer      │
│   └── /calendar       ├── /api/reports/weekly       │
│                       └── /api/tasks/quadrant       │
└────────────────────┬────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────┐
│                  Supabase                           │
│                                                     │
│   Auth (auth.users)    PostgreSQL (via Prisma ORM)  │
│   ├── profiles         ├── tasks                    │
│   └── sessions         ├── emotional_state_history  │
│                        ├── deferral_log             │
│                        └── nudge_dismissals         │
└─────────────────────────────────────────────────────┘
```

---

## 2. Frontend Architecture

### Rendering Strategy
- **Server Components (RSC):** Pages that fetch initial data — daily task list, weekly report card. Rendered on the server, zero client JS for the initial paint.
- **Client Components:** Anything interactive — task cards, modals, drag-to-reorder, quadrant map, nudge banners. Marked with `'use client'`.

### State Layers

| Layer | Tool | What it holds |
|-------|------|---------------|
| Server cache | TanStack Query | Tasks, deferral logs, weekly report — fetched from API, cached, refetched in background |
| UI state | Zustand | Active sort mode, open tooltip ID, nudge dismissal state — never hits the server |
| Persistent UI | localStorage | Sort mode preference — survives page reload, not synced to DB |

### Nudge Polling
A `setInterval` runs every 5 minutes inside a `useEffect` in `layout.tsx`. On each tick it evaluates every task in the TanStack Query cache against the nudge trigger conditions. No API call is made unless a nudge needs to be dismissed.

---

## 3. API Layer

All routes live under `/app/api/`. Every route follows the same three-step pattern:

```
1. Validate session      →  supabase.auth.getUser()  →  401 if missing
2. Scope query to user   →  WHERE user_id = session.user.id
3. Execute + respond     →  Prisma query  →  JSON response
```

### Route Map

```
/api/tasks
  GET     — list tasks (filter by date / status)
  POST    — create task

/api/tasks/:id
  PATCH   — update title, due_at, emotional_state, sort_order, is_completed
  DELETE  — delete task + cascade subtasks

/api/tasks/:id/defer
  POST    — log deferral, update due_at (confirmed: true required)

/api/tasks/:id/emotional-state
  PATCH   — update state, write to emotional_state_history

/api/tasks/:id/deferrals
  GET     — fetch deferral log for task

/api/tasks/:id/complete
  POST    — mark complete, generate next recurrence if RRULE set

/api/tasks/reorder
  PATCH   — write new sort_order values after drag

/api/tasks/quadrant
  GET     — return tasks with urgency_score + emotional_weight pre-computed

/api/reports/weekly
  GET     — deferrals by state, totals, most-deferred task

/api/nudge-dismissals
  POST    — write dismissal record with timestamp
```

---

## 4. Database Architecture

### Table Relationships

```
auth.users (Supabase managed)
    │
    ├──< profiles (1:1)
    │
    ├──< tasks (1:many)
    │       │
    │       ├──< tasks (self-ref, parent_task_id — subtasks, max 1 level)
    │       │
    │       ├──< emotional_state_history (1:many)
    │       │
    │       └──< deferral_log (1:many)
    │
    └──< nudge_dismissals (1:many)
```

### Key Design Decisions

**tasks is self-referencing for subtasks.**
Rather than a separate `subtasks` table, a `parent_task_id` FK on `tasks` keeps the schema simple. Max depth is enforced at the application layer — the DB allows it, the API rejects it.

**Recurring task instances are independent rows.**
When a recurring task is completed, a new row is inserted for the next occurrence. There is no link between instances. This keeps all queries simple — no need to ever join across recurrence chains.

**Deferral consent is enforced at the API layer.**
The `deferral_log` table has no `confirmed` column — the API route rejects any `POST /defer` request that does not include `confirmed: true` in the body. The DB never sees an unconfirmed deferral.

---

## 5. Authentication Flow

```
User visits page
      │
      ▼
Supabase Auth checks session cookie
      │
  ┌───┴────────────┐
  │ Valid session  │  No session
  ▼                ▼
Page renders    Redirect → /login
      │
      ▼
API route called
      │
      ▼
supabase.auth.getUser()
      │
  ┌───┴────────────┐
  │ Valid          │  Invalid / expired
  ▼                ▼
Proceed         Return 401
```

Supabase Auth session is stored as an HTTP-only cookie. The Supabase client on the server reads it via `@supabase/ssr`.

---

## 6. Key Feature Flows

### Deferral Flow
```
User taps "Push this task"
      │
      ▼
DeferralModal opens (no API call)
      │
      ▼
User picks option → new due_at calculated and shown
      │
      ▼
User taps Confirm
      │
      ▼
POST /api/tasks/:id/defer  { new_due_at, confirmed: true }
      │
      ▼
Server: write deferral_log, increment deferred_count,
        update due_at, set last_touched_at = now
      │
      ▼
TanStack Query invalidates tasks cache → UI updates
```

### Nudge Flow
```
setInterval fires (every 5 min)
      │
      ▼
For each task in cache:
  └── last_touched_at > 6h ago?
  └── (DREADING or ANXIOUS) AND due within 12h AND not completed?
      │
      ▼
Any match → check nudge_dismissals via API
      │
  dismissed within 2h?
  ├── Yes → suppress
  └── No  → show NudgeBanner on TaskCard
                  │
            User taps Dismiss
                  │
            POST /api/nudge-dismissals { task_id }
            Suppress for 2 hours
```

### Recurring Task Completion
```
POST /api/tasks/:id/complete
      │
      ▼
Mark task is_completed = true
      │
      ▼
recurrence_rule set?
  ├── No  → done
  └── Yes → parse RRULE with rrule.js
             compute next_occurrence = rule.after(now)
             INSERT new task row (clone fields, reset deferred_count)
             new task due_at = next_occurrence
```

---

## 7. Quadrant Map Data Flow

```
GET /api/tasks/quadrant
      │
      ▼
Server: for each active task
  urgency_score  = clamp(1 - (hoursRemaining / 168), 0, 1)
  emotional_weight = task.emotional_state (1–5)
      │
      ▼
Client: <QuadrantMap /> renders D3 SVG
  X-axis → urgency_score  (0 = far, 1 = imminent)
  Y-axis → emotional_weight (1 = excited bottom, 5 = dreading top)
      │
      ▼
Quadrant fills applied:
  top-right  (urgency > 0.5, weight > 3) → muted red
  bottom-left (urgency ≤ 0.5, weight ≤ 3) → muted teal
      │
      ▼
Desktop: mouseover dot → QuadrantTooltip (offset 14px, edge-flip)
Mobile:  tap dot → QuadrantTooltip, tap elsewhere → dismiss
```

---

## 8. Deployment Architecture

```
GitHub repo
    │
    │  push to main
    ▼
Vercel (production deployment)
    ├── Next.js build
    ├── Static assets → Vercel CDN
    ├── API routes → Vercel Serverless Functions
    └── Environment variables pulled from Vercel dashboard
              │
              └── NEXT_PUBLIC_SUPABASE_URL
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                  SUPABASE_SERVICE_ROLE_KEY
                  DATABASE_URL
```

Preview deployments are created automatically on every PR branch. Each preview shares the same Supabase project (dev environment).

---

## 9. Folder Structure

```
orin/
├── app/
│   ├── layout.tsx                 — Supabase provider, Zustand, nudge polling
│   ├── page.tsx                   — Daily task view
│   ├── quadrant/
│   │   └── page.tsx               — Quadrant map
│   ├── calendar/
│   │   └── page.tsx               — Calendar view
│   └── api/
│       ├── tasks/
│       │   ├── route.ts           — GET, POST
│       │   ├── reorder/route.ts   — PATCH
│       │   ├── quadrant/route.ts  — GET
│       │   └── [id]/
│       │       ├── route.ts       — PATCH, DELETE
│       │       ├── defer/route.ts
│       │       ├── complete/route.ts
│       │       ├── emotional-state/route.ts
│       │       └── deferrals/route.ts
│       ├── reports/
│       │   └── weekly/route.ts
│       └── nudge-dismissals/
│           └── route.ts
├── components/
│   ├── TaskList.tsx
│   ├── TaskCard.tsx
│   ├── TaskCreateModal.tsx
│   ├── DeferralModal.tsx
│   ├── EmotionalStatePicker.tsx
│   ├── QuadrantMap.tsx
│   ├── QuadrantTooltip.tsx
│   ├── WeeklyReviewCard.tsx
│   └── NudgeBanner.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts              — browser Supabase client
│   │   └── server.ts              — server Supabase client (@supabase/ssr)
│   ├── prisma.ts                  — Prisma client singleton
│   └── rrule.ts                   — rrule.js helpers
├── store/
│   └── ui.ts                      — Zustand store
├── prisma/
│   └── schema.prisma
└── documents/
    ├── PRD.md
    ├── TRD.md
    └── ARCHITECTURE.md
```
