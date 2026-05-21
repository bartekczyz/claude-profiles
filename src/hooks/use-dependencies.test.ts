import { invoke } from '@tauri-apps/api/core'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useDependencies } from './use-dependencies'

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }))

const mockInvoke = vi.mocked(invoke)

beforeEach(() => {
  mockInvoke.mockReset()
})

describe('useDependencies', () => {
  it('reports all-installed state on success', async () => {
    mockInvoke.mockResolvedValueOnce({
      claudeAppInstalled: true,
      claudeCliInstalled: true,
      localBinOnPath: true,
    })
    const { result } = renderHook(() => useDependencies())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.deps).toEqual({
      claudeAppInstalled: true,
      claudeCliInstalled: true,
      localBinOnPath: true,
    })
  })

  it('reports missing pieces', async () => {
    mockInvoke.mockResolvedValueOnce({
      claudeAppInstalled: false,
      claudeCliInstalled: false,
      localBinOnPath: false,
    })
    const { result } = renderHook(() => useDependencies())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.deps?.claudeAppInstalled).toBe(false)
  })

  it('surfaces errors', async () => {
    mockInvoke.mockRejectedValueOnce({ kind: 'Io', message: 'shell failed' })
    const { result } = renderHook(() => useDependencies())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe('shell failed')
  })
})
