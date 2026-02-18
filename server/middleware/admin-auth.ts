import { prisma } from '../lib/prisma'
import { createLogger } from '../utils/logger'
import type { TeamUser, AdminUser } from '../types/database.types'

const logger = createLogger('admin-auth')

/**
 * Admin Authentication Middleware
 *
 * Supports dual system:
 * - Legacy: admin_users table (being deprecated)
 * - New: users table with RBAC
 *
 * Session structure determines which system to use:
 * - session.user.isLegacy = true -> Use admin_users
 * - session.user.isLegacy = false/undefined -> Use users table
 */
interface SessionUser {
  id: string
  email?: string
  name?: string
  clientId?: string
  isLegacy?: boolean
}

export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin/')) return

  const session = await getUserSession(event)
  const sessionUser = session?.user as SessionUser | undefined
  if (!sessionUser?.id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const userId = sessionUser.id
  const isLegacy = sessionUser.isLegacy === true

  try {
    if (isLegacy) {
      // Legacy system: Load from admin_users
      // Note: status column exists in DB but not in Prisma schema, use $queryRaw
      const rows = await prisma.$queryRaw<AdminUser[]>`
        SELECT id, email, name, client_id, created_at, updated_at
        FROM admin_users
        WHERE id = ${userId}::uuid AND status = 'active'
      `

      const adminUser = rows[0]
      if (!adminUser) {
        logger.warn({ userId, isLegacy }, 'Legacy admin user not found or inactive')
        throw createError({ statusCode: 401, statusMessage: 'User not found' })
      }

      // Set context for legacy user
      event.context.user = {
        id: adminUser.id,
        email: adminUser.email,
        name: adminUser.name,
        client_id: adminUser.client_id,
        company_id: null, // Legacy users don't have company_id
        isLegacy: true
      }

      // Legacy users get full permissions (wildcard)
      event.context.permissions = ['*']
      event.context.can = () => true

      logger.debug({ userId, email: adminUser.email }, 'Authenticated legacy admin user')
    } else {
      // New system: Load from users table with company join
      const user = await prisma.users.findFirst({
        where: {
          id: userId,
          deleted_at: null
        },
        include: {
          companies: {
            select: {
              client_id: true
            }
          }
        }
      })

      if (!user) {
        logger.warn({ userId, isLegacy }, 'User not found or deleted')
        throw createError({ statusCode: 401, statusMessage: 'User not found' })
      }

      // Check if user is suspended
      if (user.status === 'suspended') {
        logger.warn({ userId, email: user.email }, 'Suspended user attempted access')
        throw createError({ statusCode: 403, statusMessage: 'Account suspended' })
      }

      // Check if invitation is pending
      if (user.status === 'invited') {
        logger.warn({ userId, email: user.email }, 'User has not accepted invitation')
        throw createError({
          statusCode: 403,
          statusMessage: 'Please accept your invitation first'
        })
      }

      // Set context for new user
      event.context.user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        company_id: user.company_id,
        client_id: user.companies?.client_id || undefined,
        avatar_url: user.avatar_url || undefined,
        status: user.status || undefined,
        preferences: user.preferences as Record<string, unknown> | undefined,
        isLegacy: false
      }

      // Update last_active_at (don't await, fire and forget)
      prisma.users.update({
        where: { id: userId },
        data: { last_active_at: new Date() }
      }).catch((err) => {
        logger.error({ err, userId }, 'Failed to update last_active_at')
      })

      logger.debug({ userId, email: user.email, companyId: user.company_id }, 'Authenticated user')
    }

    // Set legacy adminUser for backward compatibility
    event.context.adminUser = sessionUser
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, userId, isLegacy }, 'Authentication error')
    throw createError({ statusCode: 500, statusMessage: 'Authentication failed' })
  }
})

// ============================================================================
// Type Extensions for Event Context
// ============================================================================

declare module 'h3' {
  interface H3EventContext {
    user?: {
      id: string
      email: string
      name?: string
      company_id: string | null
      client_id?: string
      avatar_url?: string
      status?: string
      preferences?: Record<string, unknown>
      isLegacy?: boolean
    }
    adminUser?: {
      id: string
      email?: string
      name?: string
      clientId?: string
      isLegacy?: boolean
    }
  }
}
