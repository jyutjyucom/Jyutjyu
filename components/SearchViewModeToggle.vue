<template>
  <div class="inline-flex border border-outline-soft/20 dark:border-stone-700">
    <button
      class="text-xs sm:text-sm font-medium transition-colors"
      :class="[modelValue === 'card' ? 'bg-kapok text-white' : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-100 hover:bg-surface-high dark:hover:bg-stone-700', compact ? 'px-3 py-1.5' : 'px-4 py-2']"
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
      class="text-sm font-medium transition-colors border-l border-outline-soft/20 dark:border-stone-700"
      :class="[modelValue === 'list' ? 'bg-kapok text-white' : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-100 hover:bg-surface-high dark:hover:bg-stone-700', compact ? 'px-3 py-1.5' : 'px-4 py-2']"
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
