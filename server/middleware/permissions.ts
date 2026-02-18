import type { H3Event } from 'h3'
import { getUserPermissions, checkPermission } from '../utils/authorization'
import { createLogger } from '../utils/logger'

const logger = createLogger('permissions-middleware')

/**
 * Permissions Middleware
 *
 * Loads user permissions from cache/database and adds them to event context
 * Provides a helper function `can()` for permission checks
 *
 * Must run AFTER admin-auth middleware
 */
export default defineEventHandler(async (event: H3Event) => {
  // Only load permissions for authenticated users
  if (!event.context.user?.id) {
    return
  }

  const userId = event.context.user.id

  try {
    // Load user permissions (cached in Redis)
    const permissions = await getUserPermissions(userId)

    // Add permissions to context
    event.context.permissions = permissions

    // Add helper function to check permissions easily
    event.context.can = (permission: string): boolean => {
      return checkPermission(permissions, permission)
    }

    logger.debug(
      {
        userId,
        permissionsCount: permissions.length,
        path: event.path
      },
      'Loaded user permissions'
    )
  } catch (error) {
    logger.error(
      {
        err: error,
        userId,
        path: event.path
      },
      'Failed to load user permissions'
    )

    // Don't block request, but set empty permissions
    event.context.permissions = []
    event.context.can = () => false
  }
})

// ============================================================================
// Type Extensions for Event Context
// ============================================================================

declare module 'h3' {
  interface H3EventContext {
    permissions?: string[]
    can?: (permission: string) => boolean
  }
}
