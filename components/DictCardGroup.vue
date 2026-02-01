<template>
  <div v-if="entries.length > 0" class="dict-card bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow overflow-hidden">
    <!-- 头部：词头 + 粤拼（共享信息） -->
    <div class="card-header px-6 py-4 border-b border-gray-100 dark:border-gray-700">
      <div class="flex flex-col md:flex-row md:items-start md:justify-between gap-3 md:gap-4">
        <div class="flex-1 min-w-0">
          <h3 class="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 break-words">
            {{ primary.headword.display }}
            <span
              v-if="primary.headword.is_placeholder"
              class="ml-2 text-sm text-orange-600 font-normal"
              :title="t('dictCard.placeholderWord')"
            >
              {{ t('dictCard.placeholderWord') }}
            </span>
            <sup
              v-if="primary.meta?.variant_number"
              class="ml-1 text-base text-gray-500 dark:text-gray-400"
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
              <div class="font-mono text-lg text-blue-600 dark:text-blue-400 font-semibold break-words">
                {{ jp }}
              </div>
            </div>
          </div>
          <p v-if="dictionaryCount > 0" class="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {{ t('dictCard.collectedBy', { count: dictionaryCount }) }}
          </p>

          <p
            v-if="primary.headword.display !== primary.headword.normalized"
            class="text-sm text-gray-500 dark:text-gray-400 break-words mt-1"
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
        class="mt-4 pt-4 first:mt-0 first:pt-0 border-t first:border-t-0 border-gray-200 dark:border-gray-700"
      >
        <!-- 词典标签区 -->
        <div class="flex items-start gap-3">
          <div class="flex flex-wrap gap-2 items-center flex-1 min-w-0">
            <span class="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm whitespace-nowrap">
              {{ entry.source_book }}<template v-if="entry.source_id">: {{ entry.source_id }}</template>
            </span>

            <span class="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm whitespace-nowrap">
              {{ getDialectLabel(entry) }}
            </span>

            <span class="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 rounded-lg text-sm whitespace-nowrap">
              {{ getEntryTypeLabel(entry) }}
            </span>

            <span
              v-if="entry.meta?.register"
              class="px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm whitespace-nowrap"
            >
              {{ entry.meta.register }}
            </span>

            <span
              v-if="entry.meta?.category"
              class="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-sm break-words max-w-full"
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
              button-class="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg text-sm whitespace-nowrap hover:bg-orange-100 dark:hover:bg-orange-900/50 transition-colors"
              label-class="text-sm"
            />
          </div>
        </div>

        <!-- 仅当该词典粤拼与主词条不同才显示 -->
        <div v-if="shouldShowEntryJyutping(entry)" class="mt-3 text-sm">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-2">{{ t('common.jyutpingColumn') }}:</span>
          <span class="font-mono text-blue-600 dark:text-blue-400 font-semibold">{{ getEntryJyutping(entry) }}</span>
        </div>

        <div v-if="shouldShowEntryOriginalPhonetic(entry)" class="mt-2 text-sm">
          <span class="text-sm text-gray-500 dark:text-gray-400 mr-2">{{ t('dictCard.originalPhonetic') }}</span>
          <span class="text-gray-700 dark:text-gray-300 break-words">{{ getEntryOriginalPhonetic(entry) }}</span>
        </div>

        <p
          v-if="entry.meta?.headword_variants && entry.meta.headword_variants.length > 0"
          class="text-base text-gray-900 dark:text-gray-100 break-words mt-3"
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
                :to="`/search?q=${encodeURIComponent(ref.target)}`"
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
            v-if="showDetails && entry.meta?.usage"
            class="mt-4 text-sm text-gray-600 dark:text-gray-400"
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

const { t } = useI18n()

interface Props {
  entries: DictionaryEntry[]
  showDetails?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showDetails: true
})

const entries = computed(() => props.entries || [])
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
  if (code === 'GZ' || code === 'HK' || code === 'YUE' || code === 'QZ' || code === 'KP') {
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
    const searchUrl = `/search?q=${encodeURIComponent(word)}`
    return `<a href="${searchUrl}" class="text-blue-600 hover:text-blue-800 hover:underline font-medium" onclick="event.stopPropagation()">${match}</a>`
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
