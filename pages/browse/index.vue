<template>
  <div class="min-h-screen bg-parchment dark:bg-stone-950">
    <AppHeader
      v-model:search-query="searchQuery"
      v-model:reverse-search="enableReverseSearch"
      v-model:options-expanded="optionsExpanded"
      @search="handleSearch"
    />

    <main id="main-content" class="max-w-7xl mx-auto px-6 md:px-8 py-8 font-cjk-sans">
        <NuxtLink to="/" class="inline-flex items-center gap-1.5 mb-6 text-sm sm:text-base font-medium text-kapok hover:text-kapok/70 transition-colors">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ t('browse.backHome') }}
        </NuxtLink>

        <div v-if="pending && !displayedBrowseData" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-kapok border-t-transparent"></div>
        </div>

        <div
          v-else-if="error && !displayedBrowseData"
          class="border-l-4 border-kapok bg-kapok/10 dark:bg-kapok/20 px-4 py-6 text-center text-sm text-kapok"
        >
          <p class="mb-3">
            {{ error.statusMessage || 'Failed to load browse data' }}
          </p>
          <button
            class="px-3 py-1.5 bg-kapok text-white hover:bg-kapok/90 transition-colors"
            @click="retryBrowseLoad"
          >
            {{ t('common.searchButton') }}
          </button>
        </div>

        <template v-else-if="displayedBrowseData">
          <BrowseDictionaryBrowser :browse-data="displayedBrowseData" :loading="pending" :all-covers="allDictionaryCovers" />
        </template>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import '~/styles/chiron-sung.css'
import type { BrowseResponse } from '~/composables/useBrowsePageData'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()
const { dictionariesData, getLocalizedValue } = useLocalizedDictionary()

const searchQuery = ref('')
const enableReverseSearch = ref(false)
const optionsExpanded = ref(false)
const ALLOWED_PAGE_SIZES = new Set([100, 500, 1000])
const DEFAULT_PAGE_SIZE = 100
const ALLOWED_SORT_BY = new Set(['headword', 'jyutping'])
const DEFAULT_SORT_BY = 'headword'

const currentPage = computed(() => Math.max(1, parseInt(String(route.query.page || '1')) || 1))
const currentPageSize = computed(() => {
  const parsed = Math.max(1, parseInt(String(route.query.size || DEFAULT_PAGE_SIZE), 10) || DEFAULT_PAGE_SIZE)
  return ALLOWED_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE
})
const currentSortBy = computed(() => {
  const value = String(route.query.sort || DEFAULT_SORT_BY).trim().toLowerCase()
  return ALLOWED_SORT_BY.has(value) ? value : DEFAULT_SORT_BY
})

const handleSearch = () => {
  if (searchQuery.value.trim()) {
    const params = new URLSearchParams({ q: searchQuery.value })
    if (enableReverseSearch.value) params.set('reverse', '1')
    router.push(`/search?${params.toString()}`)
  }
}

const browseScope = computed(() => 'all')
const { data: browseData, pending, error, refresh } = useBrowsePageData({
  scope: browseScope,
  page: currentPage,
  pageSize: currentPageSize,
  sortBy: currentSortBy
})

const displayedBrowseData = useState<BrowseResponse | null>('browse-displayed-data', () => null)
watch(browseData, (value) => {
  if (value) {
    displayedBrowseData.value = value
  }
}, { immediate: true })

const retryBrowseLoad = () => {
  void refresh()
}

const allDictionaryCovers = computed(() => {
  const dictionaries = dictionariesData.value?.dictionaries || []
  return dictionaries
    .map((dict: any) => ({
      id: dict.id,
      name: getLocalizedValue(dict.name, dict.id),
      cover: dict.cover || '',
      author: dict.author ? getLocalizedValue(dict.author, '') : '',
      year: dict.year || null
    }))
})

const siteUrl = computed(() => String(config.public.siteUrl || '').replace(/\/+$/, ''))
const canonicalHref = computed(() => {
  if (!siteUrl.value) return ''
  const pageSuffix = currentPage.value > 1 ? `?page=${currentPage.value}` : ''
  return `${siteUrl.value}/browse${pageSuffix}`
})

useHead(() => ({
  title: `${t('browse.title')} | ${t('common.siteName')}`,
  meta: [
    { name: 'description', content: t('browse.metaDescription') },
    { name: 'robots', content: 'index, follow' },
    { property: 'og:title', content: `${t('browse.title')} | ${t('common.siteName')}` },
    { property: 'og:description', content: t('browse.metaDescription') },
    { property: 'og:url', content: canonicalHref.value || undefined }
  ],
  link: canonicalHref.value
    ? [{ rel: 'canonical', href: canonicalHref.value }]
    : []
}))
</script>
