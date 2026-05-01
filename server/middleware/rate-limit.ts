import { createError, getHeader, getRequestURL, setHeader } from 'h3'
import type { H3Event } from 'h3'

interface RateLimitPolicy {
  bucket: string
  limit: number
  windowMs: number
}

interface RateLimitWindow {
  count: number
  resetAt: number
}

const windows = new Map<string, RateLimitWindow>()
const maxWindowCount = 10000
const cleanupIntervalMs = 60000
let lastCleanupAt = 0

const policies = {
  feedback: { bucket: 'feedback', limit: 3, windowMs: 10 * 60 * 1000 },
  suggest: { bucket: 'suggest', limit: 240, windowMs: 60 * 1000 },
  resolve: { bucket: 'resolve', limit: 120, windowMs: 60 * 1000 },
  search: { bucket: 'search', limit: 60, windowMs: 60 * 1000 },
  word: { bucket: 'word', limit: 180, windowMs: 60 * 1000 },
  browse: { bucket: 'browse', limit: 120, windowMs: 60 * 1000 },
  random: { bucket: 'random', limit: 60, windowMs: 60 * 1000 },
} satisfies Record<string, RateLimitPolicy>

const defaultPolicy: RateLimitPolicy = {
  bucket: 'api-default',
  limit: 300,
  windowMs: 60 * 1000,
}

const cleanupWindows = (now: number) => {
  if (now - lastCleanupAt < cleanupIntervalMs && windows.size <= maxWindowCount) {
    return
  }

  lastCleanupAt = now

  for (const [key, window] of windows) {
    if (window.resetAt <= now) {
      windows.delete(key)
    }
  }
}

const pruneOverflowWindows = (protectedKey: string) => {
  if (windows.size <= maxWindowCount) return

  const removableWindows = Array.from(windows.entries())
    .filter(([key]) => key !== protectedKey)
    .sort(([, a], [, b]) => a.resetAt - b.resetAt)

  for (const [key] of removableWindows) {
    if (windows.size <= maxWindowCount) return
    windows.delete(key)
  }
}

const getClientIp = (event: H3Event): string => {
  const cloudflareIp = getHeader(event, 'cf-connecting-ip')?.trim()
  if (cloudflareIp) return cloudflareIp

  const forwardedFor = getHeader(event, 'x-forwarded-for')
    ?.split(',')[0]
    ?.trim()
  if (forwardedFor) return forwardedFor

  return event.node.req.socket?.remoteAddress || 'unknown'
}

const getPolicy = (pathname: string): RateLimitPolicy | null => {
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'
  if (!normalizedPathname.startsWith('/api/')) return null

  if (normalizedPathname === '/api/feedback.issue') return policies.feedback
  if (normalizedPathname === '/api/suggest') return policies.suggest
  if (normalizedPathname === '/api/search/resolve') return policies.resolve
  if (normalizedPathname === '/api/search') return policies.search
  if (normalizedPathname.startsWith('/api/word/')) return policies.word
  if (normalizedPathname === '/api/browse') return policies.browse
  if (normalizedPathname === '/api/random') return policies.random

  return defaultPolicy
}

export default defineEventHandler((event) => {
  const policy = getPolicy(getRequestURL(event).pathname)
  if (!policy) return

  const now = Date.now()
  cleanupWindows(now)

  const ip = getClientIp(event)
  const key = `${policy.bucket}:${ip}`
  const current = windows.get(key)
  const window = current && current.resetAt > now
    ? current
    : { count: 0, resetAt: now + policy.windowMs }

  window.count += 1
  windows.set(key, window)
  pruneOverflowWindows(key)

  const remaining = Math.max(policy.limit - window.count, 0)
  const resetSeconds = Math.ceil(window.resetAt / 1000)

  setHeader(event, 'X-RateLimit-Limit', String(policy.limit))
  setHeader(event, 'X-RateLimit-Remaining', String(remaining))
  setHeader(event, 'X-RateLimit-Reset', String(resetSeconds))

  if (window.count <= policy.limit) return

  const retryAfterSeconds = Math.max(Math.ceil((window.resetAt - now) / 1000), 1)

  setHeader(event, 'Retry-After', retryAfterSeconds)
  setHeader(event, 'cache-control', 'private, no-store')

  throw createError({
    statusCode: 429,
    statusMessage: 'Too Many Requests',
    message: 'Too many requests. Please try again later.',
  })
})
