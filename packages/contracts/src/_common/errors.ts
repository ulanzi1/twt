// packages/contracts/src/_common/errors.ts
//
// Structured error envelope per architecture §3.2 line 1819-1826.
// Namespaced error codes (dotted.resource.action) per architecture line 1829-1830.
// Per-domain enumeration lives at packages/contracts/src/errors/<domain>.ts
// (added by downstream Stories — claim.* at Story 6.x, pool.* at 7.x, etc.).

import { z } from 'zod';

/**
 * Namespaced error-code string of the form `<domain>.<action>` or
 * `<domain>.<action>.<sub>`. Examples (per architecture line 1829-1830):
 *   - 'pool.spawn.duplicate'
 *   - 'member.suspended'
 *   - 'claim.appeal.stage1_only'
 */
export type ErrorCode<
  D extends string = string,
  A extends string = string,
  S extends string | undefined = undefined,
> = S extends string ? `${D}.${A}.${S}` : `${D}.${A}`;

/**
 * Factory for typed error codes. Use at downstream Stories' enumeration files:
 *   export const POOL_SPAWN_DUPLICATE = defineErrorCode('pool', 'spawn', 'duplicate');
 *   //  ^? 'pool.spawn.duplicate' (literal type, not widened to string)
 */
export function defineErrorCode<D extends string, A extends string>(
  domain: D,
  action: A,
): ErrorCode<D, A>;
export function defineErrorCode<D extends string, A extends string, S extends string>(
  domain: D,
  action: A,
  sub: S,
): ErrorCode<D, A, S>;
export function defineErrorCode(domain: string, action: string, sub?: string): string {
  return sub === undefined ? `${domain}.${action}` : `${domain}.${action}.${sub}`;
}

/**
 * The wire envelope per architecture §3.2 line 1819-1826.
 * `request_id` is echoed in response headers + log lines + audit entries.
 */
export const ErrorResponse = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string(),
        details: z.unknown().optional(),
        request_id: z.string().uuid(),
      })
      .strict(),
  })
  .strict();

export type ErrorResponse = z.output<typeof ErrorResponse>;
