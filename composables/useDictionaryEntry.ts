import type { DictionaryEntry } from '~/types/dictionary'
import { hasDialectI18n } from '~/constants/dialect'

const CANTO_DICT_SOURCES = ['粵典 (words.hk)', '粵典']

export const useDictionaryEntry = () => {
  const { t } = useI18n()
  const { wordPath } = useAppRoutes()

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
      const wordUrl = wordPath(word)
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
    const line = (labelKey: string, value: string) => `${t(labelKey)}${value}`

    const headerLines: string[] = [
      t('feedback.prefill.header'),
      '',
      line('feedback.prefill.headword', entry.headword.display),
      entry.headword.normalized && entry.headword.normalized !== entry.headword.display
        ? line('feedback.prefill.normalizedHeadword', entry.headword.normalized)
        : '',
      line('feedback.prefill.jyutping', (entry.phonetic.jyutping || []).join(':')),
      entry.phonetic.original &&
      entry.phonetic.original !== (entry.phonetic.jyutping || []).join(':')
        ? line('feedback.prefill.originalPhonetic', String(entry.phonetic.original)) : '',
      (entry.meta?.headword_variants && entry.meta.headword_variants.length > 0)
        ? line('feedback.prefill.variantWords', entry.meta.headword_variants.join(t('feedback.prefill.listSeparator')))
        : '',
      entry.entry_type ? line('feedback.prefill.entryType', getEntryTypeLabel(entry)) : '',
      ''
    ].filter(Boolean)

    const senseLines: string[] = []
    entry.senses.forEach((sense, idx) => {
      const indexLabel = entry.senses.length > 1
        ? t('feedback.prefill.senseHeading', { index: idx + 1 })
        : t('feedback.prefill.singleSenseHeading')
      senseLines.push(indexLabel)
      if (sense.label) {
        senseLines.push(line('feedback.prefill.partOfSpeech', sense.label))
      }
      senseLines.push(line('feedback.prefill.definition', sense.definition))

      if (sense.sub_senses && sense.sub_senses.length > 0) {
        sense.sub_senses.forEach((sub) => {
          senseLines.push(t('feedback.prefill.subSense', {
            label: sub.label,
            definition: sub.definition
          }))
          if (sub.examples && sub.examples.length > 0) {
            sub.examples.forEach((ex) => {
              senseLines.push(`  ${line('feedback.prefill.example', ex.text)}`)
              if (ex.jyutping) senseLines.push(`    ${line('feedback.prefill.jyutping', ex.jyutping)}`)
              if (ex.translation) senseLines.push(`    ${line('feedback.prefill.translation', ex.translation)}`)
            })
          }
        })
      } else if (sense.examples && sense.examples.length > 0) {
        sense.examples.forEach((ex) => {
          senseLines.push(`- ${line('feedback.prefill.example', ex.text)}`)
          if (ex.jyutping) senseLines.push(`  ${line('feedback.prefill.jyutping', ex.jyutping)}`)
          if (ex.translation) senseLines.push(`  ${line('feedback.prefill.translation', ex.translation)}`)
        })
      }

      senseLines.push('')
    })

    if (entry.meta?.notes) {
      headerLines.push(line('feedback.prefill.notes', entry.meta.notes), '')
    }

    if (entry.meta?.etymology && typeof entry.meta.etymology === 'string') {
      headerLines.push(line('feedback.prefill.etymology', entry.meta.etymology), '')
    }

    if (entry.meta?.references && entry.meta.references.length > 0) {
      headerLines.push(t('feedback.prefill.referencesHeading'))
      entry.meta.references.forEach((ref) => {
        const parts: string[] = []
        if (ref.author) parts.push(ref.author)
        if (ref.work) parts.push(ref.work)
        if (ref.quote) parts.push(ref.quote)
        if (ref.source) parts.push(ref.source)
        headerLines.push(`- ${parts.join(' | ')}`)
      })
      headerLines.push('')
    }

    if (entry.refs && entry.refs.length > 0) {
      headerLines.push(
        line('feedback.prefill.seeAlso', entry.refs.map((r) => r.target).join(t('feedback.prefill.listSeparator'))),
        ''
      )
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
