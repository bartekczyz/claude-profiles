import type { ReactNode } from 'react'
import type { ProfileUsage, UsageWindow } from '@/lib/types'

import { Component } from 'react'

import { RefreshCw } from 'lucide-react'

import { useProfileUsage } from '../api/use-profile-usage'

type Props = {
  profileId: string
  cliEnabled: boolean
}

export function ProfileDetailUsageCard({ profileId, cliEnabled }: Props) {
  if (!cliEnabled) {
    return null
  }
  return (
    <UsageCardErrorBoundary>
      <UsageCardInner profileId={profileId} />
    </UsageCardErrorBoundary>
  )
}

function UsageCardInner({ profileId }: { profileId: string }) {
  const { data, isLoading, isFetching, isError, refetch } = useProfileUsage(profileId)

  return (
    <section className="mb-6 rounded-md border border-border p-4">
      <header className="mb-3 flex items-center justify-between">
        <div className="font-mono text-eyebrow font-medium uppercase tracking-[0.1em] text-muted-strong">Usage</div>
        <button
          type="button"
          aria-label="Refresh usage"
          disabled={isFetching}
          onClick={() => refetch()}
          className="text-muted-strong hover:text-fg disabled:opacity-50"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : undefined} />
        </button>
      </header>

      {isLoading ? <MetersSkeleton /> : <Body usage={data ?? null} isError={isError} />}
    </section>
  )
}

function Body({ usage, isError }: { usage: ProfileUsage | null; isError: boolean }) {
  if (isError) {
    return <p className="font-mono text-mono text-muted-strong">Couldn't load usage stats.</p>
  }
  if (!usage) {
    return <MetersSkeleton />
  }
  if (usage.quotaError === 'no_credentials') {
    return (
      <p className="font-mono text-mono text-muted-strong">
        Sign in to Claude Code once with this profile to see usage.
      </p>
    )
  }
  if (usage.quotaError === 'unauthorized') {
    return (
      <p className="font-mono text-mono text-muted-strong">
        Session expired — sign in again with this profile to refresh usage.
      </p>
    )
  }
  return <Meters quota={usage.quota} />
}

function Meters({ quota }: { quota: ProfileUsage['quota'] }) {
  return (
    <div className="flex flex-col gap-2">
      <Meter label="5-hour window" meterWindow={quota?.fiveHour ?? null} />
      <Meter label="Weekly" meterWindow={quota?.sevenDay ?? null} />
      <Meter label="Weekly Sonnet" meterWindow={quota?.sevenDaySonnet ?? null} />
    </div>
  )
}

function Meter({ label, meterWindow }: { label: string; meterWindow: UsageWindow | null }) {
  const utilization = meterWindow?.utilization ?? null
  const percent = utilization === null ? null : Math.round(utilization * 100)
  const tone = percent === null ? 'muted' : percent < 50 ? 'ok' : percent < 80 ? 'warn' : 'crit'
  const barClass =
    tone === 'ok' ? 'bg-green' : tone === 'warn' ? 'bg-amber' : tone === 'crit' ? 'bg-red' : 'bg-muted-strong'
  const resetsLabel = formatReset(meterWindow?.resetsAt ?? null)

  return (
    <div className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
      <span className="font-mono text-mono text-muted-strong">{label}</span>
      <div
        role="progressbar"
        aria-valuenow={percent ?? undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-2 overflow-hidden rounded bg-cream-2"
      >
        <div className={`h-full ${barClass}`} style={{ width: percent === null ? 0 : `${percent}%` }} />
      </div>
      <span className="font-mono text-mono tabular-nums text-muted-strong">
        {percent === null ? '—' : `${percent}%`}
        {resetsLabel ? ` · ${resetsLabel}` : ''}
      </span>
    </div>
  )
}

function formatReset(resetsAt: string | null): string | null {
  if (!resetsAt) {
    return null
  }
  const date = new Date(resetsAt)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  const deltaMs = date.getTime() - Date.now()
  if (deltaMs <= 0) {
    return 'resets soon'
  }
  const hours = Math.floor(deltaMs / (60 * 60 * 1000))
  const minutes = Math.floor((deltaMs % (60 * 60 * 1000)) / (60 * 1000))
  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `resets in ${days}d`
  }
  if (hours >= 1) {
    return `resets in ${hours}h ${minutes}m`
  }
  return `resets in ${minutes}m`
}

function MetersSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <div key={row} className="grid grid-cols-[140px_1fr_auto] items-center gap-3">
          <span className="h-3 w-24 rounded bg-cream-2" />
          <span className="h-2 w-full rounded bg-cream-2" />
          <span className="h-3 w-10 rounded bg-cream-2" />
        </div>
      ))}
    </div>
  )
}

type BoundaryState = { hasError: boolean }

class UsageCardErrorBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { hasError: false }
  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }
  componentDidCatch(error: Error) {
    console.warn('Usage card render failed', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <section className="mb-6 rounded-md border border-border p-4">
          <p className="font-mono text-mono text-muted-strong">
            Couldn't display usage stats.{' '}
            <button type="button" className="underline" onClick={() => this.setState({ hasError: false })}>
              Retry
            </button>
          </p>
        </section>
      )
    }
    return this.props.children
  }
}
