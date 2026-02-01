<template>
  <button
    type="button"
    class="inline-flex items-center justify-center w-9 h-9 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
    :class="buttonClass"
    :title="title"
    @click="cycleTheme"
  >
    <!-- 亮色模式图标 -->
    <Sun
      v-if="theme === 'light'"
      class="w-4 h-4 text-amber-500"
    />
    <!-- 暗色模式图标 -->
    <Moon
      v-else-if="theme === 'dark'"
      class="w-4 h-4 text-blue-400"
    />
    <!-- 系统模式图标 -->
    <Monitor
      v-else
      class="w-4 h-4 text-gray-500 dark:text-gray-400"
    />
    <span class="sr-only">{{ title }}</span>
  </button>
</template>

<script setup lang="ts">
import { Sun, Moon, Monitor } from 'lucide-vue-next'

const { t } = useI18n()
const { theme, isDark, cycleTheme } = useTheme()

const title = computed(() => {
  switch (theme.value) {
    case 'light':
      return t('common.themeLight')
    case 'dark':
      return t('common.themeDark')
    case 'system':
      return t('common.themeSystem')
    default:
      return t('common.themeToggle')
  }
})

const buttonClass = computed(() => {
  if (theme.value === 'light') {
    return 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
  } else if (theme.value === 'dark') {
    return 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
  } else {
    // system
    return isDark.value
      ? 'bg-gray-800 border-gray-600 text-gray-200 hover:bg-gray-700'
      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
  }
})
</script>
