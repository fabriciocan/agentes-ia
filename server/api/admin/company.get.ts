import { getCompanyById, getCompanyStats } from '../../services/company.service'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:admin:company:get')

/**
 * GET /api/admin/company
 *
 * Get current company details and stats
 *
 * @returns {Company & { stats: CompanyStats }}
 */
export default defineEventHandler(async (event) => {
  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    // Get company details
    const company = await getCompanyById(companyId)

    if (!company) {
      throw createError({
        statusCode: 404,
        message: 'Company not found'
      })
    }

    // Get company stats
    const stats = await getCompanyStats(companyId)

    return {
      ...company,
      stats
    }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.error({ err: error, companyId }, 'Failed to get company')
    throw createError({
      statusCode: 500,
      message: 'Failed to get company details'
    })
  }
})
