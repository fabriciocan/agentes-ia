import { requirePermission } from '../../../../utils/authorization'
import { kanbanBoardCreateSchema } from '../../../../utils/validation'
import { createBoard } from '../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.create')

  const user = event.context.user
  if (!user?.company_id || !user?.client_id) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'agentId')
  if (!agentId) throw createError({ statusCode: 400, statusMessage: 'agentId obrigatório' })

  const body = await readBody(event)
  const parsed = kanbanBoardCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  const board = await createBoard({
    client_id: user.client_id,
    company_id: user.company_id,
    agent_config_id: agentId,
    name: parsed.data.name,
    description: parsed.data.description
  })

  return { data: board }
})
