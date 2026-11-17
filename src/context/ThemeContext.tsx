import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'kanto-theme'
const DARK_CLASS = 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function getStoredTheme(): Theme {
  if (typeof localStorage === 'undefined') return 'system'
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'light' || raw === 'dark' || raw === 'system') return raw
  } catch {
    // localStorage may be unavailable or blocked by the browser
  }
  return 'system'
}

function mediaList(): MediaQueryList | null {
  if (typeof window === 'undefined' || !window.matchMedia) return null
  return window.matchMedia('(prefers-color-scheme: dark)')
}

function computeResolved(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme
  const m = mediaList()
  return m ? m.matches ? 'dark' : 'light' : 'light'
}

function applyTheme(theme: Theme): 'light' | 'dark' {
  const resolved = computeResolved(theme)
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (resolved === 'dark') root.classList.add(DARK_CLASS)
    else root.classList.remove(DARK_CLASS)
    root.style.colorScheme = resolved
  }
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // localStorage may be unavailable or blocked by the browser
  }
  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme)
  const [resolved, setResolved] = useState<'light' | 'dark'>(() => computeResolved(getStoredTheme()))
  const media = useMemo(() => mediaList(), [])
  const resolvedRef = useRef(resolved)
  resolvedRef.current = resolved

  useLayoutEffect(() => {
    setResolved(applyTheme(theme))
  }, [theme])

  useEffect(() => {
    if (!media) return
    const onChange = () => {
      if (theme === 'system') setResolved(applyTheme(theme))
    }
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme, media])

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next)
    },
    [],
  )

  const toggleTheme = useCallback(() => {
    setThemeState(resolvedRef.current === 'dark' ? 'light' : 'dark')
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, resolvedTheme: resolved, setTheme, toggleTheme }),
    [theme, resolved, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
