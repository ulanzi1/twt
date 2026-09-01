// The `<ContributionList>` ROW presenter — Story 11b.2 (Task 1; AC1/AC3/AC4). The Story 9.12 `pool-progress`
// sibling: STRICTLY PURE — `(row) → view-model` and NOTHING else. NO react/react-native/astro import, NO API
// call, NO DB read, NO resolved copy (it emits i18n REFS), NO palette, NO numeral formatting, and NO
// `@twt/domain` import (Trap 3 — a type-only import of `MemberDisplayName` typechecks, lints and passes local
// tests while breaking CONSUMING packages at runtime, and leaks `pg` into the RN Metro bundle). Same input →
// same output. Because there is nothing to mock, it is asserted with pure unit tests.
//
// ⛔ ONE ROW IN, ONE VIEW-MODEL OUT (Trap 1). There is NO `deriveContributionListViewModel(rows[])` here and
// there never will be. The module-wide scan in `no-list-iteration.test.ts` mechanizes it in both halves —
// source AND the compile-time parameter type.
// ⚠⚠ THE RATIONALE IS CORRECTED HERE (combined review, 2026-09-01), ⛔ and the RULE is unchanged. This
// block used to justify the per-row shape with "the consumer is a WINDOWING render layer that calls this
// once per visible row on every scroll frame". ⛔ THAT IS FALSE, and the adapter shipped in the SAME diff
// already said so: `apps/mobile/components/contributor-list/contribution-row-input.ts` records that "the
// shipped consumer calls this EAGERLY, once per row, inside a memoized `.map()` … ⛔ not once per visible
// row per scroll frame". The two `@twt/ui` headers were simply never updated with it.
// ⭐ WHY THE RULE SURVIVES ITS OWN RATIONALE: the per-row SHAPE is what Trap 1 requires, and that holds
// however the caller iterates. ⚠ WHAT CHANGES IS THE COST MODEL a later reader will act on — on Story
// 11b.3's public render (the documented ~10,000-member case) virtualization does ⛔ NOT bound derivation,
// because the caller's memo runs this function, and a `t()` resolution, for EVERY row on every locale
// change and every poll result. ⛔ Do not re-derive "it is fine, it is windowed" from a stale comment.
//
// ⛔ IT DOES NOT ADAPT THE WIRE ROW. The shipped `ConfirmedContributorRow` is `{ firstName, lastInitial }`
// `.strict()`, and `letterCode` lives ONCE PER RESPONSE on the pool identity block — so a render layer must
// wrap the name fields as `{ kind: 'name', … }` and splice the pool letter onto each row. That adapter reads a
// RESPONSE shape, which would take a build dependency on the contract and break the parallelism; it is
// 11b.2b's AC9, discharged 2026-08-30.
//
// ⛔ NO STATUS, EVER (D2(a), Trap 2). `deriveStatusPillViewModel` is NOT called from this module and no
// constant status tone is emitted. A row's mere presence means confirmed; a pill here would either widen the
// row with a `status` field the 8.3 `.strict()` shape test exists to reject, or assert a fact nothing checked.
//
// ⚠⛔ THIS FUNCTION THROWS, AND EVERY CONSUMER OWES A TRY/CATCH (Trap 4, D8(a)). Story 9.12's code review
// found — independently, in all three layers — an unguarded presenter throw wired into a fail-soft render
// path. The blast radius here is strictly worse: this presenter's consumer is a `renderItem`, called per
// visible row per scroll frame, so one corrupt operand red-boxes the WHOLE list. 11b.2b's per-row try/catch is
// what keeps one bad line from hiding every good one; it is load-bearing, NOT defensive polish. This half of
// the contract is the presenter SURFACING the corruption — it must never silently render a blank where a name
// belongs.

import { CONTRIBUTION_LIST_I18N_REFS } from './i18n-keys.js';
import type { ContributionRowInput, ContributionRowViewModel } from './view-model.js';

/**
 * Derive ONE confirmed-contributor row's view-model. Pure + synchronous + dependency-free — same `row` in →
 * same view-model out.
 *
 * Emits the name PARTS unchanged (D9(a)): the two fields are never composed into one string anywhere in this
 * module, because joining them would DECIDE the contributor name FORM — the exact question D7-nameform(a)
 * ruled must not be ruled and AC6 item (iii) routes to the Trustee Panel. The join belongs to the render
 * layer, under the form the Panel rules.
 *
 * THROWS on an `unknown` display name (D8(a)) — a blank where a name belongs is forbidden, and no key is
 * minted for it: reusing `member.anonymousMember` would state that the person exercised their right to
 * erasure when the name was merely absent, which is a false statement about a data-subject right on the one
 * surface that exists to protect it. ⚠ No producer can emit `unknown` today (the API boundary skips a row it
 * cannot resolve), so this branch is a THROWING EXHAUSTIVENESS GUARD recorded un-attested / unexercised — a
 * guard that never fires is working. A second producer (11b.3's Astro path) may legitimately hand it one.
 */
export function deriveContributionRowViewModel(
  row: ContributionRowInput,
): ContributionRowViewModel {
  const { displayName, poolLetterCode } = row;

  switch (displayName.kind) {
    case 'name':
      return {
        displayName: {
          kind: 'nameParts',
          firstName: displayName.firstName,
          lastInitial: displayName.lastInitial,
        },
        poolLetterCode,
        rowA11y: { ref: CONTRIBUTION_LIST_I18N_REFS.rowA11y },
      };
    case 'unknown':
      throw new Error(
        '[deriveContributionRowViewModel] unresolvable contributor name — refusing to render a nameless row ' +
          '(D8(a): surface it, never blank it, and never borrow erasure copy for an absent name)',
      );
    default: {
      // Exhaustiveness over the kind discriminant — a THIRD kind added upstream fails typecheck here rather
      // than falling through to a silently blank name.
      //
      // ⛔⛔ THE MESSAGE CARRIES THE KIND, ⛔ NEVER THE OPERAND. It used to be
      // `JSON.stringify(exhaustive)`, which serialised the WHOLE display-name object — `firstName` and
      // `lastInitial` included — into `error.message`. ⚠ That message is CAUGHT AND LOGGED by the mobile
      // render layer (`PoolContributorList.tsx`, the per-row catch), whose own comment justifies logging
      // `error.message` on the ground that "every resolver throw carries the param NAME … ⛔ never a
      // param VALUE" — a verification that covers the i18n RESOLVER only, while THIS function is the
      // other thing inside that same `try`. ⇒ the stated safety ground was narrower than the catch it
      // justified, and the first producer able to emit a third kind would have turned a dev log into a
      // NAME LEAK on the one surface whose entire subject is PII shielding.
      // ⚠ Caught at the combined review (2026-09-01) while still LATENT — today's adapter hardcodes
      // `kind:'name'`, so no operand can reach here. ⭐ Fixed at the THROW, ⛔ not at the log: a guard
      // that depends on every future consumer logging carefully is not a guard
      // ([["anonymous" diagnostic log convention]] — the signal is the ACTION, never the subject).
      const exhaustive: never = displayName;
      const leakedKind =
        typeof (exhaustive as { kind?: unknown }).kind === 'string'
          ? (exhaustive as { kind: string }).kind
          : 'unrecognized';
      throw new Error(
        `[deriveContributionRowViewModel] unhandled display-name kind: ${leakedKind}`,
      );
    }
  }
}
