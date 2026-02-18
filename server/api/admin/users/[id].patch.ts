import { updateUser } from '../../../services/user.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission, requireCompanyOwnership } from '../../../utils/authorization'
import { userUpdateSchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:users:update')

/**
 * PATCH /api/admin/users/:id
 *
 * Update user details
 *
 * @body {name?, email?, avatar_url?, status?, preferences?}
 * @returns {user}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users.update')

  const userId = getRouterParam(event, 'id')

  if (!userId) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    })
  }

  // Validate company ownership
  await requireCompanyOwnership(event, 'users', userId)

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const updates = userUpdateSchema.parse(body)

    // Update user
    const user = await updateUser(userId, updates)

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.USER_UPDATED,
      'user',
      userId,
      {
        new: updates
      }
    )

    logger.info({ userId, updates: Object.keys(updates) }, 'User updated')

    return { user }
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

    logger.error({ err: error, userId }, 'Failed to update user')
    throw createError({
      statusCode: 500,
      message: 'Failed to update user'
    })
  }
})
