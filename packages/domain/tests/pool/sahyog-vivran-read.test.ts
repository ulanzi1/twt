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

  it('⭐⛔ COVERS the index’s predicate, and ⛔ is not the same array', () => {
    // ⛔ TWO SURFACES, TWO PREDICATES, DELIBERATELY.
    //
    // ⚠⛔⛔ **NARROWED 2026-09-07 (Story 11b.14, AC1) — ⛔ NOT DELETED, and the prior property is
    // NAMED** ([[feedback_supersede_never_reinterpret]]). This test asserted the index predicate was
    // **STRICTLY NARROWER**: `SAHYOG_VIVRAN.length > SAHYOG_DRIVE.length` and
    // `SAHYOG_DRIVE not.toContain('live')`. ⛔ Both went FALSE BY DESIGN when `2026-09-04-189` cl.2
    // (Trustee-ratified, recorded at `2026-09-07-204`) ruled that a **collecting drive IS LISTED** on
    // the index. ⇒ the two predicates now hold the SAME THREE STATES.
    //
    // ⭐⭐ **THE HALF THAT WAS ACTUALLY LOAD-BEARING SURVIVES INTACT AND IS WHAT STAYS PINNED:** the
    // vivran tuple is **DECLARED LOCALLY** and is ⛔ never the index's array. Equal membership is
    // precisely when a future edit is most tempted to "unify" them by importing one into the other —
    // ⛔ which would re-fuse two surfaces whose predicates are ruled independently and may diverge
    // again (`sahyog-vivran-read.ts`'s own doc-block says so). ⇒ the reference check is now the
    // ⭐ STRONGER assertion, ⛔ not the weaker one.
    for (const s of SAHYOG_DRIVE_VISIBLE_POOL_STATES) {
      expect(SAHYOG_VIVRAN_VISIBLE_POOL_STATES).toContain(s);
    }
    expect(SAHYOG_VIVRAN_VISIBLE_POOL_STATES).toContain('live');
    expect(SAHYOG_VIVRAN_VISIBLE_POOL_STATES as readonly string[]).not.toBe(
      SAHYOG_DRIVE_VISIBLE_POOL_STATES as readonly string[],
    );
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
    // ⚠ Story 11b.12 **D1(b)**: the ruled public words are **Live · Closed · Verified** and the
    // WIRE is aligned to them. ⛔ This tuple read `['collecting', 'active', 'archive']` before.
    expect([...SAHYOG_VIVRAN_STATUSES]).toEqual(['live', 'closed', 'verified']);
  });

  it('⛔⛔ leaks NO ⛔ UN-RULED internal lifecycle word onto the public wire', () => {
    // ⭐⭐ AN **ALLOW-LIST**, ⛔ NOT A DENY-LIST — Story 11b.12 **D1(b)**, and STRICTLY STRONGER than
    // the blanket deny it replaces: it pins what IS permitted, then denies everything else.
    //
    // ⚠⛔ WHY THE SHAPE HAD TO CHANGE, so nobody "fixes" it back. `2026-08-21-144` cl.8 records
    // `/members` having leaked the internal `lock-in` value onto a public JSON route, and this
    // assertion used to read *"⛔ NO `POOL_LIFECYCLE_STATES` member appears in
    // `SAHYOG_VIVRAN_STATUSES`"*. Since D1(b) **`live` and `closed` are in BOTH sets, deliberately**
    // — the ruled public word and the internal state name coincide. ⭐ That coincidence is RULED,
    // ⛔ not a leak; the property cl.8 actually protects is *no **UN-RULED** internal vocabulary
    // crosses*, ⛔ not *"these particular strings never appear"*.
    // ⚠⛔ ⛔ Do ⛔ NOT repair this by deleting the loop or excepting two words by hand — D1 rules the
    // SHAPE, and it applies identically at all nine sites.
    const ruled = new Set<string>(SAHYOG_VIVRAN_STATUSES);
    const unruled = POOL_LIFECYCLE_STATES.filter((st) => !ruled.has(st));
    // ⛔ NON-VACUOUS: `spawned` is a PURE DENY — an internal state with ⛔ no public token at all.
    expect(unruled).toContain('spawned');
    for (const internal of unruled) {
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
