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
