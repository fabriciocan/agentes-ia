import { requirePermission } from '../../../../utils/authorization'
import { kanbanBoardUpdateSchema } from '../../../../utils/validation'
import { getKanbanByAgent, updateBoard } from '../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.update')

  const user = event.context.user
  if (!user?.company_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'agentId')
  if (!agentId) throw createError({ statusCode: 400, statusMessage: 'agentId obrigatório' })

  const board = await getKanbanByAgent(agentId, user.company_id)
  if (!board) throw createError({ statusCode: 404, statusMessage: 'Board não encontrado' })

  const body = await readBody(event)
  const parsed = kanbanBoardUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  const updated = await updateBoard(board.id, user.company_id, parsed.data)
  return { data: updated }
})
