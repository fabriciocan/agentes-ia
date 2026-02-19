import { prisma } from '../../lib/prisma'
import { requirePermission } from '../../utils/authorization'
import { createLogger } from '../../utils/logger'

const logger = createLogger('platform:users')

/**
 * GET /api/platform/users
 *
 * Lists all users across all companies (platform admin only).
 * Supports optional filter by company_id.
 *
 * Query params:
 *   - company_id: filter by specific company
 *   - search: filter by name or email
 *
 * Requires: platform.view_all_users permission
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  event.context.user = session.user as typeof event.context.user

  await requirePermission(event, 'platform.view_all_users')

  const query = getQuery(event)
  const filterCompanyId = query.company_id as string | undefined
  const search = query.search as string | undefined

  try {
    const users = await prisma.users.findMany({
      where: {
        deleted_at: null,
        ...(filterCompanyId ? { company_id: filterCompanyId } : {}),
        ...(search ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } }
          ]
        } : {})
      },
      include: {
        companies: {
          select: { id: true, name: true, slug: true }
        },
        user_roles_user_roles_user_idTousers: {
          include: {
            roles: {
              select: { id: true, name: true, slug: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' }
    })

    const result = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      status: user.status,
      avatar_url: user.avatar_url,
      last_login_at: user.last_login_at,
      created_at: user.created_at,
      company: user.companies
        ? { id: user.companies.id, name: user.companies.name, slug: user.companies.slug }
        : null,
      roles: user.user_roles_user_roles_user_idTousers
        .filter(ur => ur.roles.deleted_at === null)
        .map(ur => ({ id: ur.roles.id, name: ur.roles.name, slug: ur.roles.slug }))
    }))

    logger.info(
      { userId: (session.user as { id?: string }).id, count: result.length, filterCompanyId },
      'Listed all platform users'
    )

    return { data: result }
  } catch (error) {
    logger.error({ error }, 'Failed to list platform users')
    throw createError({ statusCode: 500, statusMessage: 'Falha ao listar usuários' })
  }
})
