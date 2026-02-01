<template>
  <label class="flex items-center gap-2 cursor-pointer whitespace-nowrap select-none" title="反查：从释义中搜索词语">
    <input :checked="modelValue" type="checkbox"
      class="w-4 h-4 text-blue-600 dark:text-blue-400 rounded focus:ring-blue-500 dark:focus:ring-blue-400"
      @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)">
    <span class="text-sm text-gray-600 dark:text-gray-300">{{ t('common.reverseSearchShort') }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
const { t } = useI18n()
</script>
