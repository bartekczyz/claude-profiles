import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { CreateProfileModal } from './create-profile-modal'

function setup(overrides: Partial<Parameters<typeof CreateProfileModal>[0]> = {}) {
  const onClose = vi.fn()
  const onCreate = vi.fn().mockResolvedValue(undefined)
  render(<CreateProfileModal open onClose={onClose} onCreate={onCreate} {...overrides} />)
  return { onClose, onCreate, user: userEvent.setup() }
}

describe('CreateProfileModal', () => {
  it('disables Create when name is empty', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })

  it('disables Create when no surfaces are selected', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Name'), 'Personal')
    await user.click(screen.getByLabelText(/Desktop app/i))
    await user.click(screen.getByLabelText(/Claude Code CLI/i))
    expect(screen.getByRole('button', { name: 'Create' })).toBeDisabled()
  })

  it('enables Create with a valid name + at least one surface', async () => {
    const { user } = setup()
    await user.type(screen.getByLabelText('Name'), 'Personal')
    expect(screen.getByRole('button', { name: 'Create' })).toBeEnabled()
  })

  it('calls onCreate with trimmed name on submit', async () => {
    const { user, onCreate, onClose } = setup()
    await user.type(screen.getByLabelText('Name'), '  Personal  ')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Personal',
      color: '#7C3AED',
      surfaces: { gui: true, cli: true },
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('surfaces backend error in the dialog without closing', async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error('slug exists'))
    const onClose = vi.fn()
    render(<CreateProfileModal open onClose={onClose} onCreate={onCreate} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Name'), 'Personal')
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('slug exists')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
