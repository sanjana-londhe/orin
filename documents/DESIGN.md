---
version: alpha
name: Orin — Apple design system
description: A photography-first design language applied to a task app. Quiet surfaces (white ↔ parchment ↔ near-black), SF Pro typography with negative letter-spacing, and a single Action Blue (#0066cc) carrying every interactive signal. UI chrome recedes so the user's own tasks are the content that speaks — no decorative gradients, no shadows on chrome.

colors:
  primary: "#0066cc"
  primary-focus: "#0071e3"
  primary-on-dark: "#2997ff"
  ink: "#1d1d1f"
  body: "#1d1d1f"
  body-on-dark: "#ffffff"
  body-muted: "#cccccc"
  ink-muted-80: "#333333"
  ink-muted-64: "#86868b"
  ink-muted-48: "#7a7a7a"
  ink-muted-30: "#c7c7cc"
  divider-soft: "#f0f0f0"
  hairline: "#e0e0e0"
  canvas: "#ffffff"
  canvas-parchment: "#f5f5f7"
  surface-pearl: "#fafafc"
  surface-tile-1: "#272729"
  surface-tile-2: "#2a2a2c"
  surface-tile-3: "#252527"
  surface-black: "#000000"
  surface-chip-translucent: "#d2d2d7"
  on-primary: "#ffffff"
  on-dark: "#ffffff"
  danger: "#d70015"
  danger-bg: "#fdf0f0"
  danger-border: "#f0c9c9"
  flagged: "#ff9500"

typography:
  hero-display:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 56px
    fontWeight: 600
    lineHeight: 1.07
    letterSpacing: -0.28px
  display-lg:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 40px
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: 0
  display-md:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 34px
    fontWeight: 600
    lineHeight: 1.47
    letterSpacing: -0.374px
  lead:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.14
    letterSpacing: 0.196px
  lead-airy:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 24px
    fontWeight: 300
    lineHeight: 1.5
    letterSpacing: 0
  tagline:
    fontFamily: "SF Pro Display, system-ui, -apple-system, sans-serif"
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.19
    letterSpacing: 0.231px
  body-strong:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 600
    lineHeight: 1.24
    letterSpacing: -0.374px
  body:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 1.47
    letterSpacing: -0.374px
  dense-link:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 17px
    fontWeight: 400
    lineHeight: 2.41
    letterSpacing: 0
  caption:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.43
    letterSpacing: -0.224px
  caption-strong:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.29
    letterSpacing: -0.224px
  button-large:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 18px
    fontWeight: 300
    lineHeight: 1.0
    letterSpacing: 0
  button-utility:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.29
    letterSpacing: -0.224px
  fine-print:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: -0.12px
  micro-legal:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 10px
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: -0.08px
  nav-link:
    fontFamily: "SF Pro Text, system-ui, -apple-system, sans-serif"
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.0
    letterSpacing: -0.12px

rounded:
  none: 0px
  xs: 5px
  sm: 8px
  md: 11px
  lg: 18px
  pill: 9999px
  full: 9999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 17px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 80px

components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: 11px 22px
  button-primary-focus:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
  button-primary-active:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.pill}"
  button-secondary-pill:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: 11px 22px
  button-dark-utility:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button-utility}"
    rounded: "{rounded.sm}"
    padding: 8px 15px
  button-pearl-capsule:
    backgroundColor: "{colors.surface-pearl}"
    textColor: "{colors.ink-muted-80}"
    typography: "{typography.caption}"
    rounded: "{rounded.md}"
    padding: 8px 14px
  button-store-hero:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.button-large}"
    rounded: "{rounded.pill}"
    padding: 14px 28px
  button-icon-circular:
    backgroundColor: "{colors.surface-chip-translucent}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    size: 44px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  text-link-on-dark:
    backgroundColor: transparent
    textColor: "{colors.primary-on-dark}"
    typography: "{typography.body}"
  global-nav:
    backgroundColor: "{colors.surface-black}"
    textColor: "{colors.on-dark}"
    typography: "{typography.nav-link}"
    height: 44px
  sub-nav-frosted:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.tagline}"
    height: 52px
  product-tile-light:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  product-tile-parchment:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  product-tile-dark:
    backgroundColor: "{colors.surface-tile-1}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  product-tile-dark-2:
    backgroundColor: "{colors.surface-tile-2}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
  product-tile-dark-3:
    backgroundColor: "{colors.surface-tile-3}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.none}"
  store-utility-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.lg}"
    padding: 24px
  configurator-option-chip:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 12px 16px
  configurator-option-chip-selected:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
  search-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.pill}"
    padding: 12px 20px
    height: 44px
  floating-sticky-bar:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    height: 64px
    padding: 12px 32px
  environment-quote-card:
    backgroundColor: "{colors.surface-tile-1}"
    textColor: "{colors.on-dark}"
    typography: "{typography.display-lg}"
    rounded: "{rounded.none}"
    padding: 80px
  footer:
    backgroundColor: "{colors.canvas-parchment}"
    textColor: "{colors.ink-muted-80}"
    typography: "{typography.fine-print}"
    padding: 64px
---

## Overview

Apple's web presence is a masterclass in **reverent product photography framed by near-invisible UI**. Every page is a stack of edge-to-edge product "tiles" — alternating light and dark canvases, each centered on a hero headline, a one-line tagline, two tiny blue pill CTAs, and an impossibly crisp product render. Nothing competes with the product. Typography is confident but quiet; color is either pure white, an off-white parchment, or a near-black tile; interactive elements are a single, quiet blue.

Density is unusually low even by contemporary SaaS standards. Each tile occupies roughly one viewport, and there is no decorative chrome — no borders, no gradients, no decorative frames, no shadows on headlines. Elevation appears only when a product image rests on a surface (a single soft `rgba(0, 0, 0, 0.22) 3px 5px 30px` drop for visual weight). The result is a catalog that feels more like a museum gallery: the wall disappears and the artifact takes over.

Store and shop surfaces retain the same chassis but switch modes. The product configurator introduces a tight grid of white utility cards at `{rounded.lg}` (18px) radius with a thin border, paired with a persistent thin sub-nav strip. The environment page leans darker and more editorial. Across all surfaces the typographic system, spacing rhythm, and the single blue accent are consistent — this is one design language expressed at different volumes.

**In Orin, the product being framed is the user's own list.** The task rows are the artifact; the sidebar, topbar, chips, and pickers are the wall that disappears. See **Orin Adaptation** below for the app-density deltas.

**Key Characteristics:**
- Photography-first presentation; UI recedes so the product can speak.
- Alternating full-bleed tile sections: white/parchment ↔ near-black, with the color change itself acting as the section divider.
- Single blue accent (`{colors.primary}` — #0066cc) carries every interactive element. No second brand color exists.
- Two button grammars: tiny blue pill CTAs (`{rounded.pill}`) and compact utility rects (`{rounded.sm}`).
- SF Pro Display + SF Pro Text — negative letter-spacing at display sizes for the signature "Apple tight" headline feel.
- Whisper-soft elevation used only when a product image needs to breathe — exactly one drop-shadow in the entire system.
- Tight two-row nav: slim `{component.global-nav}` + product-specific `{component.sub-nav-frosted}` with persistent right-aligned primary CTA.
- Section rhythm across multiple pages: light hero → dark product tile → light utility tile → dark tile → parchment footer — a predictable pulse.

## Colors

> **Source pages analyzed:** homepage, environment, store, iPhone 17 Pro buy page, accessories index. The color system is identical across all five surfaces; only the surface-mode mix differs.

### Brand & Accent
- **Action Blue** (`{colors.primary}` — #0066cc): The single brand-level interactive color. All text links, all blue pill CTAs, and the focus ring root. This is Apple's quiet but universal "click me" signal. Press state shifts via the active scale transform rather than a hex change.
- **Focus Blue** (`{colors.primary-focus}` — #0071e3): A marginally brighter sibling of Action Blue, reserved for the keyboard focus ring on buttons (`outline: 2px solid`).
- **Sky Link Blue** (`{colors.primary-on-dark}` — #2997ff): A brighter blue used on dark surfaces for in-copy links and inline callouts, where Action Blue would disappear against the tile background.

### Surface
- **Pure White** (`{colors.canvas}` — #ffffff): The dominant canvas. Content, utility cards, store tiles, configurator grids.
- **Parchment** (`{colors.canvas-parchment}` — #f5f5f7): The signature Apple off-white. Used for alternating light tiles, footer region, and the default page canvas in store utility sections. Just different enough from white to create rhythm.
- **Pearl Button** (`{colors.surface-pearl}` — #fafafc): A near-white used as the fill for secondary "ghost" buttons — lighter than the parchment canvas so the button still reads as a button against `{colors.canvas-parchment}`.
- **Near-Black Tile 1** (`{colors.surface-tile-1}` — #272729): The primary dark-tile surface on the homepage product grid.
- **Near-Black Tile 2** (`{colors.surface-tile-2}` — #2a2a2c): A micro-step lighter — used where a dark tile sits directly above or below Tile 1 to create the faintest separation.
- **Near-Black Tile 3** (`{colors.surface-tile-3}` — #252527): A micro-step darker — used at the bottom of the stack and in embedded video/player frames.
- **Pure Black** (`{colors.surface-black}` — #000000): Reserved for true void — video player backgrounds, edge-to-edge photographic overlays, the global nav bar background.
- **Translucent Chip Gray** (`{colors.surface-chip-translucent}` — #d2d2d7): The base hex of the translucent gray chip used over photography for circular control buttons. In production, applied at ~64% alpha as `rgba(210, 210, 215, 0.64)`.

### Text
- **Near-Black Ink** (`{colors.ink}` — #1d1d1f): The voice of every headline, every body paragraph, and the dark utility button's fill. Chosen instead of pure black to keep the page feeling photographic rather than printed.
- **Body** (`{colors.body}` — #1d1d1f): Same hex as ink — Apple uses one near-black tone for all text on light surfaces.
- **Body On Dark** (`{colors.body-on-dark}` — #ffffff): All text on dark tiles and on the global nav bar.
- **Body Muted** (`{colors.body-muted}` — #cccccc): Secondary copy on dark tiles where pure white would be too loud.
- **Ink Muted 80** (`{colors.ink-muted-80}` — #333333): Body text on the white Pearl Button surface — slightly softer than pure black.
- **Ink Muted 48** (`{colors.ink-muted-48}` — #7a7a7a): Disabled button text and legal fine-print.

### Hairlines & Borders
- **Divider Soft** (`{colors.divider-soft}` — #f0f0f0): The "border" tone on secondary buttons — functions as a ring shadow rather than a hard line. In production, often applied as `rgba(0, 0, 0, 0.04)`.
- **Hairline** (`{colors.hairline}` — #e0e0e0): The 1px hairline border on store utility cards and configurator chips.

### Brand Gradient
**No decorative gradients.** Atmospheric depth on product photography is inherent to the imagery, not a CSS gradient overlay. Apple is the rare luxury-brand site with zero gradient-based design tokens.

## Typography

### Font Family
- **Display**: `SF Pro Display, system-ui, -apple-system, sans-serif` — Apple's proprietary display face, optimized for sizes ≥ 19px. Defines the voice of every headline.
- **Body / UI**: `SF Pro Text, system-ui, -apple-system, sans-serif` — the text-optimized variant used for body copy, captions, buttons, and links below 20px.
- **OpenType features**: `font-variant-numeric: numerator` is enabled on numeric links. Display sizes rely on tight tracking rather than contextual ligatures.

### Hierarchy

| Token | Size | Weight | Line Height | Letter Spacing | Use |
|---|---|---|---|---|---|
| `{typography.hero-display}` | 56px | 600 | 1.07 | -0.28px | Hero headline; the signature "Apple tight" tracking |
| `{typography.display-lg}` | 40px | 600 | 1.10 | 0 | Tile headlines atop every product tile |
| `{typography.display-md}` | 34px | 600 | 1.47 | -0.374px | Section heads (SF Pro Text at display proportions) |
| `{typography.lead}` | 28px | 400 | 1.14 | 0.196px | Product tile subcopy |
| `{typography.lead-airy}` | 24px | 300 | 1.5 | 0 | Environment-page lead paragraphs (the rare weight 300) |
| `{typography.tagline}` | 21px | 600 | 1.19 | 0.231px | Sub-tile tagline; sub-nav category name |
| `{typography.body-strong}` | 17px | 600 | 1.24 | -0.374px | Inline strong emphasis |
| `{typography.body}` | 17px | 400 | 1.47 | -0.374px | Default paragraph |
| `{typography.dense-link}` | 17px | 400 | 2.41 | 0 | Footer / store utility link lists (relaxed leading) |
| `{typography.caption}` | 14px | 400 | 1.43 | -0.224px | Secondary captions, button text |
| `{typography.caption-strong}` | 14px | 600 | 1.29 | -0.224px | Emphasized captions |
| `{typography.button-large}` | 18px | 300 | 1.0 | 0 | Store hero CTAs (the rare weight 300) |
| `{typography.button-utility}` | 14px | 400 | 1.29 | -0.224px | Utility/nav button labels |
| `{typography.fine-print}` | 12px | 400 | 1.0 | -0.12px | Fine-print, footer body |
| `{typography.micro-legal}` | 10px | 400 | 1.3 | -0.08px | Micro legal disclaimers |
| `{typography.nav-link}` | 12px | 400 | 1.0 | -0.12px | Global nav menu items |

### Principles

- **Negative letter-spacing at display sizes.** Every headline at 17px and up carries a slight tracking tighten (`-0.12 → -0.374px`). This produces the iconic "Apple tight" headline cadence. Never used at 12px or below.
- **Body copy at 17px, not 16px.** Apple breaks the SaaS convention and runs paragraph text at 17px. The extra pixel gives the page an unmistakable "reading, not scanning" pace.
- **Weight 300 is real and rare.** Used deliberately on a handful of large-size reads. It's a light-atmosphere cue reserved for moments where the content should feel airy.
- **Weight 600, not 700, for headlines.** Weight 700 is used sparingly for `{typography.tagline}` when a touch more assertion is needed.
- **Line-height is context-specific.** Display sizes use 1.07–1.19 (tight). Body uses 1.47. Utility link stacks use an unusually relaxed 2.41 — that's how dense link columns breathe.
- **Weight 500 is deliberately absent.** The ladder is 300 / 400 / 600 / 700. Mid-weight readings always use 600.

### Note on Font Substitutes
SF Pro is Apple's proprietary system font. When building off-system:

- Use `system-ui, -apple-system, BlinkMacSystemFont` as the first stack entry — on macOS/iOS/Safari this resolves to the real SF Pro.
- For non-Apple platforms, **Inter** (Google Fonts, variable) is the closest open-source equivalent.
- Nudge `letter-spacing` down by `-0.01em` on display sizes to re-create the Apple tight feel; Inter's default tracking runs slightly wider than SF Pro.
- For body text, tighten line-height by `0.03` (from 1.47 → 1.44) when substituting Inter — Inter's taller x-height needs less leading.

**Orin ships exactly this stack**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", var(--font-sans) /* Inter */, system-ui, sans-serif`.

## Layout

### Spacing System
- **Base unit:** 8px. Sub-base values (2, 4, 5, 6, 7) are used for tight typographic adjustments; structural layout snaps to 8/12/16/20/24.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 17px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 80px.
- **Section vertical padding:** `{spacing.section}` (80px) inside a product tile; tiles stack edge-to-edge with 0 gap (the color change provides the break).
- **Card padding:** `{spacing.lg}` (24px) inside utility grid cards.
- **Button padding:** 8–11px vertical, 15–22px horizontal.

### Grid & Container
- **Max content width:** ~980px on text-heavy sections, ~1440px on product grids, full-bleed for product tiles.
- **Column patterns:** 3 to 5 column utility card grid; 2-column side-by-side tiles; single-column centered stack on product tile heroes.
- **Gutters:** 20–24px between cards in a utility grid.

### Whitespace Philosophy
Apple's whitespace is the product's pedestal. Every tile begins with at least 64px of air above its headline and 48–64px below. Product renders are never crowded. The footer is the only area that breaks this — there, Apple goes deliberately dense to make the full information architecture visible at a glance.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Full-bleed tiles, global nav, footer, body sections |
| Soft hairline | 1px `rgba(0, 0, 0, 0.08)` border | Utility cards, sub-nav frosted-glass separator |
| Backdrop blur | `backdrop-filter: saturate(180%) blur(20px)` on Parchment 80% | Sub-nav and floating sticky bars |
| Product shadow | `rgba(0, 0, 0, 0.22) 3px 5px 30px 0` | Product renders resting on a surface (the only true "shadow" in the system) |

**Shadow philosophy.** Apple uses **exactly one** drop-shadow, and it is applied to photographic product imagery — never to cards, never to buttons, never to text. Elevation in the UI comes from (a) surface-color change (light tile ↔ dark tile) and (b) backdrop-blur on sticky bars.

> **Orin exception:** floating overlays that have no surface underneath them — dropdown menus, popovers, modals — carry a soft neutral drop (`0 4px 20px rgba(0,0,0,0.10)`) purely so they read as detached from the list behind them. Nothing anchored to the page gets a shadow.

### Decorative Depth
- **Edge-to-edge tile alternation** creates rhythm without borders or shadows — the color change itself is the divider.
- **Backdrop-filter blur** on `{component.sub-nav-frosted}` and `{component.floating-sticky-bar}` creates a "floating over content" effect that's functional, not decorative.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Full-bleed product tiles (no corner rounding) |
| `{rounded.xs}` | 5px | Inline links when styled as subtle chips (rare) |
| `{rounded.sm}` | 8px | Dark utility buttons, small icon buttons, inline card imagery |
| `{rounded.md}` | 11px | White Pearl Button capsules; **Orin: dropdown menus, popovers, modals** |
| `{rounded.lg}` | 18px | Store utility cards, accessories grid cards |
| `{rounded.pill}` | 9999px | Primary blue pill CTAs, configurator option chips, search input — the signature Apple pill |
| `{rounded.full}` | 9999px / 50% | Circular control chips, avatars |

### Photography Geometry
- **Hero imagery**: full-bleed, 21:9 or taller; 16:9 on editorial pages.
- **Product renders**: PNG/WebP with transparency; rest on a surface tile and pick up the system shadow.
- **No rounded imagery in hero tiles** — images are full-bleed rectangular. Rounding appears only on inline card imagery.
- Lazy-loading via responsive `srcset` and `sizes`; CDN-optimized WebP.

## Components

### Top Navigation

**`global-nav`** — Persistent, ultra-thin black nav bar pinned to the top of every page. Background `{colors.surface-black}`, height 44px, text `{colors.on-dark}` in `{typography.nav-link}`. Links are quiet, spaced ~20px apart. On mobile, collapses to hamburger at ~834px.

**`sub-nav-frosted`** — Surface-specific nav that sticks below the global nav. Background `{colors.canvas-parchment}` at 80% opacity with backdrop-filter blur, creating a frosted-glass effect. Height 52px. Left: category name in `{typography.tagline}`. Right: inline nav links in `{typography.button-utility}`, ending in a persistent `{component.button-primary}`.

### Buttons

**`button-primary`** — The signature Apple action. Background `{colors.primary}`, text `{colors.on-primary}` in `{typography.body}`, rounded `{rounded.pill}`, padding 11px × 22px. The full-pill radius IS the brand action signal.
- Active state: `{component.button-primary-active}` — `transform: scale(0.95)` (the system-wide micro-interaction).
- Focus state: `{component.button-primary-focus}` — 2px solid `{colors.primary-focus}` outline.

**`button-secondary-pill`** — Used as the second CTA when two pills appear together. Transparent background, text `{colors.primary}`, 1px solid `{colors.primary}` border, rounded `{rounded.pill}`. Reads as a "ghost pill."

**`button-dark-utility`** — Global nav actions. Background `{colors.ink}`, text `{colors.on-dark}` in `{typography.button-utility}`, rounded `{rounded.sm}`, padding 8px × 15px. Active state `transform: scale(0.95)`.

**`button-pearl-capsule`** — Secondary button. Background `{colors.surface-pearl}`, text `{colors.ink-muted-80}` in `{typography.caption}`, soft `{colors.divider-soft}` ring, rounded `{rounded.md}`, padding 8px × 14px.

**`button-store-hero`** — A larger primary CTA. Same Action Blue + white as `{component.button-primary}`, but `{typography.button-large}` (18px / 300) and padding 14px × 28px.

**`button-icon-circular`** — Floats over imagery. 44 × 44px, background `{colors.surface-chip-translucent}` at ~64% alpha, icon in `{colors.ink}`, rounded `{rounded.full}`.

**`text-link`** — Inline body links in `{colors.primary}`.

**`text-link-on-dark`** — Inline body links on dark tiles in `{colors.primary-on-dark}`.

### Cards & Containers

**`product-tile-light`** — Full-bleed light tile. Background `{colors.canvas}`, text `{colors.ink}`, rounded `{rounded.none}`, vertical padding `{spacing.section}`. Centered stack: name in `{typography.display-lg}` → tagline in `{typography.lead}` → two `{component.button-primary}` CTAs → product render with the system shadow.

**`product-tile-parchment`** — Same, on `{colors.canvas-parchment}`. Used to break two consecutive white tiles.

**`product-tile-dark`** — Full-bleed dark tile on `{colors.surface-tile-1}`, text `{colors.on-dark}`, with `{component.text-link-on-dark}` for inline copy.

**`product-tile-dark-2`** / **`product-tile-dark-3`** — `{colors.surface-tile-2}` / `{colors.surface-tile-3}` micro-step variants for adjacent dark bands.

**`store-utility-card`** — Background `{colors.canvas}`, 1px solid `{colors.hairline}` border, rounded `{rounded.lg}`, padding `{spacing.lg}`. Name in `{typography.body-strong}`, supporting line in `{typography.body}`, and a `{component.text-link}`. No shadow by default.

**`configurator-option-chip`** — Pill-shaped tappable cell. Background `{colors.canvas}`, text `{colors.ink}` in `{typography.caption}`, rounded `{rounded.pill}`, padding 12px × 16px.

**`configurator-option-chip-selected`** — Selected state. Border upgrades to 2px solid `{colors.primary-focus}`.

**`floating-sticky-bar`** — Background `{colors.canvas-parchment}` at 80% with backdrop blur, height 64px, padding 12px × 32px. Left: running total. Right: `{component.button-primary}`.

**`environment-quote-card`** — Photographic dark hero with `{colors.surface-tile-1}` fallback, centered white headline in `{typography.display-lg}`, single `{component.button-primary}`, padding `{spacing.section}`.

### Inputs & Forms

**`search-input`** — Background `{colors.canvas}`, text `{colors.ink}` in `{typography.body}`, 1px solid `rgba(0, 0, 0, 0.08)` border, rounded `{rounded.pill}`, padding 12px × 20px, height 44px. Leading search glyph at 14px, muted tint.

### Footer

**`footer`** — Background `{colors.canvas-parchment}`, text `{colors.ink-muted-80}`. Link columns in `{typography.dense-link}`. Column headings in `{typography.caption-strong}`. Legal row in `{typography.fine-print}` with `{colors.ink-muted-48}`. Vertical padding 64px.

---

## Orin Adaptation

Apple's system was measured on marketing pages, where one tile fills a viewport. Orin is a dense productivity app where twenty task rows share one screen. The **language is unchanged** — same accent, same grays, same font stack, same radii, same "surface change, not chrome" rule. Only the *volume* changes. These are the documented deltas; nothing else in this file may be relaxed.

### App density type scale

Marketing body copy at 17px would fit ~6 task rows per screen. Orin runs a compressed ladder that keeps the same proportions and the same tracking law (negative tracking at 13px and up, none below):

| Orin token | Size | Weight | Tracking | Use |
|---|---|---|---|---|
| `app-page-title` | 28px | 600 | -0.4px | Page heading ("Today", "All Tasks") |
| `app-section` | 17px | 600 | -0.374px | Section heads, modal titles |
| `app-row` | 15px | 400 | -0.24px | **Task row title — the content that speaks** |
| `app-body` | 14px | 400 | -0.224px | Body copy, menu items, form fields |
| `app-meta` | 13px | 400 | -0.08px | Chips, dates, counts, nav labels |
| `app-micro` | 11px | 400 | 0 | Legal, hints, badge numerals |

The task row title is deliberately the largest thing in the list and the only place ink (#1d1d1f) is used at weight 400 — everything around it steps down to `{colors.ink-muted-64}` or `{colors.ink-muted-48}`.

### Extension tokens

Four grays and a destructive triad that the marketing pages never surfaced but an app cannot ship without. All are drawn from Apple's own system palette rather than invented:

| Token | Value | Use |
|---|---|---|
| `{colors.ink-muted-64}` | #86868b | Secondary UI text — nav labels, meta, timestamps |
| `{colors.ink-muted-30}` | #c7c7cc | Placeholder text, disabled state, completed-task titles |
| `{colors.danger}` | #d70015 | Destructive action text and fills (Apple systemRed, accessible variant) |
| `{colors.danger-bg}` | #fdf0f0 | Destructive hover wash |
| `{colors.danger-border}` | #f0c9c9 | Destructive hairline |
| `{colors.flagged}` | #ff9500 | Deferred/flagged marker (Apple systemOrange) |

### Emotional state palette

Orin tags each task with a feeling. Apple's "one accent only" rule governs **interactive** color — these are *data* categories, not affordances, so they get their own scale. It is drawn entirely from Apple's system colors at their accessible-contrast variants, and it never appears on a button, link, or focus ring.

| State | Foreground | Background | Source |
|---|---|---|---|
| Dreading | #d70015 | #fdf0f0 | systemRed |
| Anxious | #b25000 | #fdf4ec | systemOrange |
| Neutral | #6e6e73 | #f5f5f7 | systemGray |
| Willing | #0071a4 | #eef6fa | systemTeal |
| Excited | #248a3d | #eef7f1 | systemGreen |

Emotion chips are `{rounded.pill}`, 13px, and carry no border — the tinted background is the entire signal.

### Mood scale (energy heatmap)

The energy view plots a 1–5 mood rating. It uses a sequential ramp from the same Apple system palette so the heatmap and the emotion chips read as one language:

| Rating | Foreground | Soft fill |
|---|---|---|
| 1 · Very unpleasant | #d70015 | #fdf0f0 |
| 2 · Unpleasant | #b25000 | #fdf4ec |
| 3 · Neutral | #8a6d00 | #fbf6e3 |
| 4 · Pleasant | #0071a4 | #eef6fa |
| 5 · Very pleasant | #248a3d | #eef7f1 |

Like the emotion palette, this is data color and is never used on an affordance.

### Surface roles in the app chassis

| Region | Surface | Rationale |
|---|---|---|
| Page canvas / task list | `{colors.canvas}` #ffffff | The list is the artifact; it rests on white |
| Sidebar, topbar, mobile nav | `{colors.canvas-parchment}` #f5f5f7 | Chrome recedes one step behind the content |
| Row hover, selected menu item | `{colors.canvas-parchment}` #f5f5f7 | Surface change, not chrome — no borders on hover |
| Active nav item | `{colors.canvas-parchment}` + `{colors.primary}` text | Blue text carries the state, not a colored pill |
| Dividers between chrome regions | `{colors.divider-soft}` #f0f0f0 | |
| Card / input hairlines | `{colors.hairline}` #e0e0e0 | |

The old palette's emerald→lime brand pair, forest inks, and stone grays are fully retired; there is no green in the chrome anywhere.

## Do's and Don'ts

### Do
- Use `{colors.primary}` (Action Blue #0066cc) for every interactive element — links, pill CTAs, focus signals, active nav, checked checkboxes — and nothing else.
- Set headlines with negative letter-spacing (`-0.12 → -0.4px`) to get the signature "Apple tight" cadence.
- Reserve `{rounded.pill}` for the primary CTA and anything that should read as an "action" or a chip.
- Use `transform: scale(0.95)` as the active/press state on every button — it's the system-wide micro-interaction.
- Express hover and selection as a **surface change to parchment**, never as a border or shadow.
- Keep chrome text at `{colors.ink-muted-64}` so the task row titles are the only full-ink text on screen.

### Don't
- Don't introduce a second accent color; every "click me" signal is `{colors.primary}`.
- Don't add shadows to cards, buttons, rows, or text — shadow is only for product imagery and detached overlays (see the Orin exception under Elevation).
- Don't use gradients as decorative backgrounds.
- Don't set body copy at weight 500 — the ladder is 300 / 400 / 600 / 700, with 500 deliberately absent.
- Don't round full-bleed regions — the color change is the divider.
- Don't mix radii grammars — `{rounded.sm}` for compact utility, `{rounded.md}` for overlays, `{rounded.lg}` for cards, `{rounded.pill}` for pills, and nothing in between.
- Don't use `{colors.primary-on-dark}` (Sky Link Blue) on light surfaces — it's the dark-tile-only variant.
- Don't let the emotional-state palette leak onto a button, link, or focus ring.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Small phone | ≤ 419px | Single-column; hero typography drops to 28px |
| Phone | 420–640px | Single-column stack; hero h1 drops to 34px |
| Large phone | 641–735px | Tighter padding (48px vertical vs 80px) |
| Tablet portrait | 736–833px | Global nav collapses to hamburger |
| Tablet landscape | 834–1023px | Global nav returns expanded; 3-col grids → 2-col |
| Small desktop | 1024–1068px | Tiles use 2/3 width with margin gutters |
| Desktop | 1069–1440px | Full layout; 4–5 column grids; 1440px content max |
| Wide desktop | ≥ 1441px | Content locks at 1440px |

The structural breakpoints that matter: 1440px (content lock), 1068px, 833px, 734px, 640px, 480px. **Orin's own chassis switch is 768px** — sidebar ⇄ bottom tab bar.

### Touch Targets
- Minimum 44 × 44px. `{component.button-primary}` lands at ~44 × 100px.
- `{component.button-icon-circular}` is exactly 44 × 44px.
- Desktop-only precision actions (row hover controls) may sit tighter; they are replaced by full-row tap targets on mobile.

### Collapsing Strategy
- **Global nav**: full horizontal link row → hamburger + bag at 834px and below.
- **Sub-nav**: category name + links + CTA → category name + CTA only at mobile.
- **Orin sidebar**: 240px expanded → 64px icon rail (desktop toggle) → bottom tab bar at ≤ 768px.
- **Hero typography**: 56px → 40px at 1068px → 34px at 640px → 28px at 419px.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key directly.
2. Variants of an existing component (`-active`, `-focus`, `-2`, `-3`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Never document hover. Default and Active/Pressed states only.
5. Display headlines stay SF Pro Display 600 with negative letter-spacing. Body stays SF Pro Text 400. The boundary is unbreakable.
6. The single drop-shadow is reserved for product photography (and, in Orin, detached overlays).
7. When in doubt about emphasis: alternate surface before adding chrome.

## Known Gaps

- Form validation and error states were not surfaced on the analyzed pages; only the neutral search input is documented. Orin's inline validation borrows `{colors.danger}` for the message and leaves the field hairline unchanged.
- Interior video player controls are a platform widget, not a web-design token.
- Dark-mode counterparts were not surfaced; the system documented is the light-dominant variant. Orin ships light-only for now.
- The exact backdrop-filter blur radius is platform-dependent; `saturate(180%) blur(20px)` is the shipped baseline but isn't formalized as a token.
