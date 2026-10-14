// packages/contracts/src/life-events/posting.ts
//
// The Life Events POSTING (transfer-in/out) update transport DTO (Story 3.9, Task 4). The request
// shape for `POST /member/life-events/posting` — one of the four Life Events sub-types (FR-5).
//
// ⭐ Story 6.36a (Task 4; AC4; `2026-10-14-330` SW5–SW9) REPLACED the body by a THREE-WAY choice on `choice` —
// `workplace` (a listed school or office) · `not_listed` (*"my workplace isn't listed"*) · `retired` — plus
// `district_only` (today's free-text district box) ONLY in a Pariwar with ⛔ no imported list yet. The arms live in
// `members/workplace.ts`; this name is kept for the route and the api-client.
//
// ── Contracts discipline ──────────────────────────────────────────────────────────────
// Plain primitives + `.strict()`; NO `@twt/domain` import; NO `.openapi()` (match nominee/medical).
//
// ── PII posture (Dev Notes §"Posting PII tier") ───────────────────────────────────────
// A posting `district` is a GEOGRAPHIC location, NOT sensitive identity data → non-PII plaintext
// (safe in the request, the column, AND the event payload). `pariwarRef` is an optional forward-
// compat destination reference (a true cross-Pariwar tenant move is out of scope for v1-S) — kept on the
// `workplace`, `retired` and `district_only` arms (the data export reads it). A retirement is the Epic 4
// Story 4.5 anchor (non-PII boolean). The typed name of a `not_listed` answer ⛔ never reaches the event.

import { WorkplacePostingRequest } from '../members/workplace.js';

/**
 * `POST /member/life-events/posting` — record where the member now works (or that they retired), with the date it
 * began. Records the change as a member attribute + `member.posting_updated` event ONLY — it does NOT move the member
 * across Pariwars (v1-S scope). Requires an `Idempotency-Key` header.
 */
export const PostingUpdateRequest = WorkplacePostingRequest;
export type PostingUpdateRequest = WorkplacePostingRequest;
