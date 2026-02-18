import { acceptInvitation } from '../../services/user.service'
import { logAuditEvent, AuditActions } from '../../services/audit.service'
import { acceptInvitationSchema } from '../../utils/validation'
import { createLogger } from '../../utils/logger'

const logger = createLogger('api:auth:accept-invite')

/**
 * POST /api/auth/accept-invite
 *
 * Accept user invitation and set password (PUBLIC endpoint)
 *
 * @body {invitation_token, password, name?}
 * @returns {user, message}
 */
export default defineEventHandler(async (event) => {
  try {
    // Parse and validate request body
    const body = await readBody(event)
    const data = acceptInvitationSchema.parse(body)

    // Accept invitation
    const user = await acceptInvitation(
      data.invitation_token,
      data.password,
      data.name
    )

    // Log audit event
    await logAuditEvent({
      companyId: user.company_id,
      userId: user.id,
      action: AuditActions.USER_INVITATION_ACCEPTED,
      resourceType: 'user',
      resourceId: user.id,
      status: 'success'
    })

    logger.info({ userId: user.id, email: user.email }, 'User accepted invitation')

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      },
      message: 'Invitation accepted successfully. You can now log in.'
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

    logger.error({ err: error }, 'Failed to accept invitation')
    throw createError({
      statusCode: 500,
      message: 'Failed to accept invitation'
    })
  }
})
