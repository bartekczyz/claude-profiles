import type { Profile, Surface } from '@/lib/types'

import { useState } from 'react'

// cross-feature: detail pane reads dependency state to drive surface-card status lines
import { useDependencies } from '@/features/dependencies/api/use-dependencies'
import { copyToClipboard, openInFinder, openProfileInApp } from '@/lib/commands'

import { useProfilePaths } from '../api/use-profile-paths'
import { DeepLinkInfo } from './deep-link-info'
import { ProfileDetailDangerLink } from './profile-detail-danger-link'
import { ProfileDetailHeader } from './profile-detail-header'
import { ProfileDetailHintStrip } from './profile-detail-hint-strip'
import { ProfileDetailRecentActivity } from './profile-detail-recent-activity'
import { ProfileDetailSurfaceCard } from './profile-detail-surface-card'

type Props = {
  profile: Profile
  onEdit: () => void
  onDelete: () => void
  // Kept for future use (the More menu in Phase 11 wires it back in); the
  // surface card stays read-only for enable/disable in this phase.
  onToggle: (surface: Surface, enabled: boolean) => Promise<void>
}

function shorten(absolutePath: string): string {
  const home = absolutePath.match(/^\/Users\/[^/]+/)?.[0]
  if (home && absolutePath.startsWith(home)) {
    return `~${absolutePath.slice(home.length)}`
  }
  return absolutePath
}

function basename(filePath: string): string {
  const slashIndex = filePath.lastIndexOf('/')
  return slashIndex === -1 ? filePath : filePath.slice(slashIndex + 1)
}

export function ProfileDetail({ profile, onEdit, onDelete }: Props) {
  const paths = useProfilePaths(profile.id)
  const dependencies = useDependencies()
  const [actionError, setActionError] = useState<string | null>(null)

  async function safeRun(action: () => Promise<void>) {
    try {
      await action()
      setActionError(null)
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  const guiStatusDetail = `Launcher ready in ${shorten(paths.guiLauncherPath)}`
  const cliStatusDetail = dependencies.deps.localBinOnPath
    ? `Wrapper installed · ${basename(paths.cliWrapperPath)} on PATH`
    : `Wrapper installed · PATH needs ~/.local/bin (Settings → Shell PATH)`
  const cliStatusTone: 'success' | 'warning' = dependencies.deps.localBinOnPath ? 'success' : 'warning'

  return (
    <main className="flex flex-1 flex-col overflow-y-auto px-10 pt-10 pb-0">
      <div className="mx-auto w-full max-w-[640px] flex-1">
        <ProfileDetailHeader profile={profile} onEdit={onEdit} />

        <div className="mb-6 grid grid-cols-1 gap-3.5 lg:grid-cols-2">
          <ProfileDetailSurfaceCard
            variant="gui"
            enabled={profile.surfaces.gui}
            primaryLabel="Open Claude"
            primaryKbd="⏎"
            statusDetail={guiStatusDetail}
            primarySuffix={profile.surfaces.gui ? <DeepLinkInfo /> : null}
            secondaries={[
              {
                label: 'Reveal app',
                kbd: '⌥1',
                onClick: () => safeRun(() => openInFinder(paths.guiDataDir)),
              },
              {
                label: 'Launcher',
                kbd: '⌥2',
                onClick: () => safeRun(() => openInFinder(paths.guiLauncherPath)),
              },
            ]}
            onPrimary={() => safeRun(() => openProfileInApp(profile.id))}
          />
          <ProfileDetailSurfaceCard
            variant="cli"
            enabled={profile.surfaces.cli}
            primaryLabel={
              <>
                Copy <code className="font-mono">claude-{profile.slug}</code>
              </>
            }
            primaryKbd="⌘C"
            statusDetail={cliStatusDetail}
            statusTone={cliStatusTone}
            secondaries={[
              {
                label: 'Config',
                kbd: '⌥3',
                onClick: () => safeRun(() => openInFinder(paths.cliConfigDir)),
              },
              {
                label: 'Wrapper',
                kbd: '⌥4',
                onClick: () => safeRun(() => openInFinder(paths.cliWrapperPath)),
              },
            ]}
            onPrimary={() => safeRun(() => copyToClipboard(`claude-${profile.slug}`))}
          />
        </div>

        {actionError ? <p className="mb-4 text-meta text-red">{actionError}</p> : null}

        <ProfileDetailRecentActivity />
        <ProfileDetailDangerLink onDelete={onDelete} />
      </div>
      <ProfileDetailHintStrip />
    </main>
  )
}
