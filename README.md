# Orin

**A todo app that takes the emotional weight of tasks seriously.**

[Live →](https://orin-hazel.vercel.app)


## Why this exists

Existing todo apps treat all tasks as equal boxes to check. They ignore the emotional reality that a 10-minute task you dread can feel heavier than a 3-hour task you enjoy. That asymmetry creates the same three failure modes over and over: task-avoidance loops where the dreaded item rolls over day after day, decision paralysis when everything looks the same, and guilt spirals as missed tasks stack up with no context for *why* they were missed.

Orin is built for students, professionals, and people with ADHD/anxiety who struggle not with *remembering* tasks but with *starting* them. Every task can carry an emotional weight (dreading → excited), every deferral is explicit and logged, and the app never moves a task without a tap. Nudges are surfaced as suggestions, never silent reschedules.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**, **Radix UI** primitives, **lucide-react**
- **Prisma 6** over Postgres, hosted on **Supabase** (auth + DB)
- **TanStack Query** for server state, **Zustand** for client state
- **dnd-kit** for drag-to-reorder, **d3** for the emotional quadrant view, **rrule** for recurrence
- Deployed on **Vercel**

## Run locally

```bash
# 1. Clone and install
git clone https://github.com/sanjana-londhe/orin.git
cd orin
npm install

# 2. Set up env vars
cp .env.example .env.local
# Fill in Supabase URL + keys and the Postgres connection strings.
# DATABASE_URL uses the pooler (port 6543), DIRECT_URL is the direct connection (port 5432).

# 3. Push the Prisma schema to your database
npx prisma db push

# 4. Run the dev server (port 3100)
npm run dev
```

Open <http://localhost:3100>.

## Project layout

```
app/            Next.js App Router routes (api, auth, login, signup, (app) group)
components/    React components — calendar, energy view, task cards, etc.
hooks/         Custom React hooks
lib/           Server + client utilities (Supabase, Prisma, helpers)
prisma/        schema.prisma + migrations
store/         Zustand stores
supabase/      Supabase migrations and config
```

## Design + product docs

Lives in Notion. Ask the maintainer for a link.
