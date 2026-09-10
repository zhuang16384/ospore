import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

/**
 * Font-size tokens declared in `styles/globals.css` (`--text-*`).
 *
 * tailwind-merge cannot tell that these are font sizes — `small` is not a size
 * to it — so it files `text-small` under *text color*, and the next
 * `text-text-muted` in the same `cn()` call silently deletes it. That made
 * file-tree rows flip between 12px and 15px depending on whether they were
 * selected. Registering the tokens keeps size-vs-color independent while real
 * conflicts (two sizes, two colors) still merge. Exported so a test can assert
 * it stays in sync with the stylesheet; see `__tests__/utils.test.ts`.
 */
export const FONT_SIZE_TOKENS = ['note', 'small'] as const

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [{ text: [...FONT_SIZE_TOKENS] }]
    }
  }
})

/** Merge conditional class names, de-duplicating Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
