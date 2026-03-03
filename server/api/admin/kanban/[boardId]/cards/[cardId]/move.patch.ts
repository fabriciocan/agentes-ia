import { requirePermission } from '../../../../../../utils/authorization'
import { kanbanCardMoveSchema } from '../../../../../../utils/validation'
import { moveCard } from '../../../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.update')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  const cardId = getRouterParam(event, 'cardId')
  if (!boardId || !cardId) throw createError({ statusCode: 400, statusMessage: 'boardId e cardId obrigatórios' })

  const body = await readBody(event)
  const parsed = kanbanCardMoveSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  const card = await moveCard(boardId, cardId, user.company_id, parsed.data.column_id, user.id)
  return { data: card }
})
