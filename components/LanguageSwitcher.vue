<template>
  <div class="flex items-center gap-2">
    <button
      ref="triggerEl"
      type="button"
      :popovertarget="popoverId"
      class="flex items-center gap-2 px-2 py-1.5 min-h-8 text-sm transition-colors"
      :class="
        isOpen
          ? 'text-kapok'
          : 'text-graphite dark:text-stone-100 hover:text-kapok'
      "
      :aria-label="t('common.languageSwitcherLabel')"
      :aria-expanded="isOpen"
      :aria-controls="popoverId"
      @click="toggle"
    >
      <span>{{ currentLocaleLabel }}</span>
      <svg
        class="w-4 h-4 transition-transform"
        :class="isOpen ? 'rotate-180' : ''"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 9l-7 7-7-7"
        />
      </svg>
    </button>

    <div
      :id="popoverId"
      :ref="setPopoverEl"
      popover="auto"
      class="mwg-popover mwg-popover--align-end"
      :data-popover-open="isOpen ? 'true' : undefined"
      @toggle="handleToggle"
    >
      <div
        class="bg-parchment dark:bg-stone-900 border border-outline-soft/15 dark:border-stone-800 shadow-lg py-1 min-w-[160px]"
      >
        <button
          v-for="option in locales"
          :key="option.code"
          type="button"
          :lang="option.code"
          :aria-current="currentLocale === option.code ? 'true' : undefined"
          class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="
            currentLocale === option.code
              ? 'text-kapok bg-kapok-container dark:bg-kapok/10 font-medium'
              : 'text-graphite dark:text-stone-100'
          "
          @click="selectLocale(option.code)"
        >
          {{ localeLabel(option.code) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, t } = useI18n();
const switchLocalePath = useSwitchLocalePath();

const {
  popoverId,
  triggerEl,
  setPopoverEl,
  isOpen,
  toggle,
  close,
  handleToggle,
} = usePopoverMenu();

const currentLocale = computed(() => locale.value);
const currentLocaleLabel = computed(() => localeLabel(currentLocale.value));

const selectLocale = async (code: typeof currentLocale.value) => {
  close();
  if (code !== currentLocale.value) {
    const nextPath = switchLocalePath(code);
    if (nextPath) {
      await navigateTo(nextPath);
    }
  }
  triggerEl.value?.focus();
};

const localeLabel = (code: string) => {
  const labelKeyByCode: Record<string, string> = {
    en: "common.langEn",
    "yue-Hans": "common.langYueHans",
    "yue-Hant": "common.langYueHant",
    "zh-Hant": "common.langZhHant",
    "zh-Hans": "common.langZhHans",
  };

  const labelKey = labelKeyByCode[code];
  return labelKey ? t(labelKey) : code;
};
</script>
