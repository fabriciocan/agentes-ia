import { deleteUser } from '../../../services/user.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission, requireCompanyOwnership } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:users:delete')

/**
 * DELETE /api/admin/users/:id
 *
 * Delete (soft delete) a user
 *
 * @returns {success: boolean}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users.delete')

  const userId = getRouterParam(event, 'id')
  const currentUserId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  // Prevent self-deletion
  if (userId === currentUserId) {
    throw createError({
      statusCode: 400,
      message: 'You cannot delete your own account'
    })
  }

  // Validate company ownership
  await requireCompanyOwnership(event, 'users', userId)

  try {
    // Delete user
    await deleteUser(userId)

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.USER_DELETED,
      'user',
      userId
    )

    logger.info({ userId }, 'User deleted')

    return { success: true }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, userId }, 'Failed to delete user')
    throw createError({
      statusCode: 500,
      message: 'Failed to delete user'
    })
  }
})
