import { prisma } from '../../lib/prisma'
import { updateLastLogin } from '../../services/user.service'
import { loginSchema } from '../../utils/validation'
import { verifyAppPassword } from '../../utils/password'
import { logAuditEvent, AuditActions } from '../../services/audit.service'
import { createLogger } from '../../utils/logger'
import type { AdminUser, TeamUser } from '../../types/database.types'

const logger = createLogger('auth:login')

/**
 * POST /api/auth/login
 *
 * Dual system login - supports both legacy admin_users and new users
 */
export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.flatten() })
  }

  const { email, password } = parsed.data

  // Try new users system first - find user by email with company and client relations
  const user = await prisma.users.findFirst({
    where: { email, deleted_at: null },
    include: {
      companies: {
        include: { clients: true }
      }
    }
  })

  if (user) {
    // Verify password
    const isPasswordValid = await verifyAppPassword(password, user.password_hash)
    if (!isPasswordValid) {
      logger.warn({ email }, 'Invalid password for user')
      throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
    }

    // Check if user is suspended
    if (user.status === 'suspended') {
      logger.warn({ email }, 'Suspended user attempted login')
      throw createError({ statusCode: 403, statusMessage: 'Account suspended' })
    }

    // Check if invitation is pending
    if (user.status === 'invited') {
      logger.warn({ email }, 'User has not accepted invitation')
      throw createError({
        statusCode: 403,
        statusMessage: 'Please accept your invitation first'
      })
    }

    // Update last login
    await updateLastLogin(user.id)

    // Log audit event
    await logAuditEvent({
      companyId: user.company_id,
      userId: user.id,
      action: AuditActions.USER_LOGIN,
      resourceType: 'user',
      resourceId: user.id,
      status: 'success'
    })

    // Set session
    await setUserSession(event, {
      user: {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        clientId: user.companies?.clients?.id || '',
        isLegacy: false
      }
    })

    logger.info({ userId: user.id, email: user.email }, 'User logged in (new system)')

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    }
  }

  // Fallback to legacy admin_users - find by email only
  const legacyUser = await prisma.admin_users.findFirst({
    where: { email },
    include: { clients: true }
  })

  if (!legacyUser) {
    logger.warn({ email }, 'Invalid login attempt')
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // Verify password for legacy user
  const isPasswordValid = await verifyAppPassword(password, legacyUser.password_hash)
  if (!isPasswordValid) {
    logger.warn({ email }, 'Invalid password for legacy user')
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' })
  }

  // Update last login
  await prisma.admin_users.update({
    where: { id: legacyUser.id },
    data: { last_login_at: new Date() }
  })

  // Set session with legacy flag
  await setUserSession(event, {
    user: {
      id: legacyUser.id,
      email: legacyUser.email,
      name: legacyUser.name,
      clientId: legacyUser.client_id,
      isLegacy: true
    }
  })

  logger.info({ userId: legacyUser.id, email: legacyUser.email }, 'User logged in (legacy system)')

  return {
    user: {
      id: legacyUser.id,
      email: legacyUser.email,
      name: legacyUser.name
    }
  }
})
