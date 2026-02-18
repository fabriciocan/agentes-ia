import { prisma } from '../lib/prisma'
import { closeRedis } from '../services/redis.service'
import { createLogger } from '../utils/logger'

const logger = createLogger('services-plugin')

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('close', async () => {
    logger.info('Shutting down services...')
    await Promise.all([
      prisma.$disconnect(),
      closeRedis(),
    ])
    logger.info('All services shut down')
  })
})
