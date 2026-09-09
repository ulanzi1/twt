// ⭐⭐ AC3's FLOOR, ENUMERATED — Story 11b.15. *"A member must see MORE than the public, and never
// less"* (`2026-09-04-189` **cl.3**), field by field, against the public index **as it stands**.
//
// ── ⚠⛔ WHY THIS TEST LIVES IN `apps/public` ────────────────────────────────────────────────────
// The FLOOR is `SAHYOG_DRIVE_ROW_FIELD_IDS` (`src/lib/surface-fields.ts`), which is an `apps/public`
// module; the CEILING is `MemberDriveListEntry`, which is `@twt/contracts`. ⭐ This is the ⛔ only
// place both are importable, so it is the only place the comparison can be MECHANICAL. ⛔ Moving it
// to `apps/api` would force the floor to be transcribed — the exact defect the next paragraph names.
//
// ── ⛔⛔ IT ENUMERATES THE LIVE MAP, AND ⛔ NEVER A HAND-COPIED LIST ─────────────────────────────
// ⭐ **THIS IS HOW `2026-09-04-188` SURVIVED**: a comparison against a hand-listed subset agrees with
// itself forever while the surface it claims to measure grows underneath it. ⇒ the floor below is
// READ FROM THE MAP at runtime; adding a field id to the public index without giving it a member
// counterpart fails HERE, on the next run, with the new id named.
//
// ⚠⛔ **AND A TRANSCRIBED *COUNT* IS THE SAME DEFECT, WHICH THIS STORY EXECUTED.** Story 11b.15's own
// prose says the map holds *"13 field ids"*; ⭐ its ENUMERATION lists **14**, and the enumeration is
// the correct one. Two `validate` passes re-checked *"the enumeration, exact match, order and all"*
// and both passed, because only the count WORD was wrong. ⇒ ⛔ this file asserts ⛔ no number.
//
// ── ⭐ WHAT "AT LEAST AS MUCH" MEANS HERE, STATED SO IT IS ⛔ NOT RE-ARGUED IN REVIEW ────────────
// The floor is discharged at the **DATA** layer, ⛔ not at the rendered-STRING layer. Three of the
// public ids (`close_of_cycle_framing`, `drive_participation_line`, `drive_index_line`) are
// **composed sentences** the public index builds from values it already holds; the member row
// carries every INPUT each is composed from, and the member surface presents them in its own
// layout. ⇒ ⛔ the member is shown no less; the two surfaces simply do not share a paragraph.
// ⚠ A future story that gives the member list ITS OWN composed sentence does ⛔ not weaken this —
// but it must ⛔ not remove an input from the mapping below to do it.
//
// ⚠⛔ **[Review][Decision] RESOLVED 2026-09-09, code review of this story — THREE OF THESE INPUTS
// ARE NOW ALSO RENDERED, ⛔ NOT ONLY CARRIED AS DATA.** `closedAt`, `confirmedPercentage` and
// `fundingOutcome` were present on the contract from the start but `DriveRow` never referenced them
// — the Acceptance Auditor found a member saw no close date/outcome framing on a closed drive and
// no progress percentage on a live one, both of which the public index shows for the same drive.
// ⭐ Fixed in `MemberDriveList.tsx`'s `DriveRow` — its own composed sentence for `fundingOutcome`
// (`outcome.*`, `member-drive-list.json`), reusing the SAME Trustee-ratified text the public index's
// `close_of_cycle_framing` composes. ⛔ Pinned by SOURCE-SCAN in
// `apps/mobile/tests/unit/drive-list-render.test.ts`, ⛔ not here — this file has no reason to
// import a mobile component, and the render-side assertion belongs beside the component it checks.
//
// ── ⚠ SCOPE, INHERITED VERBATIM ────────────────────────────────────────────────────────────────
// cl.3 is Trustee-scoped by `2026-09-04-195` **cl.1** to the **drive data class** and the six 11b
// split stories. ⛔ It is ⛔ NOT a universal invariant and must ⛔ not be generalised from this file.

import { MemberDriveListEntry } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import { SAHYOG_DRIVE_ROW_FIELD_IDS } from '../src/lib/surface-fields';

/**
 * ⭐ For every PUBLIC field id, the member-row key(s) that carry at least as much.
 *
 * ⛔⛔ **THIS MAP IS THE ONLY HAND-WRITTEN PART, AND IT IS DELIBERATELY ⛔ NOT THE ENUMERATION.**
 * The set of ids to satisfy is read from `SAHYOG_DRIVE_ROW_FIELD_IDS` below; this map only says HOW
 * each is satisfied. ⇒ a new public field id fails the completeness test until someone adds a row
 * here **and** a field to the contract — ⛔ it can ⛔ not be satisfied by editing one side.
 */
const MEMBER_COUNTERPART: Record<string, readonly string[]> = {
  // ⭐ The deceased family's name, in the Pariwar's CONFIGURED form. ⚠ The member's is strictly
  // MORE: it carries no publication-basis gate (`2026-09-04-198` cl.1), so it renders on drives
  // where the public index names nobody. Proven live in `member-name-form-parity.spec.ts`.
  deceased_member_name: ['deceasedMemberName'],
  pool_letter_code: ['poolLetterCode'],
  pool_canonical_identifier: ['poolCanonicalIdentifier'],
  // ⭐ The public row's link is built from the drive's opaque address token and ⛔ nothing else, so
  // the token IS the href's information content. A member row without it could not reach the drive.
  drive_href: ['publicToken'],
  drive_status: ['status'],
  drive_closed_at: ['closedAt'],
  district: ['district'],
  confirmed_contribution_count: ['confirmedContributionCount'],
  // ⭐ A COMPOSED SENTENCE on the public side, from the close-of-cycle outcome enum. The member row
  // carries the enum itself — the input, un-narrowed.
  close_of_cycle_framing: ['fundingOutcome'],
  // ⚠⛔ NULLABLE BY RULING on `closed`/`settled` rows (`2026-09-08-207` cl.1), and the member row
  // mirrors that exactly. ⇒ a public `null` is *"nothing to match"*, ⛔ never a missing member field.
  drive_progress_percentage: ['confirmedPercentage'],
  // ⭐ COMPOSED from the confirmed count and the money figure — both present on the member row.
  drive_participation_line: ['confirmedContributionCount', 'amountRaisedInr'],
  // ⭐⭐ लक्ष्य. ⚠ The public gate is `reveal_to_public`, the member's is `reveal_to_members`
  // (`#decision-2026-09-09-211` cl.2) — and the DB CHECK makes public-on IMPLY member-on, so the
  // member can ⛔ never have less here. That implication is the whole of cl.2's second ground.
  drive_target: ['driveTargetInr'],
  // ⭐ Trustee-ratified `2026-09-07-205` cl.1, `pii_tier: 1`. A NAME is ⛔ not a banking coordinate,
  // so Trap 5's exclusion does ⛔ not reach it and cl.3 makes it a floor.
  nominee_account_holder_name: ['nomineeName'],
  // ⭐ COMPOSED from the money figure, the nominee, the family and the district — all four present.
  drive_index_line: ['amountRaisedInr', 'nomineeName', 'deceasedMemberName', 'district'],
};

/** The public floor, READ FROM THE LIVE MAP. `null` entries are a11y annotations, ⛔ not fields. */
const PUBLIC_FIELD_IDS: string[] = Object.values(SAHYOG_DRIVE_ROW_FIELD_IDS).filter(
  (id): id is string => id !== null,
);

/** The member row's own keys, READ FROM THE LIVE CONTRACT. */
const MEMBER_KEYS = new Set(Object.keys(MemberDriveListEntry.shape));

describe('⭐⭐ Story 11b.15 AC3 — the member drive list meets the PUBLIC index field floor', () => {
  it('⛔ the floor is NON-EMPTY and read from the live map (⛔ the anti-vacuity guard)', () => {
    // ⛔ Without this, a refactor that renamed or emptied the map would make every assertion below
    // pass over an empty set — green, and proving nothing.
    expect(PUBLIC_FIELD_IDS.length).toBeGreaterThan(10);
    expect(PUBLIC_FIELD_IDS).toContain('deceased_member_name');
    // ⭐ The five story D added post-authoring — the ids the story's own floor grew by.
    expect(PUBLIC_FIELD_IDS).toContain('nominee_account_holder_name');
    expect(PUBLIC_FIELD_IDS).toContain('drive_target');
    expect(PUBLIC_FIELD_IDS).toContain('drive_progress_percentage');
    expect(PUBLIC_FIELD_IDS).toContain('drive_participation_line');
    expect(PUBLIC_FIELD_IDS).toContain('drive_index_line');
  });

  it('⭐⭐ EVERY public field id has a declared member counterpart — ⛔ no id may be unmapped', () => {
    const unmapped = PUBLIC_FIELD_IDS.filter((id) => MEMBER_COUNTERPART[id] === undefined);
    expect(
      unmapped,
      `the public index grew field id(s) with no member counterpart — the member now sees LESS than ` +
        `the public on the drive data class (2026-09-04-189 cl.3). Add the field to ` +
        `MemberDriveListEntry AND a row to MEMBER_COUNTERPART: ${unmapped.join(', ')}`,
    ).toEqual([]);
  });

  it('⭐⭐ EVERY counterpart key EXISTS on the member contract — ⛔ the mapping cannot lie', () => {
    // ⚠ This is what stops the map above from being decorative: a row naming a key the contract does
    // ⛔ not have would otherwise "satisfy" a floor the wire never carries.
    const missing: string[] = [];
    for (const [publicId, keys] of Object.entries(MEMBER_COUNTERPART)) {
      for (const key of keys) {
        if (!MEMBER_KEYS.has(key)) missing.push(`${publicId} → ${key}`);
      }
    }
    expect(missing, `member contract is missing declared counterpart key(s): ${missing.join(', ')}`).toEqual(
      [],
    );
  });

  it('⛔ the mapping declares no counterpart for an id the public index does NOT have', () => {
    // ⭐ The converse guard. A stale row here would silently keep a REMOVED public field alive as a
    // member obligation, and the next author would carry a floor the Panel had already lowered.
    const stale = Object.keys(MEMBER_COUNTERPART).filter((id) => !PUBLIC_FIELD_IDS.includes(id));
    expect(stale, `MEMBER_COUNTERPART names id(s) absent from the public index: ${stale.join(', ')}`).toEqual(
      [],
    );
  });

  it('⛔ AC8 — the member row carries NO banking coordinate beyond the nominee NAME', () => {
    // ⚠⛔ `2026-09-04-190` cl.3's *"complete banking information"* is a PER-DRIVE view and belongs to
    // story **F** (`11b-17`). ⭐ A NAME is not a coordinate; an account number is.
    // ⛔ A `.strict()` contract already refuses unknown keys — this asserts the DECLARED shape, which
    // is the half `.strict()` cannot check.
    for (const banned of [
      'accountNumber',
      'accountNumberLast4',
      'ifsc',
      'vpa',
      'bankName',
      'branchName',
      'nomineeVpa',
    ]) {
      expect(MEMBER_KEYS.has(banned), `banking coordinate \`${banned}\` on the member drive row`).toBe(
        false,
      );
    }
  });

  it('⛔ AC8 — the member row carries NO contributor identity and NO per-member amount', () => {
    for (const banned of ['contributors', 'contributorNames', 'myContribution', 'memberId']) {
      expect(MEMBER_KEYS.has(banned), `\`${banned}\` on the member drive row`).toBe(false);
    }
  });
});
