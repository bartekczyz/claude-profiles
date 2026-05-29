import type { DefaultEntry, ExistingInstallInfo, SidebarEntry } from '@/lib/types'

import { useMigration } from '@/features/migration/api/use-migration'

import { useProfiles } from './use-profiles'

/**
 * Composes the sidebar's entry list from two sources: the managed-profile
 * list (CRUD-backed by the Rust store) and a synthetic "default" entry
 * derived from existing-install detection. The default entry — if present
 * — always precedes the managed list.
 */
export function useSidebarEntries(): Array<SidebarEntry> {
  const { profiles } = useProfiles()
  const { existing } = useMigration()
  const defaultEntry = makeDefaultEntry(existing)
  const managed: Array<SidebarEntry> = profiles.map((profile) => ({ kind: 'managed', profile }))
  if (defaultEntry) {
    return [{ kind: 'default', entry: defaultEntry }, ...managed]
  }
  return managed
}

/**
 * Resolves the id of an entry regardless of which arm of the union it is.
 * Exported for callers that need to compare an entry against a stored id
 * (app.tsx selection routing, useSidebarSelection's match check, etc).
 */
export function entryId(entry: SidebarEntry): string {
  return entry.kind === 'managed' ? entry.profile.id : entry.entry.id
}

/**
 * Pure: builds the synthetic default entry from the existing-install
 * detection payload, or null if neither stock path is present.
 * Exposed for unit-testing in isolation.
 */
export function makeDefaultEntry(existing: ExistingInstallInfo): DefaultEntry | null {
  const gui = existing.claudeDesktopPath !== null
  const cli = existing.claudeCodePath !== null
  if (!gui && !cli) {
    return null
  }
  return {
    id: 'default:claude',
    app: 'claude',
    name: 'Default',
    surfaces: { gui, cli },
  }
}
