<template>
  <div class="space-y-6">
    <div class="lg:grid lg:grid-cols-12 lg:gap-6">
      <aside class="hidden lg:block lg:col-span-4 xl:col-span-3">
        <div class="sticky top-24 overflow-hidden">
          <p class="px-4 py-3 text-base font-bold uppercase tracking-[0.15em] text-ink dark:text-parchment border-b border-outline-soft/20 dark:border-stone-800">
            {{ t('browse.dictionaries') }}
          </p>
          <nav aria-label="Dictionary browse scopes" class="divide-y divide-outline-soft/10 dark:divide-stone-800">
            <NuxtLink
              v-for="scope in scopeTabs"
              :key="scope.id"
              :to="buildScopeLink(scope.id)"
              active-class=""
              exact-active-class=""
              class="flex items-center justify-between gap-3 px-4 py-3 text-base transition-all border-l-4"
              :class="activeScopeId === scope.id
                ? 'bg-surface-high dark:bg-stone-800 !border-l-kapok text-ink dark:text-parchment font-semibold'
                : 'text-graphite dark:text-stone-400 hover:bg-surface-low dark:hover:bg-stone-800/50 border-l-transparent font-medium'"
            >
              <span class="break-words">{{ scope.label }}</span>
              <span
                class="text-xs px-2 py-0.5 whitespace-nowrap"
                :class="activeScopeId === scope.id
                  ? 'bg-kapok/10 dark:bg-kapok/20 text-kapok'
                  : 'bg-surface-highest dark:bg-stone-700 text-graphite/60 dark:text-stone-500'"
              >
                {{ formatCount(scope.total) }}
              </span>
            </NuxtLink>
          </nav>
        </div>
      </aside>

      <section class="lg:col-span-8 xl:col-span-9">
        <!-- Dictionary info card -->
        <div v-if="dictionaryInfo && activeScopeId !== 'all'" class="bg-surface-low dark:bg-stone-900 p-6 md:p-8 mb-6 flex flex-col md:flex-row gap-6">
          <div v-if="dictionaryInfo.cover" class="flex-shrink-0">
            <img
              :src="dictionaryInfo.cover"
              :alt="dictionaryInfo.name"
              class="w-24 md:w-32 h-auto object-contain"
            >
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-2xl md:text-3xl font-headline font-bold text-ink dark:text-parchment mb-2">
              {{ dictionaryInfo.name }}
            </h2>
            <p v-if="dictionaryInfo.description" class="text-lg text-ink/80 dark:text-stone-300 mb-3 leading-relaxed">
              {{ dictionaryInfo.description }}
            </p>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-base text-graphite dark:text-stone-400">
              <span v-if="dictionaryInfo.author">{{ dictionaryInfo.author }}</span>
              <span v-if="dictionaryInfo.publisher">{{ dictionaryInfo.publisher }}</span>
              <span v-if="dictionaryInfo.year">{{ dictionaryInfo.year }}</span>
              <span v-if="dictionaryInfo.entriesCount" class="text-kapok font-semibold">
                {{ dictionaryInfo.entriesCount.toLocaleString() }} {{ t('common.entriesCountSuffix') }}
              </span>
            </div>
          </div>
        </div>

        <!-- All dictionary covers grid (for "all" view) -->
        <div v-if="allCovers.length > 0 && activeScopeId === 'all'" class="bg-surface-low dark:bg-stone-900 p-6 md:p-8 mb-6">
          <div class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            <NuxtLink
              v-for="dict in allCovers"
              :key="dict.id"
              :to="`/browse/${encodeURIComponent(dict.id)}`"
              class="group"
              :title="dict.name"
            >
              <img
                :src="dict.cover"
                :alt="dict.name"
                class="w-full h-auto object-contain group-hover:opacity-80 transition-opacity"
              >
            </NuxtLink>
          </div>
        </div>

        <div class="lg:hidden sticky top-0 z-[8] bg-parchment/95 dark:bg-stone-950/95 backdrop-blur supports-[backdrop-filter]:bg-parchment/90 supports-[backdrop-filter]:dark:bg-stone-950/90 -mx-6 md:-mx-8 px-6 md:px-8">
          <div class="overflow-x-auto py-2" role="tablist" :aria-label="t('browse.dictionaries')">
            <div class="flex flex-nowrap items-center gap-1.5 min-w-max bg-surface-low dark:bg-stone-900 p-1.5 rounded-lg w-fit">
              <NuxtLink
                v-for="scope in scopeTabs"
                :key="`mobile:${scope.id}`"
                :to="buildScopeLink(scope.id)"
                class="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm whitespace-nowrap transition-all"
                :class="activeScopeId === scope.id
                  ? 'bg-kapok text-white font-bold shadow-lg shadow-kapok/20'
                  : 'text-graphite dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 font-medium'"
              >
                <span>{{ scope.label }}</span>
                <span
                  class="text-xs px-1.5 py-0.5 rounded-full"
                  :class="activeScopeId === scope.id
                    ? 'bg-white/20 text-white'
                    : 'bg-kapok/10 dark:bg-kapok/20 text-kapok'"
                >
                  {{ formatCount(scope.total) }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 bg-surface-low dark:bg-stone-900 px-4 py-3">
          <p class="text-graphite dark:text-stone-400 text-sm md:text-base">
            <span class="font-medium text-ink dark:text-parchment">{{ activeScopeLabel }}</span>
            <span class="mx-2 text-graphite/30 dark:text-stone-600">·</span>
            {{ t('browse.entries', { count: formatCount(browseData.total) }) }}
          </p>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <label class="inline-flex items-center gap-2 text-sm text-graphite dark:text-stone-400">
              <span>{{ t('common.sortLabel') }}</span>
              <select
                :value="safeSortBy"
                class="px-3 py-1.5 bg-white dark:bg-stone-800 border border-outline-soft/20 dark:border-stone-700 text-ink dark:text-stone-100"
                @change="handleSortChange"
              >
                <option v-for="sort in sortOptions" :key="sort" :value="sort">
                  {{ getSortLabel(sort) }}
                </option>
              </select>
            </label>

            <label class="inline-flex items-center gap-2 text-sm text-graphite dark:text-stone-400">
              <span>{{ t('browse.pageSize') }}</span>
              <select
                :value="browseData.pageSize"
                class="px-3 py-1.5 bg-white dark:bg-stone-800 border border-outline-soft/20 dark:border-stone-700 text-ink dark:text-stone-100"
                @change="handlePageSizeChange"
              >
                <option v-for="size in pageSizeOptions" :key="size" :value="size">
                  {{ size }}
                </option>
              </select>
            </label>

            <nav
              v-if="browseData.totalPages > 1"
              class="inline-flex items-center gap-2"
              aria-label="Top pagination"
            >
              <NuxtLink
                v-if="browseData.page > 1"
                :to="buildScopePath(activeScopeId, browseData.page - 1, browseData.pageSize)"
                class="px-3 py-1.5 text-sm font-medium text-archive-green bg-surface-low dark:bg-stone-800 hover:bg-surface-high dark:hover:bg-stone-700 transition-colors"
              >
                {{ t('browse.prevPage') }}
              </NuxtLink>
              <span
                v-else
                class="px-3 py-1.5 text-sm font-medium text-graphite/40 dark:text-stone-600 bg-surface-low dark:bg-stone-800 cursor-not-allowed"
              >
                {{ t('browse.prevPage') }}
              </span>

              <label class="inline-flex items-center gap-1 text-sm text-graphite/60 dark:text-stone-500 px-1">
                <span>{{ t('browse.pageInputPrefix') }}</span>
                <input
                  v-model="pageInput"
                  type="number"
                  min="1"
                  :max="browseData.totalPages"
                  :disabled="loading"
                  class="w-16 px-2 py-1 bg-white dark:bg-stone-800 border border-outline-soft/20 dark:border-stone-700 text-center text-ink dark:text-stone-100 disabled:opacity-60"
                  :aria-label="t('browse.pageInfo', { page: browseData.page, total: browseData.totalPages })"
                  @keydown.enter.prevent="commitPageInput"
                  @blur="commitPageInput"
                >
                <span>/ {{ browseData.totalPages }} {{ t('browse.pageInputSuffix') }}</span>
              </label>

              <NuxtLink
                v-if="browseData.page < browseData.totalPages"
                :to="buildScopePath(activeScopeId, browseData.page + 1, browseData.pageSize)"
                class="px-3 py-1.5 text-sm font-medium text-white bg-kapok hover:bg-kapok/90 transition-colors"
              >
                {{ t('browse.nextPage') }}
              </NuxtLink>
              <span
                v-else
                class="px-3 py-1.5 text-sm font-medium text-graphite/40 dark:text-stone-600 bg-surface-low dark:bg-stone-800 cursor-not-allowed"
              >
                {{ t('browse.nextPage') }}
              </span>
            </nav>
          </div>
        </div>

        <div
          v-if="loading"
          class="my-4 bg-surface-low dark:bg-stone-900 min-h-[18rem] flex items-center justify-center"
        >
          <div class="text-center text-graphite/60 dark:text-stone-500">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-4 border-kapok border-t-transparent"></div>
            <p class="mt-3 text-sm">{{ t('common.loading') }}</p>
          </div>
        </div>

        <div
          v-else-if="browseData.headwords.length > 0"
          class="my-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-0 overflow-hidden bg-surface-low dark:bg-stone-900"
        >
          <NuxtLink
            v-for="headword in browseData.headwords"
            :key="headword"
            :to="`/word/${encodeURIComponent(headword)}`"
            :prefetch="false"
            class="px-3 py-2.5 text-center text-base font-medium text-ink dark:text-stone-100 hover:text-kapok hover:bg-surface-low dark:hover:bg-stone-800 transition-colors truncate"
          >
            {{ headword }}
          </NuxtLink>
        </div>

        <div
          v-else
          class="text-center py-10 text-sm text-graphite/60 dark:text-stone-500"
        >
          {{ t('common.noResultsDescription') }}
        </div>

        <BrowsePagination
          v-if="!loading && browseData.totalPages > 1"
          :page="browseData.page"
          :total-pages="browseData.totalPages"
          :base-path="activeBasePath"
          :page-size="browseData.pageSize"
          :sort-by="safeSortBy"
        />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
type BrowseSort = 'headword' | 'jyutping'

interface BrowseDictionaryScope {
  id: string
  label: string
  total: number
}

interface BrowseResponse {
  headwords: string[]
  total: number
  allTotal: number
  page: number
  totalPages: number
  pageSize: number
  sort: BrowseSort
  scope: string
  dictionaries: BrowseDictionaryScope[]
}

interface DictionaryInfo {
  name: string
  description: string
  author: string
  publisher: string
  year: number | null
  cover: string
  entriesCount: number
}

interface DictionaryCover {
  id: string
  name: string
  cover: string
}

const props = withDefaults(defineProps<{
  browseData: BrowseResponse
  loading?: boolean
  dictionaryInfo?: DictionaryInfo | null
  allCovers?: DictionaryCover[]
}>(), {
  loading: false,
  dictionaryInfo: null,
  allCovers: () => []
})

const DEFAULT_PAGE_SIZE = 100
const DEFAULT_SORT_BY: BrowseSort = 'headword'
const pageSizeOptions = [100, 500, 1000]
const sortOptions: BrowseSort[] = ['headword', 'jyutping']

const route = useRoute()
const { t, locale } = useI18n()
const { dictionariesData, getLocalizedValue } = useLocalizedDictionary()

const activeScopeId = computed(() => {
  const routeDict = Array.isArray(route.params.dict) ? route.params.dict[0] : route.params.dict
  const trimmedRouteDict = String(routeDict || '').trim()
  if (trimmedRouteDict) return trimmedRouteDict
  return props.browseData.scope || 'all'
})
const activeBasePath = computed(() => {
  if (activeScopeId.value === 'all') return '/browse'
  return `/browse/${encodeURIComponent(activeScopeId.value)}`
})

const localizedLabelById = computed(() => {
  const map = new Map<string, string>()
  const dictionaries = dictionariesData.value?.dictionaries || []

  dictionaries.forEach((dict: any) => {
    if (!dict?.id) return
    map.set(dict.id, getLocalizedValue(dict.name, dict.id))
  })

  return map
})

const scopeTabs = computed(() => {
  const allTab: BrowseDictionaryScope = {
    id: 'all',
    label: t('browse.allSources'),
    total: props.browseData.allTotal
  }

  const dictionaryTabs = props.browseData.dictionaries.map((scope) => ({
    ...scope,
    label: localizedLabelById.value.get(scope.id) || scope.label || scope.id
  }))

  return [allTab, ...dictionaryTabs]
})

const activeScopeLabel = computed(() => {
  if (activeScopeId.value === 'all') {
    const suffix = locale.value.endsWith('Hans') ? '合并去重后' : '合併去重後'
    return `${t('browse.allSources')}(${suffix})`
  }

  const active = scopeTabs.value.find((scope) => scope.id === activeScopeId.value)
  return active?.label || t('browse.allSources')
})

const formatCount = (count: number) => count.toLocaleString()

const getSortLabel = (sort: BrowseSort): string => {
  if (sort === 'jyutping') return t('common.sortByJyutping')
  return t('common.sortByHeadword')
}

const safeSortBy = computed<BrowseSort>(() => {
  const sort = props.browseData.sort
  return sortOptions.includes(sort) ? sort : DEFAULT_SORT_BY
})

const pageInput = ref(String(props.browseData.page))
watch(() => props.browseData.page, (page) => {
  pageInput.value = String(page)
})

const buildScopePath = (
  scopeId: string,
  page = 1,
  pageSize = props.browseData.pageSize,
  sortBy = safeSortBy.value
): string => {
  const basePath = scopeId === 'all' ? '/browse' : `/browse/${encodeURIComponent(scopeId)}`
  const query = new URLSearchParams()

  if (page > 1) {
    query.set('page', String(page))
  }

  if (pageSize !== DEFAULT_PAGE_SIZE) {
    query.set('size', String(pageSize))
  }

  if (sortBy !== DEFAULT_SORT_BY) {
    query.set('sort', sortBy)
  }

  const suffix = query.toString()
  return suffix ? `${basePath}?${suffix}` : basePath
}

const buildScopeLink = (scopeId: string) => {
  return buildScopePath(scopeId, 1, props.browseData.pageSize)
}

const handlePageSizeChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  if (!target) return

  const nextSize = Number.parseInt(target.value, 10)
  const safeSize = pageSizeOptions.includes(nextSize) ? nextSize : DEFAULT_PAGE_SIZE
  void navigateTo(buildScopePath(activeScopeId.value, 1, safeSize, safeSortBy.value))
}

const handleSortChange = (event: Event) => {
  const target = event.target as HTMLSelectElement | null
  if (!target) return

  const rawSort = String(target.value || '').trim()
  const safeSort = sortOptions.includes(rawSort as BrowseSort)
    ? rawSort as BrowseSort
    : DEFAULT_SORT_BY
  void navigateTo(buildScopePath(activeScopeId.value, 1, props.browseData.pageSize, safeSort))
}

const commitPageInput = () => {
  if (props.loading) return

  const trimmed = pageInput.value.trim()
  if (!trimmed) {
    pageInput.value = String(props.browseData.page)
    return
  }

  const parsed = Number.parseInt(trimmed, 10)
  if (!Number.isFinite(parsed)) {
    pageInput.value = String(props.browseData.page)
    return
  }

  const targetPage = Math.max(1, Math.min(props.browseData.totalPages, parsed))
  pageInput.value = String(targetPage)

  if (targetPage === props.browseData.page) return
  void navigateTo(buildScopePath(activeScopeId.value, targetPage, props.browseData.pageSize, safeSortBy.value))
}
</script>
