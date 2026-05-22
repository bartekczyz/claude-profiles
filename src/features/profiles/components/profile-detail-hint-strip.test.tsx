import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ProfileDetailHintStrip } from './profile-detail-hint-strip'

describe('ProfileDetailHintStrip', () => {
  it('renders each global shortcut hint', () => {
    render(<ProfileDetailHintStrip />)
    const labels = ['navigate', 'open', 'copy', 'new', 'commands', 'help']
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('renders the ⌘K kbd chip', () => {
    render(<ProfileDetailHintStrip />)
    expect(screen.getByText('⌘K')).toBeInTheDocument()
  })
})
