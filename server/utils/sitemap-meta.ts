import { readFile, stat } from 'node:fs/promises'
import { resolve } from 'node:path'

interface DictionaryIndexMeta {
  last_updated?: string
}

const INDEX_CANDIDATE_PATHS = [
  resolve(process.cwd(), 'content/dictionaries/index.json'),
  resolve(process.cwd(), 'public/dictionaries/index.json')
]

const BUILD_TIME_FALLBACK = (() => {
  const candidates = [
    process.env.BUILD_TIMESTAMP,
    process.env.VERCEL_GIT_COMMIT_DATE
  ]

  for (const value of candidates) {
    if (!value) continue
    const parsed = new Date(value)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }
  }

  return new Date().toISOString()
})()

let cachedLastmod: string | null = null
let pendingLastmod: Promise<string> | null = null

const toIsoOrNull = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim() === '') return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toISOString()
}

const readLastmodFromIndex = async (filePath: string): Promise<string | null> => {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as DictionaryIndexMeta
    const fromField = toIsoOrNull(parsed?.last_updated)
    if (fromField) return fromField
  } catch {
    // fallback to file metadata
  }

  try {
    const fileStat = await stat(filePath)
    return fileStat.mtime.toISOString()
  } catch {
    return null
  }
}

const resolveSitemapLastmod = async (): Promise<string> => {
  for (const filePath of INDEX_CANDIDATE_PATHS) {
    const lastmod = await readLastmodFromIndex(filePath)
    if (lastmod) return lastmod
  }

  return BUILD_TIME_FALLBACK
}

export const getSitemapLastmod = async (): Promise<string> => {
  if (cachedLastmod) return cachedLastmod
  if (pendingLastmod) return pendingLastmod

  pendingLastmod = resolveSitemapLastmod()
    .then((lastmod) => {
      cachedLastmod = lastmod
      return lastmod
    })
    .finally(() => {
      pendingLastmod = null
    })

  return pendingLastmod
}
