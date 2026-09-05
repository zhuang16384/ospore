/**
 * Small "type a name" dialog shared by project + column rename/create flows.
 * Conditionally mounted by callers ({open && <NameDialog …/>}) so each open
 * starts from a fresh draft — no state re-seeding effects.
 */

import { useEffect, useRef, useState } from 'react'
import { MAX_NAME_LENGTH } from '@shared/kanban'
import { Button } from './button'
import { Input } from './input'
import { Modal } from './modal'

export interface NameDialogProps {
  title: string
  label: string
  initialName?: string
  submitLabel?: string
  onCancel: () => void
  /** Receives the trimmed name; answer false to keep the dialog open (error). */
  onSubmit: (name: string) => Promise<boolean>
}

export function NameDialog({
  title,
  label,
  initialName = '',
  submitLabel = 'Save',
  onCancel,
  onSubmit
}: NameDialogProps): JSX.Element {
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Select the (possibly pre-filled) name so retyping over it is one keystroke.
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.select())
  }, [])

  const submit = async (): Promise<void> => {
    const trimmed = name.trim()
    if (trimmed.length === 0 || busy) return
    setBusy(true)
    const ok = await onSubmit(trimmed)
    setBusy(false)
    if (ok) onCancel()
  }

  return (
    <Modal open title={title} onClose={onCancel}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <label className="mb-1 block text-small text-text-secondary">{label}</label>
        <Input
          ref={inputRef}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          autoFocus
          onChange={(event) => setName(event.target.value)}
          data-testid="name-dialog-input"
        />
        <div className="mt-4 flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            type="submit"
            disabled={name.trim().length === 0 || busy}
          >
            {submitLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
