// ⭐⭐ THE MEMBER'S DRIVE LIST — the two properties that are decidable WITHOUT a database.
// Story 11b.15 (Task 6; AC2, AC8b). DB-free by construction: both subjects are a pure function and a
// declared constant.
//
// ⚠ The route-level behaviour (scoping, `spawned` exclusion over real rows, the `member ≥ public`
// comparison) is proven over LIVE Postgres in
// `apps/api/tests/integration/contributions/member-name-form-parity.spec.ts`. ⛔ Nothing here
// duplicates it — this file covers the two things a live-DB test would prove only INCIDENTALLY, and
// therefore weakly.

import { pool as poolDomain } from '../../src/index.js';
import { describe, expect, it } from 'vitest';

const {
  MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES,
  MEMBER_DRIVE_LIST_PAGE_SIZE_CAP,
  MEMBER_DRIVE_LIST_PAGE_SIZE_DEFAULT,
  SAHYOG_DRIVE_VISIBLE_POOL_STATES,
  POOL_LIFECYCLE_STATES,
  resolveDriveTargetForMembers,
  resolveDriveTargetForPublic,
} = poolDomain;

describe('⭐⭐ AC2 / Trap 2 — this surface owns its visible-state tuple', () => {
  it('⭐ it is `live` · `closed` · `settled`, and ⛔ EXCLUDES `spawned`', () => {
    expect([...MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES]).toEqual(['live', 'closed', 'settled']);
    // ⛔⛔ THE GROUND IS DISCLOSURE, ⛔ NOT TIDINESS: a `spawned` pool follows an APPROVED CLAIM,
    // before contributions open, so listing it would disclose a death and its claim approval to the
    // whole Pariwar earlier than any surface does today.
    expect([...MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES]).not.toContain('spawned');
  });

  it('⛔ it drops EXACTLY ONE lifecycle state — ⛔ no state is silently unaccounted for', () => {
    // ⚠ Driven by the REAL lifecycle tuple, ⛔ not a hand-listed set. A fifth pool state (a
    // `cancelled`/`void`, say) would land here rather than being silently absent from a member's
    // list — which is how a whole class of drive quietly stops existing for the people who paid.
    const dropped = POOL_LIFECYCLE_STATES.filter(
      (s) => !(MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES as readonly string[]).includes(s),
    );
    expect(dropped).toEqual(['spawned']);
  });

  it('⭐⭐ IT IS A SEPARATE VALUE FROM THE PUBLIC TUPLE — ⛔ not the same array', () => {
    // ⚠⛔⛔ THE COINCIDENCE IS THE TRAP. Story 11b.14 (AC1) widened the PUBLIC tuple to the same three
    // words on 2026-09-07, so the two READ identically today — by accident of TWO SEPARATE RULINGS
    // (`2026-09-04-189` cl.2(a) for the public index, `2026-09-04-196` for this list). Either may
    // move alone.
    // ⭐ THIS ASSERTION IS WHAT SURVIVES THE COINCIDENCE: the contents may match, but the two must
    // never be the SAME reference — an `export { X as Y }` or a re-export would make a future
    // public-only widening silently change what a member sees.
    expect([...MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES]).toEqual([...SAHYOG_DRIVE_VISIBLE_POOL_STATES]);
    expect(MEMBER_DRIVE_LIST_VISIBLE_POOL_STATES).not.toBe(SAHYOG_DRIVE_VISIBLE_POOL_STATES);
  });

  it('⭐ the page bounds are this surface’s own, and the default is under the cap', () => {
    expect(MEMBER_DRIVE_LIST_PAGE_SIZE_DEFAULT).toBeLessThanOrEqual(MEMBER_DRIVE_LIST_PAGE_SIZE_CAP);
    expect(MEMBER_DRIVE_LIST_PAGE_SIZE_DEFAULT).toBeGreaterThan(0);
  });
});

describe('⭐⭐ AC8b — `resolveDriveTargetForMembers` reads the MEMBER axis (`-211` cl.2)', () => {
  const ASSIGNED = 20;
  const FIXED = 500;
  const DERIVED = ASSIGNED * FIXED; // ⭐ `assignedCount × fixedAmount` — there is NO setter.

  it('⛔ FAIL-CLOSED: hidden when `revealToMembers` is false — the state at launch', () => {
    expect(
      resolveDriveTargetForMembers(ASSIGNED, FIXED, { revealToMembers: false }),
    ).toBeNull();
  });

  it('⭐ REVEALED: the DERIVED total once `revealToMembers` is true', () => {
    expect(resolveDriveTargetForMembers(ASSIGNED, FIXED, { revealToMembers: true })).toBe(DERIVED);
  });

  it('⭐⭐ IT READS A DIFFERENT AXIS FROM ITS PUBLIC SIBLING — ⛔ the two are NOT interchangeable', () => {
    // ⚠⛔ THE LOAD-BEARING CASE, and the whole content of `-211` cl.2. A Pariwar that has revealed to
    // MEMBERS ONLY is a state `2026-09-04-190` cl.7(c) explicitly authorises ("separately for member
    // and for public") and the DB CHECK explicitly permits. ⇒ on such a Pariwar the MEMBER sees the
    // figure and the PUBLIC does not.
    // ⛔ Had this story read `revealToPublic` — the routing note's literal *"same condition"* — the
    // member switch would have been INERT, which is the precise defect the note was written to
    // surface. This assertion fails the moment anyone "aligns" the two.
    const memberOnly = { revealToMembers: true, revealToPublic: false };
    expect(resolveDriveTargetForMembers(ASSIGNED, FIXED, memberOnly)).toBe(DERIVED);
    expect(resolveDriveTargetForPublic(ASSIGNED, FIXED, memberOnly)).toBeNull();
  });

  it('⭐ public-on IMPLIES member-on ⇒ `-189` cl.3 holds in both directions', () => {
    // ⚠ The DB CHECK `NOT (reveal_to_public AND NOT reveal_to_members)` makes the inverse state
    // unreachable, which is cl.2's second ground: reading the member axis can ⛔ never show a member
    // LESS than the public.
    const both = { revealToMembers: true, revealToPublic: true };
    expect(resolveDriveTargetForMembers(ASSIGNED, FIXED, both)).toBe(DERIVED);
    expect(resolveDriveTargetForPublic(ASSIGNED, FIXED, both)).toBe(DERIVED);
  });

  it('⛔ SILENCE, ⛔ never `0`, for a zero-assignee pool or a non-positive fixed amount', () => {
    // ⭐ No expectation was ever set, so the surface says NOTHING rather than something false.
    // ⚠ `pools.fixed_amount` carries ⛔ no DB positivity CHECK, so the second case is reachable.
    expect(resolveDriveTargetForMembers(0, FIXED, { revealToMembers: true })).toBeNull();
    expect(resolveDriveTargetForMembers(ASSIGNED, 0, { revealToMembers: true })).toBeNull();
    expect(resolveDriveTargetForMembers(ASSIGNED, -1, { revealToMembers: true })).toBeNull();
  });

  it('⛔ SILENCE above the DERIVED ceiling — ⛔ and it is NOT the admin setter’s bound', () => {
    // ⚠⛔ `MAX_DERIVED_DRIVE_TARGET_INR`, ⛔ NOT `MAX_DRIVE_TARGET_INR`. The latter bounds a figure a
    // human TYPED (₹10 crore); this one is a PRODUCT of two independently legitimate values, and
    // ordinary configurations cross ₹10 crore (6,485 assignees × ₹20,000 = ₹12.97 crore). ⭐ The
    // public arm was corrected for exactly this in its THIRD review pass; ⛔ this arm inherits the
    // correction rather than repeating the mistake.
    const ordinaryLargePariwar = resolveDriveTargetForMembers(6_485, 20_000, {
      revealToMembers: true,
    });
    expect(ordinaryLargePariwar).toBe(6_485 * 20_000);

    // Absurd product ⇒ a data anomaly, ⛔ not a real target.
    expect(
      resolveDriveTargetForMembers(1_000_000_000, 1_000_000, { revealToMembers: true }),
    ).toBeNull();
  });

  it('⭐ the two arms agree on EVERY non-axis rule — ⛔ they diverge only on the switch', () => {
    // ⚠ NON-VACUOUS: this is what stops a later edit from "hardening" one arm and leaving the other
    // behind. The axis is the ONLY intended difference between them.
    const cases: ReadonlyArray<readonly [number, number]> = [
      [0, 500],
      [20, 0],
      [20, -1],
      [20, 500],
      [1_000_000_000, 1_000_000],
    ];
    for (const [assigned, fixed] of cases) {
      const member = resolveDriveTargetForMembers(assigned, fixed, { revealToMembers: true });
      const pub = resolveDriveTargetForPublic(assigned, fixed, { revealToPublic: true });
      expect(member, `assigned=${assigned} fixed=${fixed}`).toBe(pub);
    }
  });
});
