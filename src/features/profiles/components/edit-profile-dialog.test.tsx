import type { Dependencies, Profile } from '@/lib/types'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { EditProfileDialog } from './edit-profile-dialog'

function fixture(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '1',
    name: 'Personal',
    slug: 'personal',
    color: '#d97757',
    createdAt: '2026-05-20T12:00:00Z',
    surfaces: { gui: true, cli: true },
    ...overrides,
  }
}

const DEPS: Dependencies = {
  claudeAppInstalled: true,
  claudeCliInstalled: true,
  localBinOnPath: true,
}

describe('EditProfileDialog', () => {
  it('disables Save when nothing has changed', () => {
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<EditProfileDialog open profile={fixture()} dependencies={DEPS} onClose={vi.fn()} onSave={onSave} />)
    expect(screen.getByRole('button', { name: /^Save/ })).toBeDisabled()
  })

  it('enables Save when the name changes', async () => {
    const user = userEvent.setup()
    render(
      <EditProfileDialog
        open
        profile={fixture()}
        dependencies={DEPS}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    const input = screen.getByLabelText('Name') as HTMLInputElement
    await user.clear(input)
    await user.type(input, 'Renamed')
    expect(screen.getByRole('button', { name: /^Save/ })).toBeEnabled()
  })

  it('resets form state when a different profile is opened', () => {
    const { rerender } = render(
      <EditProfileDialog
        open
        profile={fixture({ id: '1', name: 'Personal' })}
        dependencies={DEPS}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    rerender(
      <EditProfileDialog
        open
        profile={fixture({ id: '2', name: 'Work' })}
        dependencies={DEPS}
        onClose={vi.fn()}
        onSave={vi.fn().mockResolvedValue(undefined)}
      />,
    )

    expect(screen.getByLabelText('Name')).toHaveValue('Work')
  })

  it('calls onSave with the trimmed name and current surfaces', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    const onClose = vi.fn()
    render(<EditProfileDialog open profile={fixture()} dependencies={DEPS} onClose={onClose} onSave={onSave} />)
    const input = screen.getByLabelText('Name') as HTMLInputElement
    await user.clear(input)
    await user.type(input, '  Renamed  ')
    await user.click(screen.getByRole('button', { name: /^Save/ }))
    expect(onSave).toHaveBeenCalledWith({ name: 'Renamed', color: '#d97757', surfaces: { gui: true, cli: true } })
  })

  it('enables Save when a surface is toggled off', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn().mockResolvedValue(undefined)
    render(<EditProfileDialog open profile={fixture()} dependencies={DEPS} onClose={vi.fn()} onSave={onSave} />)
    // Surface toggle buttons live in the ProfileFormFields surface list
    await user.click(screen.getByRole('checkbox', { name: /Desktop App launcher/ }))
    expect(screen.getByRole('button', { name: /^Save/ })).toBeEnabled()
    await user.click(screen.getByRole('button', { name: /^Save/ }))
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ surfaces: { gui: false, cli: true } }))
  })
})
