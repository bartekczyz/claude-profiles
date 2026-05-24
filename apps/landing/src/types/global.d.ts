import type { Release } from '../lib/release'

declare global {
  interface Window {
    __cpRelease: Release | undefined
  }
}
