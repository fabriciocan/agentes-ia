import { queryAuditLogs } from '../../services/audit.service'
import { requirePermission } from '../../utils/authorization'
import { auditLogsQuerySchema } from '../../utils/validation'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:admin:audit-logs')

/**
 * GET /api/admin/audit-logs
 *
 * Query audit logs
 *
 * @query {user_id?, action?, resource_type?, resource_id?, start_date?, end_date?, status?, page?, limit?}
 * @returns {logs: AuditLogWithUser[], total: number, page: number, limit: number}
 */
export default defineEventHandler(async (event) => {
  // Check permission (audit logs typically require admin)
  requirePermission(event, 'audit.read')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    // Parse and validate query parameters
    const query = getQuery(event)
    const params = auditLogsQuerySchema.parse(query)

    // Query audit logs
    const result = await queryAuditLogs({
      companyId,
      userId: params.user_id,
      action: params.action,
      resourceType: params.resource_type,
      resourceId: params.resource_id,
      startDate: params.start_date,
      endDate: params.end_date,
      status: params.status,
      limit: params.limit,
      offset: (params.page - 1) * params.limit
    })

    return {
      logs: result.logs,
      total: result.total,
      page: params.page,
      limit: params.limit,
      pages: Math.ceil(result.total / params.limit)
    }
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

    logger.error({ err: error, companyId }, 'Failed to query audit logs')
    throw createError({
      statusCode: 500,
      message: 'Failed to query audit logs'
    })
  }
})
