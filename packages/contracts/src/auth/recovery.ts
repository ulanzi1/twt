// packages/contracts/src/auth/recovery.ts
//
// Recovery-code consumption as the second factor (Story 1.9, AC-2). A consumed code
// is burned (single-use); the response only states whether authentication completed.

import { z } from 'zod';

export const RecoveryConsumeRequest = z
  .object({
    code: z.string().min(1).max(64),
  })
  .strict();
export type RecoveryConsumeRequest = z.output<typeof RecoveryConsumeRequest>;

export const RecoveryConsumeResponse = z
  .object({
    authenticated: z.literal(true),
  })
  .strict();
export type RecoveryConsumeResponse = z.output<typeof RecoveryConsumeResponse>;
