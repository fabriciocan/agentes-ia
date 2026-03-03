import { requirePermission } from '../../../../utils/authorization'
import { kanbanCardCreateSchema } from '../../../../utils/validation'
import { createCard } from '../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.create')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  if (!boardId) throw createError({ statusCode: 400, statusMessage: 'boardId obrigatório' })

  const body = await readBody(event)
  const parsed = kanbanCardCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  const card = await createCard(boardId, user.company_id, parsed.data, user.id)
  return { data: card }
})
