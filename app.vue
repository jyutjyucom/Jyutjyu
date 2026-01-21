<template>
  <div>
    <NuxtPage />
  </div>
</template>

<script setup lang="ts">
const { locale } = useI18n()

// 全局配置
useHead({
  htmlAttrs: computed(() => ({
    lang: locale.value || 'zh-Hans',
    style: 'color-scheme: light;'
  }))
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
  /* 强制浅色模式，不跟随系统暗夜模式 */
  color-scheme: light only;
  background-color: #ffffff;
}

body {
  font-family: 'Chiron Hei HK', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color-scheme: light only;
  background-color: #ffffff;
  color: #000000;
}
</style>

