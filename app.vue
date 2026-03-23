<template>
  <div class="min-h-screen bg-parchment dark:bg-stone-950 transition-colors duration-200">
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-kapok focus:text-white focus:text-sm">
      Skip to content
    </a>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const { initTheme } = useTheme()

// 全局配置
useHead({
  htmlAttrs: {
    lang: computed(() => locale.value || 'yue-Hant')
  },
  meta: [
    { name: 'theme-color', content: '#ffffff' }
  ]
})

// 初始化主题
onMounted(() => {
  initTheme()
})
</script>

<style>
/* 全局样式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  color-scheme: light dark;
}

html.dark {
  color-scheme: dark;
}

body {
  font-family: system-ui, -apple-system, 'Segoe UI', 'PingFang SC', 'PingFang TC', 'Microsoft YaHei', 'Noto Sans SC', 'Noto Sans TC', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

/* 平滑过渡 */
.transition-theme {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
