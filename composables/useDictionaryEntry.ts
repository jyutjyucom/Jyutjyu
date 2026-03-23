import type { DictionaryEntry } from '~/types/dictionary'
import { hasDialectI18n } from '~/constants/dialect'

const CANTO_DICT_SOURCES = ['粵典 (words.hk)', '粵典']

export const useDictionaryEntry = () => {
  const { t } = useI18n()

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
    return CANTO_DICT_SOURCES.includes(entry.source_book)
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

  const getEntryOriginalPhonetic = (entry: DictionaryEntry): string => {
    const original = entry.phonetic?.original as string | string[] | undefined | null
    if (!original) return ''
    if (Array.isArray(original)) {
      return getEntryOriginalPhoneticList(entry).join('; ')
    }
    return original.trim()
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

  return {
    getEntryTypeLabel,
    getDialectLabel,
    isCantoDict,
    formatDefinitionWithLinks,
    getEntryJyutpingList,
    getEntryJyutping,
    getEntryOriginalPhonetic,
    getEntryOriginalPhoneticList,
    getEntryFeedbackDescription
  }
}
