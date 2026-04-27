# Mainland China Moderation Plan

This document records the planned workflow for UI-level content moderation for
users geolocated to mainland China. The goal is to avoid showing selected
entries from community dictionaries in mainland China while preserving the
original imported dictionary data.

## Scope

The first implementation targets production API mode only:

- Runtime: Nuxt server API on Cloudflare Workers.
- Storage: MongoDB-backed production deployment.
- Initial dictionaries: `hk-cantowords` and `wiktionary-cantonese`.
- Static JSON mode is out of scope for this moderation system.

The moderation layer must not delete or rewrite upstream dictionary entries. It
should only mark entries as restricted for specific regions and filter them from
API responses.

## Source Strategy

Use `konsheng/Sensitive-lexicon` as the initial seed lexicon because it is a
plain-text sensitive-word project with an MIT license.

Do not edit vendored upstream files directly. Keep upstream data separate from
project-specific decisions so the lexicon can be updated later without losing
local review history.

Planned files:

```text
data/moderation/
  vendor/konsheng-sensitive-lexicon/  # Upstream seed lexicon
  cn-extra-terms.txt                  # Project-added terms
  cn-disabled-sources.txt             # Upstream files disabled after review
  cn-disabled-terms.txt               # Upstream terms disabled after review
  cn-allowlist.txt                    # Entry/context-level false-positive allowlist
  sources.json                        # Source, license, URL, import date, usage notes
  reports/
    cn-matches.json                   # Full machine-readable match report
    cn-matches-summary.md             # Human-readable audit summary

server/assets/moderation/
  cn-restricted-entry-ids.json        # Runtime artifact: restricted entry IDs only
```

## Review Workflow

The first pass should be automated, then reviewed by Codex.

1. Import or vendor `konsheng/Sensitive-lexicon`.
2. Build an effective term list:
   - read all enabled upstream text files;
   - trim whitespace and deduplicate;
   - generate traditional/simplified variants;
   - add `cn-extra-terms.txt`;
   - skip files listed in `cn-disabled-sources.txt`;
   - remove terms listed in `cn-disabled-terms.txt`;
   - apply `cn-allowlist.txt` after matching.
3. Scan `hk-cantowords` and `wiktionary-cantonese` entries.
4. Treat non-target dictionaries as a trusted cross-dictionary allow signal:
   if the exact headword is also collected by dictionaries outside
   `hk-cantowords` and `wiktionary-cantonese`, do not restrict that target
   entry. This preserves Cantonese-specific vocabulary and ordinary dictionary
   headwords that are already covered by published or curated sources.
5. Match against searchable entry text:
   - `headword.display`;
   - `headword.normalized`;
   - `headword.search`;
   - `senses.definition`;
   - examples;
   - `meta.etymology`;
   - `meta.notes`;
   - `refs.target`.
6. Generate reports grouped by matched term, source dictionary, count, and sample
   entries.
7. Codex reviews the report by matched term first, not one raw entry at a time.
8. Broad false-positive terms go into `cn-disabled-terms.txt`.
9. Context-specific false positives go into `cn-allowlist.txt`.
10. Confirmed restricted entries become `cn-restricted-entry-ids.json`.

The important review unit is the matched term. If a single term produces a large
number of harmless matches, disable that term or add a more precise rule rather
than reviewing every affected entry manually.

## MongoDB Marking

During import or a follow-up moderation sync step, write moderation metadata to
matched MongoDB documents:

```ts
moderation: {
  restricted_regions: ['CN'],
  matched_terms: ['...'],
  policy: 'cn-sensitive-lexicon-v1'
}
```

Runtime filtering should prefer a MongoDB field filter over large `$nin` lists:

```ts
{ 'moderation.restricted_regions': { $ne: 'CN' } }
```

Add an index for moderation filtering if query plans show it is needed.

## Cloudflare Country Detection

The production deployment runs on Cloudflare Workers. Mainland filtering should
use Cloudflare's country signal:

1. Prefer `request.cf.country` when available.
2. Fall back to the `CF-IPCountry` request header.
3. Support a local or staging override for testing.

Expected helper shape:

```ts
export const shouldApplyMainlandModeration = (event: H3Event): boolean => {
  return getCountryCode(event) === 'CN'
}
```

## API Integration Points

All user-visible dictionary entry surfaces must use the same moderation helper.

- `/api/search`
  - If a mainland request query hits the effective sensitive term list, return
    an empty result set.
  - Add the MongoDB moderation filter to Atlas Search and fallback search paths.
- `/api/word/[headword]`
  - Filter resolved entries.
  - Return 404 if all matching entries are restricted.
- `/api/suggest`
  - Return no suggestions when the query itself hits a restricted term.
  - Build suggestion records from unrestricted MongoDB entries for mainland
    requests.
- `/api/random`
  - Add the moderation filter to the random-entry aggregation.
- `/api/browse`
  - For mainland requests, use MongoDB-backed filtering or a separately generated
    mainland-safe browse index.

Any future endpoint that can reveal headwords, definitions, related entries, or
recommendations must go through the same moderation filter.

## Cache Rules

Because the same URL can return different data depending on country, moderation
affected API responses should not be cached globally in the first version.

Use conservative headers for affected mainland responses:

```http
Cache-Control: private, no-store
```

If caching is later reintroduced, the cache key must vary by country.

## First Implementation Checklist

1. Vendor `konsheng/Sensitive-lexicon` and record it in `sources.json`.
2. Add moderation override files.
3. Write `scripts/build-moderation-index.js`.
4. Generate the first match report for `hk-cantowords` and
   `wiktionary-cantonese`.
5. Review the report and populate `cn-disabled-terms.txt` / `cn-allowlist.txt`.
6. Generate `server/assets/moderation/cn-restricted-entry-ids.json`.
7. Add MongoDB moderation metadata during import or sync.
8. Add `server/utils/moderation.ts`.
9. Wire moderation filters into search, word, suggest, random, and browse APIs.
10. Add tests for mainland and non-mainland request behavior.
