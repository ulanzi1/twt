// packages/contracts/src/members/assisted-code.ts
//
// "DID SOMEONE HELP YOU REGISTER?" — the field worker's 6-digit code at signup (Story 3.15, Task 1; DL1–DL3; author-commit
// 2026-11-22-494). Backs `GET /api/v1/member/signup/assisted-code` (is a code already recorded?) and
// `POST /api/v1/member/signup/assisted-code` (record one), both member-session-gated.
//
// ── N2 — the member learns ⛔ about the worker ────────────────────────────────────────────────────
// Both responses carry ONLY `recorded`: ⛔ worker id, ⛔ name, ⛔ state. A known code is answered the SAME way whatever the
// worker's state (Decision 2026-11-22-493 A); only a code nobody in the Pariwar holds is refused (422
// `attribution.code_not_found`). Whether the worker is credited is Story 13.5's, from the stored capture.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// ⛔ import `@twt/domain` (the browser-bundle rule). camelCase, every object `.strict()`.

import { z } from 'zod';

/** `POST /api/v1/member/signup/assisted-code` — the code the person who helped gave the member. Exactly 6 digits. */
export const MemberAssistedCodeRequest = z
  .object({
    code: z.string().regex(/^\d{6}$/, 'The code must be 6 digits'),
  })
  .strict();
export type MemberAssistedCodeRequest = z.output<typeof MemberAssistedCodeRequest>;

/** The POST's answer (201 on a new record, 200 when the same code was already recorded). ⛔ a worker field (N2). */
export const MemberAssistedCodeResponse = z
  .object({
    recorded: z.literal(true),
  })
  .strict();
export type MemberAssistedCodeResponse = z.output<typeof MemberAssistedCodeResponse>;

/** `GET /api/v1/member/signup/assisted-code` — whether a code is already recorded for the session's member (the step skips). */
export const MemberAssistedCodeStatusResponse = z
  .object({
    recorded: z.boolean(),
  })
  .strict();
export type MemberAssistedCodeStatusResponse = z.output<typeof MemberAssistedCodeStatusResponse>;

/**
 * The POST's refusals beyond a shape failure (400 `request.validation`):
 * - `attribution.not_signing_up` (409) — the member is past signup (only `pending-kyc` / `pending-fee` may record a code);
 * - `attribution.already_recorded` (409) — a DIFFERENT code is already recorded (a recorded code is ⛔ changed);
 * - `attribution.code_not_found` (422) — nobody in the member's Pariwar holds the code; ⛔ stored.
 */
export const MEMBER_ASSISTED_CODE_ERROR_CODES = [
  'attribution.not_signing_up',
  'attribution.already_recorded',
  'attribution.code_not_found',
] as const;
export type MemberAssistedCodeErrorCode = (typeof MEMBER_ASSISTED_CODE_ERROR_CODES)[number];
