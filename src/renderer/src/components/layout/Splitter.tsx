/**
 * Draggable divider between the file tree and the document pane.
 *
 * Follows the WAI-ARIA window-splitter pattern: it is focusable, the arrow keys
 * resize it (Shift for a coarse step), Home/End jump to the bounds, and a
 * double-click restores the default. Pointer capture keeps the drag alive once
 * the pointer leaves the 4px handle, which it does within a pixel or two.
 *
 * All the arithmetic lives in `@shared/layout` so it can be tested without a
 * browser; this component only measures and forwards.
 */

import { useRef, useState } from 'react'
import { SIDEBAR, clampSidebarWidth } from '@shared/layout'
import { cn } from '@renderer/lib/utils'

interface SplitterProps {
  width: number
  onResizeStart(): void
  onResize(width: number): void
  onResizeEnd(): void
}

export function Splitter({
  width,
  onResizeStart,
  onResize,
  onResizeEnd
}: SplitterProps): JSX.Element {
  const handleRef = useRef<HTMLDivElement>(null)
  const [held, setHeld] = useState(false)
  /**
   * Whether this pointer is mid-drag.
   *
   * A ref, not the state above, because pointermove is gated on it and React
   * state is not readable within the same event burst: a press followed by
   * moves in one task would drop every move. The state is only for styling.
   */
  const draggingRef = useRef(false)

  /**
   * Turn a pointer position into a sidebar width. The container is the splitter's
   * own parent, so the splitter never needs to be told where it lives.
   */
  function widthAt(clientX: number): number {
    const container = handleRef.current?.parentElement
    if (!container) return width
    const rect = container.getBoundingClientRect()
    return clampSidebarWidth(clientX - rect.left, rect.width)
  }

  /** Clamp a keyboard-driven width against the same measured room to grow. */
  function widthFits(next: number): number {
    const rect = handleRef.current?.parentElement?.getBoundingClientRect()
    return clampSidebarWidth(next, rect?.width)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>): void {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    setHeld(true)
    onResizeStart()
    // Jump straight to the pointer so the handle does not lag behind a fast grab.
    onResize(widthAt(event.clientX))
  }

  function handlePointerMove(event: React.PointerEvent<HTMLDivElement>): void {
    if (!draggingRef.current) return
    onResize(widthAt(event.clientX))
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>): void {
    if (!draggingRef.current) return
    draggingRef.current = false
    event.currentTarget.releasePointerCapture(event.pointerId)
    setHeld(false)
    onResizeEnd()
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>): void {
    const step = event.shiftKey ? SIDEBAR.step * 4 : SIDEBAR.step
    const target =
      event.key === 'ArrowLeft'
        ? widthFits(width - step)
        : event.key === 'ArrowRight'
          ? widthFits(width + step)
          : event.key === 'Home'
            ? widthFits(SIDEBAR.min)
            : event.key === 'End'
              ? widthFits(SIDEBAR.max)
              : null

    if (target === null) return
    event.preventDefault()
    onResizeStart()
    onResize(target)
    onResizeEnd()
  }

  function handleDoubleClick(): void {
    onResizeStart()
    onResize(widthFits(SIDEBAR.default))
    onResizeEnd()
  }

  return (
    <div
      ref={handleRef}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize file tree"
      aria-valuenow={width}
      aria-valuemin={SIDEBAR.min}
      aria-valuemax={SIDEBAR.max}
      tabIndex={0}
      data-testid="splitter"
      className={cn(
        'relative w-1 shrink-0 cursor-col-resize touch-none',
        // A 1px rule centred in a 4px hit area, brightened while hovered or held.
        'before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2',
        'before:bg-rule hover:before:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
        held && 'before:bg-accent'
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onKeyDown={handleKeyDown}
      onDoubleClick={handleDoubleClick}
    />
  )
}
