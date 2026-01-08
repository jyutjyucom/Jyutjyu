/**
 * 获取单个词条 API
 * 
 * GET /api/entry/:id
 *   返回指定 ID 的词条详情
 */

import { getEntriesCollection } from '../../utils/mongodb'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  
  if (!id) {
    return {
      success: false,
      error: '请提供词条 ID',
      entry: null
    }
  }
  
  try {
    const collection = await getEntriesCollection()
    
    const entry = await collection.findOne(
      { id },
      { projection: { _id: 0 } }
    )
    
    if (!entry) {
      return {
        success: false,
        error: '词条不存在',
        entry: null
      }
    }
    
    return {
      success: true,
      entry
    }
    
  } catch (error: any) {
    console.error('获取词条失败:', error)
    
    return {
      success: false,
      error: error.message || '服务暂时不可用',
      entry: null
    }
  }
})
