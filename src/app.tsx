import { useState } from 'react'

import { CreateProfileModal } from '@/components/create-profile-modal'
import { DeleteProfileDialog } from '@/components/delete-profile-dialog'
import { EditProfileModal } from '@/components/edit-profile-modal'
import { EmptyState } from '@/components/empty-state'
import { MigrationDialog } from '@/components/migration-dialog'
import { ProfileDetail } from '@/components/profile-detail'
import { Sidebar } from '@/components/sidebar'
import { useMigration } from '@/hooks/use-migration'
import { useProfiles } from '@/hooks/use-profiles'

type ModalState = { kind: 'none' } | { kind: 'create' } | { kind: 'edit' } | { kind: 'delete' }

export default function App() {
  const profiles = useProfiles()
  const migration = useMigration()
  const [modal, setModal] = useState<ModalState>({ kind: 'none' })
  const [submitting, setSubmitting] = useState(false)
  const [migrationDismissedThisSession, setMigrationDismissedThisSession] = useState(false)

  const selected = profiles.profiles.find((profile) => profile.id === profiles.selectedId) ?? null

  const shouldOfferMigration =
    !profiles.loading &&
    !migration.loading &&
    profiles.profiles.length === 0 &&
    migration.anyDetected &&
    !migrationDismissedThisSession

  async function handleCreate(input: Parameters<typeof profiles.create>[0]) {
    setSubmitting(true)
    try {
      await profiles.create(input)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(input: { name: string; color: string }) {
    if (!selected) {
      return
    }
    setSubmitting(true)
    try {
      await profiles.update({ id: selected.id, patch: input })
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(input: { moveToTrash: boolean }) {
    if (!selected) {
      return
    }
    await profiles.remove({ id: selected.id, ...input })
  }

  if (profiles.loading) {
    return <div className="flex h-full items-center justify-center text-sm">Loading…</div>
  }

  return (
    <div className="flex h-full">
      <Sidebar
        profiles={profiles.profiles}
        selectedId={profiles.selectedId}
        onSelect={profiles.select}
        onCreate={() => setModal({ kind: 'create' })}
      />
      {selected ? (
        <ProfileDetail
          profile={selected}
          onEdit={() => setModal({ kind: 'edit' })}
          onDelete={() => setModal({ kind: 'delete' })}
          onToggle={async (surface, enabled) => {
            await profiles.toggle({ id: selected.id, surface, enabled })
          }}
        />
      ) : (
        <EmptyState onCreate={() => setModal({ kind: 'create' })} />
      )}

      <CreateProfileModal
        open={modal.kind === 'create'}
        submitting={submitting}
        onClose={() => setModal({ kind: 'none' })}
        onCreate={handleCreate}
      />
      {selected ? (
        <EditProfileModal
          open={modal.kind === 'edit'}
          profile={selected}
          submitting={submitting}
          onClose={() => setModal({ kind: 'none' })}
          onSave={handleEdit}
        />
      ) : null}
      {selected ? (
        <DeleteProfileDialog
          open={modal.kind === 'delete'}
          profile={selected}
          onClose={() => setModal({ kind: 'none' })}
          onConfirm={handleDelete}
        />
      ) : null}

      {shouldOfferMigration && migration.existing ? (
        <MigrationDialog
          open
          existing={migration.existing}
          onClose={() => setMigrationDismissedThisSession(true)}
          onImport={async (input) => {
            const imported = await migration.import(input)
            await profiles.refresh()
            profiles.select(imported.id)
            return imported
          }}
        />
      ) : null}

      {profiles.error ? (
        <div className="pointer-events-none absolute right-4 bottom-4 max-w-sm rounded-md bg-red-600 px-3 py-2 text-sm text-white shadow">
          {profiles.error}
        </div>
      ) : null}
    </div>
  )
}
