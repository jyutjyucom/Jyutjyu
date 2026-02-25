import { readFile, writeFile, mkdir, rm } from 'node:fs/promises'
import { resolve, join } from 'node:path'

const PAGE_SIZES = [100, 500, 1000]
const SORTS = ['headword', 'jyutping']
const DICTIONARY_ROOT = resolve(process.cwd(), 'public', 'dictionaries')
const DICTIONARY_INDEX_PATH = resolve(DICTIONARY_ROOT, 'index.json')
const BROWSE_INDEX_ROOT = resolve(process.cwd(), 'public', 'browse-index')

const normalizeSpace = (value) => String(value || '').replace(/\s+/g, ' ').trim()
const toComparableKey = (value) => normalizeSpace(value).toLowerCase()

const getCanonicalHeadword = (entry) => {
  const normalized = normalizeSpace(entry?.headword?.normalized || '')
  if (normalized) return normalized
  return normalizeSpace(entry?.headword?.display || '')
}

const getPrimaryJyutping = (entry) => {
  const primary = entry?.phonetic?.jyutping?.[0] || ''
  return normalizeSpace(primary).toLowerCase()
}

const sortHeadwords = (headwords) => [...headwords].sort((a, b) => a.localeCompare(b, 'zh-Hant'))

const sortByJyutping = (headwordMap, jyutpingMap) => {
  const rows = Array.from(headwordMap.entries()).map(([comparable, headword]) => ({
    comparable,
    headword,
    jyutping: jyutpingMap.get(comparable) || ''
  }))

  rows.sort((a, b) => {
    const aMissing = a.jyutping ? 0 : 1
    const bMissing = b.jyutping ? 0 : 1
    if (aMissing !== bMissing) return aMissing - bMissing

    const jyutpingCompare = a.jyutping.localeCompare(b.jyutping, 'en')
    if (jyutpingCompare !== 0) return jyutpingCompare

    return a.headword.localeCompare(b.headword, 'zh-Hant')
  })

  return rows.map((row) => row.headword)
}

const toScopeHeadwords = (headwordMap, jyutpingMap) => ({
  byHeadword: sortHeadwords(Array.from(headwordMap.values())),
  byJyutping: sortByJyutping(headwordMap, jyutpingMap)
})

const readJsonFile = async (filePath) => {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

const readDictionaryEntriesFile = async (filePath) => {
  const parsed = await readJsonFile(filePath)
  return Array.isArray(parsed) ? parsed : []
}

const pickDictionaryLabel = (dict) => {
  if (!dict?.name) return dict?.id || ''
  if (typeof dict.name === 'string') return dict.name

  return dict.name['yue-Hant']
    || dict.name['yue-Hans']
    || Object.values(dict.name).find((value) => typeof value === 'string' && value.trim())
    || dict.id
}

const loadDictionaryIndex = async () => {
  const parsed = await readJsonFile(DICTIONARY_INDEX_PATH)
  if (!Array.isArray(parsed?.dictionaries)) {
    throw new Error(`Invalid dictionary index at ${DICTIONARY_INDEX_PATH}`)
  }
  return parsed.dictionaries
}

const getDictionaryEntries = async (dict) => {
  if (!dict?.chunked && dict?.file) {
    return readDictionaryEntriesFile(resolve(DICTIONARY_ROOT, dict.file))
  }

  if (dict?.chunked && dict?.chunk_dir) {
    const manifestPath = resolve(DICTIONARY_ROOT, dict.chunk_dir, 'manifest.json')
    const manifest = await readJsonFile(manifestPath)
    const entries = []

    for (const info of Object.values(manifest?.chunks || {})) {
      if (!info?.file) continue
      const chunk = await readDictionaryEntriesFile(resolve(DICTIONARY_ROOT, dict.chunk_dir, info.file))
      entries.push(...chunk)
    }

    return entries
  }

  return []
}

const buildBrowseDatasetFromJson = async () => {
  const dictionaries = await loadDictionaryIndex()
  const scopes = new Map()
  const dictionaryScopes = []
  const allHeadwordMap = new Map()
  const allJyutpingMap = new Map()

  for (const dict of dictionaries) {
    const entries = await getDictionaryEntries(dict)
    const headwordMap = new Map()
    const jyutpingMap = new Map()

    for (const entry of entries) {
      const canonical = getCanonicalHeadword(entry)
      const comparable = toComparableKey(canonical)
      if (!comparable) continue
      const primaryJyutping = getPrimaryJyutping(entry)

      if (!headwordMap.has(comparable)) {
        headwordMap.set(comparable, canonical)
      }

      if (primaryJyutping) {
        const existingJyutping = jyutpingMap.get(comparable)
        if (!existingJyutping || primaryJyutping.localeCompare(existingJyutping, 'en') < 0) {
          jyutpingMap.set(comparable, primaryJyutping)
        }
      }

      if (!allHeadwordMap.has(comparable)) {
        allHeadwordMap.set(comparable, canonical)
      }

      if (primaryJyutping) {
        const existingGlobalJyutping = allJyutpingMap.get(comparable)
        if (!existingGlobalJyutping || primaryJyutping.localeCompare(existingGlobalJyutping, 'en') < 0) {
          allJyutpingMap.set(comparable, primaryJyutping)
        }
      }
    }

    const scopeHeadwords = toScopeHeadwords(headwordMap, jyutpingMap)
    scopes.set(dict.id, scopeHeadwords)
    dictionaryScopes.push({
      id: dict.id,
      label: pickDictionaryLabel(dict),
      total: scopeHeadwords.byHeadword.length
    })
  }

  scopes.set('all', toScopeHeadwords(allHeadwordMap, allJyutpingMap))

  return {
    scopes,
    dictionaries: dictionaryScopes
  }
}

const writePageFiles = async (scopeId, sort, pageSize, headwords) => {
  const baseDir = join(BROWSE_INDEX_ROOT, scopeId, sort, `size-${pageSize}`)
  await mkdir(baseDir, { recursive: true })
  const totalPages = Math.max(1, Math.ceil(headwords.length / pageSize))

  for (let page = 1; page <= totalPages; page += 1) {
    const start = (page - 1) * pageSize
    const slice = headwords.slice(start, start + pageSize)
    const payload = JSON.stringify({ headwords: slice })
    await writeFile(join(baseDir, `page-${page}.json`), payload, 'utf8')
  }

  return totalPages
}

const main = async () => {
  const startTime = process.hrtime.bigint()
  console.log('Building browse index...')

  await rm(BROWSE_INDEX_ROOT, { recursive: true, force: true })
  await mkdir(BROWSE_INDEX_ROOT, { recursive: true })

  const dataset = await buildBrowseDatasetFromJson()
  const manifest = {
    schema_version: '1.0.0',
    generated_at: new Date().toISOString(),
    page_sizes: PAGE_SIZES,
    dictionaries: dataset.dictionaries,
    scopes: {}
  }

  let totalPageFiles = 0
  let totalScopeEntries = 0
  for (const [scopeId, scopeHeadwords] of dataset.scopes.entries()) {
    const scopeManifest = {
      total: scopeHeadwords.byHeadword.length,
      total_pages_by_size: {}
    }
    totalScopeEntries += scopeHeadwords.byHeadword.length

    for (const pageSize of PAGE_SIZES) {
      for (const sort of SORTS) {
        const headwords = sort === 'jyutping'
          ? scopeHeadwords.byJyutping
          : scopeHeadwords.byHeadword
        const totalPages = await writePageFiles(scopeId, sort, pageSize, headwords)
        totalPageFiles += totalPages
        scopeManifest.total_pages_by_size[String(pageSize)] = totalPages
      }
    }

    manifest.scopes[scopeId] = scopeManifest
  }

  await writeFile(join(BROWSE_INDEX_ROOT, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8')
  const elapsedMs = Number(process.hrtime.bigint() - startTime) / 1_000_000
  const totalScopes = Object.keys(manifest.scopes).length
  const totalDictionaries = Array.isArray(manifest.dictionaries) ? manifest.dictionaries.length : 0
  const allTotal = manifest.scopes?.all?.total ?? 0

  console.log('Browse index built in public/browse-index')
  console.log(
    [
      `Summary:`,
      `dictionaries=${totalDictionaries}`,
      `scopes=${totalScopes}`,
      `all_headwords=${allTotal}`,
      `page_files=${totalPageFiles}`,
      `elapsed_ms=${Math.round(elapsedMs)}`
    ].join(' ')
  )
}

main().catch((error) => {
  console.error('Failed to build browse index:', error)
  process.exitCode = 1
})
