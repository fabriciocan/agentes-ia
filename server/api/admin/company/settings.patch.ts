import { updateCompanySettings } from '../../../services/company.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { companyUpdateSchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:company:settings')

/**
 * PATCH /api/admin/company/settings
 *
 * Update company settings
 *
 * @body {name?, slug?, logo_url?, settings?}
 * @returns {Company}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  requirePermission(event, 'company.update')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const updates = companyUpdateSchema.parse(body)

    // Update company settings
    const company = await updateCompanySettings(companyId, updates)

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.COMPANY_SETTINGS_CHANGED,
      'company',
      companyId,
      {
        new: updates
      }
    )

    logger.info({ companyId, updates: Object.keys(updates) }, 'Company settings updated')

    return company
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

    logger.error({ err: error, companyId }, 'Failed to update company settings')
    throw createError({
      statusCode: 500,
      message: 'Failed to update company settings'
    })
  }
})
