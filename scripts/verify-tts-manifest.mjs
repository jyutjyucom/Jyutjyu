#!/usr/bin/env node

import {
  TTS_CATALOG_PATH,
  TTS_MANIFEST_PATH,
  buildCatalog,
  readJsonFile,
} from "./tts-shared.mjs";

const catalog =
  (await readJsonFile(TTS_CATALOG_PATH).catch(() => null)) ||
  (await buildCatalog());
const manifest = await readJsonFile(TTS_MANIFEST_PATH);

const catalogKeys = new Set(catalog.items.map((item) => item.normalized));
const manifestKeys = new Set(Object.keys(manifest.items || {}));

const missingFromManifest = [...catalogKeys].filter(
  (key) => !manifestKeys.has(key),
);
const extraInManifest = [...manifestKeys].filter(
  (key) => !catalogKeys.has(key),
);

if (missingFromManifest.length > 0) {
  console.error(
    `Manifest is missing ${missingFromManifest.length} pronunciation entries.`,
  );
  console.error(missingFromManifest.slice(0, 20).join(", "));
  process.exit(1);
}

if (extraInManifest.length > 0) {
  console.error(
    `Manifest has ${extraInManifest.length} unexpected pronunciation entries.`,
  );
  console.error(extraInManifest.slice(0, 20).join(", "));
  process.exit(1);
}

console.log(
  `Verified ${manifestKeys.size} runtime TTS entries against ${catalog.source} source data.`,
);
