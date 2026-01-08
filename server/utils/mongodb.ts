/**
 * MongoDB 连接工具
 * 使用单例模式管理数据库连接
 */

import { MongoClient, Db } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

/**
 * 获取 MongoDB 数据库实例
 */
export async function getDatabase(): Promise<Db> {
  const config = useRuntimeConfig()
  
  if (!config.mongodbUri) {
    throw new Error('MONGODB_URI 未配置')
  }
  
  if (db) {
    return db
  }
  
  if (!client) {
    client = new MongoClient(config.mongodbUri)
    await client.connect()
  }
  
  db = client.db(config.mongodbDbName || 'jyutjyu')
  return db
}

/**
 * 获取词条集合
 */
export async function getEntriesCollection() {
  const database = await getDatabase()
  return database.collection('entries')
}

/**
 * 关闭数据库连接（用于测试或优雅关闭）
 */
export async function closeDatabase() {
  if (client) {
    await client.close()
    client = null
    db = null
  }
}
