export interface DashboardStat {
  title: string
  icon: string
  value: number | string
  variation?: number
  formatter?: (value: number) => string
}

export interface NavigationItem {
  label: string
  icon: string
  to: string
  badge?: string | number
  children?: NavigationItem[]
}

export interface UserMenuOption {
  label: string
  icon?: string
  to?: string
  click?: () => void
  separator?: boolean
}
