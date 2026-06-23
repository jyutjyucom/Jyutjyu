---
version: alpha
name: Jyutjyu-design-system
description: A scholarly dictionary interface for Cantonese linguistic heritage — "Scholar's Ink (Kapok Edition)". The system anchors on a warm parchment canvas with deep ink-blue body text, a deep red Kapok accent (#b53a25 — the flower of Southern China), and a five-tier warm-neutral surface stack for managing dense dictionary content. Serif CJK fonts (Chiron Sung HK) render headwords and headings, evoking printed dictionaries; sans-serif CJK (Chiron Hei HK) serves UI chrome. The signature decorative element is a "red dot divider" — a horizontal line with a centered circle dot. Buttons are sharp rectangular (no border-radius), reinforcing the traditional scholarly aesthetic.

colors:
  kapok: "#b53a25"
  kapok-hover: "#9e3220"
  kapok-container: "#f8e7e4"
  ink: "#031632"
  graphite: "#44474d"
  parchment: "#fbf9f4"
  surface-low: "#f5f2ed"
  surface-mid: "#f0eee9"
  surface-high: "#eae8e3"
  surface-highest: "#e4e2dd"
  outline-soft: "#c5c6ce"
  archive-green: "#4A6B5D"
  archive-green-light: "#7FA393"
  muted-gold: "#725b35"
  on-primary: "#ffffff"
  dark-bg: "#0c0a09"
  dark-surface: "#1c1917"
  dark-surface-hover: "#292524"
  dark-text-primary: "#f5f5f4"
  dark-text-secondary: "#d6d3d1"
  dark-text-tertiary: "#a8a29e"
  dark-border: "#44403c"
  dark-border-strong: "#57534e"
  success: "#4A6B5D"
  error: "#b53a25"

typography:
  display-lg:
    fontFamily: "Chiron Sung HK UI, 'Noto Serif HK', serif"
    fontSize: 48px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0
  display-md:
    fontFamily: "Chiron Sung HK UI, 'Noto Serif HK', serif"
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0
  display-sm:
    fontFamily: "Chiron Sung HK Variable, 'Noto Serif HK', serif"
    fontSize: 24px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0
  headline:
    fontFamily: "Chiron Sung HK UI, 'Noto Serif HK', serif"
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: 0
  title-lg:
    fontFamily: "Chiron Hei HK Variable, 'Noto Sans HK', sans-serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: 0
  title-md:
    fontFamily: "Chiron Hei HK Variable, 'Noto Sans HK', sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.6
    letterSpacing: 0
  body-lg:
    fontFamily: "Chiron Hei HK Variable, 'Noto Sans HK', sans-serif"
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.875
    letterSpacing: 0
  body-md:
    fontFamily: "Chiron Hei HK Variable, 'Noto Sans HK', sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: 0
  body-sm:
    fontFamily: "Chiron Hei HK Variable, 'Noto Sans HK', sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.25
    letterSpacing: 0
  caption:
    fontFamily: "Inter Variable, 'Noto Sans HK', sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  jyutping:
    fontFamily: "Consolas, Monaco, 'Courier New', monospace"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0
  nav-link:
    fontFamily: "Inter Variable, 'Chiron Hei HK UI', sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

rounded:
  none: 0
  sm: 6px
  md: 8px
  lg: 12px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  xxl: 48px
  section: 64px

components:
  button-primary:
    backgroundColor: "{colors.kapok}"
    textColor: "{colors.on-primary}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: 10px 20px
  button-primary-hover:
    backgroundColor: "{colors.kapok-hover}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.kapok}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    border: "1px solid {colors.kapok} at 20% opacity"
    padding: 10px 20px
  button-tertiary:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.graphite}"
    typography: "{typography.nav-link}"
    rounded: "{rounded.none}"
    padding: 10px 20px
  button-ghost:
    backgroundColor: transparent
    textColor: "{colors.kapok}"
    typography: "{typography.nav-link}"
    fontWeight: 600
  text-input:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 10px 14px
  text-input-focused:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    ring: "1px {colors.kapok} at 30% opacity"
  tag-source:
    backgroundColor: "{colors.kapok} at 10% opacity"
    textColor: "{colors.kapok}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 4px 12px
  tag-dialect:
    backgroundColor: "{colors.archive-green} at 10% opacity"
    textColor: "{colors.archive-green}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 4px 12px
  tag-type:
    backgroundColor: "{colors.muted-gold} at 10% opacity"
    textColor: "{colors.muted-gold}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 4px 12px
  tag-soft:
    backgroundColor: "{colors.surface-highest}"
    textColor: "{colors.graphite}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.lg}"
    padding: 4px 12px
  dict-card:
    backgroundColor: "{colors.surface-low}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: 24px
  dict-card-header:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.display-sm}"
    fontFamily: "Chiron Sung HK Variable, serif"
  accent-block-note:
    borderLeft: "4px solid {colors.muted-gold}"
    backgroundColor: transparent
    textColor: "{colors.ink}"
  accent-block-etymology:
    borderLeft: "4px solid {colors.archive-green} at 40% opacity"
    backgroundColor: transparent
    textColor: "{colors.ink}"
  accent-block-proofreader:
    borderLeft: "4px solid {colors.kapok}"
    backgroundColor: transparent
    textColor: "{colors.ink}"
  accent-block-example:
    borderLeft: "2px solid {colors.outline-soft} at 20% opacity"
    backgroundColor: transparent
    textColor: "{colors.ink} at 80% opacity"
    fontStyle: italic
  red-dot-divider:
    lineColor: "{colors.kapok} at 30% opacity"
    dotColor: "{colors.kapok} at 60% opacity"
    dotSize: "6px"
    lineHeight: "1px"
  red-dot-divider-green:
    lineColor: "{colors.archive-green} at 30% opacity"
    dotColor: "{colors.archive-green} at 60% opacity"
    dotSize: "6px"
    lineHeight: "1px"
  header:
    backgroundColor: "{colors.parchment} at 85% opacity"
    backdropBlur: "12px"
    textColor: "{colors.ink}"
    height: 64px
  footer:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.graphite}"
    typography: "{typography.body-sm}"
  hero-headword:
    fontFamily: "Chiron Sung HK Variable, serif"
    fontSize: 30px
    fontWeight: 700
    lineHeight: 1.3
    textColor: "{colors.ink}"
  book-spine-card-dark:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.on-primary}"
    aspectRatio: "3/4"
  book-spine-card-gray:
    backgroundColor: "{colors.surface-highest}"
    textColor: "{colors.ink}"
    aspectRatio: "3/4"
  book-spine-card-green:
    backgroundColor: "{colors.archive-green}"
    textColor: "{colors.on-primary}"
    aspectRatio: "3/4"
  book-spine-card-light:
    backgroundColor: "{colors.parchment}"
    textColor: "{colors.ink}"
    aspectRatio: "3/4"
  feedback-button:
    backgroundColor: "{colors.archive-green} at 10% opacity"
    textColor: "{colors.archive-green}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 6px 12px
  pronunciation-tab-active:
    backgroundColor: "{colors.kapok}"
    textColor: "{colors.on-primary}"
    fontWeight: 700
    rounded: "{rounded.lg}"
    shadow: "0 4px 12px {colors.kapok} at 20% opacity"
  pronunciation-tab-inactive:
    backgroundColor: transparent
    textColor: "{colors.graphite}"
---

## Overview

粵語辭叢 (Jyutjyu) is a Cantonese dictionary aggregation platform — a digital reading room where multiple dictionaries converge into a single scholarly interface. The design system, **Scholar's Ink (Kapok Edition)**, evokes the classical Chinese tradition of ink-brush calligraphy and lexicographic study. "Kapok" refers to the 木棉 tree, a cultural symbol of Guangdong and Hong Kong whose deep red blossoms supply the system's signature accent color.

The base atmosphere is a **warm parchment canvas** (`{colors.parchment}` — #fbf9f4) — distinctly warm, with a faint yellow tint that recalls traditional paper. Body text runs in **ink** (`{colors.ink}` — #031632), a near-black with deep blue undertones that evokes calligrapher's ink. The combination feels like a scholar's desk, not a modern SaaS dashboard.

Brand voltage comes from the **parchment + kapok pairing** — deep red (`{colors.kapok}` — #b53a25) is the signature accent, used on every primary CTA, on active tabs, on Jyutping pronunciation text, and on the signature decorative "red dot divider" element. The red is warm, earthy, never neon — rooted in the natural pigment of the Kapok flower.

The system has two complementary accent families:
1. **Archive green** (`{colors.archive-green}` — #4A6B5D) — a muted institutional green for dialect labels, etymology sections, feedback features, and "other results" banners. Evokes library archives and conservation.
2. **Muted gold** (`{colors.muted-gold}` — #725b35) — a warm bronze-brown for entry type labels (character/word/phrase), notes, reference sections. Evokes gilt lettering on book spines.

Typography is split into **serif display** (Chiron Sung HK) for headwords, headings, and the brand name, and **sans-serif body** (Chiron Hei HK) for definitions, UI chrome, and running text. All CJK fonts are self-hosted via `@fontsource-variable` because Google Fonts is blocked in China. The serif/sans split is editorial — it signals "this is a dictionary" at a glance.

**Key Characteristics:**
- Warm parchment canvas (`{colors.parchment}` — #fbf9f4) with deep ink text (`{colors.ink}` — #031632). The brand's defining color choice.
- Kapok red primary CTA (`{colors.kapok}` — #b53a25). Used on buttons, active states, Jyutping text, and the signature red-dot divider.
- Serif CJK display via Chiron Sung HK for headwords and page titles. Pairs with Chiron Hei HK sans body for definitions and UI.
- Five-tier warm-neutral surface stack (`{colors.surface-low}` through `{colors.surface-highest}`) for layered card backgrounds.
- Sharp rectangular buttons (zero border-radius) — reinforcing the traditional, serious aesthetic. Only tags/badges use rounded corners.
- The "red dot divider" — a horizontal line with a centered circle dot — is the system's most distinctive decorative element.
- Left-border accent blocks in semantic colors (kapok, archive-green, muted-gold) communicate information category at a glance.
- Information density with hierarchy: dense dictionary entries managed through layered surfaces, subtle accents, and tab-based grouping.

## Colors

### Brand & Accent
- **Kapok** (`{colors.kapok}` — #b53a25): The signature deep red. Used on all primary CTAs, active tabs, links, Jyutping pronunciation text, proofreader notes, and the red-dot divider. Named after the Kapok flower (木棉) of Southern China.
- **Kapok Hover** (`{colors.kapok-hover}` — #9e3220): Press/hover darkened variant.
- **Kapok Container** (`{colors.kapok-container}` — #f8e7e4): A very light pink-red used for text selection highlight and selected locale items.
- **Archive Green** (`{colors.archive-green}` — #4A6B5D): Muted institutional green for dialect labels, etymology sections, feedback features, success states, and "other results" banners. Evokes library archives.
- **Archive Green Light** (`{colors.archive-green-light}` — #7FA393): Lighter variant used in dark mode for legibility.
- **Muted Gold** (`{colors.muted-gold}` — #725b35): Warm bronze-brown for entry type badges (character/word/phrase), notes, reference sections. Evokes gilt lettering on book spines.

### Surface
- **Parchment** (`{colors.parchment}` — #fbf9f4): Default page background. Warm off-white with faint yellow tint — deliberately not pure white.
- **Surface Low** (`{colors.surface-low}` — #f5f2ed): Card backgrounds, input backgrounds. One step darker than parchment.
- **Surface Mid** (`{colors.surface-mid}` — #f0eee9): Intermediate surface for subtle layering.
- **Surface High** (`{colors.surface-high}` — #eae8e3): Active/hover card backgrounds, table row hover, sidebar active states.
- **Surface Highest** (`{colors.surface-highest}` — #e4e2dd): Deepest surface for table headers, dividers, soft tag backgrounds.
- **Outline Soft** (`{colors.outline-soft}` — #c5c6ce): Borders at 20% opacity. Soft enough to suggest separation without hard lines.

### Text
- **Ink** (`{colors.ink}` — #031632): All primary text and headlines in light mode. Near-black with deep blue undertones — evokes calligrapher's ink.
- **Graphite** (`{colors.graphite}` — #44474d): Secondary text, labels, descriptions, footer links. Neutral dark gray.
- **On Primary** (`{colors.on-primary}` — #ffffff): Text on kapok and dark surfaces.

### Dark Mode
The dark mode uses Tailwind's `stone-*` scale rather than custom tokens:
- **Background**: `stone-950` (#0c0a09) — near-black with warm undertone.
- **Surface / Cards**: `stone-900` (#1c1917) — warm dark surface.
- **Hover**: `stone-800` (#292524) — elevated surface on interaction.
- **Text Primary**: `stone-100` (#f5f5f4) — warm off-white.
- **Text Secondary**: `stone-200`–`stone-400` — gradient of warm grays.
- **Borders**: `stone-700`–`stone-800` — subtle warm borders.
- Accent colors shift to translucent variants (`bg-kapok/20`, `bg-archive-green/20`) for dark-mode legibility.
- `muted-gold` shifts to `amber-300`/`amber-900/40` for better contrast on dark surfaces.

### Semantic
- **Success**: Uses `{colors.archive-green}` — consistent with the green accent family.
- **Error**: Uses `{colors.kapok}` — the brand red doubles as error signaling.
- **Text selection**: `selection:bg-kapok-container selection:text-kapok` — the brand red on a light pink field.

## Typography

### Font Family

The system runs a **two-tier self-hosted font architecture** because Google Fonts is blocked in China:

**Tier 1 — UI Subset Fonts** (preloaded globally, ~228KB + ~474KB):
- **Chiron Hei HK UI** — Sans-serif CJK for app chrome, navigation, buttons. Variable weight 200–900.
- **Chiron Sung HK UI** — Serif CJK for UI headings, hero text, the brand name. Variable weight with italic variant.

These are built by `scripts/build-chiron-*-ui-subset.mjs` using `pyftsubset` during prebuild, containing only the glyphs needed for the site's UI strings (~500 characters).

**Tier 2 — Content Fonts** (loaded per-page, ~4.7MB + ~4MB):
- **Chiron Hei HK Variable** — Full CJK sans-serif for dictionary content, definitions, search results.
- **Chiron Sung HK Variable** — Full CJK serif for headword display. Loaded via lazy composable or static import on content pages.

**Latin**: **Inter Variable** (`@fontsource-variable/inter`) for all Latin text, numbers, and UI labels.

**Monospace**: Consolas, Monaco, Courier New — used only for Jyutping romanization display.

The serif/sans split is the system's most important typographic decision: serif for headwords (evoking printed dictionaries), sans for everything else (maintaining modern readability).

### Hierarchy

| Token | Font | Size | Weight | Line Height | Use |
|---|---|---|---|---|---|
| `{typography.display-lg}` | Chiron Sung HK UI (serif) | 48px | 700 | 1.2 | Homepage hero title |
| `{typography.display-md}` | Chiron Sung HK UI (serif) | 36px | 700 | 1.3 | Page section headings |
| `{typography.display-sm}` | Chiron Sung HK Variable (serif) | 24px | 700 | 1.5 | Headword display in cards |
| `{typography.headline}` | Chiron Sung HK UI (serif) | 20px | 700 | 1.5 | Sub-headings, brand name |
| `{typography.title-lg}` | Chiron Hei HK Variable (sans) | 20px | 500 | 1.6 | Card titles, emphasized labels |
| `{typography.title-md}` | Chiron Hei HK Variable (sans) | 18px | 500 | 1.6 | Section labels, navigation |
| `{typography.body-lg}` | Chiron Hei HK Variable (sans) | 18px | 400 | 1.875 | Lead body text |
| `{typography.body-md}` | Chiron Hei HK Variable (sans) | 16px | 400 | 1.75 | Default running text |
| `{typography.body-sm}` | Chiron Hei HK Variable (sans) | 14px | 400 | 1.25 | Tag labels, secondary text |
| `{typography.caption}` | Inter Variable (sans) | 12px | 500 | 1.0 | Fine print, metadata |
| `{typography.jyutping}` | Consolas / monospace | 14px | 400 | 1.6 | Jyutping romanization |
| `{typography.nav-link}` | Inter Variable + Chiron Hei HK UI | 14px | 500 | 1.4 | Navigation, buttons |

### Principles
- **Serif for headwords, sans for everything else.** Chiron Sung HK renders every dictionary headword in content areas. Switching a headword to sans-serif would break the dictionary-reading experience.
- **Generous line-height for CJK.** The `base` body size uses 1.75 line-height (not the typical 1.5). CJK characters are dense and uniform-width; they need more vertical breathing room than Latin text.
- **Self-hosted fonts are non-negotiable.** Google Fonts is blocked in China where the primary audience lives. All fonts come from `@fontsource-variable` packages or custom UI subsets.
- **Content fonts load lazily.** The ~4.7MB + ~4MB content fonts warm up when the user starts typing (search page) or when entering content pages (word/browse). UI subset fonts preload globally at ~700KB combined.
- **No bold sans-serif body text.** Weight 500 is the maximum for UI labels. Dictionary definitions run at weight 400. Bold (700) belongs to serif headwords only.

### Note on Font Substitutes
Chiron Hei HK / Chiron Sung HK are commercial CJK variable fonts. If unavailable, use **Noto Sans HK** (sans-serif) and **Noto Serif HK** (serif) as open-source substitutes via Google Fonts or self-hosting. Inter remains the Latin substitute in all cases.

## Layout

### Spacing System
- **Base unit:** 4px.
- **Tokens:** `{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 24px · `{spacing.xl}` 32px · `{spacing.xxl}` 48px · `{spacing.section}` 64px.
- **Content padding:** `px-6 md:px-8` — consistent across all main content areas.
- **Card internal padding:** 24px for dictionary entry cards; 32px for feature sections.
- **Max content width:** `max-w-7xl` (80rem / 1280px) for most pages; `max-w-4xl` for the about page.

### Grid & Container
- **Browse page:** 12-column grid — 3-column sticky sidebar + 9-column content area at desktop. Sidebar collapses to accordion on mobile.
- **Headword grid:** 3–5 columns depending on breakpoint (3 at mobile → 5 at xl).
- **Dictionary showcase:** Book-spine cards in a horizontal scroll on mobile, grid on desktop.
- **Feature cards:** 3-up at desktop, 2-up at tablet, 1-up at mobile.

### Whitespace Philosophy
The parchment canvas + serif headwords + generous line-height create a scholarly pacing — the interface reads like a well-typeset dictionary reference, not a marketing page. Whitespace between sections stays at 64px; within cards, the content is intentionally dense to maximize information per view.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Flat | No shadow, no border | Body sections, page background |
| Surface step | `{colors.surface-low}` background | Card backgrounds, input fields |
| Surface active | `{colors.surface-high}` background | Hover states, active sidebar items |
| Frosted header | `backdrop-blur-md` + `bg-parchment/85` | Sticky navigation, pronunciation tabs |
| Subtle shadow | Rare — only on dropdowns (`shadow-lg`) | Language switcher, filter dropdowns |

The elevation philosophy is **surface-tone stepping, not shadow**. Most depth comes from the five-tier warm-neutral surface stack. Shadows are extremely rare — the system prefers to darken the surface color rather than cast a shadow. This keeps the aesthetic flat and print-like, consistent with the dictionary-reference metaphor.

### Decorative Depth
- The **red dot divider** (`{component.red-dot-divider}`) separates major sections: a `1px` kapok line at 30% opacity with a `6px` centered circle dot at 60% opacity. A green variant separates sub-entries within grouped cards.
- **Left-border accent blocks** communicate information category: kapok for proofreader notes, muted-gold for general notes, archive-green for etymology, outline-soft for examples.
- **Book spine cards** on the home page cycle through 4 variants (dark navy, warm gray, archive green, parchment) with `aspect-[3/4]` proportions, evoking a shelf of reference books.

## Shapes

### Border Radius Scale

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0 | **All buttons, all inputs** — sharp rectangular. The defining shape choice. |
| `{rounded.sm}` | 6px | Dictionary entry cards, modal dialogs |
| `{rounded.md}` | 8px | Feedback buttons, filter dropdowns |
| `{rounded.lg}` | 12px | Tags/badges, pronunciation tabs, section containers |

The sharp rectangular treatment of buttons and inputs is a deliberate design choice — it reinforces the traditional, serious, print-like aesthetic. Rounding a button would make it feel like a mobile app; keeping it square feels like a book.

### Photography & Illustrations
The system uses almost no photography. Instead:
- **Dictionary cover cards** cycle through 4 color variants (ink navy, warm gray, archive green, parchment) with a decorative corner accent on dark variants.
- **Character/word display** uses large serif type as the visual hero — the headword itself is the illustration.
- When icons appear, they come from **lucide-vue-next** — consistent, minimal line icons at `w-4 h-4` (16px).

## Components

### Top Navigation

**`header`** — Sticky frosted header. Background `{colors.parchment}` at 85% opacity with `backdrop-blur-md`. Height 64px. Carries the brand name "粵語辭叢" in `{typography.headline}` (Chiron Sung HK serif) at `{colors.kapok}`, a search input in `{colors.surface-low}`, and right-side controls (theme toggle, language switcher). On mobile, controls collapse behind an expandable panel.

### Buttons

**`button-primary`** — The kapok CTA. Background `{colors.kapok}`, text `{colors.on-primary}`, type `{typography.nav-link}`, **zero border-radius**. Hover darkens to `{colors.kapok-hover}`. Used for search submit, feedback submit, primary actions.

**`button-secondary`** — Outlined alternative. Transparent background, `{colors.kapok}` text, 1px border in kapok at 20% opacity, zero border-radius. Used for secondary actions and "view more" links.

**`button-tertiary`** — Surface-level button. Background `{colors.surface-low}`, text `{colors.graphite}`, zero border-radius. Used for filter toggles and utility actions.

**`button-ghost`** — Text-only link. Transparent background, `{colors.kapok}` text, weight 600, underline on hover with `underline-offset-8`. Used for "see all" navigation links.

### Tags & Badges

Tags follow a strict semantic color system — the color tells you what kind of metadata it is:

**`tag-source`** — Dictionary source identifier. `{colors.kapok}` at 10% opacity background, `{colors.kapok}` text, `{rounded.lg}`. Example: "分類詞典".

**`tag-dialect`** — Dialect/variant label. `{colors.archive-green}` at 10% opacity background, `{colors.archive-green}` text. Example: "廣州話", "香港話".

**`tag-type`** — Entry type label. `{colors.muted-gold}` at 10% opacity background, `{colors.muted-gold}` text. Example: "詞", "字", "短語".

**`tag-soft`** — Register, category, or other metadata. `{colors.surface-highest}` background, `{colors.graphite}` text. Example: "口語", "書面語".

### Cards & Containers

**`dict-card`** — Single dictionary entry card. Background `{colors.surface-low}`, `{rounded.sm}`, padding 24px. Structured as header (headword in serif + Jyutping in kapok + variant markers) → tags row → body (numbered senses with italic kapok numbering, nested sub-senses with `border-l-2 border-kapok/20`) → accent blocks (notes, etymology, references) → see-also links in kapok with `underline-offset-2`. Entry animation: `fadeIn 0.3s ease-in` with `translateY(10px)` slide-up.

**`hero-headword`** — The dictionary headword display in content areas. Chiron Sung HK Variable (serif) at 30px / weight 700. The headword itself is the visual centerpiece — large, serif, ink-colored, commanding attention without decoration.

**`accent-block-note`** — General note with `border-l-4` in `{colors.muted-gold}`. Used for usage notes, grammatical information.

**`accent-block-etymology`** — Etymology section with `border-l-4` in `{colors.archive-green}` at 40% opacity.

**`accent-block-proofreader`** — Editorial note with `border-l-4` in `{colors.kapok}`. The most prominent accent block — reserved for proofreader annotations.

**`accent-block-example`** — Example sentence with `border-l-2` in `{colors.outline-soft}` at 20% opacity. Italic, lower contrast (`text-ink/80`) to visually subordinate examples beneath definitions.

### Signature Components

**Red Dot Divider** (`{component.red-dot-divider}`) — The system's most distinctive decorative element. A `1px` horizontal line in `{colors.kapok}` at 30% opacity with a `6px` centered circle dot in `{colors.kapok}` at 60% opacity. Used to separate major page sections, card groups, and the footer. A green variant (`{component.red-dot-divider-green}`) in archive-green separates sub-entries within grouped dictionary cards.

**Book Spine Cards** — Dictionary showcase cards on the home page cycling through 4 visual variants: `{component.book-spine-card-dark}` (ink navy, white text), `{component.book-spine-card-gray}` (warm gray, ink text), `{component.book-spine-card-green}` (archive green, white text), `{component.book-spine-card-light}` (parchment, ink text). All use `aspect-[3/4]` proportions. Dark variants carry a decorative corner accent. They evoke a shelf of reference books.

**Pronunciation Tabs** (`{component.pronunciation-tab-active}` / `{component.pronunciation-tab-inactive}`) — Desktop: pill-style tab bar for switching between pronunciation variants. Active tab: `{colors.kapok}` background, white text, bold, with `shadow-lg shadow-kapok/20`. Inactive: transparent, `{colors.graphite}` text. Full keyboard navigation (ArrowRight, ArrowLeft, Home, End). Mobile: accordion pattern instead of tabs.

**Search Filter Controls** — Three dropdown filters (dictionary, dialect, entry type) each using their semantic color: dict=kapok, dialect=archive-green, type=muted-gold. Selected state shows the semantic color as background tint; unselected is `{colors.surface-low}`.

### Inputs & Forms

**`text-input`** — Standard form field. Background `{colors.surface-low}`, text `{colors.ink}`, type `{typography.body-md}`, **zero border-radius**, no visible border. Focus state adds `ring-1 ring-kapok/30` — a subtle kapok glow. The borderless design integrates inputs into the surface system rather than treating them as separate UI elements.

**`feedback-button`** — Inline button for submitting feedback. Background `{colors.archive-green}` at 10% opacity, text `{colors.archive-green}`, `{rounded.md}`. Opens a teleported modal with form fields. Deliberately subdued — feedback is available but doesn't compete with dictionary content.

### Footer

**`footer`** — Warm parchment footer. Three-column grid (brand, about, friends) with the character `粵` in `text-4xl font-headline text-kapok` as the brand anchor. Separated from content by the kapok red-dot divider. Links in `{colors.graphite}` default, `{colors.kapok}` on hover with `underline-offset-4`.

## Do's and Don'ts

### Do
- Anchor every page on the warm parchment canvas (`{colors.parchment}`). Pure white reads as "generic web app"; the warm tint is the brand differentiator.
- Use Chiron Sung HK serif for every headword and heading. Pair with Chiron Hei HK sans for body. The serif/sans split signals "dictionary" at a glance.
- Use `{colors.kapok}` for all interactive states: primary buttons, active tabs, links, Jyutping text, focus rings. The red is the interactive language.
- Keep buttons sharp rectangular (zero border-radius). Tags and badges may round; buttons and inputs must not.
- Use the red-dot divider to separate major page sections. Use the green variant for sub-entry separation within grouped cards.
- Use left-border accent blocks to communicate information category: kapok = proofreader, muted-gold = notes, archive-green = etymology, outline-soft = examples.
- Apply semantic tag colors consistently: kapok for source, archive-green for dialect, muted-gold for type, surface-highest for soft metadata.
- Maintain generous line-height (1.75–1.875) for CJK body text. Dense characters need vertical breathing room.
- Self-host all CJK fonts. Google Fonts is blocked in China.

### Don't
- Don't use pure white (`#ffffff`) for page backgrounds. The warm parchment (`#fbf9f4`) is the brand.
- Don't use sans-serif for headwords. The serif headword is the most important visual signal that this is a dictionary interface.
- Don't round buttons or inputs. The sharp rectangle is the shape signature — it reads as traditional and serious.
- Don't use shadows for elevation. Use the five-tier surface stack instead. Shadows break the print-like flatness.
- Don't use `{colors.kapok}` for body text or large fills. It's an accent — reserve it for interactive elements, Jyutping text, and decorative dividers.
- Don't introduce new accent colors. The trinity of kapok / archive-green / muted-gold covers all semantic needs.
- Don't load content fonts eagerly. The ~4.7MB + ~4MB fonts must lazy-load via the composable or static import on content pages only.
- Don't set line-height below 1.5 for CJK body text. It harms readability for dense, uniform-width characters.

## Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
|---|---|---|
| Mobile | < 768px | Header controls collapse behind expandable panel; browse sidebar → accordion; headword grid 3-col; pronunciation tabs → accordion; search filters stack |
| Tablet | 768–1024px | Headword grid 4-col; browse sidebar visible; search filters inline |
| Desktop | 1024–1280px | Full header with all controls; 5-col headword grid; 12-col browse layout |
| Wide | > 1280px | Same as desktop with more breathing room; max content width caps at 1280px |

### Touch Targets
- `{component.button-primary}` at minimum 40 × 40px.
- `{component.feedback-button}` at minimum 40 × 40px.
- `{component.text-input}` height scales with padding for mobile readability.
- Headword links in browse grid use full card area as tap target.

### Collapsing Strategy
- Header collapses controls behind an expandable panel at the `lg` (1024px) breakpoint.
- Browse page's 3-column sidebar collapses to an accordion on mobile.
- Pronunciation tabs switch from pill-bar to accordion on mobile.
- Headword grids reduce columns (5 → 4 → 3) rather than scaling cards down.
- Search filter dropdowns stack vertically on mobile.
- Footer columns stack to single-column on mobile.

### Image Behavior
- Dictionary content uses no images — the headword in serif type is the visual hero.
- Book spine cards maintain `aspect-[3/4]` at all breakpoints.
- Icons from lucide-vue-next scale with their container.

## Iteration Guide

1. Focus on ONE component at a time. Reference its YAML key (`{component.dict-card}`, `{component.red-dot-divider}`).
2. Variants of an existing component (`-active`, `-inactive`, `-green`) live as separate entries in `components:`.
3. Use `{token.refs}` everywhere — never inline hex.
4. Buttons are always sharp rectangular. Tags are always `{rounded.lg}`. This is non-negotiable.
5. Serif is for headwords and headings. Sans is for body and UI. The split is unbreakable.
6. Parchment + kapok + archive-green + muted-gold is the color palette. Don't introduce a fifth accent.
7. When unsure about emphasis: larger serif type before stronger color.
8. Self-host all CJK fonts. Test font loading in slow-network conditions (China users may have limited bandwidth).
9. Maintain search result consistency: client (`composables/useDictionary.ts`) and server (`server/api/search.ts`) must produce identical ranking.

## Known Gaps

- Chiron Hei HK and Chiron Sung HK are commercial variable fonts. Open-source substitutes (Noto Sans HK / Noto Serif HK) are documented but not yet tested for visual parity.
- The UI subset fonts require `pyftsubset` (from Python `fonttools`) to build. If unavailable, the subset files in `public/fonts/` serve as pre-built fallbacks.
- Animation and transition timings are limited to card fade-in (0.3s), theme transitions (0.2s), and mobile carousel slides. Complex page transitions are not in scope.
- Dark mode color assignments for some secondary components (browse sidebar, filter dropdowns) use direct Tailwind `stone-*` utilities rather than design tokens — these should be formalized.
- The i18n system supports 5 locales but the DESIGN.md documents light-mode tokens only. Dark-mode token mapping for non-English locales (CJK line-height adjustments) may need per-locale tuning.
- Mobile-specific interactions (swipe gestures on carousel, pull-to-refresh) are not documented here.
