/** Turn an unknown rejection into the single line the error banner shows. */
export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
