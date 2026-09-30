import { useCallback, useSyncExternalStore } from "react"

type Theme = "light" | "dark"

const STORAGE_KEY = "rag-console-theme"

function readStoredTheme(): Theme {
  // 浅色为主：只有用户手动切过深色才用深色，不跟随系统偏好
  return localStorage.getItem(STORAGE_KEY) === "dark" ? "dark" : "light"
}

function apply(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  document.documentElement.style.colorScheme = theme
}

let theme = readStoredTheme()
apply(theme)

const listeners = new Set<() => void>()

function setStoredTheme(next: Theme) {
  if (next === theme) return
  theme = next
  localStorage.setItem(STORAGE_KEY, theme)
  apply(theme)
  listeners.forEach((l) => l())
}

export function useTheme() {
  const value = useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => theme
  )
  const toggle = useCallback(() => {
    setStoredTheme(value === "dark" ? "light" : "dark")
  }, [value])

  return { theme: value, toggle }
}
