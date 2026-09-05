/**
 * One board column: header (actions), scrollable card list that doubles as
 * the drop zone for card drags, and an inline add-card composer.
 */

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { MAX_NAME_LENGTH } from '@shared/kanban'
import type { ColumnWithCards } from '@shared/kanban'
import { useKanban } from '@renderer/stores/kanban'
import { cn } from '@renderer/lib/utils'
import { Button } from '@renderer/components/ui/button'
import { Textarea } from '@renderer/components/ui/input'
import { ConfirmDialog } from '@renderer/components/ui/modal'
import { NameDialog } from '@renderer/components/ui/name-dialog'
import { CardItem, CARD_MIME } from './CardItem'

export function Column({
  column,
  index,
  total
}: {
  column: ColumnWithCards
  index: number
  total: number
}): JSX.Element {
  const moveColumn = useKanban((s) => s.moveColumn)
  const deleteColumn = useKanban((s) => s.deleteColumn)
  const draggingCardId = useKanban((s) => s.draggingCardId)

  const [renaming, setRenaming] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)

  /** Insertion index for the cursor's Y among this column's cards (dragged card excluded). */
  const dropIndexAt = (clientY: number): number => {
    const cards = Array.from(
      listRef.current?.querySelectorAll<HTMLElement>('[data-card-id]') ?? []
    ).filter((el) => el.dataset.cardId !== draggingCardId)
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return cards.length
  }

  return (
    <section
      data-column-id={column.id}
      data-testid="column"
      className="flex h-full w-72 shrink-0 flex-col rounded-lg border border-rule bg-surface"
      aria-label={column.name}
    >
      <header className="flex items-center gap-1 border-b border-rule px-2 py-1.5">
        <h2 className="flex-1 truncate font-medium" title={column.name}>
          {column.name}
        </h2>
        <span className="text-small text-text-muted">{column.cards.length}</span>
        <div className="flex">
          <Button
            size="icon"
            variant="ghost"
            title="Move column left"
            disabled={index === 0}
            onClick={() => void moveColumn(column.id, index - 1)}
          >
            <ChevronLeft size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Move column right"
            disabled={index === total - 1}
            onClick={() => void moveColumn(column.id, index + 1)}
          >
            <ChevronRight size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Rename column"
            onClick={() => setRenaming(true)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            title="Delete column"
            className="hover:text-destructive"
            onClick={() => setConfirmingDelete(true)}
          >
            <Trash2 size={14} />
          </Button>
        </div>
      </header>

      <div
        ref={listRef}
        className={cn(
          'scrollbar-thin min-h-24 flex-1 space-y-2 overflow-y-auto p-2',
          draggingCardId !== null && 'bg-accent/5'
        )}
        onDragOver={(event) => {
          if (draggingCardId === null) return
          event.preventDefault()
          event.dataTransfer.dropEffect = 'move'
          setDropIndex(dropIndexAt(event.clientY))
        }}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node)) setDropIndex(null)
        }}
        onDrop={(event) => {
          event.preventDefault()
          event.stopPropagation()
          setDropIndex(null)
          const cardId = event.dataTransfer.getData(CARD_MIME)
          if (cardId) {
            void useKanban.getState().moveCard(cardId, column.id, dropIndexAt(event.clientY))
          }
        }}
      >
        {column.cards.map((card, cardIndex) => (
          <div key={card.id} className="contents">
            {dropIndex === cardIndex && <DropIndicator />}
            <CardItem card={card} onOpen={() => useKanban.getState().setEditingCardId(card.id)} />
          </div>
        ))}
        {dropIndex === column.cards.length && <DropIndicator />}
      </div>

      <AddCardComposer columnId={column.id} />

      {renaming && (
        <NameDialog
          title="Rename column"
          label="Column name"
          initialName={column.name}
          onCancel={() => setRenaming(false)}
          onSubmit={(name) => useKanban.getState().renameColumn(column.id, name)}
        />
      )}
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete column?"
        body={
          <span>
            <strong>{column.name}</strong> and its {column.cards.length} card(s) will be permanently
            deleted.
          </span>
        }
        onConfirm={() => {
          setConfirmingDelete(false)
          void deleteColumn(column.id)
        }}
        onCancel={() => setConfirmingDelete(false)}
      />
    </section>
  )
}

function DropIndicator(): JSX.Element {
  return <div className="h-1 rounded-full bg-accent/70" data-testid="drop-indicator" />
}

function AddCardComposer({ columnId }: { columnId: string }): JSX.Element {
  const createCard = useKanban((s) => s.createCard)
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  if (!open) {
    return (
      <button
        type="button"
        className="flex w-full items-center gap-1.5 border-t border-rule px-3 py-2 text-left text-small text-text-secondary hover:accent-surface hover:text-text-primary"
        onClick={() => {
          setOpen(true)
          requestAnimationFrame(() => textareaRef.current?.focus())
        }}
      >
        <Plus size={14} /> Add card
      </button>
    )
  }

  const submit = async (): Promise<void> => {
    const trimmed = title.trim()
    if (!trimmed || busy) return
    setBusy(true)
    const ok = await createCard(columnId, trimmed)
    setBusy(false)
    if (ok) setTitle('') // keep the composer open for a run of cards
  }

  return (
    <form
      className="border-t border-rule p-2"
      onSubmit={(event) => {
        event.preventDefault()
        void submit()
      }}
    >
      <Textarea
        ref={textareaRef}
        value={title}
        rows={2}
        maxLength={MAX_NAME_LENGTH}
        placeholder="Card title…"
        data-testid="card-composer"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void submit()
          }
          if (event.key === 'Escape') {
            setOpen(false)
            setTitle('')
          }
        }}
        onChange={(event) => setTitle(event.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="primary" type="submit" disabled={!title.trim() || busy}>
          Add
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setOpen(false)
            setTitle('')
          }}
        >
          <X size={14} />
        </Button>
      </div>
    </form>
  )
}
