/**
 * Card editor modal: title + description, save / delete.
 */

import { useState } from 'react'
import { MAX_DESCRIPTION_LENGTH, MAX_NAME_LENGTH } from '@shared/kanban'
import type { BoardCard } from '@shared/kanban'
import { useKanban } from '@renderer/stores/kanban'
import { Button } from '@renderer/components/ui/button'
import { Input, Textarea } from '@renderer/components/ui/input'
import { ConfirmDialog, Modal } from '@renderer/components/ui/modal'

export function CardDialog({
  card,
  onClose
}: {
  card: BoardCard
  onClose: () => void
}): JSX.Element {
  const updateCard = useKanban((s) => s.updateCard)
  const deleteCard = useKanban((s) => s.deleteCard)

  const [title, setTitle] = useState(card.title)
  const [description, setDescription] = useState(card.description)
  const [busy, setBusy] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const trimmedTitle = title.trim()
  const dirty = trimmedTitle !== card.title || description !== card.description

  const save = async (): Promise<void> => {
    if (!trimmedTitle || !dirty || busy) return
    setBusy(true)
    const ok = await updateCard(card.id, { title: trimmedTitle, description })
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <>
      <Modal open title="Edit card" onClose={onClose} className="w-96">
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <label className="mb-1 block text-small text-text-secondary" htmlFor="card-title">
            Title
          </label>
          <Input
            id="card-title"
            value={title}
            maxLength={MAX_NAME_LENGTH}
            onChange={(event) => setTitle(event.target.value)}
          />
          <label
            className="mb-1 mt-3 block text-small text-text-secondary"
            htmlFor="card-description"
          >
            Description
          </label>
          <Textarea
            id="card-description"
            value={description}
            rows={5}
            maxLength={MAX_DESCRIPTION_LENGTH}
            placeholder="Details, acceptance criteria, links…"
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="mt-4 flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              className="hover:text-destructive"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </Button>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                type="submit"
                disabled={!trimmedTitle || !dirty || busy}
              >
                Save
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete card?"
        body={<>The card “{card.title}” will be permanently deleted.</>}
        onConfirm={() => {
          setConfirmingDelete(false)
          onClose()
          void deleteCard(card.id)
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  )
}
