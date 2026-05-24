import type { PostHog } from 'posthog-js'

let initialized = false
let posthog: PostHog | null = null

async function loadPosthog(): Promise<PostHog> {
  const module = await import('posthog-js')
  return module.default
}

export async function initAnalytics(): Promise<void> {
  if (initialized) {
    return
  }
  initialized = true
  const key = import.meta.env.PUBLIC_POSTHOG_KEY
  if (!key) {
    return
  }
  posthog = await loadPosthog()
  posthog.init(key, {
    api_host: import.meta.env.PUBLIC_POSTHOG_HOST ?? 'https://eu.i.posthog.com',
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    opt_out_capturing_by_default: true,
    persistence: 'localStorage',
    person_profiles: 'identified_only',
  })
}

export function grantConsent(): void {
  if (!posthog) {
    return
  }
  posthog.opt_in_capturing()
  posthog.capture('$pageview')
}

export function revokeConsent(): void {
  if (!posthog) {
    return
  }
  posthog.opt_out_capturing()
}

export function track(event: string, properties?: Record<string, unknown>): void {
  if (!posthog?.has_opted_in_capturing()) {
    return
  }
  const release = window.__cpRelease
  posthog.capture(event, {
    ...properties,
    release_tag: release?.tag_name,
  })
}
