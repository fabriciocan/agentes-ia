import Redis from 'ioredis'
import { createLogger } from '../utils/logger'

const logger = createLogger('redis')

let redis: Redis | null = null
let redisAvailable = false

export function getRedis(): Redis | null {
  if (!redis) {
    let redisUrl: string
    try {
      const config = useRuntimeConfig()
      redisUrl = config.redisUrl || process.env.NUXT_REDIS_URL || process.env.REDIS_URL || ''
    } catch {
      redisUrl = process.env.NUXT_REDIS_URL || process.env.REDIS_URL || ''
    }

    if (!redisUrl) {
      logger.warn('REDIS_URL not configured — caching disabled')
      return null
    }

    redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      lazyConnect: true,
      enableOfflineQueue: false,
      connectTimeout: 3000,
    })

    redis.on('error', (err) => {
      if (redisAvailable) {
        logger.warn({ err: err.message }, 'Redis connection lost — caching disabled')
      }
      redisAvailable = false
    })

    redis.on('connect', () => {
      redisAvailable = true
      logger.info('Redis connected')
    })

    redis.on('ready', () => {
      redisAvailable = true
    })

    redis.connect().catch((err) => {
      logger.warn({ err: err.message }, 'Redis unavailable — caching disabled')
      redisAvailable = false
    })
  }
  return redis
}

const NAMESPACE = 'ai-agents'

function namespacedKey(key: string): string {
  return `${NAMESPACE}:${key}`
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis()
  if (!client || !redisAvailable) return null
  try {
    const data = await client.get(namespacedKey(key))
    if (!data) return null
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  const client = getRedis()
  if (!client || !redisAvailable) return
  try {
    await client.set(namespacedKey(key), JSON.stringify(value), 'EX', ttlSeconds)
  } catch {
    // silently ignore
  }
}

export async function cacheDel(key: string): Promise<void> {
  const client = getRedis()
  if (!client || !redisAvailable) return
  try {
    await client.del(namespacedKey(key))
  } catch {
    // silently ignore
  }
}

export async function invalidatePattern(pattern: string): Promise<void> {
  const client = getRedis()
  if (!client || !redisAvailable) return
  try {
    const keys = await client.keys(namespacedKey(pattern))
    if (keys.length > 0) {
      await client.del(...keys)
      logger.debug({ pattern, count: keys.length }, 'Cache keys invalidated')
    }
  } catch {
    // silently ignore
  }
}

export async function redisHealthCheck(): Promise<boolean> {
  const client = getRedis()
  if (!client || !redisAvailable) return false
  try {
    const result = await client.ping()
    return result === 'PONG'
  } catch {
    return false
  }
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    try {
      await redis.quit()
    } catch {
      // ignore on shutdown
    }
    redis = null
    redisAvailable = false
    logger.info('Redis connection closed')
  }
}

