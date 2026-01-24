<template>
  <footer :class="footerClass">
    <div class="container mx-auto px-4">
      <div class="text-center text-gray-600 text-base">
        <p class="mb-2">
          {{ t('common.footerCopyright') }}
          <a href="https://github.com/jyutjyucom/jyutjyu" class="text-blue-600 hover:underline" target="_blank"
            rel="noopener noreferrer">
            {{ t('common.github') }}
          </a>
          <template v-if="showAboutLink">
            ·
            <NuxtLink to="/about" class="text-blue-600 hover:underline">
              {{ t('common.aboutProject') }}
            </NuxtLink>
          </template>
        </p>
        <p class="mb-2">
          友情連結：
          <a href="https://jyutping.org/jyutping/" class="text-blue-600 hover:underline" target="_blank"
            rel="noopener noreferrer">
            粵拼方案
          </a>
          ·
          <a href="https://jyut.net/" class="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
            粵音資料集叢
          </a>
        </p>
        <p v-if="showMission">{{ t('common.footerMission') }}</p>
        <p v-if="showLicense" class="text-sm text-gray-500">
          收录内容遵循不同授权协议 ·
          <NuxtLink to="/about#license" class="text-blue-600 hover:underline">
            {{ t('common.licenseDetails') }}
          </NuxtLink>
        </p>
      </div>
    </div>
  </footer>
</template>

<script setup lang="ts">
const { t } = useI18n()

interface Props {
  variant?: 'home' | 'search'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'home'
})

const footerClass = computed(() => {
  return props.variant === 'search'
    ? 'border-t border-gray-200 py-4 bg-white'
    : 'border-t border-gray-200 py-6'
})

const showAboutLink = computed(() => props.variant === 'search')
const showMission = computed(() => props.variant === 'home')
const showLicense = computed(() => props.variant === 'search')
</script>
