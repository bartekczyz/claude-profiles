import { invoke } from '@tauri-apps/api/core'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useAppState } from './use-app-state'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockInvoke = vi.mocked(invoke)

beforeEach(() => {
  mockInvoke.mockReset()
})

describe('useAppState', () => {
  it('loads state on mount', async () => {
    mockInvoke.mockResolvedValueOnce({
      welcomeShown: true,
      migrationDismissedAt: null,
      pathBannerDismissedAt: null,
    })

    const { result } = renderHook(() => useAppState())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.state?.welcomeShown).toBe(true)
  })

  it('update passes the patch through invoke and replaces state', async () => {
    mockInvoke.mockResolvedValueOnce({
      welcomeShown: false,
      migrationDismissedAt: null,
      pathBannerDismissedAt: null,
    })
    const { result } = renderHook(() => useAppState())
    await waitFor(() => expect(result.current.loading).toBe(false))

    mockInvoke.mockResolvedValueOnce({
      welcomeShown: true,
      migrationDismissedAt: null,
      pathBannerDismissedAt: null,
    })

    await act(async () => {
      await result.current.update({ welcomeShown: true })
    })

    expect(mockInvoke).toHaveBeenLastCalledWith('update_app_state', {
      patch: { welcomeShown: true },
    })
    expect(result.current.state?.welcomeShown).toBe(true)
  })

  it('captures load errors', async () => {
    mockInvoke.mockRejectedValueOnce({ kind: 'Io', message: 'oops' })
    const { result } = renderHook(() => useAppState())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('oops')
  })
})
