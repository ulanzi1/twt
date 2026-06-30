// packages/contracts/src/payments/vyawastha-shulk.ts
//
// The signup ₹110 Vyawastha Shulk transport DTOs (Story 3.6b, Task 5). The request/response shapes
// for `POST /member/vyawastha-shulk/intent` (build the UPI Intent URL), `POST .../confirm` (self-attest
// the UTR → persist the receipt + the GATED lock-in transition), and `GET .../status` (the UI's
// paid/lock-in view) — the FINAL signup-wizard step (after medical 3.5), which closes the signup loop.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So these use
// `_common` primitives (`Iso8601Datetime`) + plain `string`/`number`. ALL objects `.strict()`.
//
// ── Server-authoritative money/payee (R4) ───────────────────────────────────────────────────────────
// The intent RESPONSE carries the `upiUrl` + `vpa` + `amountInr` the SERVER built/resolved from config
// — the client NEVER names the amount or payee (a malicious client could otherwise pay ₹0 / a wrong
// VPA). The confirm REQUEST carries only `tr` (the server-minted idempotency ref), the self-attested
// `utr`, and the optional `referenceCode` — never an amount/VPA.

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';

/**
 * The four pre-payment signup steps the lock-in gate echoes for the UI when outstanding (AC2). Mirrors
 * the domain `LockInGateStep` union (kept in lockstep; contracts cannot import @twt/domain).
 */
export const LockInGateStep = z.enum(['kyc', 'nominees', 'medical', 'tc']);
export type LockInGateStep = z.output<typeof LockInGateStep>;

// ── intent ──────────────────────────────────────────────────────────────────────────────────────────

/**
 * `POST /member/vyawastha-shulk/intent` — the server-constructed UPI Intent. `upiUrl` is the full
 * `upi://pay?...` URL (VPA + amount resolved server-side); `tr` is the idempotency nonce echoed back
 * for the confirm step; `amountInr` (110) + `vpa` are surfaced for display (server-authoritative).
 */
export const VyawasthaShulkIntentResponse = z
  .object({
    upiUrl: z.string().min(1),
    tr: z.string().min(1),
    amountInr: z.number().int().positive(),
    vpa: z.string().min(1),
  })
  .strict();
export type VyawasthaShulkIntentResponse = z.output<typeof VyawasthaShulkIntentResponse>;

// ── confirm ───────────────────────────────────────────────────────────────────────────────────────

/**
 * `POST /member/vyawastha-shulk/confirm` — self-attest the UTR after returning from the UPI app.
 * `tr` is the intent's idempotency nonce (a re-confirm with the same `tr` returns the existing receipt).
 * `utr` is validated PERMISSIVELY (12-digit numeric OR 22-char alphanumeric NEFT/RTGS — UX §"UTR
 * self-attest"; not matcher-verified). `referenceCode` is the OPTIONAL 6-digit field-worker code (D2
 * port seam — format-checked here, stored as attribution_source, NOT validated against a registry).
 */
export const VyawasthaShulkConfirmRequest = z
  .object({
    tr: z.string().min(1),
    utr: z.string().regex(/^\d{12}$|^[A-Za-z0-9]{22}$/, 'UTR must be 12 digits or 22 alphanumerics'),
    referenceCode: z
      .string()
      .regex(/^\d{6}$/, 'Reference Code must be 6 digits')
      .optional(),
  })
  .strict();
export type VyawasthaShulkConfirmRequest = z.output<typeof VyawasthaShulkConfirmRequest>;

/** The persisted receipt as echoed to the client (NON-sensitive payment metadata; AR-67). */
export const VyawasthaShulkReceiptView = z
  .object({
    paidAt: Iso8601Datetime,
    validThrough: Iso8601Datetime,
    amountInr: z.number().int().positive(),
    utr: z.string().min(1),
    paymentMethod: z.string().min(1),
  })
  .strict();
export type VyawasthaShulkReceiptView = z.output<typeof VyawasthaShulkReceiptView>;

/**
 * `POST /member/vyawastha-shulk/confirm` response. The receipt is ALWAYS returned (it persists even
 * when the gate is unsatisfied — D3). `lockInEntered` is true only when all five conditions held + the
 * two lifecycle events were emitted; `lockInDaysAtJoin` is then the snapshotted FR-8 value. `outstanding`
 * names the missing pre-payment step(s) so the UI can signal which is incomplete (empty when entered).
 */
export const VyawasthaShulkConfirmResponse = z
  .object({
    receipt: VyawasthaShulkReceiptView,
    lockInEntered: z.boolean(),
    lockInDaysAtJoin: z.number().int().positive().optional(),
    outstanding: z.array(LockInGateStep),
  })
  .strict();
export type VyawasthaShulkConfirmResponse = z.output<typeof VyawasthaShulkConfirmResponse>;

// ── status ────────────────────────────────────────────────────────────────────────────────────────

/**
 * `GET /member/vyawastha-shulk/status` — the UI's paid/lock-in view. `paid` reflects whether a receipt
 * exists; `validThrough` is the latest receipt's horizon (absent when never paid); `lockInEntered` is
 * true once the member is in `lock-in` (or past it); `outstanding` names any still-incomplete steps.
 */
export const VyawasthaShulkStatusResponse = z
  .object({
    paid: z.boolean(),
    validThrough: Iso8601Datetime.optional(),
    lockInEntered: z.boolean(),
    outstanding: z.array(LockInGateStep),
  })
  .strict();
export type VyawasthaShulkStatusResponse = z.output<typeof VyawasthaShulkStatusResponse>;

// ── renewal-status (the FR-12A `vyawastha_shulk_status` payload — Story 3.8, Task 2) ─────────────────

/**
 * `GET /member/vyawastha-shulk/renewal-status` — the canonical FR-12A renewal/validity surface Epic 4's
 * Validity Service will consume (DISTINCT from `VyawasthaShulkStatusResponse`, which is the signup
 * paid/lock-in view; keep them separate — the 3.7 "don't overload /status" precedent). The WIRE fields
 * are snake_case to match the FR-12A payload spec VERBATIM (PRD line 252 / architecture line 1255):
 *   · `paid_through`        — latest receipt `valid_through` (= paid_at + 365d); null when never paid.
 *   · `days_until_lapse`    — ceil-clamped days to the grace-end/lapse boundary (`valid_through + 91d`);
 *                             null when never paid. (The domain field is `daysUntilGraceEnds` — the API
 *                             handler maps the rename; this wire vocabulary is fixed by PRD line 252.)
 *   · `in_renewal_grace`    — true iff the member's replayed state is `active-in-grace`.
 *   · `grace_remaining_days`— `days_until_lapse` while in grace; null outside grace.
 * Computed live per request (no cache) → trivially within the ≤60s freshness invariant (freeze row 11).
 */
export const VyawasthaShulkRenewalStatusResponse = z
  .object({
    paid_through: Iso8601Datetime.nullable(),
    days_until_lapse: z.number().int().min(0).nullable(),
    in_renewal_grace: z.boolean(),
    grace_remaining_days: z.number().int().nullable(),
  })
  .strict();
export type VyawasthaShulkRenewalStatusResponse = z.output<
  typeof VyawasthaShulkRenewalStatusResponse
>;

// ── renewal payment (UPI Intent + confirm — Story 3.8, Task 4) ───────────────────────────────────────
// The renewal intent reuses the SIGNUP intent shape (`VyawasthaShulkIntentResponse`) — same
// server-authoritative VPA/amount + `tr` nonce, differing only in the `tn` grammar
// (`renewal-shulk-{memberId}-{year}`) which is server-internal and not part of the wire contract. The
// renewal confirm REQUEST reuses `VyawasthaShulkConfirmRequest` (`tr` + `utr`; `referenceCode` is
// signup-only and simply unused on renewal). Only the confirm RESPONSE differs — a renewal has NO
// lock-in gate, so it carries the receipt + whether a fresh receipt was persisted this request.

/**
 * `POST /member/vyawastha-shulk/renew/confirm` response. A renewing member is already post-lock-in, so
 * there is NO lock-in gate and NO `outstanding`/`lockInEntered` (the 3.6b signup-confirm fields). The
 * receipt is always returned; `renewed` is true when a NEW receipt was persisted this request (false on
 * an idempotent same-`tr` re-confirm, where the existing receipt is returned unchanged).
 */
export const VyawasthaShulkRenewalConfirmResponse = z
  .object({
    receipt: VyawasthaShulkReceiptView,
    renewed: z.boolean(),
  })
  .strict();
export type VyawasthaShulkRenewalConfirmResponse = z.output<
  typeof VyawasthaShulkRenewalConfirmResponse
>;
