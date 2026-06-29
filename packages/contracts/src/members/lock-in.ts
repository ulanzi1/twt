// packages/contracts/src/members/lock-in.ts
//
// The lock-in home-widget read DTO (Story 3.7, Task 2). The response shape for
// `GET /api/v1/member/lock-in-status` — the read seam that drives the topmost home-screen lock-in
// clock widget (countdown + clause reference + unlock date + the Niyamavali deep-link target).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────────────────
// A contracts SOURCE file MUST NOT import `@twt/domain` (the browser-bundle rule). So this uses the
// `_common` `Iso8601Datetime` primitive + plain `string`/`number`, and REUSES the existing
// `MemberLifecycleStateWire` enum (kyc/signup.ts) via a relative intra-contracts import — the
// no-`@twt/domain` rule applies to that package only; a third lifecycle-state enum would risk
// lockstep-drift. ALL objects `.strict()` (the members/ directory discipline).
//
// ── Server-authoritative clock (R: Dev Notes "Server-authoritative computation") ────────────────────
// `unlockDate` + `daysRemaining` are computed on the SERVER from `deps.clock()` so the figure is
// canonical and the client never re-derives policy. The widget DISPLAYS these; it does not tick.
// `lockIn` is `null` whenever `state !== 'lock-in'` — the widget then self-suppresses (AC1/AC3).

import { z } from 'zod';

import { Iso8601Datetime } from '../_common/primitives.js';
import { MemberLifecycleStateWire } from '../kyc/signup.js';

/**
 * The lock-in clock figures, present ONLY while the member is in `lock-in`. `enteredAt` is the
 * `member.lock_in_entered` clock-start instant; `unlockDate` = enteredAt + `lockInDays` (server,
 * leap-safe); `daysRemaining` is a non-negative integer (server `ceil`, clamped ≥0); `clauseId` is
 * the lock-in policy clause (`niy.lock-in.policy`) the deep-link targets; `clauseVersion` is the
 * snapshotted policy version the member entered under.
 */
export const MemberLockInClock = z
  .object({
    enteredAt: Iso8601Datetime,
    unlockDate: Iso8601Datetime,
    daysRemaining: z.number().int().nonnegative(),
    lockInDays: z.number().int().positive(),
    clauseId: z.string().min(1),
    clauseVersion: z.string().min(1),
  })
  .strict();
export type MemberLockInClock = z.output<typeof MemberLockInClock>;

/**
 * `GET /api/v1/member/lock-in-status` response. `state` is the member's current lifecycle state;
 * `lockIn` carries the clock figures when `state === 'lock-in'` and is `null` for every other state
 * (the client guards with `if (data.lockIn)` — Dev Notes "Open decisions" #1).
 */
export const MemberLockInStatusResponse = z
  .object({
    state: MemberLifecycleStateWire,
    lockIn: MemberLockInClock.nullable(),
  })
  .strict();
export type MemberLockInStatusResponse = z.output<typeof MemberLockInStatusResponse>;
