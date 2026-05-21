import type { AppError, Dependencies } from '@/lib/types'

import { useEffect, useState } from 'react'

import { checkDependencies } from '@/lib/commands'

type UseDependenciesResult = {
  deps: Dependencies | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useDependencies(): UseDependenciesResult {
  const [deps, setDeps] = useState<Dependencies | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    try {
      setDeps(await checkDependencies())
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

  return { deps, loading, error, refresh }
}
