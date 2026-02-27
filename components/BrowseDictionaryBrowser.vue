<template>
  <div class="space-y-6">
    <div class="lg:grid lg:grid-cols-12 lg:gap-6">
      <aside class="hidden lg:block lg:col-span-4 xl:col-span-3">
        <div class="sticky top-24 rounded-xl bg-white dark:bg-gray-800 shadow-sm dark:shadow-black/20 overflow-hidden">
          <p class="px-4 py-3 text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
            {{ t('browse.dictionaries') }}
          </p>
          <nav aria-label="Dictionary browse scopes" class="divide-y divide-gray-100 dark:divide-gray-700">
            <NuxtLink
              v-for="scope in scopeTabs"
              :key="scope.id"
              :to="buildScopeLink(scope.id)"
              class="flex items-center justify-between gap-3 px-4 py-3 text-sm transition-colors"
              :class="activeScopeId === scope.id
                ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                : 'text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50'"
            >
              <span class="font-medium break-words">{{ scope.label }}</span>
              <span
                class="text-xs px-2 py-1 rounded-full whitespace-nowrap"
                :class="activeScopeId === scope.id
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'"
              >
                {{ formatCount(scope.total) }}
              </span>
            </NuxtLink>
          </nav>
        </div>
      </aside>

      <section class="lg:col-span-8 xl:col-span-9">
        <div class="lg:hidden sticky top-0 z-[8] bg-gray-50/95 dark:bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-50/90 supports-[backdrop-filter]:dark:bg-gray-900/90 border-y border-gray-200 dark:border-gray-700 -mx-4 px-4">
          <div class="overflow-x-auto py-2" role="tablist" :aria-label="t('browse.dictionaries')">
            <div class="flex flex-nowrap items-center gap-2 min-w-max">
              <NuxtLink
                v-for="scope in scopeTabs"
                :key="`mobile:${scope.id}`"
                :to="buildScopeLink(scope.id)"
                class="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-colors"
                :class="activeScopeId === scope.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/20'"
              >
                <span class="font-medium">{{ scope.label }}</span>
                <span
                  class="text-xs px-1.5 py-0.5 rounded-full"
                  :class="activeScopeId === scope.id
                    ? 'bg-white/20 text-white'
                    : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'"
                >
                  {{ formatCount(scope.total) }}
                </span>
              </NuxtLink>
            </div>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-3">
          <p class="text-gray-600 dark:text-gray-300 text-sm md:text-base">
            <span class="font-medium text-gray-900 dark:text-gray-100">{{ activeScopeLabel }}</span>
            <span class="mx-2 text-gray-400 dark:text-gray-500">·</span>
            {{ t('browse.entries', { count: formatCount(browseData.total) }) }}
          </p>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{{ t('common.sortLabel') }}</span>
              <select
                :value="safeSortBy"
                class="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                @change="handleSortChange"
              >
                <option v-for="sort in sortOptions" :key="sort" :value="sort">
                  {{ getSortLabel(sort) }}
                </option>
              </select>
            </label>

            <label class="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
              <span>{{ t('browse.pageSize') }}</span>
              <select
                :value="browseData.pageSize"
                class="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
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
                class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-white dark:bg-gray-900 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {{ t('browse.prevPage') }}
              </NuxtLink>
              <span
                v-else
                class="px-3 py-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 bg-white dark:bg-gray-900 rounded-lg cursor-not-allowed"
              >
                {{ t('browse.prevPage') }}
              </span>

              <label class="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 px-1">
                <span>{{ t('browse.pageInputPrefix') }}</span>
                <input
                  v-model="pageInput"
                  type="number"
                  min="1"
                  :max="browseData.totalPages"
                  :disabled="loading"
                  class="w-16 px-2 py-1 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-center text-gray-900 dark:text-gray-100 disabled:opacity-60"
                  :aria-label="t('browse.pageInfo', { page: browseData.page, total: browseData.totalPages })"
                  @keydown.enter.prevent="commitPageInput"
                  @blur="commitPageInput"
                >
                <span>/ {{ browseData.totalPages }} {{ t('browse.pageInputSuffix') }}</span>
              </label>

              <NuxtLink
                v-if="browseData.page < browseData.totalPages"
                :to="buildScopePath(activeScopeId, browseData.page + 1, browseData.pageSize)"
                class="px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800"
              >
                {{ t('browse.nextPage') }}
              </NuxtLink>
              <span
                v-else
                class="px-3 py-1.5 text-sm font-medium text-gray-400 dark:text-gray-500 bg-blue-50 dark:bg-blue-950 rounded-lg cursor-not-allowed"
              >
                {{ t('browse.nextPage') }}
              </span>
            </nav>
          </div>
        </div>

        <div
          v-if="loading"
          class="my-4 rounded-xl bg-white dark:bg-gray-800 shadow-sm min-h-[18rem] flex items-center justify-center"
        >
          <div class="text-center text-gray-500 dark:text-gray-400">
            <div class="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p class="mt-3 text-sm">{{ t('common.loading') }}</p>
          </div>
        </div>

        <div
          v-else-if="browseData.headwords.length > 0"
          class="my-4 shadow-sm grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-0 rounded-xl overflow-hidden bg-white dark:bg-gray-800"
        >
          <NuxtLink
            v-for="headword in browseData.headwords"
            :key="headword"
            :to="`/word/${encodeURIComponent(headword)}`"
            :prefetch="false"
            class="px-3 py-2 text-center text-sm font-medium text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors truncate"
          >
            {{ headword }}
          </NuxtLink>
        </div>

        <div
          v-else
          class="text-center py-10 text-sm text-gray-500 dark:text-gray-400 rounded-xl"
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

const props = withDefaults(defineProps<{
  browseData: BrowseResponse
  loading?: boolean
}>(), {
  loading: false
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
