// Shared `errorText()` for the workplace LIST, the *"isn't listed"* QUEUE, its SUGGEST picker and the
// people-who-know-me CAMPAIGN control (Story 6.36c review) — one helper instead of three near-identical local
// copies, each closed over its own refusal-code map and its own forbidden/generic copy.

import { ApiError } from '../../api/client.js';

/**
 * Render a caught write/read error as the caller's own module copy: a refusal-code map hit first, else the
 * forbidden copy for a 403, else the generic fallback.
 */
export function errorText<Code extends string>(
  err: unknown,
  errors: Record<Code, string>,
  copy: { forbidden: string; generic: string },
): string {
  if (err instanceof ApiError) {
    if (err.code in errors) return errors[err.code as Code];
    if (err.isForbidden) return copy.forbidden;
  }
  return copy.generic;
}
