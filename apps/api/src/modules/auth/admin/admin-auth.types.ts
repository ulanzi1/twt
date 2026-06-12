// admin-auth internal result types (Story 1.9, Task 4). Transport-facing shapes
// live in packages/contracts/src/auth/ — these are the service↔handler contracts.

export type FirstFactorResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'invalid' | 'locked' };

export type RegisterVerifyResult =
  | { verified: false }
  | { verified: true; recoveryCodes?: string[] };

export type ResetConsumeResult = { ok: true; userId: string } | { ok: false };
