import { requirePermission } from '../../../../../utils/authorization'
import { kanbanColumnUpdateSchema } from '../../../../../utils/validation'
import { updateColumn } from '../../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.update')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  const columnId = getRouterParam(event, 'columnId')
  if (!boardId || !columnId) throw createError({ statusCode: 400, statusMessage: 'boardId e columnId obrigatórios' })

  const body = await readBody(event)
  const parsed = kanbanColumnUpdateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  const column = await updateColumn(boardId, columnId, user.company_id, parsed.data)
  return { data: column }
})
