import type { Dependencies, Surfaces } from '@/lib/types'

import { useState } from 'react'

import { Button, Dialog, Kbd } from '@/design'
import { isValidHexColor, presetColors } from '@/lib/colors'

import { ProfileFormFields } from './profile-form-fields'

type Props = {
  open: boolean
  dependencies: Dependencies
  submitting?: boolean
  onClose: () => void
  onCreate: (input: { name: string; color: string; surfaces: Surfaces }) => Promise<void>
}

export function CreateProfileDialog({ open, dependencies, submitting, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(presetColors[0])
  const [surfaces, setSurfaces] = useState<Surfaces>({ gui: true, cli: true })
  const [error, setError] = useState<string | null>(null)

  const effectiveGui = surfaces.gui && dependencies.claudeAppInstalled
  const effectiveCli = surfaces.cli && dependencies.claudeCliInstalled
  const canSubmit = name.trim().length > 0 && isValidHexColor(color) && (effectiveGui || effectiveCli)

  async function handleSubmit() {
    setError(null)
    try {
      await onCreate({
        name: name.trim(),
        color,
        surfaces: { gui: effectiveGui, cli: effectiveCli },
      })
      setName('')
      setColor(presetColors[0])
      setSurfaces({ gui: true, cli: true })
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <Dialog
      open={open}
      title="New profile"
      description="A profile bundles a Desktop launcher and a CLI wrapper. Pick a name and color; everything else stays isolated."
      onClose={onClose}
      foot={
        <>
          <Button variant="ghost" size="sm" trailingKbd={<Kbd>⎋</Kbd>} disabled={submitting} onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            trailingKbd={<Kbd variant="onOrange">⏎</Kbd>}
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            Create profile
          </Button>
        </>
      }
    >
      <ProfileFormFields
        name={name}
        color={color}
        surfaces={surfaces}
        dependencies={dependencies}
        onNameChange={setName}
        onColorChange={setColor}
        onSurfacesChange={setSurfaces}
      />
      {error ? <p className="mt-3 text-meta text-red">{error}</p> : null}
    </Dialog>
  )
}
