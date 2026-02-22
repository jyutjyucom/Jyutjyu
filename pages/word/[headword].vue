<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <AppHeader
      v-model:search-query="searchQuery"
      v-model:reverse-search="enableReverseSearch"
      v-model:options-expanded="optionsExpanded"
      @search="handleSearch"
      @height-change="appHeaderHeight = $event"
    />

    <main class="container mx-auto px-4 py-8">
      <div v-if="pending" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p class="text-gray-600 dark:text-gray-300 mt-4">{{ t('common.loading') }}</p>
      </div>

      <div v-else-if="!wordData" class="text-center py-16">
        <div class="text-6xl mb-4">🔍</div>
        <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {{ t('common.noResultsTitle') }}
        </h1>
        <p class="text-gray-600 dark:text-gray-300 mb-6">
          {{ t('common.noResultsDescription') }}
        </p>
        <NuxtLink
          :to="searchLink"
          class="inline-flex px-5 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          {{ t('common.searchButton') }}
        </NuxtLink>
      </div>

      <div v-else class="space-y-6">
        <div>
          <NuxtLink
            :to="searchLink"
            class="inline-flex items-center gap-1.5 mb-3 text-base font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ `返去 ${searchResultCount} 條搜尋結果` }}
          </NuxtLink>
          <h1 class="mt-4 mx-2 text-4xl font-bold text-gray-900 dark:text-gray-100 break-words">
            {{ wordData.canonical_headword }}
          </h1>
        </div>

        <WordPronunciationTabs
          v-if="pronunciationTabs.length > 0"
          :model-value="activeJyutpingId"
          :tabs="pronunciationTabs"
          :sticky-offset="appHeaderHeight"
          aria-label="Jyutping tabs"
          @update:model-value="handleTabChange"
        />

        <div v-if="activePronunciationGroup" class="space-y-4">
          <p class="text-sm text-gray-600 dark:text-gray-300">
            <span class="font-mono text-base md:text-xl text-blue-700 dark:text-blue-300 font-semibold leading-none">
              {{ activePronunciationGroup.label }}
            </span>
            <span class="mx-2 text-gray-400 dark:text-gray-500">·</span>
            {{ t('dictCard.collectedBy', { count: activePronunciationGroup.dictionaryCount }) }}
          </p>

          <div class="hidden lg:grid lg:grid-cols-12 gap-4">
            <aside class="lg:col-span-4 xl:col-span-3">
              <div class="rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm dark:shadow-black/20">
                <button
                  v-for="source in activePronunciationGroup.sources"
                  :key="`${activePronunciationGroup.id}:${source.id}`"
                  type="button"
                  class="w-full px-4 py-3 text-left border-b last:border-b-0 border-gray-100 dark:border-gray-700 transition-colors"
                  :class="activeSourceId === source.id
                    ? 'bg-blue-50 dark:bg-blue-900/20'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'"
                  @click="selectDesktopSource(source.id)"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="font-medium text-sm break-words"
                      :class="activeSourceId === source.id
                        ? 'text-blue-700 dark:text-blue-300'
                        : 'text-gray-800 dark:text-gray-100'"
                    >
                      {{ source.sourceLabel }}
                    </span>
                    <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                      {{ source.entries.length }} 義項
                    </span>
                  </div>
                </button>
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
          class="text-center py-12 text-gray-500 dark:text-gray-400"
        >
          {{ t('common.noResultsDescription') }}
        </div>
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

const normalizeComparable = (value: string) => value.replace(/\s+/g, ' ').trim().toLowerCase()
const cleanHeadword = (value: string) => value.replace(/\s+/g, ' ').trim()

const requestedHeadword = computed(() => cleanHeadword(String(route.params.headword || '')))
const searchQuery = ref(requestedHeadword.value)
const enableReverseSearch = ref(false)
const optionsExpanded = ref(false)
const appHeaderHeight = ref(0)

const { data, pending } = await useFetch<WordResponse>(() => `/api/word/${encodeURIComponent(requestedHeadword.value)}`, {
  key: () => `word:${requestedHeadword.value}`,
  server: true
})

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

if (wordData.value && shouldRedirect.value) {
  await navigateTo(`/word/${encodeURIComponent(canonicalHeadword.value)}`, {
    redirectCode: 301,
    replace: true
  })
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

const groupedEntries = computed(() => aggregateEntries(wordData.value?.entries || []))
const searchResultCount = computed(() => groupedEntries.value.length)

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

watch(pronunciationGroups, () => {
  applyRouteState()
}, { immediate: true })

watch(() => [route.query.jp, route.query.source], () => {
  applyRouteState()
})

const firstDefinition = computed(() => {
  const definition = wordData.value?.entries?.[0]?.senses?.[0]?.definition || ''
  return definition.replace(/\s+/g, ' ').trim().slice(0, 120)
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
  return `${canonicalHeadword.value} | ${t('common.siteName')}`
})

const pageDescription = computed(() => {
  if (!wordData.value) {
    return t('common.noResultsDescription')
  }
  const summary = firstDefinition.value || t('common.noDefinition')
  return `${canonicalHeadword.value}：${summary}`
})

const structuredData = computed(() => {
  if (!wordData.value || !canonicalUrl.value) return ''
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'DefinedTerm',
    name: canonicalHeadword.value,
    description: firstDefinition.value || t('common.noDefinition'),
    termCode: wordData.value.entries[0]?.id || canonicalHeadword.value,
    url: canonicalUrl.value
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

  return {
    title: pageTitle.value,
    link: canonicalUrl.value
      ? [{ rel: 'canonical', href: canonicalUrl.value }]
      : [],
    meta,
    script: structuredData.value
      ? [{ type: 'application/ld+json', children: structuredData.value }]
      : []
  }
})
</script>
