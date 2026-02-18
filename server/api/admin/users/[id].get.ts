import { getUserById } from '../../../services/user.service'
import { getUserRoles } from '../../../services/user.service'
import { requirePermission, requireCompanyOwnership } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:users:get')

/**
 * GET /api/admin/users/:id
 *
 * Get user details
 *
 * @returns {user, roles}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users.read')

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
    const user = await getUserById(userId)

    if (!user) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    const roles = await getUserRoles(userId)

    return {
      user,
      roles
    }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, userId }, 'Failed to get user')
    throw createError({
      statusCode: 500,
      message: 'Failed to get user'
    })
  }
})
