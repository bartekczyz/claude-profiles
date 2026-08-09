import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
}

/**
 * Outer chrome shared by every detail page variant: a non-scrolling <main>
 * wrapping one scrollable content column. Variants supply the section
 * content as children — the shell does not assume anything about what
 * they render.
 *
 * The bottom padding is deliberately smaller than the top: the last block a
 * variant renders carries its own 24px bottom margin, so 16px here lands the
 * same gutter as the 40px above.
 */
export function ProfileDetailShell({ children }: Props) {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-10 pt-10 pb-4">
        <div className="mx-auto w-full max-w-[640px]">{children}</div>
      </div>
    </main>
  )
}
