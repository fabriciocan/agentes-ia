import { requirePermission } from '../../../../utils/authorization'
import { getKanbanByAgent, deleteBoard } from '../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.delete')

  const user = event.context.user
  if (!user?.company_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'agentId')
  if (!agentId) throw createError({ statusCode: 400, statusMessage: 'agentId obrigatório' })

  const board = await getKanbanByAgent(agentId, user.company_id)
  if (!board) throw createError({ statusCode: 404, statusMessage: 'Board não encontrado' })

  await deleteBoard(board.id, user.company_id)
  return { ok: true }
})
