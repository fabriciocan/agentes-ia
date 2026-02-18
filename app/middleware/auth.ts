export default defineNuxtRouteMiddleware(async () => {
  const requestFetch = useRequestFetch()
  const session = await requestFetch('/api/auth/session')

  if (!session?.authenticated) {
    return navigateTo('/login')
  }
})
