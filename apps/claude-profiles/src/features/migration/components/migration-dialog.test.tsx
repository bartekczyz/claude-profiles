import type { ExistingInstallInfo, Profile } from '@/lib/types'

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { MigrationDialog } from './migration-dialog'

const FAKE_PROFILE: Profile = {
  id: '1',
  name: 'Default',
  slug: 'default',
  color: '#d97757',
  createdAt: '2026-05-20T12:00:00Z',
  lastUsedAt: null,

  surfaces: { gui: true, cli: true },
}

function existing(overrides: Partial<ExistingInstallInfo> = {}): ExistingInstallInfo {
  return {
    claudeDesktopPath: '/Users/me/Library/Application Support/Claude',
    claudeCodePath: '/Users/me/.claude',
    claudeDesktopSizeBytes: 248 * 1024 * 1024,
    claudeCodeSizeBytes: 4 * 1024 * 1024,
    ...overrides,
  }
}

function setup(detected: ExistingInstallInfo, overrides: Partial<Parameters<typeof MigrationDialog>[0]> = {}) {
  const onClose = vi.fn()
  const onImport = vi.fn().mockResolvedValue(FAKE_PROFILE)
  render(<MigrationDialog open existing={detected} onClose={onClose} onImport={onImport} {...overrides} />)
  return { onClose, onImport, user: userEvent.setup() }
}

function renderMigrationDialog() {
  setup(existing())
}

describe('MigrationDialog', () => {
  it('renders only the surfaces that were detected', () => {
    setup(existing({ claudeCodePath: null, claudeCodeSizeBytes: null }))
    expect(screen.getByLabelText(/Desktop app data/i)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Claude Code CLI config/i)).not.toBeInTheDocument()
  })

  it('defaults the name to Default', () => {
    setup(existing())
    expect(screen.getByLabelText(/Profile name/i)).toHaveValue('Default')
  })

  it('disables iOS-style autocomplete on the profile name input', () => {
    setup(existing())
    const input = screen.getByLabelText(/Profile name/i)
    expect(input).toHaveAttribute('autoComplete', 'off')
    expect(input).toHaveAttribute('autoCorrect', 'off')
    expect(input).toHaveAttribute('autoCapitalize', 'off')
    expect(input).toHaveAttribute('spellCheck', 'false')
  })

  it('pre-checks every detected surface', () => {
    setup(existing())
    expect(screen.getByLabelText(/Desktop app data/i)).toBeChecked()
    expect(screen.getByLabelText(/Claude Code CLI config/i)).toBeChecked()
  })

  it('shows formatted sizes alongside each detected path', () => {
    setup(existing())
    expect(screen.getByText(/248 MB/)).toBeInTheDocument()
    expect(screen.getByText(/4\.0 MB/)).toBeInTheDocument()
  })

  it('omits the size span when size is missing', () => {
    setup(existing({ claudeDesktopSizeBytes: null, claudeCodeSizeBytes: null }))
    expect(screen.queryByText(/MB/)).not.toBeInTheDocument()
  })

  it('disables Import when both surfaces are unchecked', async () => {
    const { user } = setup(existing())
    await user.click(screen.getByLabelText(/Desktop app data/i))
    await user.click(screen.getByLabelText(/Claude Code CLI config/i))
    expect(screen.getByRole('button', { name: /^Import/ })).toBeDisabled()
  })

  it('renders the "What will happen" explainer card', () => {
    renderMigrationDialog()
    expect(screen.getByRole('heading', { name: /What will happen/i })).toBeInTheDocument()

    expect(
      screen.getByText(
        (_, node) => node?.tagName === 'LI' && /copied into the new profile dir/i.test(node?.textContent ?? ''),
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/moved to a 7-day backup/i)).toBeInTheDocument()
    expect(screen.getAllByText(/claude-/).length).toBeGreaterThan(0)
    expect(screen.getByText(/log in once/i)).toBeInTheDocument()
  })

  it('shows the resulting CLI command under the name input', () => {
    renderMigrationDialog()
    // The dialog mounts with `Default` as the initial name.
    expect(screen.getByText((_, node) => node?.textContent === 'claude-default')).toBeInTheDocument()
  })

  it('renames the cancel/skip footer button to "Cancel"', () => {
    renderMigrationDialog()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Skip for now' })).not.toBeInTheDocument()
  })

  it('calls onImport with the trimmed name and selected surfaces', async () => {
    const { user, onImport, onClose } = setup(existing())
    const nameField = screen.getByLabelText(/Profile name/i)
    await user.clear(nameField)
    await user.type(nameField, '  Personal  ')
    await user.click(screen.getByRole('button', { name: /^Import/ }))

    expect(onImport).toHaveBeenCalledWith({
      name: 'Personal',
      color: '#d97757',
      includeGui: true,
      includeCli: true,
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('surfaces backend errors without closing', async () => {
    const onImport = vi.fn().mockRejectedValue(new Error('disk full'))
    const onClose = vi.fn()
    render(
      <MigrationDialog
        open
        existing={existing({ claudeCodePath: null, claudeCodeSizeBytes: null })}
        onClose={onClose}
        onImport={onImport}
      />,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: /^Import/ }))
    expect(await screen.findByText('disk full')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
