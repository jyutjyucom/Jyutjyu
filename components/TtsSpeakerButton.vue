<template>
  <button
    v-if="showButton"
    type="button"
    :class="resolvedButtonClass"
    :aria-label="ariaLabel"
    :title="ariaLabel"
    :aria-busy="isLoading ? 'true' : undefined"
    data-no-row-navigation
    @pointerdown.stop
    @mousedown.stop
    @touchstart.stop
    @click.stop.prevent="handleClick"
  >
    <LoaderCircle
      v-if="isLoading"
      :class="resolvedIconClass"
      class="animate-spin"
      aria-hidden="true"
    />
    <Volume2
      v-else
      :class="[resolvedIconClass, isPlaying && 'text-kapok']"
      aria-hidden="true"
    />
    <span class="sr-only">{{ ariaLabel }}</span>
  </button>
</template>

<script setup lang="ts">
import { LoaderCircle, Volume2 } from "lucide-vue-next";

interface Props {
  label: string;
  normalized: string;
  ttsEligible?: boolean;
  buttonClass?: string;
  iconClass?: string;
}

const props = withDefaults(defineProps<Props>(), {
  ttsEligible: false,
  buttonClass:
    "inline-flex items-center justify-center rounded-full p-1.5 text-graphite dark:text-stone-200 transition-colors hover:text-kapok disabled:cursor-not-allowed",
  iconClass: "w-4 h-4",
});

const { t } = useI18n();
const { canRenderButton, loadingKey, playingKey, playPronunciation } =
  useTtsAudio();

const resolvedButtonClass = computed(() => props.buttonClass);
const resolvedIconClass = computed(() => props.iconClass);

const isLoading = computed(() => loadingKey.value === props.normalized);
const isPlaying = computed(() => playingKey.value === props.normalized);
const showButton = computed(() =>
  canRenderButton(props.normalized, props.ttsEligible),
);
const ariaLabel = computed(() =>
  isPlaying.value
    ? t("common.stopPronunciationAudio", { pronunciation: props.label })
    : t("common.playPronunciationAudio", { pronunciation: props.label }),
);

const handleClick = async () => {
  await playPronunciation(props.normalized, props.ttsEligible);
};
</script>
