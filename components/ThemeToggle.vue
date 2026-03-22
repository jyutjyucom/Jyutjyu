<template>
  <button
    type="button"
    class="inline-flex items-center justify-center w-9 h-9 transition-colors focus:outline-none"
    :class="buttonClass"
    :title="title"
    @click="cycleTheme"
  >
    <!-- 亮色模式图标 -->
    <Sun
      v-if="theme === 'light'"
      class="w-4 h-4 text-graphite"
    />
    <!-- 暗色模式图标 -->
    <Moon
      v-else-if="theme === 'dark'"
      class="w-4 h-4 text-stone-400"
    />
    <!-- 系统模式图标 -->
    <Monitor
      v-else
      class="w-4 h-4 text-graphite dark:text-stone-400"
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
    return 'text-graphite hover:text-kapok'
  } else if (theme.value === 'dark') {
    return 'text-stone-400 hover:text-kapok'
  } else {
    return isDark.value
      ? 'text-stone-400 hover:text-kapok'
      : 'text-graphite hover:text-kapok'
  }
})
</script>
