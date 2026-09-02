// packages/contracts/src/nominee-bank-masking/masking.ts
//
// Per-Pariwar nominee-bank MASKING SCHEDULE transport DTOs — Story 11b.3a (Task 5; AC5, AC6). The
// request/response shapes for the admin read/write endpoints (admin-session +
// `pariwar.manage_nominee_bank_masking`-gated, **`super_admin` ONLY**):
//   · GET /api/v1/p/{pariwarId}/admin/nominee-bank-masking/schedule — what is in force.
//   · PUT /api/v1/p/{pariwarId}/admin/nominee-bank-masking/schedule — the governed change.
//
// Governance of record: `2026-08-28-160` **cl.10(b)–(d)** (Trustee-ratified) · `2026-09-02-178`
// (**D8(ii)** — the Trust CENTRALLY) · `2026-09-02-179` cl.1 (**D8-default** FAIL-OPEN) ·
// `2026-09-02-183` cl.1–3 (**D8(i)** — the key, minted).
//
// ⚠ THE MECHANISM IS NOT DEFINED HERE. `packages/domain/src/claim/nominee-bank-masking-policy.ts`
// owns every rule (rationale, audit anchor, actor/display consistency, the grant check, the
// close-head-then-insert-head supersession) and `nominee-bank-masking.ts` owns the predicate. These
// shapes are the WIRE ONLY. ⛔ Do not re-implement a domain rule in a `.refine()`.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). Plain `z` only —
// so the mode tuple and the day ceiling are LOCAL wire values, value-aligned with the domain's
// `NOMINEE_BANK_MASKING_MODES` / `MAX_NOMINEE_BANK_MASK_AFTER_DAYS` rather than imported from them.
// ⚠ LOCKSTEP: if either moves in the domain it moves here, and the domain is the authority.
// ALL objects `.strict()`. Timestamps are Iso8601 strings (apps/api serializes `Date`).

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The DATA-SANITY ceiling on a day count (100 years) — value-aligned with the domain's
 * `MAX_NOMINEE_BANK_MASK_AFTER_DAYS` and the DB CHECK. ⛔ NOT a policy ceiling: it exists so an admin
 * typo of `999999999` cannot become de-facto permanence entered by accident, on the one control
 * where *"visible for a while"* and *"visible forever"* is the whole subject.
 */
export const MAX_NOMINEE_BANK_MASK_AFTER_DAYS = 36500;

/**
 * ⭐⭐ THE SETTING — `2026-08-28-160` cl.10(c)'s THREE, as a DISCRIMINATED UNION.
 *
 * ⛔⛔ **NEVER A BOOLEAN, AND THAT IS A RULING.** cl.10(d): policy must move *full public disclosure →
 * shorter post-campaign exposure → immediate masking → permanent masked presentation* ⛔ without
 * redesigning the bank-detail record and ⛔ without a schema change ⇒ *"configuration over one record,
 * ⛔ never a second record and ⛔ never a boolean. A later 'simplification' to a boolean is a
 * **defect**, not a cleanup."* ⛔ Do not collapse this into `{ masked: boolean }` or into a bare
 * nullable integer — a two-valued shape cannot carry three settings.
 *
 * ⚠ `after_days: 0` IS cl.10(c)'s zero-day setting — masked from the close instant — and is **a value
 * an admin chose** — ⛔ not a
 * default the code assumes, which cl.10(b) forbids in terms. The no-setting behaviour is the ABSENCE
 * of a schedule (`configured: false` below), which is FAIL-OPEN.
 *
 * ⚠⛔ `permanent` IS THE LADDER'S **TERMINAL RUNG** — masked in EVERY state, including while the
 * drive is still collecting. ⭐ AN AUTHORING READING (`2026-09-02-183` cl.4), ⛔ NOT a Panel ruling,
 * recorded openly and routed for confirmation: read as a fourth post-close offset it would be a
 * synonym for `after_days: 0`, and one of the Panel's three settings would ship meaning nothing.
 */
export const NomineeBankMaskingSetting = z.discriminatedUnion('mode', [
  z
    .object({
      mode: z.literal('after_days'),
      /** Whole days from the drive's close/settle instant. ⭐ `0` = masked from the close instant. */
      maskAfterDays: z.number().int().min(0).max(MAX_NOMINEE_BANK_MASK_AFTER_DAYS),
    })
    .strict(),
  z.object({ mode: z.literal('permanent') }).strict(),
]);
export type NomineeBankMaskingSetting = z.output<typeof NomineeBankMaskingSetting>;

/**
 * The Pariwar's current masking schedule.
 *
 * ⭐ `configured` IS LOAD-BEARING and ⛔ is not inferrable from `setting` alone — the
 * `DirectoryPublicationStatusResponse` precedent, and here it carries MORE weight. `configured:
 * false` means **no schedule row has ever been written**, which under `D8-default` (`2026-09-02-179`
 * cl.1) resolves **FAIL-OPEN**: nominee bank details stay FULLY VISIBLE after close until the Trust
 * sets a window. ⚠⛔ That is ⛔ NOT the same fact as a Trust that deliberately chose a long window,
 * and an operator must be shown WHICH ONE they are looking at.
 * ⚠ AND ITS COST IS PART OF THE RULING: `2026-09-02-178` put authority CENTRALLY, so a Pariwar
 * ⛔ cannot set its own window ⇒ fail-open governs **every** Pariwar until the Trust acts, and what
 * stays exposed is a FULL ACCOUNT NUMBER.
 */
export const NomineeBankMaskingScheduleResponse = z
  .object({
    /** The setting in force, or `null` when none is (⇒ FAIL-OPEN: details stay visible). */
    setting: NomineeBankMaskingSetting.nullable(),
    /** Whether a schedule row exists at all. `false` ⇒ never configured ⇒ fail-open. */
    configured: z.boolean(),
    /** When the current window came into force. Null when unconfigured. */
    effectiveFrom: Iso8601Datetime.nullable(),
    /** The last-changing admin's `users.display_name`, SNAPSHOT at write time. */
    changedByDisplay: z.string().nullable(),
    /** WHY it was last changed. Null when unconfigured. */
    rationale: z.string().nullable(),
    /** The schedule row's version — monotonic per Pariwar. Null when unconfigured. */
    version: z.number().int().positive().nullable(),
  })
  .strict();
export type NomineeBankMaskingScheduleResponse = z.output<
  typeof NomineeBankMaskingScheduleResponse
>;

/**
 * PUT the Pariwar's masking schedule. Moves in EVERY direction — cl.10(c) requires it stay
 * *"reversible and re-configurable"*, and `setNomineeBankMaskingSchedule` has ⛔ no "already masked,
 * cannot unmask" branch by construction.
 *
 * ⭐ `rationale` is `.trim().min(1)` — ⛔ THIS is the rejection boundary and it must stay here.
 * `UngovernedNomineeBankMaskingChangeError` `extends Error` (⛔ not `ApiError`) and is NOT registered
 * in `apps/api/src/middleware/error-mapping/index.ts`, whose documented default is *"Anything else →
 * 500 `internal.error`"*. ⇒ a whitespace rationale reaching the domain throw would show an operator
 * an opaque 500 on a plain input error. The domain check is the BACKSTOP; this contract is the
 * boundary a caller actually hits, with a `400`.
 *
 * ⛔ THERE IS DELIBERATELY NO `changedByDisplay` FIELD. The acting admin's display name is resolved
 * SERVER-SIDE from `users.display_name` (fail-closed) and is ⛔ never accepted from the caller — a
 * client-supplied one would let an operator's browser lie about who changed how long a family's bank
 * account number stays public. `.strict()` makes the field UNREPRESENTABLE on the wire.
 *
 * ⛔ AND THERE IS NO `effectiveFrom` FIELD EITHER. The change takes effect at the SERVER's instant:
 * a client-supplied one would let an operator back-date a window — retroactively re-characterising
 * what the public could see and when, which is precisely what a governance trail exists to prevent.
 */
export const SetNomineeBankMaskingRequest = z
  .object({
    setting: NomineeBankMaskingSetting,
    rationale: z.string().trim().min(1).max(2000),
  })
  .strict();
export type SetNomineeBankMaskingRequest = z.output<typeof SetNomineeBankMaskingRequest>;
