import { prisma } from '../lib/prisma'
import { redisHealthCheck } from '../services/redis.service'

export default defineEventHandler(async () => {
  let pgOk = false
  try {
    await prisma.$queryRaw`SELECT 1`
    pgOk = true
  } catch {
    pgOk = false
  }

  const redisOk = await redisHealthCheck()

  const status = pgOk && redisOk ? 'ok' : 'degraded'

  if (status === 'degraded') {
    setResponseStatus(useEvent(), 503)
  }

  return {
    status,
    services: {
      postgres: pgOk ? 'ok' : 'error',
      redis: redisOk ? 'ok' : 'error'
    },
    timestamp: new Date().toISOString()
  }
})
