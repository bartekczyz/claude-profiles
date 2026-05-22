import type { Dependencies, Shell } from '@/lib/types'

import { useEffect, useState } from 'react'

import { ChevronRight, RotateCw } from 'lucide-react'

import { Button, StatusDot } from '@/design'
import { detectShell, installPathHook } from '@/lib/commands'

const rcDisplay: Record<Shell, string> = {
  zsh: '~/.zshrc',
  bash: '~/.bashrc',
  fish: '~/.config/fish/config.fish',
}

type Props = {
  deps: Dependencies
  onRefresh: () => void | Promise<void>
}

type Row = {
  label: string
  tone: 'success' | 'warning'
  detail: string
}

// Version strings aren't surfaced from the Rust side yet (see 99-todo.md).
// Until then we render an em-dash next to each installed dependency — the
// status dot already conveys installed vs. not-detected.
const MISSING_DETAIL = '—'

function buildRows(deps: Dependencies, shell: Shell | null): Array<Row> {
  return [
    {
      label: 'Claude Desktop',
      tone: deps.claudeAppInstalled ? 'success' : 'warning',
      detail: MISSING_DETAIL,
    },
    {
      label: 'Claude Code CLI',
      tone: deps.claudeCliInstalled ? 'success' : 'warning',
      detail: MISSING_DETAIL,
    },
    {
      label: 'Shell PATH',
      tone: deps.localBinOnPath ? 'success' : 'warning',
      detail: shell ? rcDisplay[shell] : MISSING_DETAIL,
    },
  ]
}

/**
 * Consolidated System status card.
 *
 * Three rows (Desktop / CLI / Shell PATH) sit in one rounded card. Each row
 * shows a status dot (success/warning), a label, and a mono detail string —
 * version numbers if available (currently `—` everywhere, see follow-up in
 * 99-todo.md), or the resolved rc path for the PATH row. Beneath the card
 * a hookline lets the user re-install the shell hook in one click.
 */
export function SystemSection({ deps, onRefresh }: Props) {
  const [shell, setShell] = useState<Shell | null>(null)
  const [hookMessage, setHookMessage] = useState<string | null>(null)
  const [hookError, setHookError] = useState<string | null>(null)
  const [hookBusy, setHookBusy] = useState(false)

  useEffect(() => {
    void detectShell().then(setShell)
  }, [])

  async function handleReinstall() {
    if (!shell) {
      return
    }
    setHookBusy(true)
    setHookMessage(null)
    setHookError(null)
    try {
      const outcome = await installPathHook(shell)
      if (outcome.outcome === 'alreadyInstalled') {
        setHookMessage(`${rcDisplay[shell]} already has the hook.`)
      } else {
        setHookMessage(`Updated ${rcDisplay[shell]}. Open a new terminal to pick it up.`)
      }
      await onRefresh()
    } catch (caught) {
      setHookError(caught instanceof Error ? caught.message : String(caught))
    } finally {
      setHookBusy(false)
    }
  }

  const rows = buildRows(deps, shell)
  const hookInstalled = deps.localBinOnPath && shell !== null

  return (
    <section className="mb-8">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="font-mono text-[10px] font-medium uppercase tracking-[0.1em] text-muted-strong">System</span>
        <Button
          size="sm"
          variant="secondary"
          leadingIcon={<RotateCw className="h-3.5 w-3.5" strokeWidth={1.85} />}
          onClick={() => void onRefresh()}
        >
          Refresh
        </Button>
      </div>
      <div className="rounded-xl border border-border bg-white py-1 dark:bg-cream-2">
        {rows.map((row, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: rows are a fixed tuple of three deps with no insert/reorder semantics
            key={index}
            className="grid grid-cols-[7px_1fr_auto_12px] items-center gap-3 border-b border-border-soft px-4 py-3 text-[13px] tracking-[-0.003em] text-ink-soft last:border-b-0"
          >
            <StatusDot tone={row.tone} pulse />
            <span>{row.label}</span>
            <span className="font-mono text-[11.5px] text-muted">{row.detail}</span>
            <ChevronRight className="h-3 w-3 text-muted-strong" strokeWidth={1.85} />
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex items-center gap-2.5 font-mono text-[11px] text-muted-strong">
        <span>
          {shell
            ? hookInstalled
              ? `Detected ${shell} — hook installed in ${rcDisplay[shell]}.`
              : `Detected ${shell} — hook not yet installed in ${rcDisplay[shell]}.`
            : 'Detecting your shell…'}
        </span>
        <Button size="sm" variant="ghost" disabled={!shell || hookBusy} onClick={handleReinstall}>
          {hookInstalled ? 'Re-install hook' : 'Install hook'}
        </Button>
      </div>
      {hookMessage ? <p className="mt-1 text-[11.5px] text-muted-strong">{hookMessage}</p> : null}
      {hookError ? <p className="mt-1 text-[11.5px] text-red">{hookError}</p> : null}
    </section>
  )
}
