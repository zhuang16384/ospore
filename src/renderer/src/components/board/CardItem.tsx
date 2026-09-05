/**
 * One draggable card. Native HTML5 DnD: dragstart publishes the card id on a
 * custom MIME type (readable only on drop) plus the zustand drag state (which
 * dragover handlers read to draw indicators).
 */

import type { BoardCard } from '@shared/kanban'
import { useKanban } from '@renderer/stores/kanban'
import { cn } from '@renderer/lib/utils'

export const CARD_MIME = 'application/x-ospore-card'

export function CardItem({ card, onOpen }: { card: BoardCard; onOpen: () => void }): JSX.Element {
  const dragging = useKanban((s) => s.draggingCardId === card.id)
  const setDraggingCardId = useKanban((s) => s.setDraggingCardId)

  return (
    <article
      data-card-id={card.id}
      data-testid="card"
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(CARD_MIME, card.id)
        event.dataTransfer.effectAllowed = 'move'
        setDraggingCardId(card.id)
      }}
      onDragEnd={() => setDraggingCardId(null)}
      onClick={onOpen}
      className={cn(
        'cursor-grab rounded-md border border-rule bg-bg p-2.5 transition-opacity active:cursor-grabbing',
        'hover:border-accent/60',
        dragging && 'opacity-40'
      )}
    >
      <h3 className="text-note font-medium break-words">{card.title}</h3>
      {card.description !== '' && (
        <p className="mt-1 line-clamp-3 whitespace-pre-wrap text-small text-text-secondary">
          {card.description}
        </p>
      )}
    </article>
  )
}
