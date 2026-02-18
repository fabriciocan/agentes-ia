import { inviteUser } from '../../../services/user.service'
import { getCompanyById } from '../../../services/company.service'
import { sendInvitationEmail } from '../../../services/email.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { userInviteSchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:users:invite')

/**
 * POST /api/admin/users/invite
 *
 * Invite a new user to the company
 *
 * @body {email, name?, role_ids}
 * @returns {user, invitationToken}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  await requirePermission(event, 'users.invite')

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
    const data = userInviteSchema.parse(body)

    // Invite user
    const result = await inviteUser(companyId, userId, {
      email: data.email,
      name: data.name,
      roleIds: data.role_ids
    })

    // Get company details for email
    const company = await getCompanyById(companyId)
    const inviterName = event.context.user?.name || event.context.user?.email || 'A team member'

    // Send invitation email
    try {
      if (company) {
        await sendInvitationEmail({
          to: data.email,
          recipientName: data.name,
          inviterName,
          companyName: company.name,
          invitationToken: result.invitationToken
        })
      }
    } catch (emailError) {
      // Log email error but don't fail the invitation
      logger.error({ err: emailError, email: data.email }, 'Failed to send invitation email')
      // Continue - invitation was created, just email failed
    }

    // Log audit event
    await logAuditFromEvent(
      event,
      AuditActions.USER_INVITED,
      'user',
      result.user.id,
      {
        new: {
          email: data.email,
          roles: data.role_ids
        }
      }
    )

    logger.info(
      {
        companyId,
        userId: result.user.id,
        email: data.email,
        invitedBy: userId
      },
      'User invited'
    )

    // Return success (invitation URL for development/testing)
    return {
      user: result.user,
      message: 'Invitation sent successfully',
      // Include URL in development for testing
      ...(process.env.NODE_ENV === 'development' && {
        invitation_url: `/auth/accept-invite?token=${result.invitationToken}`
      })
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

    logger.error({ err: error, companyId }, 'Failed to invite user')
    throw createError({
      statusCode: 500,
      message: 'Failed to invite user'
    })
  }
})
