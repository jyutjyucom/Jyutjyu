import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

import { MongoClient } from "mongodb";

import {
  getTtsPhonemeJyutping,
  normalizeTtsJyutping,
} from "../utils/pronunciation-display.ts";
import {
  TTS_SKIPPED_SOURCE_BOOKS,
  isTtsSupportedDictionaryId,
  isTtsSupportedSourceBook,
} from "../utils/tts-policy.ts";

const execFile = promisify(execFileCallback);

export const ROOT_DIR = resolve(process.cwd());
export const DICTIONARY_ROOT = resolve(ROOT_DIR, "public", "dictionaries");
export const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, "index.json");
export const TTS_DATA_DIR = resolve(ROOT_DIR, "data", "tts");
export const TTS_CATALOG_PATH = resolve(TTS_DATA_DIR, "catalog.v1.json");
export const TTS_MANIFEST_PATH = resolve(
  ROOT_DIR,
  "public",
  "tts",
  "manifest.v1.json",
);
export const TTS_CACHE_ROOT = resolve(ROOT_DIR, ".tts-cache");

export const DEFAULT_TTS_VOICE_ID = "yue-HK-Standard-A";
export const DEFAULT_TTS_VOICE_VERSION = "v1";

export const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, "utf8");
  return JSON.parse(raw);
};

export const writeJsonFile = async (filePath, payload) => {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
};

const loadDotEnv = () => {
  const envPath = join(ROOT_DIR, ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  raw.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    const normalizedKey = key?.trim();
    if (!normalizedKey || normalizedKey.startsWith("#")) return;
    if (process.env[normalizedKey]) return;
    process.env[normalizedKey] = valueParts
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");
  });
};

const readDictionaryEntriesFile = async (filePath) => {
  const parsed = await readJsonFile(filePath);
  return Array.isArray(parsed) ? parsed : [];
};

const loadDictionaryFiles = async () => {
  const parsed = await readJsonFile(DICTIONARY_INDEX_PATH);
  const files = [];

  for (const dict of parsed?.dictionaries || []) {
    if (!isTtsSupportedDictionaryId(dict?.id)) {
      continue;
    }

    if (dict?.chunked && dict?.chunk_dir) {
      const manifest = await readJsonFile(
        resolve(DICTIONARY_ROOT, dict.chunk_dir, "manifest.json"),
      );

      for (const chunk of Object.values(manifest?.chunks || {})) {
        if (chunk?.file) {
          files.push(resolve(DICTIONARY_ROOT, dict.chunk_dir, chunk.file));
        }
      }

      continue;
    }

    if (dict?.file) {
      files.push(resolve(DICTIONARY_ROOT, dict.file));
    }
  }

  return files;
};

export const loadEntriesFromPublic = async () => {
  const files = await loadDictionaryFiles();
  const entries = [];

  for (const filePath of files) {
    const fileEntries = await readDictionaryEntriesFile(filePath);
    entries.push(
      ...fileEntries.filter((entry) =>
        isTtsSupportedSourceBook(entry.source_book),
      ),
    );
  }

  return entries;
};

export const loadEntriesFromMongo = async () => {
  loadDotEnv();

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) return null;

  const dbName = process.env.MONGODB_DB_NAME || "jyutjyu";
  const client = new MongoClient(mongoUri);

  try {
    await client.connect();
    const collection = client.db(dbName).collection("entries");
    return await collection
      .find(
        {
          source_book: { $nin: [...TTS_SKIPPED_SOURCE_BOOKS] },
        },
        {
          projection: {
            id: 1,
            source_book: 1,
            headword: 1,
            phonetic: 1,
          },
        },
      )
      .toArray();
  } finally {
    await client.close();
  }
};

export const loadTtsSourceEntries = async () => {
  const mongoEntries = await loadEntriesFromMongo();
  if (mongoEntries && mongoEntries.length > 0) {
    return {
      source: "mongo",
      entries: mongoEntries.filter((entry) =>
        isTtsSupportedSourceBook(entry.source_book),
      ),
    };
  }

  return {
    source: "public",
    entries: await loadEntriesFromPublic(),
  };
};

const xmlEscape = (value) =>
  String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

export const buildSsml = (jyutping, text) => {
  const phonemeJyutping = getTtsPhonemeJyutping(jyutping);
  return `<speak><phoneme alphabet="jyutping" ph="${xmlEscape(
    phonemeJyutping,
  )}">${xmlEscape(text || jyutping)}</phoneme></speak>`;
};

export const buildPronunciationHash = (normalized) => {
  return createHash("sha1").update(normalized).digest("hex");
};

export const buildRelativeAudioPath = (
  normalized,
  voiceVersion = DEFAULT_TTS_VOICE_VERSION,
) => {
  const hash = buildPronunciationHash(normalized);
  return `${voiceVersion}/${hash.slice(0, 2)}/${hash}.mp3`;
};

export const buildCatalog = async ({
  voiceId = DEFAULT_TTS_VOICE_ID,
  voiceVersion = DEFAULT_TTS_VOICE_VERSION,
} = {}) => {
  const { source, entries } = await loadTtsSourceEntries();
  const records = new Map();

  entries.forEach((entry) => {
    const representativeText =
      entry?.headword?.display?.trim() ||
      entry?.headword?.normalized?.trim() ||
      "";

    for (const rawValue of entry?.phonetic?.jyutping || []) {
      const label = String(rawValue || "")
        .replace(/\s+/g, " ")
        .trim();
      const normalized = normalizeTtsJyutping(label);
      if (!label || !normalized) continue;

      const existing = records.get(normalized);
      if (existing) continue;

      records.set(normalized, {
        label,
        normalized,
        representativeText: representativeText || label,
        ssml: buildSsml(label, representativeText || label),
        relativePath: buildRelativeAudioPath(normalized, voiceVersion),
      });
    }
  });

  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    voiceId,
    voiceVersion,
    source,
    itemCount: records.size,
    items: Array.from(records.values()),
  };
};

export const buildRuntimeManifest = (
  catalog,
  baseUrl,
  items = catalog.items,
) => {
  return {
    version: 1,
    voiceId: catalog.voiceId,
    voiceVersion: catalog.voiceVersion,
    baseUrl,
    items: Object.fromEntries(
      items.map((item) => [item.normalized, item.relativePath]),
    ),
  };
};

const getExecToken = async (command, args) => {
  const { stdout } = await execFile(command, args, {
    cwd: ROOT_DIR,
    env: process.env,
  });
  return stdout.trim();
};

const runWrangler = async (args, options = {}) => {
  const execOptions = {
    cwd: ROOT_DIR,
    env: process.env,
    maxBuffer: 1024 * 1024 * 20,
    ...options,
  };

  try {
    return await execFile("wrangler", args, execOptions);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    return execFile("npx", ["wrangler", ...args], execOptions);
  }
};

const withTemporaryWranglerConfig = async (accountId, fn) => {
  if (!accountId) {
    return fn([], process.env);
  }

  const tempDir = await mkdtemp(join(tmpdir(), "jyutjyu-tts-r2-"));
  const tempConfigPath = join(tempDir, "wrangler.jsonc");

  await writeFile(
    tempConfigPath,
    `${JSON.stringify(
      {
        name: "jyutjyu-tts-r2-upload",
        account_id: accountId,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  try {
    return await fn(
      ["--config", tempConfigPath],
      {
        ...process.env,
        CLOUDFLARE_ACCOUNT_ID: accountId,
      },
    );
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};

export const getGoogleAccessToken = async () => {
  if (process.env.GOOGLE_ACCESS_TOKEN) {
    return process.env.GOOGLE_ACCESS_TOKEN;
  }

  try {
    return await getExecToken("gcloud", [
      "auth",
      "application-default",
      "print-access-token",
    ]);
  } catch {
    return getExecToken("gcloud", ["auth", "print-access-token"]);
  }
};

export const synthesizePronunciation = async ({
  accessToken,
  projectId,
  voiceId = DEFAULT_TTS_VOICE_ID,
  label,
  representativeText,
}) => {
  const response = await fetch(
    "https://texttospeech.googleapis.com/v1/text:synthesize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...(projectId ? { "x-goog-user-project": projectId } : {}),
        "Content-Type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        input: {
          ssml: buildSsml(label, representativeText || label),
        },
        voice: {
          languageCode: "yue-HK",
          name: voiceId,
        },
        audioConfig: {
          audioEncoding: "MP3",
        },
      }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Google TTS request failed (${response.status}): ${errorText}`,
    );
  }

  const payload = await response.json();
  if (!payload?.audioContent) {
    throw new Error("Google TTS response did not include audioContent.");
  }

  return Buffer.from(payload.audioContent, "base64");
};

export const uploadWithWrangler = async ({
  bucket,
  relativePath,
  localPath,
  accountId = "",
}) => {
  await withTemporaryWranglerConfig(accountId, (configArgs, env) =>
    runWrangler([
      ...configArgs,
      "r2",
      "object",
      "put",
      `${bucket}/${relativePath}`,
      "--remote",
      "--file",
      localPath,
    ], { env }),
  );
};

export const ensureFileDir = async (filePath) => {
  await mkdir(dirname(filePath), { recursive: true });
};
