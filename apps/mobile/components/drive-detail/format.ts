// Pure logic for `<MemberDriveDetail>` — Story 11b.17 (Task 5; AC2, AC9, AC10, AC11).
//
// ⚠⛔ **THERE IS ⛔ NO RN MOUNT HARNESS IN THIS REPO**, and that is what this file is for. There is
// ⛔ no `@testing-library/react-native`; `MemberDriveList.tsx` itself **cannot be imported** —
// `components/drive-list/format.ts:1-10` records it: *"confirmed by trying (`SyntaxError: Unexpected
// token 'typeof'`, from a transitive React Native dependency's Flow syntax)."*
// ⇒ ⭐ the two shipped idioms are (1) scan the `.tsx` **source as text**, driven by the REAL i18n
// catalog and REAL contract, and (2) **extract pure logic into a plain `.ts` module** so a test can
// CALL it. ⚠ A source scan proves a function is **REFERENCED**, ⛔ never that it computes the right
// answer ⇒ ⭐ **anything with a checkable answer belongs HERE**, and the three selectors below are the
// three places where a wrong answer is a **crash or a disclosure**, ⛔ not a cosmetic defect.
//
// ⛔ ⛔ NO `react` / `react-native` / `tamagui` / `@twt/i18n/react` import may enter this file.

import type { MemberDriveDetailResponse } from '@twt/contracts'

/**
 * ⭐ Format a drive's close/settle instant the way the public index and the member LIST both do —
 * IST, `DD-MM-YYYY`.
 *
 * ⚠ **RE-EXPORTED FROM THE DRIVE-LIST MODULE, ⛔ NOT RE-IMPLEMENTED.** The list already duplicated it
 * once from `apps/public/src/lib/sahyog-render.ts` and recorded WHY that was acceptable (a plain
 * mechanical date format with ⛔ no Trustee ruling behind it). ⭐ A **THIRD** copy would not be: two
 * member surfaces formatting one drive's close date differently is a defect a member can see.
 * ⛔ Do ⛔ not fork it.
 */
export { formatClosedAtIst, IST_OFFSET_MS } from '../drive-list/format'

/**
 * ⭐ Map the close-of-cycle funding-outcome enum onto its i18n key, EXHAUSTIVELY.
 *
 * ⚠⛔ **DECLARED HERE RATHER THAN REUSED FROM THE LIST, AND THE REASON IS THE KEY NAMESPACE, ⛔ not
 * the mapping.** The list's `outcomeFramingKey` returns a key resolved against `member-drive-list`;
 * this surface resolves against `member-drive-detail`. ⭐ The three key SPELLINGS coincide, and the
 * three STRINGS are the same Trustee-ratified text in both catalogs — ⛔ but a shared function would
 * make one surface's namespace the other's silent dependency. ⚠ The `never` guard is the load-bearing
 * half: a widened `MemberDriveFundingOutcome` must fail at **BUILD** time, because `t()` **THROWS** on
 * an unresolved key and that would crash the whole page, ⛔ not one line.
 */
export function detailOutcomeFramingKey(
  outcome: 'fully_funded' | 'partial' | 'under_funded',
): string {
  switch (outcome) {
    case 'fully_funded':
      return 'outcome.fully_funded'
    case 'partial':
      return 'outcome.partial'
    case 'under_funded':
      return 'outcome.under_funded'
    default: {
      const _never: never = outcome
      throw new Error(`[MemberDriveDetail] unhandled funding outcome: ${String(_never)}`)
    }
  }
}

/**
 * ⭐⭐ **THE ZERO-DAY VARIANT (AC9) — AND THE CHOICE IS A SAFETY PROPERTY, ⛔ NOT A NICETY.**
 *
 * A `live` drive with **ZERO** confirmed contributions must ⛔ **NOT** render a
 * *"₹ 0 contributed · 0 confirmed"*-shaped sentence: the Panel **GAVE** the replacement wording, in
 * BOTH languages, when a code review showed them what a drive renders on its first day
 * (`2026-09-07-206` **cl.4**). ⇒ ⭐ consume `zero_line.full` / `zero_line.no_family` from
 * **`sahyog-shared`** BY NAME — ⛔ never mint a second set, ⛔ never translate one.
 *
 * ⚠⛔ **THE VARIANT IS CHOSEN ON NULLABILITY** because `deceasedMemberName` is `.nullable()` on the
 * wire and `t()` **THROWS** on an unsupplied token (`packages/i18n/src/resolver.ts`) ⇒ resolving
 * `.full` on a nameless drive would take down the **WHOLE PAGE**, ⛔ not one line. ⭐ Same structural
 * reason `sahyog-shared` ships the two variants at all.
 *
 * ⭐ Returns `null` when this is ⛔ **not** a zero-day live drive — the caller then renders its
 * ordinary summary. ⚠⛔ ⛔ The PERCENTAGE is ⛔ **NOT** suppressed at zero (the public meter renders at
 * 0 too), and that is the caller's business, ⛔ not this selector's.
 */
export function selectZeroDayLine(
  detail: Pick<MemberDriveDetailResponse, 'status' | 'confirmedContributionCount' | 'deceasedMemberName'>,
): { key: 'zero_line.full'; familyName: string } | { key: 'zero_line.no_family' } | null {
  // ⚠⛔ THE ASSERTION IS IN **WIRE-TOKEN** VOCABULARY — `live` | `closed` | **`verified`**. ⛔ A test or
  // a guard written against `settled` (a POOL STATE) matches ⛔ NOTHING here.
  if (detail.status !== 'live') return null
  if (detail.confirmedContributionCount !== 0) return null
  if (detail.deceasedMemberName === null) return { key: 'zero_line.no_family' }
  return { key: 'zero_line.full', familyName: detail.deceasedMemberName }
}

/**
 * ⭐⭐ **THE PANEL'S MESSAGE BLOCK (AC10) — WHAT RENDERS, AND WHETHER ANYTHING DOES.**
 *
 * ⭐ Ratified 2026-09-05, DR + KB (routing note **§8.1**, routed at **§9.1 row 3**), recorded at
 * `#decision-2026-09-11-214` **cl.4(b)**: *"`11b-17` carries the MEMBER render — AC10 / Task 5d — and
 * ⛔ nothing more."* ⭐ The eight keys were shipped by `11b-19` (`done`) into `sahyog-shared`, in BOTH
 * locales. ⛔ Never author, re-derive or translate any of them at a render site.
 *
 * ⚠⛔⛔ **THIS FUNCTION IS THE FENCE'S SURVIVING PROPERTY MADE EXECUTABLE.**
 * `packages/i18n/tests/sahyog-shared-dark-copy.test.ts` was NARROWED (⛔ not deleted, ⛔ not waived) to
 * *"⛔ never resolved without every token supplied"*, naming this render site. ⇒ ⭐ every rule below is
 * enforced by **RETURNING `null`** rather than by remembering to check:
 *
 *   ⭐ **(1) `{amount}` ARRIVES ALREADY FORMATTED AND CARRIES ITS OWN ₹** ⇒ ⛔ the copy carries ⛔ no
 *     literal ₹, and adding one ships **₹₹**. ⛔ Do ⛔ not prepend one at the render site either.
 *   ⭐ **(2) THE VARIANT IS CHOSEN ON NULLABILITY, AND ⛔ ONLY THE HEADLINE VARIES.**
 *     `.headline.no_family` when the deceased name is null, `.headline.full` otherwise;
 *     `{family_name}` is the ⛔ **ONLY** omittable token and the other four paragraphs are **token-free
 *     by design**. ⚠⛔ `t()` **THROWS** on an unsupplied token and this block is **PAGE-shaped**
 *     (§8.3(2)) ⇒ ⛔ a `.full` on a nameless drive takes down the **WHOLE PAGE**.
 *   ⭐ **(3) THERE IS ⛔ NO `no_amount` VARIANT AND THERE MUST ⛔ NOT BE ONE.** Where the amount is
 *     unavailable the block renders **NOTHING** — ⛔ it does ⛔ not fall back (`2026-09-08-207` cl.2,
 *     the ₹0-silence rule AC9 also carries). ⇒ ⭐ `null` here means *render nothing*, and it is the
 *     ⛔ only correct answer.
 *
 * ⚠⛔ **THE ₹0 RULE IS ABOUT THE FIGURE, ⛔ NOT ABOUT THE STAGE.** `-207` cl.2 rules that where a
 * drive's amount is ₹0 on the WIRE TOKENS `closed`/`verified` (POOL STATES `closed`/`settled`) the
 * sentence renders **NOTHING** — ⛔ no placeholder, ⛔ no marker, ⛔ no partial sentence. ⭐ On a `live`
 * drive a ₹0 figure is the ordinary day-one state and AC9's ratified zero-day line covers it, so this
 * block simply does not speak for it either.
 *
 * @param amountRaisedInr the drive's money figure, in whole rupees, from the wire.
 * @param deceasedMemberName `null` when unresolvable — see (2).
 * @param status the WIRE TOKEN (`live` | `closed` | `verified`), ⛔ never a pool state.
 */
export function selectMessageBlockHeadline(
  detail: Pick<MemberDriveDetailResponse, 'status' | 'amountRaisedInr' | 'deceasedMemberName'>,
):
  | { key: 'message_block.headline.full'; familyName: string }
  | { key: 'message_block.headline.no_family' }
  | null {
  // ⭐ (3) — the ₹0 silence. ⛔ NO `no_amount` variant exists and ⛔ none may be minted; the block says
  // NOTHING rather than something false or half-formed.
  if (detail.amountRaisedInr <= 0) return null
  // ⭐ (2) — the variant IS the safety property.
  if (detail.deceasedMemberName === null) return { key: 'message_block.headline.no_family' }
  return { key: 'message_block.headline.full', familyName: detail.deceasedMemberName }
}

/**
 * ⭐⭐ **AC10's TWO-COLUMN TABLE — `Nominee full name` | `District` — AND ITS DROP RULE.**
 *
 * ⭐ §8.1: *"Plus: a table above the message — **Nominee full name** (left) · **District** (right)"*.
 *
 * ⚠⛔⛔ **AN ABSENT `district` DROPS ITS COLUMN** — ⛔ never *"Not recorded"*, ⛔ never a placeholder,
 * ⛔ never left attached to the nominee. ⭐ Ground: `-214` **Consequence 6** (§10.2 ruling 3 — *an
 * absent token **DROPS ITS CLAUSE***, ⛔ no combinatorial variants). ⚠ And the coupling is B's own
 * non-obvious call, copied rather than re-derived: *"who served in … district"* modifies the
 * **DECEASED MEMBER**, so a District column standing beside a NOMINEE's name with the deceased absent
 * **MIS-ATTRIBUTES the posting**.
 *
 * ⚠⛔ **AND ⛔ NO KEY ASSERTS THE NOMINEE RELATIONSHIP** (`-214` Consequence 8). The value behind
 * *"Nominee full name"* is `account_holder_name_ciphertext`, and `D5-subject (i)` **records** that
 * **the SCHEMA is the authority**. ⭐ They are **LABELS**, ⛔ not assertions — ⛔ nothing here may say
 * the person *"is the nominee of"* anyone.
 *
 * ⭐ `Nominee full name` is `-205` **cl.1**'s **FULL** form ⇒ the per-Pariwar
 * `public_name_presentation_mode` has ⛔ **no subject** for a claim-scoped value.
 *
 * ⭐ Returns `[]` when there is nothing to tabulate — ⛔ never a table of placeholders.
 */
export function selectMessageBlockTableColumns(
  detail: Pick<MemberDriveDetailResponse, 'nomineeName' | 'district' | 'deceasedMemberName'>,
): Array<{ labelKey: 'message_block.table.nominee_name' | 'message_block.table.district'; value: string }> {
  const columns: Array<{
    labelKey: 'message_block.table.nominee_name' | 'message_block.table.district'
    value: string
  }> = []
  if (detail.nomineeName !== null) {
    columns.push({ labelKey: 'message_block.table.nominee_name', value: detail.nomineeName })
  }
  // ⚠⛔ **THE DISTRICT TRAVELS WITH THE DECEASED, ⛔ NOT WITH THE NOMINEE.** ⇒ it is dropped when the
  // district is absent AND when the DECEASED is absent — B's `no_family` variant drops the district
  // clause too, for exactly this reason, and the table inherits that logic rather than re-deriving it.
  if (detail.district !== null && detail.deceasedMemberName !== null) {
    columns.push({ labelKey: 'message_block.table.district', value: detail.district })
  }
  return columns
}

/**
 * ⭐ Whether an account's block should announce that some of its values could not be shown (AC11).
 *
 * ⚠⛔ **THE SENTINEL IS A DISTINCT STRING, ⛔ NEVER A BLANK** — a blank could masquerade as real data.
 * ⭐ It renders in place so a member can see WHICH field failed (the donor-path precedent), and the
 * accessible name says so once rather than reading the bracketed string three times.
 * ⛔ Do ⛔ not turn a sentinel into an empty row, and ⛔ do ⛔ not suppress the account: the OTHER
 * account may be payable, and this surface's whole purpose is showing where the money went.
 */
export function accountHasUnavailableField(
  account: Pick<
    MemberDriveDetailResponse['nomineeAccounts'][number],
    'accountHolderName' | 'accountNumber' | 'ifsc' | 'bankName'
  >,
  sentinel: string,
): boolean {
  return (
    account.accountHolderName === sentinel ||
    account.accountNumber === sentinel ||
    account.ifsc === sentinel ||
    account.bankName === sentinel
  )
}
