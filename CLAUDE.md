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
npm run dev          # Start dev server on port 3002
npm run build        # Build for production
npm run generate     # Generate static site
npm run preview      # Preview production build
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Auto-fix ESLint issues
npm run typecheck    # Run TypeScript type checking
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
npm run build data:gzm       # 現代粵語
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

Configured in `i18n.config.ts` with 4 locales:
- `yue-Hant`: 粵文 (Cantonese in traditional characters)
- `yue-Hans`: 简体粤文 (Cantonese in simplified characters)
- `zh-Hant`: 繁體中文 (Traditional Chinese)
- `zh-Hans`: 简体中文 (Simplified Chinese)

Strategy: `no_prefix` (no URL prefix for locales), browser language detection enabled.

### Chunked Dictionary Loading

Large dictionaries (e.g., Wiktionary with 100k+ entries) are split into chunks by Jyutping initial:
- Manifest file: `<dict_id>/manifest.json`
- Chunk files: `<dict_id>/chunks/a.json`, `b.json`, etc.
- Loading strategy: Load only relevant chunks based on query (see `composables/useDictionary.ts` - `getRequiredChunks()`)

## Key Files and Patterns

### Server API Endpoints
- `server/api/search.ts`: Main search endpoint
- `server/api/dictionaries.ts`: Dictionary metadata
- `server/api/entry/[id].ts`: Single entry lookup
- `server/api/random.ts`: Random entry recommendations
- `server/api/feedback.issue.ts`: Feedback submission to GitHub Issues

### Composables Pattern
- `useSearch`: Unified search interface (auto-selects JSON/API mode)
- `useDictionary`: Static JSON implementation
- `useDictionaryAPI`: MongoDB API implementation
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

## Important Implementation Notes

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

Required for MongoDB mode:
```
MONGODB_URI=mongodb+srv://...
MONGODB_DB_NAME=jyutjyu
NUXT_PUBLIC_USE_API=true
GITHUB_TOKEN=... # For feedback API
GITHUB_REPO=...  # For feedback API
```

For static JSON mode, only `NUXT_PUBLIC_USE_API=false` or leave unset.

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
- Original contributions: CC BY-NC 4.0

Always display license information and attribution in the UI. See `CONTRIBUTING.md` for details.
