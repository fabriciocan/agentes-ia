import { getRedis } from '../services/redis.service'

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/') || path.startsWith('/api/health') || path.startsWith('/api/_')) return

  const config = useRuntimeConfig()
  const maxRequests = Number(config.rateLimitMax) || 60
  const windowSeconds = Number(config.rateLimitWindowSeconds) || 60

  // Key by client if authenticated, otherwise by IP
  const client = event.context.client
  const keyId = client?.id || getRequestIP(event) || 'unknown'
  const key = `ai-agents:rate-limit:${keyId}`

  const redis = getRedis()

  // If Redis is unavailable, skip rate limiting gracefully
  if (!redis) return

  try {
    const current = await redis.incr(key)

    if (current === 1) {
      await redis.expire(key, windowSeconds)
    }

    const ttl = await redis.ttl(key)
    setResponseHeader(event, 'X-RateLimit-Limit', maxRequests)
    setResponseHeader(event, 'X-RateLimit-Remaining', Math.max(0, maxRequests - current))
    setResponseHeader(event, 'X-RateLimit-Reset', ttl)

    if (current > maxRequests) {
      setResponseHeader(event, 'Retry-After', ttl)
      throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
    }
  } catch (err: any) {
    // If it's a rate limit error, rethrow; otherwise skip silently
    if (err?.statusCode === 429) throw err
    // Redis unavailable — allow request through
  }
})
