/**
 * Layout preferences — the pane geometry the app remembers between launches.
 *
 * Flat and bounded, like the workspace MRU list, which is what lets
 * `config.json` hold it (architecture §6: "最近打开的工作区列表 + 少量偏好").
 * Nothing here is a domain entity.
 */

export interface LayoutPreferences {
  /** Width of the file-tree rail, in CSS pixels. */
  sidebarWidth: number
}

/**
 * Sidebar bounds.
 *
 * `docMin` is the width the document pane refuses to go below. It is not a
 * persisted bound — it depends on the window — so it only ever applies while
 * clamping against a measured container, never on its own.
 */
export const SIDEBAR = {
  min: 180,
  max: 720,
  default: 288,
  /** One arrow-key press, in pixels. Shift multiplies it. */
  step: 16,
  docMin: 320
} as const

export const DEFAULT_LAYOUT: LayoutPreferences = { sidebarWidth: SIDEBAR.default }

/**
 * Clamp a sidebar width to the stored bounds, and — when the caller knows the
 * container's width — to whatever is left after the document pane's minimum.
 *
 * Non-finite input falls back to the default instead of propagating NaN into
 * the stylesheet, where `width: NaNpx` would silently collapse the rail.
 */
export function clampSidebarWidth(width: number, containerWidth?: number): number {
  if (!Number.isFinite(width)) return SIDEBAR.default

  const ceiling =
    containerWidth === undefined || !Number.isFinite(containerWidth)
      ? SIDEBAR.max
      : Math.max(SIDEBAR.min, Math.min(SIDEBAR.max, containerWidth - SIDEBAR.docMin))

  return Math.round(Math.min(Math.max(width, SIDEBAR.min), ceiling))
}

/**
 * Coerce an arbitrary value into a valid layout — the boundary for anything
 * that did not come from this process, such as a hand-edited `config.json` or
 * an IPC payload.
 */
export function normalizeLayout(value: unknown): LayoutPreferences {
  const sidebarWidth =
    typeof value === 'object' && value !== null
      ? (value as { sidebarWidth?: unknown }).sidebarWidth
      : undefined

  return {
    sidebarWidth: clampSidebarWidth(typeof sidebarWidth === 'number' ? sidebarWidth : NaN)
  }
}
