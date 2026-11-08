import React, { createContext, useContext, useEffect, useState } from 'react'

export type Theme = 'dark' | 'light' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  isDark: boolean
}

const initialState: ThemeProviderState = {
  theme: 'system',
  setTheme: () => null,
  toggleTheme: () => null,
  isDark: false,
}

const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'megacommerce-theme',
  ...props
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(storageKey) as Theme | null
    if (saved && ['dark', 'light', 'system'].includes(saved)) {
      return saved
    }

    // Check if inside Telegram WebApp with theme parameter
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.colorScheme) {
      return (window as any).Telegram.WebApp.colorScheme === 'dark' ? 'dark' : 'light'
    }

    return defaultTheme
  })

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    const root = window.document.documentElement
    return root.classList.contains('dark')
  })

  const applyTheme = (targetTheme: Theme) => {
    const root = window.document.documentElement
    root.classList.remove('light', 'dark')

    let effectiveIsDark = false

    if (targetTheme === 'system') {
      effectiveIsDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    } else {
      effectiveIsDark = targetTheme === 'dark'
    }

    root.classList.add(effectiveIsDark ? 'dark' : 'light')
    root.style.colorScheme = effectiveIsDark ? 'dark' : 'light'
    setIsDark(effectiveIsDark)
  }

  useEffect(() => {
    applyTheme(theme)

    // Listen to OS system color scheme changes when theme is 'system'
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleMediaChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }

    mediaQuery.addEventListener('change', handleMediaChange)

    // Listen to Telegram WebApp theme changes
    const tg = (window as any).Telegram?.WebApp
    const handleTgTheme = () => {
      if (tg?.colorScheme && !localStorage.getItem(storageKey)) {
        setThemeState(tg.colorScheme === 'dark' ? 'dark' : 'light')
      }
    }

    if (tg?.onEvent) {
      tg.onEvent('themeChanged', handleTgTheme)
    }

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange)
      if (tg?.offEvent) {
        tg.offEvent('themeChanged', handleTgTheme)
      }
    }
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch {}
    setThemeState(newTheme)
  }

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark')
  }

  const value: ThemeProviderState = {
    theme,
    setTheme,
    toggleTheme,
    isDark,
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
