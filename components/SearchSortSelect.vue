<template>
  <div class="flex items-center gap-2">
    <span
      class="text-xs sm:text-sm text-graphite/60 dark:text-stone-100 font-medium"
      >{{ t("common.sortLabel") }}</span
    >
    <div class="relative">
      <button
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm transition-colors"
        :class="
          disabled
            ? 'bg-surface-low/60 dark:bg-stone-800/60 text-graphite/40 dark:text-stone-300/50 cursor-not-allowed'
            : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-100 hover:bg-surface-high dark:hover:bg-stone-700'
        "
        :disabled="disabled"
        @click.stop="$emit('toggle-sort')"
      >
        <span>{{ getSortLabel(sortBy) }}</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="showSortDropdown ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      <div
        v-if="showSortDropdown"
        class="absolute top-full mt-1 bg-parchment dark:bg-stone-900 border border-outline-soft/10 dark:border-stone-800 shadow-lg py-1 z-30 min-w-[140px]"
        :class="dropdownAlign === 'right' ? 'right-0' : 'left-0'"
      >
        <button
          v-for="sort in ['relevance', 'jyutping', 'headword', 'dictionary']"
          :key="sort"
          class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
          :class="
            sortBy === sort
              ? 'text-kapok font-semibold bg-kapok/10 dark:bg-kapok/20'
              : 'text-graphite dark:text-stone-100'
          "
          @click="$emit('select-sort', sort as any)"
        >
          {{ getSortLabel(sort) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
type SortOption = "relevance" | "jyutping" | "headword" | "dictionary";

withDefaults(
  defineProps<{
    sortBy: SortOption;
    showSortDropdown: boolean;
    getSortLabel: (sort: string) => string;
    dropdownAlign?: "left" | "right";
    disabled?: boolean;
  }>(),
  { dropdownAlign: "left" },
);

defineEmits<{
  "toggle-sort": [];
  "select-sort": [sort: SortOption];
}>();
</script>
