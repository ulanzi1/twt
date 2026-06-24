// packages/contracts/src/terms-and-conditions/tc-version.ts
//
// Transport contracts for the T&C version registry (Story 2.6, AC10). These are
// the FIRST T&C endpoints, so the request/response DTOs register via `.openapi()`
// in scripts/emit-openapi.ts and `openapi/v1.yaml` CHANGES (expected — mirror the
// Story 2.4 clause endpoints).
//
// camelCase top-level fields mirror the domain Drizzle row
// (packages/domain/src/schema/terms_and_conditions_versions.ts) per the contracts
// convention; timestamps are Iso8601 strings (apps/api serialises Date at the
// transport boundary). The `legal_review_status` z.enum is value-aligned with the
// domain `tc_legal_review_status` pgEnum; `@twt/domain` cannot import this package
// (browser-bundle constraint — the domain root barrel re-exports `encryption`,
// which pulls `node:async_hooks` into a browser bundle), so
// tests/terms-and-conditions.test.ts asserts the lockstep (the BenefitMechanism
// precedent). The clause-pinning link table is an INTERNAL storage detail — the
// wire stays a flat `pinnedToClauseVersionIds` array (the API recomposes it).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { ClauseVersionIdSchema } from '../rules/clause.js';

/** Per-row T&C-version address (UUID), branded `TcVersionId`. */
export const TcVersionIdSchema = z.string().uuid().brand<'TcVersionId'>();
export type TcVersionIdSchema = z.output<typeof TcVersionIdSchema>;

/**
 * The legal-review lifecycle (AC1/AC5/AC6). Value-aligned with the domain
 * `tc_legal_review_status` pgEnum; the lockstep test is the anti-drift guard.
 */
export const TcLegalReviewStatusSchema = z.enum([
  'pending',
  'under-review',
  'reviewed-with-changes-required',
  'approved',
  'superseded',
]);
export type TcLegalReviewStatusSchema = z.output<typeof TcLegalReviewStatusSchema>;

/**
 * The T&C version response DTO — mirrors the domain `terms_and_conditions_versions`
 * row PLUS the flat `pinnedToClauseVersionIds` array the API folds in from the
 * `terms_and_conditions_pinned_clauses` junction (the link table is invisible on
 * the wire). `.strict()` rejects unknown keys (architecture §Format L3824-3826).
 */
export const TcVersionResponse = z
  .object({
    tcVersionId: TcVersionIdSchema,
    pariwarId: UuidString.brand<'PariwarId'>(),
    version: z.number().int().positive(),
    bodyMarkdown: z.string(),
    bodyHtmlRendered: z.string(),
    effectiveFrom: Iso8601Datetime,
    effectiveUntil: Iso8601Datetime.nullable(),
    legalReviewStatus: TcLegalReviewStatusSchema,
    legalReviewerActorId: UuidString.nullable(),
    authoredByActor: UuidString.nullable(),
    authoredAt: Iso8601Datetime,
    auditId: UuidString.nullable(),
    pinnedToClauseVersionIds: z.array(ClauseVersionIdSchema),
  })
  .strict();
export type TcVersionResponse = z.output<typeof TcVersionResponse>;

/**
 * Create a new T&C version (POST …/terms/versions). The API renders
 * `body_html_rendered` from `bodyMarkdown` at write time (the client never sends
 * HTML), decomposes `pinnedToClauseVersionIds` into link rows, and defaults
 * `legal_review_status` → `pending`. At least one pinned clause version is required.
 */
export const CreateTcVersionRequest = z
  .object({
    bodyMarkdown: z.string().min(1),
    pinnedToClauseVersionIds: z.array(ClauseVersionIdSchema).min(1),
    effectiveFrom: Iso8601Datetime,
  })
  .strict();
export type CreateTcVersionRequest = z.output<typeof CreateTcVersionRequest>;

/**
 * Approve a T&C version (POST …/terms/versions/:tcVersionId/approve). Carries
 * nothing the server cannot derive (the reviewer = the session actor) EXCEPT an
 * explicit `confirm` flag — the trustee affirming legal-counsel review is complete
 * (the ToneReviewSignoffRequest precedent).
 */
export const ApproveTcVersionRequest = z
  .object({
    confirm: z.literal(true),
  })
  .strict();
export type ApproveTcVersionRequest = z.output<typeof ApproveTcVersionRequest>;
