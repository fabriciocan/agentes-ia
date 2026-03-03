import { requirePermission } from '../../../../utils/authorization'
import { kanbanCardsFilterSchema } from '../../../../utils/validation'
import { getCards } from '../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.read')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  if (!boardId) throw createError({ statusCode: 400, statusMessage: 'boardId obrigatório' })

  const query = getQuery(event)
  const parsed = kanbanCardsFilterSchema.safeParse(query)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Filtros inválidos', data: parsed.error.flatten() })
  }

  return getCards(boardId, user.company_id, parsed.data)
})
