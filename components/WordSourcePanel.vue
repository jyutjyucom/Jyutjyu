<template>
  <section :class="panelClasses">
    <button
      v-if="collapsible"
      type="button"
      class="w-full text-left py-2"
      @click="$emit('toggle')"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h2 class="text-base sm:text-lg font-semibold text-ink dark:text-parchment break-words">
            {{ sourceLabel }}
          </h2>
          <p class="mt-1 text-xs text-graphite/60 dark:text-stone-200">
            {{ entries.length }} 義項
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            v-for="dialect in dialectLabels"
            :key="dialect"
            class="px-2 py-0.5 bg-archive-green/10 dark:bg-emerald-900/40 text-archive-green dark:text-emerald-300 rounded-md text-xs sm:text-sm whitespace-nowrap"
          >
            {{ dialect }}
          </span>
          <svg
            class="w-4 h-4 text-graphite dark:text-stone-500 transition-transform"
            :class="expanded ? 'rotate-180' : ''"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
    </button>

    <div
      v-show="!collapsible || expanded"
      :class="collapsible ? 'py-3' : ''"
    >
      <article
        v-for="(entry, entryIdx) in entries"
        :key="entry.id"
        class="relative"
        :class="collapsible
          ? 'mt-4 first:mt-0'
          : 'mt-12 first:mt-0'"
      >
        <!-- Red divider between entries (desktop) -->
        <div v-if="!collapsible && entryIdx > 0" class="flex items-center gap-3 mb-8 -mt-2">
          <div class="flex-1 h-px bg-archive-green/30 dark:bg-archive-green/20"></div>
          <div class="w-1.5 h-1.5 rounded-full bg-archive-green/60 dark:bg-archive-green/40"></div>
          <div class="flex-1 h-px bg-archive-green/30 dark:bg-archive-green/20"></div>
        </div>
        <div class="space-y-6">
          <!-- Metadata badges + feedback button (top) -->
          <div class="flex items-start gap-3">
            <div class="flex flex-wrap gap-2 items-center flex-1 min-w-0">
              <span
                class="px-2 py-1 bg-kapok/10 dark:bg-kapok/20 text-kapok rounded-md text-xs sm:text-sm whitespace-nowrap"
              >
                {{ sourceLabel }}<template v-if="entry.source_id">: {{ entry.source_id }}</template>
              </span>

              <span
                class="px-2 py-1 bg-archive-green/10 dark:bg-emerald-900/40 text-archive-green dark:text-emerald-300 rounded-md text-xs sm:text-sm whitespace-nowrap"
              >
                {{ getDialectLabel(entry) }}
              </span>

              <span
                class="px-2 py-1 bg-muted-gold/10 dark:bg-amber-900/40 text-muted-gold dark:text-amber-300 rounded-md text-xs sm:text-sm whitespace-nowrap"
              >
                {{ getEntryTypeLabel(entry) }}
              </span>

              <span
                v-if="entry.meta?.register"
                class="px-2 py-1 bg-surface-highest dark:bg-stone-600/40 text-graphite dark:text-stone-200 rounded-md text-xs sm:text-sm whitespace-nowrap"
              >
                {{ entry.meta.register }}
              </span>

              <span
                v-if="entry.meta?.category"
                class="px-2 py-1 bg-surface-high dark:bg-stone-600/40 text-graphite dark:text-stone-200 rounded-md text-xs sm:text-sm break-words"
              >
                {{ entry.meta.category }}
              </span>
            </div>

            <FeedbackButton
              :entry-data="{
                word: entry.headword.display,
                source: entry.source_book,
                id: entry.id
              }"
              :initial-description="getEntryFeedbackDescription(entry)"
              initial-type="entry-error"
              icon-only-on-mobile
              button-class="inline-flex items-center gap-1.5 px-3 py-1 bg-archive-green/10 dark:bg-emerald-900/40 text-archive-green dark:text-emerald-300 rounded-md text-xs sm:text-sm whitespace-nowrap hover:bg-archive-green/20 dark:hover:bg-emerald-900/60 transition-colors"
              label-class="text-xs"
            />
          </div>

          <!-- Additional phonetic info -->
          <div v-if="shouldShowEntryJyutping(entry) || shouldShowEntryOriginalPhonetic(entry) || (entry.meta?.headword_variants && entry.meta.headword_variants.length > 0)" class="space-y-1 text-sm text-graphite dark:text-stone-200">
            <p v-if="shouldShowEntryJyutping(entry)">
              <span class="text-graphite/60 dark:text-stone-300 mr-2">{{ t('common.jyutpingColumn') }}:</span>
              <span class="text-kapok font-semibold">{{ getEntryJyutping(entry) }}</span>
            </p>
            <p v-if="shouldShowEntryOriginalPhonetic(entry)" class="break-words">
              <span class="text-graphite/60 dark:text-stone-300 mr-2">{{ t('dictCard.originalPhonetic') }}</span>
              {{ getEntryOriginalPhonetic(entry) }}
            </p>
            <p
              v-if="entry.meta?.headword_variants && entry.meta.headword_variants.length > 0"
              class="text-ink/80 dark:text-stone-300 break-words"
            >
              {{ t('dictCard.variantWords') }}{{ entry.meta.headword_variants.join('、') }}
            </p>
          </div>

          <!-- Senses / Definitions -->
          <div
            v-for="(sense, senseIdx) in entry.senses"
            :key="senseIdx"
            class="space-y-4"
            :class="entry.senses.length > 1 ? 'mb-8 last:mb-0' : ''"
          >
            <!-- Definition heading with sense number -->
            <div class="flex items-start gap-4">
              <span
                v-if="entry.senses.length > 1"
                class="flex-shrink-0 text-sm text-kapok font-bold italic font-serif"
              >
                {{ String(senseIdx + 1).padStart(2, '0') }}
              </span>

              <div class="flex-1 space-y-4">
                <!-- Definition title + inline label badge -->
                <div class="flex flex-wrap items-center gap-3">
                  <p
                    v-if="isCantoDict(entry)"
                    class="text-ink dark:text-stone-100 text-base sm:text-lg font-semibold leading-relaxed"
                    v-html="formatDefinitionWithLinks(sense.definition)"
                  ></p>
                  <p
                    v-else
                    class="text-ink dark:text-stone-100 text-base sm:text-lg font-semibold leading-relaxed"
                  >
                    {{ sense.definition }}
                  </p>

                  <span
                    v-if="sense.label"
                    class="px-2.5 py-0.5 bg-surface-highest dark:bg-stone-600/40 text-graphite dark:text-stone-200 text-xs sm:text-sm font-bold tracking-wider rounded"
                  >
                    {{ sense.label }}
                  </span>
                </div>

                <!-- Sub-senses -->
                <div
                  v-if="sense.sub_senses && sense.sub_senses.length > 0"
                  class="space-y-3"
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

                    <!-- Sub-sense examples in gray card -->
                    <div
                      v-if="subSense.examples && subSense.examples.length > 0"
                      class="bg-surface-low dark:bg-stone-900 p-3 sm:p-6 border-l-2 border-archive-green/30 dark:border-emerald-500/40 mt-3"
                    >
                      <h4 class="text-sm uppercase tracking-widest font-bold text-archive-green dark:text-emerald-300 mb-4">{{ t('dictCard.usageExamples') }}</h4>
                      <div class="space-y-4">
                        <div
                          v-for="(example, exIdx) in subSense.examples"
                          :key="exIdx"
                          class="space-y-1"
                        >
                          <p
                            v-if="isCantoDict(entry)"
                            class="font-serif text-base sm:text-lg text-ink dark:text-stone-100"
                            v-html="formatDefinitionWithLinks(example.text)"
                          ></p>
                          <p
                            v-else
                            class="font-serif text-base sm:text-lg text-ink dark:text-stone-100"
                          >
                            {{ example.text }}
                          </p>
                          <p
                            v-if="example.jyutping"
                            class="text-sm text-kapok font-semibold"
                          >
                            {{ example.jyutping }}
                          </p>
                          <p
                            v-if="example.translation"
                            class="text-sm text-graphite dark:text-stone-400"
                          >
                            {{ example.translation }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Direct examples in gray card -->
                <div
                  v-if="(!sense.sub_senses || sense.sub_senses.length === 0) && sense.examples && sense.examples.length > 0"
                  class="bg-surface-low dark:bg-stone-900 p-3 sm:p-6 border-l-2 border-archive-green/30 dark:border-emerald-500/40"
                >
                  <h4 class="text-sm uppercase tracking-widest font-bold text-archive-green dark:text-emerald-300 mb-4">{{ t('dictCard.usageExamples') }}</h4>
                  <div class="space-y-4">
                    <div
                      v-for="(example, exIdx) in sense.examples"
                      :key="exIdx"
                      class="space-y-1"
                    >
                      <p
                        v-if="isCantoDict(entry)"
                        class="font-serif text-base sm:text-lg text-ink dark:text-stone-100"
                        v-html="formatDefinitionWithLinks(example.text)"
                      ></p>
                      <p
                        v-else
                        class="font-serif text-base sm:text-lg text-ink dark:text-stone-100"
                      >
                        {{ example.text }}
                      </p>
                      <p
                        v-if="example.jyutping"
                        class="text-sm text-kapok font-semibold"
                      >
                        {{ example.jyutping }}
                      </p>
                      <p
                        v-if="example.translation"
                        class="text-sm text-graphite dark:text-stone-400"
                      >
                        {{ example.translation }}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            v-if="entry.meta?.notes"
            class="mt-3 sm:mt-4 p-3 sm:p-6 border-l-2 text-xs sm:text-sm"
            :class="entry.meta?.note_type === 'proofreader'
              ? 'bg-surface-low dark:bg-stone-900 border-kapok/40 dark:border-kapok/60 text-ink/80 dark:text-stone-300'
              : 'bg-surface-low dark:bg-stone-900 border-muted-gold/40 dark:border-amber-500/40 text-ink/80 dark:text-stone-300'"
          >
            <span
              class="font-semibold"
              :class="entry.meta?.note_type === 'proofreader' ? 'text-kapok' : 'text-muted-gold'"
            >
              {{ entry.meta?.note_type === 'proofreader' ? t('dictCard.proofreaderNote') : t('dictCard.note') }}
            </span>
            {{ entry.meta.notes }}
          </div>

          <div
            v-if="entry.meta?.etymology && typeof entry.meta.etymology === 'string'"
            class="mt-3 sm:mt-4 p-3 sm:p-6 border-l-2 bg-surface-low dark:bg-stone-900 border-archive-green/40 dark:border-emerald-500/40 text-xs sm:text-sm text-ink/80 dark:text-stone-300"
          >
            <span class="font-semibold text-archive-green dark:text-emerald-300">{{ t('dictCard.etymology') }}</span>
            {{ entry.meta.etymology }}
          </div>

          <div
            v-if="entry.meta?.references && entry.meta.references.length > 0"
            class="mt-3 sm:mt-4 p-3 sm:p-6 border-l-2 bg-surface-low dark:bg-stone-900 border-muted-gold/40 dark:border-amber-500/40 text-xs sm:text-sm text-ink/80 dark:text-stone-300"
          >
            <span class="font-semibold text-muted-gold">{{ t('dictCard.references') }}</span>
            <ul class="mt-2 space-y-2">
              <li
                v-for="(ref, refIdx) in entry.meta.references"
                :key="refIdx"
              >
                <span v-if="ref.author" class="font-medium">{{ ref.author }}</span>
                <span v-if="ref.work">《{{ ref.work }}》</span>
                <span v-if="ref.author || ref.work">：</span>
                <span v-if="ref.quote">{{ ref.quote }}</span>
                <span v-if="ref.source" class="text-graphite/60 dark:text-stone-200">（{{ ref.source }}）</span>
              </li>
            </ul>
          </div>

          <div
            v-if="entry.refs && entry.refs.length > 0"
            class="mt-4 text-sm"
          >
            <span class="text-graphite/60 dark:text-stone-200">{{ t('dictCard.seeAlso') }}</span>
            <span
              v-for="(ref, refIdx) in entry.refs"
              :key="refIdx"
              class="ml-2"
            >
              <NuxtLink
                v-if="ref.type === 'word'"
                :to="`/word/${encodeURIComponent(ref.target)}`"
                class="text-kapok hover:text-kapok/80 underline decoration-1 underline-offset-2"
              >
                {{ ref.target }}
              </NuxtLink>
              <span
                v-else
                class="text-graphite dark:text-stone-400"
              >
                {{ ref.target }}
              </span>
              <span
                v-if="refIdx < entry.refs.length - 1"
                class="text-graphite/40 dark:text-stone-600"
              >
                、
              </span>
            </span>
          </div>

          <div
            v-if="entry.meta?.usage"
            class="mt-4 text-sm text-graphite dark:text-stone-400"
          >
            <span class="font-semibold">{{ t('dictCard.usage') }}</span> {{ entry.meta.usage }}
          </div>
        </div>
      </article>
    </div>
    <!-- Divider at bottom of accordion (mobile, not on last item) -->
    <div v-if="collapsible && !isLast" class="flex items-center gap-3 mt-4">
      <div class="flex-1 h-px bg-archive-green/30 dark:bg-archive-green/20"></div>
      <div class="w-1.5 h-1.5 rounded-full bg-archive-green/60 dark:bg-archive-green/40"></div>
      <div class="flex-1 h-px bg-archive-green/30 dark:bg-archive-green/20"></div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'
import { hasDialectI18n } from '~/constants/dialect'

interface Props {
  sourceKey: string
  sourceLabel: string
  entries: DictionaryEntry[]
  tabJyutpingList?: string[]
  expanded?: boolean
  collapsible?: boolean
  active?: boolean
  isLast?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  tabJyutpingList: () => [],
  expanded: true,
  collapsible: true,
  active: false,
  isLast: false
})

defineEmits<{
  toggle: []
}>()

const { t } = useI18n()

const entries = computed(() => props.entries || [])
const panelClasses = computed(() => {
  if (props.collapsible) {
    return [
      'overflow-hidden',
      ''
    ]
  }
  return []
})

const dialectLabels = computed(() => {
  const set = new Set<string>()
  entries.value.forEach((entry) => {
    const label = getDialectLabel(entry)
    if (label) set.add(label)
  })
  return Array.from(set).slice(0, 3)
})

const tabJyutpingSet = computed(() => {
  const set = new Set<string>()
  props.tabJyutpingList.forEach((jp) => {
    const value = jp?.trim()
    if (value) set.add(value)
  })
  return set
})

const getEntryTypeLabel = (entry: DictionaryEntry) => {
  const labels = {
    character: t('dictCard.entryTypeCharacter'),
    word: t('dictCard.entryTypeWord'),
    phrase: t('dictCard.entryTypePhrase')
  }
  return labels[entry.entry_type] || entry.entry_type
}

const getDialectLabel = (entry: DictionaryEntry) => {
  const code = entry.dialect?.region_code?.toUpperCase()
  if (hasDialectI18n(code)) {
    return t(`dictCard.dialect.${code}`)
  }
  return entry.dialect?.name || ''
}

const isCantoDict = (entry: DictionaryEntry) => {
  return entry.source_book === '粵典 (words.hk)' || entry.source_book === '粵典'
}

const formatDefinitionWithLinks = (definition: string): string => {
  if (!definition) return ''
  const regex = /#([^\u0000-\u007F\u3000-\u303F\uFF00-\uFFEF\s]+)/g
  return definition.replace(regex, (match, word) => {
    const wordUrl = `/word/${encodeURIComponent(word)}`
    return `<a href="${wordUrl}" class="text-kapok hover:text-kapok/80 underline decoration-1 underline-offset-2 font-medium" onclick="event.stopPropagation()">${match}</a>`
  })
}

const getEntryJyutpingList = (entry: DictionaryEntry): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  const jps = entry.phonetic?.jyutping || []
  jps.forEach(jp => {
    const value = jp?.trim()
    if (!value) return
    if (!seen.has(value)) {
      seen.add(value)
      result.push(value)
    }
  })
  return result
}

const getEntryJyutping = (entry: DictionaryEntry): string => {
  return getEntryJyutpingList(entry).join('; ')
}

const getEntryOriginalPhonetic = (entry: DictionaryEntry): string => {
  const original = entry.phonetic?.original as string | string[] | undefined | null
  if (!original) return ''
  if (Array.isArray(original)) {
    return getEntryOriginalPhoneticList(entry).join('; ')
  }
  const value = original.trim()
  return value
}

const getEntryOriginalPhoneticList = (entry: DictionaryEntry): string[] => {
  const original = entry.phonetic?.original as string | string[] | undefined | null
  if (!original) return []
  const seen = new Set<string>()
  const result: string[] = []
  const addValue = (value: string) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    if (!seen.has(trimmed)) {
      seen.add(trimmed)
      result.push(trimmed)
    }
  }
  const splitParts = (value: string) => value.split(/[，,;；、]+/).map(part => part.trim()).filter(Boolean)
  if (Array.isArray(original)) {
    original.forEach((item: string) => {
      const parts = splitParts(item)
      if (parts.length > 0) {
        parts.forEach(addValue)
      } else {
        addValue(item)
      }
    })
    return result
  }
  const parts = splitParts(original)
  if (parts.length > 0) {
    parts.forEach(addValue)
  } else {
    addValue(original)
  }
  return result
}

const shouldShowEntryJyutping = (entry: DictionaryEntry): boolean => {
  const entryJps = getEntryJyutpingList(entry)
  if (entryJps.length === 0) return false
  const primarySet = tabJyutpingSet.value
  if (primarySet.size === 0) return true
  return entryJps.some(jp => !primarySet.has(jp))
}

const shouldShowEntryOriginalPhonetic = (entry: DictionaryEntry): boolean => {
  const originalList = getEntryOriginalPhoneticList(entry)
  if (originalList.length === 0) return false
  const primarySet = tabJyutpingSet.value
  if (primarySet.size === 0) return true
  if (originalList.length !== primarySet.size) return true
  return originalList.some(value => !primarySet.has(value))
}

const getEntryFeedbackDescription = (entry: DictionaryEntry): string => {
  const headerLines: string[] = [
    '【當前詞條信息，請喺呢度直接修改有問題嘅部分】',
    '',
    `詞頭：${entry.headword.display}`,
    entry.headword.normalized && entry.headword.normalized !== entry.headword.display
      ? `參考詞頭：${entry.headword.normalized}`
      : '',
    `粵拼：${(entry.phonetic.jyutping || []).join(':')}`,
    entry.phonetic.original &&
    entry.phonetic.original !== (entry.phonetic.jyutping || []).join(':')
      ? `原書注音：${entry.phonetic.original}` : '',
    (entry.meta?.headword_variants && entry.meta.headword_variants.length > 0)
      ? `異形詞：${entry.meta.headword_variants.join('、')}`
      : '',
    entry.entry_type ? `類型：${entry.entry_type}` : '',
    ''
  ].filter(Boolean)

  const senseLines: string[] = []
  entry.senses.forEach((sense, idx) => {
    const indexLabel = entry.senses.length > 1 ? `【義項 ${idx + 1}】` : '【義項】'
    senseLines.push(indexLabel)
    if (sense.label) {
      senseLines.push(`詞性：${sense.label}`)
    }
    senseLines.push(`釋義：${sense.definition}`)

    if (sense.sub_senses && sense.sub_senses.length > 0) {
      sense.sub_senses.forEach((sub) => {
        senseLines.push(`- 子義項 ${sub.label}）：${sub.definition}`)
        if (sub.examples && sub.examples.length > 0) {
          sub.examples.forEach((ex) => {
            senseLines.push(`  · 例句：${ex.text}`)
            if (ex.jyutping) senseLines.push(`    粵拼：${ex.jyutping}`)
            if (ex.translation) senseLines.push(`    翻譯：${ex.translation}`)
          })
        }
      })
    } else if (sense.examples && sense.examples.length > 0) {
      sense.examples.forEach((ex) => {
        senseLines.push(`- 例句：${ex.text}`)
        if (ex.jyutping) senseLines.push(`  粵拼：${ex.jyutping}`)
        if (ex.translation) senseLines.push(`  翻譯：${ex.translation}`)
      })
    }

    senseLines.push('')
  })

  if (entry.meta?.notes) {
    headerLines.push('備註：' + entry.meta.notes, '')
  }

  if (entry.meta?.etymology && typeof entry.meta.etymology === 'string') {
    headerLines.push('詞源：' + entry.meta.etymology, '')
  }

  if (entry.meta?.references && entry.meta.references.length > 0) {
    headerLines.push('參考文獻：')
    entry.meta.references.forEach((ref) => {
      const parts: string[] = []
      if (ref.author) parts.push(ref.author)
      if (ref.work) parts.push(`《${ref.work}》`)
      if (ref.quote) parts.push(ref.quote)
      if (ref.source) parts.push(`（${ref.source}）`)
      headerLines.push('- ' + parts.join('：'))
    })
    headerLines.push('')
  }

  if (entry.refs && entry.refs.length > 0) {
    headerLines.push('參見：' + entry.refs.map((r) => r.target).join('、'), '')
  }

  return [...headerLines, ...senseLines].join('\n')
}
</script>
