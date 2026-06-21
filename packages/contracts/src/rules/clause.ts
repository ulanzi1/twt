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

// ─────────────────────────────────────────────────────────────────────────────
// Story 2.4 — the Niyamavali amendment-workflow ENDPOINT DTOs.
//
// These are the FIRST niyamavali endpoints, so they register via `.openapi()` in
// scripts/emit-openapi.ts and `openapi/v1.yaml` CHANGES (unlike 2.3's plain-z.*
// components-free additions). The two enums are value-aligned with the domain
// `clause_draft_operation` / `clause_draft_status` pgEnums; `@twt/domain` cannot
// import this package (browser-bundle constraint), so tests/rules.test.ts asserts
// the lockstep (the BenefitMechanism precedent). Per-row clause-draft id is a UUID.
// ─────────────────────────────────────────────────────────────────────────────

/** Per-row clause-draft address (UUID), branded `ClauseDraftId`. */
export const ClauseDraftIdSchema = z.string().uuid().brand<'ClauseDraftId'>();
export type ClauseDraftIdSchema = z.output<typeof ClauseDraftIdSchema>;

/** The draft operation the trustee is performing (2.4 surfaces create + amend only). */
export const ClauseDraftOperationSchema = z.enum(['create', 'amend']);
export type ClauseDraftOperationSchema = z.output<typeof ClauseDraftOperationSchema>;

/** The draft lifecycle state (ADR-0021 state machine). */
export const ClauseDraftStatusSchema = z.enum([
  'draft',
  'in_review',
  'signed_off',
  'published',
  'discarded',
]);
export type ClauseDraftStatusSchema = z.output<typeof ClauseDraftStatusSchema>;

/**
 * Create a brand-new clause draft (operation `create`). `affected_member_scope` is
 * NOT carried — a brand-new clause affects no prior member (the server forces null).
 * The `clause_id` format/uniqueness is authoritatively checked at PUBLISH by
 * `createClause` (the 409 seam); the draft-create may pre-check + surface early.
 */
export const CreateClauseDraftRequest = z
  .object({
    operation: z.literal('create'),
    clauseId: ClauseIdSchema,
    payload: ClausePayloadSchema,
    effectiveDate: Iso8601Datetime,
    benefitMechanism: BenefitMechanism,
  })
  .strict();
export type CreateClauseDraftRequest = z.output<typeof CreateClauseDraftRequest>;

/**
 * Amend an existing clause via a draft (operation `amend`). `affected_member_scope`
 * is REQUIRED (architecture §1.10). `benefitMechanism` is optional — when omitted the
 * server defaults it to the prior published version's mechanism.
 */
export const AmendClauseDraftRequest = z
  .object({
    operation: z.literal('amend'),
    clauseId: ClauseIdSchema,
    payload: ClausePayloadSchema,
    effectiveDate: Iso8601Datetime,
    affectedMemberScope: AffectedMemberScopeSchema,
    benefitMechanism: BenefitMechanism.optional(),
  })
  .strict();
export type AmendClauseDraftRequest = z.output<typeof AmendClauseDraftRequest>;

/**
 * The POST /clauses/drafts body — a discriminated union on `operation` so the
 * server dispatches create vs amend with full type-narrowing + per-arm validation.
 */
export const CreateDraftBody = z.discriminatedUnion('operation', [
  CreateClauseDraftRequest,
  AmendClauseDraftRequest,
]);
export type CreateDraftBody = z.output<typeof CreateDraftBody>;

/**
 * Edit an existing draft (PUT /clauses/drafts/:draftId). A partial patch — any
 * supplied field is updated; the server RESETS the draft to `draft` + clears the
 * tone-review sign-off on ANY edit (content-bound sign-off, AC1d). `null` on
 * `affectedMemberScope` clears it.
 */
export const UpdateClauseDraftRequest = z
  .object({
    payload: ClausePayloadSchema.optional(),
    effectiveDate: Iso8601Datetime.optional(),
    benefitMechanism: BenefitMechanism.optional(),
    affectedMemberScope: AffectedMemberScopeSchema.nullable().optional(),
  })
  .strict();
export type UpdateClauseDraftRequest = z.output<typeof UpdateClauseDraftRequest>;

/**
 * The reviewer sign-off body (POST /clauses/drafts/:draftId/tone-review). Carries
 * nothing the server cannot derive (reviewer = session actor; content hash = the
 * current payload) EXCEPT an explicit `confirm` flag — the reviewer affirming they
 * applied the tone-review checklist (docs/tone-review-checklist.md).
 */
export const ToneReviewSignoffRequest = z
  .object({
    confirm: z.literal(true),
  })
  .strict();
export type ToneReviewSignoffRequest = z.output<typeof ToneReviewSignoffRequest>;

/** The draft response DTO — mirrors the domain `clause_drafts` row. `.strict()`. */
export const ClauseDraftResponse = z
  .object({
    draftId: ClauseDraftIdSchema,
    pariwarId: UuidString.brand<'PariwarId'>(),
    clauseId: ClauseIdSchema,
    operation: ClauseDraftOperationSchema,
    payload: ClausePayloadSchema,
    effectiveDate: Iso8601Datetime,
    benefitMechanism: BenefitMechanism,
    affectedMemberScope: AffectedMemberScopeSchema.nullable(),
    status: ClauseDraftStatusSchema,
    authoredByActor: UuidString,
    toneReviewedBy: UuidString.nullable(),
    toneReviewedAt: Iso8601Datetime.nullable(),
    toneReviewContentHash: z.string().nullable(),
    publishedClauseVersionId: ClauseVersionIdSchema.nullable(),
    createdAt: Iso8601Datetime,
    updatedAt: Iso8601Datetime,
    auditId: UuidString.nullable(),
  })
  .strict();
export type ClauseDraftResponse = z.output<typeof ClauseDraftResponse>;

/**
 * One field-aligned row of the rendered-content diff (AC1c). The payload is OPAQUE
 * (freeze row 14), so this is a DISPLAY-FIELD rendering — readable `key: value`
 * before/after strings — NOT a rule interpretation. `before`/`after` are null when
 * the field is absent on that side (added / removed).
 */
export const RenderedDiffRow = z
  .object({
    field: z.string(),
    before: z.string().nullable(),
    after: z.string().nullable(),
    changed: z.boolean(),
  })
  .strict();
export type RenderedDiffRow = z.output<typeof RenderedDiffRow>;

/**
 * The diff-preview response (GET /clauses/drafts/:draftId/diff, AC1c): BOTH the
 * structured-payload diff (`computePayloadDiff`) AND the rendered-content diff.
 */
export const DiffPreviewResponse = z
  .object({
    structuredDiff: DiffDocumentSchema,
    renderedDiff: z.array(RenderedDiffRow),
  })
  .strict();
export type DiffPreviewResponse = z.output<typeof DiffPreviewResponse>;

/**
 * The publish response (POST /clauses/drafts/:draftId/publish). The newly-minted
 * immutable version coordinates + the audit line id (AC2/AC5 — `auditId` is
 * NON-null: no published clause exists without an audit line).
 */
export const PublishClauseResponse = z
  .object({
    clauseVersionId: ClauseVersionIdSchema,
    clauseId: ClauseIdSchema,
    version: z.number().int().positive(),
    auditId: UuidString,
  })
  .strict();
export type PublishClauseResponse = z.output<typeof PublishClauseResponse>;
