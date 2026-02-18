export default defineNuxtRouteMiddleware(async (to, from) => {
  // Only run on client side and after auth is loaded
  if (import.meta.server) return

  // Skip if already on platform routes
  if (to.path.startsWith('/platform')) return

  // Skip if on login page
  if (to.path === '/login') return

  try {
    const { data: session } = await useFetch('/api/auth/session')

    if (session.value?.user) {
      const email = session.value.user.email || ''

      // Check if user is platform admin
      const isPlatformAdmin = email.includes('superadmin@platform.com') || email.includes('@platform.')

      // Redirect platform admin to platform dashboard if accessing /admin
      if (isPlatformAdmin && to.path === '/admin') {
        return navigateTo('/platform')
      }
    }
  } catch (error) {
    // Silently fail - user might not be authenticated
  }
})
