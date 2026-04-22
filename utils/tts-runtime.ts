interface TtsRuntimeOptions {
  env?: Record<string, string | undefined>;
  isDev?: boolean;
  hasLocalManifest?: boolean;
  hasProductionManifest?: boolean;
}

export const resolveTtsPublicRuntimeConfig = ({
  env = {},
  isDev = false,
  hasLocalManifest = false,
  hasProductionManifest = false,
}: TtsRuntimeOptions = {}) => {
  const explicitEnabled = env.NUXT_PUBLIC_TTS_ENABLED;
  const autoUseProductionManifest = hasProductionManifest;
  const autoUseLocalManifest =
    isDev && hasLocalManifest && !hasProductionManifest;

  return {
    ttsEnabled:
      explicitEnabled === "true" ||
      (explicitEnabled === undefined &&
        (autoUseLocalManifest || autoUseProductionManifest)),
    ttsBaseUrl: env.NUXT_PUBLIC_TTS_BASE_URL || "/tts/audio",
    ttsManifestPath:
      env.NUXT_PUBLIC_TTS_MANIFEST_PATH ||
      (autoUseLocalManifest
        ? "/tts/manifest.local.json"
        : "/tts/manifest.v1.json"),
    ttsVoiceVersion: env.NUXT_PUBLIC_TTS_VOICE_VERSION || "v1",
  };
};
