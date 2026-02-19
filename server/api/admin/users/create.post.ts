import { createUserWithPassword } from '../../../services/user.service'
import { requirePermission } from '../../../utils/authorization'
import { userCreateSchema } from '../../../utils/validation'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:users:create')

/**
 * POST /api/admin/users/create
 *
 * Creates a new user directly with a provisional password (no email invite flow).
 * The provisional password is returned once and must be shared by the admin.
 *
 * Requires: users.invite permission
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'users.invite')

  const currentUser = event.context.user
  if (!currentUser?.company_id) {
    throw createError({ statusCode: 403, statusMessage: 'No company associated with user' })
  }

  const body = await readBody(event)
  const parsed = userCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Dados inválidos',
      data: parsed.error.flatten()
    })
  }

  const { email, name, role_ids } = parsed.data

  try {
    const { user, provisionalPassword } = await createUserWithPassword(
      currentUser.company_id,
      currentUser.id,
      { email, name, roleIds: role_ids }
    )

    await logAuditFromEvent(event, AuditActions.USER_INVITED, 'user', user.id, {
      email,
      name,
      method: 'provisional_password'
    })

    logger.info({ userId: user.id, email, companyId: currentUser.company_id }, 'User created with provisional password')

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        status: user.status
      },
      provisionalPassword,
      message: 'Usuário criado com sucesso. Senha provisória exibida apenas uma vez.'
    }
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    logger.error({ error, email, companyId: currentUser.company_id }, 'Failed to create user')
    throw createError({ statusCode: 500, statusMessage: 'Falha ao criar usuário' })
  }
})
