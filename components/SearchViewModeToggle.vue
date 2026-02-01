<template>
  <div class="inline-flex rounded-lg border border-gray-300 dark:border-gray-600">
    <button
      class="text-sm font-medium transition-colors"
      :class="[modelValue === 'card' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700', compact ? 'px-3 py-1.5' : 'px-4 py-2']"
      @click="$emit('update:modelValue', 'card')">
      <span v-if="showIcons" class="flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
        {{ t('common.cardView') }}
      </span>
      <span v-else>{{ t('common.cardView') }}</span>
    </button>
    <button
      class="text-sm font-medium transition-colors border-l border-gray-300 dark:border-gray-600"
      :class="[modelValue === 'list' ? 'bg-blue-500 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700', compact ? 'px-3 py-1.5' : 'px-4 py-2']"
      @click="$emit('update:modelValue', 'list')">
      <span v-if="showIcons" class="flex items-center gap-2">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        {{ t('common.listView') }}
      </span>
      <span v-else>{{ t('common.listView') }}</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

withDefaults(defineProps<{
  modelValue: 'card' | 'list'
  compact?: boolean
  showIcons?: boolean
}>(), { compact: false, showIcons: true })

defineEmits<{ 'update:modelValue': [value: 'card' | 'list'] }>()
</script>
