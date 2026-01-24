<template>
  <div class="space-y-4">
    <!-- 完全匹配的结果（仅文字搜索时显示） -->
    <template v-if="isTextSearch && displayedGroupedResults.exactMatches.length > 0">
      <div
        class="mb-6 p-3 border-l-4 bg-green-50 border-green-400 rounded-r-lg flex items-center gap-2 shadow-sm"
      >
        <svg class="w-4 h-4 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-green-800 text-sm font-semibold">
          {{ t('common.exactMatchLabel') }}
          <span class="ml-1 px-1.5 py-0.5 bg-green-100 rounded text-green-900">{{
            groupedResults.exactMatches.length
          }}</span>
          {{ t('common.remainingSuffix') }}
        </span>
      </div>
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-400">
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
            <tbody class="bg-white divide-y divide-gray-200">
              <template v-for="group in displayedGroupedResults.exactMatches" :key="group.key">
                <tr
                  class="hover:bg-gray-50 cursor-pointer transition-colors"
                  @click="toggleRow(group.key)"
                >
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="text-base font-semibold text-gray-900">
                      {{ group.primary.headword.display }}
                    </div>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="text-base font-mono font-semibold text-blue-600">
                      {{ getGroupJyutping(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-base text-gray-700 line-clamp-2">
                      {{ getGroupDefinitions(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="source in getGroupSources(group)"
                        :key="source"
                        class="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded-full"
                      >
                        {{ source }}
                      </span>
                    </div>
                  </td>
                </tr>
                <!-- 展开详情 -->
                <tr v-if="expandedRow === group.key" :key="`${group.key}-detail`">
                  <td colspan="4" class="px-3 py-3 py-2 bg-gray-50">
                    <DictCardGroup :entries="group.entries" :show-details="false" />
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
        class="mb-6 p-3 border-l-4 bg-blue-50 border-blue-400 rounded-r-lg flex items-center gap-2 shadow-sm"
        :class="{ 'mt-12': isTextSearch && displayedGroupedResults.exactMatches.length > 0 }"
      >
        <svg class="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span v-if="isTextSearch && sortBy === 'relevance'" class="text-blue-800 text-sm font-semibold">
          {{ t('common.otherResultsLabel') }}
          <span class="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{{
            groupedResults.otherResults.length
          }}</span>
          {{ t('common.remainingSuffix') }}
        </span>
        <span v-else class="text-blue-800 text-sm font-semibold">
          {{ t('common.searchHeader') }}
          <span class="ml-1 px-1.5 py-0.5 bg-blue-100 rounded text-blue-900">{{
            groupedResults.otherResults.length
          }}</span>
          {{ t('common.remainingSuffix') }}
        </span>
      </div>
      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 border-b border-gray-400">
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
            <tbody class="bg-white divide-y divide-gray-200 ">
              <template v-for="group in displayedGroupedResults.otherResults" :key="group.key">
                <tr
                  class="hover:bg-gray-50 cursor-pointer transition-colors"
                  @click="toggleRow(group.key)"
                >
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="text-base font-semibold text-gray-900">
                      {{ group.primary.headword.display }}
                    </div>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="text-base font-mono font-semibold text-blue-600">
                      {{ getGroupJyutping(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <div class="text-base text-gray-700 line-clamp-2">
                      {{ getGroupDefinitions(group) || '-' }}
                    </div>
                  </td>
                  <td class="px-3 whitespace-nowrap py-2">
                    <div class="flex flex-wrap gap-1">
                      <span
                        v-for="source in getGroupSources(group)"
                        :key="source"
                        class="px-2 py-1 text-sm bg-blue-50 text-blue-700 rounded-full"
                      >
                        {{ source }}
                      </span>
                    </div>
                  </td>
                </tr>
                <!-- 展开详情 -->
                <tr v-if="expandedRow === group.key" :key="`${group.key}-detail`">
                  <td colspan="4" class="px-3 py-3 py-2 bg-gray-50">
                    <DictCardGroup :entries="group.entries" :show-details="false" />
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
  expandedRow: string | null
  getGroupJyutping: (group: AggregatedEntryGroup) => string
  getGroupDefinitions: (group: AggregatedEntryGroup) => string
  getGroupSources: (group: AggregatedEntryGroup) => string[]
}

const props = defineProps<Props>()
const emit = defineEmits<{
  (event: 'update:expandedRow', value: string | null): void
}>()

const toggleRow = (key: string) => {
  emit('update:expandedRow', props.expandedRow === key ? null : key)
}
</script>
