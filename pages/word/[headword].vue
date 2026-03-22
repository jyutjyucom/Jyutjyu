<template>
  <div class="min-h-screen bg-parchment dark:bg-stone-950">
    <AppHeader
      v-model:search-query="searchQuery"
      v-model:reverse-search="enableReverseSearch"
      v-model:options-expanded="optionsExpanded"
      @search="handleSearch"
      @height-change="appHeaderHeight = $event"
    />

    <main class="max-w-7xl mx-auto px-6 md:px-8 py-8">
      <div v-if="pending" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-4 border-kapok border-t-transparent"></div>
        <p class="text-graphite dark:text-stone-400 mt-4">{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="!wordData" class="text-center py-16">
        <h1 class="text-2xl font-semibold text-ink dark:text-parchment mb-2">
          {{ t('common.noResultsTitle') }}
        </h1>
        <p class="text-graphite dark:text-stone-400 mb-6">
          {{ t('common.noResultsDescription') }}
        </p>
        <NuxtLink
          :to="searchLink"
          class="inline-flex px-5 py-2.5 bg-kapok text-white rounded-md hover:bg-kapok/90 transition-colors font-medium text-sm"
        >
          {{ t('common.searchButton') }}
        </NuxtLink>
      </div>

      <div v-else>
        <NuxtLink
          :to="searchLink"
          class="inline-flex items-center gap-1.5 text-base font-medium text-archive-green dark:text-emerald-400 hover:text-archive-green/70 dark:hover:text-emerald-300 transition-colors mb-8"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
          {{ `${searchResultCount ?? '...'} 條搜尋結果` }}
        </NuxtLink>

        <div class="mb-8">
          <h1 class="font-headline text-7xl md:text-8xl font-black text-ink dark:text-parchment leading-none tracking-tighter break-words">
            {{ wordData.canonical_headword }}
          </h1>

          <div class="mt-6 mb-2">
            <WordPronunciationTabs
              v-if="pronunciationTabs.length > 0"
              :model-value="activeJyutpingId"
              :tabs="pronunciationTabs"
              :sticky-offset="appHeaderHeight"
              aria-label="Jyutping tabs"
              @update:model-value="handleTabChange"
            />
          </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-kapok/60 dark:bg-kapok/40"></div>
          <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
        </div>

        <div v-if="activePronunciationGroup">
          <p class="text-base text-graphite dark:text-stone-400 mb-8">
            <span class="font-semibold text-xl md:text-2xl text-kapok">
              {{ activePronunciationGroup.label }}
            </span>
            <span class="mx-2 text-graphite/30 dark:text-stone-600">·</span>
            {{ t('dictCard.collectedBy', { count: activePronunciationGroup.dictionaryCount }) }}
          </p>

          <div class="hidden lg:grid lg:grid-cols-12 gap-8">
            <aside class="lg:col-span-4 xl:col-span-3">
              <div class="sticky" :style="{ top: `${appHeaderHeight + 24}px` }">
                <nav class="space-y-1">
                  <button
                    v-for="source in activePronunciationGroup.sources"
                    :key="`${activePronunciationGroup.id}:${source.id}`"
                    type="button"
                    class="w-full px-4 py-3 text-left transition-all flex items-center justify-between group rounded-md"
                    :class="activeSourceId === source.id
                      ? 'bg-surface-high dark:bg-stone-800 border-l-4 border-l-kapok'
                      : 'hover:bg-surface-low dark:hover:bg-stone-800/50 border-l-4 border-l-transparent'"
                    @click="selectDesktopSource(source.id)"
                  >
                    <span
                      class="text-sm break-words"
                      :class="activeSourceId === source.id
                        ? 'text-ink dark:text-parchment font-semibold'
                        : 'text-graphite dark:text-stone-400 font-medium'"
                    >
                      {{ source.sourceLabel }}
                    </span>
                    <span class="text-xs text-graphite/60 dark:text-stone-500 whitespace-nowrap ml-2">
                      {{ source.entries.length }} 義項
                    </span>
                  </button>
                </nav>
              </div>
            </aside>

            <section class="lg:col-span-8 xl:col-span-9">
              <WordSourcePanel
                v-if="selectedDesktopSourceGroup"
                :source-key="selectedDesktopSourceGroup.id"
                :source-label="selectedDesktopSourceGroup.sourceLabel"
                :entries="selectedDesktopSourceGroup.entries"
                :tab-jyutping-list="activePronunciationGroup.jyutpingList"
                :collapsible="false"
                :expanded="true"
                :active="true"
              />
            </section>
          </div>

          <div class="lg:hidden space-y-3">
            <WordSourcePanel
              v-for="source in activePronunciationGroup.sources"
              :key="`${activePronunciationGroup.id}:${source.id}`"
              :source-key="source.id"
              :source-label="source.sourceLabel"
              :entries="source.entries"
              :tab-jyutping-list="activePronunciationGroup.jyutpingList"
              :collapsible="true"
              :expanded="isMobileSourceExpanded(activePronunciationGroup.id, source.id)"
              :active="activeSourceId === source.id"
              @toggle="toggleMobileSource(source.id)"
            />
          </div>
        </div>

        <div
          v-else
          class="text-center py-12 text-graphite dark:text-stone-500"
        >
          {{ t('common.noResultsDescription') }}
        </div>

        <!-- Related Phrases -->
        <template v-if="relatedWords.length > 0">
          <div class="flex items-center gap-3 mt-16 mb-8">
            <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-kapok/60 dark:bg-kapok/40"></div>
            <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
          </div>

          <div>
            <h3 class="text-2xl md:text-3xl font-headline font-bold text-ink dark:text-parchment mb-8">
              {{ t('dictCard.relatedPhrases') }}
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <NuxtLink
                v-for="group in relatedWords.slice(0, 8)"
                :key="group.key"
                :to="`/word/${encodeURIComponent(group.primary.headword.display || group.primary.headword.normalized)}`"
                class="p-5 bg-surface-low dark:bg-stone-900 hover:bg-surface-high dark:hover:bg-stone-800 transition-colors duration-500 group"
              >
                <div class="flex justify-between items-start">
                  <div>
                    <p class="font-serif text-2xl text-ink dark:text-parchment group-hover:text-kapok transition-colors">
                      {{ group.primary.headword.display || group.primary.headword.normalized }}
                    </p>
                    <p class="text-sm text-graphite dark:text-stone-500 mt-2">
                      <span v-if="getEntryJyutpingKey(group.primary)" class="text-kapok font-semibold">{{ getEntryJyutpingKey(group.primary) }}</span>
                      <template v-if="getEntryJyutpingKey(group.primary) && group.primary.senses?.[0]?.definition">
                        <span class="mx-1.5 text-graphite/30 dark:text-stone-600">·</span>
                      </template>
                      <span v-if="group.primary.senses?.[0]?.definition" class="text-graphite/60 dark:text-stone-500">{{ group.primary.senses[0].definition.slice(0, 40) }}{{ group.primary.senses[0].definition.length > 40 ? '…' : '' }}</span>
                    </p>
                  </div>
                  <svg class="w-5 h-5 text-graphite/20 dark:text-stone-700 group-hover:text-kapok transition-colors flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17L17 7M17 7H7M17 7v10" />
                  </svg>
                </div>
              </NuxtLink>
            </div>
          </div>
        </template>
      </div>
    </main>

    <SiteFooter variant="search" />
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'

interface WordResponse {
  success: boolean
  canonical_headword: string | null
  total: number
  entries: DictionaryEntry[]
  error?: string
}

interface AggregatedEntry {
  key: string
  primary: DictionaryEntry
  entries: DictionaryEntry[]
}

interface SourceGroup {
  id: string
  sourceBook: string
  sourceLabel: string
  entries: DictionaryEntry[]
  sourcePriority: number
}

interface PronunciationGroup {
  id: string
  label: string
  jyutpingList: string[]
  sources: SourceGroup[]
  dictionaryCount: number
  sourcePriority: number
}

const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
const config = useRuntimeConfig()
const { getLocalizedSourceBookLabel, dictionariesData } = useLocalizedDictionary()
const { searchBasic } = useSearch()

const normalizeComparable = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()
const cleanHeadword = (value: string) => value.replace(/\s+/g, ' ').trim()

const requestedHeadword = computed(() => cleanHeadword(String(route.params.headword || '')))
const searchQuery = ref(requestedHeadword.value)
const enableReverseSearch = ref(false)
const optionsExpanded = ref(false)
const appHeaderHeight = ref(0)

const fetchWordData = () => useFetch<WordResponse>(() => `/api/word/${encodeURIComponent(requestedHeadword.value)}`, {
  key: () => `word:${requestedHeadword.value}`,
  server: true,
  lazy: process.client
})

const wordAsyncData = process.server ? await fetchWordData() : fetchWordData()
const { data, pending } = wordAsyncData

const wordData = computed(() => {
  if (!data.value?.success || !data.value.canonical_headword) {
    return null
  }
  return data.value
})

const canonicalHeadword = computed(() => cleanHeadword(wordData.value?.canonical_headword || ''))
const searchHeadword = computed(() => canonicalHeadword.value || requestedHeadword.value)
const searchLink = computed(() => `/search?q=${encodeURIComponent(searchHeadword.value)}`)
const shouldRedirect = computed(() => {
  if (!wordData.value) return false
  return normalizeComparable(canonicalHeadword.value) !== normalizeComparable(requestedHeadword.value)
})

const redirectingToCanonical = ref(false)
const redirectToCanonicalIfNeeded = async () => {
  if (redirectingToCanonical.value) return
  if (!wordData.value || !shouldRedirect.value) return

  redirectingToCanonical.value = true
  try {
    await navigateTo(`/word/${encodeURIComponent(canonicalHeadword.value)}`, {
      redirectCode: 301,
      replace: true
    })
  } finally {
    redirectingToCanonical.value = false
  }
}

if (process.server) {
  await redirectToCanonicalIfNeeded()
}

if (process.client) {
  watch([wordData, shouldRedirect], () => {
    void redirectToCanonicalIfNeeded()
  }, { immediate: true })
}

if (process.server && !wordData.value) {
  const event = useRequestEvent()
  if (event) {
    event.node.res.statusCode = 404
  }
}

const getEntryJyutpingList = (entry: DictionaryEntry): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  const jps = entry.phonetic?.jyutping || []
  jps.forEach((jp) => {
    const value = jp?.trim()
    if (!value) return
    if (!seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  })
  return result
}

const getEntryJyutpingKey = (entry: DictionaryEntry): string => {
  return getEntryJyutpingList(entry).join('; ')
}

const getAggregationKey = (entry: DictionaryEntry): string => {
  const headwordDisplay = entry.headword.display?.trim() || ''
  const headwordNormalized = entry.headword.normalized?.trim() || ''
  const jyutpingKey = getEntryJyutpingKey(entry)
  return [headwordDisplay, headwordNormalized, jyutpingKey].join('||')
}

const aggregateEntries = (entries: DictionaryEntry[]): AggregatedEntry[] => {
  const keyInfo = new Map<string, DictionaryEntry[]>()

  for (const entry of entries) {
    const key = getAggregationKey(entry)
    const list = keyInfo.get(key) || []
    list.push(entry)
    keyInfo.set(key, list)
  }

  const results: AggregatedEntry[] = []
  const seenKeys = new Set<string>()

  for (const entry of entries) {
    const key = getAggregationKey(entry)
    const grouped = keyInfo.get(key)
    if (!grouped || grouped.length === 0 || seenKeys.has(key)) continue

    seenKeys.add(key)
    const primary = grouped[0]
    if (!primary) continue

    results.push({
      key,
      primary,
      entries: grouped
    })
  }

  return results
}

const backSearchResultCount = ref<number | null>(null)
const backSearchAggregated = ref<AggregatedEntry[]>([])
const searchResultCount = computed(() => backSearchResultCount.value)
const backSearchCountRequestId = ref(0)

const refreshBackSearchResultCount = async () => {
  if (!process.client) return

  const requestId = ++backSearchCountRequestId.value
  const query = searchHeadword.value.trim()
  if (!query) {
    backSearchResultCount.value = null
    backSearchAggregated.value = []
    return
  }

  backSearchResultCount.value = null
  backSearchAggregated.value = []

  const fetchCount = async () => {
    let streamedCount = 0
    let lastAggregated: AggregatedEntry[] = []

    const results = await searchBasic(query, {
      limit: 1000,
      searchDefinition: false,
      onResults: (entries) => {
        const aggregated = aggregateEntries(entries)
        const count = aggregated.length
        if (count > streamedCount) {
          streamedCount = count
          lastAggregated = aggregated
        }
        if (requestId !== backSearchCountRequestId.value) return
        if (count > 0) {
          backSearchResultCount.value = count
          backSearchAggregated.value = aggregated
        }
      }
    })

    const finalAggregated = aggregateEntries(results)
    const finalCount = finalAggregated.length
    if (finalCount >= streamedCount) {
      lastAggregated = finalAggregated
    }
    return { count: Math.max(streamedCount, finalCount), aggregated: lastAggregated }
  }

  try {
    let { count, aggregated } = await fetchCount()

    // 首次水合或缓存未就绪时，偶尔会先返回 0，补一次重试避免误显示
    if (count === 0) {
      await new Promise(resolve => setTimeout(resolve, 150))
      ;({ count, aggregated } = await fetchCount())
    }

    // 搜索链路暂时不可用时，至少回退到当前词条下可见义项数，避免误显示 0
    if (count === 0 && wordData.value?.entries?.length) {
      aggregated = aggregateEntries(wordData.value.entries)
      count = aggregated.length
    }

    if (requestId !== backSearchCountRequestId.value) return
    backSearchResultCount.value = count > 0 ? count : null
    backSearchAggregated.value = aggregated
  } catch {
    if (requestId !== backSearchCountRequestId.value) return
    backSearchResultCount.value = null
    backSearchAggregated.value = []
  }
}

const relatedWords = computed(() => {
  const currentHeadword = normalizeComparable(canonicalHeadword.value || requestedHeadword.value)
  if (!currentHeadword) return []

  return backSearchAggregated.value.filter((group) => {
    const display = normalizeComparable(group.primary.headword.display || '')
    const normalized = normalizeComparable(group.primary.headword.normalized || '')
    return display !== currentHeadword && normalized !== currentHeadword
  })
})

const getSourcePriorityMap = computed(() => {
  const map = new Map<string, number>()
  const dictionaries = dictionariesData.value?.dictionaries || []

  dictionaries.forEach((dict: any, index: number) => {
    const names = typeof dict?.name === 'string'
      ? [dict.name]
      : Object.values(dict?.name || {}).filter((value): value is string => typeof value === 'string')

    names.forEach((name) => {
      if (!map.has(name)) {
        map.set(name, index)
      }
    })
  })

  return map
})

const getSourcePriority = (sourceBook: string) => {
  return getSourcePriorityMap.value.get(sourceBook) ?? Number.MAX_SAFE_INTEGER
}

const pronunciationGroups = computed<PronunciationGroup[]>(() => {
  const jpMap = new Map<string, DictionaryEntry[]>()
  const entries = wordData.value?.entries || []

  entries.forEach((entry) => {
    const jpKey = getEntryJyutpingKey(entry) || '__no_jp__'
    const list = jpMap.get(jpKey) || []
    list.push(entry)
    jpMap.set(jpKey, list)
  })

  const groups: PronunciationGroup[] = []

  jpMap.forEach((jpEntries, jpKey) => {
    const firstEntry = jpEntries[0]
    const jyutpingList = firstEntry ? getEntryJyutpingList(firstEntry) : []
    const label = jyutpingList.length > 0 ? jyutpingList.join('; ') : '（未標注）'

    const sourceMap = new Map<string, DictionaryEntry[]>()
    jpEntries.forEach((entry) => {
      const sourceBook = entry.source_book?.trim() || 'Unknown'
      const sourceEntries = sourceMap.get(sourceBook) || []
      sourceEntries.push(entry)
      sourceMap.set(sourceBook, sourceEntries)
    })

    const sources: SourceGroup[] = Array.from(sourceMap.entries()).map(([sourceBook, sourceEntries]) => ({
      id: sourceBook,
      sourceBook,
      sourceLabel: getLocalizedSourceBookLabel(sourceBook),
      entries: sourceEntries,
      sourcePriority: getSourcePriority(sourceBook)
    }))

    sources.sort((a, b) => {
      if (a.sourcePriority !== b.sourcePriority) {
        return a.sourcePriority - b.sourcePriority
      }
      return a.sourceLabel.localeCompare(b.sourceLabel, locale.value || undefined)
    })

    groups.push({
      id: jpKey,
      label,
      jyutpingList,
      sources,
      dictionaryCount: sources.length,
      sourcePriority: sources[0]?.sourcePriority ?? Number.MAX_SAFE_INTEGER
    })
  })

  return groups.sort((a, b) => {
    if (a.dictionaryCount !== b.dictionaryCount) {
      return b.dictionaryCount - a.dictionaryCount
    }
    if (a.sourcePriority !== b.sourcePriority) {
      return a.sourcePriority - b.sourcePriority
    }
    return a.label.localeCompare(b.label, locale.value || undefined)
  })
})

const pronunciationTabs = computed(() => pronunciationGroups.value.map(group => ({
  id: group.id,
  label: group.label,
  dictionaryCount: group.dictionaryCount
})))

const activeJyutpingId = ref('')
const selectedSourceByJyutping = ref<Record<string, string>>({})
const mobileExpandedSources = ref<Record<string, string[]>>({})
const applyingRouteState = ref(false)

const getFirstQueryValue = (value: unknown): string => {
  if (Array.isArray(value)) {
    const first = value[0]
    return typeof first === 'string' ? first : ''
  }
  return typeof value === 'string' ? value : ''
}

const ensureTabState = (group: PronunciationGroup, preferredSourceId = '') => {
  const sourceIds = group.sources.map(source => source.id)
  const validPreferred = preferredSourceId && sourceIds.includes(preferredSourceId)
  const currentSelected = selectedSourceByJyutping.value[group.id]

  if (!currentSelected || !sourceIds.includes(currentSelected)) {
    selectedSourceByJyutping.value = {
      ...selectedSourceByJyutping.value,
      [group.id]: validPreferred ? preferredSourceId : (sourceIds[0] || '')
    }
  }

  const currentExpanded = mobileExpandedSources.value[group.id]
  if (!currentExpanded || currentExpanded.length === 0) {
    mobileExpandedSources.value = {
      ...mobileExpandedSources.value,
      [group.id]: [...sourceIds]
    }
  } else {
    const filtered = currentExpanded.filter(sourceId => sourceIds.includes(sourceId))
    mobileExpandedSources.value = {
      ...mobileExpandedSources.value,
      [group.id]: filtered.length > 0 ? filtered : [...sourceIds]
    }
  }
}

const activePronunciationGroup = computed(() => {
  if (pronunciationGroups.value.length === 0) return null
  return pronunciationGroups.value.find(group => group.id === activeJyutpingId.value) || pronunciationGroups.value[0] || null
})

const activeSourceId = computed(() => {
  const group = activePronunciationGroup.value
  if (!group) return ''
  const selected = selectedSourceByJyutping.value[group.id]
  if (selected && group.sources.some(source => source.id === selected)) {
    return selected
  }
  return group.sources[0]?.id || ''
})

const selectedDesktopSourceGroup = computed(() => {
  const group = activePronunciationGroup.value
  if (!group) return null
  return group.sources.find(source => source.id === activeSourceId.value) || group.sources[0] || null
})

const syncRouteQuery = async () => {
  if (applyingRouteState.value) return
  const group = activePronunciationGroup.value
  if (!group) return

  const nextJp = group.id
  const nextSource = activeSourceId.value
  const currentJp = getFirstQueryValue(route.query.jp)
  const currentSource = getFirstQueryValue(route.query.source)

  if (currentJp === nextJp && currentSource === nextSource) return

  const nextQuery = {
    ...route.query,
    jp: nextJp,
    source: nextSource
  }

  await router.replace({ query: nextQuery })
}

const applyRouteState = () => {
  const groups = pronunciationGroups.value
  if (groups.length === 0) {
    activeJyutpingId.value = ''
    return
  }

  applyingRouteState.value = true

  const requestedJp = getFirstQueryValue(route.query.jp)
  const requestedSource = getFirstQueryValue(route.query.source)

  const targetGroup = groups.find(group => group.id === requestedJp) || groups[0]
  if (targetGroup) {
    activeJyutpingId.value = targetGroup.id
    ensureTabState(targetGroup, requestedSource)
  }

  applyingRouteState.value = false
  void syncRouteQuery()
}

const handleTabChange = (tabId: string) => {
  const targetGroup = pronunciationGroups.value.find(group => group.id === tabId)
  if (!targetGroup) return
  activeJyutpingId.value = targetGroup.id
  ensureTabState(targetGroup)
  void syncRouteQuery()
}

const selectDesktopSource = (sourceId: string) => {
  const group = activePronunciationGroup.value
  if (!group || !group.sources.some(source => source.id === sourceId)) return
  selectedSourceByJyutping.value = {
    ...selectedSourceByJyutping.value,
    [group.id]: sourceId
  }
  void syncRouteQuery()
}

const isMobileSourceExpanded = (tabId: string, sourceId: string) => {
  return mobileExpandedSources.value[tabId]?.includes(sourceId) || false
}

const toggleMobileSource = (sourceId: string) => {
  const group = activePronunciationGroup.value
  if (!group) return

  const currentExpanded = mobileExpandedSources.value[group.id]
  const current = currentExpanded
    ? [...currentExpanded]
    : group.sources.map(source => source.id)

  const idx = current.indexOf(sourceId)
  if (idx >= 0) {
    current.splice(idx, 1)
  } else {
    current.push(sourceId)
  }

  mobileExpandedSources.value = {
    ...mobileExpandedSources.value,
    [group.id]: current
  }

  if (current.includes(sourceId)) {
    selectedSourceByJyutping.value = {
      ...selectedSourceByJyutping.value,
      [group.id]: sourceId
    }
  } else if (activeSourceId.value === sourceId) {
    selectedSourceByJyutping.value = {
      ...selectedSourceByJyutping.value,
      [group.id]: current[0] || group.sources[0]?.id || ''
    }
  }

  void syncRouteQuery()
}

const handleSearch = () => {
  const query = searchQuery.value.trim()
  if (!query) return

  const params = new URLSearchParams({ q: query })
  if (enableReverseSearch.value) {
    params.set('reverse', '1')
  }

  optionsExpanded.value = false
  router.push(`/search?${params.toString()}`)
}

watch(requestedHeadword, (headword) => {
  searchQuery.value = headword
})

watch(searchHeadword, () => {
  void refreshBackSearchResultCount()
}, { immediate: true })

onMounted(() => {
  void refreshBackSearchResultCount()
})

watch(pronunciationGroups, () => {
  applyRouteState()
}, { immediate: true })

watch(() => [route.query.jp, route.query.source], () => {
  applyRouteState()
})

const firstDefinition = computed(() => {
  const definition = wordData.value?.entries?.[0]?.senses?.[0]?.definition || ''
  return definition.replace(/\s+/g, ' ').trim().slice(0, 90)
})

const primaryPronunciationLabel = computed(() => pronunciationGroups.value[0]?.label || '')

const primaryDictionaryName = computed(() => {
  const firstSourceLabel = pronunciationGroups.value[0]?.sources[0]?.sourceLabel
  if (firstSourceLabel) return firstSourceLabel

  const fallbackSourceBook = wordData.value?.entries?.[0]?.source_book?.trim()
  return fallbackSourceBook ? getLocalizedSourceBookLabel(fallbackSourceBook) : ''
})

const totalDictionaryCount = computed(() => {
  const sourceBooks = new Set<string>()
  pronunciationGroups.value.forEach((group) => {
    group.sources.forEach((source) => sourceBooks.add(source.id))
  })
  return sourceBooks.size
})

const siteUrl = computed(() => String(config.public.siteUrl || '').replace(/\/+$/, ''))
const canonicalUrl = computed(() => {
  const word = canonicalHeadword.value || requestedHeadword.value
  if (!siteUrl.value || !word) return ''
  return `${siteUrl.value}/word/${encodeURIComponent(word)}`
})

const pageTitle = computed(() => {
  if (!wordData.value) {
    return `${t('common.noResultsTitle')} | ${t('common.siteName')}`
  }
  const jp = primaryPronunciationLabel.value && primaryPronunciationLabel.value !== '（未標注）'
    ? `（${primaryPronunciationLabel.value}）`
    : ''
  return `${canonicalHeadword.value}${jp} 粵語解釋 | ${t('common.siteName')}`
})

const pageDescription = computed(() => {
  if (!wordData.value) {
    return t('common.noResultsDescription')
  }
  const summary = firstDefinition.value || t('common.noDefinition')
  const pronunciationPart = primaryPronunciationLabel.value && primaryPronunciationLabel.value !== '（未標注）'
    ? `（${primaryPronunciationLabel.value}）`
    : ''
  const dictionaryPart = primaryDictionaryName.value ? `${primaryDictionaryName.value}詞義` : '粵語詞義'
  const coveragePart = totalDictionaryCount.value > 1
    ? `，收錄於 ${totalDictionaryCount.value} 本詞典`
    : ''
  return `${canonicalHeadword.value}${pronunciationPart}，${dictionaryPart}${coveragePart}：${summary}`
})

const definedTermData = computed(() => {
  if (!wordData.value || !canonicalUrl.value) return ''
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: canonicalHeadword.value,
    description: pageDescription.value,
    termCode: wordData.value.entries[0]?.id || canonicalHeadword.value,
    url: canonicalUrl.value,
    inDefinedTermSet: {
      '@type': 'DefinedTermSet',
      name: t('common.siteName'),
      url: siteUrl.value
    }
  })
})

const breadcrumbData = computed(() => {
  if (!wordData.value || !siteUrl.value) return ''
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: t('common.siteName'),
        item: siteUrl.value
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: canonicalHeadword.value,
        item: canonicalUrl.value
      }
    ]
  })
})

useHead(() => {
  const meta = [
    { name: 'description', content: pageDescription.value },
    { property: 'og:title', content: pageTitle.value },
    { property: 'og:description', content: pageDescription.value },
    { property: 'og:type', content: 'article' },
    { property: 'og:url', content: canonicalUrl.value || undefined },
    { name: 'twitter:title', content: pageTitle.value },
    { name: 'twitter:description', content: pageDescription.value }
  ]

  if (!wordData.value) {
    meta.push({ name: 'robots', content: 'noindex, nofollow' })
  } else {
    meta.push({ name: 'robots', content: 'index, follow' })
  }

  const scripts: Array<{ type: string; children: string }> = []
  if (definedTermData.value) scripts.push({ type: 'application/ld+json', children: definedTermData.value })
  if (breadcrumbData.value) scripts.push({ type: 'application/ld+json', children: breadcrumbData.value })

  return {
    title: pageTitle.value,
    link: canonicalUrl.value
      ? [{ rel: 'canonical', href: canonicalUrl.value }]
      : [],
    meta,
    script: scripts
  }
})
</script>
