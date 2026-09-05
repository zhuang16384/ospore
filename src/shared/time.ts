/**
 * Canonical timestamp format, shared by main and renderer: Unix seconds since
 * the epoch, UTC — the same format SQLite stores. JavaScript's `Date` works in
 * milliseconds, so go through `unixSecondsToDate` at the display edge instead
 * of hand-rolling `* 1000`.
 */

/** Current wall-clock time as Unix seconds. */
export function unixSecondsNow(): number {
  return Math.floor(Date.now() / 1000)
}

/** Convert a Unix-seconds timestamp to a JS `Date` (which wants ms). */
export function unixSecondsToDate(unixSeconds: number): Date {
  return new Date(unixSeconds * 1000)
}

/**
 * Format a Unix-seconds timestamp as a local `yyyy-MM-dd` date string —
 * the app-wide display format. Local (not UTC) so the day matches the
 * user's calendar rather than shifting near midnight.
 */
export function unixSecondsToDatestamp(unixSeconds: number): string {
  const d = unixSecondsToDate(unixSeconds)
  const yyyy = String(d.getFullYear()).padStart(4, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}
