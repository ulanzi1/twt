// The correction chase's ONE 403 classifier (Story 6.19b; fourth-pass review 2026-10-01) — the must-act form, the
// letter forms and the screenshot link all read a 403 the same way.
//
// ⭐ A 403 is the ROLE — the page cannot see keys (1)/(7) (district-dimension; the session carries only the national
// grants) — so it reads "your role cannot", ⛔ never "Try again" (a retry that can never succeed). ⛔ EXCEPT the
// step-up signal (`auth.step_up_required`, also a 403): that one asks for a fresh code and is handled by its caller.

import { ApiError } from '../../api/client.js';

export const STEP_UP_REQUIRED_CODE = 'auth.step_up_required';

/** True for a 403 that means "your role cannot do this" — ⛔ false for the step-up signal. */
export function isRoleForbidden(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403 && err.code !== STEP_UP_REQUIRED_CODE;
}
