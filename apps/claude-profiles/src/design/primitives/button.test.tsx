import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Button } from './button'
import { Kbd } from './kbd'

describe('Button', () => {
  it('defaults to secondary medium', () => {
    render(<Button>Continue</Button>)
    const button = screen.getByRole('button', { name: 'Continue' })
    expect(button).toHaveAttribute('data-variant', 'secondary')
    expect(button).toHaveAttribute('data-size', 'md')
    expect(button.getAttribute('type')).toBe('button')
  })

  it('renders all primary | secondary | ghost | danger variants', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger'] as const
    for (const variant of variants) {
      const { unmount } = render(<Button variant={variant}>{variant}</Button>)
      expect(screen.getByRole('button', { name: variant })).toHaveAttribute('data-variant', variant)
      unmount()
    }
  })

  it('applies dark-mode-aware hover background for secondary variant', () => {
    render(<Button variant="secondary">Re-import</Button>)
    const button = screen.getByRole('button', { name: 'Re-import' })
    expect(button.className).toContain('dark:hover:not-disabled:bg-cream-3')
  })

  it('applies dark-mode-aware hover background for danger variant', () => {
    render(<Button variant="danger">Delete</Button>)
    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button.className).toContain('dark:hover:not-disabled:bg-cream-3')
  })

  it('renders leading icon, trailing icon, and trailing kbd slots', () => {
    render(
      <Button
        leadingIcon={<span data-testid="lead">L</span>}
        trailingIcon={<span data-testid="trail">T</span>}
        trailingKbd={<Kbd>K</Kbd>}
      >
        Open
      </Button>,
    )
    expect(screen.getByTestId('lead')).toBeInTheDocument()
    expect(screen.getByTestId('trail')).toBeInTheDocument()
    expect(screen.getByText('K')).toBeInTheDocument()
  })
})
