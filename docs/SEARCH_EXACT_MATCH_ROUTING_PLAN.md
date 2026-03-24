# Search Exact-Match Routing Plan

## Summary

Implement direct routing from search input to the canonical word page when the query is a single exact headword match.

Recommended rollout:

- Phase 1: exact-match resolver + client-side direct navigation for submit flows
- Phase 2: optional server middleware redirect for direct `/search?q=...` visits

Target behavior:

- Exact unique forward lookup: go directly to `/word/<canonical-headword>`.
- Exact lookup with multiple canonical matches: stay on `/search?q=...`.
- Reverse search: stay on `/search?q=...&reverse=1`.
- Jyutping-only query: stay on `/search?q=...`.
- Misspelling / fuzzy / partial match: stay on `/search?q=...`.

This matches the product pattern used by major dictionary sites and fits the current SEO setup in this repo:

- Search pages are already `noindex, follow`.
- Word pages are already `index, follow`.
- Word pages are already included in the sitemap.

## Why This Is Worth Doing

### UX

- Exact lookup intent is the dominant dictionary behavior.
- Users searching for an exact headword should land on the richest page immediately.
- The current word page already includes a path back to broader search results, so direct landing does not remove discovery.

### SEO

- It concentrates internal navigation and shared URLs on canonical word pages instead of utility search URLs.
- It reduces reliance on client-rendered search results for discovery.
- It keeps `/search` as a fallback utility page rather than the main destination for exact lookups.

## Current State

### Search route

- [pages/search.vue](../pages/search.vue) performs search only on the client.
- The route watcher explicitly gates execution behind `process.client`.
- Exact-match grouping exists only after client-side results load.
- `handleSearch()` currently always pushes to `searchPath(query, reverse)`.

### Word route

- [pages/word/[headword].vue](../pages/word/[headword].vue) already fetches word data on the server with `useFetch`.
- It already redirects non-canonical word URLs to the canonical word path.
- It already computes a back-link to broader search results.

### Existing server-side match logic

- [server/utils/word-resolver.ts](../server/utils/word-resolver.ts) already resolves a headword query to a canonical word bucket.
- However, `resolveWordEntries()` is optimized for picking the best bucket, not for deciding whether a search query is uniquely exact.
- That distinction matters: exact-match routing must not silently choose one word page when the query is ambiguous.

## Core Design Decision

Do not reuse `resolveWordEntries()` directly for exact-match redirects.

Reason:

- `resolveWordEntries()` intentionally selects the "best" bucket when multiple canonical buckets match.
- For search routing, that behavior is too aggressive.
- Redirects should happen only when there is exactly one canonical exact match.

Instead, add a separate exact-match resolution path that can enumerate exact canonical buckets and return:

- one unique canonical headword, or
- "ambiguous", or
- "no exact match".

## Target Architecture

Use the same exact-match decision in two places eventually:

1. Client-side search submission routing to avoid a visible hop through `/search`
2. Optional server-side request redirect for direct visits to `/search?...`

Phase 1 should ship the client-side path first because it covers the dominant user flow with lower implementation risk.

Phase 2 can add server-side redirect coverage for bookmarked or shared `/search?q=...` URLs if the team still wants the extra SEO / URL-cleanup pass.

## Proposed Implementation

### 1. Add a shared query classification utility

Recommended file:

- `utils/query-classify.ts`

Move Jyutping detection out of [pages/search.vue](../pages/search.vue) into a shared pure utility.

Suggested exports:

```ts
export const isJyutpingQuery = (query: string): boolean => { ... }
export const normalizeSearchQuery = (query: string): string => { ... }
```

This utility should be reused by:

- the server exact-match resolver
- the client-side search navigation composable
- [pages/search.vue](../pages/search.vue), so there is no drift between the redirect rules and the result-grouping rules

### 2. Add a dedicated exact-match resolver on the server

Recommended location:

- extend [server/utils/word-resolver.ts](../server/utils/word-resolver.ts), or
- create a small wrapper such as `server/utils/search-landing-resolver.ts`

Recommended return shape:

```ts
export interface SearchLandingResolution {
  type: "word" | "search";
  reason:
    | "exact_unique"
    | "empty_query"
    | "reverse_search"
    | "jyutping_query"
    | "ambiguous_exact_match"
    | "no_exact_match";
  canonicalHeadword?: string;
}
```

Resolution rules:

- Trim and normalize whitespace.
- If query is empty: return `search`.
- If reverse search: return `search`.
- If query is Jyutping-only: return `search`.
- Build simplified/traditional variants using the same OpenCC path already used elsewhere.
- Match exact forms only against:
  - `headword.display`
  - `headword.normalized`
  - `meta.headword_variants`
- Group matched entries by canonical headword.
- If exactly one canonical group remains: return `word`.
- If more than one canonical group remains: return `search` with `ambiguous_exact_match`.
- If zero exact groups remain: return `search`.

Important:

- This should not consider prefix matches, contains matches, Jyutping matches, or definition matches.
- This should be much stricter than `/api/search`.

Concrete refactor shape inside [server/utils/word-resolver.ts](../server/utils/word-resolver.ts):

```ts
Current:
  groupEntriesByCanonical() -> calls selectBestBucket() -> returns one WordBucket | null

Proposed:
  groupEntriesIntoBuckets() -> returns Map<string, WordBucket>
  groupEntriesByCanonical() -> calls groupEntriesIntoBuckets() + selectBestBucket()
  resolveExactMatchBuckets() -> calls groupEntriesIntoBuckets() and checks bucket count
```

## 3. Add a lightweight API endpoint for client-side submit routing

Recommended file:

- `server/api/search/resolve.get.ts`

Suggested request:

- `GET /api/search/resolve?q=<query>&reverse=1|0`

Suggested response:

```ts
{
  success: true,
  query: string,
  reverse: boolean,
  resolution: {
    type: 'word' | 'search',
    reason: string,
    canonicalHeadword?: string
  }
}
```

Why a dedicated endpoint instead of overloading `/api/search`:

- exact-match routing is a separate concern from full search results
- the check should be cheap and strict
- the client only needs a routing decision, not full result payloads

Performance target:

- target p95 response time of roughly `<= 150ms`
- treat this endpoint as latency-sensitive because it runs on the submit path

## 4. Add a shared client-side navigation composable

Recommended file:

- `composables/useSearchNavigation.ts`

Suggested API:

```ts
const { navigateFromSearchInput } = useSearchNavigation();

await navigateFromSearchInput({
  query,
  reverse,
  knownExactHeadword: false,
});
```

Responsibilities:

- trim query
- if empty, do nothing
- if reverse search, push `searchPath()`
- if `isJyutpingQuery(query)`, push `searchPath()`
- if `knownExactHeadword === true`, go directly to `wordPath(query)` and skip the resolver API
- otherwise call `/api/search/resolve`
- if response is `word`, navigate to `wordPath(canonicalHeadword)`
- otherwise navigate to `searchPath(query, reverse)`
- if the resolver request fails, fall back safely to `searchPath(query, reverse)`
- if the resolver request is slow, fall back to `searchPath(query, reverse)` quickly instead of making the user wait with no visible navigation

Implementation details to include:

- use `AbortController` so a second submit cancels the previous resolve request
- use a small timeout budget, e.g. `Promise.race()` with `~200ms`
- once the timeout is hit, abort the resolver request and navigate to `/search`
- this keeps submit latency from regressing relative to the current implementation

Why centralize this:

- search submit logic is duplicated today across multiple pages
- exact-match routing should behave consistently everywhere
- this keeps the implementation reviewable and low-risk

## 5. Replace per-page search submit handlers with the shared composable

Current duplicated submit handlers exist in:

- [pages/index.vue](../pages/index.vue)
- [pages/search.vue](../pages/search.vue)
- [pages/browse/index.vue](../pages/browse/index.vue)
- [pages/browse/[dict].vue](../pages/browse/%5Bdict%5D.vue)
- [pages/word/[headword].vue](../pages/word/%5Bheadword%5D.vue)

Update each page-level `handleSearch()` to use the shared navigation helper instead of directly calling `router.push(searchPath(...))`.

Also update suggestion flows:

- when a user chooses a suggestion that is already a confirmed headword, navigate directly to `wordPath(suggestion)` or call `navigateFromSearchInput({ knownExactHeadword: true })`
- this makes the most common exact-match path zero-latency

Expected result:

- in-app navigation goes directly to the word page for exact unique headword queries
- suggestion selection skips the resolver network round-trip

## 6. Optional Phase 2: add server-side redirect middleware for direct `/search` requests

Recommended file:

- `server/middleware/search-exact-redirect.ts`

Responsibilities:

- run only for `GET` and `HEAD`
- inspect the request path
- use `stripLocalePrefix()` from [utils/route-paths.ts](../utils/route-paths.ts)
- only act when the normalized path is `/search`
- preserve the locale prefix when redirecting
- ignore:
  - empty queries
  - reverse search
  - requests that do not resolve to a unique exact headword

Redirect target construction:

- build canonical word path with `buildWordRoutePath()`
- reapply the original locale prefix with `applyLocalePrefix()`

Recommended redirect status:

- keep `302`

Reason:

- `/search?q=...` is a dynamic utility URL, not a canonical content URL
- a permanent redirect is not a good default for a utility route whose mapping can change as the dataset changes
- `302` avoids over-caching the redirect in browsers and intermediaries

## 7. Keep the search page itself as the fallback experience

Do not remove [pages/search.vue](../pages/search.vue).

It still needs to serve:

- fuzzy matches
- partial matches
- ambiguous exact matches
- reverse search
- Jyutping search
- externally linked legacy `/search?q=...` URLs that do not resolve uniquely

Also keep the current `noindex, follow` strategy for the search page unless there is a separate SEO decision to revisit it.

## Matching Rules in Detail

### Redirect to word page

- Query: exact headword match
- Query: exact normalized headword match
- Query: exact headword variant match
- Query: simplified/traditional equivalent that resolves to one canonical headword

### Do not redirect

- Reverse search
- Jyutping-only search
- Prefix-only match
- Contains-only match
- Definition-only match
- Multiple canonical headwords matched exactly

## File-Level Change List

### New files

- `utils/query-classify.ts`
- `server/api/search/resolve.get.ts`
- `composables/useSearchNavigation.ts`
- `tests/search-landing-routing.test.mjs`
- optional: `scripts/audit-exact-match-collisions.mjs`

### Existing files to update

- [server/utils/word-resolver.ts](../server/utils/word-resolver.ts)
- [pages/index.vue](../pages/index.vue)
- [pages/search.vue](../pages/search.vue)
- [pages/browse/index.vue](../pages/browse/index.vue)
- [pages/browse/[dict].vue](../pages/browse/%5Bdict%5D.vue)
- [pages/word/[headword].vue](../pages/word/%5Bheadword%5D.vue)

### Optional Phase 2 file

- `server/middleware/search-exact-redirect.ts`

### Files likely unchanged

- [components/AppHeader.vue](../components/AppHeader.vue)
- [server/api/search.ts](../server/api/search.ts)

The exact resolver should stay separate from the full search endpoint.

## Testing Plan

### Unit tests

Add [tests/search-landing-routing.test.mjs](../tests/search-landing-routing.test.mjs) covering:

- exact traditional query resolves to canonical word
- exact simplified query resolves to canonical word
- exact variant query resolves to canonical word
- ambiguous exact query does not redirect
- reverse query does not redirect
- Jyutping-only query does not redirect
- repeated rapid submits cancel stale requests correctly
- resolver timeout falls back to `/search` cleanly
- suggestion selection can bypass the resolver when the headword is already known

If Phase 2 middleware is implemented, also cover:

- locale-prefixed search path preserves locale in redirect target

### Existing test areas to keep green

- [tests/search-query-variants.test.mjs](../tests/search-query-variants.test.mjs)
- [tests/route-paths.test.mjs](../tests/route-paths.test.mjs)

### Manual QA

1. Search an exact common headword from the homepage.
2. Search an exact common headword from the header while already on `/search`.
3. Search an exact common headword from a browse page.
4. Search an exact common headword from a word page.
5. Search a misspelling and verify the search results page still appears.
6. Search in reverse mode and verify the search results page still appears.
7. Search with Jyutping and verify the search results page still appears.
8. Search a query known to map to more than one canonical headword and verify no redirect occurs.
9. Verify Back-button behavior from homepage, search page, browse page, and word page entry points.
10. Verify suggestion selection still feels instant.
11. Verify rapid double-submit does not navigate to the wrong word.

If Phase 2 middleware is implemented, also verify:

12. Open `/search?q=<exact-word>` directly in the browser and verify server redirect.
13. Open locale-prefixed URLs like `/zh-Hans/search?q=<exact-word>` and verify locale-preserving redirect.

### Dataset audit

Add a one-off script or test to count exact-form collisions across the dataset:

- iterate all exact headword forms
- group by canonical headword
- report forms that map to more than one canonical headword

This determines whether ambiguous exact-match queries are rare or common before rollout.

## Rollout Notes

Recommended rollout order:

1. Extract `utils/query-classify.ts` and reuse it in [pages/search.vue](../pages/search.vue).
2. Implement the exact-match resolver and unit tests.
3. Add the `/api/search/resolve` endpoint.
4. Add the client-side shared navigation helper with timeout and abort behavior.
5. Switch submit handlers and suggestion flows to the shared navigation helper.
6. Run the ambiguity audit against the dataset.
7. Validate analytics, submit latency, and Search Console behavior after deployment.
8. Only then decide whether to add the optional server middleware redirect.

Why this order:

- the exact-match decision logic is the risky part
- client-side direct routing covers the primary UX path with lower complexity
- timeout and abort handling need to be validated before wider rollout
- middleware can be deferred until the team decides the extra SEO / URL-cleanup coverage is worth the added complexity

## Success Criteria

- Exact unique forward lookups land on canonical word pages immediately.
- Ambiguous and fuzzy lookups still land on search results.
- Search submit behavior is consistent across all entry points.
- No regression to reverse-search or Jyutping-search workflows.
- Search-page SEO policy remains unchanged.
- Submit latency remains acceptable and does not feel slower than today.

If Phase 2 middleware is implemented:

- Locale-prefixed routes stay in the same locale after redirect.

## Open Questions for Review

1. Are there any product reasons to keep suggestion selection on `/search` instead of direct-to-word navigation?
2. If the ambiguity audit finds many collisions, should exact ambiguous cases stay on the search page or get a dedicated disambiguation UI?
3. After Phase 1 ships, is the optional middleware redirect still worth the complexity for direct `/search?q=...` visits?

## Recommendation

Proceed with a staged plan:

Phase 1:

- shared query classifier
- exact-match resolver
- `/api/search/resolve`
- shared client-side submit navigation with timeout and abort handling
- direct suggestion-to-word shortcut

Phase 2, only if still justified after Phase 1:

- server middleware redirect for direct `/search?q=...` requests

This is the best fit for this codebase because:

- the word page is already the canonical content surface
- the search page is already intentionally non-indexable
- the resolver logic already exists in adjacent form and can be extended safely
- the primary UX benefit comes from submit flows, not bookmarked `/search` URLs
- the site already has a good back-link path from word pages to broader search results
