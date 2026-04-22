<template>
  <div>
    <!-- Desktop: pill tabs -->
    <div
      class="hidden sm:block sticky z-[8] bg-parchment/95 dark:bg-stone-950/95 backdrop-blur supports-[backdrop-filter]:bg-parchment/90 supports-[backdrop-filter]:dark:bg-stone-950/90 -mx-6 md:-mx-8 px-6 md:px-8"
      :style="stickyStyle"
    >
      <div
        class="overflow-x-auto py-2"
        role="tablist"
        :aria-label="resolvedAriaLabel"
      >
        <div
          class="inline-flex flex-nowrap items-center gap-1 min-w-max bg-surface-low dark:bg-stone-900 p-1"
        >
          <div v-for="(tab, index) in tabs" :key="tab.id" class="inline-flex">
            <button
              type="button"
              role="tab"
              class="inline-flex items-center px-4 py-1.5 text-base transition-all whitespace-nowrap"
              :class="
                tab.id === modelValue
                  ? 'bg-kapok text-white font-bold shadow-lg shadow-kapok/20'
                  : 'text-graphite dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 font-medium'
              "
              :aria-selected="tab.id === modelValue"
              @click="$emit('update:modelValue', tab.id)"
              @keydown="onTabKeydown($event, index)"
            >
              <span class="font-semibold">{{ tab.label }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Mobile: accordion -->
    <div class="sm:hidden">
      <div
        class="flex items-center gap-2 px-3 py-2 bg-surface-low dark:bg-stone-900 text-ink dark:text-stone-100"
      >
        <button
          :aria-label="t('common.selectPronunciationAria')"
          :aria-expanded="accordionOpen"
          class="flex-1 text-left text-sm font-medium flex items-center justify-between"
          @click="accordionOpen = !accordionOpen"
        >
          <span class="font-semibold text-kapok">{{ activeLabel }}</span>
          <svg
            class="w-5 h-5 text-graphite dark:text-stone-200 transition-transform"
            :class="accordionOpen ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      </div>
      <div
        v-show="accordionOpen"
        class="bg-surface-low dark:bg-stone-900 border-t border-outline-soft/20 dark:border-stone-800"
      >
        <div
          v-for="tab in tabs"
          :key="`mobile:${tab.id}`"
          class="w-full text-sm transition-colors"
          :class="
            tab.id === modelValue
              ? 'text-kapok font-semibold bg-kapok/5'
              : 'text-graphite dark:text-stone-400 hover:bg-surface-high dark:hover:bg-stone-800'
          "
        >
          <div
            role="button"
            tabindex="0"
            class="w-full px-3 py-2 text-left flex items-center gap-1.5"
            @click="selectTab(tab.id)"
            @keydown.enter.prevent="selectTab(tab.id)"
            @keydown.space.prevent="selectTab(tab.id)"
          >
            <span class="min-w-0 inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <span class="font-semibold">{{ tab.label }}</span>
              <TtsSpeakerButton
                v-if="tab.pronunciation"
                :label="tab.pronunciation.label"
                :normalized="tab.pronunciation.normalized"
                :tts-eligible="tab.pronunciation.ttsEligible"
                button-class="inline-flex items-center justify-center rounded-full p-1 text-graphite dark:text-stone-200 transition-colors hover:text-kapok"
                icon-class="w-3.5 h-3.5"
              />
              <span
                class="text-xs font-normal text-graphite/60 dark:text-stone-400"
              >
                {{ t("dictCard.collectedBy", { count: tab.dictionaryCount }) }}
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PronunciationDisplayItem } from "~/types/tts";

interface PronunciationTab {
  id: string;
  label: string;
  dictionaryCount: number;
  pronunciation?: PronunciationDisplayItem | null;
}

interface Props {
  modelValue: string;
  tabs: PronunciationTab[];
  stickyOffset?: number;
  ariaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  stickyOffset: 0,
  ariaLabel: "",
});

const { t } = useI18n();

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const accordionOpen = ref(true);

const activeTab = computed(
  () => props.tabs.find((tab) => tab.id === props.modelValue) || props.tabs[0],
);
const activeLabel = computed(() => activeTab.value?.label || "");
const resolvedAriaLabel = computed(
  () => props.ariaLabel || t("common.pronunciationTabsAria"),
);

const selectTab = (tabId: string) => {
  emit("update:modelValue", tabId);
};

const stickyStyle = computed(() => ({
  top: `${Math.max(0, props.stickyOffset)}px`,
}));

const onTabKeydown = (event: KeyboardEvent, currentIndex: number) => {
  if (props.tabs.length <= 1) return;

  if (
    event.key !== "ArrowRight" &&
    event.key !== "ArrowLeft" &&
    event.key !== "Home" &&
    event.key !== "End"
  ) {
    return;
  }

  event.preventDefault();

  let nextIndex = currentIndex;
  if (event.key === "ArrowRight") {
    nextIndex = (currentIndex + 1) % props.tabs.length;
  } else if (event.key === "ArrowLeft") {
    nextIndex = (currentIndex - 1 + props.tabs.length) % props.tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = props.tabs.length - 1;
  }

  const nextTab = props.tabs[nextIndex];
  if (nextTab) {
    emit("update:modelValue", nextTab.id);
  }
};
</script>
