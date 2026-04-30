# Orin — Design System

Source: `exploration/5.html` (current canonical reference).

---

## 1. Layout Shell

```
display: flex; height: 100vh; overflow: hidden;
background: #fcfdfc;  (surface-page)

├── Sidebar          220px  flex-shrink: 0
│   background: #f8f9f5  (stone-100)
│   border-right: 1.5px solid #dde4de
│
└── Main             flex: 1
    background: #ffffff  (surface)
    display: flex; flex-direction: column;

    ├── Topbar        50px  flex-shrink: 0
    │   border-bottom: 1.5px solid #dde4de
    │   background: rgba(252,253,252,0.9)  backdrop-filter: blur(12px)
    │
    └── Content       flex: 1; overflow-y: auto
        padding: 24px 24px 64px
        .content-inner { max-width: 860px; margin: 0 auto; }
```

---

## 2. Tokens

### Primitives

| Name | Value | Usage |
|------|-------|-------|
| `surface-page` | `#fcfdfc` | App background (shell) |
| `surface` | `#ffffff` | Main column background |
| `stone-100` | `#f8f9f5` | Sidebar background |
| `stone-200` | `#f1f3ef` | Muted surface, hover bg |
| `stone-300` | `#e9ede9` | Light border |
| `stone-400` | `#dde4de` | Default border |
| `stone-500` | `#c4cbc2` | Strong border |
| `lime-400` | `#59d10b` | Progress fills, chips |
| `lime-50` | `#f2fdec` | Accent-subtle hover wash |
| `lime-100` | `#e3ffd1` | Insight callout bg |
| `lime-200` | `#c8f7ae` | Lime border |
| `lime-dark` | `#243000` | Deep forest text |
| `lime-ink` | `#082d1d` | Primary text |
| `ink-900` | `#050e11` | Ink borders + offset shadows |
| `accent` | `#059669` | Buttons, active nav |
| `accent-hover` | `#047857` | Button hover |

### Semantic tokens

| Token | Value |
|-------|-------|
| `text-primary` | `#082d1d` |
| `text-secondary` | `#3d5a4a` |
| `text-tertiary` | `#4a6d47` |
| `text-muted` | `#b9d3c4` |
| `border` | `#dde4de` |
| `border-strong` | `#c4cbc2` |
| `border-ink` | `#050e11` |

---

## 3. Typefaces

| Role | Family | Usage |
|------|--------|-------|
| Body / UI | **Plus Jakarta Sans** → fallback Inter | All prose, labels, nav |
| Monospace | **Fragment Mono** → fallback monospace | Timestamps, eyebrows, kbd |

App currently uses Inter (configured in layout.tsx).

---

## 4. Typography scale

| Token | Size | Usage |
|-------|------|-------|
| `text-2xs` | 10px | Eyebrows, section labels, counts |
| `text-xs` | 11px | Stat labels, sub-labels |
| `text-sm` | 12.5px | Nav items, buttons, body |
| `text-base` | 13.5px | Default body text |
| `text-md` | 15px | Sidebar logo, section titles |
| `text-lg` | 17px | — |
| `text-xl` | 20px | Featured card title |
| `text-2xl` | 24px | Stat numbers |
| `text-3xl` | 30px | Page title |
| `text-4xl` | 38px | — |

---

## 5. Spacing scale

| Token | Value |
|-------|-------|
| `sp-1` | 4px |
| `sp-2` | 8px |
| `sp-3` | 12px |
| `sp-4` | 16px |
| `sp-5` | 20px |
| `sp-6` | 24px |
| `sp-8` | 32px |
| `sp-16` | 64px |

---

## 6. Border radius

| Token | Value | Used on |
|-------|-------|---------|
| `r-xs` | 4px | Kbd, tiny chips |
| `r-sm` | 6px | Nav items, pills, sort buttons |
| `r-md` | 8px | Buttons, capture bar, icon buttons |
| `r-lg` | 12px | Stats band, callouts, review cells |
| `r-xl` | 16px | Task cards, featured card |
| `r-full` | 9999px | Progress bars, counts, avatar |

---

## 7. Shadows

### Ink offset shadow — featured cards, section cards, primary button hover

```css
/* Resting — featured/quadrant/review cards */
border: 1.5px solid #050e11;
box-shadow: 3px 3px 0 #050e11;

/* Hover — grid cards on hover only */
border-color: #050e11;
box-shadow: 3px 3px 0 #050e11;
transform: translate(-1px, -1px);

/* Primary button hover */
box-shadow: 2px 3px 0 #050e11;
transform: translateY(-1px);
```

> Ink strokes apply to: featured cards, section-level cards (quadrant, review), primary buttons on hover.
> They do NOT apply to: navigation items, sidebar, regular grid task cards at rest.

### Regular task card

```css
/* Resting */
border: 1px solid rgba(0,0,0,0.04);
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 18px rgba(0,0,0,0.07);

/* Hover — lift only, no ink */
transform: translateY(-3px);
box-shadow: 0 2px 6px rgba(0,0,0,0.05), 0 16px 44px rgba(0,0,0,0.11);
```

---

## 8. Sidebar

```
width: 220px
background: #f8f9f5  (stone-100)
border-right: 1.5px solid #dde4de

Logo bar (50px, border-bottom):
  [O] square icon — 22×22, radius 6, emerald bg, ink border
  "orin" — 15px 700, lime-ink

Section: Views (border-bottom)
  Label: 10px 600 uppercase letter-spacing 0.08em, textTertiary
  Nav items: 12.5px, radius 6, gap 8
    Active: emerald bg + white text + ink border (1px)
    Hover: stone-200 bg
    Count badge: stone-200 bg at rest, rgba(255,255,255,0.2) when active

Section: Mood filter (border-bottom)
  5-pip colour bar (3px height, 0.6 opacity)
  Emotion items: 7px dot + label + count

Section: Stats block (flex:1)
  White card, stone-400 border, radius 12
  Completed / Deferred / Pending rows
  Progress bar: lime-400 fill on stone-400 track

Footer: New task dashed button (border-top)
  1.5px dashed border-strong
  Hover: accent border + accent text + accent-subtle bg
```

---

## 9. Topbar

```
height: 50px
border-bottom: 1.5px solid #dde4de
background: rgba(252,253,252,0.9)  backdrop-filter: blur(12px)
padding: 0 24px

Left: Breadcrumb
  Workspace / [current page]
  current page: 12.5px 600 text-primary

Right: Sort + controls
  "Sort" label (11px textTertiary)
  Sort buttons (radius r-sm, border stone-400):
    Active: accent bg + #fff + ink border
    Hover: accent-subtle bg + stone-500 border
  Search icon button (30×30, radius r-md, border stone-400)
  Divider: 1px × 18px stone-400
  "+ New task" CTA: accent bg, ink border, hover ink shadow
  Avatar: 28×28, radius full, accent bg, ink border
```

---

## 10. Emotional state tokens

| State | Accent | Background | Foreground | Border |
|-------|--------|------------|------------|--------|
| Dreading | `#c23934` | `#FFF0EC` | `#D14626` | `#e9c3c1` |
| Anxious | `#886a00` | `#FFF8E8` | `#B07A10` | `#ebd587` |
| Neutral | `#c4cbc2` | `#F3F2F0` | `#7A756E` | `#dde4de` |
| Willing | `#2b6b5e` | `#EEF9F7` | `#0E8A7D` | `#bed7d7` |
| Excited | `#59d10b` | `#EEFAF1` | `#1A9444` | `#c8f7ae` |

---

## 11. Task card (3.html design)

```
background: #FFFEFB    border-radius: 16px
border: 1px solid rgba(0,0,0,0.04)
box-shadow: 0 1px 2px rgba(0,0,0,0.04), 0 4px 18px rgba(0,0,0,0.07)

4px colour strip (emotion accent)
padding: 16px 18px 12px

Timestamp row: DM Mono 10.5px, muted / red if overdue
Title: 15px 700 (17px for DREADING), letter-spacing -0.02em
State pill: emoji + label, emotion bg/text, border-radius 7px
Deferred badge: #FFF0EC bg, #D14626 text

Footer (border-top #F2EEE8):
  18px circle checkbox + "Mark complete" + "Push this →" button
```

---

## 12. Content sections

```
Section chip (before title):
  #e3ffd1 bg, #c8f7ae border, radius 9999, 11px 700 uppercase

Section title: 15px 800, lime-ink, letter-spacing -0.03em

Section divider: <hr> border-top 1px stone-400; margin 32px 0

Featured card (full-width, urgent):
  border: 1.5px solid ink-900
  box-shadow: 3px 3px 0 ink-900
  Card header: emoji + pills + property table + title
  Footer bg: lime-50

Grid card (2-column):
  border: 1.5px solid stone-400
  hover → ink border + 3px 3px 0 ink shadow + translate(-1px,-1px)
```

---

## 13. Design principles

1. **Ink strokes on cards and CTAs only.** Never on navigation items or sidebar.
2. **Two greens:** Emerald `#059669` = actions/interactive. Lime `#59d10b` = data/progress/chips.
3. **White main, stone sidebar.** `#ffffff` main content, `#f8f9f5` sidebar, `#fcfdfc` shell.
4. **Visible borders.** `#dde4de` everywhere — no rgba hairlines.
5. **Active nav = solid emerald.** Emerald bg + white text + ink border on active nav item.
6. **Pills always have borders.** Matching emotion border on all state pills.
7. **Section chips before titles.** Lime chip (e.g. `🔥 Urgent`) → bold title → subtitle.
8. **Emotion is always redundant.** Colour + emoji + text label. Never colour alone.
9. **Relief copy.** "Giving yourself more time" not "Task postponed".
10. **Monospace for data.** Fragment Mono on timestamps, eyebrows, kbd hints. Never on nav.
