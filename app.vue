<template>
  <div class="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { locale } = useI18n()
const { initTheme } = useTheme()

// 全局配置
useHead({
  htmlAttrs: computed(() => ({
    lang: locale.value || 'zh-Hans'
  })),
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
@font-face {
  font-family: 'R';
  src: url('/R.woff2') format('woff2');
  font-display: swap;
}

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
  font-family: 'Chiron Hei HK', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.font-r {
  font-family: 'R', 'Chiron Hei HK', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
}

/* 平滑过渡 */
.transition-theme {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 200ms;
}
</style>
