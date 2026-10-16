// Shared `errorText()` for the workplace LIST, the *"isn't listed"* QUEUE, its SUGGEST picker and the
// people-who-know-me CAMPAIGN control (Story 6.36c review) — one helper instead of three near-identical local
// copies, each closed over its own refusal-code map and its own forbidden/generic copy.

import { ApiError } from '../../api/client.js';

/**
 * Render a caught write/read error as the caller's own module copy: a refusal-code map hit first, else the "check the
 * fields" line for the API's zod 400 `request.validation` (code review round 2 — it used to fall to "could not be
 * saved", which reads as an outage), else the forbidden copy for a 403, else the generic fallback.
 */
export function errorText<Code extends string>(
  err: unknown,
  errors: Record<Code, string>,
  copy: { forbidden: string; generic: string; validation: string },
): string {
  if (err instanceof ApiError) {
    if (err.code in errors) return errors[err.code as Code];
    if (err.code === 'request.validation') return copy.validation;
    if (err.isForbidden) return copy.forbidden;
  }
  return copy.generic;
}
