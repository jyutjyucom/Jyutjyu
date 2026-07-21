<template>
  <div class="dict-card bg-surface-low dark:bg-stone-900 overflow-hidden">
    <!-- 头部：词头 + 粤拼 -->
    <div
      class="card-header px-6 py-4 border-b border-outline-soft/20 dark:border-stone-800"
    >
      <div
        class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4"
      >
        <!-- 词头部分 -->
        <div class="flex-1 min-w-0">
          <h3
            class="text-2xl font-bold text-ink dark:text-stone-100 mb-1 break-words"
          >
            <NuxtLink
              :to="wordPath(entry.headword.display)"
              class="hover:text-kapok transition-colors"
            >
              {{ entry.headword.display }}
            </NuxtLink>
            <!-- 开天窗字标记 -->
            <span
              v-if="entry.headword.is_placeholder"
              class="ml-2 text-xs text-muted-gold font-normal"
              :title="t('dictCard.placeholderWord')"
            >
              {{ t("dictCard.placeholderWord") }}
            </span>
            <!-- 同形异义标记 -->
            <sup
              v-if="entry.meta?.variant_number"
              class="ml-1 text-sm text-graphite/60 dark:text-stone-200"
            >
              {{ entry.meta.variant_number }}
            </sup>
          </h3>

          <!-- 粤拼 + 原书注音（紧跟在词头下方） -->
          <div class="mt-2">
            <!-- 多个粤拼读音 -->
            <div
              v-for="(jp, idx) in entry.phonetic.jyutping"
              :key="idx"
              class="flex items-center gap-1.5 flex-wrap"
            >
              <!-- 粤拼 -->
              <div class="text-kapok font-semibold text-lg break-words">
                {{ jp }}
              </div>
              <!-- 原书注音（始终在粤拼右边，空间不足时换行） -->
              <div
                v-if="getOriginalPhonetic(entry, idx)"
                class="text-xs text-graphite/60 dark:text-stone-200 break-words"
              >
                <span class="text-graphite/40 dark:text-stone-300">{{
                  t("dictCard.originalPhonetic")
                }}</span
                >{{ getOriginalPhonetic(entry, idx) }}
              </div>
            </div>
          </div>

          <!-- 异形词 -->
          <p
            v-if="
              entry.meta?.headword_variants &&
              entry.meta.headword_variants.length > 0
            "
            class="text-sm text-graphite dark:text-stone-400 break-words mt-2"
          >
            {{ t("dictCard.variantWords")
            }}{{ entry.meta.headword_variants.join("、") }}
          </p>
          <!-- 如果显示词和标准词不同，显示标准词 -->
          <p
            v-if="entry.headword.display !== entry.headword.normalized"
            class="text-sm text-graphite/60 dark:text-stone-200 break-words mt-1"
          >
            {{ t("dictCard.standardWriting") }}{{ entry.headword.normalized }}
          </p>
        </div>

        <!-- 右侧：标签（反馈放在最后一个） -->
        <div
          class="flex flex-wrap gap-2 md:justify-end md:mt-0 md:ml-4 md:max-w-[40%]"
        >
          <!-- 来源词典: ID -->
          <span
            class="px-3 py-1 bg-kapok/10 dark:bg-kapok/20 text-kapok rounded-lg text-sm whitespace-nowrap"
          >
            {{ localizedSourceBook
            }}<template v-if="entry.source_id"
              >: {{ entry.source_id }}</template
            >
          </span>

          <!-- 方言 -->
          <span
            class="px-3 py-1 bg-archive-green/10 dark:bg-archive-green/20 text-archive-green dark:text-archive-green-light rounded-lg text-sm whitespace-nowrap"
          >
            {{ dialectLabel }}
          </span>

          <!-- 词条类型 -->
          <span
            class="px-3 py-1 bg-muted-gold/10 dark:bg-amber-900/40 text-muted-gold dark:text-amber-300 rounded-lg text-sm whitespace-nowrap"
          >
            {{ entryTypeLabel }}
          </span>

          <!-- 语域标签（口语、书面、俚语等） -->
          <span
            v-if="entry.meta?.register"
            class="px-3 py-1 bg-surface-highest dark:bg-stone-600/40 text-graphite dark:text-stone-200 rounded-lg text-sm whitespace-nowrap"
          >
            {{ entry.meta.register }}
          </span>

          <!-- 分类（如果有） -->
          <span
            v-if="entry.meta?.category"
            class="px-3 py-1 bg-surface-high dark:bg-stone-600/40 text-graphite dark:text-stone-200 rounded-lg text-sm break-words max-w-full"
          >
            {{ entry.meta.category }}
          </span>

          <!-- 反馈按钮（SVG 图标，放在最后） -->
          <FeedbackButton
            :entry-data="{
              word: entry.headword.display,
              source: entry.source_book,
              id: entry.id,
            }"
            :initial-description="entryFeedbackDescription"
            initial-type="entry-error"
            icon-only-on-mobile
            button-class="inline-flex items-center gap-1.5 px-3 py-1 bg-archive-green/10 dark:bg-archive-green/20 text-archive-green dark:text-archive-green-light rounded-md text-sm whitespace-nowrap hover:bg-archive-green/20 dark:hover:bg-emerald-900/60 transition-colors"
            label-class="text-sm"
          />
        </div>
      </div>
    </div>

    <!-- 内容：释义 -->
    <div class="card-body px-6 py-4">
      <!-- 多义项 -->
      <div
        v-for="(sense, senseIdx) in entry.senses"
        :key="senseIdx"
        class="mb-4 last:mb-0"
      >
        <!-- 义项编号（如果有多个） -->
        <div class="flex items-start gap-3">
          <span
            v-if="entry.senses.length > 1"
            class="flex-shrink-0 text-kapok font-bold italic font-serif text-sm"
          >
            {{ String(senseIdx + 1).padStart(2, "0") }}
          </span>

          <div class="flex-1">
            <!-- 词性标签 -->
            <span
              v-if="sense.label"
              class="inline-block text-xs text-graphite/60 dark:text-stone-200 mb-1"
            >
              {{ sense.label }}
            </span>

            <!-- 释义 -->
            <p
              v-if="isCantoDict"
              class="text-ink/90 dark:text-stone-200 text-base leading-relaxed mb-2"
              v-html="formatDefinitionWithLinks(sense.definition)"
            ></p>
            <p
              v-else
              class="text-ink/90 dark:text-stone-200 text-base leading-relaxed mb-2"
            >
              {{ sense.definition }}
            </p>

            <!-- 子义项（A) B) C) 等） -->
            <div
              v-if="sense.sub_senses && sense.sub_senses.length > 0"
              class="space-y-3 mt-3"
            >
              <div
                v-for="(subSense, subIdx) in sense.sub_senses"
                :key="subIdx"
                class="pl-4 border-l-2 border-kapok/20 dark:border-kapok/30"
              >
                <!-- 子义项标签和释义 -->
                <div class="mb-2">
                  <span class="inline-block font-semibold text-kapok mr-2">
                    {{ subSense.label }})
                  </span>
                  <span class="text-ink/90 dark:text-stone-200">
                    {{ subSense.definition }}
                  </span>
                </div>

                <!-- 子义项的例句 -->
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
                      v-if="isCantoDict"
                      class="text-ink/80 dark:text-stone-300 text-base"
                      v-html="formatDefinitionWithLinks(example.text)"
                    ></p>
                    <p v-else class="text-ink/80 dark:text-stone-300 text-base">
                      {{ example.text }}
                    </p>
                    <!-- 例句粤拼 -->
                    <p
                      v-if="example.jyutping"
                      class="text-sm text-kapok font-semibold mt-1"
                    >
                      {{ example.jyutping }}
                    </p>
                    <!-- 例句翻译 -->
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

            <!-- 例句（仅在没有子义项时显示） -->
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
                  v-if="isCantoDict"
                  class="text-ink/80 dark:text-stone-300 text-base"
                  v-html="formatDefinitionWithLinks(example.text)"
                ></p>
                <p v-else class="text-ink/80 dark:text-stone-300 text-base">
                  {{ example.text }}
                </p>
                <!-- 例句粤拼 -->
                <p
                  v-if="example.jyutping"
                  class="text-sm text-kapok font-semibold mt-1"
                >
                  {{ example.jyutping }}
                </p>
                <!-- 例句翻译 -->
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

      <!-- 备注 -->
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

      <!-- 词源（用于 wiktionary 等真正的词源说明） -->
      <div
        v-if="entry.meta?.etymology && typeof entry.meta.etymology === 'string'"
        class="mt-4 p-3 border-l-4 bg-surface-low dark:bg-stone-900 border-archive-green/40 text-sm text-ink/80 dark:text-stone-300"
      >
        <span class="font-semibold text-archive-green">{{
          t("dictCard.etymology")
        }}</span>
        {{ entry.meta.etymology }}
      </div>

      <!-- 参考文献（用于 gz-word-origins 的文献引用） -->
      <div
        v-if="entry.meta?.references && entry.meta.references.length > 0"
        class="mt-4 p-3 border-l-4 bg-surface-low dark:bg-stone-900 border-muted-gold/40 text-sm text-ink/80 dark:text-stone-300"
      >
        <span class="font-semibold text-muted-gold">{{
          t("dictCard.references")
        }}</span>
        <ul class="mt-2 space-y-2">
          <li v-for="(ref, refIdx) in entry.meta.references" :key="refIdx">
            <!-- 作者和作品 -->
            <span v-if="ref.author" class="font-medium">{{ ref.author }}</span>
            <span v-if="ref.work">《{{ ref.work }}》</span>
            <span v-if="ref.author || ref.work">：</span>
            <!-- 引文（用 ～ 代替词头） -->
            <span v-if="ref.quote">{{ ref.quote }}</span>
            <!-- 出处 -->
            <span v-if="ref.source" class="text-graphite/60 dark:text-stone-200"
              >（{{ ref.source }}）</span
            >
          </li>
        </ul>
      </div>

      <!-- 参见 -->
      <div v-if="entry.refs && entry.refs.length > 0" class="mt-4 text-sm">
        <span class="text-graphite/60 dark:text-stone-200">{{
          t("dictCard.seeAlso")
        }}</span>
        <span v-for="(ref, refIdx) in entry.refs" :key="refIdx" class="ml-2">
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
    </div>

    <!-- 底部：额外信息（可折叠） -->
    <div
      v-if="showDetails && hasExtraInfo"
      class="card-footer px-6 py-3 bg-surface-low dark:bg-stone-900/50 border-t border-outline-soft/20 dark:border-stone-800"
    >
      <button
        class="text-sm text-graphite dark:text-stone-400 hover:text-ink dark:hover:text-stone-200 flex items-center gap-1"
        @click="detailsExpanded = !detailsExpanded"
      >
        <span
          >{{ detailsExpanded ? t("dictCard.collapse") : t("dictCard.expand") }}
          {{ t("dictCard.details") }}</span
        >
        <svg
          class="w-4 h-4 transition-transform"
          :class="{ 'rotate-180': detailsExpanded }"
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
        v-show="detailsExpanded"
        class="mt-3 text-sm text-graphite dark:text-stone-400 space-y-1"
      >
        <p v-if="entry.meta?.usage">
          <span class="font-semibold">{{ t("dictCard.usage") }}</span>
          {{ entry.meta.usage }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from "~/types/dictionary";
import { hasDialectI18n } from "~/constants/dialect";
import { getOriginalPhoneticForIndex } from "~/utils/phonetic-display";

const { t } = useI18n();
const { getLocalizedSourceBookLabel } = useLocalizedDictionary();
const { wordPath } = useAppRoutes();
const { getEntryFeedbackDescription: buildEntryFeedbackDescription, formatDefinitionWithLinks } =
  useDictionaryEntry();

interface Props {
  entry: DictionaryEntry;
  showDetails?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
});

const detailsExpanded = ref(false);

// 根据 source_book 获取本地化的词典名称
const localizedSourceBook = computed(() =>
  getLocalizedSourceBookLabel(props.entry.source_book),
);

// 为反馈构造包含当前词条完整信息的描述文本，方便用户直接在此基础上修改
const entryFeedbackDescription = computed(() =>
  buildEntryFeedbackDescription(props.entry),
);

// 词条类型标签
const entryTypeLabel = computed(() => {
  const labels = {
    character: t("dictCard.entryTypeCharacter"),
    word: t("dictCard.entryTypeWord"),
    phrase: t("dictCard.entryTypePhrase"),
  };
  return labels[props.entry.entry_type] || props.entry.entry_type;
});

// 方言标签：使用地区代码映射（便于 i18n）
const dialectLabel = computed(() => {
  const code = props.entry.dialect?.region_code?.toUpperCase();
  if (hasDialectI18n(code)) {
    return t(`dictCard.dialect.${code}`);
  }
  // 回退：无地区代码时使用原始名称（兼容旧数据）
  return props.entry.dialect?.name || "";
});

// 是否有额外信息（不包括词源和语域，因为它们已在顶部展示）
const hasExtraInfo = computed(() => {
  return !!props.entry.meta?.usage;
});

// 判断是否为粤典
const isCantoDict = computed(() => {
  return (
    props.entry.source_book === "粵典 (words.hk)" ||
    props.entry.source_book === "粵典"
  );
});



/**
 * 统一获取指定索引的原书注音
 * 原书注音始终显示在对应粤拼的右边，空间不足时自动换行
 * @param entry - 词条对象
 * @param idx - 粤拼索引
 * @returns 原书注音字符串或null
 */
const getOriginalPhonetic = (entry: DictionaryEntry, idx: number) => {
  return getOriginalPhoneticForIndex(entry.phonetic, idx);
};
</script>

<style scoped>
.dict-card {
  /* 卡片动画 */
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
