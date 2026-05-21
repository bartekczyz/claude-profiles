import type { AppError, Profile, ProfilePatch, Surface, Surfaces } from '@/lib/types'

import { useEffect, useState } from 'react'

import { createProfile, deleteProfile, listProfiles, toggleSurface, updateProfile } from '@/lib/commands'

type UseProfilesResult = {
  profiles: Array<Profile>
  selectedId: string | null
  loading: boolean
  error: string | null
  select: (id: string | null) => void
  create: (input: { name: string; color: string; surfaces: Surfaces }) => Promise<Profile>
  update: (input: { id: string; patch: ProfilePatch }) => Promise<Profile>
  remove: (input: { id: string; moveToTrash: boolean }) => Promise<void>
  toggle: (input: { id: string; surface: Surface; enabled: boolean }) => Promise<Profile>
  refresh: () => Promise<void>
}

export function useProfiles(): UseProfilesResult {
  const [profiles, setProfiles] = useState<Array<Profile>>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function refresh() {
    setError(null)
    try {
      const fetched = await listProfiles()
      setProfiles(fetched)
      if (selectedId && !fetched.some((profile) => profile.id === selectedId)) {
        setSelectedId(fetched[0]?.id ?? null)
      } else if (!selectedId && fetched.length > 0) {
        setSelectedId(fetched[0].id)
      }
    } catch (caught) {
      setError((caught as AppError).message ?? String(caught))
    }
  }

  // biome-ignore lint/correctness/useExhaustiveDependencies: refresh is intentionally only called on mount
  useEffect(() => {
    void refresh().finally(() => {
      setLoading(false)
    })
  }, [])

  async function create(input: { name: string; color: string; surfaces: Surfaces }) {
    const created = await createProfile(input)
    setProfiles((previous) => [...previous, created])
    setSelectedId(created.id)
    return created
  }

  async function update(input: { id: string; patch: ProfilePatch }) {
    const updated = await updateProfile(input)
    setProfiles((previous) => previous.map((profile) => (profile.id === updated.id ? updated : profile)))
    return updated
  }

  async function remove(input: { id: string; moveToTrash: boolean }) {
    await deleteProfile(input)
    setProfiles((previous) => previous.filter((profile) => profile.id !== input.id))
    if (selectedId === input.id) {
      setSelectedId(null)
    }
  }

  async function toggle(input: { id: string; surface: Surface; enabled: boolean }) {
    const updated = await toggleSurface(input)
    setProfiles((previous) => previous.map((profile) => (profile.id === updated.id ? updated : profile)))
    return updated
  }

  return {
    profiles,
    selectedId,
    loading,
    error,
    select: setSelectedId,
    create,
    update,
    remove,
    toggle,
    refresh,
  }
}
