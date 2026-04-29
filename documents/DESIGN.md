# Orin — Design System

Derived from `exploration/5.html` (current). Earlier values from 4.html are superseded.

---

## 1. Typefaces

| Role | Family | Fallback | Usage |
|------|--------|----------|-------|
| Body / UI | **Plus Jakarta Sans** | system-ui, sans-serif | All prose, labels, buttons, nav |
| Monospace | **Fragment Mono** | SFMono-Regular, ui-monospace | Timestamps, badges, eyebrows, kbd hints |
| Handwritten accent | **Caveat** | cursive | Nudge quote marks only — never structure |

```css
font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
font-family: 'Fragment Mono', SFMono-Regular, 'SF Mono', ui-monospace, monospace;
font-family: 'Caveat', cursive;   /* load on-demand, not globally */
```

`-webkit-font-smoothing: antialiased` on `<body>`.

---

## 2. Colour Tokens

### Primitive palette

| Name | Hex | Notes |
|------|-----|-------|
| `--white` | `#ffffff` | |
| `--black` | `#000000` | |
| **Lime scale** | | Kanpla — highlights, progress, chips |
| `--lime-50` | `#f2fdec` | Lightest lime wash |
| `--lime-100` | `#e3ffd1` | Light lime surface |
| `--lime-200` | `#c8f7ae` | Muted lime |
| `--lime-400` | `#59d10b` | ★ Primary lime — progress, chips, excited |
| `--lime-dark` | `#243000` | Deep forest |
| `--lime-ink` | `#082d1d` | Darkest green text |
| **Emerald scale** | | Buttons, CTAs |
| `--meadow-400` | `#059669` | ★ Button/action green |
| `--meadow-600` | `#047857` | Button hover |
| **Ink** | | Near-black for strokes |
| `--ink-900` | `#050e11` | Primary text + ink borders + offset shadows |
| `--ink-800` | `#193238` | Secondary dark |
| **Stone scale** | | Warm neutral grays |
| `--stone-50` | `#fafbf7` | Page background |
| `--stone-100` | `#f8f9f5` | Sidebar background, card footer |
| `--stone-200` | `#f1f3ef` | Muted surface |
| `--stone-300` | `#e9ede9` | Border light |
| `--stone-400` | `#dde4de` | ★ Default border |
| `--stone-500` | `#c4cbc2` | Strong border, neutral state |
| `--stone-600` | `#b9d3c4` | Muted text |
| `--stone-700` | `#4a6d47` | Secondary text |

### Semantic surface tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--surface` | `#ffffff` | Cards, modals |
| `--surface-page` | `#fcfdfc` | App background |
| `--surface-subtle` | `--lime-50` (`#f2fdec`) | Quadrant bg, card footers, hover washes |
| `--surface-muted` | `--stone-200` (`#f1f3ef`) | Nav hover, capture input bg |
| `--surface-overlay` | `rgba(252,253,252,0.9)` | Topbar backdrop |

### Border / stroke tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--border` | `#dde4de` | Default — visible, not hairline |
| `--border-strong` | `#c4cbc2` | Dividers, section separators |
| `--border-ink` | `#050e11` | Ink strokes on primary buttons and featured cards |
| `--border-focus` | `#059669` | Focus ring colour |

> **Key shift from 4.html:** Borders are now *visible* (`#dde4de`), not hairlines (`rgba(0,0,0,0.06)`). Featured cards and primary buttons use `--ink-900` borders.

### Text tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--text-primary` | `#082d1d` (lime-ink) | Headings, section titles, body |
| `--text-secondary` | `#3d5a4a` | Card titles, body prose |
| `--text-tertiary` | `#4a6d47` (stone-700) | Labels, meta, timestamps |
| `--text-muted` | `#b9d3c4` (stone-600) | Placeholders, disabled hints |
| `--text-disabled` | `#c4cbc2` (stone-500) | Inactive |
| `--text-inverse` | `#ffffff` | Text on dark/filled backgrounds |
| `--text-accent` | `#243000` (lime-dark) | Active sort label, section links |

### Brand / interactive tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--accent` | `#059669` | Buttons, active nav bg |
| `--accent-hover` | `#047857` | Button hover |
| `--accent-subtle` | `#f2fdec` | Hover wash on ghost buttons |
| `--accent-muted` | `#e3ffd1` | Recur pill bg |
| `--accent-ring` | `rgba(89,209,11,0.3)` | Focus ring |
| `--lime` | `#59d10b` | Progress fills, chips, excited accent |
| `--lime-subtle` | `#f2fdec` | Card footer, quadrant bg |
| `--lime-muted` | `#e3ffd1` | Insight callout bg, review cells |

### Emotional state colours

Each state has four values: **accent** (solid), **dark** (text on bg), **background**, **border**.

| State | Accent | Dark | Background | Border |
|-------|--------|------|------------|--------|
| **Dreading** | `#c23934` | `#991e4b` | `#fcf0f3` | `#e9c3c1` |
| **Anxious** | `#886a00` | `#886a00` | `#f9f2d9` | `#ebd587` |
| **Neutral** | `#c4cbc2` | `#4a6d47` | `#f1f3ef` | `#dde4de` |
| **Willing** | `#2b6b5e` | `#234b43` | `#e8f5f5` | `#bed7d7` |
| **Excited** | `#59d10b` | `#243000` | `#f2fdec` | `#c8f7ae` |

> **Key shift from 4.html:** All emotion colours are darker and more muted. Excited now uses Kanpla lime (`#59d10b`) instead of green (`#22C55E`).

### Supplementary pills

| Pill | Background | Text | Border |
|------|------------|------|--------|
| Deferred | `#fcf0f3` | `#991e4b` | `#e9c3c1` |
| Recurring | `#e3ffd1` | `#059669` | `#e3ffd1` |
| Completed strip | `#c4cbc2` | — | — |

---

## 3. Typography Scale

| Element | Size | Weight | Family | Letter-spacing | Notes |
|---------|------|--------|--------|----------------|-------|
| Page title | `30px` | `800` | Jakarta | `-0.04em` | line-height: 1 |
| Featured card title | `20px` | `700` | Jakarta | `-0.025em` | line-height: 1.3 |
| Grid card title | `15px` | `600` | Jakarta | `-0.02em` | line-height: 1.36 |
| Section title | `15px` | `800` | Jakarta | `-0.03em` | lime-ink colour |
| Sidebar logo | `15px` | `700` | Jakarta | `-0.03em` | |
| Weekly review stat | `24px` | `900` | Jakarta | `-0.05em` | line-height: 1 |
| Stats band number | `24px` | `900` | Jakarta | `-0.04em` | line-height: 1 |
| Body / base | `13.5px` | `400` | Jakarta | — | |
| Nav item | `12.5px` | `450` | Jakarta | — | 600 when active |
| Buttons | `12.5px` | `700` | Jakarta | `-0.01em` | |
| Ghost buttons | `12.5px` | `500` | Jakarta | — | |
| Pill label | `11px` | `600` | Jakarta | — | |
| Section label / sub | `11px` | `500` | Jakarta | — | |
| Stat label | `11px` | `500` | Jakarta | — | |
| Section chip | `11px` | `700` | Jakarta | `0.04em` | uppercase |
| Sidebar section label | `10px` | `600` | Jakarta | `0.08em` | uppercase |
| Eyebrow | `11px` | `400` | Fragment Mono | `0.08em` | uppercase |
| Timestamp / time | `11px` | `400` | Fragment Mono | — | |
| Badge / count | `10px` | `600` | Jakarta | — | pill shape |
| Kbd hint | `10px` | `400` | Fragment Mono | — | on capture bar |
| Quadrant label | `8.5px` | `500` | Fragment Mono | `0.07em` | uppercase |
| Axis label | `8px` | `400` | Jakarta | `0.05em` | uppercase |
| Card done (struck) | `15px` | `400` | Jakarta | — | strikethrough, tertiary colour |

---

## 4. Spacing Scale

Formal scale — use these values, not arbitrary numbers.

| Token | Value |
|-------|-------|
| `--sp-0` | `2px` |
| `--sp-1` | `4px` |
| `--sp-2` | `8px` |
| `--sp-3` | `12px` |
| `--sp-4` | `16px` |
| `--sp-5` | `20px` |
| `--sp-6` | `24px` |
| `--sp-8` | `32px` |
| `--sp-10` | `40px` |
| `--sp-12` | `48px` |
| `--sp-16` | `64px` |

### Spacing in context

| Element | Padding |
|---------|---------|
| Sidebar logo bar | `0 20px` (height 50px) |
| Sidebar section | `16px 12px` |
| Sidebar nav item | `8px 8px` |
| Sidebar stats block | `12px 16px` |
| Sidebar bottom | `12px` |
| Topbar | `0 24px` (height 50px) |
| Content scroll | `24px 24px 64px` |
| Page header margin-bottom | `24px` |
| Featured card header | `20px 24px 16px` |
| Featured card nudge | `16px 20px` |
| Featured card footer | `12px 24px` |
| Grid card body | `20px 20px 16px` |
| Grid card footer | `8px 20px 12px` |
| Stats band cell | `16px 20px` |
| Review cell | `16px` |
| Insight callout | `16px` |
| Section margin-bottom | `32px` |
| Section head margin-bottom | `16px` |

---

## 5. Layout

### Shell
```
display: flex;
height: 100vh;
overflow: hidden;
background: #fcfdfc;   /* surface-page */
```

### Sidebar
```
width: 220px;          /* down from 252px */
background: #f8f9f5;   /* stone-100 */
border-right: 1.5px solid #dde4de;   /* visible stroke */
```

### Main area
```
flex: 1;
background: #ffffff;   /* surface — white, not page bg */
display: flex; flex-direction: column;
```

### Topbar (sticky)
```
height: 50px;
border-bottom: 1.5px solid #dde4de;
background: rgba(252,253,252,0.9);
backdrop-filter: blur(12px);
padding: 0 24px;
```

### Content column
```
max-width: 860px;      /* up from 660px */
margin: 0 auto;
padding: 24px 24px 64px;
```

---

## 6. Border Radius Scale

| Token | Value | Used on |
|-------|-------|---------|
| `--r-xs` | `4px` | Kbd hints, tiny chips |
| `--r-sm` | `6px` | Pills, sort buttons, nav items, logo icon |
| `--r-md` | `8px` | Buttons, capture bar, sidebar stats, icon buttons |
| `--r-lg` | `12px` | Stats band, quadrant bg, insight callout, review cells |
| `--r-xl` | `16px` | Task cards, featured card, quadrant card, review card |
| `--r-2xl` | `20px` | (reserved) |
| `--r-full` | `9999px` | Progress bars, mood swatches, counts/badges, avatar |

---

## 7. Shadows & Strokes

### The ink offset shadow — signature pattern

Featured cards, quadrant card, review card, and primary buttons on hover use a **hard offset shadow** instead of a blurred drop shadow:

```css
/* Resting — featured/section cards */
border: 1.5px solid var(--ink-900);
box-shadow: 3px 3px 0 var(--ink-900);

/* Hover — cards */
box-shadow: 5px 5px 0 var(--ink-900);
transform: translate(-1px, -1px);

/* Hover — primary button */
box-shadow: 2px 3px 0 var(--ink-900);
transform: translateY(-1px);
```

> This is the most important visual signature of 5.html. Featured cards have ink borders + offset shadows at rest. Regular grid cards gain them only on hover.

### Regular card (grid) — resting
```css
border: 1.5px solid #dde4de;   /* border token */
/* no shadow at rest */
```

### Regular card — hover
```css
border-color: var(--ink-900);
box-shadow: 3px 3px 0 var(--ink-900);
transform: translate(-1px, -1px);
```

### Blur shadows (utility)

```css
--shadow-xs: 0 1px 2px rgba(0,0,0,0.04);
--shadow-sm: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04);
--shadow-md: 0 4px 6px rgba(0,0,0,0.05), 0 2px 4px rgba(0,0,0,0.04);
--shadow-lg: 0 10px 15px rgba(0,0,0,0.07), 0 4px 6px rgba(0,0,0,0.04);
--shadow-focus: 0 0 0 3px rgba(89,209,11,0.3);
```

---

## 8. Dividers

Two types — use consistently:

| Type | CSS | When to use |
|------|-----|-------------|
| **Section rule** | `border-top: 1px solid #dde4de` | Between sidebar sections, inside cards (footer, subtasks, legend) |
| **Page divider** | `<hr> border-top: 1px solid #dde4de; margin: 32px 0` | Between major page sections (e.g. tasks → quadrant) |

> **Key shift from 4.html:** No more `rgba(0,0,0,0.06)` hairlines. All dividers use `#dde4de` (stone-400) — same as the border token.

---

## 9. Components

### Sidebar nav item — three states

Ink strokes do **not** apply to navigation. Nav keeps the subtle style from 4.html.

| State | Background | Text | Border |
|-------|------------|------|--------|
| Default | transparent | `#8C8880` | none |
| Hover | `#f1f3ef` (stone-200) | `#4C4840` | none |
| **Active** | `#EDE8E0` | `#1A1814` | none |

Active nav shows a warm cream background with dark text — no ink border, no filled colour. This keeps navigation calm and unobtrusive.

Count badge:
- Default: `bg: #f1f3ef`, `color: #B0A89E`, `border-radius: 9999px`
- Active: `bg: #E0DBD4`, `color: #6C6860`

### Task card anatomy — featured (urgent)

```
┌─────────────────────────────────────┐  ← border: 1.5px ink, shadow: 3px 3px 0 ink
│  3px colour strip                   │
├─────────────────────────────────────┤
│  [emoji]  [pills + timestamp]       │  fc-header: 20px 24px
│           [Title 20px 700]          │
│           [Property table]          │  key/value grid, mono timestamps
├─────────────────────────────────────┤
│  [Nudge — amber bg + ink border]    │  margin: 0 24px 16px
├─────────────────────────────────────┤
│  bg: lime-50  border-top: stone-400 │
│  [✓ Mark done] [Push →] [Break down]│  fc-footer: 12px 24px
└─────────────────────────────────────┘
```

### Task card anatomy — grid card

```
┌─────────────────────────────────────┐  ← border: 1.5px stone-400 (→ ink on hover)
│  3px colour strip                   │
├─────────────────────────────────────┤
│  [emoji]             [time]         │  tc-body: 20px 20px 16px
│  [Title 15px 600]                   │
│  [pills]                            │
│  [subtasks — optional]              │
├─────────────────────────────────────┤
│  bg: stone-100  border-top:stone-300│
│  [✓ Done]  [Push →]                 │  compact buttons: xs size
└─────────────────────────────────────┘
```

### State pills — now have borders

```css
/* All pills */
font-size: 11px; font-weight: 600;
padding: 2px 7px; border-radius: 6px;
border: 1px solid var(--state-border);
background: var(--state-bg);
color: var(--state-dark);
```

### Section header pattern

```
[chip]          ← lime bg + lime border, uppercase, 11px 700
[title]         ← 15px 800, lime-ink
[subtitle]      ← 11px, tertiary
```

Chips:
```css
background: #e3ffd1; border: 1.5px solid #c8f7ae;
border-radius: 9999px; padding: 2px 10px;
font-size: 11px; font-weight: 700; color: #243000;
letter-spacing: 0.04em; text-transform: uppercase;
```

### Primary button

```css
background: #059669;
border: 1.5px solid #050e11;   /* ink border — always */
color: #ffffff;
border-radius: 8px;
font-size: 12.5px; font-weight: 700; letter-spacing: -0.01em;
padding: 4px 16px;

/* hover */
background: #047857;
transform: translateY(-1px);
box-shadow: 2px 3px 0 #050e11;
```

### Ghost / secondary button

```css
background: #ffffff;
border: 1.5px solid #dde4de;
color: #3d5a4a;
border-radius: 8px;
font-size: 12.5px; font-weight: 500;

/* hover */
background: #f2fdec;   /* accent-subtle */
border-color: #c4cbc2;
color: #082d1d;
```

### Quick capture bar

```css
display: flex; align-items: center; gap: 12px;
padding: 12px 16px;
background: #ffffff;
border: 1px solid #dde4de;
border-radius: 12px;
margin-bottom: 20px;

/* focus-within */
border-color: #059669;
box-shadow: 0 0 0 3px rgba(89,209,11,0.3);
```

### Stats band (page header)

```css
display: flex;
border: 1.5px solid #050e11;   /* ink stroke */
border-radius: 12px;
overflow: hidden;

/* Each cell */
padding: 16px 20px;
border-right: 1px solid #dde4de;
```

### Progress bar

Track: `height: 3–4px`, `bg: #f1f3ef`, `border-radius: 9999px`
Fill: `bg: #59d10b` (Kanpla lime) — **not emerald** green

### Mood swatches

Five horizontal pips, `height: 3px`, `border-radius: 9999px`, `opacity: 0.6`. Each uses the emotion accent colour.

### Quadrant / review cards

```css
border: 1.5px solid #050e11;
border-radius: 16px;
box-shadow: 3px 3px 0 #050e11;

/* Header */
background: #f2fdec;   /* lime-50 wash */
border-bottom: 1px solid #dde4de;
padding: 16px 24px;
```

### Weekly review grid

4-column grid of cells:
```css
background: #f2fdec;   /* lime-50 */
border: 1px solid #c8f7ae;   /* lime-200 */
border-radius: 12px;
padding: 16px;
text-align: center;
```

Insight callout:
```css
background: #e3ffd1;   /* lime-100 */
border: 1.5px solid #c8f7ae;
border-radius: 12px;
font-size: 13.5px; color: #082d1d; line-height: 1.55;
```

---

## 10. Scrollbars

```css
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: #dde4de; border-radius: 9999px; }
```

---

## 11. Transitions

| Element | Value |
|---------|-------|
| Nav items, buttons | `all 0.12s` |
| Cards (hover lift) | `border-color 0.15s, box-shadow 0.15s, transform 0.15s` |
| Capture bar focus | `border-color 0.15s, box-shadow 0.15s` |
| Primary button hover | `all 0.13s` |
| Quadrant dot scale | `transform 0.13s` |

---

## 12. Design Principles

1. **Ink strokes are the signature.** Primary buttons, featured cards, quadrant card, and review card always have `1.5px solid #050e11` borders. On hover, cards grow a `3→5px` hard offset shadow. This is not negotiable.

2. **Two shades of green.** Emerald (`#059669`) = interactive actions (buttons, active nav). Lime (`#59d10b`) = data highlights (progress bars, chips, excited state, insight callouts). Never swap them.

3. **Page background ≠ card background.** Page is `#fcfdfc` (stone wash). Cards are `#ffffff` (white). Sidebar is `#f8f9f5` (stone-100). Three distinct surfaces.

4. **Borders are visible, not hairlines.** Default is `#dde4de`. No more `rgba(0,0,0,0.06)`. If you can barely see it, it's too light.

5. **Active nav = warm cream, not filled.** Active nav item uses `#EDE8E0` background with dark text — no ink border, no emerald fill. Navigation is calm; ink strokes are reserved for cards and buttons only.

6. **Pills always have borders.** Every emotional state pill, section chip, and badge has a matching-colour border. No borderless chips.

7. **Section chips before titles.** Every content section opens with a lime-tinted uppercase chip (e.g. `🔥 Urgent`, `📋 Today`), then a bold title, then a subtitle. This is the standard section header pattern.

8. **Featured = full width, urgent.** The most critical task (typically Dreading or overdue) gets the featured card layout (full width, property table, nudge block, lime footer). Other tasks go in the 2-column grid.

9. **Lime wash for context areas.** Card footers, quadrant background, review card header, insight callout — all use `#f2fdec` or `#e3ffd1`. This visually groups metadata/summary areas.

10. **Monospace for data only.** Fragment Mono on timestamps, eyebrows, kbd hints, quadrant labels. Never on prose, titles, or navigation.

11. **Emotion is always redundant.** Colour strip + text pill + emoji — never colour alone. Pills now add a border for even more non-colour distinction.

---

## 13. Fonts — Next.js setup

```tsx
import { Plus_Jakarta_Sans, Fragment_Mono } from "next/font/google";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300","400","500","600","700","800"],
  variable: "--font-jakarta",
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-mono",
});
```

Apply both variables to `<html>` and set `font-family: var(--font-jakarta)` on `<body>`.

Caveat loaded per-component (nudge only) with `display: "swap"`.

---

## 14. Updating `globals.css`

The CSS variables in `globals.css` need updating to match 5.html tokens. Key changes:

```css
/* Background */
--background: surface-page (#fcfdfc)

/* Borders — replace all rgba hairlines */
--border: #dde4de
--border-strong: #c4cbc2

/* Text */
--foreground: #082d1d   /* lime-ink, not warm dark */
--muted-foreground: #4a6d47

/* Primary (buttons) */
--primary: #059669      /* unchanged */

/* Emotion colours — updated */
--emotion-dreading:     0 65% 48%    /* #c23934 */
--emotion-dreading-bg:  350 82% 97%  /* #fcf0f3 */
--emotion-dreading-fg:  341 68% 36%  /* #991e4b */

--emotion-anxious:      44 100% 27%  /* #886a00 */
--emotion-anxious-bg:   46 79% 91%   /* #f9f2d9 */
--emotion-anxious-fg:   44 100% 27%  /* #886a00 */

--emotion-neutral:      135 8% 77%   /* #c4cbc2 */
--emotion-neutral-bg:   120 11% 95%  /* #f1f3ef */
--emotion-neutral-fg:   125 20% 35%  /* #4a6d47 */

--emotion-willing:      168 41% 30%  /* #2b6b5e */
--emotion-willing-bg:   180 40% 94%  /* #e8f5f5 */
--emotion-willing-fg:   168 35% 24%  /* #234b43 */

--emotion-excited:      91 88% 52%   /* #59d10b */
--emotion-excited-bg:   107 94% 97%  /* #f2fdec */
--emotion-excited-fg:   99 100% 13%  /* #243000 */
```
