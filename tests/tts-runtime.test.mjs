import assert from "node:assert/strict";
import test from "node:test";

import { resolveTtsPublicRuntimeConfig } from "../utils/tts-runtime.ts";

test("local dev auto-enables TTS when a smoke manifest exists", () => {
  const resolved = resolveTtsPublicRuntimeConfig({
    env: {},
    isDev: true,
    hasLocalManifest: true,
    hasProductionManifest: false,
  });

  assert.equal(resolved.ttsEnabled, true);
  assert.equal(resolved.ttsManifestPath, "/tts/manifest.local.json");
  assert.equal(resolved.ttsBaseUrl, "/tts/audio");
  assert.equal(resolved.ttsVoiceVersion, "v1");
});

test("local dev prefers the shipped manifest when both manifests exist", () => {
  const resolved = resolveTtsPublicRuntimeConfig({
    env: {},
    isDev: true,
    hasLocalManifest: true,
    hasProductionManifest: true,
  });

  assert.equal(resolved.ttsEnabled, true);
  assert.equal(resolved.ttsManifestPath, "/tts/manifest.v1.json");
});

test("explicit TTS env keeps local dev defaults from overriding production paths", () => {
  const resolved = resolveTtsPublicRuntimeConfig({
    env: {
      NUXT_PUBLIC_TTS_ENABLED: "false",
      NUXT_PUBLIC_TTS_MANIFEST_PATH: "/tts/manifest.v9.json",
      NUXT_PUBLIC_TTS_BASE_URL: "https://cdn.example.com/tts",
      NUXT_PUBLIC_TTS_VOICE_VERSION: "v9",
    },
    isDev: true,
    hasLocalManifest: true,
    hasProductionManifest: true,
  });

  assert.equal(resolved.ttsEnabled, false);
  assert.equal(resolved.ttsManifestPath, "/tts/manifest.v9.json");
  assert.equal(resolved.ttsBaseUrl, "https://cdn.example.com/tts");
  assert.equal(resolved.ttsVoiceVersion, "v9");
});

test("production without explicit enable stays on the shipped manifest", () => {
  const resolved = resolveTtsPublicRuntimeConfig({
    env: {},
    isDev: false,
    hasLocalManifest: true,
    hasProductionManifest: false,
  });

  assert.equal(resolved.ttsEnabled, false);
  assert.equal(resolved.ttsManifestPath, "/tts/manifest.v1.json");
});

test("production auto-enables TTS when the shipped manifest has entries", () => {
  const resolved = resolveTtsPublicRuntimeConfig({
    env: {},
    isDev: false,
    hasProductionManifest: true,
  });

  assert.equal(resolved.ttsEnabled, true);
  assert.equal(resolved.ttsManifestPath, "/tts/manifest.v1.json");
});
