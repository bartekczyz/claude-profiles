export type Surfaces = {
  gui: boolean
  cli: boolean
}

export type Profile = {
  id: string
  name: string
  slug: string
  color: string
  createdAt: string
  surfaces: Surfaces
}

export type AppError = {
  kind: 'Io' | 'Json' | 'Validation' | 'NotFound'
  message: string
}

export type Surface = 'gui' | 'cli'

export type ProfilePatch = {
  name?: string
  color?: string
}

export type ProfilePaths = {
  dataDir: string
  guiDataDir: string
  cliConfigDir: string
  guiLauncherPath: string
  cliWrapperPath: string
}
