import { requirePermission } from '../../../../../utils/authorization'
import { deleteColumn } from '../../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.update')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  const columnId = getRouterParam(event, 'columnId')
  if (!boardId || !columnId) throw createError({ statusCode: 400, statusMessage: 'boardId e columnId obrigatórios' })

  await deleteColumn(boardId, columnId, user.company_id)
  return { ok: true }
})
