/**
 * Composable that fetches and caches the current user's permissions.
 * Uses Nuxt's built-in cache so the request is only made once per session.
 */
export function usePermissions() {
  const { data } = useFetch('/api/admin/me/permissions', {
    key: 'user-permissions',
    default: () => ({ permissions: [] as string[] })
  })

  const permissions = computed(() => data.value?.permissions ?? [])

  function can(permission: string): boolean {
    if (permissions.value.includes('*')) return true
    if (permissions.value.includes(permission)) return true
    const [resource] = permission.split('.')
    return permissions.value.includes(`${resource}.*`)
  }

  return { permissions, can }
}
