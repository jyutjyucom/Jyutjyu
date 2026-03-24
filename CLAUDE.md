# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**粵語辭叢 (Jyutjyu)** is an open Cantonese dictionary aggregation platform that unifies multiple dictionaries (classified, colloquialisms, etymology, etc.) into a single searchable interface. The platform supports intelligent search with traditional/simplified Chinese conversion, Jyutping romanization, and multi-dictionary queries.

### Key Technologies
- **Framework**: Nuxt 3 (Vue 3 + SSR)
- **UI**: Tailwind CSS
- **Data Storage**: Dual mode - Static JSON files or MongoDB Atlas
- **Chinese Conversion**: OpenCC.js (server and client)
- **Search**: MiniSearch (client) or MongoDB Atlas Search (server)
- **Deployment**: Vercel

## Development Commands

### Basic Development
```bash
npm run dev          # Start dev server on port 3000
npm run build        # Build for production
npm run generate     # Generate static site
npm run preview      # Preview production build
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run typecheck    # Run TypeScript type checking
npm run test         # Run tests (Node.js built-in test runner)
```

Tests live in `tests/` as `.test.mjs` files. Run a single test with:
```bash
node --test tests/search-query-variants.test.mjs
```

### Data Processing

**CSV Validation** (before conversion):
```bash
npm run validate -- data/processed/your-file.csv
# Shortcut examples:
npm run validate:gzpc    # 实用广州话分类词典
npm run validate:hkcw    # 粤典
```

**CSV/JSONL to JSON Conversion**:
```bash
# Generic command
npm run build:data -- --dict <dict-id> --input <file>

# Dictionary-specific shortcuts:
npm run build:data:gzpc      # 分類詞典
npm run build:data:gzcl      # 俗語詞典
npm run build:data:gzwo      # 詞源
npm run build:data:gzd       # 方言詞典
npm run build:data:gzm       # 現代粵語
npm run build:data:gzdict    # 廣州話詞典
npm run build:data:hkcw      # 粵典
npm run build:data:qzjp      # 欽州粵拼
npm run build:data:kpd       # 開平方言
npm run build:data:tsed      # 台山話英文字典
npm run build:data:wiktionary  # 維基辭典
```

**Import to MongoDB**:
```bash
npm run db:import            # Add/update entries
npm run db:import:replace    # Replace entire dictionary
# Dictionary-specific:
npm run db:import:gzpc       # Import specific dictionary
```

## Architecture

### Dual Storage Mode

The application supports two storage modes, controlled by `NUXT_PUBLIC_USE_API` environment variable:

1. **Static JSON Mode** (`NUXT_PUBLIC_USE_API=false` or unset)
   - Dictionary data stored in `public/dictionaries/`
   - Client-side search using MiniSearch
   - Client-side OpenCC conversion
   - Suitable for development, demos, small-scale deployments
   - Zero database cost

2. **MongoDB API Mode** (`NUXT_PUBLIC_USE_API=true`)
   - Data stored in MongoDB Atlas
   - Server-side search via API endpoints
   - Server-side OpenCC conversion
   - Supports Atlas Search for full-text search
   - Suitable for production, large-scale deployments

3. **Auto Mode** (neither set): If `MONGODB_URI` is configured, defaults to API mode; otherwise uses static JSON.

**Implementation**: `composables/useSearch.ts` automatically selects the appropriate implementation based on runtime config.

### Core Data Flow

```
CSV Data (data/processed/)
  ↓ (scripts/csv-to-json.js with adapter)
JSON Files (public/dictionaries/)
  ↓ (optional: import-to-mongodb.js)
MongoDB Atlas
  ↓ (server/api/search.ts)
Client Search (composables/useSearch.ts)
```

### Dictionary Data Schema

Core type: `DictionaryEntry` (defined in `types/dictionary.ts`)

Key fields:
- `id`: Unique identifier
- `source_book`: Dictionary source
- `dialect`: Dialect information
- `headword`: `{ display, normalized, search }` - handles variant spellings
- `phonetic`: `{ jyutping[], original }` - Jyutping arrays for polyphonic characters
- `senses`: Array of definitions with examples
- `keywords`: Search optimization array (generated during build)
- `meta`: Dictionary-specific metadata (category, etymology, references, etc.)

### Search Logic

**Normal Mode Priority**:
1. Exact headword match (priority 100)
2. Prefix match (90)
3. Contains match (80)
4. Exact Jyutping match (70)
5. Jyutping contains match (60)
6. Keyword match (50)

**Reverse Mode** (search by definition):
- Exact definition match (100)
- Definition contains match (80)

**Secondary sorting**: Entry length, definition detail, dictionary quality weight

Implementation:
- Client: `composables/useDictionary.ts` - `searchBasic()` method
- Server: `server/api/search.ts` - `fallbackSearch()` and `atlasSearch()` functions

### Dictionary Adapters

Each dictionary has a custom adapter in `scripts/adapters/` that transforms CSV rows into the standard `DictionaryEntry` format. Adapters handle:
- Dictionary-specific metadata mapping
- Jyutping normalization
- Definition and example parsing
- Reference link generation

When adding a new dictionary, create a new adapter following the pattern in existing adapters.

### Caching Strategy

**Client-side** (`composables/useSearch.ts`):
- Search results cached for 30 minutes (max 50 queries)
- Dictionary data cached globally
- Chunked dictionary loading for large datasets

**Server-side**:
- MongoDB connection pooling (singleton pattern in `server/utils/mongodb.ts`)
- OpenCC converter instances cached after initialization

### Internationalization

Configured in `i18n.config.ts` with 5 locales:
- `yue-Hant`: 粵語 (Cantonese in traditional characters) - source locale
- `yue-Hans`: 简体粤语 (Cantonese in simplified characters) - auto-generated
- `zh-Hant`: 繁體普通話 (Mandarin in traditional characters) - source locale
- `zh-Hans`: 简体普通话 (Mandarin in simplified characters) - auto-generated
- `en`: English UI - manually maintained source locale

Strategy: `prefix_except_default` (default locale unprefixed, all others prefixed), browser language detection disabled so the default Cantonese UI is always shown until the user switches manually.

The `yue-Hans` and `zh-Hans` locales are auto-generated from their respective source locales by `scripts/generate-yue-hans.js` and `scripts/generate-zh-hans.js` (run automatically during `prebuild`/`pregenerate`). Source messages live in `locales/yue-Hant.source.mjs`, `locales/zh-Hant.source.mjs`, and `locales/en.source.mjs`.

### Build Hooks

`prebuild` and `pregenerate` automatically run these scripts:
- `build:font-ui`: Build Chiron Hei/Sung UI subset fonts (requires `pyftsubset`)
- `build:i18n-hans`: Generate `yue-Hans` locale from `yue-Hant` source
- `build:i18n-zh-hans`: Generate `zh-Hans` locale from `zh-Hant` source
- `build:browse-index`: Build browse page index data
- `build:recommendations`: Build random entry recommendation data

### Chunked Dictionary Loading

Large dictionaries (e.g., Wiktionary with 100k+ entries) are split into chunks by Jyutping initial:
- Manifest file: `<dict_id>/manifest.json`
- Chunk files: `<dict_id>/chunks/a.json`, `b.json`, etc.
- Loading strategy: Load only relevant chunks based on query (see `composables/useDictionary.ts` - `getRequiredChunks()`)

## Key Files and Patterns

### Server API Endpoints
- `server/api/search.ts`: Main search endpoint
- `server/api/suggest.ts`: Lightweight headword autocomplete suggestions
- `server/api/word/[headword].ts`: Word page data (resolves headword → entries)
- `server/api/entry/[id].ts`: Single entry lookup by ID
- `server/api/dictionaries.ts`: Dictionary metadata
- `server/api/browse/index.ts`: Browse page data
- `server/api/random.ts`: Random entry recommendations
- `server/api/feedback.issue.ts`: Feedback submission to GitHub Issues

### Composables Pattern
- `useSearch`: Unified search interface (auto-selects JSON/API mode)
- `useDictionary`: Static JSON implementation
- `useDictionaryAPI`: MongoDB API implementation
- `useDictionaryEntry`: Shared entry formatting utilities (jyutping display, definition link formatting, dialect labels, feedback description)
- `useChineseConverter`: Client-side OpenCC conversion
- `useTheme`: Dark/light mode management
- `useLocalizedDictionary`: Dictionary name localization

### Type System
All types defined in `types/dictionary.ts`:
- `DictionaryEntry`: Core entry type
- `DictionaryInfo`: Dictionary metadata
- `SearchOptions`, `SearchResult`: Search interfaces
- `CSVRow`: CSV import format
- Dictionary-specific types: `Headword`, `Phonetic`, `Sense`, `Example`, etc.

### Server Utilities
- `server/utils/mongodb.ts`: MongoDB connection management (singleton)
- `server/utils/opencc.ts`: Server-side Chinese conversion with caching
- `server/utils/word-resolver.ts`: Entry lookup and word page data resolution (prioritizes original headword over simplified/traditional variants)
- `server/utils/headword-suggestions.ts`: Builds and caches suggestion records from all dictionaries
- `server/utils/headword-suggestion-ranking.ts`: Ranks suggestions (exact > prefix > contains)
- `server/utils/browse-index.ts`: Pre-built browse page index management

### Nuxt Modules
- `@nuxt/content`: Markdown content rendering (about page, docs)
- `@nuxt/image`: Image optimization via IPX provider
- `@nuxtjs/tailwindcss`: Tailwind CSS integration
- `@nuxtjs/i18n`: Internationalization
- `@nuxtjs/critters`: Critical CSS inlining

### Route-Level Caching
- `/word/**` and `/browse/**`: SWR caching with 86400s (24h) revalidation
- `/` and `/about`: Prerendered at build time
- Browse pages for each dictionary: Prerendered at build time

## Important Implementation Notes

### Design System — Scholar's Ink (Kapok Edition)

Color tokens defined in `tailwind.config.js`:
- `kapok` (#b53a25): Primary accent — buttons, active tabs, links, dividers
- `ink` (#031632): Primary text color (light mode)
- `parchment` (#fbf9f4): Page background (light mode), text color (dark mode)
- `graphite` (#44474d): Secondary text
- `archive-green` (#4A6B5D, light: #7FA393): Examples, sub-labels, secondary accents
- `surface-low/mid/high/highest`: Layered card/input backgrounds
- Dark mode uses Tailwind `stone-*` scale (stone-950 bg, stone-100/200 text)

### Font Architecture

Self-hosted via `@fontsource-variable` (Google Fonts is blocked in China). Fonts are split into two tiers:

**UI subset fonts** (small, preloaded globally in `app.vue`):
- `Chiron Hei HK UI` (~224KB) — CJK sans-serif for app chrome. Built by `scripts/build-chiron-hei-ui-subset.mjs` from source file glyphs.
- `Chiron Sung HK UI` (~468KB) — CJK serif for UI headings. Built by `scripts/build-chiron-sung-ui-subset.mjs`.
- CSS: `styles/chiron-hei-ui.css`, `styles/chiron-sung-ui.css`

**Content fonts** (full glyph coverage, loaded per-page):
- `Chiron Hei HK Variable` (~4.7MB) — full CJK sans for dictionary content. Loaded via static `import '~/styles/chiron-hei-content.css'` on browse/word pages, or lazily via `useChironHeiContentFont().ensureLoaded()` on search/home.
- `Chiron Sung HK Variable` (~4MB) — full CJK serif for headword display. Same pattern with `chiron-sung-content.css`.
- Lazy loading composable: `composables/useContentFonts.ts` exports `useChironHeiContentFont`, `useChironSungContentFont`, and `useWarmContentFonts`.

**Inter Variable** is the global body font for Latin text, imported in `app.vue`.

Tailwind font utilities:
- `font-sans` → Inter only (app chrome, buttons, controls)
- `font-cjk-ui` → Inter + Chiron Hei HK UI (page `<main>` wrappers)
- `font-cjk-content` → Inter + Chiron Hei HK Variable (dictionary entries, search results)
- `font-serif` / `font-headline` → Chiron Sung HK UI (UI headings, hero text)
- `font-sung-content` → Chiron Sung HK Variable (dictionary headwords needing full glyph coverage)

The UI subsets are rebuilt during `predev`/`prebuild`/`pregenerate` via `npm run build:font-ui`. They require `pyftsubset` (from Python `fonttools`) to be installed.

When adding a new page: add `class="font-cjk-ui"` to `<main>`, and if the page shows dictionary content, either statically import the content CSS files or use the lazy composables.

### Traditional/Simplified Chinese Handling

**Both client and server** use OpenCC for conversion:
- Client: `composables/useChineseConverter.ts`
- Server: `server/utils/opencc.ts`

Always generate search variants (traditional, simplified, original) for matching. Use `getQueryVariants()` on server, `toSimplified()`/`toTraditional()` on client.

### Search Result Consistency

Maintain identical search behavior between client and server implementations:
- Same priority levels (see Search Logic above)
- Same secondary scoring
- Same sorting logic

When modifying search logic, update both:
- `composables/useDictionary.ts` (client-side)
- `server/api/search.ts` (server-side `fallbackSearch()`)

### Dictionary Data Structure

Dictionaries are stored as:
- **Non-chunked**: Single JSON file at `public/dictionaries/<dict_id>.json`
- **Chunked**: Directory at `public/dictionaries/<dict_id>/` with `manifest.json` and `chunks/*.json`

Index file: `public/dictionaries/index.json` lists all dictionaries with metadata.

### MongoDB Atlas Search

If Atlas Search is available, the search API uses `$search` aggregation stage with `lucene.cjk` tokenizer for automatic traditional/simplified matching. If unavailable, falls back to regex-based `fallbackSearch()`.

### Environment Variables

See `env.example` for full configuration. Key variables:

```
NUXT_PUBLIC_USE_API=true           # Force API mode (false for static JSON, unset for auto)
NUXT_PUBLIC_SITE_URL=https://...   # Canonical URL (default: https://jyutjyu.com)
ENFORCE_CANONICAL_HOST_REDIRECT=false  # 301 redirect to canonical host

# Required for MongoDB mode:
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=jyutjyu

# For feedback API:
GITHUB_TOKEN=...
GITHUB_REPO=...
```

For static JSON mode, set `NUXT_PUBLIC_USE_API=false` or leave unset.

## Data Validation and Quality

### CSV Validation

Before converting CSV to JSON, run validation:
```bash
npm run validate -- data/processed/your-file.csv
```

Validation checks for:
- Missing required fields (headword, jyutping, definition)
- Invalid Jyutping format
- Duplicate IDs
- Reference integrity

### Adding New Dictionaries

1. Prepare CSV following schema in `docs/CSV_GUIDE.md`
2. Create adapter in `scripts/adapters/<dict-id>.js`
3. Add adapter to `scripts/csv-to-json.js` ADAPTERS object
4. Run validation: `npm run validate -- data/processed/<file>.csv`
5. Convert to JSON: `npm run build:data -- --dict <dict-id> --input <file>`
6. Import to MongoDB (if using API mode): `npm run db:import:<dict-id>`

## Content Licensing

Different dictionaries have different licenses - handle with care:
- Published dictionaries (gz-*): Copyrighted, for academic use only
- 粵典 (words.hk): Non-commercial open data license
- Wiktionary: CC BY-SA 4.0
- 欽州粵拼: GPL-3.0
- 台山話英文字典: Copyright © Gene M. Chin
- Original contributions: CC BY-NC 4.0

Always display license information and attribution in the UI. See `CONTRIBUTING.md` for details.

### Vite / Build Notes

- OpenCC (`opencc-js`) is split into a manual chunk to avoid duplicating in multiple entry points
- HMR uses port 24679 (avoids conflicts with other dev servers)
- `.vercel/`, `.output/`, `dist/` directories are excluded from file watching

## Commit Conventions

Use Conventional Commits: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, `perf`, `style`.
Common scopes: `search`, `ui`, `data`, `build`, `i18n`, `browse`.

Example: `feat(search): add fuzzy Jyutping matching`
