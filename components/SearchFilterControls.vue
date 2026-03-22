<template>
  <div class="flex flex-wrap items-center gap-3">
    <span class="text-sm text-graphite/60 dark:text-stone-500 font-medium">{{ t('common.filterLabel') }}</span>

    <!-- 词典筛选 -->
    <div class="relative">
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
        :class="selectedDict ? 'bg-kapok/10 dark:bg-kapok/20 text-kapok' : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-400 hover:bg-surface-high dark:hover:bg-stone-700'"
        @click="$emit('toggle-dict')">
        <span>{{ selectedDict || t('common.allDictionaries') }}</span>
        <svg class="w-4 h-4" :class="showDictDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showDictDropdown"
        class="absolute top-full left-0 mt-1 bg-parchment dark:bg-stone-900 border border-outline-soft/10 dark:border-stone-800 shadow-lg py-1 z-30 min-w-[180px]">
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="!selectedDict ? 'text-kapok bg-kapok/10 dark:bg-kapok/20' : 'text-graphite dark:text-stone-400'" @click="$emit('select-dict', null)">
          {{ t('common.allDictionaries') }}
        </button>
        <button v-for="dict in availableDicts" :key="dict"
          class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="selectedDict === dict ? 'text-kapok bg-kapok/10 dark:bg-kapok/20' : 'text-graphite dark:text-stone-400'"
          @click="$emit('select-dict', dict)">
          {{ dict }}
          <span class="text-graphite/40 dark:text-stone-600 text-xs ml-1">({{ getDictCount(dict) }})</span>
        </button>
      </div>
    </div>

    <!-- 方言点筛选 -->
    <div class="relative">
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
        :class="selectedDialect ? 'bg-archive-green/10 dark:bg-archive-green/20 text-archive-green' : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-400 hover:bg-surface-high dark:hover:bg-stone-700'"
        @click="$emit('toggle-dialect')">
        <span>{{ selectedDialect ? getDialectLabel(selectedDialect) : t('common.allDialects') }}</span>
        <svg class="w-4 h-4" :class="showDialectDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showDialectDropdown"
        class="absolute top-full left-0 mt-1 bg-parchment dark:bg-stone-900 border border-outline-soft/10 dark:border-stone-800 shadow-lg py-1 z-30 min-w-[140px]">
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="!selectedDialect ? 'text-archive-green bg-archive-green/10 dark:bg-archive-green/20' : 'text-graphite dark:text-stone-400'" @click="$emit('select-dialect', null)">
          {{ t('common.allDialects') }}
        </button>
        <button v-for="dialect in availableDialects" :key="dialect"
          class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="selectedDialect === dialect ? 'text-archive-green bg-archive-green/10 dark:bg-archive-green/20' : 'text-graphite dark:text-stone-400'"
          @click="$emit('select-dialect', dialect)">
          {{ getDialectLabel(dialect) }}
          <span class="text-graphite/40 dark:text-stone-600 text-xs ml-1">({{ getDialectCount(dialect) }})</span>
        </button>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div class="relative">
      <button class="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors"
        :class="selectedType ? 'bg-muted-gold/10 dark:bg-muted-gold/20 text-muted-gold' : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-400 hover:bg-surface-high dark:hover:bg-stone-700'"
        @click="$emit('toggle-type')">
        <span>{{ selectedType ? getTypeName(selectedType) : t('common.allTypes') }}</span>
        <svg class="w-4 h-4" :class="showTypeDropdown ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div v-if="showTypeDropdown"
        class="absolute top-full left-0 mt-1 bg-parchment dark:bg-stone-900 border border-outline-soft/10 dark:border-stone-800 shadow-lg py-1 z-30 min-w-[120px]">
        <button class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="!selectedType ? 'text-muted-gold bg-muted-gold/10 dark:bg-muted-gold/20' : 'text-graphite dark:text-stone-400'" @click="$emit('select-type', null)">
          {{ t('common.allTypes') }}
        </button>
        <button v-for="type in availableTypes" :key="type"
          class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="selectedType === type ? 'text-muted-gold bg-muted-gold/10 dark:bg-muted-gold/20' : 'text-graphite dark:text-stone-400'"
          @click="$emit('select-type', type)">
          {{ getTypeName(type) }}
          <span class="text-graphite/40 dark:text-stone-600 text-xs ml-1">({{ getTypeCount(type) }})</span>
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
