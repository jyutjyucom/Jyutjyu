export type Theme = 'light' | 'dark' | 'system'

const THEME_KEY = 'jyutjyu-theme'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'system')
  const isDark = useState<boolean>('isDark', () => false)

  // 检测系统偏好
  const getSystemPreference = (): boolean => {
    if (process.server) return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // 应用主题到 DOM
  const applyTheme = (isDarkMode: boolean) => {
    if (process.server) return
    
    isDark.value = isDarkMode
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    
    // 更新 meta theme-color
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute('content', isDarkMode ? '#0f172a' : '#ffffff')
    }
  }

  // 设置主题
  const setTheme = (newTheme: Theme) => {
    theme.value = newTheme
    
    if (process.client) {
      localStorage.setItem(THEME_KEY, newTheme)
      
      if (newTheme === 'system') {
        applyTheme(getSystemPreference())
      } else {
        applyTheme(newTheme === 'dark')
      }
    }
  }

  // 初始化主题
  const initTheme = () => {
    if (process.server) return
    
    // 读取保存的主题或默认使用 system
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    const initialTheme = savedTheme || 'system'
    
    theme.value = initialTheme
    
    if (initialTheme === 'system') {
      applyTheme(getSystemPreference())
    } else {
      applyTheme(initialTheme === 'dark')
    }
    
    // 监听系统主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (e) => {
      if (theme.value === 'system') {
        applyTheme(e.matches)
      }
    })
  }

  // 切换主题（light -> dark -> system -> light）
  const cycleTheme = () => {
    const cycle: Theme[] = ['light', 'dark', 'system']
    const currentIndex = cycle.indexOf(theme.value)
    const nextIndex = (currentIndex + 1) % cycle.length
    setTheme(cycle[nextIndex])
  }

  return {
    theme: readonly(theme),
    isDark: readonly(isDark),
    setTheme,
    initTheme,
    cycleTheme
  }
}
