// packages/contracts/src/members/signup.ts
//
// First-signup member-creation transport contract (Story 3.6a, AC1). The body the mobile client
// POSTs to `POST /api/v1/member/auth/signup/create` while holding a `signup_continuation` token
// (Authorization bearer — NOT a member session): the verified-mobile seam Story 3.2 minted at
// `/otp/verify` for a first-time mobile. The endpoint creates the member (emits
// `member.signup_initiated` → `pending-kyc`), writes the Tier-1 mobile identity, and upgrades to a
// FULL session — so the response REUSES `MemberFullSession` (the exact shape a returning
// single-membership login returns; the mobile client is already coupled on it — do NOT fork a
// second session shape).
//
// ── Why the body re-sends `mobile` (R2 mobile-binding wrinkle) ────────────────────────────────
// The continuation token carries the mobile BLIND INDEX, not the plaintext; `member_identities`
// needs the plaintext to Tier-1-encrypt. So the client re-sends the `mobile` it has from the OTP
// step; the server re-derives the blind index and asserts it equals the token `sub` (a mismatch is
// 401) before encrypting. `deviceId` binds the trusted device for the issued session (mirrors
// `MemberOtpVerifyRequest`). ALL objects `.strict()` (the members/ directory discipline).

import { z } from 'zod';

import { MobileNumber } from '../_common/primitives.js';

export const MemberSignupCreateRequest = z
  .object({
    mobile: MobileNumber,
    deviceId: z.string().min(1).max(256),
    deviceLabel: z.string().min(1).max(128).optional(),
  })
  .strict();
export type MemberSignupCreateRequest = z.output<typeof MemberSignupCreateRequest>;
