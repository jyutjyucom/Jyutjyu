import type { Ref } from 'vue'

type BrowseSort = 'headword' | 'jyutping'

export interface BrowseDictionaryScope {
  id: string
  label: string
  total: number
}

export interface BrowseResponse {
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

interface BrowseManifestScope {
  total: number
  total_pages_by_size?: Record<string, number>
}

interface BrowseManifest {
  dictionaries?: BrowseDictionaryScope[]
  scopes?: Record<string, BrowseManifestScope>
}

interface BrowsePageParams {
  scope: Ref<string>
  page: Ref<number>
  pageSize: Ref<number>
  sortBy: Ref<string>
}

const DEFAULT_PAGE_SIZE = 100
const ALLOWED_PAGE_SIZES = new Set([100, 500, 1000])
const DEFAULT_SORT_BY: BrowseSort = 'headword'
const ALLOWED_SORTS = new Set<BrowseSort>(['headword', 'jyutping'])

const normalizeScope = (value: string): string => {
  const trimmed = String(value || '').trim()
  return trimmed || 'all'
}

const normalizePage = (value: number): number => {
  return Math.max(1, Number.isFinite(value) ? Math.trunc(value) : 1)
}

const normalizePageSize = (value: number): number => {
  const parsed = normalizePage(value)
  return ALLOWED_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE
}

const normalizeSort = (value: string): BrowseSort => {
  const lowered = String(value || '').trim().toLowerCase() as BrowseSort
  return ALLOWED_SORTS.has(lowered) ? lowered : DEFAULT_SORT_BY
}

const resolveTotalPages = (scopeInfo: BrowseManifestScope, pageSize: number): number => {
  const fromManifest = scopeInfo.total_pages_by_size?.[String(pageSize)]
  if (typeof fromManifest === 'number' && Number.isFinite(fromManifest)) {
    return Math.max(1, fromManifest)
  }

  const total = Number.isFinite(scopeInfo.total) ? scopeInfo.total : 0
  return Math.max(1, Math.ceil(total / pageSize))
}

const toApiQuery = (
  scope: string,
  page: number,
  pageSize: number,
  sortBy: BrowseSort
): Record<string, string | number> => {
  const query: Record<string, string | number> = {}

  if (scope !== 'all') {
    query.dict = scope
  }
  if (page > 1) {
    query.page = page
  }
  if (pageSize !== DEFAULT_PAGE_SIZE) {
    query.size = pageSize
  }
  if (sortBy !== DEFAULT_SORT_BY) {
    query.sort = sortBy
  }

  return query
}

const loadStaticBrowsePage = async (
  manifest: BrowseManifest,
  scope: string,
  page: number,
  pageSize: number,
  sortBy: BrowseSort
): Promise<BrowseResponse | null> => {
  const scopes = manifest.scopes
  if (!scopes || typeof scopes !== 'object') return null

  const scopeInfo = scopes[scope]
  if (!scopeInfo) return null

  const total = Number.isFinite(scopeInfo.total) ? scopeInfo.total : 0
  const totalPages = resolveTotalPages(scopeInfo, pageSize)
  const safePage = Math.max(1, Math.min(page, totalPages))
  const pagePath = `/browse-index/${encodeURIComponent(scope)}/${sortBy}/size-${pageSize}/page-${safePage}.json`

  try {
    const parsed = await $fetch<{ headwords?: string[] }>(pagePath)
    if (!Array.isArray(parsed?.headwords)) return null

    const allTotalRaw = scopes.all?.total
    const allTotal = Number.isFinite(allTotalRaw) ? Number(allTotalRaw) : total
    const dictionaries = Array.isArray(manifest.dictionaries) ? manifest.dictionaries : []

    return {
      headwords: parsed.headwords,
      total,
      allTotal,
      page: safePage,
      totalPages,
      pageSize,
      sort: sortBy,
      scope,
      dictionaries
    }
  } catch {
    return null
  }
}

export const useBrowsePageData = (params: BrowsePageParams) => {
  const manifestState = useState<BrowseManifest | null>('browse-index-manifest', () => null)

  const loadManifest = async (): Promise<BrowseManifest | null> => {
    const cached = manifestState.value
    if (cached?.scopes && typeof cached.scopes === 'object') {
      return cached
    }

    try {
      const manifest = await $fetch<BrowseManifest>('/browse-index/manifest.json')
      if (!manifest?.scopes || typeof manifest.scopes !== 'object') {
        return null
      }
      manifestState.value = manifest
      return manifest
    } catch {
      return null
    }
  }

  const cacheKey = computed(() => {
    const safeScope = normalizeScope(params.scope.value)
    const safePage = normalizePage(params.page.value)
    const safePageSize = normalizePageSize(params.pageSize.value)
    const safeSortBy = normalizeSort(params.sortBy.value)
    return `browse:${safeScope}:${safePage}:${safePageSize}:${safeSortBy}`
  })

  return useAsyncData<BrowseResponse>(cacheKey, async () => {
    const safeScope = normalizeScope(params.scope.value)
    const safePage = normalizePage(params.page.value)
    const safePageSize = normalizePageSize(params.pageSize.value)
    const safeSortBy = normalizeSort(params.sortBy.value)

    const manifest = await loadManifest()
    if (manifest) {
      const staticResult = await loadStaticBrowsePage(manifest, safeScope, safePage, safePageSize, safeSortBy)
      if (staticResult) {
        return staticResult
      }
    }

    return $fetch<BrowseResponse>('/api/browse', {
      query: toApiQuery(safeScope, safePage, safePageSize, safeSortBy)
    })
  }, {
    watch: [params.scope, params.page, params.pageSize, params.sortBy]
  })
}
