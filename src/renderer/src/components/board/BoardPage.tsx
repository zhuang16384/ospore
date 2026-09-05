/**
 * Kanban board for the open project: horizontal column rail + add-column
 * control. Cards drag with MIME `application/x-ospore-card`; each column's
 * card list is the drop zone (see Column.tsx). Columns reorder via their
 * header buttons — prototype-grade, no rail-wide DnD machinery.
 */

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { ColumnWithCards } from '@shared/kanban'
import { useKanban } from '@renderer/stores/kanban'
import { Button } from '@renderer/components/ui/button'
import { NameDialog } from '@renderer/components/ui/name-dialog'
import { Column } from './Column'
import { CardDialog } from './CardDialog'

export function BoardPage(): JSX.Element {
  const board = useKanban((s) => s.board)
  const editingCardId = useKanban((s) => s.editingCardId)
  const [addingColumn, setAddingColumn] = useState(false)

  if (!board) return <div className="p-6 text-text-secondary">No board open.</div>

  const editingCard = board.columns
    .flatMap((column: ColumnWithCards) => column.cards)
    .find((card) => card.id === editingCardId)

  return (
    <div className="flex h-full items-stretch gap-4 overflow-x-auto p-4">
      {board.columns.map((column, index) => (
        <Column key={column.id} column={column} index={index} total={board.columns.length} />
      ))}

      <div className="w-60 shrink-0">
        <Button
          variant="secondary"
          className="h-9 w-full"
          onClick={() => setAddingColumn(true)}
          data-testid="add-column"
        >
          <Plus size={14} /> Add column
        </Button>
      </div>

      {addingColumn && (
        <NameDialog
          title="Add column"
          label="Column name"
          submitLabel="Add"
          onCancel={() => setAddingColumn(false)}
          onSubmit={(name) => useKanban.getState().createColumn(name)}
        />
      )}

      {editingCard && (
        <CardDialog
          key={editingCard.id}
          card={editingCard}
          onClose={() => useKanban.getState().setEditingCardId(null)}
        />
      )}
    </div>
  )
}
