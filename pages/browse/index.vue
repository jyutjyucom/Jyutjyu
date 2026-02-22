<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <AppHeader
      v-model:search-query="searchQuery"
      v-model:reverse-search="enableReverseSearch"
      v-model:options-expanded="optionsExpanded"
      @search="handleSearch"
    />

    <main class="container mx-auto px-4 py-8">
      <div class="max-w-7xl mx-auto">
        <NuxtLink to="/" class="inline-flex items-center gap-1.5 mb-6 text-base font-medium text-blue-600 dark:text-blue-400 hover:underline">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ t('common.siteName') }}
        </NuxtLink>

        <h1 class="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {{ t('browse.title') }}
        </h1>

        <div v-if="pending" class="text-center py-16">
          <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>

        <template v-else-if="browseData">
          <BrowseDictionaryBrowser :browse-data="browseData" />
        </template>
      </div>
    </main>

    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const config = useRuntimeConfig()

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

const { data: browseData, pending, error } = await useFetch<{
  headwords: string[]
  total: number
  allTotal: number
  page: number
  totalPages: number
  pageSize: number
  sort: 'headword' | 'jyutping'
  scope: string
  dictionaries: Array<{ id: string; label: string; total: number }>
}>('/api/browse', {
  key: () => `browse:all:${currentPage.value}:${currentPageSize.value}:${currentSortBy.value}`,
  query: computed(() => {
    const query: Record<string, number | string> = {}
    if (currentPage.value > 1) query.page = currentPage.value
    if (currentPageSize.value !== DEFAULT_PAGE_SIZE) query.size = currentPageSize.value
    if (currentSortBy.value !== DEFAULT_SORT_BY) query.sort = currentSortBy.value
    return query
  }),
  server: true
})

if (error.value) {
  throw createError({
    statusCode: error.value.statusCode || 500,
    statusMessage: error.value.statusMessage || 'Failed to load browse data'
  })
}

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
    { name: 'robots', content: 'index, follow' }
  ],
  link: canonicalHref.value
    ? [{ rel: 'canonical', href: canonicalHref.value }]
    : []
}))
</script>
