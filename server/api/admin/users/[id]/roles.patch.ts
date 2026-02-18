import { assignRolesToUser } from '../../../../services/user.service'
import { logAuditFromEvent, AuditActions } from '../../../../services/audit.service'
import { requirePermission, requireCompanyOwnership } from '../../../../utils/authorization'
import { userRolesUpdateSchema } from '../../../../utils/validation'
import { createLogger } from '../../../../utils/logger'

const logger = createLogger('api:admin:users:roles')

/**
 * PATCH /api/admin/users/:id/roles
 *
 * Update user role assignments
 *
 * @body {role_ids: string[]}
 * @returns {success: boolean}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users.update')

  const userId = getRouterParam(event, 'id')
  const currentUserId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  if (!currentUserId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  // Validate company ownership
  await requireCompanyOwnership(event, 'users', userId)

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const data = userRolesUpdateSchema.parse(body)

    // Assign roles
    await assignRolesToUser(userId, data.role_ids, currentUserId)

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.USER_ROLE_ASSIGNED,
      'user',
      userId,
      {
        new: { role_ids: data.role_ids }
      }
    )

    logger.info({ userId, roleIds: data.role_ids, assignedBy: currentUserId }, 'User roles updated')

    return { success: true }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // If it's a Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        message: 'Validation error',
        data: error
      })
    }

    logger.error({ err: error, userId }, 'Failed to update user roles')
    throw createError({
      statusCode: 500,
      message: 'Failed to update user roles'
    })
  }
})
