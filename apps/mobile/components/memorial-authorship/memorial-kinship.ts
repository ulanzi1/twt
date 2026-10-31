// Story 11b.5a (KL8 / KL9 / KL15) — the family list on the phone: pure helpers shared by the family screen, the preview and the
// Send's FormData, so what the preview draws is EXACTLY what the Send carries.
//
// ⭐ A draft row may be unfinished while the family types (a relation not chosen yet, an empty name). The family screen blocks
// "Next" on an unfinished row (copy 2.11); the Send and the preview read only FINISHED rows through ONE function
// ({@link memorialKinshipForSend}) — the preview never shows a row the Send would not carry.
// ⭐ The "in the photo" tick (KL15) rides only when the Send carries a photo (a new one, or the one sent before): every tick is
// STRIPPED otherwise (the server refuses a tick with ⛔ no photo — `memorial.kinship_invalid`, a malformed client only).
// ⭐ Names are kept EXACTLY as typed (⛔ no trim, ⛔ no normalisation — [[feedback_never_mangle_member_names]]).

import {
  MEMORIAL_KINSHIP_MAX_ENTRIES,
  MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS,
  isMemorialTextBlank,
  memorialCodePointLength,
  type MemorialKinshipEntry,
  type MemorialKinshipRelation,
} from '@twt/contracts'

/** One row as the draft holds it — `relation` absent until chosen. */
export interface MemorialDraftKinshipRow {
  relation?: MemorialKinshipRelation
  name: string
  inPhoto?: true
}

/** A row the Send can carry: a relation chosen, a name that is not blank and within the cap. */
export function memorialKinshipRowComplete(row: MemorialDraftKinshipRow): boolean {
  return (
    row.relation !== undefined &&
    !isMemorialTextBlank(row.name) &&
    memorialCodePointLength(row.name) <= MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS
  )
}

/** Code points over the name cap (0 when within it) — the family screen's "shorten it by about {count}" line. */
export function memorialKinshipNameOver(name: string): number {
  return Math.max(0, memorialCodePointLength(name) - MEMORIAL_KINSHIP_NAME_MAX_CODE_POINTS)
}

/** Can the family screen go on? Every row is either finished, or wholly empty (no relation, no name — it is dropped). */
export function memorialKinshipRowsReady(rows: readonly MemorialDraftKinshipRow[]): boolean {
  return rows.every((r) => memorialKinshipRowComplete(r) || (r.relation === undefined && r.name === ''))
}

/**
 * ⭐ THE list the Send carries and the preview draws: the finished rows, at most 20, each `inPhoto` kept ONLY when the Send
 * carries a photo (`withPhoto` — `use-memorial-send.ts`'s own photo test). `[]` ⇒ the Send carries ⛔ no `kinship` part.
 */
export function memorialKinshipForSend(rows: readonly MemorialDraftKinshipRow[] | undefined, withPhoto: boolean): MemorialKinshipEntry[] {
  return (rows ?? [])
    .filter(memorialKinshipRowComplete)
    .slice(0, MEMORIAL_KINSHIP_MAX_ENTRIES)
    .map((r) =>
      withPhoto && r.inPhoto === true
        ? { relation: r.relation as MemorialKinshipRelation, name: r.name, inPhoto: true as const }
        : { relation: r.relation as MemorialKinshipRelation, name: r.name },
    )
}

/**
 * "Start from the list I sent" (KL8 / KL15) — the family's OWN last-sent list (`view.kinship`, ⛔ as approved), as draft rows.
 * A tick is copied ONLY when the draft keeps the photo sent before; with a new photo or none, every tick starts cleared.
 */
export function memorialKinshipStartFromSent(
  sent: readonly MemorialKinshipEntry[],
  keepsPreviousPhoto: boolean,
): MemorialDraftKinshipRow[] {
  return sent.map((e) =>
    keepsPreviousPhoto && e.inPhoto === true ? { relation: e.relation, name: e.name, inPhoto: true } : { relation: e.relation, name: e.name },
  )
}

/** Drop every tick (the family chose "without a photo", or a NEW photo replaced the one the ticks pointed at). */
export function memorialKinshipClearTicks(rows: readonly MemorialDraftKinshipRow[] | undefined): MemorialDraftKinshipRow[] | undefined {
  if (rows === undefined) return undefined
  return rows.map((r) => (r.relation === undefined ? { name: r.name } : { relation: r.relation, name: r.name }))
}
