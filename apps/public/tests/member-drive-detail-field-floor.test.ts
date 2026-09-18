// ⭐⭐ **`member ≥ public` ON THE DRIVE *DETAIL* — Story 11b.17 (Task 6; AC2).**
//
// `2026-09-04-189` **cl.3**: *"a member must see MORE than the public, and never less."*
// ⇒ every field the PUBLIC Sahyog Vivran **DETAIL** page renders for a drive has a counterpart on
// the member's detail response. ⭐ The set of ids to satisfy is read **PROGRAMMATICALLY FROM THE LIVE
// MAPS**, ⛔ never from a transcribed list, and ⛔ **never by asserting a COUNT** (story E's
// *"13 vs 14"* defect — the ENUMERATION was right and the count WORD was wrong, which is why two
// `validate` passes both missed it; [[project_live_db_test_gotchas]]).
//
// ── ⚠⛔⛔ AGAINST THE RIGHT MAPS — ⛔ **NOT** STORY E's ────────────────────────────────────────────
// This is the **DETAIL**, so the floor is **`SAHYOG_VIVRAN_FIELD_IDS`** ∪
// **`SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS`**, which are **deliberately split** (the container key
// `nomineeAccounts` has no tier of its own; its ELEMENT attributes are the classified fields).
// ⛔ Story E's test reads `SAHYOG_DRIVE_ROW_FIELD_IDS` — the **INDEX** map. ⭐ Copying it would prove
// ⛔ nothing about this surface, and this file asserts the two are genuinely different sets so the
// mistake cannot be made silently.
//
// ── ⚠⛔ SCOPE, INHERITED VERBATIM ───────────────────────────────────────────────────────────────
// cl.3 is Trustee-scoped by `2026-09-04-195` **cl.1** to the **drive data class** and the six 11b
// split stories. ⛔ It is ⛔ NOT a universal invariant and must ⛔ not be generalised from this file.

import { MemberDriveDetailResponse, MemberDriveNomineeAccountView } from '@twt/contracts';
import { describe, expect, it } from 'vitest';

import {
  SAHYOG_DRIVE_ROW_FIELD_IDS,
  SAHYOG_VIVRAN_FIELD_IDS,
  SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS,
} from '../src/lib/surface-fields';

/**
 * ⭐ For every PUBLIC **DETAIL** field id, the member-response key(s) that carry at least as much.
 *
 * ⛔⛔ **THIS MAP IS THE ONLY HAND-WRITTEN PART, AND IT IS DELIBERATELY ⛔ NOT THE ENUMERATION.** The
 * set of ids to satisfy is read from the two live maps below; this map only says **HOW** each is
 * satisfied. ⇒ a new public field id fails the completeness test until someone adds a row here **and**
 * a field to the contract — ⛔ it can ⛔ not be satisfied by editing one side.
 */
const MEMBER_COUNTERPART: Record<string, readonly string[]> = {
  pool_letter_code: ['poolLetterCode'],
  pool_canonical_identifier: ['poolCanonicalIdentifier'],
  drive_status: ['status'],
  drive_closed_at: ['closedAt'],
  district: ['district'],
  confirmed_contribution_count: ['confirmedContributionCount'],
  // ⭐⭐ Story 11b.3b (AC3b) — the public drive page gains the ruled rupee figure, and the member
  // detail ALREADY carries it under the same key (`member-drive-detail.ts`). ⇒ ⭐ the `-189` cl.3 /
  // `-195` cl.1 floor holds for this field with ⛔ nothing to build: member ⩾ public, same figure.
  amount_raised_inr: ['amountRaisedInr'],
  // ⭐⭐ Story 11b.3b (Task 2 unit 2) — THE DECEASED MEMBER'S NAME REACHES THE PUBLIC DETAIL, so it
  // ENTERS this floor for the first time. ⭐ The member side already carries it and carries MORE:
  // the member's name is gated on the FORM only (`2026-09-04-198` cl.1) while the public one is
  // additionally gated on the publication BASIS, which is PROVISIONING-INERT (`-209` cl.2) ⇒ on a
  // default `full_name` Pariwar a member sees a name nobody can see publicly.
  // ⇒ ⭐ member **>** public, in the direction `2026-09-04-189` cl.3 / `2026-09-04-195` cl.1 require.
  // ⚠⛔ THE TWO RESOLVERS ⛔ MUST ⛔ NOT BE "ALIGNED": the member side uses
  // `resolveMemberFacingDeceasedName` because `resolvePublicMemberName` fails CLOSED on a mononym
  // under `shielded_name` — reusing it there would DROP A MEMBER'S OWN DRIVE.
  deceased_member_name: ['deceasedMemberName'],
  // ⭐ A COMPOSED SENTENCE on the public side, from the close-of-cycle outcome enum. The member
  // response carries the enum ITSELF — the input, un-narrowed. ⇒ strictly MORE.
  close_of_cycle_framing: ['fundingOutcome'],
  // ⚠⛔⛔ **THE APPEAL LINEAGE IS THE ONE PUBLIC FIELD SET THIS SURFACE DOES ⛔ NOT CARRY, AND THAT IS
  // A GAP — ⛔ NOT AN EXCLUSION, AND ⛔ NOT SILENTLY ABSORBED.** See the dedicated test below: the
  // three ids are mapped here to `null` so the COMPLETENESS test still passes over a DECLARED state,
  // and the gap is then asserted EXPLICITLY with its reason. ⛔ Do ⛔ not delete these rows to make
  // the map look clean — that would hide a real `-189` cl.3 shortfall.
  appeal_reversal_stage: [],
  appeal_disposition_category: [],
  appeal_reversal_at: [],
  // ⭐⭐ THE FIELD THIS WHOLE STORY EXISTS FOR — and on the public side, since story **A**, it is the
  // ⛔ ONLY classified field left on a nominee-account row (`2026-09-04-190` cl.2). ⚠⛔ The member
  // side carries it **AND FOUR MORE** the public no longer has.
  nominee_account_holder_name: ['nomineeName', 'nomineeAccounts'],
};

/** The public DETAIL floor, READ FROM THE LIVE MAPS. `null` entries are selectors/containers, ⛔ not fields. */
const PUBLIC_DETAIL_FIELD_IDS: string[] = [
  ...Object.values(SAHYOG_VIVRAN_FIELD_IDS),
  ...Object.values(SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS),
].filter((id): id is string => id !== null);

/** The member response's own keys, READ FROM THE LIVE CONTRACT. */
const MEMBER_KEYS = new Set(Object.keys(MemberDriveDetailResponse.shape));
const ACCOUNT_KEYS = new Set(Object.keys(MemberDriveNomineeAccountView.shape));

describe('⭐⭐ Story 11b.17 AC2 — the member drive DETAIL meets the PUBLIC Sahyog Vivran field floor', () => {
  it('⛔ the floor is NON-EMPTY and read from the LIVE maps (⛔ the anti-vacuity guard)', () => {
    // ⛔ Without this, a refactor that renamed or emptied either map would make every assertion below
    // pass over an empty set — green, and proving ⛔ nothing
    // ([[feedback_gate_scope_semantic_coverage]]).
    expect(PUBLIC_DETAIL_FIELD_IDS.length).toBeGreaterThan(8);
    expect(PUBLIC_DETAIL_FIELD_IDS).toContain('pool_canonical_identifier');
    expect(PUBLIC_DETAIL_FIELD_IDS).toContain('nominee_account_holder_name');
    expect(MEMBER_KEYS.size).toBeGreaterThan(8);
  });

  it('⛔⛔ the DETAIL floor is ⛔ NOT the INDEX floor — ⭐ copying story E\'s map proves NOTHING here', () => {
    // ⚠⛔ AC2 forbids measuring this surface against `SAHYOG_DRIVE_ROW_FIELD_IDS` by name. ⭐ Asserted
    // rather than merely commented, so a later author who "unifies" the two tests fails HERE instead
    // of silently measuring the detail against the index.
    const indexIds = new Set(
      Object.values(SAHYOG_DRIVE_ROW_FIELD_IDS).filter((id): id is string => id !== null),
    );
    const detailOnly = PUBLIC_DETAIL_FIELD_IDS.filter((id) => !indexIds.has(id));
    expect(detailOnly.length).toBeGreaterThan(0);
    // ⭐ The appeal lineage is the clearest example: it exists on the DETAIL and ⛔ nowhere on the index.
    expect(detailOnly).toContain('appeal_reversal_stage');
  });

  it('⭐⭐ EVERY public DETAIL field id has a DECLARED member counterpart — ⛔ no id may be unmapped', () => {
    const unmapped = PUBLIC_DETAIL_FIELD_IDS.filter((id) => MEMBER_COUNTERPART[id] === undefined);
    expect(
      unmapped,
      'the public Sahyog Vivran page grew field id(s) with ⛔ no member counterpart — the member now ' +
        'sees LESS than the public on the drive data class (2026-09-04-189 cl.3). Add the field to ' +
        `MemberDriveDetailResponse AND a row to MEMBER_COUNTERPART: ${unmapped.join(', ')}`,
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
    expect(missing, `member contract is missing declared counterpart key(s): ${missing.join(', ')}`).toEqual([]);
  });

  it('⛔ the mapping declares ⛔ no counterpart for an id the public DETAIL does NOT have', () => {
    // ⭐ The converse guard. A stale row would silently keep a REMOVED public field alive as a member
    // obligation, and the next author would carry a floor the Panel had already lowered.
    const stale = Object.keys(MEMBER_COUNTERPART).filter(
      (id) => !PUBLIC_DETAIL_FIELD_IDS.includes(id),
    );
    expect(stale, `MEMBER_COUNTERPART names id(s) the public detail no longer renders: ${stale.join(', ')}`).toEqual([]);
  });

  it('⛔⛔ THE NOMINEE NAME IS ⛔ NOT AN EXCLUSION — ⭐ IT IS COMPARED, and that is deliberate', () => {
    // ⚠⛔⛔ **A CARVE-OUT HERE WOULD SUPPRESS A REAL FAILURE** on the one field this whole story exists
    // to surface. ⭐ The nominee's name carries ⛔ **NO GATE** and that is **RULED**: `-190` cl.2
    // published it, and `2026-09-07-205` **cl.9** is a SCOPE-NEGATION — *"nobody has ruled a
    // narrowing"* — which is ⛔ **not** the same as *"the absence is ruled"*, but the operative
    // consequence is the same. ⇒ the two surfaces are **SYMMETRIC** on this field.
    expect(MEMBER_COUNTERPART['nominee_account_holder_name']).toContain('nomineeName');
    expect(MEMBER_KEYS.has('nomineeName')).toBe(true);
  });

  it('⭐⭐ THE MEMBER CARRIES **FOUR MORE** COORDINATE FIELDS THAN THE PUBLIC — cl.3, in the direction it points', () => {
    // ⭐ Story **A** (`11b-11`) withdrew the banking coordinates from the public surface ENTIRELY
    // (`-190` cl.1): `SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS` now carries `nominee_account_holder_name`
    // and ⛔ NOTHING else. ⇒ ⭐ *member ≥ public* is satisfied on banking **BY CONSTRUCTION** — a member
    // ⛔ cannot see *"less than nothing"* — and THIS story is what makes `-190` **cl.3** true.
    const publicAccountIds = Object.values(SAHYOG_VIVRAN_NOMINEE_ACCOUNT_FIELD_IDS).filter(
      (id): id is string => id !== null,
    );
    expect(publicAccountIds).toEqual(['nominee_account_holder_name']);
    // ⭐ FIVE on the member side: holder name · account number · IFSC · bank · branch.
    expect([...ACCOUNT_KEYS].sort()).toEqual(
      ['accountHolderName', 'accountNumber', 'bankName', 'branch', 'ifsc', 'rank'].sort(),
    );
    // ⛔⛔ AND ⛔ NO `vpa`, ON ⛔ ANY DRIVE, IN ⛔ ANY STAGE — `2026-09-10-212` **cl.2** ruled the UPI ID
    // onto the PAYMENT screen (story `8-17`, `done`), ⛔ not here.
    expect(ACCOUNT_KEYS.has('vpa')).toBe(false);
    expect(ACCOUNT_KEYS.has('vpaPresent')).toBe(false);
  });

  it('⚠⛔ THE EXCLUSIONS ARE EXACTLY ONE — and ⛔ `confirmedPercentage` is ⛔ NOT one of them', () => {
    // ⚠⛔⛔ **THIS TEST WAS NAMED *"THE THREE EXCLUSIONS ARE EXACTLY THREE"* AND ENUMERATED **TWO** —
    // (a), (b), and a **(c) that is a NEGATION, ⛔ not an exclusion**** (review finding, 2026-09-14).
    // ⭐ That is the ⛔ exact defect class this file's own header forbids BY NAME: *"⛔ never by
    // asserting a COUNT (story E's '13 vs 14' defect — the ENUMERATION was right and the count WORD
    // was wrong)"* ⇒ the file reproduced the defect it opens by prohibiting.
    // ⛔⛔ **AND THE COUNT WAS LOAD-BEARING**: the appeal-lineage test below reasoned *"AC2 names
    // exactly THREE, and this is ⛔ not one of them."* ⚠ Traced 2026-09-14: **AC2 names ⛔ NO
    // EXCLUSIONS AT ALL** — it states a FLOOR (*"the nominee's name, the drive facts, the stage, the
    // contributor count **and the appeal outcome**"*). ⇒ ⭐ the conclusion there is RIGHT and its
    // stated ground was WRONG — and the TRUE ground is STRONGER. Corrected below.
    // ⭐ **(a) लक्ष्य** — a member-side **ADDITION** (D2(B)). The public **DETAIL** renders ⛔ no target
    // in ⛔ ANY stage ⇒ it is in ⛔ NEITHER floor map, and the superset claim ⛔ cannot cover it. ⛔ Do
    // ⛔ not write it as one.
    expect(PUBLIC_DETAIL_FIELD_IDS).not.toContain('drive_target');
    expect(MEMBER_KEYS.has('driveTargetInr')).toBe(true);

    // ⚠⛔⛔ **(b) IS SPENT — SUPERSEDED 2026-09-15 BY STORY 11b.3b (Task 2 unit 2). ⛔ THE PRIOR LEG
    // IS KEPT HERE AS THE RECORD AND ⛔ NOT REWRITTEN** ([[feedback_supersede_never_reinterpret]]).
    // It read: *"**(b) the DECEASED member's name** — its public gate is PROVISIONING-INERT
    // (`SAHYOG_DRIVE_PUBLICATION_CLAUSE_ID` occurs at exactly ONE site in the repo: its own
    // definition — ⛔ no migration, ⛔ no seed, ⛔ no admin mint path ⇒ ⛔ no writer), so on a default
    // `full_name` Pariwar a member already sees a name ⛔ nobody can see publicly (`-209` cl.2) …
    // and the public DETAIL does ⛔ not carry the field at all, which is why it is absent from the
    // floor"*, asserting `PUBLIC_DETAIL_FIELD_IDS` did ⛔ NOT contain it.
    // ⛔⛔ **THAT LAST HALF IS THE HALF THAT EXPIRED, ⛔ not the reasoning.** `2026-09-02-173`
    // (Trustee Panel) ruled the name onto the public drive page and 11b.3b renders it ⇒ the field IS
    // in the floor now, and it is SATISFIED by the member's own `deceasedMemberName` (see the
    // counterpart map). ⛔ It is ⛔ no longer an exclusion, so it must ⛔ not be asserted as one.
    // ⭐⭐ **AND THE INERT-GATE ASYMMETRY SURVIVES UNCHANGED AND NOW RUNS *THROUGH* THE FLOOR RATHER
    // THAN AROUND IT** — the public name is gated on the publication BASIS as well as the form, so
    // the member sees **strictly more**, which is the direction `-189` cl.3 / `-195` cl.1 require.
    // ⇒ ⭐ the comparison passing is the invariant HOLDING, ⛔ not a carve-out hiding a shortfall.
    expect(PUBLIC_DETAIL_FIELD_IDS).toContain('deceased_member_name');
    expect(MEMBER_KEYS.has('deceasedMemberName')).toBe(true);

    // ⭐ **(c) ⛔ NOTHING ELSE.** ⚠⛔⛔ `confirmedPercentage` / `driveProgressPercentage` is in
    // **NEITHER** floor map — it lives ⛔ **ONLY** in `SAHYOG_DRIVE_ROW_FIELD_IDS`, the **INDEX** map
    // this AC forbids ⇒ ⛔ the old *"two fields"* carve-out (which named one) was **VACUOUS against
    // the stated floor**, and ⛔ it must ⛔ not be reinstated.
    expect(PUBLIC_DETAIL_FIELD_IDS).not.toContain('drive_progress_percentage');
    // ⭐ `SAHYOG_VIVRAN_FIELD_IDS`'s count field is `confirmed_contribution_count`, ⛔ and there is
    // ⛔ no percentage field on that map AT ALL.
    expect(Object.values(SAHYOG_VIVRAN_FIELD_IDS)).toContain('confirmed_contribution_count');
    expect(Object.values(SAHYOG_VIVRAN_FIELD_IDS).join(',')).not.toContain('percentage');
  });

  it('⚠⛔⛔ THE APPEAL LINEAGE IS A DECLARED GAP — ⛔ RECORDED, ⛔ not silently absorbed', () => {
    // ⚠⛔ **STATED HONESTLY RATHER THAN CARVED OUT** ([[feedback_record_unattested_no_backfill]]). The
    // public Sahyog Vivran DETAIL renders a *"Reversed by appeal"* lineage — three field ids — and
    // ⭐ this member surface does ⛔ **NOT** carry them.
    // ⛔ It is ⛔ **NOT** an exclusion AC2 authorises.
    // ⚠⛔⛔ **AND THE GROUND IS ⛔ NOT A COUNT** (corrected 2026-09-14). This previously read *"AC2
    // names exactly THREE, and this is ⛔ not one of them"* — ⛔ **AC2 names ⛔ NO exclusions at all**,
    // so that argument rested on a number AC2 never states ([[feedback_negative_claims_checkable_in_repo]]).
    // ⭐⭐ **THE REAL GROUND IS STRONGER AND IS AC2'S OWN TEXT:** the floor is *"the nominee's name,
    // the drive facts, the stage, the contributor count **and the appeal outcome**"* ⇒ AC2 does ⛔ not
    // merely fail to authorise this exclusion — it **EXPRESSLY REQUIRES THE FIELD**. ⇒ ⭐ it is a **`-189` cl.3 SHORTFALL**, and the honest word is that it is **RECORDED**,
    // ⛔ not *"resolved"* and ⛔ not *"closed"* ([[feedback_closure_language_precision]]).
    // ⭐ **WHY IT IS RECORDED RATHER THAN BUILT HERE:** the lineage is derived at request time by
    // `readAppealReversal`, a SEPARATE single-row query over the claim's own `claim.reversed` event
    // stream. Adding it is a real read, a real contract widening and a real disclosure question about
    // a DENIED-then-reversed claim on a member surface — ⛔ none of which `-199`, `-212` or `-213`
    // ruled on. ⛔ Inventing that scope here would be exactly the *"absorbed rather than named"*
    // failure Trap 3 forbids.
    // ⭐ **Routed** to `deferred-work.md` under this story's Task 6, with its trigger.
    for (const id of ['appeal_reversal_stage', 'appeal_disposition_category', 'appeal_reversal_at']) {
      expect(PUBLIC_DETAIL_FIELD_IDS).toContain(id);
      expect(MEMBER_COUNTERPART[id]).toEqual([]);
    }
    // ⭐ AND THE GAP IS BOUNDED: it is these THREE ids and ⛔ no others. ⚠ A fourth appearing with an
    // empty counterpart would mean a later author widened the gap silently.
    const declaredGaps = Object.entries(MEMBER_COUNTERPART)
      .filter(([, keys]) => keys.length === 0)
      .map(([id]) => id)
      .sort();
    expect(declaredGaps).toEqual([
      'appeal_disposition_category',
      'appeal_reversal_at',
      'appeal_reversal_stage',
    ]);
  });
});
