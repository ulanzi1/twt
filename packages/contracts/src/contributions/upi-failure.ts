// packages/contracts/src/contributions/upi-failure.ts
//
// The UPI Failure Coach anonymous failure-report contract (Story 8.5, Task 1; AC3). ONE endpoint:
//   · POST /api/v1/member/contribution/failure — record the member's SELF-CLASSIFIED failure mode.
//
// ── "Anonymous" = no PII in the failure DETAIL (AC3 / D2), enforced by the SHAPE ────────────────────
// The AC's "logged anonymously … no PII in failure logs" is a discipline on the failure CONTENT, not on
// the audit subject: the server records a member-attributed audit line (actorId = memberId, per platform
// audit conventions) whose signal lives entirely in the ACTION NAME (`member_contribution.failure_<mode>`).
// So this request carries the `mode` enum and NOTHING ELSE. There is DELIBERATELY NO free-text field for
// `other` — a free-text box would invite PII (a typed UTR / amount / name) into the analytics log, which
// AC3 forbids. That absence is the load-bearing invariant: `contributions.test.ts` asserts the shape has no
// free-text field (a structural guard against a future PII leak), the same decoy-teeth discipline the 8.2/
// 8.3/8.4 shapes use. If product later wants free-text detail, that is a separate CONSENTED surface, never
// this best-effort telemetry line.
//
// The client fires this FIRE-AND-FORGET — a failed POST never blocks the coach or the member's ability to
// retry / attest (the Story 7.10 pool-onboarding-outcome precedent). The route returns 204 (no body); this
// file carries only the request shape. A contracts SOURCE file MUST NOT import `@twt/domain` (browser-bundle
// rule — this file is bundled into the mobile app via the contributions barrel) — plain `z` only. `.strict()`.

import { z } from 'zod';

/**
 * The five MEMBER-DECLARED failure modes (AC1). The coach cannot DIAGNOSE — UPI Intent (`upi://pay`) does
 * not return a trustworthy structured failure reason on return (D1) — so this is a member self-classification
 * chooser, never an inferred verdict. `other` is a bounded catch-all, NOT a free-text escape hatch (no
 * accompanying detail field exists anywhere — the AC3 PII guard).
 */
export const UpiFailureModeSchema = z.enum([
  'insufficient_balance',
  'wrong_pin',
  'app_issue',
  'network_issue',
  'other',
]);
export type UpiFailureModeSchema = z.output<typeof UpiFailureModeSchema>;

/**
 * `POST /api/v1/member/contribution/failure` request body — the member's self-classified failure `mode`
 * and NOTHING ELSE. `.strict()` rejects any unknown key (the structural guard: no `detail`/`note`/`utr`/
 * `amount`/`vpa`/`tr` field can ever ride along). The mode alone is what the server encodes into the audit
 * action name — no free-text, no transaction-specific data.
 */
export const ContributionFailureReportRequest = z
  .object({
    mode: UpiFailureModeSchema,
  })
  .strict();
export type ContributionFailureReportRequest = z.output<typeof ContributionFailureReportRequest>;
