import type { Profile } from '@/lib/types'

import { Button } from '@/components/ui/button'

import { ProfileList } from './profile-list'

type Props = {
  profiles: Array<Profile>
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
}

export function Sidebar({ profiles, selectedId, onSelect, onCreate }: Props) {
  return (
    <aside className="flex w-[240px] shrink-0 flex-col border-r border-(--color-border)">
      <header className="px-4 py-4">
        <h1 className="text-sm font-semibold tracking-tight">claude-profiles</h1>
      </header>
      <ProfileList profiles={profiles} selectedId={selectedId} onSelect={onSelect} />
      <footer className="border-t border-(--color-border) p-3">
        <Button size="sm" className="w-full" onClick={onCreate}>
          + New profile
        </Button>
      </footer>
    </aside>
  )
}
