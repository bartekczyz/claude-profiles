import type { ExistingInstallInfo } from '@/lib/types'

import { describe, expect, it } from 'vitest'

import { makeDefaultEntry } from './use-sidebar-entries'

function existing(overrides: Partial<ExistingInstallInfo> = {}): ExistingInstallInfo {
  return {
    claudeDesktopPath: null,
    claudeCodePath: null,
    claudeDesktopSizeBytes: null,
    claudeCodeSizeBytes: null,
    ...overrides,
  }
}

describe('makeDefaultEntry', () => {
  it('returns null when neither stock path is detected', () => {
    expect(makeDefaultEntry(existing())).toBeNull()
  })

  it('emits a default entry with cli-only surfaces when only ~/.claude exists', () => {
    const entry = makeDefaultEntry(existing({ claudeCodePath: '/Users/me/.claude' }))
    expect(entry).toEqual({
      id: 'default:claude',
      app: 'claude',
      name: 'Default',
      surfaces: { gui: false, cli: true },
    })
  })

  it('emits a default entry with gui-only surfaces when only Claude.app exists', () => {
    const entry = makeDefaultEntry(existing({ claudeDesktopPath: '/Applications/Claude.app' }))
    expect(entry?.surfaces).toEqual({ gui: true, cli: false })
  })

  it('emits both surfaces when both paths exist', () => {
    const entry = makeDefaultEntry(
      existing({ claudeDesktopPath: '/Applications/Claude.app', claudeCodePath: '/Users/me/.claude' }),
    )
    expect(entry?.surfaces).toEqual({ gui: true, cli: true })
  })
})
