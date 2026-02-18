import { listRoles } from '../../../services/role.service'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:roles:list')

/**
 * GET /api/admin/roles
 *
 * List all roles (system + custom for company)
 *
 * @returns {roles: RoleWithPermissions[]}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'roles.read')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    const roles = await listRoles(companyId)

    return {
      data: roles
    }
  } catch (error) {
    logger.error({ err: error, companyId }, 'Failed to list roles')
    throw createError({
      statusCode: 500,
      message: 'Failed to list roles'
    })
  }
})
