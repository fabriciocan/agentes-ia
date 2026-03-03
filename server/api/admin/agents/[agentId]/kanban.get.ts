import { requirePermission } from '../../../../utils/authorization'
import { getKanbanByAgent } from '../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.read')

  const user = event.context.user
  if (!user?.company_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'agentId')
  if (!agentId) throw createError({ statusCode: 400, statusMessage: 'agentId obrigatório' })

  const board = await getKanbanByAgent(agentId, user.company_id)
  return { data: board }
})
