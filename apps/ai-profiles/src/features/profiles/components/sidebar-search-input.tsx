import type { Ref } from 'react'

import { Search } from 'lucide-react'

import { ariaKeyshortcutsFor, Kbd } from '@/design'

type Props = {
  value?: string
  placeholder?: string
  inputRef?: Ref<HTMLInputElement>
  onChange?: (next: string) => void
}

/**
 * Local filter input for the sidebar profile list. Wired in `sidebar.tsx`
 * to the visible-profiles array — purely a name filter. The global ⌘F
 * shortcut focuses this input (registered in `app.tsx`); the ref is
 * threaded down so the parent can imperatively focus on hotkey.
 */
export function SidebarSearchInput({ value = '', placeholder = 'Search profiles…', inputRef, onChange }: Props) {
  return (
    // Tightened for the 200px column: the field gives back the padding and
    // row height it can spare so the profile names keep theirs.
    <div className="relative mb-2.5 px-0.5">
      <Search
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-2.5 h-3 w-3 -translate-y-1/2 text-muted-strong"
        strokeWidth={2}
      />
      <input
        ref={inputRef}
        type="search"
        aria-label="Search profiles"
        aria-keyshortcuts={ariaKeyshortcutsFor('focus-search')}
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        className="w-full appearance-none rounded-md border border-border bg-white/55 py-[5px] pr-8 pl-6.5 text-[12px] text-ink placeholder:text-muted-strong outline-none transition-colors duration-(--duration-snap) ease-(--ease-natural) focus:border-orange/55 focus:bg-white focus:shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-orange)_12%,transparent)] dark:bg-white/4 dark:focus:bg-white/6"
      />
      {/* Positioned directly, with no wrapper span. A span around it forms an
          inline line box ~3px taller than the 18px chip, so centring the
          wrapper left the chip sitting ~1.25px low inside the field. The chip
          is its own box, so it centres exactly — same trick as the icon. */}
      <Kbd
        variant="subtle"
        shortcutId="focus-search"
        className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2"
      />
    </div>
  )
}
