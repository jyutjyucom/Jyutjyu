<template>
  <div class="flex flex-wrap items-center gap-2 sm:gap-3" data-search-interactive>
    <span
      class="text-xs sm:text-sm text-graphite/60 dark:text-stone-100 font-medium"
      >{{ t("common.filterLabel") }}</span
    >

    <!-- 词典筛选 -->
    <div>
      <button
        ref="dictTriggerEl"
        type="button"
        :popovertarget="dictPopoverId"
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm transition-colors"
        :class="
          disabled
            ? 'bg-surface-low/60 dark:bg-stone-800/60 text-graphite/40 dark:text-stone-300/50 cursor-not-allowed'
            : selectedDict
              ? 'bg-kapok/10 dark:bg-kapok/20 text-kapok'
              : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-100 hover:bg-surface-high dark:hover:bg-stone-700'
        "
        :disabled="disabled"
        :aria-expanded="openPopover === 'dict'"
        :aria-controls="dictPopoverId"
      >
        <span>{{ selectedDict || t("common.allDictionaries") }}</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="openPopover === 'dict' ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
        :id="dictPopoverId"
        ref="dictPopoverEl"
        popover="auto"
        class="mwg-popover"
        @toggle="handleToggle('dict', $event)"
      >
        <div
          class="bg-parchment dark:bg-stone-900 border border-outline-soft/15 dark:border-stone-800 shadow-lg py-1 min-w-[180px] max-h-80 overflow-y-auto"
        >
          <button
            type="button"
            :aria-current="!selectedDict ? 'true' : undefined"
            class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
            :class="
              !selectedDict
                ? 'text-kapok bg-kapok/10 dark:bg-kapok/20'
                : 'text-graphite dark:text-stone-100'
            "
            @click="chooseDict(null)"
          >
            {{ t("common.allDictionaries") }}
          </button>
          <button
            v-for="dict in availableDicts"
            :key="dict"
            type="button"
            :aria-current="selectedDict === dict ? 'true' : undefined"
            class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
            :class="
              selectedDict === dict
                ? 'text-kapok bg-kapok/10 dark:bg-kapok/20'
                : 'text-graphite dark:text-stone-100'
            "
            @click="chooseDict(dict)"
          >
            {{ dict }}
            <span class="text-graphite/40 dark:text-stone-300 text-xs ml-1"
              >({{ loading ? "..." : getDictCount(dict) }})</span
            >
          </button>
        </div>
      </div>
    </div>

    <!-- 方言点筛选 -->
    <div>
      <button
        ref="dialectTriggerEl"
        type="button"
        :popovertarget="dialectPopoverId"
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm transition-colors"
        :class="
          disabled
            ? 'bg-surface-low/60 dark:bg-stone-800/60 text-graphite/40 dark:text-stone-300/50 cursor-not-allowed'
            : selectedDialect
              ? 'bg-archive-green/10 dark:bg-archive-green/20 text-archive-green'
              : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-100 hover:bg-surface-high dark:hover:bg-stone-700'
        "
        :disabled="disabled"
        :aria-expanded="openPopover === 'dialect'"
        :aria-controls="dialectPopoverId"
      >
        <span>{{
          selectedDialect
            ? getDialectLabel(selectedDialect)
            : t("common.allDialects")
        }}</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="openPopover === 'dialect' ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
        :id="dialectPopoverId"
        ref="dialectPopoverEl"
        popover="auto"
        class="mwg-popover"
        @toggle="handleToggle('dialect', $event)"
      >
        <div
          class="bg-parchment dark:bg-stone-900 border border-outline-soft/15 dark:border-stone-800 shadow-lg py-1 min-w-[140px] max-h-80 overflow-y-auto"
        >
          <button
            type="button"
            :aria-current="!selectedDialect ? 'true' : undefined"
            class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
            :class="
              !selectedDialect
                ? 'text-archive-green bg-archive-green/10 dark:bg-archive-green/20'
                : 'text-graphite dark:text-stone-100'
            "
            @click="chooseDialect(null)"
          >
            {{ t("common.allDialects") }}
          </button>
          <button
            v-for="dialect in availableDialects"
            :key="dialect"
            type="button"
            :aria-current="selectedDialect === dialect ? 'true' : undefined"
            class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
            :class="
              selectedDialect === dialect
                ? 'text-archive-green bg-archive-green/10 dark:bg-archive-green/20'
                : 'text-graphite dark:text-stone-100'
            "
            @click="chooseDialect(dialect)"
          >
            {{ getDialectLabel(dialect) }}
            <span class="text-graphite/40 dark:text-stone-300 text-xs ml-1"
              >({{ loading ? "..." : getDialectCount(dialect) }})</span
            >
          </button>
        </div>
      </div>
    </div>

    <!-- 类型筛选 -->
    <div>
      <button
        ref="typeTriggerEl"
        type="button"
        :popovertarget="typePopoverId"
        class="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm transition-colors"
        :class="
          disabled
            ? 'bg-surface-low/60 dark:bg-stone-800/60 text-graphite/40 dark:text-stone-300/50 cursor-not-allowed'
            : selectedType
              ? 'bg-muted-gold/10 dark:bg-muted-gold/20 text-muted-gold'
              : 'bg-surface-low dark:bg-stone-800 text-graphite dark:text-stone-100 hover:bg-surface-high dark:hover:bg-stone-700'
        "
        :disabled="disabled"
        :aria-expanded="openPopover === 'type'"
        :aria-controls="typePopoverId"
      >
        <span>{{
          selectedType ? getTypeName(selectedType) : t("common.allTypes")
        }}</span>
        <svg
          class="w-4 h-4 transition-transform"
          :class="openPopover === 'type' ? 'rotate-180' : ''"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
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
        :id="typePopoverId"
        ref="typePopoverEl"
        popover="auto"
        class="mwg-popover"
        @toggle="handleToggle('type', $event)"
      >
        <div
          class="bg-parchment dark:bg-stone-900 border border-outline-soft/15 dark:border-stone-800 shadow-lg py-1 min-w-[120px] max-h-80 overflow-y-auto"
        >
          <button
            type="button"
            :aria-current="!selectedType ? 'true' : undefined"
            class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
            :class="
              !selectedType
                ? 'text-muted-gold bg-muted-gold/10 dark:bg-muted-gold/20'
                : 'text-graphite dark:text-stone-100'
            "
            @click="chooseType(null)"
          >
            {{ t("common.allTypes") }}
          </button>
          <button
            v-for="type in availableTypes"
            :key="type"
            type="button"
            :aria-current="selectedType === type ? 'true' : undefined"
            class="w-full px-4 py-2 text-left text-sm hover:bg-surface-low dark:hover:bg-stone-800 transition-colors"
            :class="
              selectedType === type
                ? 'text-muted-gold bg-muted-gold/10 dark:bg-muted-gold/20'
                : 'text-graphite dark:text-stone-100'
            "
            @click="chooseType(type)"
          >
            {{ getTypeName(type) }}
            <span class="text-graphite/40 dark:text-stone-300 text-xs ml-1"
              >({{ loading ? "..." : getTypeCount(type) }})</span
            >
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

defineProps<{
  selectedDict: string | null;
  selectedDialect: string | null;
  selectedType: string | null;
  availableDicts: string[];
  availableDialects: string[];
  availableTypes: string[];
  getDictCount: (dict: string) => number;
  getDialectCount: (dialect: string) => number;
  getTypeCount: (type: string) => number;
  getDialectLabel: (code: string) => string;
  getTypeName: (type: string) => string;
  disabled?: boolean;
  loading?: boolean;
}>();

const emit = defineEmits<{
  "select-dict": [dict: string | null];
  "select-dialect": [dialect: string | null];
  "select-type": [type: string | null];
}>();

const dictPopoverId = useId();
const dialectPopoverId = useId();
const typePopoverId = useId();

const dictTriggerEl = ref<HTMLButtonElement | null>(null);
const dialectTriggerEl = ref<HTMLButtonElement | null>(null);
const typeTriggerEl = ref<HTMLButtonElement | null>(null);
const dictPopoverEl = ref<HTMLElement | null>(null);
const dialectPopoverEl = ref<HTMLElement | null>(null);
const typePopoverEl = ref<HTMLElement | null>(null);

const openPopover = ref<"dict" | "dialect" | "type" | null>(null);

const handleToggle = (
  kind: "dict" | "dialect" | "type",
  event: ToggleEvent,
) => {
  if (event.newState === "open") {
    openPopover.value = kind;
  } else if (openPopover.value === kind) {
    openPopover.value = null;
  }
};

const chooseDict = (dict: string | null) => {
  dictPopoverEl.value?.hidePopover?.();
  emit("select-dict", dict);
  dictTriggerEl.value?.focus();
};

const chooseDialect = (dialect: string | null) => {
  dialectPopoverEl.value?.hidePopover?.();
  emit("select-dialect", dialect);
  dialectTriggerEl.value?.focus();
};

const chooseType = (type: string | null) => {
  typePopoverEl.value?.hidePopover?.();
  emit("select-type", type);
  typeTriggerEl.value?.focus();
};
</script>
