/**
 * Modal primitives: a focus-light dialog (Esc / overlay click to close) and a
 * ConfirmDialog for destructive actions. Portal-free — rendered at the call
 * site with a fixed overlay, which is enough for a local-first prototype.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Button } from './button'
import { cn } from '@renderer/lib/utils'

export interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Extra width class for the panel, e.g. 'w-96'. */
  className?: string
}

export function Modal({
  open,
  title,
  onClose,
  children,
  className
}: ModalProps): JSX.Element | null {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    // Autofocus the first focusable element (input/button) inside the panel.
    const focusable = panelRef.current?.querySelector<HTMLElement>('input, textarea, button')
    focusable?.focus()
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      data-testid="modal-overlay"
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('w-80 rounded-lg border border-rule bg-surface p-4 shadow-xl', className)}
      >
        <h2 className="mb-3 text-note font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export interface ConfirmDialogProps {
  open: boolean
  title: string
  body: ReactNode
  confirmLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel
}: ConfirmDialogProps): JSX.Element | null {
  return (
    <Modal open={open} title={title} onClose={onCancel}>
      <div className="text-small text-text-secondary">{body}</div>
      <div className="mt-4 flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" variant="danger" onClick={onConfirm} data-testid="confirm-accept">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
