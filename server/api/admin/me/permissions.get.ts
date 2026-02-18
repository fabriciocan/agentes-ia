import { getUserPermissions } from '../../../utils/authorization'

/**
 * GET /api/admin/me/permissions
 *
 * Returns the current authenticated user's permission slugs.
 * Used by the frontend to conditionally show/hide UI elements.
 */
export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const permissions = await getUserPermissions(userId)

  return { permissions }
})
