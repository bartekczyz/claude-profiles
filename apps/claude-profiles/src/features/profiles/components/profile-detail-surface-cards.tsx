import type { ReactNode } from 'react'
import type { ProfilePaths, Surfaces } from '@/lib/types'

import { useShortcut } from '@/design'
import { useDependencies } from '@/features/dependencies/api/use-dependencies'
import { openInFinder } from '@/lib/commands'

import { DeepLinkInfo } from './deep-link-info'
import { ProfileDetailSurfaceCard } from './profile-detail-surface-card'

type Props = {
  paths: ProfilePaths
  surfaces: Surfaces
  cliCommandLabel: ReactNode
  onLaunchGui: () => Promise<unknown>
  onCopyCli: () => Promise<unknown>
  onError: (message: string | null) => void
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
  if (slashIndex === -1) {
    return filePath
  }
  return filePath.slice(slashIndex + 1)
}

/**
 * Renders the two surface cards (GUI / CLI). Owns the reveal-in-Finder
 * shortcut wiring and the CLI status-line composition. Receives launch
 * and copy callbacks from the parent so the same component works for
 * both managed profiles (which log activity via useProfileLastUsed) and
 * the default entry (which uses direct shell / clipboard calls).
 *
 * Path-loading is the parent's job — pass a fully-resolved ProfilePaths.
 */
export function ProfileDetailSurfaceCards({
  paths,
  surfaces,
  cliCommandLabel,
  onLaunchGui,
  onCopyCli,
  onError,
}: Props) {
  const dependencies = useDependencies()

  async function safeRun(action: () => Promise<unknown>) {
    try {
      await action()
      onError(null)
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  useShortcut('reveal-gui-data', () => safeRun(() => openInFinder(paths.guiDataDir)), {
    enabled: surfaces.gui,
  })
  useShortcut('reveal-gui-launcher', () => safeRun(() => openInFinder(paths.guiLauncherPath)), {
    enabled: surfaces.gui,
  })
  useShortcut('reveal-cli-config', () => safeRun(() => openInFinder(paths.cliConfigDir)), {
    enabled: surfaces.cli,
  })
  useShortcut('reveal-cli-wrapper', () => safeRun(() => openInFinder(paths.cliWrapperPath)), {
    enabled: surfaces.cli,
  })

  const cliStatusDetail = dependencies.deps.localBinOnPath
    ? `Wrapper installed · ${basename(paths.cliWrapperPath)} on PATH`
    : `Wrapper installed · PATH needs ~/.local/bin (Settings → Shell PATH)`
  const cliStatusTone: 'success' | 'warning' = dependencies.deps.localBinOnPath ? 'success' : 'warning'

  return (
    <>
      <ProfileDetailSurfaceCard
        variant="gui"
        enabled={surfaces.gui}
        primaryLabel="Open Claude"
        primaryKbd="⏎"
        statusDetail={`Launcher ready in ${shorten(paths.guiLauncherPath)}`}
        primarySuffix={surfaces.gui ? <DeepLinkInfo /> : null}
        secondaries={[
          { label: 'Reveal app', kbd: '⌥1', onClick: () => safeRun(() => openInFinder(paths.guiDataDir)) },
          { label: 'Launcher', kbd: '⌥2', onClick: () => safeRun(() => openInFinder(paths.guiLauncherPath)) },
        ]}
        onPrimary={() => safeRun(onLaunchGui)}
      />
      <ProfileDetailSurfaceCard
        variant="cli"
        enabled={surfaces.cli}
        primaryLabel={<>Copy {cliCommandLabel}</>}
        primaryKbd="⌘C"
        statusDetail={cliStatusDetail}
        statusTone={cliStatusTone}
        secondaries={[
          { label: 'Config', kbd: '⌥3', onClick: () => safeRun(() => openInFinder(paths.cliConfigDir)) },
          { label: 'Wrapper', kbd: '⌥4', onClick: () => safeRun(() => openInFinder(paths.cliWrapperPath)) },
        ]}
        onPrimary={() => safeRun(onCopyCli)}
      />
    </>
  )
}

type FallbackProps = {
  surfaces: Surfaces
  cliCommandLabel: ReactNode
  onLaunchGui: () => Promise<unknown>
  onCopyCli: () => Promise<unknown>
}

/** Suspense fallback for the surface cards block — primary buttons render
 * without status detail. Mirrors the loaded shape so the layout doesn't
 * jump when the paths fetch resolves. */
export function ProfileDetailSurfaceCardsFallback({
  surfaces,
  cliCommandLabel,
  onLaunchGui,
  onCopyCli,
}: FallbackProps) {
  return (
    <>
      <ProfileDetailSurfaceCard
        variant="gui"
        enabled={surfaces.gui}
        primaryLabel="Open Claude"
        primaryKbd="⏎"
        primarySuffix={surfaces.gui ? <DeepLinkInfo /> : null}
        secondaries={[
          { label: 'Reveal app', kbd: '⌥1' },
          { label: 'Launcher', kbd: '⌥2' },
        ]}
        onPrimary={onLaunchGui}
      />
      <ProfileDetailSurfaceCard
        variant="cli"
        enabled={surfaces.cli}
        primaryLabel={<>Copy {cliCommandLabel}</>}
        primaryKbd="⌘C"
        secondaries={[
          { label: 'Config', kbd: '⌥3' },
          { label: 'Wrapper', kbd: '⌥4' },
        ]}
        onPrimary={onCopyCli}
      />
    </>
  )
}
