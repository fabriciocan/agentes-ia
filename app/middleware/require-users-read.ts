export default defineNuxtRouteMiddleware(async () => {
  try {
    const { permissions } = await $fetch<{ permissions: string[] }>('/api/admin/me/permissions')
    const hasAccess = permissions.includes('*') || permissions.includes('users.*') || permissions.includes('users.read')
    if (!hasAccess) return navigateTo('/admin')
  } catch {
    return navigateTo('/admin')
  }
})
