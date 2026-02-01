<template>
  <div class="flex flex-wrap items-center gap-3">
    <span class="text-sm text-gray-500 dark:text-gray-400 font-medium">{{ t('common.filterLabel') }}</span>

    <!-- 词典筛选 -->
    <div class="relative">
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
        :class="selectedDict ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        @click="$emit('toggle-dict')">
        <span>{{ selectedDict || t('common.allDictionaries') }}</span>
        <svg class="w-4 h-4" :class="showDictDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showDictDropdown"
        class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30 min-w-[180px]">
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="!selectedDict ? 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'" @click="$emit('select-dict', null)">
          {{ t('common.allDictionaries') }}
        </button>
        <button v-for="dict in availableDicts" :key="dict"
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="selectedDict === dict ? 'text-blue-600 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30' : 'text-gray-700 dark:text-gray-300'"
          @click="$emit('select-dict', dict)">
          {{ dict }}
          <span class="text-gray-400 dark:text-gray-500 text-xs ml-1">({{ getDictCount(dict) }})</span>
        </button>
      </div>
    </div>

    <!-- 方言点筛选 -->
    <div class="relative">
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
        :class="selectedDialect ? 'bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-600 text-green-700 dark:text-green-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        @click="$emit('toggle-dialect')">
        <span>{{ selectedDialect ? getDialectLabel(selectedDialect) : t('common.allDialects') }}</span>
        <svg class="w-4 h-4" :class="showDialectDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showDialectDropdown"
        class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30 min-w-[140px]">
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="!selectedDialect ? 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30' : 'text-gray-700 dark:text-gray-300'" @click="$emit('select-dialect', null)">
          {{ t('common.allDialects') }}
        </button>
        <button v-for="dialect in availableDialects" :key="dialect"
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="selectedDialect === dialect ? 'text-green-600 dark:text-green-300 bg-green-50 dark:bg-green-900/30' : 'text-gray-700 dark:text-gray-300'"
          @click="$emit('select-dialect', dialect)">
          {{ getDialectLabel(dialect) }}
          <span class="text-gray-400 dark:text-gray-500 text-xs ml-1">({{ getDialectCount(dialect) }})</span>
        </button>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="relative">
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border transition-colors"
        :class="selectedType ? 'bg-amber-50 dark:bg-amber-900/30 border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-300' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'"
        @click="$emit('toggle-type')">
        <span>{{ selectedType ? getTypeName(selectedType) : t('common.allTypes') }}</span>
        <svg class="w-4 h-4" :class="showTypeDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showTypeDropdown"
        class="absolute top-full left-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-30 min-w-[120px]">
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="!selectedType ? 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30' : 'text-gray-700 dark:text-gray-300'" @click="$emit('select-type', null)">
          {{ t('common.allTypes') }}
        </button>
        <button v-for="type in availableTypes" :key="type"
          class="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          :class="selectedType === type ? 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30' : 'text-gray-700 dark:text-gray-300'"
          @click="$emit('select-type', type)">
          {{ getTypeName(type) }}
          <span class="text-gray-400 dark:text-gray-500 text-xs ml-1">({{ getTypeCount(type) }})</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

defineProps<{
  selectedDict: string | null
  selectedDialect: string | null
  selectedType: string | null
  showDictDropdown: boolean
  showDialectDropdown: boolean
  showTypeDropdown: boolean
  availableDicts: string[]
  availableDialects: string[]
  availableTypes: string[]
  getDictCount: (dict: string) => number
  getDialectCount: (dialect: string) => number
  getTypeCount: (type: string) => number
  getDialectLabel: (code: string) => string
  getTypeName: (type: string) => string
}>()

defineEmits<{
  'toggle-dict': []
  'toggle-dialect': []
  'toggle-type': []
  'select-dict': [dict: string | null]
  'select-dialect': [dialect: string | null]
  'select-type': [type: string | null]
}>()
</script>
