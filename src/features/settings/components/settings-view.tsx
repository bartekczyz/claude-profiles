import { Button, Kbd } from '@/design'
import { useDependencies } from '@/features/dependencies/api/use-dependencies'
import { useMigration } from '@/features/migration/api/use-migration'

import { AppearanceSection } from './appearance-section'
import { DataSection } from './data-section'
import { SettingsFooterRow } from './settings-footer-row'
import { SystemSection } from './system-section'

type Props = {
  onClose: () => void
  onOpenMigration: () => void
}

export function SettingsView({ onClose, onOpenMigration }: Props) {
  const dependencies = useDependencies()
  const migration = useMigration()

  return (
    <main className="flex flex-1 flex-col overflow-y-auto bg-background px-9 py-9">
      <div className="mx-auto flex w-full max-w-[640px] flex-1 flex-col">
        <header className="mb-6 flex items-center justify-between">
          <h2 className="text-[22px] font-semibold tracking-[-0.012em] text-ink">Settings</h2>
          <Button size="sm" variant="ghost" trailingKbd={<Kbd>⎋</Kbd>} onClick={onClose}>
            Done
          </Button>
        </header>
        <div className="mb-6 h-px bg-border-soft" />

        <AppearanceSection />
        <SystemSection deps={dependencies.deps} onRefresh={dependencies.refresh} />
        <DataSection existing={migration.existing} onReimport={onOpenMigration} />
        <SettingsFooterRow />
      </div>
    </main>
  )
}
