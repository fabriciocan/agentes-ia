export default defineEventHandler(async (event) => {
  const session = await requireUserSession(event)

  return {
    user: session.user,
    permissions: event.context.permissions || [],
    permissionCount: (event.context.permissions || []).length
  }
})
