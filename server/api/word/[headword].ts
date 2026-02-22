/**
 * 词头详情 API
 *
 * GET /api/word/:headword
 *   根据词头获取对应词条，并返回规范化后的 canonical 词头
 */

import { resolveWordEntries } from '../../utils/word-resolver'

export default defineEventHandler(async (event) => {
  const headwordParam = getRouterParam(event, 'headword')
  let headword = ''
  try {
    headword = decodeURIComponent(headwordParam || '').trim()
  } catch {
    headword = String(headwordParam || '').trim()
  }

  if (!headword) {
    setResponseStatus(event, 400)
    return {
      success: false,
      error: '请提供词头',
      canonical_headword: null,
      total: 0,
      entries: []
    }
  }

  try {
    const resolved = await resolveWordEntries(headword)

    if (!resolved || resolved.entries.length === 0) {
      setResponseStatus(event, 404)
      return {
        success: false,
        error: '词条不存在',
        canonical_headword: null,
        total: 0,
        entries: []
      }
    }

    return {
      success: true,
      canonical_headword: resolved.canonicalHeadword,
      total: resolved.entries.length,
      entries: resolved.entries
    }
  } catch (error: any) {
    console.error('获取词头详情失败:', error)
    setResponseStatus(event, 500)

    return {
      success: false,
      error: error?.message || '服务暂时不可用',
      canonical_headword: null,
      total: 0,
      entries: []
    }
  }
})
