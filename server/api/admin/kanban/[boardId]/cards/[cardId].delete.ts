import { requirePermission } from '../../../../../utils/authorization'
import { deleteCard } from '../../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.delete')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  const cardId = getRouterParam(event, 'cardId')
  if (!boardId || !cardId) throw createError({ statusCode: 400, statusMessage: 'boardId e cardId obrigatórios' })

  await deleteCard(boardId, cardId, user.company_id)
  return { ok: true }
})
