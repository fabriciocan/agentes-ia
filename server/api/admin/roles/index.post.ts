import { createRole } from '../../../services/role.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { roleCreateSchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:roles:create')

/**
 * POST /api/admin/roles
 *
 * Create a custom role
 *
 * @body {name, slug, description?, permission_ids}
 * @returns {role: RoleWithPermissions}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'roles.create')

  const companyId = event.context.user?.company_id
  const userId = event.context.user?.id

  if (!companyId || !userId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const data = roleCreateSchema.parse(body)

    // Create role
    const role = await createRole(companyId, userId, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      permissionIds: data.permission_ids
    })

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.ROLE_CREATED,
      'role',
      role.id,
      {
        new: {
          name: data.name,
          slug: data.slug,
          permissions: data.permission_ids
        }
      }
    )

    logger.info({ companyId, roleId: role.id, name: data.name }, 'Custom role created')

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

    logger.error({ err: error, companyId }, 'Failed to create role')
    throw createError({
      statusCode: 500,
      message: 'Failed to create role'
    })
  }
})
