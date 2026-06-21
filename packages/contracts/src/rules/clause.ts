// packages/contracts/src/rules/clause.ts
//
// Transport contracts for the Niyamavali rule registry (Story 2.3, AC2/AC7).
// 2.3 adds NO endpoint (that is Story 2.4), so these are PLAIN `z.*` — NOT
// registered via `.openapi()` — and `openapi/v1.yaml` stays byte-identical
// (verified via `contracts:check-openapi-determinism`; the Story 1.16b precedent).
//
// camelCase top-level fields mirror the domain Drizzle row
// (packages/domain/src/schema/clause_versions.ts) per the contracts convention;
// JSONB sub-objects (payload, diff_document, affected_member_scope) keep their
// snake_case keys. Timestamps are Iso8601 strings (apps/api serialises Date at
// the transport boundary). The contracts package is the source-of-truth; the
// type-assignability test (tests/rules.test.ts) asserts the domain row projects
// onto `ClauseVersionResponse` (Top-10 anti-pattern #2 defense).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import { BenefitMechanism } from './benefit-mechanism.js';

/**
 * AC2 clause-id format pattern. DELIBERATELY re-declared here rather than imported
 * from `@twt/domain` (`ids.CLAUSE_ID_REGEX`): a contracts SOURCE file must NOT
 * import `@twt/domain`, because the domain root barrel re-exports `encryption`
 * (which imports `node:async_hooks`), and pulling that into a browser bundle
 * (apps/admin / apps/public) breaks `vite build`. This mirrors the `PariwarIdSchema`
 * re-declaration + the i18n `Locale` precedent (value-aligned, not symbol-identical).
 * Drift is prevented by `tests/rules.test.ts` asserting this pattern's `.source`
 * equals the domain `CLAUSE_ID_REGEX.source` (a TEST may import `@twt/domain`).
 */
export const CLAUSE_ID_PATTERN =
  /^niy\.[a-z0-9]+(?:-[a-z0-9]+)*\.[a-z0-9]+(?:-[a-z0-9]+)*(?:\.[a-z0-9]+(?:-[a-z0-9]+)*)?$/;

/**
 * AC2 clause-id transport primitive. Branded `ClauseId` (brand-name-aligned with
 * the domain TS brand — the `PariwarIdSchema` precedent).
 */
export const ClauseIdSchema = z.string().regex(CLAUSE_ID_PATTERN).brand<'ClauseId'>();
export type ClauseIdSchema = z.output<typeof ClauseIdSchema>;

/** Per-row clause-version address (UUID), branded `ClauseVersionId`. */
export const ClauseVersionIdSchema = z.string().uuid().brand<'ClauseVersionId'>();
export type ClauseVersionIdSchema = z.output<typeof ClauseVersionIdSchema>;

/**
 * The opaque structured rule content (freeze row 14 — stored/diffed/resolved,
 * never interpreted at the registry layer). A permissive record at the transport
 * boundary; Epic 4 owns the evaluated-rule shape.
 */
export const ClausePayloadSchema = z.record(z.unknown());
export type ClausePayloadSchema = z.output<typeof ClausePayloadSchema>;

/**
 * The clause/version response DTO — mirrors the domain `clause_versions` row.
 * `.strict()` rejects unknown keys (architecture §Format patterns L3824-3826).
 */
export const ClauseVersionResponse = z
  .object({
    clauseVersionId: ClauseVersionIdSchema,
    clauseId: ClauseIdSchema,
    pariwarId: UuidString.brand<'PariwarId'>(),
    version: z.number().int().positive(),
    effectiveDate: Iso8601Datetime,
    payload: ClausePayloadSchema,
    benefitMechanism: BenefitMechanism,
    predecessorClauseIds: z.array(ClauseVersionIdSchema),
    supersededByVersion: ClauseVersionIdSchema.nullable(),
    deprecatedAt: Iso8601Datetime.nullable(),
    authoredByActor: UuidString.nullable(),
    authoredAt: Iso8601Datetime,
    auditId: UuidString.nullable(),
  })
  .strict();
export type ClauseVersionResponse = z.output<typeof ClauseVersionResponse>;

/**
 * The architecture §1.10 affected-member-scope declaration (AC4 / Task 3). A
 * discriminated union on `kind`; snake_case JSONB keys. Value-aligned with the
 * domain `AffectedMemberScope` type + the domain `assertAffectedMemberScope`
 * structural guard (the `Locale` precedent — `@twt/domain` cannot import this).
 */
export const AffectedMemberScopeSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('all_members') }).strict(),
  z.object({ kind: z.literal('past_lockin') }).strict(),
  z
    .object({
      kind: z.literal('rule_subclause'),
      clause_id: ClauseIdSchema,
      subclause: z.string().min(1),
    })
    .strict(),
  z
    .object({
      kind: z.literal('named_cohort'),
      definition: z.string().min(1),
    })
    .strict(),
]);
export type AffectedMemberScopeSchema = z.output<typeof AffectedMemberScopeSchema>;

/**
 * The structured-payload diff document (AC4). Key-path maps. Loose at the
 * transport layer (the diff is opaque structural content).
 */
export const DiffDocumentSchema = z
  .object({
    added: z.record(z.unknown()),
    removed: z.record(z.unknown()),
    changed: z.record(z.object({ from: z.unknown(), to: z.unknown() })),
  })
  .strict();
export type DiffDocumentSchema = z.output<typeof DiffDocumentSchema>;

/** The amendment ledger response DTO — mirrors the domain `niyamavali_amendments` row. */
export const NiyamavaliAmendmentResponse = z
  .object({
    amendmentId: UuidString,
    pariwarId: UuidString.brand<'PariwarId'>(),
    fromClauseVersionId: ClauseVersionIdSchema,
    toClauseVersionId: ClauseVersionIdSchema,
    diffDocument: DiffDocumentSchema,
    affectedMemberScope: AffectedMemberScopeSchema,
    createdAt: Iso8601Datetime,
    auditId: UuidString.nullable(),
  })
  .strict();
export type NiyamavaliAmendmentResponse = z.output<typeof NiyamavaliAmendmentResponse>;

/**
 * AC7 dual-resolution query: a downstream consumer specifies EITHER `clauseId`
 * (current rule, optionally `asOf` a historical instant) XOR `clauseVersionId`
 * (exact historical version). The two strict members make the keys mutually
 * exclusive — supplying both is rejected.
 */
export const ClauseResolutionQuery = z.union([
  z.object({ clauseId: ClauseIdSchema, asOf: Iso8601Datetime.optional() }).strict(),
  z.object({ clauseVersionId: ClauseVersionIdSchema }).strict(),
]);
export type ClauseResolutionQuery = z.output<typeof ClauseResolutionQuery>;
