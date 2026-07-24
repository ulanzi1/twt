// PII-shielding name split — Story 8.2 (Task 2 / D11); RELOCATED here by Story 8.8 (Task 1).
//
// `member_kyc_profiles.nameCiphertext` stores a member's declared name as a SINGLE combined-name
// string (Tier-1 KMS-encrypted). Every member-facing surface that names the DECEASED member surfaces
// only `firstName + lastInitial` (the Story 1.16b PII-scrape rule) — never the full surname.
//
// Story 8.2 colocated this with the apps/api handler under the "sole consumer today" rule
// ([[feedback_no_premature_package]]). Story 8.8 adds a SECOND consumer in a DIFFERENT app — the
// cycle-open notification payload built in `apps/jobs`, which cannot import `apps/api` — so the
// precondition for colocation is gone and the util moves to the domain package that already owns the
// KYC substrate. `apps/api/src/modules/member-pool/name.ts` re-exports it, so no apps/api call site
// changed. This is a PURE move: the implementation is byte-identical to 8.2's.
//
// It runs on ALREADY-DECRYPTED plaintext (the caller owns the Tier-1 decrypt); pure string work, no
// clock, no IO.

/** The two shielded name parts a member-facing surface may carry — a first name + a last INITIAL. */
export interface ShieldedName {
  /** The first whitespace-delimited token of the combined name. */
  readonly firstName: string;
  /**
   * The FIRST grapheme of the LAST token when the name has ≥2 tokens; `''` when the name is a single
   * token (no surname to initialize → the surface shows just the first name). NEVER the full surname.
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
 * Split a combined name into a PII-shielded `{ firstName, lastInitial }`. Collapses internal
 * whitespace; a single-token name yields an empty `lastInitial`. The caller has already decrypted the
 * Tier-1 envelope; this is pure string work (no clock, no IO). An empty/whitespace-only input yields
 * empty parts — the caller treats that as an unresolvable name and fail-softs its surface.
 */
export function splitFirstNameLastInitial(fullName: string): ShieldedName {
  const tokens = fullName.trim().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return { firstName: '', lastInitial: '' };
  const firstName = tokens[0]!;
  if (tokens.length === 1) return { firstName, lastInitial: '' };
  return { firstName, lastInitial: firstGrapheme(tokens[tokens.length - 1]!) };
}
