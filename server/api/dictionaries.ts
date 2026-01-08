/**
 * 词典列表和统计 API
 * 
 * GET /api/dictionaries
 *   返回所有词典的元数据和统计信息
 */

import { getEntriesCollection } from '../utils/mongodb'

export default defineEventHandler(async () => {
  try {
    const collection = await getEntriesCollection()
    
    // 按词典分组统计
    const stats = await collection.aggregate([
      {
        $group: {
          _id: '$source_book',
          count: { $sum: 1 },
          dialect: { $first: '$dialect.name' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray()
    
    // 获取总数
    const totalCount = await collection.countDocuments()
    
    return {
      success: true,
      total_entries: totalCount,
      dictionaries: stats.map(s => ({
        name: s._id,
        entries_count: s.count,
        dialect: s.dialect
      }))
    }
    
  } catch (error: any) {
    console.error('获取词典列表失败:', error)
    
    return {
      success: false,
      error: error.message || '服务暂时不可用',
      dictionaries: []
    }
  }
})
