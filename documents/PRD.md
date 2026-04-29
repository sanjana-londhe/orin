# 📋 PRD: Orin Todo App

## 1. Summary
A web-based task management app built for students, professionals, and people with ADHD/anxiety who struggle not with remembering tasks but with *starting* them.

## 2. Problem Statement
Existing todo apps treat all tasks as equal boxes to check. They ignore the emotional reality that a 10-minute task you dread can feel heavier than a 3-hour task you enjoy. This creates:
- **Task avoidance loops** — the same dreaded item rolls over day after day
- **Decision paralysis** — users don't know where to start when everything looks the same
- **Guilt spirals** — missed tasks stack up with no context for *why* they were missed

## 3. Features

1. Task creation with title, due date, due time, and emotional weight
2. Emotional weight picker (5 states)

| State | Label | Description | Color |
|-------|-------|-------------|-------|
| 1 | Dreading | "I really don't want to do this" | Red-orange |
| 2 | Anxious | "This makes me nervous/overwhelmed" | Amber |
| 3 | Neutral | "I feel nothing about this" | Gray |
| 4 | Willing | "I don't mind doing this" | Teal |
| 5 | Excited | "I actually want to do this" | Green |

State is **optional** on task creation. Untagged tasks are treated as Neutral internally.  
State can be updated at any time — the history of state changes is logged.  
No state is "bad" — UI copy is entirely non-judgmental. "Dreading" is shown without shame framing.

3. Defer by hours (1h, 2h, 4h, 8h) — consent-gated
4. Reschedule to new date/time — consent-gated
5. Daily task view
6. Responsive web UI
7. Smart nudge system (surfaced as suggestions, never auto-actions)
8. Weekly emotional review ("You deferred 4 tasks tagged 'Dreading' this week")
9. The Emotional Task Quadrant Map: visualization that plots a user's tasks on a 2D scatter grid

   Two-axis scatter plot:
   - **X-axis:** Deadline urgency. Left = far off, right = imminent. Deadline date maps to position linearly within the selected time range.
   - **Y-axis:** Emotional weight. Bottom = excited / eager, top = dreading / avoidant.

   The grid is divided into four quadrants by dashed centerlines.

   **Top-right quadrant** (imminent + dreading) renders with a distinct danger tint (muted red fill). This is the primary "on fire" zone.

   **Bottom-left quadrant** (far + excited) renders with a calm tint (muted green). This is the safe zone.

   Top-left and bottom-right quadrants are visually neutral — no tint.

   Quadrant labels ("on fire", "safe zone") appear as low-contrast text anchored to the relevant corner. They are informational, not interactive.

   **Hover Interaction:** On desktop:
   - Hovering any task dot triggers a tooltip: Appears 14px to the right of the dot (flips left if near the right edge)
   - Contents:
     1. Emotional state label (colored to match dot)
     2. Deadline description (e.g. "due in 2 days", "due next week")
     3. Number of times deferred, if > 0 (e.g. "deferred 3×")
     4. Tooltip dismisses on mouse leave, no click required to activate
     5. On mobile: tap to show tooltip, tap elsewhere to dismiss

10. Subtasks (if user wants to breakdown a main task into subtasks)
11. Recurring tasks (like Google Calendar tasks)
12. Drag-to-reorder with friction sorting  
    Default sort order is by due date (earliest first). User can toggle to:
    1. Emotional state (dreading → excited)
    2. Manual / custom order
13. Calendar view

## Core Principle

> 🔒 **The app never moves a task without explicit user confirmation.** Every deferral is initiated by the user and requires a one-tap confirm. There are no automatic reschedules, no silent pushes.

### 4. Deferral Options
When a user taps "Push this task" on any task card, they see:

**Option A — Defer by hours:**
- +1 hour
- +2 hours
- +4 hours
- +8 hours
- Custom (time picker)

**Option B — Reschedule:**
- Tomorrow (same time)
- This weekend
- Next week (Monday)
- Pick a date (calendar picker)

Both options show the new calculated due time before confirming.

### Deferral Nudge Trigger
The app surfaces a deferral nudge (a non-blocking banner or inline prompt) when:
- Task has not been touched in > 6 hours
- Task is Dreading/Anxious AND due within 12 hours AND not completed

**Nudge copy examples:**
- "This one's been sitting heavy. Want to push it or break it down?"
- "You've deferred this twice. Want to reschedule it properly?"
- "3 hours left and this is tagged Anxious — any movement possible?"

The nudge offers: **Defer · Reschedule · Dismiss · Mark Done**. Dismissing it does not resurface for 2 hours.

### Deferral Log
Every deferral is logged with:
- Original due date/time
- New due date/time
- Emotional state at time of deferral
- Time of day the deferral happened
- Number of times this task has been deferred

## Design Notes
- **The deferral flow should feel like relief, not failure.** Copy like "Giving yourself more time on this one" rather than "Task postponed."
- **Emotional state changes are unrestricted** — users can update a task from Dreading to Neutral after making progress. This reflects real emotional shifts and should be celebrated subtly ("Nice — this one moved").
- **Accessibility:** Color is never the only indicator of emotional state. Each state has a distinct icon and label.
