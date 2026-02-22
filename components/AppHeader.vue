<template>
  <header ref="headerEl" class="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
    <div class="container mx-auto px-4 py-4">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-4 flex-1 min-w-0">
          <NuxtLink to="/" class="text-xl font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
            {{ t('common.siteName') }}
          </NuxtLink>

          <div class="flex flex-nowrap items-center gap-2 flex-1 min-w-0">
            <div class="flex-1 min-w-0 max-w-2xl relative">
              <input
                :value="searchQuery"
                type="text"
                :placeholder="t('common.searchPlaceholder')"
                class="w-full px-4 py-2 pr-20 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:outline-none focus:border-blue-500"
                @input="handleQueryInput"
                @keyup.enter="handleSearch"
              >
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors text-sm"
                @click="handleSearch"
              >
                {{ t('common.searchButton') }}
              </button>

              <slot name="search-popover" />
            </div>

            <button
              v-if="showMobileOptionsButton"
              type="button"
              class="lg:hidden flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors shrink-0"
              :aria-label="optionsExpanded ? t('common.optionsCollapse') : t('common.optionsExpand')"
              :aria-expanded="optionsExpanded"
              @click="toggleOptionsExpanded"
            >
              <svg class="w-4 h-4 transition-transform" :class="optionsExpanded ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>

          <div v-if="showReverseToggle" class="hidden lg:flex">
            <SearchReverseCheckbox
              :model-value="reverseSearch"
              @update:model-value="handleReverseSearchUpdate"
            />
          </div>
        </div>

        <div class="hidden lg:flex items-center gap-3 flex-shrink-0">
          <slot name="desktop-controls">
            <ThemeToggle />
            <LanguageSwitcher />
          </slot>
        </div>
      </div>

      <div v-show="optionsExpanded" class="lg:hidden border-t border-gray-100 dark:border-gray-700 pt-3 mt-1 space-y-4">
        <div class="flex flex-wrap items-center gap-3">
          <SearchReverseCheckbox
            v-if="showReverseToggle"
            :model-value="reverseSearch"
            @update:model-value="handleReverseSearchUpdate"
          />
          <slot name="mobile-controls">
            <ThemeToggle />
            <LanguageSwitcher />
          </slot>
        </div>

        <slot name="mobile-extra" />
      </div>
    </div>

    <slot name="after" />
  </header>
</template>

<script setup lang="ts">
interface Props {
  searchQuery: string
  reverseSearch: boolean
  optionsExpanded: boolean
  showReverseToggle?: boolean
  showMobileOptionsButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showReverseToggle: true,
  showMobileOptionsButton: true
})

const emit = defineEmits<{
  'update:searchQuery': [value: string]
  'update:reverseSearch': [value: boolean]
  'update:optionsExpanded': [value: boolean]
  search: []
  'query-input': []
  'height-change': [value: number]
}>()

const { t } = useI18n()

const headerEl = ref<HTMLElement | null>(null)
let headerObserver: ResizeObserver | null = null

const emitHeaderHeight = () => {
  emit('height-change', headerEl.value?.offsetHeight || 0)
}

const handleQueryInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value
  emit('update:searchQuery', value)
  emit('query-input')
}

const handleSearch = () => {
  emit('search')
}

const handleReverseSearchUpdate = (value: boolean) => {
  emit('update:reverseSearch', value)
}

const toggleOptionsExpanded = () => {
  emit('update:optionsExpanded', !props.optionsExpanded)
}

watch(() => props.optionsExpanded, async () => {
  await nextTick()
  emitHeaderHeight()
})

onMounted(() => {
  emitHeaderHeight()
  window.addEventListener('resize', emitHeaderHeight, { passive: true })

  if (headerEl.value && 'ResizeObserver' in window) {
    headerObserver = new ResizeObserver(() => {
      emitHeaderHeight()
    })
    headerObserver.observe(headerEl.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', emitHeaderHeight)
  if (headerObserver) {
    headerObserver.disconnect()
    headerObserver = null
  }
})
</script>
