// The family list in the API layer (Story 11b.5a — `-428` PQ1 A; `-431` KL5 / KL8 / KL10 / KL15).
//
// ⭐ ONE parse for the Send part AND every decrypted read (the member view, the review detail, the public page, the take-down):
// `JSON.parse` + `MemorialKinshipListSchema` — the SAME schema at every site, so a list the Send accepted is ⛔ never refused on
// a read (KL10: a read failure drops the WHOLE memorial). The stored plaintext is `JSON.stringify` of the PARSED entries (the
// schema's key order) — each name is kept exactly as typed (JSON round-trips a string byte for byte, lone surrogates included).
// ⛔ The plaintext ⛔ never reaches a log line.

import { MemorialKinshipListSchema, type MemorialKinshipEntry } from '@twt/contracts';

/** The entries of a list plaintext (the Send part, or a decrypted `kinship_ciphertext`); `null` when it is ⛔ a valid list. */
export function parseMemorialKinship(plain: string): MemorialKinshipEntry[] | null {
  let json: unknown;
  try {
    json = JSON.parse(plain);
  } catch {
    return null;
  }
  const parsed = MemorialKinshipListSchema.safeParse(json);
  return parsed.success ? parsed.data : null;
}

/** The plaintext stored for a parsed list (KL5 — `JSON.stringify(entries)`). */
export function memorialKinshipPlaintext(entries: readonly MemorialKinshipEntry[]): string {
  return JSON.stringify(entries);
}
