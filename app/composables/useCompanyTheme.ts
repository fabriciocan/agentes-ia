export interface CompanyTheme {
  primaryColor?: string
  neutralColor?: string
  colorMode?: 'light' | 'dark'
}

// Hex values (shade 500) for each Tailwind color — needed because Tailwind v4
// does not generate dynamic class names like `bg-${color}-500` at runtime.
export const COLOR_HEX: Record<string, string> = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  lime: '#84cc16',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  sky: '#0ea5e9',
  blue: '#3b82f6',
  indigo: '#6366f1',
  violet: '#8b5cf6',
  purple: '#a855f7',
  fuchsia: '#d946ef',
  pink: '#ec4899',
  rose: '#f43f5e',
  slate: '#64748b',
  gray: '#6b7280',
  zinc: '#71717a',
  neutral: '#737373',
  stone: '#78716c'
}

const PRIMARY_COLORS = [
  'red', 'orange', 'amber', 'yellow', 'lime', 'green', 'emerald',
  'teal', 'cyan', 'sky', 'blue', 'indigo', 'violet', 'purple',
  'fuchsia', 'pink', 'rose'
]

const NEUTRAL_COLORS = ['slate', 'gray', 'zinc', 'neutral', 'stone']

export function useCompanyTheme() {
  const appConfig = useAppConfig()
  const colorMode = useColorMode()

  function applyTheme(theme: CompanyTheme) {
    if (theme.primaryColor && PRIMARY_COLORS.includes(theme.primaryColor)) {
      appConfig.ui.colors.primary = theme.primaryColor
    }
    if (theme.neutralColor && NEUTRAL_COLORS.includes(theme.neutralColor)) {
      appConfig.ui.colors.neutral = theme.neutralColor
    }
    if (theme.colorMode) {
      colorMode.preference = theme.colorMode
    }
  }

  async function saveTheme(theme: CompanyTheme, currentSettings: Record<string, unknown> = {}) {
    await $fetch('/api/admin/company/settings', {
      method: 'PATCH',
      body: {
        settings: {
          ...currentSettings,
          theme
        }
      }
    })
  }

  function getThemeFromCompany(company: Record<string, unknown> | null): CompanyTheme {
    if (!company) return {}
    const settings = company.settings as Record<string, unknown> | null
    return (settings?.theme as CompanyTheme) || {}
  }

  return {
    applyTheme,
    saveTheme,
    getThemeFromCompany,
    PRIMARY_COLORS,
    NEUTRAL_COLORS,
    COLOR_HEX
  }
}
