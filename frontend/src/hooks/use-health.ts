import { useSyncExternalStore } from "react"

import { getHealth } from "@/lib/api"

export interface HealthState {
  status: "loading" | "ok" | "down"
  chunks: number | null
  error: string | null
}

let state: HealthState = { status: "loading", chunks: null, error: null }
const listeners = new Set<() => void>()

function set(next: HealthState) {
  state = next
  listeners.forEach((l) => l())
}

export async function refreshHealth() {
  try {
    const health = await getHealth()
    set({ status: "ok", chunks: health.chunks, error: null })
  } catch (err) {
    set({ status: "down", chunks: null, error: (err as Error).message })
  }
}

export function useHealth() {
  useSyncExternalStore(
    (onChange) => {
      listeners.add(onChange)
      return () => listeners.delete(onChange)
    },
    () => state
  )
  return state
}
