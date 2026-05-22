import type { Profile } from '@/lib/types'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { ProfileDetailHeader } from './profile-detail-header'

function fixture(overrides: Partial<Profile> = {}): Profile {
  return {
    id: '1',
    name: 'Acme Work',
    slug: 'acme-work',
    color: '#d97757',
    createdAt: '2026-05-20T12:00:00Z',
    surfaces: { gui: true, cli: true },
    ...overrides,
  }
}

describe('ProfileDetailHeader', () => {
  it('renders the profile name and slug', () => {
    render(<ProfileDetailHeader profile={fixture()} onEdit={vi.fn()} />)
    expect(screen.getByRole('heading', { name: 'Acme Work' })).toBeInTheDocument()
    expect(screen.getByText('acme-work')).toBeInTheDocument()
  })

  it('shows a placeholder for last-used until the activity log lands', () => {
    render(<ProfileDetailHeader profile={fixture()} onEdit={vi.fn()} />)
    expect(screen.getByText('Last used —')).toBeInTheDocument()
  })

  it('Edit button wears the ⌘E chip and fires onEdit', async () => {
    const onEdit = vi.fn()
    render(<ProfileDetailHeader profile={fixture()} onEdit={onEdit} />)
    const button = screen.getByRole('button', { name: /Edit/ })
    expect(button.textContent).toContain('⌘E')
    await userEvent.setup().click(button)
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  it('More button carries a ⌘M title and fires onMore', async () => {
    const onMore = vi.fn()
    render(<ProfileDetailHeader profile={fixture()} onEdit={vi.fn()} onMore={onMore} />)
    const more = screen.getByRole('button', { name: 'More actions' })
    expect(more.getAttribute('title')).toBe('More (⌘M)')
    await userEvent.setup().click(more)
    expect(onMore).toHaveBeenCalledTimes(1)
  })
})
