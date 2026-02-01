<template>
  <div class="flex items-center gap-2">
    <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">{{ t('common.sortLabel') }}</span>
    <div class="relative">
      <button
      class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
      @click.stop="$emit('toggle-sort')">
      <span>{{ getSortLabel(sortBy) }}</span>
      <svg class="w-4 h-4 transition-transform" :class="showSortDropdown ? 'rotate-180' : ''" fill="none"
        stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
      </button>
      <div v-if="showSortDropdown"
        class="absolute top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 z-30 min-w-[140px]"
        :class="dropdownAlign === 'right' ? 'right-0' : 'left-0'">
        <button v-for="sort in ['relevance', 'jyutping', 'headword', 'dictionary']" :key="sort"
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="sortBy === sort ? 'text-blue-600 dark:text-blue-300 font-semibold bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'"
          @click="$emit('select-sort', sort as any)">
          {{ getSortLabel(sort) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()
type SortOption = 'relevance' | 'jyutping' | 'headword' | 'dictionary'

withDefaults(defineProps<{
  sortBy: SortOption
  showSortDropdown: boolean
  getSortLabel: (sort: string) => string
  dropdownAlign?: 'left' | 'right'
}>(), { dropdownAlign: 'left' })

defineEmits<{
  'toggle-sort': []
  'select-sort': [sort: SortOption]
}>()
</script>
