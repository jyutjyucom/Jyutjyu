import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SOURCE_FILES = [
  { id: 'gz-colloquialisms', file: 'public/dictionaries/gz-colloquialisms.json' },
  { id: 'gz-practical-classified', file: 'public/dictionaries/gz-practical-classified.json' }
]

const OUTPUT_PATH = resolve(process.cwd(), 'public/recommendations.json')
const MAX_ENTRIES = 500
const SEED = 0x5f3759df

const start = Date.now()

const mulberry32 = (seed) => {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

const pickDisplay = (entry) => {
  const headword = entry?.headword || {}
  return headword.display || headword.search || headword.normalized || ''
}

const toMinimalEntry = (entry) => {
  const display = pickDisplay(entry)
  const normalized = entry?.headword?.normalized || display
  const jyutping = Array.isArray(entry?.phonetic?.jyutping) ? entry.phonetic.jyutping : []
  const definition = entry?.senses?.[0]?.definition || ''

  return {
    id: entry?.id || '',
    headword: {
      display,
      normalized
    },
    phonetic: {
      jyutping
    },
    senses: [
      {
        definition
      }
    ],
    source_book: entry?.source_book || ''
  }
}

const isValidEntry = (entry) => {
  const display = pickDisplay(entry)
  if (!display) return false

  const definition = entry?.senses?.[0]?.definition || ''
  if (!definition || definition.includes('NO DATA') || definition.length < 3) return false

  const jyutping = entry?.phonetic?.jyutping || []
  if (!Array.isArray(jyutping) || jyutping.length === 0) return false

  return true
}

const loadEntries = (filePath) => {
  const raw = readFileSync(resolve(process.cwd(), filePath), 'utf8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`Expected array in ${filePath}`)
  }
  return parsed
}

const allEntries = []
const sourceStats = []

for (const source of SOURCE_FILES) {
  const entries = loadEntries(source.file)
  const valid = entries.filter(isValidEntry)
  const minimal = valid.map(toMinimalEntry)
  allEntries.push(...minimal)
  sourceStats.push({
    id: source.id,
    total: entries.length,
    valid: minimal.length
  })
}

const rng = mulberry32(SEED)
const shuffled = allEntries
  .map((entry) => ({ entry, r: rng() }))
  .sort((a, b) => a.r - b.r)
  .map(({ entry }) => entry)

const selected = shuffled.slice(0, MAX_ENTRIES)

const payload = {
  generatedAt: new Date().toISOString(),
  sourceDictionaries: sourceStats,
  totalCandidates: allEntries.length,
  count: selected.length,
  entries: selected
}

writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf8')

const elapsed = Date.now() - start
console.log(`Recommendations generated: entries=${selected.length} total_candidates=${allEntries.length} elapsed_ms=${elapsed}`)
