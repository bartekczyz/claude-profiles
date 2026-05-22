import type { ReactNode } from 'react'

import { Monitor, Terminal } from 'lucide-react'

import { cn, Kbd, StatusPulse } from '@/design'

type SurfaceVariant = 'gui' | 'cli'

type SecondaryAction = {
  label: string
  kbd: string
  onClick: () => void
}

type Props = {
  variant: SurfaceVariant
  enabled: boolean
  primaryLabel: ReactNode
  primaryKbd: string
  statusDetail: string
  statusTone?: 'success' | 'warning'
  secondaries: ReadonlyArray<SecondaryAction>
  primarySuffix?: ReactNode
  onPrimary: () => void
}

const COPY: Record<SurfaceVariant, { title: string; description: string; icon: ReactNode }> = {
  gui: {
    title: 'Desktop App',
    description:
      'Launches Claude.app with an isolated user-data directory so logins, history, and chats stay separate.',
    icon: <Monitor className="h-3.5 w-3.5" strokeWidth={1.85} />,
  },
  cli: {
    title: 'Claude Code CLI',
    description: 'Wraps the claude binary with CLAUDE_CONFIG_DIR pointed at this profile, exposed as claude-{slug}.',
    icon: <Terminal className="h-3.5 w-3.5" strokeWidth={1.85} />,
  },
}

/**
 * Surface card variants share the same shape — icon row, description,
 * status pulse + detail, primary CTA, two secondary buttons — and differ
 * only in the icon, title, and copy carried by `COPY[variant]`. The
 * caller picks the primary CTA label/kbd and provides handlers.
 *
 * Disabled state is styled with reduced opacity and disabled action buttons.
 * Toggling enable/disable happens from the Edit modal (Phase 7); the card
 * is read-only for that decision.
 */
export function ProfileDetailSurfaceCard({
  variant,
  enabled,
  primaryLabel,
  primaryKbd,
  statusDetail,
  statusTone = 'success',
  secondaries,
  primarySuffix,
  onPrimary,
}: Props) {
  const meta = COPY[variant]
  return (
    <section
      data-enabled={enabled ? 'true' : 'false'}
      className="group/card rounded-xl border border-border bg-white p-5 transition-[border-color,box-shadow] duration-(--duration-snap) ease-(--ease-natural) hover:border-border-strong hover:shadow-card-hover data-[enabled=false]:opacity-60 dark:bg-cream-2"
    >
      <header className="mb-2 flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-[26px] w-[26px] place-items-center rounded-[7px] bg-cream-2 text-ink-soft dark:bg-cream-3"
        >
          {meta.icon}
        </span>
        <h3 className="text-h3 font-semibold text-ink tracking-[-0.012em]">{meta.title}</h3>
      </header>
      <p className="m-0 mb-3 text-body text-muted leading-[1.5]">{meta.description}</p>
      <div className="mb-4 inline-flex items-center gap-1.5 text-meta font-medium tracking-[-0.003em] text-muted">
        {enabled ? (
          <StatusPulse tone={statusTone} />
        ) : (
          <span aria-hidden className="inline-block h-1.5 w-1.5 rounded-full bg-muted-strong" />
        )}
        <span>{enabled ? statusDetail : 'Surface disabled — re-enable from Edit profile'}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={onPrimary}
          disabled={!enabled}
          className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border-0 bg-[linear-gradient(180deg,var(--color-orange),var(--color-orange-deep))] px-3 text-[12.5px] font-medium text-white shadow-[0_1px_2px_rgba(191,98,64,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] outline-none transition-[filter,transform] duration-(--duration-snap) ease-(--ease-natural) hover:not-disabled:brightness-[0.96] active:not-disabled:translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span>{primaryLabel}</span>
          <Kbd variant="onOrange">{primaryKbd}</Kbd>
        </button>
        {primarySuffix}
        {secondaries.map((action) => (
          <button
            key={action.label}
            type="button"
            onClick={action.onClick}
            disabled={!enabled}
            className={cn(
              'inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border bg-cream px-2.5 text-[12px] font-medium text-ink-soft shadow-[0_1px_0_rgba(40,30,20,0.03)] outline-none transition-colors duration-(--duration-snap) ease-(--ease-natural)',
              'hover:not-disabled:border-border-strong hover:not-disabled:bg-white hover:not-disabled:text-ink',
              'disabled:cursor-not-allowed disabled:opacity-60',
              'dark:bg-white/[0.04] dark:hover:not-disabled:bg-white/[0.07]',
            )}
          >
            <span>{action.label}</span>
            <Kbd variant="subtle">{action.kbd}</Kbd>
          </button>
        ))}
      </div>
    </section>
  )
}

export type { SecondaryAction, SurfaceVariant }
