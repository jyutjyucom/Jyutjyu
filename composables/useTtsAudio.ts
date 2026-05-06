import type { TtsManifestV1 } from "~/types/tts";

let manifestCache: TtsManifestV1 | null | undefined;
let manifestPromise: Promise<TtsManifestV1 | null> | null = null;
let sharedAudio: HTMLAudioElement | null = null;
let playbackStartupTimeout: ReturnType<typeof setTimeout> | null = null;

const PLAYBACK_STARTUP_TIMEOUT_MS = 12000;

const joinBaseUrl = (baseUrl: string, relativePath: string) => {
  const normalizedRelative = relativePath.replace(/^\/+/, "");
  const normalizedBase = baseUrl.trim().replace(/\/+$/, "");

  if (!normalizedBase) {
    return `/${normalizedRelative}`;
  }

  return `${normalizedBase}/${normalizedRelative}`;
};

export const useTtsAudio = () => {
  const config = useRuntimeConfig();
  const ttsEnabled = computed(() => config.public.ttsEnabled !== false);
  const manifestPath = computed(
    () => config.public.ttsManifestPath || "/tts/manifest.v1.json",
  );
  const fallbackBaseUrl = computed(
    () => config.public.ttsBaseUrl || "/tts/audio",
  );

  const loadingKey = useState<string | null>("tts-loading-key", () => null);
  const playingKey = useState<string | null>("tts-playing-key", () => null);
  const activeKey = useState<string | null>("tts-active-key", () => null);
  const unavailableKeys = useState<string[]>("tts-unavailable-keys", () => []);
  const manifestState = useState<TtsManifestV1 | null | undefined>(
    "tts-manifest",
    () => manifestCache,
  );
  const manifestKeys = computed(
    () => new Set(Object.keys(manifestState.value?.items || {})),
  );

  const unavailableKeySet = computed(() => new Set(unavailableKeys.value));

  const markUnavailable = (normalized: string) => {
    if (!normalized || unavailableKeySet.value.has(normalized)) return;
    unavailableKeys.value = [...unavailableKeys.value, normalized];
  };

  const clearPlaybackStartupTimeout = () => {
    if (!playbackStartupTimeout) return;
    clearTimeout(playbackStartupTimeout);
    playbackStartupTimeout = null;
  };

  const clearLoadingForKey = (normalized: string | null) => {
    if (!normalized) return;
    if (loadingKey.value === normalized) loadingKey.value = null;
  };

  const setPlayingForKey = (normalized: string | null) => {
    if (!normalized) return;
    clearPlaybackStartupTimeout();
    clearLoadingForKey(normalized);
    playingKey.value = normalized;
    activeKey.value = normalized;
  };

  const startPlaybackStartupTimeout = (normalized: string) => {
    clearPlaybackStartupTimeout();
    playbackStartupTimeout = setTimeout(() => {
      playbackStartupTimeout = null;
      clearLoadingForKey(normalized);
    }, PLAYBACK_STARTUP_TIMEOUT_MS);
  };

  const clearStateForKey = (normalized: string | null) => {
    if (!normalized) return;
    clearPlaybackStartupTimeout();
    if (activeKey.value === normalized) activeKey.value = null;
    if (playingKey.value === normalized) playingKey.value = null;
    if (loadingKey.value === normalized) loadingKey.value = null;
  };

  const ensureAudio = () => {
    if (!process.client) return null;
    if (sharedAudio) return sharedAudio;

    sharedAudio = new Audio();
    sharedAudio.preload = "none";

    sharedAudio.addEventListener("canplay", () => {
      clearLoadingForKey(activeKey.value);
    });
    sharedAudio.addEventListener("playing", () => {
      setPlayingForKey(activeKey.value);
    });
    sharedAudio.addEventListener("ended", () => {
      clearStateForKey(activeKey.value);
    });
    sharedAudio.addEventListener("pause", () => {
      if (!sharedAudio?.ended) {
        clearStateForKey(activeKey.value);
      }
    });
    sharedAudio.addEventListener("error", () => {
      const failedKey = activeKey.value;
      clearStateForKey(failedKey);
      if (failedKey) {
        markUnavailable(failedKey);
      }
    });

    return sharedAudio;
  };

  const loadManifest = async () => {
    if (!process.client || !ttsEnabled.value) return null;
    if (manifestState.value !== undefined) {
      manifestCache = manifestState.value;
      return manifestState.value;
    }
    if (manifestCache !== undefined) {
      manifestState.value = manifestCache;
      return manifestCache;
    }

    if (!manifestPromise) {
      manifestPromise = $fetch<TtsManifestV1>(manifestPath.value)
        .then((manifest) => {
          manifestCache = manifest;
          manifestState.value = manifest;
          return manifest;
        })
        .catch(() => {
          manifestCache = null;
          manifestState.value = null;
          return null;
        })
        .finally(() => {
          manifestPromise = null;
        });
    }

    return manifestPromise;
  };

  const resolveAudioUrl = (manifest: TtsManifestV1, relativePath: string) => {
    if (/^https?:\/\//i.test(relativePath)) {
      return relativePath;
    }

    const baseUrl = manifest.baseUrl || fallbackBaseUrl.value;
    return joinBaseUrl(baseUrl, relativePath);
  };

  const isUnavailable = (normalized: string) => {
    return unavailableKeySet.value.has(normalized);
  };

  const canRenderButton = (normalized: string, ttsEligible: boolean) => {
    if (
      process.client &&
      ttsEnabled.value &&
      manifestState.value === undefined &&
      !manifestPromise
    ) {
      void loadManifest();
    }

    return (
      ttsEnabled.value &&
      ttsEligible &&
      manifestState.value !== undefined &&
      manifestKeys.value.has(normalized) &&
      !isUnavailable(normalized)
    );
  };

  const stop = () => {
    const audio = ensureAudio();
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    clearStateForKey(activeKey.value);
  };

  const playPronunciation = async (
    normalized: string,
    ttsEligible: boolean,
  ) => {
    if (!process.client || !normalized || !ttsEligible || !ttsEnabled.value) {
      return false;
    }

    if (isUnavailable(normalized)) {
      return false;
    }

    const audio = ensureAudio();
    if (!audio) return false;

    if (playingKey.value === normalized) {
      stop();
      return true;
    }

    loadingKey.value = normalized;
    playingKey.value = null;
    activeKey.value = normalized;

    const manifest = await loadManifest();
    if (!manifest) {
      markUnavailable(normalized);
      clearStateForKey(normalized);
      return false;
    }

    const relativePath = manifest.items?.[normalized];
    if (!relativePath) {
      markUnavailable(normalized);
      clearStateForKey(normalized);
      return false;
    }

    try {
      audio.pause();
      audio.src = resolveAudioUrl(manifest, relativePath);
      audio.currentTime = 0;
      startPlaybackStartupTimeout(normalized);
      await audio.play();
      setPlayingForKey(normalized);
      return true;
    } catch {
      markUnavailable(normalized);
      clearStateForKey(normalized);
      return false;
    }
  };

  return {
    ttsEnabled,
    loadingKey: readonly(loadingKey),
    playingKey: readonly(playingKey),
    isUnavailable,
    loadManifest,
    canRenderButton,
    playPronunciation,
    stop,
  };
};
