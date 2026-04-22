# Prebuilt Jyutping TTS Maintenance Guide

This document explains the current Jyutjyu TTS implementation as it exists in the repo today. It is meant for future maintenance, not product copy.

## Summary

Jyutjyu does **not** synthesize audio at runtime.

The shipped TTS flow is:

1. extract supported Jyutping strings from the canonical dictionary corpus
2. prebuild MP3 audio with Google Cloud Text-to-Speech
3. upload the MP3 objects to object storage / CDN
4. ship a manifest that maps normalized Jyutping to relative audio paths
5. let the client lazily load that manifest and play matching audio with one shared `Audio` element

Runtime never falls back to browser `speechSynthesis` and never calls Google TTS directly.

## Source Of Truth

### Batch source

The TTS catalog is built from:

- MongoDB `entries` if `MONGODB_URI` is configured
- otherwise `public/dictionaries/**`

The source loading logic lives in [`scripts/tts-shared.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/tts-shared.mjs).

### Runtime source

The runtime only trusts the manifest it loads:

- production manifest: [`public/tts/manifest.v1.json`](/Users/laufei/Documents/GitHub/Jyutjyu/public/tts/manifest.v1.json)
- local smoke manifest: [`public/tts/manifest.local.json`](/Users/laufei/Documents/GitHub/Jyutjyu/public/tts/manifest.local.json)

If a pronunciation is not in the loaded manifest, the speaker button is hidden.

## Core Design

### 1. TTS eligibility is source-aware

Three dictionaries are intentionally excluded because their Jyutping is not standard Cantonese:

- `qz-jyutping` / `欽州粵拼`
- `kp-dialect` / `開平方言`
- `ts-english-dict` / `台山話英文字典`

The shared policy lives in [`utils/tts-policy.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/utils/tts-policy.ts).

Important rule:

- excluded-dictionary pronunciation text still renders normally
- speaker buttons only render when at least one contributing source is TTS-supported

### 2. Pronunciation keys are normalized, but display text is preserved

Shared pronunciation helpers live in [`utils/pronunciation-display.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/utils/pronunciation-display.ts).

Current normalization rules:

- collapse internal whitespace
- lowercase Latin letters
- preserve the displayed label for UI
- use the normalized value as the manifest key

Example:

- display: `Jyut6   Ping3`
- normalized key: `jyut6 ping3`

### 3. `*` tone overrides are spoken with the tone after the star

Some sources encode alternate tone output like `dau6*2`.

For TTS synthesis only, the spoken phoneme becomes `dau2`. The visible label stays unchanged.

Examples:

- `tong4 ci1 dau6*2` -> phoneme `tong4 ci1 dau2`
- `tung4 faa1 seon6*2` -> phoneme `tung4 faa1 seon2`

This rule is implemented in [`utils/pronunciation-display.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/utils/pronunciation-display.ts) and reused by the batch scripts through [`scripts/tts-shared.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/tts-shared.mjs).

### 4. Audio is manifest-driven

The runtime manifest type is defined in [`types/tts.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/types/tts.ts):

```ts
interface TtsManifestV1 {
  version: 1;
  voiceId: string;
  voiceVersion: string;
  baseUrl: string;
  items: Record<string, string>;
}
```

The client combines:

- `manifest.baseUrl`
- `manifest.items[normalizedJyutping]`

to get the final MP3 URL.

That means storage can move later without changing the component API. In practice this is why cross-account R2 works: the app account and the audio-storage account are decoupled by the manifest.

## Runtime Architecture

### Nuxt runtime resolution

Public TTS runtime config is resolved in [`utils/tts-runtime.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/utils/tts-runtime.ts) and wired into [`nuxt.config.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/nuxt.config.ts).

Current behavior:

- if `NUXT_PUBLIC_TTS_*` env vars are set, they win
- otherwise production auto-enables TTS when `manifest.v1.json` exists and has entries
- in local dev, `manifest.local.json` is used only when there is no populated production manifest
- if both manifests exist, local dev prefers the full shipped production manifest

This avoids the earlier smoke-test problem where local dev showed missing icons simply because it was still reading a tiny local manifest.

### Client playback

The playback logic lives in [`composables/useTtsAudio.ts`](/Users/laufei/Documents/GitHub/Jyutjyu/composables/useTtsAudio.ts).

Key runtime behavior:

- one shared `HTMLAudioElement`
- lazy manifest fetch on first use
- one active pronunciation at a time
- clicking the currently playing pronunciation stops playback
- missing manifest entries or playback failures mark that normalized key unavailable for the session

The speaker button only renders when all of these are true:

- TTS is enabled
- the pronunciation is eligible under the source policy
- the manifest has already loaded or is loading
- the manifest contains the normalized key
- the key is not marked unavailable

## UI Integration

### Shared UI pieces

- speaker button: [`components/TtsSpeakerButton.vue`](/Users/laufei/Documents/GitHub/Jyutjyu/components/TtsSpeakerButton.vue)
- label + speaker wrapper: [`components/PronunciationWithTts.vue`](/Users/laufei/Documents/GitHub/Jyutjyu/components/PronunciationWithTts.vue)

### Current placement rules

Speaker buttons are intentionally shown on pronunciation surfaces that read like content, but not on pronunciation selectors.

Current word-page behavior:

- show in the desktop top summary row
- show in detailed per-entry Jyutping rows
- show in related-word pronunciation rows
- do **not** show in desktop pronunciation tab pills
- do **not** show in the mobile accordion selector header
- do **not** show inside the mobile pronunciation option list

Current search-page behavior:

- show in grouped card headers
- show in search list/table/mobile pronunciation summaries
- show in per-entry pronunciation rows where applicable

The main integration points today are:

- [`components/DictCardGroup.vue`](/Users/laufei/Documents/GitHub/Jyutjyu/components/DictCardGroup.vue)
- [`components/SearchResultsListView.vue`](/Users/laufei/Documents/GitHub/Jyutjyu/components/SearchResultsListView.vue)
- [`components/WordSourcePanel.vue`](/Users/laufei/Documents/GitHub/Jyutjyu/components/WordSourcePanel.vue)
- [`components/WordPronunciationTabs.vue`](/Users/laufei/Documents/GitHub/Jyutjyu/components/WordPronunciationTabs.vue)
- [`pages/word/[headword].vue`](/Users/laufei/Documents/GitHub/Jyutjyu/pages/word/[headword].vue)

## Batch Pipeline

### Files

- shared helpers: [`scripts/tts-shared.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/tts-shared.mjs)
- extract catalog: [`scripts/extract-tts-pronunciations.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/extract-tts-pronunciations.mjs)
- synthesize + upload + manifest: [`scripts/sync-tts-audio.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/sync-tts-audio.mjs)
- manifest verification: [`scripts/verify-tts-manifest.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/verify-tts-manifest.mjs)

### Generated artifacts

These are generated and not meant to be hand-edited:

- catalog: `data/tts/catalog.v1.json`
- local synthesis cache: `.tts-cache/`
- local smoke audio: `public/tts/audio/`
- local smoke manifest: `public/tts/manifest.local.json`
- production runtime manifest: `public/tts/manifest.v1.json`

Ignored local-only artifacts are declared in [`.gitignore`](/Users/laufei/Documents/GitHub/Jyutjyu/.gitignore).

### Default voice

Current defaults:

- `voiceId`: `yue-HK-Standard-A`
- `voiceVersion`: `v1`

These defaults live in [`scripts/tts-shared.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/tts-shared.mjs).

### Main commands

Extract the catalog:

```bash
npm run tts:extract
```

Build and upload the full manifest:

```bash
TTS_R2_BUCKET=<bucket-name> \
TTS_BASE_URL=https://tts.jyutping.org \
npm run tts:sync
```

For full backfills, prefer the direct R2 path above. Do not default to `TTS_UPLOAD_ENDPOINT` on a Workers Free account.

Local smoke test only:

```bash
npm run tts:sync:local -- --only "ngo5 dei6"
```

Verify that the production manifest matches the catalog:

```bash
npm run tts:verify
```

Useful flags:

- `--dry-run`
- `--only "<jyutping>"`
- `--limit N`
- `--force`
- `--local-public`

Use `--force` whenever synthesis rules change in a way that makes existing MP3s stale, for example after changing phoneme normalization or tone-override handling.

### Incremental sync behavior

Normal `tts:sync` runs are incremental.

What the script does automatically:

- if a pronunciation produces a new normalized key, it gets a new relative audio path and only that new file is synthesized/uploaded
- if you bump `TTS_VOICE_VERSION`, all objects move into a new namespace, which gives you a clean full refresh

What the script does **not** do automatically:

- it does not diff audio content for an existing key/path
- if the normalized key stays the same, the script assumes the existing uploaded object is still valid

So if audio should change while the key/path stays the same, you must do one of these explicitly:

- rerun sync with `--force`
- bump `TTS_VOICE_VERSION`

Typical same-key-but-changed-audio cases:

- changed voice
- changed phoneme normalization
- changed `*` tone-override behavior
- changed representative text in a way that should affect synthesis

## Storage And Hosting

### Current production shape

The checked-in production manifest currently points at:

- `https://tts.jyutping.org`

The runtime does not care whether that host is:

- same-account R2
- cross-account R2
- another CDN/object-storage origin

It only cares that the manifest `baseUrl` and relative object paths resolve.

Important distinction:

- normal audio playback from an R2 custom domain is an R2/public-bucket serving path
- that steady-state path is not the same as invoking a Worker for each playback request
- a one-off upload endpoint can still be Worker-backed and consume Workers/Pages request quota during backfill

### Cross-account R2 support

The sync script supports uploading to an R2 bucket in another Cloudflare account through:

- `TTS_R2_BUCKET`
- `TTS_R2_ACCOUNT_ID`

This is implemented in [`scripts/tts-shared.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/scripts/tts-shared.mjs) by generating a temporary Wrangler config for the target account.

This design keeps future migration easy:

- keep object keys stable
- copy objects to the new bucket
- update `baseUrl` through the manifest or env

No runtime code change is required.

### Upload endpoint warning

`TTS_UPLOAD_ENDPOINT` exists as an escape hatch for custom upload flows, but it should be treated as operationally expensive unless you know the endpoint is not Worker-backed.

If the endpoint is implemented with Cloudflare Workers or Pages Functions, a large sync can generate roughly one Worker request per uploaded audio object. A full Jyutjyu TTS backfill is large enough to exceed the Workers Free daily request quota.

Use cases where `TTS_UPLOAD_ENDPOINT` is acceptable:

- a very small smoke subset
- targeted retries
- a paid Workers account
- a non-Workers upload service

For the normal production path, prefer direct R2 upload with:

- `TTS_R2_BUCKET`
- `TTS_R2_ACCOUNT_ID`

## Environment Variables

The documented env surface lives in [`env.example`](/Users/laufei/Documents/GitHub/Jyutjyu/env.example).

### Public runtime

- `NUXT_PUBLIC_TTS_ENABLED`
- `NUXT_PUBLIC_TTS_MANIFEST_PATH`
- `NUXT_PUBLIC_TTS_BASE_URL`
- `NUXT_PUBLIC_TTS_VOICE_VERSION`

### Batch generation

- `TTS_VOICE_ID`
- `TTS_VOICE_VERSION`
- `TTS_R2_BUCKET`
- `TTS_R2_ACCOUNT_ID`
- `TTS_UPLOAD_ENDPOINT`
- `TTS_UPLOAD_TOKEN`
- `TTS_CONCURRENCY`
- `TTS_SYNTH_RPM`
- `GOOGLE_CLOUD_PROJECT` / `GCLOUD_PROJECT` / `GCP_PROJECT`
- `GOOGLE_ACCESS_TOKEN` optional override

Google auth is normally taken from `gcloud auth application-default print-access-token` or `gcloud auth print-access-token`.

Operational note:

- `TTS_UPLOAD_ENDPOINT` is not the preferred default for large jobs
- when the endpoint is Worker-backed, it consumes Workers/Pages request quota
- `TTS_R2_BUCKET` + `TTS_R2_ACCOUNT_ID` is the safer default for full backfills

## Current Operational Workflow

When dictionary data changes and production TTS should stay complete:

1. update/import dictionary data
2. run `npm run tts:extract`
3. run `npm run tts:sync`
4. run `npm run tts:verify`
5. deploy the app so the new `manifest.v1.json` ships

For large syncs on a free Workers account:

- do not use `TTS_UPLOAD_ENDPOINT`
- use direct R2 upload instead

If the change only affects audio hosting:

1. copy or re-upload audio objects
2. update the manifest `baseUrl` or `NUXT_PUBLIC_TTS_BASE_URL`
3. redeploy if the checked-in manifest changed

If the change affects pronunciation rules or voice output:

1. bump `TTS_VOICE_VERSION` if you want a clean new object namespace
2. rerun sync with `--force`
3. verify the manifest
4. redeploy

## Troubleshooting

### A pronunciation has no speaker icon

Check in this order:

1. is the source from an excluded dictionary
2. is the pronunciation key present in the loaded manifest
3. is TTS enabled in the current runtime config
4. is local dev accidentally pointed at a smoke manifest instead of the full manifest

### The text renders, but clicking the icon does nothing

Likely causes:

- stale manifest path / base URL mismatch
- object missing at the expected remote path
- the key was marked unavailable after a failed fetch in the current session

Reloading the page clears the session-level unavailable cache.

### Cloudflare emails about Workers/Pages daily request limits after a TTS sync

Separate the steady-state serving path from the backfill path:

- serving audio from an R2 custom domain is not itself proof that Workers quota is involved
- but a sync that uses `TTS_UPLOAD_ENDPOINT` may still send one Worker/Pages request per uploaded object

If a large TTS backfill was done through a Worker-backed upload endpoint, that is the first thing to suspect.

### A starred pronunciation sounds wrong

If the visible label contains `*`, confirm the synthesized phoneme uses the tone after the star. If older audio was already generated before the rule change, rerun sync with `--force`.

### Local dev has fewer buttons than production

Check which manifest local dev is loading. The intended current behavior is:

- use `manifest.v1.json` if it has entries
- otherwise use `manifest.local.json` only for smoke testing

## Tests

The most important TTS-specific tests today are:

- [`tests/pronunciation-display-items.test.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/tests/pronunciation-display-items.test.mjs)
- [`tests/tts-runtime.test.mjs`](/Users/laufei/Documents/GitHub/Jyutjyu/tests/tts-runtime.test.mjs)

These cover:

- source-based eligibility
- split-row pronunciation item generation
- normalization
- `*` tone override phoneme behavior
- local vs production manifest resolution rules

## Future Changes: What To Preserve

These are the invariants that matter most:

1. never call Google TTS directly from the browser
2. keep source-policy checks shared between runtime UI and batch generation
3. keep manifest keys derived from the same normalization logic used during extraction
4. preserve the distinction between visible label and spoken phoneme form
5. do not show speaker buttons on excluded-dictionary-only pronunciations
6. do not put the button back inside the word-page pronunciation selector UI unless the product decision changes
