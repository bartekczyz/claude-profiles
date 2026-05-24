import type { ReactNode } from 'react'

import { ArrowRight } from 'lucide-react'

import { Button, Dialog, Kbd } from '@/design'

type Props = {
  open: boolean
  onMigrate: () => void
  onCreate: () => void
  onClose: () => void
}

export function ChooseStartDialog({ open, onMigrate, onCreate, onClose }: Props) {
  return (
    <Dialog
      open={open}
      title="How do you want to start?"
      description="We detected an existing Claude install on this Mac (~/.claude). Pick how your first profile should relate to it."
      onClose={onClose}
      onSubmit={onCreate}
      className="w-[min(560px,calc(100%-64px))]"
      foot={
        <Button variant="ghost" size="sm" trailingKbd={<Kbd>⎋</Kbd>} onClick={onClose}>
          Cancel
        </Button>
      }
    >
      <div className="space-y-3">
        <OptionCard
          primary
          title="Just add a new profile, keep existing Claude as-is"
          body={
            <>
              Your existing <code className="font-mono text-mono text-ink">~/.claude</code> stays put.{' '}
              <code className="font-mono text-mono">claude</code> keeps working. The new profile gets its own{' '}
              <code className="font-mono text-mono text-ink">claude-{'{name}'}</code> command.
            </>
          }
          trailingKbd={<Kbd variant="onOrange">⏎</Kbd>}
          onSelect={onCreate}
        />
        <OptionCard
          title="Migrate existing Claude into a profile"
          body={
            <>
              Your existing <code className="font-mono text-mono">~/.claude</code> becomes the{' '}
              <code className="font-mono text-mono">claude-{'{name}'}</code> profile. Plain{' '}
              <code className="font-mono text-mono">claude</code> will start a fresh install dir afterwards.
            </>
          }
          onSelect={onMigrate}
        />
      </div>
    </Dialog>
  )
}

type OptionCardProps = {
  title: string
  body: ReactNode
  primary?: boolean
  trailingKbd?: ReactNode
  onSelect: () => void
}

function OptionCard({ title, body, primary, trailingKbd, onSelect }: OptionCardProps) {
  return (
    <button
      // biome-ignore lint/a11y/noAutofocus: focus inside a modal lands on the primary option by convention
      autoFocus={primary}
      type="button"
      onClick={onSelect}
      className={[
        'group flex w-full items-start gap-3 rounded-lg border px-4 py-3.5 text-left transition-[border-color,background-color,box-shadow] duration-(--duration-snap) ease-(--ease-natural) cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-orange/40 focus-visible:ring-offset-1 focus-visible:ring-offset-cream',
        primary
          ? 'border-orange/55 bg-orange/[0.06] hover:border-orange hover:bg-orange/[0.10] dark:bg-orange/[0.08]'
          : 'border-border bg-white hover:border-border-strong hover:bg-cream-2 dark:bg-cream-2 dark:hover:bg-cream-3',
      ].join(' ')}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="m-0 text-body font-semibold tracking-[-0.005em] text-ink">{title}</h3>
          {trailingKbd}
        </div>
        <p className="m-0 mt-1 text-meta text-ink-soft leading-[1.5]">{body}</p>
      </div>
      <ArrowRight
        aria-hidden
        className="mt-1 h-4 w-4 shrink-0 text-muted-strong transition-transform group-hover:translate-x-0.5"
        strokeWidth={1.85}
      />
    </button>
  )
}
