<template>
  <section :class="panelClasses">
    <button
      v-if="collapsible"
      type="button"
      class="w-full text-left px-4 py-3"
      @click="$emit('toggle')"
    >
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-blue-700 dark:text-blue-300 break-words">
            {{ sourceLabel }}
          </h3>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ entries.length }} {{ t('common.remainingSuffix') }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            v-for="dialect in dialectLabels"
            :key="dialect"
            class="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-xs whitespace-nowrap"
          >
            {{ dialect }}
          </span>
          <svg
            class="w-4 h-4 text-gray-500 transition-transform"
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

    <div v-else class="px-4 py-3">
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0">
          <h3 class="text-lg font-semibold text-blue-700 dark:text-blue-300 break-words">
            {{ sourceLabel }}
          </h3>
          <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {{ entries.length }} {{ t('common.remainingSuffix') }}
          </p>
        </div>
        <div class="flex items-center gap-2 flex-shrink-0">
          <span
            v-for="dialect in dialectLabels"
            :key="dialect"
            class="px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-xs whitespace-nowrap"
          >
            {{ dialect }}
          </span>
        </div>
      </div>
    </div>

    <div
      v-show="!collapsible || expanded"
      class="border-t border-gray-100 dark:border-gray-700 px-4 py-4"
    >
      <article
        v-for="entry in entries"
        :key="entry.id"
        class="mt-4 pt-4 first:mt-0 first:pt-0 border-t first:border-t-0 border-gray-200 dark:border-gray-700"
      >
        <div class="pb-3">
          <div class="flex items-start gap-3">
            <div class="flex flex-wrap gap-2 items-center flex-1 min-w-0">
              <span
                v-if="entry.source_id"
                class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs whitespace-nowrap"
              >
                #{{ entry.source_id }}
              </span>

              <span
                class="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-md text-xs whitespace-nowrap"
              >
                {{ getDialectLabel(entry) }}
              </span>

              <span
                class="px-2.5 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 rounded-md text-xs whitespace-nowrap"
              >
                {{ getEntryTypeLabel(entry) }}
              </span>

              <span
                v-if="entry.meta?.register"
                class="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-md text-xs whitespace-nowrap"
              >
                {{ entry.meta.register }}
              </span>

              <span
                v-if="entry.meta?.category"
                class="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 rounded-md text-xs break-words"
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
              button-class="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 rounded-lg text-sm whitespace-nowrap hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors"
              label-class="text-sm"
            />
          </div>

          <p
            v-if="shouldShowEntryJyutping(entry)"
            class="mt-2 text-sm text-gray-600 dark:text-gray-300"
          >
            <span class="text-gray-500 dark:text-gray-400 mr-2">{{ t('common.jyutpingColumn') }}:</span>
            <span class="font-mono text-blue-600 dark:text-blue-400 font-semibold">{{ getEntryJyutping(entry) }}</span>
          </p>

          <p
            v-if="shouldShowEntryOriginalPhonetic(entry)"
            class="mt-2 text-sm text-gray-600 dark:text-gray-300 break-words"
          >
            <span class="text-gray-500 dark:text-gray-400 mr-2">{{ t('dictCard.originalPhonetic') }}</span>
            {{ getEntryOriginalPhonetic(entry) }}
          </p>

          <p
            v-if="entry.meta?.headword_variants && entry.meta.headword_variants.length > 0"
            class="text-sm text-gray-700 dark:text-gray-300 break-words mt-2"
          >
            {{ t('dictCard.variantWords') }}{{ entry.meta.headword_variants.join('、') }}
          </p>
        </div>

        <div class="pt-2">
          <div
            v-for="(sense, senseIdx) in entry.senses"
            :key="senseIdx"
            class="mb-4 last:mb-0"
          >
            <div class="flex items-start gap-3">
              <span
                v-if="entry.senses.length > 1"
                class="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm flex items-center justify-center font-semibold"
              >
                {{ senseIdx + 1 }}
              </span>

              <div class="flex-1">
                <span
                  v-if="sense.label"
                  class="inline-block text-sm text-gray-500 dark:text-gray-400 mb-1"
                >
                  {{ sense.label }}
                </span>

                <p
                  v-if="isCantoDict(entry)"
                  class="text-gray-900 dark:text-gray-100 text-base leading-relaxed mb-2"
                  v-html="formatDefinitionWithLinks(sense.definition)"
                ></p>
                <p
                  v-else
                  class="text-gray-900 dark:text-gray-100 text-base leading-relaxed mb-2"
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
                    class="pl-4 border-l-2 border-blue-200 dark:border-blue-700"
                  >
                    <div class="mb-2">
                      <span class="inline-block font-semibold text-blue-700 dark:text-blue-300 mr-2">
                        {{ subSense.label }})
                      </span>
                      <span class="text-gray-900 dark:text-gray-100">
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
                        class="pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                      >
                        <p
                          v-if="isCantoDict(entry)"
                          class="text-gray-700 dark:text-gray-300 text-base"
                          v-html="formatDefinitionWithLinks(example.text)"
                        ></p>
                        <p
                          v-else
                          class="text-gray-700 dark:text-gray-300 text-base"
                        >
                          {{ example.text }}
                        </p>
                        <p
                          v-if="example.jyutping"
                          class="text-sm text-blue-600 dark:text-blue-400 font-mono mt-1"
                        >
                          {{ example.jyutping }}
                        </p>
                        <p
                          v-if="example.translation"
                          class="text-base text-gray-500 dark:text-gray-400 mt-1"
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
                    class="pl-4 border-l-2 border-gray-200 dark:border-gray-700"
                  >
                    <p
                      v-if="isCantoDict(entry)"
                      class="text-gray-700 dark:text-gray-300 text-base"
                      v-html="formatDefinitionWithLinks(example.text)"
                    ></p>
                    <p
                      v-else
                      class="text-gray-700 dark:text-gray-300 text-base"
                    >
                      {{ example.text }}
                    </p>
                    <p
                      v-if="example.jyutping"
                      class="text-sm text-blue-600 dark:text-blue-400 font-mono mt-1"
                    >
                      {{ example.jyutping }}
                    </p>
                    <p
                      v-if="example.translation"
                      class="text-base text-gray-500 dark:text-gray-400 mt-1"
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
              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-400 dark:border-blue-600 text-gray-700 dark:text-gray-300'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-600 text-gray-700 dark:text-gray-300'"
          >
            <span
              class="font-semibold"
              :class="entry.meta?.note_type === 'proofreader' ? 'text-blue-700 dark:text-blue-300' : 'text-yellow-700 dark:text-yellow-300'"
            >
              {{ entry.meta?.note_type === 'proofreader' ? t('dictCard.proofreaderNote') : t('dictCard.note') }}
            </span>
            {{ entry.meta.notes }}
          </div>

          <div
            v-if="entry.meta?.etymology && typeof entry.meta.etymology === 'string'"
            class="mt-4 p-3 border-l-4 bg-purple-50 dark:bg-purple-900/20 border-purple-400 dark:border-purple-600 text-sm text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold text-purple-700 dark:text-purple-300">{{ t('dictCard.etymology') }}</span>
            {{ entry.meta.etymology }}
          </div>

          <div
            v-if="entry.meta?.references && entry.meta.references.length > 0"
            class="mt-4 p-3 border-l-4 bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600 text-sm text-gray-700 dark:text-gray-300"
          >
            <span class="font-semibold text-amber-700 dark:text-amber-300">{{ t('dictCard.references') }}</span>
            <ul class="mt-2 space-y-2">
              <li
                v-for="(ref, refIdx) in entry.meta.references"
                :key="refIdx"
              >
                <span v-if="ref.author" class="font-medium">{{ ref.author }}</span>
                <span v-if="ref.work">《{{ ref.work }}》</span>
                <span v-if="ref.author || ref.work">：</span>
                <span v-if="ref.quote">{{ ref.quote }}</span>
                <span v-if="ref.source" class="text-gray-500 dark:text-gray-400">（{{ ref.source }}）</span>
              </li>
            </ul>
          </div>

          <div
            v-if="entry.refs && entry.refs.length > 0"
            class="mt-4 text-sm"
          >
            <span class="text-gray-500 dark:text-gray-400">{{ t('dictCard.seeAlso') }}</span>
            <span
              v-for="(ref, refIdx) in entry.refs"
              :key="refIdx"
              class="ml-2"
            >
              <NuxtLink
                v-if="ref.type === 'word'"
                :to="`/word/${encodeURIComponent(ref.target)}`"
                class="text-blue-600 dark:text-blue-400 hover:underline"
              >
                {{ ref.target }}
              </NuxtLink>
              <span
                v-else
                class="text-gray-600 dark:text-gray-400"
              >
                {{ ref.target }}
              </span>
              <span
                v-if="refIdx < entry.refs.length - 1"
                class="text-gray-400 dark:text-gray-500"
              >
                、
              </span>
            </span>
          </div>

          <div
            v-if="entry.meta?.usage"
            class="mt-4 text-sm text-gray-600 dark:text-gray-400"
          >
            <span class="font-semibold">{{ t('dictCard.usage') }}</span> {{ entry.meta.usage }}
          </div>
        </div>
      </article>
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
}

const props = withDefaults(defineProps<Props>(), {
  tabJyutpingList: () => [],
  expanded: true,
  collapsible: true,
  active: false
})

defineEmits<{
  toggle: []
}>()

const { t } = useI18n()

const entries = computed(() => props.entries || [])
const panelClasses = computed(() => [
  'rounded-xl bg-white dark:bg-gray-800 overflow-hidden shadow-sm dark:shadow-black/20',
  props.active
    ? 'shadow-md dark:shadow-black/30'
    : ''
])

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
    return `<a href="${wordUrl}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium" onclick="event.stopPropagation()">${match}</a>`
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
