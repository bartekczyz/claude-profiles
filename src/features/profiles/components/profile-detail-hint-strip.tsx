import { Kbd } from '@/design'

type Hint = {
  label: string
  keys: ReadonlyArray<string>
}

// TODO(phase-11): replace with `useShortcutHints()` reading from the registry,
// so renaming a binding in one place updates every chip across the UI.
const HINTS: ReadonlyArray<Hint> = [
  { label: 'navigate', keys: ['↑↓'] },
  { label: 'open', keys: ['⏎'] },
  { label: 'copy', keys: ['⌘C'] },
  { label: 'new', keys: ['⌘N'] },
  { label: 'commands', keys: ['⌘K'] },
  { label: 'help', keys: ['⌘?'] },
]

/**
 * Bottom hint strip — a thin cream-tinted bar reminding the user of the
 * global keyboard shortcuts. Sits below the detail content, above the
 * detail pane's bottom edge.
 */
export function ProfileDetailHintStrip() {
  return (
    <div className="-mx-10 mt-6 flex items-center justify-center gap-4 border-t border-border-soft bg-cream/55 px-6 py-3 text-[11.5px] text-muted-strong">
      {HINTS.map((hint, index) => (
        <span key={hint.label} className="inline-flex items-center gap-1.5">
          <span className="inline-flex items-center gap-0.5">
            {hint.keys.map((key) => (
              <Kbd key={key} variant="subtle">
                {key}
              </Kbd>
            ))}
          </span>
          <span>{hint.label}</span>
          {index < HINTS.length - 1 ? (
            <span aria-hidden className="ml-3 text-border">
              ·
            </span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
