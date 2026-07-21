// packages/contracts/src/contributions/upi-intent.ts
//
// The UPI Intent + UTR self-attestation WRITE contracts (Story 8.4, Task 4) — the FIRST Epic-8 write
// surface. Two endpoints: `intent` (build the server-authoritative `upi://pay` URL) + `attest` (record the
// member's self-attested UTR → the yellow pill). Sibling of `active-contribution-card.ts` (8.2) /
// `pool-contributor-list.ts` (8.3): same `.strict()` + no-type-shadowing discipline.
//
// ── Server-authoritative, amount-locked, idempotent (AC1) ───────────────────────────────────────────
// The client NEVER names the payee (VPA), the amount, or the `tr` — the whole `upiUrl` is built server-side
// (the vyawastha-shulk R4 precedent). `tr` = `deriveContributionReference({ memberId, alertId })`
// (DETERMINISTIC — the same member+alert always yields the same `tr`, so repeated payments reconcile as ONE
// contribution). `amountInr` = the assigned pool's SNAPSHOTTED `fixed_amount` (the amount-lock).
//
// ── The nominee-VPA absence is a FIRST-CLASS response state (AC2 / D1) ──────────────────────────────
// There is no VPA column in the substrate today (Story 6.8 stored bank accounts only); BigDev SETTLED
// path (b) — defer VPA collection to a dedicated story, ship 8.4 with the seam ABSENT. So the intent
// response is a DISCRIMINATED UNION on `available`: `{ available: false, reason }` is the EXPECTED, shipped
// v1 state (the calm "not available yet — Get help" path), never a `upi://pay?pa=undefined` URL.
//
// ── Yellow is a member self-state, NEVER an aggregate (AC4, load-bearing) ───────────────────────────
// The attest response carries the member's OWN `myContribution: 'attested'` — there is DELIBERATELY NO
// confirmed/aggregate count field anywhere in this shape (the 8.2 meter stays confirmed-only). Adding one
// is the change the yellow-never-confirmed teeth exist to forbid.

import { z } from 'zod';

/**
 * The member's OWN contribution state for the current cycle (AC4) — `none` (has not self-attested) →
 * `attested` (yellow pill: told-us-they-paid, still verifying). This is a PER-MEMBER self-state, NEVER an
 * aggregate/pool count. Green (confirmed) is Epic 9's exclusive flip and is deliberately NOT a value here.
 */
export const MyContributionStatus = z.enum(['none', 'attested']);
export type MyContributionStatus = z.output<typeof MyContributionStatus>;

/**
 * The shipped UTR format (AC3/D8) — mirrors the `@twt/domain` `contribution.CONTRIBUTION_UTR_REGEX`
 * (`packages/domain/src/contribution/events.ts`) and the vyawastha-shulk regex verbatim (12-digit / 22-
 * alnum). Deliberately NOT imported from `@twt/domain` here — this file is bundled into the mobile app
 * (`pay.tsx` imports `ContributionUtr` directly), and `@twt/domain`'s `contribution` barrel re-exports
 * `write.ts`, which imports `pg` (a Node-only Postgres client with no React Native polyfill) — that import
 * would break the Metro bundle. `packages/contracts/tests/contributions.test.ts` mechanically asserts this
 * pattern stays byte-for-byte in sync with the domain source (review finding — a comment alone doesn't
 * enforce it; a test-only cross-package import is safe since tests never ship in a bundle).
 */
export const ContributionUtr = z
  .string()
  .regex(/^\d{12}$|^[A-Za-z0-9]{22}$/, 'UTR must be 12 digits or 22 alphanumerics');
export type ContributionUtr = z.output<typeof ContributionUtr>;

/** Which nominee account's VPA to prefer — default #1, "Switch account" to #2 (FR-27). */
export const ContributionAccount = z.union([z.literal(1), z.literal(2)]);
export type ContributionAccount = z.output<typeof ContributionAccount>;

/**
 * `POST /api/v1/member/contribution/intent` request. Empty by default; `account` optionally switches the
 * `pa=` to nominee account #2 (FR-27's "Switch account"). The client names NOTHING about the payment
 * itself (payee/amount/tr) — those are server-resolved (R4).
 */
export const ContributionIntentRequest = z
  .object({
    account: ContributionAccount.optional(),
  })
  .strict();
export type ContributionIntentRequest = z.output<typeof ContributionIntentRequest>;

/**
 * Why a UPI intent could not be built — every value is a first-class, calm fail-soft the client handles
 * without stranding the member (AC2/AC5):
 *   · `unassigned`            — not an `active` member assigned to a `live`-cycle pool (the card would
 *                               already self-suppress; defensive).
 *   · `accounts_not_collected`— the claim's nominee bank accounts are not collected yet.
 *   · `account_not_found`     — the requested "Switch account" rank was never collected for this claim
 *                               (review finding: the domain resolver used to silently fall back to a
 *                               different account instead of surfacing this distinctly).
 *   · `vpa_not_collected`     — the SHIPPED v1 state (D1): accounts exist but no UPI VPA is stored. The
 *                               button becomes the "UPI contribution isn't available for this pool yet —
 *                               tap Get help" path (Story 8.11 helpline / 8.5 coach seam).
 */
export const ContributionIntentUnavailableReason = z.enum([
  'unassigned',
  'accounts_not_collected',
  'account_not_found',
  'vpa_not_collected',
]);
export type ContributionIntentUnavailableReason = z.output<typeof ContributionIntentUnavailableReason>;

/** The successfully-built server-authoritative intent (AC1) — the client just `Linking.openURL(upiUrl)`. */
export const ContributionIntentAvailable = z
  .object({
    available: z.literal(true),
    /** The server-built `upi://pay?pa=…&am=…&cu=INR&tn=…&tr=…` (fully escaped; never client-named). */
    upiUrl: z.string().min(1),
    /** The DETERMINISTIC reference echoed for the attest step (recomputed server-side on attest — R4). */
    tr: z.string().min(1),
    /** The amount-lock: the pool's snapshotted whole-INR `fixed_amount`. */
    amountInr: z.number().int().positive(),
    /** The resolved nominee VPA (the `pa=` payee) — surfaced for the confirmation UI. */
    vpa: z.string().min(1),
    /** Which nominee account the VPA came from (#1 default / #2 switched). */
    account: ContributionAccount,
    /** The member's OWN attestation state for this alert (AC4; review finding — carried on EVERY intent
     *  response branch, not just the card, so `/pay` can route a member who already attested straight to
     *  confirmation instead of re-running the launch flow). */
    myContribution: MyContributionStatus,
  })
  .strict();
export type ContributionIntentAvailable = z.output<typeof ContributionIntentAvailable>;

/** The first-class ABSENCE state (AC2/D1) — the calm "not available yet — Get help" path. */
export const ContributionIntentUnavailable = z
  .object({
    available: z.literal(false),
    reason: ContributionIntentUnavailableReason,
    /** The member's OWN attestation state (review finding) — a member can be unassigned/VPA-less AND
     *  already `attested` (e.g. an out-of-band payer, 8.10); this field lets `/pay` route them correctly
     *  regardless of intent availability. */
    myContribution: MyContributionStatus,
  })
  .strict();
export type ContributionIntentUnavailable = z.output<typeof ContributionIntentUnavailable>;

/** `POST /api/v1/member/contribution/intent` response — the discriminated union on `available`. */
export const ContributionIntentResponse = z.discriminatedUnion('available', [
  ContributionIntentAvailable,
  ContributionIntentUnavailable,
]);
export type ContributionIntentResponse = z.output<typeof ContributionIntentResponse>;

/**
 * `POST /api/v1/member/contribution/attest` request — the member's self-attested UTR after returning from
 * the UPI app. `tr` is the intent's deterministic reference; the server RECOMPUTES it from (memberId,
 * alertId) and compares (never trusts a client-supplied `tr` blindly — R4). `utr` is format-validated only
 * (semantic/existence verification is Epic 9's matcher, not 8.4's).
 */
export const ContributionAttestRequest = z
  .object({
    tr: z.string().min(1),
    utr: ContributionUtr,
  })
  .strict();
export type ContributionAttestRequest = z.output<typeof ContributionAttestRequest>;

/**
 * `POST /api/v1/member/contribution/attest` response — the yellow-pill view (AC3/AC4). Carries the
 * member's OWN `myContribution: 'attested'` state + the echoed `tr`. There is DELIBERATELY NO
 * confirmed/aggregate count field — yellow is a per-member self-state, never an aggregate (the load-bearing
 * invariant as a `.strict()` shape). `idempotent` is `true` on a re-paste (records no second claim).
 */
export const ContributionAttestResponse = z
  .object({
    myContribution: z.literal('attested'),
    tr: z.string().min(1),
    idempotent: z.boolean(),
  })
  .strict();
export type ContributionAttestResponse = z.output<typeof ContributionAttestResponse>;
