// PII-shielding name split — Story 8.2 (Task 2 / D11).
//
// `member_kyc_profiles.nameCiphertext` stores a member's declared name as a SINGLE combined-name
// string (Tier-1 KMS-encrypted). The My Pool card must surface only the DECEASED member's
// `firstName + lastInitial` (AC2 PII discipline, the Story 1.16b PII-scrape rule) — never the full
// surname. This is the split utility (none existed in the repo pre-8.2 — `grep -rn "lastInitial"`
// returned nothing); it runs on the ALREADY-DECRYPTED plaintext at the member-session-gated read
// layer, and only its two shielded outputs cross the wire.
//
// Colocated with the handler (not a package): the sole consumer today (D11 / [[no premature package]]).

/** The two shielded name parts the card model carries — a first name + a last-name INITIAL only. */
export interface ShieldedName {
  /** The first whitespace-delimited token of the combined name. */
  readonly firstName: string;
  /**
   * The FIRST grapheme of the LAST token when the name has ≥2 tokens; `''` when the name is a single
   * token (no surname to initialize → the card shows just the first name). NEVER the full surname.
   */
  readonly lastInitial: string;
}

/** Locale-agnostic grapheme-ish first character: prefers `Intl.Segmenter` (keeps a Devanagari base +
 *  combining marks together) and falls back to the code-point iterator where Segmenter is absent. */
function firstGrapheme(token: string): string {
  const SegmenterCtor = (Intl as unknown as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (typeof SegmenterCtor === 'function') {
    const seg = new SegmenterCtor(undefined, { granularity: 'grapheme' });
    for (const s of seg.segment(token)) return s.segment;
    return '';
  }
  // Fallback: the first code point (spread respects surrogate pairs, though not combining marks).
  return [...token][0] ?? '';
}

/**
 * Split a combined name into a PII-shielded `{ firstName, lastInitial }` (AC2 / D11). Collapses
 * internal whitespace; a single-token name yields an empty `lastInitial`. The caller has already
 * decrypted the Tier-1 envelope; this is pure string work (no clock, no IO). An empty/whitespace-only
 * input yields empty parts — the handler treats that as an unresolvable name and fail-softs the card.
 */
export function splitFirstNameLastInitial(fullName: string): ShieldedName {
  const tokens = fullName.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return { firstName: '', lastInitial: '' };
  const firstName = tokens[0]!;
  if (tokens.length === 1) return { firstName, lastInitial: '' };
  return { firstName, lastInitial: firstGrapheme(tokens[tokens.length - 1]!) };
}
