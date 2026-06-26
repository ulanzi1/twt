// 75/25 nominee-split derivation — Story 3.4 (Task 6; AC1, R5(E), R4).
//
// SERVER-AUTHORITATIVE split: derived PURELY from the nominee COUNT, never from a client-
// supplied percentage (R4 — accepting a client value invites a bypass of the "no override"
// rule). 1 nominee → sole (100%); 2 nominees → primary 75% / secondary 25%. A pure function
// (no I/O) so the handler computes the split deterministically and the domain unit test
// exercises it DB-free. The handler stamps the returned rank/splitPct onto the encrypted
// rows + the non-PII event payload.

/** The split-shape label carried in the `member.nominees_declared` event payload. */
export type NomineeSplitLabel = 'sole' | '75-25';

/** A single nominee's server-stamped rank + split percentage. */
export interface NomineeSplitRank {
  rank: 1 | 2;
  splitPct: 100 | 75 | 25;
}

export interface DerivedNomineeSplit {
  /** `sole` for one nominee; `75-25` for two. */
  split: NomineeSplitLabel;
  /** Per-nominee rank + splitPct, in rank order. */
  ranks: readonly NomineeSplitRank[];
}

/**
 * Derive the fixed split from the nominee count. Throws `RangeError` for any count other
 * than 1 or 2 (defense-in-depth — the transport contract already bounds it to 1..2, so the
 * handler never reaches this in normal operation; it maps the 1..2 violation to a 400).
 */
export function deriveNomineeSplit(count: number): DerivedNomineeSplit {
  if (count === 1) {
    return { split: 'sole', ranks: [{ rank: 1, splitPct: 100 }] };
  }
  if (count === 2) {
    return {
      split: '75-25',
      ranks: [
        { rank: 1, splitPct: 75 },
        { rank: 2, splitPct: 25 },
      ],
    };
  }
  throw new RangeError(`[deriveNomineeSplit] nominee count must be 1 or 2, got ${count}`);
}
