import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ChooseStartDialog } from './choose-start-dialog'

describe('ChooseStartDialog', () => {
  function renderDialog(overrides: Partial<Parameters<typeof ChooseStartDialog>[0]> = {}) {
    const props = {
      open: true,
      onMigrate: vi.fn(),
      onCreate: vi.fn(),
      onClose: vi.fn(),
      ...overrides,
    }
    render(<ChooseStartDialog {...props} />)
    return props
  }

  it('renders both options and a cancel control', () => {
    renderDialog()
    expect(screen.getByRole('button', { name: /Migrate existing Claude into a profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Just add a new profile/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('routes the migrate option', async () => {
    const props = renderDialog()
    await userEvent.setup().click(screen.getByRole('button', { name: /Migrate existing Claude into a profile/i }))
    expect(props.onMigrate).toHaveBeenCalledOnce()
    expect(props.onCreate).not.toHaveBeenCalled()
  })

  it('routes the just-add-new option', async () => {
    const props = renderDialog()
    await userEvent.setup().click(screen.getByRole('button', { name: /Just add a new profile/i }))
    expect(props.onCreate).toHaveBeenCalledOnce()
    expect(props.onMigrate).not.toHaveBeenCalled()
  })

  it('submits via Enter → add new profile (primary action)', async () => {
    const props = renderDialog()
    await userEvent.setup().keyboard('{Enter}')
    expect(props.onCreate).toHaveBeenCalledOnce()
    expect(props.onMigrate).not.toHaveBeenCalled()
  })

  it('cancels via Cancel button', async () => {
    const props = renderDialog()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Cancel' }))
    expect(props.onClose).toHaveBeenCalledOnce()
  })

  it('explains what migrate does in the migrate-option body', () => {
    renderDialog()
    const matches = screen.getAllByText((_content, element) => {
      if (!element || element.tagName !== 'P') {
        return false
      }
      const text = element.textContent ?? ''
      return /existing ~\/\.claude becomes/i.test(text)
    })
    expect(matches.length).toBeGreaterThan(0)
  })
})
