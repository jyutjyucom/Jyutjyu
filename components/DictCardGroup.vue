<template>
  <div
    v-if="entries.length > 0"
    class="dict-card bg-surface-low dark:bg-stone-900 overflow-visible transition-colors duration-300 font-cjk-content"
  >
    <!-- 头部：词头 + 粤拼（共享信息） -->
    <div :class="headerClasses" :style="stickyHeaderStyle">
      <div
        class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4"
      >
        <div class="flex-1 min-w-0">
          <h3
            class="text-2xl sm:text-3xl font-sung-content font-bold text-ink dark:text-parchment mb-1 break-words"
          >
            <NuxtLink
              v-if="cardClickable && primaryWordTo"
              :to="primaryWordTo"
              class="text-inherit hover:text-kapok dark:hover:text-kapok transition-colors"
            >
              {{ primary.headword.display }}
            </NuxtLink>
            <template v-else>
              {{ primary.headword.display }}
            </template>
            <span
              v-if="primary.headword.is_placeholder"
              class="ml-2 text-sm text-kapok font-normal"
              :title="t('dictCard.placeholderWord')"
            >
              {{ t("dictCard.placeholderWord") }}
            </span>
            <sup
              v-if="primary.meta?.variant_number"
              class="ml-1 text-base text-graphite/60 dark:text-stone-200"
            >
              {{ primary.meta.variant_number }}
            </sup>
          </h3>

          <div class="mt-2">
            <PronunciationWithTts
              v-for="item in groupPronunciationItems"
              :key="item.normalized"
              :item="item"
              wrapper-class="flex items-center gap-1.5 flex-wrap"
              label-class="text-base sm:text-lg text-kapok font-semibold break-words"
            />
          </div>
          <p
            v-if="dictionaryCount > 0"
            class="mt-2 text-sm text-graphite/60 dark:text-stone-200"
          >
            {{
              t("dictCard.collectedBy", {
                count: dictionaryCount,
              })
            }}
          </p>

          <p
            v-if="primary.headword.display !== primary.headword.normalized"
            class="text-sm text-graphite/60 dark:text-stone-200 break-words mt-1"
          >
            {{ t("dictCard.standardWriting") }}{{ primary.headword.normalized }}
          </p>
        </div>
      </div>
    </div>

    <!-- Red dot divider -->
    <div class="flex items-center gap-3 mx-3 sm:mx-6">
      <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
      <div class="w-1.5 h-1.5 rounded-full bg-kapok/60 dark:bg-kapok/40"></div>
      <div class="flex-1 h-px bg-kapok/30 dark:bg-kapok/20"></div>
    </div>

    <!-- 内容：按词典分段 -->
    <div class="card-body px-3 sm:px-6 py-3 sm:py-4">
      <div
        v-for="(entry, entryIdx) in entries"
        :key="entry.id"
        class="mt-4 sm:mt-6 first:mt-0"
      >
        <!-- Entry divider -->
        <div v-if="entryIdx > 0" class="flex items-center gap-3 mb-4 sm:mb-6">
          <div
            class="flex-1 h-px bg-archive-green/30 dark:bg-archive-green/20"
          ></div>
          <div
            class="w-1.5 h-1.5 rounded-full bg-archive-green/60 dark:bg-archive-green/40"
          ></div>
          <div
            class="flex-1 h-px bg-archive-green/30 dark:bg-archive-green/20"
          ></div>
        </div>
        <!-- 词典标签区 -->
        <div class="flex items-start gap-3">
          <div class="flex flex-wrap gap-2 items-center flex-1 min-w-0">
            <span
              class="px-2 sm:px-3 py-0.5 sm:py-1 bg-kapok/10 dark:bg-kapok/20 text-kapok rounded-md text-xs sm:text-sm whitespace-nowrap"
            >
              {{ getEntrySourceBookLabel(entry)
              }}<template v-if="entry.source_id"
                >: {{ entry.source_id }}</template
              >
            </span>

            <span
              class="px-2 sm:px-3 py-0.5 sm:py-1 bg-archive-green/10 dark:bg-archive-green/20 text-archive-green dark:text-archive-green-light rounded-md text-xs sm:text-sm whitespace-nowrap"
            >
              {{ getDialectLabel(entry) }}
            </span>

            <span
              class="px-2 sm:px-3 py-0.5 sm:py-1 bg-muted-gold/10 dark:bg-amber-900/40 text-muted-gold dark:text-amber-300 rounded-md text-xs sm:text-sm whitespace-nowrap"
            >
              {{ getEntryTypeLabel(entry) }}
            </span>

            <span
              v-if="entry.meta?.register"
              class="px-2 sm:px-3 py-0.5 sm:py-1 bg-surface-highest dark:bg-stone-600/40 text-graphite dark:text-stone-200 rounded-md text-xs sm:text-sm whitespace-nowrap"
            >
              {{ entry.meta.register }}
            </span>

            <span
              v-if="entry.meta?.category"
              class="px-2 sm:px-3 py-0.5 sm:py-1 bg-surface-high dark:bg-stone-600/40 text-graphite dark:text-stone-200 rounded-md text-xs sm:text-sm break-words max-w-full"
            >
              {{ entry.meta.category }}
            </span>
          </div>

          <div class="flex-shrink-0">
            <FeedbackButton
              :entry-data="{
                word: entry.headword.display,
                source: entry.source_book,
                id: entry.id,
              }"
              :initial-description="getEntryFeedbackDescription(entry)"
              initial-type="entry-error"
              icon-only-on-mobile
              button-class="inline-flex items-center gap-1.5 px-3 py-1 bg-archive-green/10 dark:bg-archive-green/20 text-archive-green dark:text-archive-green-light rounded-md text-sm whitespace-nowrap hover:bg-archive-green/20 dark:hover:bg-emerald-900/60 transition-colors"
              label-class="text-sm"
            />
          </div>
        </div>

        <!-- 仅当不同词典的粤拼不一致时，显示该词典收录的读音 -->
        <div
          v-if="shouldShowEntryJyutping(entry)"
          class="mt-3 text-sm flex items-start gap-2"
        >
          <span
            class="text-sm text-graphite/60 dark:text-stone-200 mr-2 shrink-0"
            >{{ t("common.jyutpingColumn") }}:</span
          >
          <div class="min-w-0 space-y-1">
            <div
              v-for="item in getEntryPhoneticRows(entry)"
              :key="`${entry.id}:phonetic:${item.normalized}`"
            >
              <PronunciationWithTts :item="item" :original="item.original" />
            </div>
          </div>
        </div>

        <div
          v-if="shouldShowStandaloneOriginalPhonetic(entry)"
          class="mt-2 text-sm"
        >
          <span class="text-sm text-graphite/60 dark:text-stone-200 mr-2">{{
            t("dictCard.originalPhonetic")
          }}</span>
          <span class="text-ink/80 dark:text-stone-300 break-words">{{
            getEntryOriginalPhonetic(entry)
          }}</span>
        </div>

        <p
          v-if="
            entry.meta?.headword_variants &&
            entry.meta.headword_variants.length > 0
          "
          class="text-base text-ink dark:text-stone-100 break-words mt-3"
        >
          {{ t("dictCard.variantWords")
          }}{{ entry.meta.headword_variants.join("、") }}
        </p>

        <!-- 释义 -->
        <div class="mt-4">
          <div
            v-for="(sense, senseIdx) in entry.senses"
            :key="senseIdx"
            class="mb-4 last:mb-0"
          >
            <div class="flex items-start gap-3">
              <span
                v-if="entry.senses.length > 1"
                class="flex-shrink-0 text-sm text-kapok font-bold italic font-serif"
              >
                {{ String(senseIdx + 1).padStart(2, "0") }}
              </span>

              <div class="flex-1">
                <span
                  v-if="sense.label"
                  class="inline-block text-sm text-graphite/60 dark:text-stone-200 mb-1"
                >
                  {{ sense.label }}
                </span>

                <p
                  v-if="isCantoDict(entry)"
                  class="text-ink dark:text-stone-100 text-sm sm:text-base leading-relaxed mb-2"
                  v-html="formatDefinitionWithLinks(sense.definition)"
                ></p>
                <p
                  v-else
                  class="text-ink dark:text-stone-100 text-sm sm:text-base leading-relaxed mb-2"
                >
                  {{ sense.definition }}
                </p>

                <div
                  v-if="sense.sub_senses && sense.sub_senses.length > 0"
                  class="space-y-3 mt-3"
                >
                  <div
                    v-for="(subSense, subIdx) in sense.sub_senses"
                    :key="subIdx"
                    class="pl-4 border-l-2 border-kapok/20 dark:border-kapok/30"
                  >
                    <div class="mb-2">
                      <span class="inline-block font-semibold text-kapok mr-2">
                        {{ subSense.label }})
                      </span>
                      <span class="text-ink dark:text-stone-100">
                        {{ subSense.definition }}
                      </span>
                    </div>
                    <div
                      v-if="subSense.examples && subSense.examples.length > 0"
                      class="space-y-2"
                    >
                      <div
                        v-for="(example, exIdx) in subSense.examples"
                        :key="exIdx"
                        class="pl-4 border-l-2 border-outline-soft/20 dark:border-stone-800"
                      >
                        <p
                          v-if="isCantoDict(entry)"
                          class="text-ink/80 dark:text-stone-100 text-sm sm:text-base"
                          v-html="formatDefinitionWithLinks(example.text)"
                        ></p>
                        <p
                          v-else
                          class="text-ink/80 dark:text-stone-100 text-sm sm:text-base"
                        >
                          {{ example.text }}
                        </p>
                        <p
                          v-if="example.jyutping"
                          class="text-sm text-kapok font-semibold mt-1"
                        >
                          {{ example.jyutping }}
                        </p>
                        <p
                          v-if="example.translation"
                          class="text-base text-graphite/60 dark:text-stone-200 mt-1"
                        >
                          → {{ example.translation }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="
                    (!sense.sub_senses || sense.sub_senses.length === 0) &&
                    sense.examples &&
                    sense.examples.length > 0
                  "
                  class="space-y-2"
                >
                  <div
                    v-for="(example, exIdx) in sense.examples"
                    :key="exIdx"
                    class="pl-4 border-l-2 border-outline-soft/20 dark:border-stone-800"
                  >
                    <p
                      v-if="isCantoDict(entry)"
                      class="text-ink/80 dark:text-stone-100 text-sm sm:text-base"
                      v-html="formatDefinitionWithLinks(example.text)"
                    ></p>
                    <p
                      v-else
                      class="text-ink/80 dark:text-stone-100 text-sm sm:text-base"
                    >
                      {{ example.text }}
                    </p>
                    <p
                      v-if="example.jyutping"
                      class="text-sm text-kapok font-semibold mt-1"
                    >
                      {{ example.jyutping }}
                    </p>
                    <p
                      v-if="example.translation"
                      class="text-base text-graphite/60 dark:text-stone-200 mt-1"
                    >
                      → {{ example.translation }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="entry.meta?.notes"
            class="mt-4 p-3 border-l-4 text-sm"
            :class="
              entry.meta?.note_type === 'proofreader'
                ? 'bg-surface-low dark:bg-stone-900 border-kapok/40 text-ink/80 dark:text-stone-300'
                : 'bg-surface-low dark:bg-stone-900 border-muted-gold/40 text-ink/80 dark:text-stone-300'
            "
          >
            <span
              class="font-semibold"
              :class="
                entry.meta?.note_type === 'proofreader'
                  ? 'text-kapok'
                  : 'text-muted-gold'
              "
            >
              {{
                entry.meta?.note_type === "proofreader"
                  ? t("dictCard.proofreaderNote")
                  : t("dictCard.note")
              }}
            </span>
            {{ entry.meta.notes }}
          </div>

          <div
            v-if="
              entry.meta?.etymology && typeof entry.meta.etymology === 'string'
            "
            class="mt-4 p-4 border-l-2 bg-surface-low dark:bg-stone-900 border-archive-green/40 rounded-md text-sm text-ink/80 dark:text-stone-300"
          >
            <span class="font-semibold text-archive-green">{{
              t("dictCard.etymology")
            }}</span>
            {{ entry.meta.etymology }}
          </div>

          <div
            v-if="entry.meta?.references && entry.meta.references.length > 0"
            class="mt-4 p-4 border-l-2 bg-surface-low dark:bg-stone-900 border-muted-gold/40 rounded-md text-sm text-ink/80 dark:text-stone-300"
          >
            <span class="font-semibold text-muted-gold">{{
              t("dictCard.references")
            }}</span>
            <ul class="mt-2 space-y-2">
              <li v-for="(ref, refIdx) in entry.meta.references" :key="refIdx">
                <span v-if="ref.author" class="font-medium">{{
                  ref.author
                }}</span>
                <span v-if="ref.work">《{{ ref.work }}》</span>
                <span v-if="ref.author || ref.work">：</span>
                <span v-if="ref.quote">{{ ref.quote }}</span>
                <span
                  v-if="ref.source"
                  class="text-graphite/60 dark:text-stone-200"
                  >（{{ ref.source }}）</span
                >
              </li>
            </ul>
          </div>

          <div v-if="entry.refs && entry.refs.length > 0" class="mt-4 text-sm">
            <span class="text-graphite/60 dark:text-stone-200">{{
              t("dictCard.seeAlso")
            }}</span>
            <span
              v-for="(ref, refIdx) in entry.refs"
              :key="refIdx"
              class="ml-2"
            >
              <NuxtLink
                v-if="ref.type === 'word'"
                :to="wordPath(ref.target)"
                class="text-kapok underline decoration-1 underline-offset-2"
              >
                {{ ref.target }}
              </NuxtLink>
              <span v-else class="text-graphite dark:text-stone-400">
                {{ ref.target }}
              </span>
              <span
                v-if="refIdx < entry.refs.length - 1"
                class="text-graphite/40 dark:text-stone-300"
              >
                、
              </span>
            </span>
          </div>

          <div
            v-if="showDetails && entry.meta?.usage"
            class="mt-4 text-sm text-graphite dark:text-stone-400"
          >
            <span class="font-semibold">{{ t("dictCard.usage") }}</span>
            {{ entry.meta.usage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from "~/types/dictionary";
import {
  getAggregatePronunciationDisplayItems,
  getEntryPronunciationDisplayItems,
} from "~/utils/pronunciation-display";

const { t } = useI18n();
const { getLocalizedSourceBookLabel } = useLocalizedDictionary();
const {
  getEntryTypeLabel,
  getDialectLabel,
  isCantoDict,
  formatDefinitionWithLinks,
  getEntryJyutpingList,
  getEntryOriginalPhonetic,
  getEntryOriginalPhoneticList,
  getEntryFeedbackDescription,
} = useDictionaryEntry();
const { wordPath } = useAppRoutes();

interface Props {
  entries: DictionaryEntry[];
  showDetails?: boolean;
  stickyHeader?: boolean;
  stickyOffset?: number;
  cardClickable?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  stickyHeader: false,
  stickyOffset: 0,
  cardClickable: false,
});

const entries = computed(() => props.entries || []);
const headerClasses = computed(() => [
  "card-header px-3 sm:px-6 py-3 sm:py-4 transition-colors duration-300",
  props.stickyHeader
    ? "sticky z-[5] bg-surface-low/95 dark:bg-stone-900/95 backdrop-blur supports-[backdrop-filter]:bg-surface-low/90 supports-[backdrop-filter]:dark:bg-stone-900/90"
    : "",
]);
const stickyHeaderStyle = computed(() => {
  if (!props.stickyHeader) return undefined;
  return {
    top: `${Math.max(0, props.stickyOffset)}px`,
  };
});
const primary = computed(() => entries.value[0] as DictionaryEntry);
const primaryWordTo = computed(() => {
  const word = primary.value?.headword?.display?.trim();
  if (!word) return null;
  return wordPath(word);
});

const normalizeJyutpingList = (values: string[]): string[] => {
  const seen = new Set<string>();
  const result: string[] = [];

  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized || seen.has(normalized)) return;
    seen.add(normalized);
    result.push(normalized);
  });

  return result;
};

const createJyutpingComparisonKey = (values: string[]): string => {
  return [...normalizeJyutpingList(values)].sort().join("||");
};

const dictionaryCount = computed(() => {
  const sources = new Set<string>();
  entries.value.forEach((entry) => {
    const value = entry.source_book?.trim();
    if (value) sources.add(value);
  });
  return sources.size || entries.value.length;
});

const groupPronunciationItems = computed(() =>
  getAggregatePronunciationDisplayItems(entries.value),
);

const hasPronunciationVariation = computed(() => {
  if (entries.value.length <= 1) return false;

  const pronunciationProfiles = new Set(
    entries.value
      .map((entry) => createJyutpingComparisonKey(getEntryJyutpingList(entry)))
      .filter(Boolean),
  );

  return pronunciationProfiles.size > 1;
});

const getEntrySourceBookLabel = (entry: DictionaryEntry) => {
  return getLocalizedSourceBookLabel(entry.source_book);
};

const shouldShowEntryJyutping = (entry: DictionaryEntry): boolean => {
  if (!entry || !hasPronunciationVariation.value) return false;
  return normalizeJyutpingList(getEntryJyutpingList(entry)).length > 0;
};

const shouldShowEntryOriginalPhonetic = (entry: DictionaryEntry): boolean => {
  const originalList = normalizeJyutpingList(
    getEntryOriginalPhoneticList(entry),
  );
  if (originalList.length === 0) return false;
  const entryJyutpingList = normalizeJyutpingList(getEntryJyutpingList(entry));
  if (entryJyutpingList.length === 0) return true;
  if (originalList.length !== entryJyutpingList.length) return true;
  const entryJyutpingSet = new Set(entryJyutpingList);
  return originalList.some((value) => !entryJyutpingSet.has(value));
};

const getEntryPhoneticRows = (entry: DictionaryEntry) => {
  return getEntryPronunciationDisplayItems(entry);
};

const shouldShowStandaloneOriginalPhonetic = (entry: DictionaryEntry) => {
  if (!shouldShowEntryOriginalPhonetic(entry)) return false;
  if (!shouldShowEntryJyutping(entry)) return true;
  return !getEntryPhoneticRows(entry).some((row) => row.original);
};
</script>

<style scoped>
.dict-card {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
