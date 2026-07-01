// packages/contracts/src/life-events/summary.ts
//
// The shared Life Events SUMMARY response (Story 3.9, Task 4). The `GET /member/life-events`
// contract — consumed by BOTH the API route (member-home-style read) and the api-client
// `lifeEventsSummary` method, and returned by the NEW address/posting POST routes so the client
// gets fresh panel state in one round-trip.
//
// NON-PII by construction: every field is a presence flag or a count — NEVER the raw address bytes,
// district-history, nominee names, or condition codes (R1 echo-back discipline). `.strict()`.

import { z } from 'zod';

/**
 * The panel-index summary: for each of the four sub-types, "has the member recorded one" + a count
 * where meaningful. Drives the panel index + the `useLifeEventsSummaryQuery` hook. `posting.is_retirement`
 * reflects the member's CURRENT (newest) posting row's retirement flag (Epic 4 Story 4.5 reads the
 * FIRST retirement row server-side; this is a display convenience only).
 */
export const LifeEventsSummaryResponse = z
  .object({
    nominees: z.object({ declared: z.boolean(), count: z.number().int().nonnegative() }).strict(),
    address: z.object({ recorded: z.boolean() }).strict(),
    posting: z.object({ recorded: z.boolean(), is_retirement: z.boolean() }).strict(),
    medical: z
      .object({ disclosed: z.boolean(), disclosure_count: z.number().int().nonnegative() })
      .strict(),
  })
  .strict();
export type LifeEventsSummaryResult = z.infer<typeof LifeEventsSummaryResponse>;
