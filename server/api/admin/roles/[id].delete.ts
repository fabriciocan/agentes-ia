import { deleteRole } from '../../../services/role.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:roles:delete')

/**
 * DELETE /api/admin/roles/:id
 *
 * Delete a custom role
 *
 * @returns {success: boolean}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'roles.delete')

  const roleId = getRouterParam(event, 'id')

  if (!roleId) {
    throw createError({
      statusCode: 400,
      message: 'Role ID is required'
    })
  }

  try {
    // Delete role
    await deleteRole(roleId)

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.ROLE_DELETED,
      'role',
      roleId
    )

    logger.info({ roleId }, 'Custom role deleted')

    return { success: true }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, roleId }, 'Failed to delete role')
    throw createError({
      statusCode: 500,
      message: 'Failed to delete role'
    })
  }
})
