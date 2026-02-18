import { prisma } from '../lib/prisma'
import { cacheGet, cacheSet } from '../services/redis.service'
import { createLogger } from '../utils/logger'
import type { Client } from '../types'

const logger = createLogger('auth-middleware')

const PUBLIC_PATHS = ['/api/health', '/api/webhooks/', '/api/auth/', '/api/_', '/api/widget/']

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname

  // Only protect /api/ routes
  if (!path.startsWith('/api/')) return
  // Skip public paths
  if (PUBLIC_PATHS.some(p => path.startsWith(p))) return
  // Skip admin routes (handled by admin-auth middleware)
  if (path.startsWith('/api/admin/')) return

  // Allow admin users authenticated via session to access API routes
  const session = await getUserSession(event).catch(() => null)
  if (session?.user) {
    // Admin is authenticated - load their client context
    const adminUser = session.user as { clientId?: string }
    if (adminUser.clientId) {
      const client = await prisma.clients.findFirst({
        where: { id: adminUser.clientId }
      }) as unknown as Client | null
      if (client) {
        event.context.client = client
        event.context.adminUser = session.user as { id: string; email?: string; name?: string; clientId?: string; isLegacy?: boolean }
        return
      }
    }
  }

  const apiKey = getHeader(event, 'x-api-key')
  if (!apiKey) {
    throw createError({ statusCode: 401, statusMessage: 'Missing API key' })
  }

  // Cache-through lookup
  const cacheKey = `client:apikey:${apiKey}`
  let client = await cacheGet<Client>(cacheKey)

  if (!client) {
    const result = await prisma.clients.findFirst({
      where: { api_key: apiKey }
    }) as unknown as Client | null

    if (!result) {
      logger.warn({ apiKey: apiKey.slice(0, 8) + '...' }, 'Invalid API key')
      throw createError({ statusCode: 401, statusMessage: 'Invalid API key' })
    }

    client = result
    await cacheSet(cacheKey, client, 300)
  }

  event.context.client = client
})
