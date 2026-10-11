// Story 6.28 (`2026-10-11-318` Q1 A, `2026-10-11-319` OP14 (b)) — one payment per death, on the wire. STAFF-ONLY, NON-PII.
//   · `FinallyApprovedElsewhere` — ONE additive field on every approval surface's read row (the freeze pending list, the
//     R9 panel, the Pariwar Admin's closure queue, the Super Admin's escalation detail): another claim of the death has
//     passed the final vote (`passed_final_vote` ⇒ the final approve is disabled) or is paid (`paid` ⇒ "Close this
//     claim"). The other claim by its SHORT REFERENCE only — ⛔ never its id, filer, nominee or name.
//   · The "Close this claim" action — `POST …/admin/cycle-freeze/claims/:claimCaseId/close-for-paid-death`. Its response
//     carries ⛔ no other claim's id (OP2's rule).

import { z } from 'zod';

export const FinallyApprovedElsewhere = z
  .object({
    claim_reference: z.string(),
    stage: z.enum(['passed_final_vote', 'paid']),
  })
  .strict();
export type FinallyApprovedElsewhere = z.output<typeof FinallyApprovedElsewhere>;

export const CloseForPaidDeathParams = z
  .object({
    pariwarId: z.string().uuid(),
    claimCaseId: z.string().uuid(),
  })
  .strict();
export type CloseForPaidDeathParams = z.output<typeof CloseForPaidDeathParams>;

export const CloseForPaidDeathResponse = z
  .object({
    /** `false` (⛔ no change) when ⛔ no payment is committed for the death, or the claim keeps its appeal / FQ5 holds it. */
    this_claim_closed: z.boolean(),
    /** How many claims of the death this action closed (this one included). */
    closed_count: z.number().int().nonnegative(),
  })
  .strict();
export type CloseForPaidDeathResponse = z.output<typeof CloseForPaidDeathResponse>;
