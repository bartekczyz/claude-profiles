import type { AppError, AppState, AppStatePatch } from '@/lib/types'

import { useEffect, useState } from 'react'

import { loadAppState, updateAppState } from '@/lib/commands'

type UseAppStateResult = {
  state: AppState | null
  loading: boolean
  error: string | null
  update: (patch: AppStatePatch) => Promise<AppState>
  refresh: () => Promise<void>
}

export function useAppState(): UseAppStateResult {
  const [state, setState] = useState<AppState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    try {
      setState(await loadAppState())
    } catch (caught) {
      setError((caught as AppError).message ?? String(caught))
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh is intentionally only called on mount
  useEffect(() => {
    void refresh().finally(() => {
      setLoading(false)
    })
  }, [])

  async function update(patch: AppStatePatch) {
    const next = await updateAppState(patch)
    setState(next)
    return next
  }

  return { state, loading, error, update, refresh }
}
