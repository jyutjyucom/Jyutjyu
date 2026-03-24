<template>
  <div class="flex items-center gap-2">
    <!-- 自定义下拉按钮，统一成和筛选栏一致的 UI 样式 -->
    <div class="relative">
      <button
        class="flex items-center gap-2 px-1 py-1 text-sm transition-colors focus:outline-none"
        :class="
          showDropdown
            ? 'text-kapok'
            : 'text-graphite dark:text-stone-100 hover:text-kapok'
        "
        @click="toggleDropdown"
      >
        <span>{{ currentLocaleLabel }}</span>
        <svg
          class="w-4 h-4"
          :class="showDropdown ? 'rotate-180' : ''"
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

      <!-- 下拉菜单 -->
      <div
        v-if="showDropdown"
        class="absolute right-0 mt-1 bg-parchment dark:bg-stone-900 border border-outline-soft/10 dark:border-stone-800 shadow-lg py-1 z-30 min-w-[140px]"
      >
        <button
          v-for="option in locales"
          :key="option.code"
          class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="
            currentLocale === option.code
              ? 'text-kapok bg-kapok-container dark:bg-kapok/10'
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

const currentLocale = computed(() => locale.value);

const currentLocaleLabel = computed(() => localeLabel(currentLocale.value));

const showDropdown = ref(false);

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value;
};

const selectLocale = async (code: string) => {
  if (code !== currentLocale.value) {
    const nextPath = switchLocalePath(code);
    if (nextPath) {
      await navigateTo(nextPath);
    }
  }
  showDropdown.value = false;
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
