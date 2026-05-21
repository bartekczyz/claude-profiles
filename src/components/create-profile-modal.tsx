import type { Surfaces } from '@/lib/types'

import { useState } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { isValidHexColor, presetColors } from '@/lib/colors'

import { ColorSwatchPicker } from './color-swatch-picker'

type Props = {
  open: boolean
  submitting?: boolean
  onClose: () => void
  onCreate: (input: { name: string; color: string; surfaces: Surfaces }) => Promise<void>
}

export function CreateProfileModal({ open, submitting, onClose, onCreate }: Props) {
  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(presetColors[0])
  const [gui, setGui] = useState(true)
  const [cli, setCli] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = name.trim().length > 0 && isValidHexColor(color) && (gui || cli)

  async function handleSubmit() {
    setError(null)
    try {
      await onCreate({ name: name.trim(), color, surfaces: { gui, cli } })
      setName('')
      setColor(presetColors[0])
      setGui(true)
      setCli(true)
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New profile</DialogTitle>
          <DialogDescription>
            A profile bundles a desktop app launcher and a CLI wrapper. Pick a name and color.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Personal"
              autoFocus
            />
          </div>
          <ColorSwatchPicker value={color} onChange={setColor} />
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Surfaces</legend>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={gui} onChange={(event) => setGui(event.target.checked)} />
              Desktop app launcher (in /Applications)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={cli} onChange={(event) => setCli(event.target.checked)} />
              Claude Code CLI wrapper (in ~/.local/bin)
            </label>
          </fieldset>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
