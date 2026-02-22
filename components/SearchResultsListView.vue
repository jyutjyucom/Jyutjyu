<template>
  <div class="space-y-4">
    <!-- 完全匹配的结果（仅文字搜索时显示） -->
    <template v-if="isTextSearch && displayedGroupedResults.exactMatches.length > 0">
      <div
        class="mb-6 p-3 border-l-4 bg-green-50 dark:bg-green-900/20 border-green-400 dark:border-green-600 rounded-r-lg flex items-center gap-2">
        <svg class="w-4 h-4 text-green-700 dark:text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-green-800 dark:text-green-200 text-sm font-semibold">
          {{ t('common.exactMatchLabel') }}
          {{
            groupedResults.exactMatches.length
          }}
          {{ t('common.remainingSuffix') }}
          ，{{ t('dictCard.collectedBy', { count: exactMatchDictionaryCount }) }}
        </span>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-blue-100 dark:bg-blue-800">
              <tr>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.wordColumn') }}
                </th>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.jyutpingColumn') }}
                </th>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.definitionColumn') }}
                </th>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.sourceColumn') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <template v-for="group in displayedGroupedResults.exactMatches" :key="group.key">
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors" role="link"
                  tabindex="0" @click="openWordPage(group)" @keydown.enter.prevent="openWordPage(group)">
                  <td class="px-3 whitespace-nowrap py-2">
                    <NuxtLink
                      :to="getWordPath(group)"
                      class="text-lg font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      @click.stop
                    >
                      {{ group.primary.headword.display }}
                    </NuxtLink>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="text-lg font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {{ getGroupJyutping(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-base text-gray-700 dark:text-gray-300 line-clamp-2">
                      {{ getGroupDefinitions(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="flex flex-wrap gap-1">
                      <span v-for="source in getGroupSources(group)" :key="source"
                        class="px-2 py-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                        {{ source }}
                      </span>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </template>

    <!-- 其他相关结果 -->
    <template v-if="displayedGroupedResults.otherResults.length > 0">
      <div
        class="mb-6 p-3 border-l-4 bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 rounded-r-lg flex items-center gap-2 shadow-sm"
        :class="{ 'mt-12': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }">
        <svg class="w-4 h-4 text-blue-700 dark:text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span v-if="isTextSearch && sortBy === 'relevance'"
          class="text-blue-800 dark:text-blue-200 text-sm font-semibold">
          {{ t('common.otherResultsLabel') }}
          {{ groupedResults.otherResults.length }}
          {{ t('common.remainingSuffix') }}
          ，{{ t('dictCard.collectedBy', { count: otherResultsDictionaryCount }) }}
        </span>
        <span v-else class="text-blue-800 dark:text-blue-200 text-sm font-semibold">
          {{ t('common.searchHeader') }}
          <span class="ml-1 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 rounded text-blue-900 dark:text-blue-200">{{
            groupedResults.otherResults.length
          }}</span>
          {{ t('common.remainingSuffix') }}
          ，{{ t('dictCard.collectedBy', { count: otherResultsDictionaryCount }) }}
        </span>
      </div>
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-400 dark:border-gray-600">
              <tr>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.wordColumn') }}
                </th>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.jyutpingColumn') }}
                </th>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.definitionColumn') }}
                </th>
                <th class="px-3 text-left text-base font-medium uppercase tracking-wider py-2">
                  {{ t('common.sourceColumn') }}
                </th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <template v-for="group in displayedGroupedResults.otherResults" :key="group.key">
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors" role="link"
                  tabindex="0" @click="openWordPage(group)" @keydown.enter.prevent="openWordPage(group)">
                  <td class="px-3 whitespace-nowrap py-2">
                    <NuxtLink
                      :to="getWordPath(group)"
                      class="text-base font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      @click.stop
                    >
                      {{ group.primary.headword.display }}
                    </NuxtLink>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="text-base font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {{ getGroupJyutping(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-base text-gray-700 dark:text-gray-300 line-clamp-2">
                      {{ getGroupDefinitions(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="flex flex-wrap gap-1">
                      <span v-for="source in getGroupSources(group)" :key="source"
                        class="px-2 py-1 text-sm bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                        {{ source }}
                      </span>
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
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
