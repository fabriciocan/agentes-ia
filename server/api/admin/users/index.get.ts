import { listUsers } from '../../../services/user.service'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:users:list')

/**
 * GET /api/admin/users
 *
 * List all users in the company
 *
 * @returns {users: UserWithRoles[]}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users.read')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    const users = await listUsers(companyId)

    return {
      data: users
    }
  } catch (error) {
    logger.error({ err: error, companyId }, 'Failed to list users')
    throw createError({
      statusCode: 500,
      message: 'Failed to list users'
    })
  }
})
