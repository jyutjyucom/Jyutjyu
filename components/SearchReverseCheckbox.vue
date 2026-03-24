<template>
  <label
    class="flex items-center gap-2 cursor-pointer whitespace-nowrap select-none"
    :title="t('common.reverseSearchTooltip')"
  >
    <input
      :checked="modelValue"
      type="checkbox"
      class="w-4 h-4 text-kapok rounded focus:ring-kapok accent-kapok"
      @change="
        $emit('update:modelValue', ($event.target as HTMLInputElement).checked)
      "
    />
    <span class="text-sm text-graphite dark:text-stone-100">{{
      t("common.reverseSearchShort")
    }}</span>
  </label>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean }>();
defineEmits<{ "update:modelValue": [value: boolean] }>();
const { t } = useI18n();
</script>
