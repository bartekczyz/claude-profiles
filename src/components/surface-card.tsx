import { Button } from '@/components/ui/button'

type Props = {
  title: string
  enabled: boolean
  description: string
  primaryAction?: { label: string; onClick: () => void }
  secondaryActions?: Array<{ label: string; onClick: () => void }>
  onToggle: (enabled: boolean) => void
}

export function SurfaceCard({ title, enabled, description, primaryAction, secondaryActions, onToggle }: Props) {
  return (
    <section className="rounded-[10px] border border-(--color-border) p-4">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="mt-1 text-xs text-(--color-muted)">{description}</p>
        </div>
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={enabled} onChange={(event) => onToggle(event.target.checked)} />
          {enabled ? 'Enabled' : 'Disabled'}
        </label>
      </header>
      {enabled ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {primaryAction ? (
            <Button size="sm" onClick={primaryAction.onClick}>
              {primaryAction.label}
            </Button>
          ) : null}
          {(secondaryActions ?? []).map((action) => (
            <Button key={action.label} size="sm" variant="ghost" onClick={action.onClick}>
              {action.label}
            </Button>
          ))}
        </div>
      ) : null}
    </section>
  )
}
