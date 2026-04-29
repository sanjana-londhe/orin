# Orin — Design System

Derived from `exploration/4.html`. Every value here is exact — use these and nothing else when building UI.

---

## 1. Typefaces

| Role | Family | Usage |
|------|--------|-------|
| Body / UI | **Inter** | All prose, labels, buttons, nav |
| Monospace | **DM Mono** | Timestamps, badges, eyebrows, quadrant labels |
| Handwritten accent | **Caveat** | Page title accents, nudge quote marks only |

```css
font-family: 'Inter', sans-serif;
font-family: 'DM Mono', monospace;
font-family: 'Caveat', cursive;
```

`-webkit-font-smoothing: antialiased` on `<body>`.

---

## 2. Colour Tokens

### Base palette

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-bg` | `#F3F1EC` | App background (warm off-white) |
| `--color-surface` | `#FFFFFF` | Cards, sidebar |
| `--color-surface-raised` | `#F9F8F5` | Quadrant bg, stat tiles |
| `--color-surface-footer` | `#FDFCFA` | Card footer |
| `--color-border` | `rgba(0,0,0,0.06)` | Dividers, section rules |
| `--color-border-card` | `#EDE8E0` | Card borders |
| `--color-border-card-footer` | `#F0ECE6` | Card footer top border |

### Text

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-text-primary` | `#1A1814` | Headings, active nav, card titles |
| `--color-text-body` | `#4C4840` | Action item text |
| `--color-text-secondary` | `#8C8880` | Sidebar task titles, ghost button text |
| `--color-text-tertiary` | `#A09890` | Subtitles, section subs, month-year |
| `--color-text-muted` | `#B0A89E` | Eyebrows, timestamps, badge text |
| `--color-text-faint` | `#C0B8AE` | Card timestamps |
| `--color-text-overdue` | `#D14626` | Overdue timestamp text |

### Brand / Primary

| Token | Hex | Usage |
|-------|-----|-------|
| `--color-primary` | `#059669` | CTA buttons, active sort pill, progress fill, section underlines |
| `--color-primary-hover` | `#047857` | Primary button hover |

### Emotional state colours

Each state has three values: **accent** (solid), **background** (tinted), **foreground** (dark text on bg).

| State | Accent | Background | Foreground |
|-------|--------|------------|------------|
| **Dreading** | `#EF4444` | `#FEF2F0` | `#C0381A` |
| **Anxious** | `#F59E0B` | `#FEFBF0` | `#A87210` |
| **Neutral** | `#D1D5DB` | `#F3F2F0` | `#706C68` |
| **Willing** | `#14B8A6` | `#EEFAF8` | `#0C847A` |
| **Excited** | `#22C55E` | `#EEFAF0` | `#168A3A` |

These map directly to the CSS vars in `globals.css`:
- `--emotion-{state}` → accent
- `--emotion-{state}-bg` → background
- `--emotion-{state}-fg` → foreground

### Supplementary pills

| Pill | Background | Text |
|------|------------|------|
| Deferred | `#FEF2F0` | `#C0381A` |
| Recurring | `#EEF0FF` | `#4A4ACC` |
| Completed (strip) | `#E5E7EB` | — |

---

## 3. Typography Scale

| Element | Size | Weight | Family | Letter-spacing | Notes |
|---------|------|--------|--------|----------------|-------|
| Page title ("Today") | `40px` | `900` | Inter | `-0.045em` | line-height: 1 |
| Section title | `15px` | `800` | Inter | `-0.03em` | |
| Card title | `19px` | `600` | Inter | `-0.025em` | line-height: 1.35 |
| Card title done | `19px` | `400` | Inter | `-0.025em` | strikethrough, color `#B0A89E` |
| Sidebar logo | `15px` | `800` | Inter | `-0.05em` | |
| Sidebar date big | `34px` | `900` | Inter | `-0.05em` | line-height: 1 |
| Nav link | `12.5px` | `400/500` | Inter | — | 500 when active |
| Body / subtitle | `13.5px` | `400` | Inter | — | |
| Card timestamp | `10px` | `400` | DM Mono | — | |
| Eyebrow | `10px` | `400` | DM Mono | `0.1em` | uppercase |
| Badge | `9.5px` | `400` | DM Mono | — | |
| Sidebar weekday | `9px` | `400` | DM Mono | `0.1em` | uppercase |
| Sidebar time | `9px` | `400` | DM Mono | — | |
| Sidebar task title | `11.5px` | `400` | Inter | — | line-height: 1.36 |
| Sidebar month-year | `11px` | `400` | Inter | — | |
| Pill label | `11px` | `600` | Inter | — | |
| Action item text | `12.5px` | `400` | Inter | — | line-height: 1.4 |
| Action item label | `9.5px` | `700` | Inter | `0.1em` | uppercase |
| Button (primary) | `12px` | `700` | Inter | — | |
| Button (ghost) | `12px` | `500` | Inter | — | |
| Sort button | `12px` | `400/600` | Inter | — | 600 when active |
| Handwritten accent | `26px` | `600` | Caveat | — | |
| Nudge quote mark | `44px` | `400` | Caveat | — | decorative |
| Weekly review stat | `22px` | `900` | Inter | `-0.04em` | line-height: 1 |
| Weekly review title | `14px` | `700` | Inter | `-0.02em` | |
| Weekly review sub | `10px` | `400` | DM Mono | — | |
| Insight text | `13px` | `400` | Inter | — | line-height: 1.55 |
| Legend label | `11px` | `400` | Inter | — | |
| Quadrant label | `8.5px` | `500` | DM Mono | `0.07em` | uppercase |
| Axis label | `8px` | `400` | Inter | `0.05em` | uppercase |

---

## 4. Layout

### Shell
```
display: flex;
height: 100vh;
overflow: hidden;
background: #F3F1EC;
```

### Sidebar
```
width: 252px;
flex-shrink: 0;
background: #FFFFFF;
border-right: 1px solid rgba(0,0,0,0.07);
display: flex; flex-direction: column;
```

### Main area
```
flex: 1;
overflow-y: auto;
scrollbar-width: 4px;
```

### Content column
```
max-width: 660px;
margin: 0 auto;
padding: 40px 36px 100px;
```

### Sticky toolbar
```
position: sticky; top: 0; z-index: 20;
height: 46px;
padding: 0 36px;
background: rgba(243,241,236,0.88);
backdrop-filter: blur(16px);
border-bottom: 1px solid rgba(0,0,0,0.06);
```

---

## 5. Spacing

| Usage | Value |
|-------|-------|
| Sidebar header padding | `20px 18px 16px` |
| Sidebar footer padding | `10px 8px` |
| Sidebar list padding | `4px 8px` |
| Sidebar item padding | `9px 10px` |
| Sidebar rule margin | `10px 0` |
| Card body padding | `18px 20px 16px` |
| Card footer padding | `12px 20px 14px` |
| Card stack gap | `12px` |
| Card top row margin-bottom | `10px` |
| Card pills margin-bottom | `12px` |
| Card title margin-bottom | `16px` |
| Section head margin-bottom | `14px` |
| Day header margin-bottom | `32px` |
| Day title-row margin-bottom | `6px` |
| Day subtitle margin-bottom | `14px` |
| Review body padding | `18px 20px` |
| Review benefits gap | `10px` |
| Stat tile padding | `14px 16px` |

---

## 6. Border Radius

| Element | Radius |
|---------|--------|
| Task card | `14px` |
| Section cards (quadrant, review) | `14px` |
| Nav link / sidebar item | `7–8px` |
| Pill | `6px` |
| Badge | `4px` |
| Primary button | `7px` |
| Ghost / action button | `7px` |
| "New task" button | `8px` |
| New task icon | `5px` |
| CTA button | `8px` |
| Nudge card | `10px` |
| Stat tile | `10px` |
| Insight card | `10px` |
| Quadrant dot | `50%` (circle) |
| Progress bar track | `999px` |
| Mood pip | `2px` |
| Action item checkbox | `3px` |
| Toolbar icon button | `7px` |
| Avatar | `50%` |

---

## 7. Shadows

```css
/* Card resting */
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 14px rgba(0,0,0,0.05);

/* Card hover */
box-shadow: 0 2px 6px rgba(0,0,0,0.05), 0 12px 32px rgba(0,0,0,0.09);
```

Cards also lift `-1px` on hover: `transform: translateY(-1px)`.

---

## 8. Transitions

| Element | Transition |
|---------|-----------|
| Nav links, sidebar items | `all 0.12s` |
| Task card hover | `box-shadow 0.2s ease, transform 0.2s ease` |
| Buttons | `all 0.12s` or `background 0.12s` |
| Toolbar buttons | `all 0.12s` |
| Quadrant dot hover | `transform 0.13s` |
| Action item checkbox | `all 0.12s` |

---

## 9. Components

### Sidebar nav link

Three states:
- **Default**: color `#9C9890`, background transparent
- **Hover**: background `#F3F1EC`, color `#4C4840`
- **Active**: background `#EDE8E0`, color `#1A1814`, font-weight 500

Badge: DM Mono 9.5px, background `#EDE8E0`, text `#B0A89E`. Active badge: background `#E0DBD4`, text `#6C6860`.

### Sidebar task item

- Border-left `2px solid transparent` → `var(--c)` when selected (--c = emotion accent colour)
- Selected background: `#EDE8E0`
- Hover background: `#F3F1EC`
- Faded (completed): `opacity: 0.3`
- Overdue pulse dot: 5×5px circle, animation `pulse 1.8s ease-in-out infinite`

### Task card anatomy

```
┌─────────────────────────────────┐
│  3px colour strip (emotion)     │  ← top strip, full width
├─────────────────────────────────┤
│  [timestamp]         [emoji]    │  ← card-top-row
│  [State pill] [defer pill]      │  ← card-pills
│                                 │
│  Task title (19px 600)          │  ← card-title
│                                 │
│  [Nudge card if applicable]     │  ← optional
│  [Action items if applicable]   │  ← optional
├─────────────────────────────────┤
│  bg #FDFCFA, border-top #F0ECE6 │
│  [✓ Mark done] [Push this →]    │  ← card-footer
└─────────────────────────────────┘
```

### Sort toolbar

- Label "sort" in DM Mono 11px `#B0A89E`
- Sort pills: 12px, border `rgba(0,0,0,0.09)`, color `#8C8880`
- Active sort pill: background `#059669`, color white, font-weight 600, border `#059669`
- Right side: icon buttons (29×29px, radius 7px), avatar (27×27px, radius 50%, bg `#DDD8D0`)

### Nudge card

- Background `#FEFBF0`, border `1px solid #EDE080`, radius 10px
- Quote mark: Caveat 44px, color `#F0D060`, absolute top-left
- Text: 13px, color `#7A6010`, line-height 1.55, padding-left 26px
- Actions: primary button (green) + ghost buttons + dismiss ✕

### Section header with handwritten underline

- Title: Inter 15px 800 `#1A1814` letter-spacing `-0.03em`
- Underline: SVG cubic bezier path, stroke `#059669` opacity 0.5, stroke-width 1.8
- Sub: 12px `#B0A89E`

### Mood bar

Five pips (one per emotional state), `flex: 1`, height 3px, radius 2px, opacity 0.7. Uses emotional accent colours left-to-right: Dreading → Anxious → Neutral → Willing → Excited.

### Progress bar

Track: `max-width 160px`, height 3px, bg `#E4DED8`, radius 999px.
Fill: bg `#059669`.
Label: DM Mono-style, 11.5px `#B0A89E`.

### Weekly review stat tile

```
┌──────────────────────────┐
│  [emoji]  [22px stat #]  │
│           [11px label]   │
└──────────────────────────┘
bg: #F9F8F5, border: #EDE8E0, radius: 10px, padding: 14px 16px
Stat colour = emotion accent of the relevant state
```

### Insight callout

bg `#F0FDF4`, border `#A7F3D0`, radius 10px, 13px text, color `#065F46`.

---

## 10. Scrollbars

```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }

/* Sidebar list — narrower */
.sb-list::-webkit-scrollbar { width: 2px; }
.sb-list::-webkit-scrollbar-thumb { background: #D8D2CC; }
```

---

## 11. Design Principles

1. **Warm, not clinical.** Background is `#F3F1EC` not white. Cards are white but surrounded by warmth.

2. **Emotion is always redundant.** Colour strip + text pill + emoji — never colour alone. Every emotional indicator has at least two non-colour signals.

3. **Monospace for data, Inter for meaning.** Timestamps, badges, eyebrows, axis labels → DM Mono. Titles, labels, copy → Inter.

4. **Handwriting as accent, never structure.** Caveat appears only in the page title accent and nudge quote marks. Never for navigation or data.

5. **Cards lift on hover, never pop.** `translateY(-1px)` + shadow increase — subtle physicality, not bounciness.

6. **Green is the action colour.** `#059669` is reserved for: primary CTA buttons, active state indicators, progress fill, section underlines, action item checkboxes when done. Never use it decoratively.

7. **Faded = done.** Completed items drop to `opacity: 0.3` — they stay visible for context but recede.

8. **Overdue is urgent red.** `#D14626` for overdue timestamps + `⚑` flag icon. The dreading emotion colour (`#EF4444`) is related but distinct.

9. **Borders are hairlines.** `rgba(0,0,0,0.06)` for rules, `#EDE8E0` for card borders. Nothing heavier.

10. **DM Mono eyebrows set context.** Uppercase DM Mono in `#B0A89E` with `letter-spacing: 0.1em` is the standard pattern for meta-information above titles (e.g. "Daily focus · Tue 29 Apr").

---

## 12. Fonts to add to Next.js

Update `app/layout.tsx`:

```tsx
import { Inter, DM_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-dm-mono",
});
// Caveat loaded only where used (nudge, title accent) to avoid bloat
```

Caveat should be loaded on-demand via `next/font/google` with `display: swap` on the specific components that use it, not globally.
