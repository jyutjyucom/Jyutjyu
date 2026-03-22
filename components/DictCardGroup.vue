<template>
  <div
    v-if="entries.length > 0"
    class="dict-card bg-surface-low dark:bg-stone-900 overflow-visible transition-colors duration-300"
    :class="cardClickable ? 'cursor-pointer group hover:bg-surface-high dark:hover:bg-stone-800' : ''"
    :role="cardClickable ? 'link' : undefined"
    :tabindex="cardClickable ? 0 : undefined"
    @click="handleCardClick"
    @keydown.enter.prevent="handleCardKeydown"
  >
    <!-- 头部：词头 + 粤拼（共享信息） -->
    <div
      :class="headerClasses"
      :style="stickyHeaderStyle"
    >
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-3xl font-bold text-ink dark:text-parchment mb-1 break-words">
              {{ primary.headword.display }}
            <span
              v-if="primary.headword.is_placeholder"
              class="ml-2 text-sm text-kapok font-normal"
              :title="t('dictCard.placeholderWord')"
            >
              {{ t('dictCard.placeholderWord') }}
            </span>
            <sup
              v-if="primary.meta?.variant_number"
              class="ml-1 text-base text-graphite/60 dark:text-stone-500"
            >
              {{ primary.meta.variant_number }}
            </sup>
          </h3>

          <div class="mt-2">
            <div
              v-for="(jp, idx) in primary.phonetic.jyutping"
              :key="idx"
              class="flex items-center gap-1.5 flex-wrap"
            >
              <div class="text-lg text-kapok font-semibold break-words">
                {{ jp }}
              </div>
            </div>
          </div>
          <p v-if="dictionaryCount > 0" class="mt-2 text-sm text-graphite/60 dark:text-stone-500">
            {{ t('dictCard.collectedBy', { count: dictionaryCount }) }}
          </p>

          <p
            v-if="primary.headword.display !== primary.headword.normalized"
            class="text-sm text-graphite/60 dark:text-stone-500 break-words mt-1"
          >
            {{ t('dictCard.standardWriting') }}{{ primary.headword.normalized }}
          </p>
        </div>
      </div>
    </div>

    <!-- 内容：按词典分段 -->
    <div class="card-body px-6 py-4">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="mt-4 pt-4 first:mt-0 first:pt-0 border-t first:border-t-0 border-outline-soft/20 dark:border-stone-800"
      >
        <!-- 词典标签区 -->
        <div class="flex items-start gap-3">
          <div class="flex flex-wrap gap-2 items-center flex-1 min-w-0">
            <span class="px-3 py-1 bg-kapok/10 dark:bg-kapok/20 text-kapok rounded-lg text-sm whitespace-nowrap">
              {{ getEntrySourceBookLabel(entry) }}<template v-if="entry.source_id">: {{ entry.source_id }}</template>
            </span>

            <span class="px-3 py-1 bg-archive-green/10 dark:bg-archive-green/20 text-archive-green rounded-lg text-sm whitespace-nowrap">
              {{ getDialectLabel(entry) }}
            </span>

            <span class="px-3 py-1 bg-muted-gold/10 dark:bg-muted-gold/20 text-muted-gold rounded-lg text-sm whitespace-nowrap">
              {{ getEntryTypeLabel(entry) }}
            </span>

            <span
              v-if="entry.meta?.register"
              class="px-3 py-1 bg-surface-highest dark:bg-stone-800 text-graphite dark:text-stone-400 rounded-lg text-sm whitespace-nowrap"
            >
              {{ entry.meta.register }}
            </span>

            <span
              v-if="entry.meta?.category"
              class="px-3 py-1 bg-surface-high dark:bg-stone-800 text-graphite dark:text-stone-400 rounded-lg text-sm break-words max-w-full"
            >
              {{ entry.meta.category }}
            </span>
          </div>

          <div class="flex-shrink-0">
            <FeedbackButton
              :entry-data="{
                word: entry.headword.display,
                source: entry.source_book,
                id: entry.id
              }"
              :initial-description="getEntryFeedbackDescription(entry)"
              initial-type="entry-error"
              icon-only-on-mobile
              button-class="inline-flex items-center gap-1.5 px-3 py-1 bg-archive-green/10 dark:bg-archive-green/40 text-archive-green rounded-md text-sm whitespace-nowrap hover:bg-archive-green/20 dark:hover:bg-archive-green/50 transition-colors"
              label-class="text-sm"
            />
          </div>
        </div>

        <!-- 仅当该词典粤拼与主词条不同才显示 -->
        <div v-if="shouldShowEntryJyutping(entry)" class="mt-3 text-sm">
          <span class="text-sm text-graphite/60 dark:text-stone-500 mr-2">{{ t('common.jyutpingColumn') }}:</span>
          <span class="text-kapok font-semibold">{{ getEntryJyutping(entry) }}</span>
        </div>

        <div v-if="shouldShowEntryOriginalPhonetic(entry)" class="mt-2 text-sm">
          <span class="text-sm text-graphite/60 dark:text-stone-500 mr-2">{{ t('dictCard.originalPhonetic') }}</span>
          <span class="text-ink/80 dark:text-stone-300 break-words">{{ getEntryOriginalPhonetic(entry) }}</span>
        </div>

        <p
          v-if="entry.meta?.headword_variants && entry.meta.headword_variants.length > 0"
          class="text-base text-ink dark:text-stone-100 break-words mt-3"
        >
          {{ t('dictCard.variantWords') }}{{ entry.meta.headword_variants.join('、') }}
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
                {{ String(senseIdx + 1).padStart(2, '0') }}
              </span>

              <div class="flex-1">
                <span
                  v-if="sense.label"
                  class="inline-block text-sm text-graphite/60 dark:text-stone-500 mb-1"
                >
                  {{ sense.label }}
                </span>

                <p
                  v-if="isCantoDict(entry)"
                  class="text-ink dark:text-stone-100 text-base leading-relaxed mb-2"
                  v-html="formatDefinitionWithLinks(sense.definition)"
                ></p>
                <p
                  v-else
                  class="text-ink dark:text-stone-100 text-base leading-relaxed mb-2"
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
                          class="text-ink/80 dark:text-stone-300 text-base"
                          v-html="formatDefinitionWithLinks(example.text)"
                        ></p>
                        <p
                          v-else
                          class="text-ink/80 dark:text-stone-300 text-base"
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
                          class="text-base text-graphite/60 dark:text-stone-500 mt-1"
                        >
                          → {{ example.translation }}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  v-if="(!sense.sub_senses || sense.sub_senses.length === 0) && sense.examples && sense.examples.length > 0"
                  class="space-y-2"
                >
                  <div
                    v-for="(example, exIdx) in sense.examples"
                    :key="exIdx"
                    class="pl-4 border-l-2 border-outline-soft/20 dark:border-stone-800"
                  >
                    <p
                      v-if="isCantoDict(entry)"
                      class="text-ink/80 dark:text-stone-300 text-base"
                      v-html="formatDefinitionWithLinks(example.text)"
                    ></p>
                    <p
                      v-else
                      class="text-ink/80 dark:text-stone-300 text-base"
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
                      class="text-base text-graphite/60 dark:text-stone-500 mt-1"
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
            :class="entry.meta?.note_type === 'proofreader'
              ? 'bg-surface-low dark:bg-stone-900 border-kapok/40 text-ink/80 dark:text-stone-300'
              : 'bg-surface-low dark:bg-stone-900 border-muted-gold/40 text-ink/80 dark:text-stone-300'"
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
            class="mt-4 p-4 border-l-2 bg-surface-low dark:bg-stone-900 border-archive-green/40 rounded-lg text-sm text-ink/80 dark:text-stone-300"
          >
            <span class="font-semibold text-archive-green">{{ t('dictCard.etymology') }}</span>
            {{ entry.meta.etymology }}
          </div>

          <div
            v-if="entry.meta?.references && entry.meta.references.length > 0"
            class="mt-4 p-4 border-l-2 bg-surface-low dark:bg-stone-900 border-muted-gold/40 rounded-lg text-sm text-ink/80 dark:text-stone-300"
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
                <span v-if="ref.source" class="text-graphite/60 dark:text-stone-500">（{{ ref.source }}）</span>
              </li>
            </ul>
          </div>

          <div
            v-if="entry.refs && entry.refs.length > 0"
            class="mt-4 text-sm"
          >
            <span class="text-graphite/60 dark:text-stone-500">{{ t('dictCard.seeAlso') }}</span>
            <span
              v-for="(ref, refIdx) in entry.refs"
              :key="refIdx"
              class="ml-2"
            >
              <NuxtLink
                v-if="ref.type === 'word'"
                :to="`/word/${encodeURIComponent(ref.target)}`"
                class="text-kapok underline decoration-1 underline-offset-2"
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
            v-if="showDetails && entry.meta?.usage"
            class="mt-4 text-sm text-graphite dark:text-stone-400"
          >
            <span class="font-semibold">{{ t('dictCard.usage') }}</span> {{ entry.meta.usage }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DictionaryEntry } from '~/types/dictionary'
import { hasDialectI18n } from '~/constants/dialect'

const { t } = useI18n()
const { getLocalizedSourceBookLabel } = useLocalizedDictionary()

interface Props {
  entries: DictionaryEntry[]
  showDetails?: boolean
  stickyHeader?: boolean
  stickyOffset?: number
  cardClickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true,
  stickyHeader: false,
  stickyOffset: 0,
  cardClickable: false
})

const entries = computed(() => props.entries || [])
const headerClasses = computed(() => [
  'card-header px-6 py-4 border-b border-outline-soft/20 dark:border-stone-800 transition-colors duration-300',
  props.stickyHeader
    ? 'sticky z-[5] bg-surface-low/95 dark:bg-stone-900/95 backdrop-blur supports-[backdrop-filter]:bg-surface-low/90 supports-[backdrop-filter]:dark:bg-stone-900/90'
    : '',
  props.cardClickable
    ? 'group-hover:bg-surface-high dark:group-hover:bg-stone-800'
    : ''
])
const stickyHeaderStyle = computed(() => {
  if (!props.stickyHeader) return undefined
  return {
    top: `${Math.max(0, props.stickyOffset)}px`
  }
})
const primary = computed(() => entries.value[0] as DictionaryEntry)
const dictionaryCount = computed(() => {
  const sources = new Set<string>()
  entries.value.forEach(entry => {
    const value = entry.source_book?.trim()
    if (value) sources.add(value)
  })
  return sources.size || entries.value.length
})
const primaryJyutpingSet = computed(() => {
  const set = new Set<string>()
  const jps = primary.value?.phonetic?.jyutping || []
  jps.forEach(jp => {
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

const getEntrySourceBookLabel = (entry: DictionaryEntry) => {
  return getLocalizedSourceBookLabel(entry.source_book)
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
  if (!entry || entry.id === primary.value?.id) return false
  const entryJps = getEntryJyutpingList(entry)
  if (entryJps.length === 0) return false
  const primarySet = primaryJyutpingSet.value
  return entryJps.some(jp => !primarySet.has(jp))
}

const shouldShowEntryOriginalPhonetic = (entry: DictionaryEntry): boolean => {
  const originalList = getEntryOriginalPhoneticList(entry)
  if (originalList.length === 0) return false
  const primarySet = primaryJyutpingSet.value
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

const shouldSkipCardNavigation = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null
  if (!element) return false
  return !!element.closest('a, button, input, textarea, select, label, [role="button"], [data-no-card-nav]')
}

const openPrimaryWordPage = () => {
  const word = primary.value?.headword?.display?.trim()
  if (!word) return
  navigateTo(`/word/${encodeURIComponent(word)}`)
}

const handleCardClick = (event: MouseEvent) => {
  if (!props.cardClickable) return
  if (shouldSkipCardNavigation(event.target)) return
  openPrimaryWordPage()
}

const handleCardKeydown = (event: KeyboardEvent) => {
  if (!props.cardClickable) return
  if (shouldSkipCardNavigation(event.target)) return
  if (event.key !== 'Enter') return
  openPrimaryWordPage()
}

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
