import { requirePermission } from '../../../../../utils/authorization'
import { kanbanColumnsReorderSchema } from '../../../../../utils/validation'
import { reorderColumns } from '../../../../../services/kanban.service'

export default defineEventHandler(async (event) => {
  requirePermission(event, 'kanban.update')

  const user = event.context.user
  if (!user?.company_id) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })

  const boardId = getRouterParam(event, 'boardId')
  if (!boardId) throw createError({ statusCode: 400, statusMessage: 'boardId obrigatório' })

  const body = await readBody(event)
  const parsed = kanbanColumnsReorderSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Dados inválidos', data: parsed.error.flatten() })
  }

  await reorderColumns(boardId, user.company_id, parsed.data.column_ids)
  return { ok: true }
})
