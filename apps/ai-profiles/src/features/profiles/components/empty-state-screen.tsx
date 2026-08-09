import type { Dependencies } from '@/lib/types'

import { useState } from 'react'

import { Plus, RotateCw } from 'lucide-react'

import { ariaKeyshortcutsFor, Button, Kbd } from '@/design'

type Props = {
  dependencies: Dependencies
  onCreate: () => void
  onRefresh: () => Promise<void> | void
}

/**
 * Full-window empty state — used when the user has no profiles yet.
 * Rendered without a sidebar so the screen owns the whole window.
 *
 * Two modes:
 * - Any supported surface detected → "Create your first profile" CTA.
 * - No Claude or ChatGPT/Codex surface detected → install hints + a
 *   "Check again" button, because the create dialog can't be submitted
 *   without at least one surface.
 */
export function EmptyStateScreen({ dependencies, onCreate, onRefresh }: Props) {
  const hasSupportedSurface = Object.values(dependencies.apps).some(
    ({ guiInstalled, cliInstalled }) => guiInstalled || cliInstalled,
  )

  if (!hasSupportedSurface) {
    return <AppsNotDetected onRefresh={onRefresh} />
  }

  return <NoProfilesYet onCreate={onCreate} />
}

function BrandMark() {
  return <img src="/icon.svg" alt="" aria-hidden className="mb-7 size-[72px]" />
}

type NoProfilesYetProps = {
  onCreate: () => void
}

function NoProfilesYet({ onCreate }: NoProfilesYetProps) {
  return (
    <main className="flex h-full min-h-[600px] flex-1 flex-col items-center justify-center px-10 py-16 text-center">
      <BrandMark />
      <div className="mb-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-strong">
        No profiles yet
      </div>
      <h1 className="m-0 mb-3 text-h1 font-bold tracking-[-0.028em] text-ink leading-[1.1]">
        Create your first profile.
      </h1>
      <p className="m-0 mb-5 max-w-[380px] text-[13.5px] leading-[1.55] tracking-[-0.003em] text-muted">
        Each profile is one isolated Claude or ChatGPT account, with its own Desktop launcher and CLI wrapper. Logins,
        history, and chats stay isolated.
      </p>
      <Button
        variant="primary"
        size="md"
        leadingIcon={<Plus className="h-3.5 w-3.5" strokeWidth={2.25} />}
        trailingKbd={<Kbd variant="onOrange" shortcutId="open-create-profile" />}
        aria-keyshortcuts={ariaKeyshortcutsFor('open-create-profile')}
        onClick={onCreate}
      >
        New profile
      </Button>
    </main>
  )
}

type AppsNotDetectedProps = {
  onRefresh: () => Promise<void> | void
}

function AppsNotDetected({ onRefresh }: AppsNotDetectedProps) {
  const [refreshing, setRefreshing] = useState(false)

  async function handleRefresh() {
    if (refreshing) {
      return
    }
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <main className="flex h-full min-h-[600px] flex-1 flex-col items-center justify-center px-10 py-16 text-center">
      <BrandMark />
      <div className="mb-2.5 font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-muted-strong">
        No supported app detected
      </div>
      <h1 className="m-0 mb-3 text-h1 font-bold tracking-[-0.028em] text-ink leading-[1.1]">
        Install an app to begin.
      </h1>
      <p className="m-0 mb-6 max-w-[420px] text-[13.5px] leading-[1.55] tracking-[-0.003em] text-muted">
        ai-profiles supports Claude Desktop, ChatGPT Desktop, Claude Code, and the Codex CLI.
      </p>
      <div className="mb-6 flex w-full max-w-[440px] flex-col gap-2.5 text-left">
        <div className="rounded-lg border border-border bg-white px-3.5 py-3 text-[12.5px] leading-[1.5] text-ink-soft dark:bg-cream-2">
          <div className="mb-0.5 font-medium text-ink">Desktop apps</div>
          <span className="text-muted">
            Download{' '}
            <a className="underline" href="https://claude.ai/download" target="_blank" rel="noreferrer">
              Claude
            </a>{' '}
            or{' '}
            <a className="underline" href="https://chatgpt.com/download/" target="_blank" rel="noreferrer">
              ChatGPT
            </a>
            .
          </span>
        </div>
        <div className="rounded-lg border border-border bg-white px-3.5 py-3 text-[12.5px] leading-[1.5] text-ink-soft dark:bg-cream-2">
          <div className="mb-0.5 font-medium text-ink">Command-line apps</div>
          <span className="text-muted">
            Install <code className="font-mono text-mono text-ink">@anthropic-ai/claude-code</code> or{' '}
            <code className="font-mono text-mono text-ink">@openai/codex</code> with npm.
          </span>
        </div>
      </div>
      <Button
        variant="primary"
        size="md"
        leadingIcon={<RotateCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2.25} />}
        disabled={refreshing}
        onClick={() => void handleRefresh()}
      >
        {refreshing ? 'Checking…' : 'Check again'}
      </Button>
    </main>
  )
}
