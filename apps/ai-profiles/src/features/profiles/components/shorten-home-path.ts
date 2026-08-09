/**
 * Rewrites the leading home directory of an absolute path as `~`, so a
 * resolved path reads at a glance in tight UI (menu rows, status lines).
 * Paths outside the home directory come back unchanged.
 */
export function shortenHomePath(absolutePath: string): string {
  const home = absolutePath.match(/^\/Users\/[^/]+/)?.[0]
  if (home === undefined) {
    return absolutePath
  }
  return `~${absolutePath.slice(home.length)}`
}
