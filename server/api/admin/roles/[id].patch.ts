import { updateRole } from '../../../services/role.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { roleUpdateSchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:roles:update')

/**
 * PATCH /api/admin/roles/:id
 *
 * Update a custom role
 *
 * @body {name?, description?, permission_ids?}
 * @returns {role: RoleWithPermissions}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'roles.update')

  const roleId = getRouterParam(event, 'id')
  const userId = event.context.user?.id

  if (!roleId) {
    throw createError({
      statusCode: 400,
      message: 'Role ID is required'
    })
  }

  if (!userId) {
    throw createError({
      statusCode: 401,
      message: 'Unauthorized'
    })
  }

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const updates = roleUpdateSchema.parse(body)

    // Update role
    const role = await updateRole(roleId, userId, {
      name: updates.name,
      description: updates.description,
      permissionIds: updates.permission_ids
    })

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.ROLE_UPDATED,
      'role',
      roleId,
      {
        new: updates
      }
    )

    logger.info({ roleId, updates: Object.keys(updates) }, 'Custom role updated')

    return { role }
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

    logger.error({ err: error, roleId }, 'Failed to update role')
    throw createError({
      statusCode: 500,
      message: 'Failed to update role'
    })
  }
})
