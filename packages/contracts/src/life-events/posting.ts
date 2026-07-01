// packages/contracts/src/life-events/posting.ts
//
// The Life Events POSTING (transfer-in/out) update transport DTO (Story 3.9, Task 4). The request
// shape for `POST /member/life-events/posting` — one of the four Life Events sub-types (FR-5).
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// Plain primitives + `.strict()`; NO `@twt/domain` import; NO `.openapi()` (match nominee/medical).
//
// ── PII posture (Dev Notes §"Posting PII tier") ───────────────────────────────────────
// A posting `district` is a GEOGRAPHIC location, NOT sensitive identity data → non-PII plaintext
// (safe in the request, the column, AND the event payload). `pariwarRef` is an optional forward-
// compat destination reference (a true cross-Pariwar tenant move is out of scope for v1-S).
// `isRetirement` is the Epic 4 Story 4.5 retirement anchor (non-PII boolean).

import { z } from 'zod';

/**
 * `POST /member/life-events/posting` — update the member's posting district (transfer-in/out).
 * Records the district change as a member attribute + `member.posting_updated` event ONLY — it does
 * NOT move the member across Pariwars (v1-S scope). `isRetirement` (default false client-side) maps
 * to `member_postings.is_retirement` + the event payload's `is_retirement`.
 */
export const PostingUpdateRequest = z
  .object({
    district: z.string().trim().min(1).max(200),
    pariwarRef: z.string().trim().min(1).max(200).optional(),
    isRetirement: z.boolean().optional(),
  })
  .strict();
export type PostingUpdateRequest = z.output<typeof PostingUpdateRequest>;
