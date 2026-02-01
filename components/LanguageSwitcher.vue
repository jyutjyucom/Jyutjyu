<template>
  <div class="flex items-center gap-2">
    <!-- 桌面端 & 非搜索页：完整标签，和筛选栏样式一致 -->
    <span
      class="text-sm text-gray-500 dark:text-gray-400 font-medium"
    >
      {{ t('common.languageSwitcherLabel') }}:
    </span>

    <!-- 自定义下拉按钮，统一成和筛选栏一致的 UI 样式 -->
    <div class="relative">
      <button
        class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
        :class="showDropdown ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
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
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- 下拉菜单 -->
      <div
        v-if="showDropdown"
        class="absolute right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30 min-w-[140px]"
      >
        <button
          v-for="option in locales"
          :key="option.code"
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="currentLocale === option.code ? 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'"
          @click="selectLocale(option.code)"
        >
          {{ localeLabel(option.code) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { locale, locales, t, setLocale } = useI18n()

const currentLocale = computed({
  get: () => locale.value,
  set: async (value: string) => {
    await setLocale(value)
  }
})

const currentLocaleLabel = computed(() => localeLabel(currentLocale.value))

const showDropdown = ref(false)

const toggleDropdown = () => {
  showDropdown.value = !showDropdown.value
}

const selectLocale = async (code: string) => {
  if (code !== currentLocale.value) {
    currentLocale.value = code
  }
  showDropdown.value = false
}

const localeLabel = (code: string) => {
  switch (code) {
    case 'zh-Hans':
      return t('common.langZhHans')
    case 'zh-Hant':
      return t('common.langZhHant')
    case 'yue-Hans':
      return t('common.langYueHans')
    case 'yue-Hant':
      return t('common.langYueHant')
    default:
      return code
  }
}
</script>

