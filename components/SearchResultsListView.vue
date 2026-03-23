<template>
  <div class="space-y-4">
    <!-- 完全匹配的结果（仅文字搜索时显示） -->
    <template v-if="isTextSearch && displayedGroupedResults.exactMatches.length > 0">
      <div
        class="mb-6 p-3 border-l-4 bg-archive-green/10 dark:bg-emerald-900/30 border-archive-green dark:border-emerald-500/50 flex items-center gap-2">
        <svg class="w-4 h-4 text-archive-green dark:text-emerald-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-archive-green dark:text-emerald-300 text-sm font-semibold">
          {{ t('common.exactMatchLabel') }}
          {{
            groupedResults.exactMatches.length
          }}
          {{ t('common.remainingSuffix') }}
          ，{{ t('dictCard.collectedBy', { count: exactMatchDictionaryCount }) }}
        </span>
      </div>
      <!-- Mobile: compact cards -->
      <div class="md:hidden space-y-2">
        <div
          v-for="group in displayedGroupedResults.exactMatches"
          :key="group.key"
          class="bg-surface-low dark:bg-stone-900 px-3 py-2.5 cursor-pointer hover:bg-surface-high dark:hover:bg-stone-800 transition-colors"
          role="link" tabindex="0"
          @click="openWordPage(group)" @keydown.enter.prevent="openWordPage(group)"
        >
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-base font-semibold text-ink dark:text-parchment">{{ group.primary.headword.display }}</span>
            <span class="text-sm font-semibold text-kapok">{{ getGroupJyutping(group) }}</span>
          </div>
          <p class="text-sm text-ink/70 dark:text-stone-400 line-clamp-1">{{ getGroupDefinitions(group) }}</p>
          <div class="flex flex-wrap gap-1 mt-1">
            <span v-for="source in getGroupSources(group)" :key="source" class="px-1.5 py-0.5 text-xs bg-kapok/10 dark:bg-kapok/20 text-kapok">{{ source }}</span>
          </div>
        </div>
      </div>
      <!-- Desktop: table -->
      <div class="hidden md:block bg-surface-low dark:bg-stone-900 overflow-hidden">
        <table class="w-full">
          <thead class="bg-surface-high dark:bg-stone-800">
            <tr>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.wordColumn') }}</th>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.jyutpingColumn') }}</th>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.definitionColumn') }}</th>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.sourceColumn') }}</th>
            </tr>
          </thead>
          <tbody class="bg-surface-low dark:bg-stone-900 divide-y divide-outline-soft/20 dark:divide-stone-800">
            <template v-for="group in displayedGroupedResults.exactMatches" :key="group.key">
              <tr class="hover:bg-surface-high dark:hover:bg-stone-800 cursor-pointer transition-colors" role="link" tabindex="0" @click="openWordPage(group)" @keydown.enter.prevent="openWordPage(group)">
                <td class="px-3 whitespace-nowrap py-2"><NuxtLink :to="getWordPath(group)" class="text-lg font-semibold text-ink dark:text-parchment hover:text-kapok transition-colors" @click.stop>{{ group.primary.headword.display }}</NuxtLink></td>
                <td class="px-3 whitespace-nowrap py-2"><div class="text-lg font-semibold text-kapok">{{ getGroupJyutping(group) || '-' }}</div></td>
                <td class="px-3 py-2"><div class="text-base text-ink/80 dark:text-stone-300 line-clamp-2">{{ getGroupDefinitions(group) || '-' }}</div></td>
                <td class="px-3 whitespace-nowrap py-2"><div class="flex flex-wrap gap-1"><span v-for="source in getGroupSources(group)" :key="source" class="px-2 py-1 text-sm bg-kapok/10 dark:bg-kapok/20 text-kapok rounded-md">{{ source }}</span></div></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>

    <!-- 其他相关结果 -->
    <template v-if="displayedGroupedResults.otherResults.length > 0">
      <div
        class="mb-6 p-3 border-l-4 bg-muted-gold/10 dark:bg-amber-900/30 border-muted-gold dark:border-amber-500/50 flex items-center gap-2"
        :class="{ 'mt-12': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }">
        <svg class="w-4 h-4 text-muted-gold dark:text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span v-if="isTextSearch && sortBy === 'relevance'"
          class="text-muted-gold dark:text-amber-300 text-sm font-semibold">
          {{ t('common.otherResultsLabel') }}
          {{ groupedResults.otherResults.length }}
          {{ t('common.remainingSuffix') }}
          ，{{ t('dictCard.collectedBy', { count: otherResultsDictionaryCount }) }}
        </span>
        <span v-else class="text-muted-gold dark:text-amber-300 text-sm font-semibold">
          {{ t('common.searchHeader') }}
          <span class="ml-1 px-1.5 py-0.5 bg-muted-gold/10 dark:bg-amber-900/30 text-muted-gold dark:text-amber-300">{{
            groupedResults.otherResults.length
          }}</span>
          {{ t('common.remainingSuffix') }}
          ，{{ t('dictCard.collectedBy', { count: otherResultsDictionaryCount }) }}
        </span>
      </div>
      <!-- Mobile: compact cards -->
      <div class="md:hidden space-y-2">
        <div
          v-for="group in displayedGroupedResults.otherResults"
          :key="group.key"
          class="bg-surface-low dark:bg-stone-900 px-3 py-2.5 cursor-pointer hover:bg-surface-high dark:hover:bg-stone-800 transition-colors"
          role="link" tabindex="0"
          @click="openWordPage(group)" @keydown.enter.prevent="openWordPage(group)"
        >
          <div class="flex items-baseline gap-2 mb-1">
            <span class="text-base font-semibold text-ink dark:text-parchment">{{ group.primary.headword.display }}</span>
            <span class="text-sm font-semibold text-kapok">{{ getGroupJyutping(group) }}</span>
          </div>
          <p class="text-sm text-ink/70 dark:text-stone-400 line-clamp-1">{{ getGroupDefinitions(group) }}</p>
          <div class="flex flex-wrap gap-1 mt-1">
            <span v-for="source in getGroupSources(group)" :key="source" class="px-1.5 py-0.5 text-xs bg-kapok/10 dark:bg-kapok/20 text-kapok">{{ source }}</span>
          </div>
        </div>
      </div>
      <!-- Desktop: table -->
      <div class="hidden md:block bg-surface-low dark:bg-stone-900 overflow-hidden">
        <table class="w-full">
          <thead class="bg-surface-low dark:bg-stone-800 border-b border-outline-soft/20 dark:border-stone-700">
            <tr>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.wordColumn') }}</th>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.jyutpingColumn') }}</th>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.definitionColumn') }}</th>
              <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2 text-ink dark:text-parchment">{{ t('common.sourceColumn') }}</th>
            </tr>
          </thead>
          <tbody class="bg-surface-low dark:bg-stone-900 divide-y divide-outline-soft/20 dark:divide-stone-800">
            <template v-for="group in displayedGroupedResults.otherResults" :key="group.key">
              <tr class="hover:bg-surface-high dark:hover:bg-stone-800 cursor-pointer transition-colors" role="link" tabindex="0" @click="openWordPage(group)" @keydown.enter.prevent="openWordPage(group)">
                <td class="px-3 whitespace-nowrap py-2"><NuxtLink :to="getWordPath(group)" class="text-base font-semibold text-ink dark:text-parchment hover:text-kapok transition-colors" @click.stop>{{ group.primary.headword.display }}</NuxtLink></td>
                <td class="px-3 whitespace-nowrap py-2"><div class="text-base font-semibold text-kapok">{{ getGroupJyutping(group) || '-' }}</div></td>
                <td class="px-3 py-2"><div class="text-base text-ink/80 dark:text-stone-300 line-clamp-2">{{ getGroupDefinitions(group) || '-' }}</div></td>
                <td class="px-3 whitespace-nowrap py-2"><div class="flex flex-wrap gap-1"><span v-for="source in getGroupSources(group)" :key="source" class="px-2 py-1 text-sm bg-kapok/10 dark:bg-kapok/20 text-kapok rounded-md">{{ source }}</span></div></td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'

const { t } = useI18n()
const router = useRouter()

interface AggregatedEntryGroup {
  key: string
  primary: DictionaryEntry
  entries: DictionaryEntry[]
}

interface GroupedResults {
  exactMatches: AggregatedEntryGroup[]
  otherResults: AggregatedEntryGroup[]
}

interface Props {
  isTextSearch: boolean
  sortBy: string
  groupedResults: GroupedResults
  displayedGroupedResults: GroupedResults
  getGroupJyutping: (group: AggregatedEntryGroup) => string
  getGroupDefinitions: (group: AggregatedEntryGroup) => string
  getGroupSources: (group: AggregatedEntryGroup) => string[]
}

const props = defineProps<Props>()

const exactMatchDictionaryCount = computed(() => {
  const sources = new Set<string>()
  props.groupedResults.exactMatches.forEach((group) => {
    group.entries.forEach((entry) => {
      const source = entry.source_book?.trim()
      if (source) sources.add(source)
    })
  })
  return sources.size
})

const otherResultsDictionaryCount = computed(() => {
  const sources = new Set<string>()
  props.groupedResults.otherResults.forEach((group) => {
    group.entries.forEach((entry) => {
      const source = entry.source_book?.trim()
      if (source) sources.add(source)
    })
  })
  return sources.size
})

const getWordPath = (group: AggregatedEntryGroup): string => {
  const word = group.primary.headword.display?.trim()
  if (!word) return '/search'
  return `/word/${encodeURIComponent(word)}`
}

const openWordPage = (group: AggregatedEntryGroup) => {
  const path = getWordPath(group)
  if (!path || path === '/search') return
  router.push(path)
}
</script>
