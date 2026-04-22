#!/usr/bin/env node

import { join, resolve } from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

import {
  DEFAULT_TTS_VOICE_ID,
  DEFAULT_TTS_VOICE_VERSION,
  ROOT_DIR,
  TTS_CACHE_ROOT,
  TTS_CATALOG_PATH,
  TTS_MANIFEST_PATH,
  buildCatalog,
  buildRuntimeManifest,
  ensureFileDir,
  getGoogleAccessToken,
  readJsonFile,
  synthesizePronunciation,
  uploadWithWrangler,
  writeJsonFile,
} from "./tts-shared.mjs";
import { normalizeTtsJyutping } from "../utils/pronunciation-display.ts";

const cliArgs = process.argv.slice(2);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const readFlagValues = (flag) => {
  const values = [];

  for (let index = 0; index < cliArgs.length; index += 1) {
    const current = cliArgs[index];
    if (current === flag) {
      const nextValue = cliArgs[index + 1];
      if (nextValue && !nextValue.startsWith("--")) {
        values.push(nextValue);
      }
      continue;
    }

    if (current?.startsWith(`${flag}=`)) {
      values.push(current.slice(flag.length + 1));
    }
  }

  return values;
};

const readSingleFlagValue = (flag) => {
  return readFlagValues(flag).at(-1) || "";
};

const voiceId = process.env.TTS_VOICE_ID || DEFAULT_TTS_VOICE_ID;
const voiceVersion = process.env.TTS_VOICE_VERSION || DEFAULT_TTS_VOICE_VERSION;
const localPublicMode = cliArgs.includes("--local-public");
const outputRoot = resolve(
  ROOT_DIR,
  readSingleFlagValue("--output-root") ||
    (localPublicMode ? "public/tts/audio" : TTS_CACHE_ROOT),
);
const manifestPath = resolve(
  ROOT_DIR,
  readSingleFlagValue("--manifest-path") ||
    (localPublicMode ? "public/tts/manifest.local.json" : TTS_MANIFEST_PATH),
);
const baseUrl =
  readSingleFlagValue("--base-url") ||
  process.env.TTS_BASE_URL ||
  process.env.NUXT_PUBLIC_TTS_BASE_URL ||
  "/tts/audio";
const bucket = process.env.TTS_R2_BUCKET || "";
const r2AccountId = process.env.TTS_R2_ACCOUNT_ID || "";
const projectId =
  process.env.GOOGLE_CLOUD_PROJECT ||
  process.env.GCLOUD_PROJECT ||
  process.env.GCP_PROJECT ||
  "";
const onlyFilters = new Set(
  readFlagValues("--only")
    .flatMap((value) => value.split(","))
    .map((value) => normalizeTtsJyutping(value))
    .filter(Boolean),
);
const limitValue = Number.parseInt(readSingleFlagValue("--limit") || "", 10);
const limit = Number.isFinite(limitValue) && limitValue > 0 ? limitValue : null;

const dryRun = cliArgs.includes("--dry-run");
const force = cliArgs.includes("--force");
const uploadEndpoint = process.env.TTS_UPLOAD_ENDPOINT || "";
const uploadToken = process.env.TTS_UPLOAD_TOKEN || "";
const hasRemoteUploadTarget = Boolean(uploadEndpoint || bucket);
const uploadStatePath = join(outputRoot, `.uploaded-${voiceVersion}.json`);
const concurrencyValue = Number.parseInt(
  readSingleFlagValue("--concurrency") || process.env.TTS_CONCURRENCY || "",
  10,
);
const concurrency =
  Number.isFinite(concurrencyValue) && concurrencyValue > 0
    ? concurrencyValue
    : 8;
const synthRpmValue = Number.parseInt(
  readSingleFlagValue("--synth-rpm") || process.env.TTS_SYNTH_RPM || "",
  10,
);
const synthRpm =
  Number.isFinite(synthRpmValue) && synthRpmValue > 0 ? synthRpmValue : 840;
const synthIntervalMs = Math.max(1, Math.ceil(60000 / synthRpm));
const logEveryValue = Number.parseInt(
  readSingleFlagValue("--log-every") || process.env.TTS_LOG_EVERY || "",
  10,
);
const logEvery =
  Number.isFinite(logEveryValue) && logEveryValue > 0 ? logEveryValue : 500;
let nextSynthesisAt = Date.now();

const acquireSynthesisSlot = async () => {
  const now = Date.now();
  const scheduledAt = Math.max(now, nextSynthesisAt);
  nextSynthesisAt = scheduledAt + synthIntervalMs;
  const waitMs = scheduledAt - now;
  if (waitMs > 0) {
    await sleep(waitMs);
  }
};

const uploadWithEndpoint = async ({ relativePath, audioBuffer }) => {
  let lastError = null;

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      const response = await fetch(uploadEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          ...(uploadToken ? { Authorization: `Bearer ${uploadToken}` } : {}),
        },
        body: JSON.stringify({
          items: [
            {
              key: relativePath,
              contentType: "audio/mpeg",
              base64: audioBuffer.toString("base64"),
            },
          ],
        }),
      });

      if (response.ok) {
        return;
      }

      const errorText = await response.text();
      const error = new Error(
        `HTTP TTS upload failed (${response.status}): ${errorText || response.statusText}`,
      );
      if (response.status < 500) {
        throw error;
      }
      lastError = error;
    } catch (error) {
      lastError = error;
    }

    await sleep(attempt * 1000);
  }

  throw lastError || new Error("HTTP TTS upload failed.");
};

const catalog =
  (await readJsonFile(TTS_CATALOG_PATH).catch(() => null)) ||
  (await buildCatalog({ voiceId, voiceVersion }));
let targetItems = catalog.items;
const uploadedRelativePaths = new Set(
  hasRemoteUploadTarget
    ? ((await readJsonFile(uploadStatePath).catch(() => [])) || [])
    : [],
);

if (onlyFilters.size > 0) {
  targetItems = targetItems.filter((item) => onlyFilters.has(item.normalized));
}

if (limit) {
  targetItems = targetItems.slice(0, limit);
}

const getOutputPath = (item) => join(outputRoot, item.relativePath);
const pendingItems = targetItems.filter((item) => {
  if (force) return true;
  if (hasRemoteUploadTarget) {
    return !uploadedRelativePaths.has(item.relativePath);
  }
  return !existsSync(getOutputPath(item));
});

console.log(
  `${dryRun ? "Would synthesize" : "Synthesizing"} ${pendingItems.length} pronunciations with ${voiceId}...`,
);
console.log(`Output root: ${outputRoot}`);
console.log(`Manifest path: ${manifestPath}`);
console.log(`Base URL: ${baseUrl}`);
if (bucket) {
  console.log(`R2 bucket: ${bucket}`);
  console.log(`R2 account: ${r2AccountId || "(wrangler default account)"}`);
}
if (uploadEndpoint) {
  console.log(`Upload endpoint: ${uploadEndpoint}`);
}
console.log(`Synthesis RPM target: ${synthRpm}`);
console.log(`Worker concurrency: ${concurrency}`);
console.log(`Progress log interval: ${logEvery}`);

if (dryRun) {
  pendingItems.slice(0, 20).forEach((item) => {
    console.log(`- ${item.normalized} -> ${item.relativePath}`);
  });
  if (pendingItems.length > 20) {
    console.log(`...and ${pendingItems.length - 20} more`);
  }
  process.exit(0);
}

if (pendingItems.length === 0) {
  console.log("No missing TTS pronunciations to synthesize.");
} else {
  let accessToken = await getGoogleAccessToken();
  let completed = 0;
  let cursor = 0;
  const startedAt = Date.now();
  let uploadStateDirty = false;

  const synthesizeWithRefresh = async (item) => {
    try {
      return await synthesizePronunciation({
        accessToken,
        projectId,
        voiceId,
        label: item.label,
        representativeText: item.representativeText,
      });
    } catch (error) {
      const errorMessage = String(error?.message || error);
      if (!/UNAUTHENTICATED|ACCESS_TOKEN_TYPE_UNSUPPORTED/u.test(errorMessage)) {
        throw error;
      }

      accessToken = await getGoogleAccessToken();
      return synthesizePronunciation({
        accessToken,
        projectId,
        voiceId,
        label: item.label,
        representativeText: item.representativeText,
      });
    }
  };

  const syncNextItem = async () => {
    while (true) {
      const item = pendingItems[cursor];
      cursor += 1;
      if (!item) {
        return;
      }

      const outputPath = getOutputPath(item);
      let audioBuffer = null;

      if (force || !existsSync(outputPath)) {
        await acquireSynthesisSlot();
        await ensureFileDir(outputPath);
        audioBuffer = await synthesizeWithRefresh(item);
        await writeFile(outputPath, audioBuffer);
      }

      if (uploadEndpoint) {
        if (!audioBuffer) {
          audioBuffer = await readFile(outputPath);
        }
        await uploadWithEndpoint({
          relativePath: item.relativePath,
          audioBuffer,
        });
      } else if (bucket) {
        await uploadWithWrangler({
          bucket,
          relativePath: item.relativePath,
          localPath: outputPath,
          accountId: r2AccountId,
        });
      }

      if (hasRemoteUploadTarget) {
        uploadedRelativePaths.add(item.relativePath);
        uploadStateDirty = true;
      }

      completed += 1;
      if (completed % logEvery === 0 || completed === pendingItems.length) {
        if (hasRemoteUploadTarget && uploadStateDirty) {
          await writeJsonFile(uploadStatePath, [...uploadedRelativePaths]);
          uploadStateDirty = false;
        }
        const elapsedSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAt) / 1000),
        );
        const rate = (completed / elapsedSeconds).toFixed(2);
        console.log(
          `[${completed}/${pendingItems.length}] synced ${item.normalized} (${rate} items/s)`,
        );
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, pendingItems.length) }, () =>
      syncNextItem(),
    ),
  );

  if (hasRemoteUploadTarget && uploadStateDirty) {
    await writeJsonFile(uploadStatePath, [...uploadedRelativePaths]);
  }
}

const availableItems = catalog.items.filter((item) =>
  hasRemoteUploadTarget
    ? uploadedRelativePaths.has(item.relativePath)
    : existsSync(getOutputPath(item)),
);
const manifest = buildRuntimeManifest(
  {
    ...catalog,
    itemCount: availableItems.length,
    items: availableItems,
  },
  baseUrl,
  availableItems,
);

await writeJsonFile(TTS_CATALOG_PATH, catalog);
await writeJsonFile(manifestPath, manifest);

console.log(`Updated manifest at ${manifestPath}`);
if (uploadEndpoint) {
  console.log(`Uploaded audio objects via ${uploadEndpoint}`);
} else if (bucket) {
  console.log(`Uploaded audio objects to R2 bucket ${bucket}`);
} else {
  console.log(
    `Audio files were written to ${outputRoot}. Set TTS_R2_BUCKET to upload them with Wrangler.`,
  );
}
