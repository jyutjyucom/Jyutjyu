<template>
  <header ref="headerEl" class="bg-parchment/85 dark:bg-stone-950/85 backdrop-blur-md border-b border-outline-soft/20 dark:border-stone-800 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-6 md:px-8 py-3">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div class="flex flex-wrap items-center gap-4 flex-1 min-w-0">
          <NuxtLink to="/" class="text-lg font-headline font-bold text-kapok whitespace-nowrap">
            {{ t('common.siteName') }}
          </NuxtLink>

          <div class="flex flex-nowrap items-center gap-2 flex-1 min-w-0">
            <div class="flex-1 min-w-0 max-w-2xl relative">
              <input
                :value="searchQuery"
                type="text"
                :placeholder="t('common.searchPlaceholder')"
                class="w-full px-4 py-2 pr-20 border-none bg-surface-low dark:bg-stone-900 text-ink dark:text-stone-100 focus:outline-none transition-colors"
                @input="handleQueryInput"
                @keyup.enter="handleSearch"
              >
              <button
                class="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-kapok text-white hover:bg-kapok/90 transition-colors text-sm font-medium"
                @click="handleSearch"
              >
                {{ t('common.searchButton') }}
              </button>

              <slot name="search-popover" />
            </div>

            <button
              v-if="showMobileOptionsButton"
              type="button"
              class="lg:hidden flex items-center justify-center w-9 h-9 text-graphite dark:text-stone-400 hover:text-kapok transition-colors shrink-0"
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

      <div v-show="optionsExpanded" class="lg:hidden border-t border-outline-soft/20 dark:border-stone-800 pt-3 mt-1 space-y-4">
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
