// The per-claim Sahyog Vivran read's DB-FREE invariants — Story 11b.3 (Task 2/5; AC1, AC3, AC5).
//
// ⭐ WHAT THIS FILE PINS is the set of properties that are decided by DECLARATIONS rather than by
// SQL: the visible-drive predicate, the public vocabulary, and the two lockstep couplings that would
// otherwise drift silently. The query itself is exercised by the live-DB spec.

import { describe, expect, it } from 'vitest';

import { appealDispositionCategorySchema } from '../../src/claim/events.js';
import {
  SAHYOG_VIVRAN_DISPOSITION_CATEGORIES,
  SAHYOG_VIVRAN_STATUSES,
  SAHYOG_VIVRAN_VISIBLE_POOL_STATES,
} from '../../src/pool/sahyog-vivran-read.js';
import { SAHYOG_DRIVE_VISIBLE_POOL_STATES } from '../../src/pool/public-read.js';
import { POOL_LIFECYCLE_STATES } from '../../src/pool/state.js';

describe('the visible-drive predicate (D4(b), `2026-09-02-176`)', () => {
  it('⭐ is `live` + `closed` + `settled` — the ruled tuple, exactly', () => {
    expect([...SAHYOG_VIVRAN_VISIBLE_POOL_STATES]).toEqual(['live', 'closed', 'settled']);
  });

  it('⭐⛔ is STRICTLY WIDER than the INDEX’s, and ⛔ is not the same array', () => {
    // ⛔ TWO SURFACES, TWO PREDICATES, DELIBERATELY. The index refuses a drive that is still
    // collecting — that is an open solicitation, not a transparency record. This per-claim page
    // admits it because Story 11b.3a's entire subject is the ACTIVE campaign, and widening the
    // predicate in the story that ADDS the Tier-1 bank fields would have been the worse ordering.
    // ⚠ THE NEGATIVE HALF IS THE POINT: if a future edit "unified" the two by importing the index's
    // constant here, this fails — which is the whole reason the tuple is declared locally.
    for (const s of SAHYOG_DRIVE_VISIBLE_POOL_STATES) {
      expect(SAHYOG_VIVRAN_VISIBLE_POOL_STATES).toContain(s);
    }
    expect(SAHYOG_VIVRAN_VISIBLE_POOL_STATES.length).toBeGreaterThan(
      SAHYOG_DRIVE_VISIBLE_POOL_STATES.length,
    );
    expect(SAHYOG_VIVRAN_VISIBLE_POOL_STATES).toContain('live');
    expect([...SAHYOG_DRIVE_VISIBLE_POOL_STATES]).not.toContain('live');
  });

  it('⛔ EXCLUDES `spawned` — a pool that never opened has no drive to tell', () => {
    expect([...SAHYOG_VIVRAN_VISIBLE_POOL_STATES]).not.toContain('spawned');
  });

  it('names only REAL lifecycle states — ⛔ a typo here would silently show nothing', () => {
    for (const s of SAHYOG_VIVRAN_VISIBLE_POOL_STATES) {
      expect(POOL_LIFECYCLE_STATES).toContain(s);
    }
  });
});

describe('the PUBLIC vocabulary', () => {
  it('⭐ is THREE labels — ⛔ not the index’s two, because D4(b) admits `live`', () => {
    expect([...SAHYOG_VIVRAN_STATUSES]).toEqual(['collecting', 'active', 'archive']);
  });

  it('⛔⛔ leaks NO internal lifecycle word onto the public wire', () => {
    // `2026-08-21-144` cl.8 records `/members` having leaked the internal `lock-in` value onto a
    // public JSON route. ⚠ NOTE `active` and `archive` are PUBLIC words that happen to describe
    // `closed` and `settled`; what must never appear is an INTERNAL token.
    for (const internal of POOL_LIFECYCLE_STATES) {
      expect([...SAHYOG_VIVRAN_STATUSES]).not.toContain(internal);
    }
  });

  it('covers every visible state — ⛔ a state with no public label would render blank', () => {
    expect(SAHYOG_VIVRAN_STATUSES.length).toBe(SAHYOG_VIVRAN_VISIBLE_POOL_STATES.length);
  });
});

describe('⭐⭐ the disposition-category LOCKSTEP (the coupling that would otherwise drift silently)', () => {
  it('is value-identical to `claim/events.ts`’s `appealDispositionCategorySchema`', () => {
    // ⚠⛔ THE TUPLE IS DECLARED LOCALLY IN `sahyog-vivran-read.ts` RATHER THAN IMPORTED, and that is
    // deliberate: pulling a VALUE out of `claim/events.ts` from a `pool/` read materializes a
    // module-init cycle that breaks CONSUMING packages at runtime while typecheck, lint and local
    // tests all stay green. `claim/events.ts` itself declares the list inline for the identical
    // reason. ⭐ THIS TEST IS THE LOCKSTEP — the import edge lives HERE, where a cycle costs nothing.
    expect([...SAHYOG_VIVRAN_DISPOSITION_CATEGORIES].sort()).toEqual(
      [...appealDispositionCategorySchema.options].sort(),
    );
  });

  it('⛔ is BOUNDED — the bound is what keeps free text off a public page', () => {
    // An unrecognised tag drops the WHOLE lineage rather than rendering raw. ⭐ That is not defensive
    // typing: `claim.reversed` is the PUBLISH SIGNAL, and its disposition tag is the only thing about
    // an appeal's substance that may ever be public. A raw echo is how free text would arrive.
    expect(SAHYOG_VIVRAN_DISPOSITION_CATEGORIES.length).toBe(3);
    for (const c of SAHYOG_VIVRAN_DISPOSITION_CATEGORIES) {
      expect(typeof c).toBe('string');
      expect(c).not.toMatch(/\s/);
    }
  });
});
