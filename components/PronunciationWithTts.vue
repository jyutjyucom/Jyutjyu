<template>
  <div :class="wrapperClass">
    <span :class="labelClass">{{ item.label }}</span>
    <TtsSpeakerButton
      :label="item.label"
      :normalized="item.normalized"
      :tts-eligible="item.ttsEligible"
      :button-class="buttonClass"
      :icon-class="iconClass"
    />
    <span v-if="original" :class="originalClass">
      <span :class="originalPrefixClass">{{
        t("dictCard.originalPhonetic")
      }}</span
      >{{ original }}
    </span>
  </div>
</template>

<script setup lang="ts">
import type { PronunciationDisplayItem } from "~/types/tts";

interface Props {
  item: PronunciationDisplayItem;
  original?: string | null;
  wrapperClass?: string;
  labelClass?: string;
  buttonClass?: string;
  iconClass?: string;
  originalClass?: string;
  originalPrefixClass?: string;
}

withDefaults(defineProps<Props>(), {
  original: null,
  wrapperClass: "flex items-center gap-1.5 flex-wrap",
  labelClass: "text-kapok font-semibold break-words",
  buttonClass:
    "inline-flex items-center justify-center rounded-full p-1.5 text-graphite dark:text-stone-200 transition-colors hover:text-kapok",
  iconClass: "w-4 h-4",
  originalClass: "text-xs text-graphite/60 dark:text-stone-300 break-words",
  originalPrefixClass: "text-graphite/40 dark:text-stone-400",
});

const { t } = useI18n();
</script>
