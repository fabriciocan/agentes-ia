import { prisma } from '../../../lib/prisma'
import { requirePermission } from '../../../utils/authorization'
import { createLogger } from '../../../utils/logger'
import { z } from 'zod'

const logger = createLogger('platform:users:update')

const updateSchema = z.object({
  status: z.enum(['active', 'invited', 'suspended', 'deleted']).optional(),
  name: z.string().min(1).max(255).optional(),
  avatar_url: z.string().url().nullable().optional()
})

/**
 * PATCH /api/platform/users/:id
 *
 * Updates a user from any company (platform admin only).
 * Supports status changes and basic profile updates.
 *
 * Requires: platform.view_all_users permission
 */
export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)
  event.context.user = session.user as typeof event.context.user

  await requirePermission(event, 'platform.view_all_users')

  const userId = getRouterParam(event, 'id')
  if (!userId) {
    throw createError({ statusCode: 400, statusMessage: 'ID do usuário é obrigatório' })
  }

  const body = await readBody(event)
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 422, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  const updates = parsed.data

  try {
    const existing = await prisma.users.findUnique({ where: { id: userId } })
    if (!existing || existing.deleted_at) {
      throw createError({ statusCode: 404, statusMessage: 'Usuário não encontrado' })
    }

    const updated = await prisma.users.update({
      where: { id: userId },
      data: {
        ...(updates.status !== undefined ? { status: updates.status } : {}),
        ...(updates.name !== undefined ? { name: updates.name } : {}),
        ...(updates.avatar_url !== undefined ? { avatar_url: updates.avatar_url } : {}),
        updated_at: new Date()
      },
      include: {
        companies: { select: { id: true, name: true, slug: true } }
      }
    })

    logger.info(
      { adminId: (session.user as { id?: string }).id, userId, updates },
      'Platform admin updated user'
    )

    return {
      user: {
        id: updated.id,
        email: updated.email,
        name: updated.name,
        status: updated.status,
        company: updated.companies
          ? { id: updated.companies.id, name: updated.companies.name, slug: updated.companies.slug }
          : null
      }
    }
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) throw error
    logger.error({ error, userId }, 'Failed to update user')
    throw createError({ statusCode: 500, statusMessage: 'Falha ao atualizar usuário' })
  }
})
