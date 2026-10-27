import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
  // 'dark' | 'light' | 'system'
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('incident_loop_theme') || 'dark'
  })

  // 'dark' | 'light'
  const [resolvedTheme, setResolvedTheme] = useState(() => {
    const saved = localStorage.getItem('incident_loop_theme') || 'dark'
    if (saved === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return saved
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateResolved = () => {
      let active = theme
      if (theme === 'system') {
        active = mediaQuery.matches ? 'dark' : 'light'
      }
      setResolvedTheme(active)
      document.documentElement.setAttribute('data-theme', active)
      document.documentElement.style.colorScheme = active
    }

    updateResolved()

    const listener = () => {
      if (theme === 'system') {
        updateResolved()
      }
    }

    mediaQuery.addEventListener('change', listener)
    return () => mediaQuery.removeEventListener('change', listener)
  }, [theme])

  const setTheme = (newTheme) => {
    setThemeState(newTheme)
    localStorage.setItem('incident_loop_theme', newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
