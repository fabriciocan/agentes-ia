import { createSharedComposable } from '@vueuse/core'

export const useDashboard = createSharedComposable(() => {
  const isNotificationsSlideoverOpen = ref(false)
  const isSidebarCollapsed = ref(false)

  const route = useRoute()
  watch(() => route.fullPath, () => {
    isNotificationsSlideoverOpen.value = false
  })

  return {
    isNotificationsSlideoverOpen,
    isSidebarCollapsed
  }
})
