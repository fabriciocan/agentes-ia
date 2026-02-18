import { getAllPermissions } from '../../utils/authorization'
import { requirePermission } from '../../utils/authorization'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:admin:permissions:list')

/**
 * GET /api/admin/permissions
 *
 * List all available permissions in the system
 *
 * @returns {permissions: Permission[]}
 */
export default defineEventHandler(async (event) => {
  // Check permission (anyone who can read roles should be able to see permissions)
  await requirePermission(event, 'roles.read')

  try {
    const permissions = await getAllPermissions()

    // Group permissions by resource for easier UI display
    const groupedPermissions = permissions.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = []
      }
      acc[permission.resource]!.push(permission)
      return acc
    }, {} as Record<string, typeof permissions>)

    return {
      permissions,
      grouped: groupedPermissions
    }
  } catch (error) {
    logger.error({ err: error }, 'Failed to list permissions')
    throw createError({
      statusCode: 500,
      message: 'Failed to list permissions'
    })
  }
})
