// Module Marketplace transport DTOs — Story 12.2 (Task 4; `2026-11-01-433` QE5, QE9, QE15, QE16, QE18; AC3–AC8).
//
// Pure Zod, `.strict()` throughout, snake_case wire. ⛔ `@twt/domain` import (the bundle boundary).
//
// ── REQUESTS ARE SHAPE-ONLY (QE18) ───────────────────────────────────────────────────────────────
// Types, `.strict()`, presence and GENEROUS max lengths as DoS bounds — ⛔ a copy of the content rules. The DOMAIN is
// the single content validator, so a content refusal surfaces as its own code (422 `module.manifest_invalid`,
// `module_partner.name_invalid`, …), ⛔ a Fastify 400 for a rule the DTO happens to mirror. ⚠ Shape INCLUDES every id a
// pre-check puts into SQL: `partner_id` is `.uuid()` (a non-UUID would reach the pre-check SQL, raise 22P02, abort the
// write transaction and answer 500 — TR19). The filters are free-form records here: a malformed `scope_filter` is left
// to the domain's manifest parse (AC4).
//
// ── ⚠ ADMIN SHAPE ────────────────────────────────────────────────────────────────────────────────
// Every response here is for the ADMIN console — it carries the lead hand-off URL and the signing-key secret NAME. ⛔
// Serve one to a member: the member shelf (12.3) field-picks its own shape. ⛔ Commission data anywhere (QE6 (A), I10).

import { z } from 'zod';

import { Iso8601Datetime, UuidString } from '../_common/primitives.js';
import {
  MODULE_MAX_SCOPE_VALUE_LENGTH,
  MODULE_MAX_SCOPE_VALUES,
  ModuleArchiveReason,
  ModuleDistrictSource,
  ModuleEligibilityMemberState,
  ModulePublishedEventType,
  ModuleState,
} from './enums.js';

// ── Requests ───────────────────────────────────────────────────────────────────

/** Register a partner (Idempotency-Key header required). The id is SERVER-minted (QE13). */
export const CreateModulePartnerRequest = z
  .object({
    display_name_en: z.string().max(1_000),
    display_name_hi: z.string().max(1_000),
  })
  .strict();
export type CreateModulePartnerRequest = z.output<typeof CreateModulePartnerRequest>;

/**
 * Author a module as a `draft` (Idempotency-Key header required). ⛔ `module_id` (server-minted — I3), ⛔
 * `branding_bundle` (QE8: the server writes the all-null bundle), ⛔ commission terms (QE6 (A)).
 */
export const AuthorModuleRequest = z
  .object({
    partner_id: UuidString,
    name_en: z.string().max(1_000),
    name_hi: z.string().max(1_000),
    description_en: z.string().max(10_000),
    description_hi: z.string().max(10_000),
    eligibility_filter: z.record(z.string(), z.unknown()),
    scope_filter: z.record(z.string(), z.unknown()),
    valid_from: z.string().max(64),
    valid_until: z.string().max(64),
    slot_capacity: z.number().nullable(),
    lead_handoff_url: z.string().max(4_096),
    lead_handoff_signing_key_secret_name: z.string().max(1_024),
  })
  .strict();
export type AuthorModuleRequest = z.output<typeof AuthorModuleRequest>;

/**
 * Publish a `draft` (a NON-author; step-up `module_publish`). Each tick is `z.literal(true)` — the memorial `calledBack`
 * precedent: the publisher attests the tone checklist (every section, and "I am not its author"), the Hindi review, and
 * that the partner agreement is signed and carries TWT's visual-discipline term (the UX activation gate).
 */
export const PublishModuleRequest = z
  .object({
    tone_checklist_confirmed: z.literal(true),
    hindi_reviewed: z.literal(true),
    partner_agreement_confirmed: z.literal(true),
  })
  .strict();
export type PublishModuleRequest = z.output<typeof PublishModuleRequest>;

/**
 * Withdraw a module (archive `trustee_archived`; ⛔ step-up — QE10). An EMPTY strict object: the admin client sends
 * `content-type: application/json` on every call and Fastify answers 400 to an empty JSON body, so the client sends `{}`.
 */
export const WithdrawModuleRequest = z.object({}).strict();
export type WithdrawModuleRequest = z.output<typeof WithdrawModuleRequest>;

/**
 * `GET …/modules` query. `limit` 1–200 (the forced-pagination gate needs a finite maximum); `cursor` is OPAQUE and only
 * DoS-bounded here (`.max(1024)`) — the domain's STRICT decode answers 400 `module.cursor_invalid` for anything malformed,
 * an over-long-but-DTO-valid cursor included (QE16).
 */
export const ModuleListQuery = z
  .object({
    state: ModuleState.optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    cursor: z.string().max(1_024).optional(),
  })
  .strict();
export type ModuleListQuery = z.output<typeof ModuleListQuery>;

/** `GET …/modules/partners` query — `limit` 1–200, default 200; ⛔ cursor (a Pariwar with > 200 partners is carried). */
export const ModulePartnerListQuery = z
  .object({ limit: z.coerce.number().int().min(1).max(200).optional() })
  .strict();
export type ModulePartnerListQuery = z.output<typeof ModulePartnerListQuery>;

// ── Shared response pieces ───────────────────────────────────────────────────────────

const ScopeValues = z.array(z.string().min(1).max(MODULE_MAX_SCOPE_VALUE_LENGTH)).min(1).max(MODULE_MAX_SCOPE_VALUES);

/** The audience grammar as stored (12.1 `ScopeFilterV1`). */
export const ModuleScopeFilterDto = z.discriminatedUnion('scope', [
  z.object({ version: z.literal(1), scope: z.literal('members-all') }).strict(),
  z.object({ version: z.literal(1), scope: z.literal('state'), values: ScopeValues }).strict(),
  z.object({ version: z.literal(1), scope: z.literal('district'), values: ScopeValues }).strict(),
]);
export type ModuleScopeFilterDto = z.output<typeof ModuleScopeFilterDto>;

/** The eligibility grammar as stored (12.1 `EligibilityFilterV1`) — ZERO clauses = no restriction beyond the audience. */
export const ModuleEligibilityFilterDto = z
  .object({
    version: z.literal(1),
    clauses: z
      .array(
        z.object({ kind: z.literal('member_state_in'), states: z.array(ModuleEligibilityMemberState).min(1) }).strict(),
      )
      .max(8),
  })
  .strict();
export type ModuleEligibilityFilterDto = z.output<typeof ModuleEligibilityFilterDto>;

/** The partner presentation bundle as stored. 12.2 always writes the all-null bundle (QE8). */
export const ModuleBrandingBundleDto = z
  .object({
    version: z.literal(1),
    logo_object_key: z.string().nullable(),
    accent_color_hex: z.string().nullable(),
  })
  .strict();

// ── Partners ───────────────────────────────────────────────────────────────────

export const ModulePartnerResponse = z
  .object({
    partner_id: UuidString,
    display_name_en: z.string(),
    display_name_hi: z.string(),
    created_at: Iso8601Datetime,
  })
  .strict();
export type ModulePartnerResponse = z.output<typeof ModulePartnerResponse>;

/** This Pariwar's partners, A–Z by English name, at most 200 (⛔ cursor — carried). */
export const ModulePartnerListResponse = z.object({ items: z.array(ModulePartnerResponse) }).strict();
export type ModulePartnerListResponse = z.output<typeof ModulePartnerListResponse>;

// ── Scope options (QE5) ───────────────────────────────────────────────────────────────

export const ModuleScopeOptionDto = z
  .object({
    value: z.string(),
    state: z.string().nullable(),
    usable: z.boolean(),
    unusable_reason: z.enum(['too_long']).nullable(),
  })
  .strict();
export type ModuleScopeOptionDto = z.output<typeof ModuleScopeOptionDto>;

/** A SINGLE object (⛔ a collection): the picker's states and districts, where the districts came from, and truncation. */
export const ModuleScopeOptionsResponse = z
  .object({
    geo_tree_version: z.number().int().nullable(),
    states: z.array(ModuleScopeOptionDto),
    districts: z.array(ModuleScopeOptionDto),
    district_source: ModuleDistrictSource,
    districts_truncated: z.boolean(),
  })
  .strict();
export type ModuleScopeOptionsResponse = z.output<typeof ModuleScopeOptionsResponse>;

// ── Modules ───────────────────────────────────────────────────────────────────

/** One row of the admin list. */
export const ModuleSummaryResponse = z
  .object({
    module_id: UuidString,
    partner_id: UuidString,
    name_en: z.string(),
    name_hi: z.string(),
    current_state: ModuleState,
    archive_reason: ModuleArchiveReason.nullable(),
    valid_from: Iso8601Datetime,
    valid_until: Iso8601Datetime,
    slot_capacity: z.number().int().nullable(),
    slots_remaining: z.number().int().nullable(),
    created_at: Iso8601Datetime,
  })
  .strict();
export type ModuleSummaryResponse = z.output<typeof ModuleSummaryResponse>;

/** A page of the admin list, newest first; `next_cursor` is opaque (pass it back as `cursor`), null on the last page. */
export const ModuleListResponse = z
  .object({ items: z.array(ModuleSummaryResponse), next_cursor: z.string().nullable() })
  .strict();
export type ModuleListResponse = z.output<typeof ModuleListResponse>;

/** Who published a module, against which copy — or null for an unpublished draft. */
export const ModulePublicationDto = z
  .object({
    published_event_type: ModulePublishedEventType,
    reviewer_display_name: z.string(),
    reviewed_at: Iso8601Datetime,
    hindi_reviewed: z.literal(true),
    partner_agreement_confirmed: z.literal(true),
    tone_signoff_content_hash: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict();
export type ModulePublicationDto = z.output<typeof ModulePublicationDto>;

/**
 * One module, ADMIN SHAPE: the manifest, its partner's names, its state, its author (a display name — a fallback label
 * when none is recorded), whether the VIEWER wrote it (the UI disables Publish — QE9; `true` when the author is unknown,
 * so the UI fails closed), its publication, and how many members registered interest (the C10 warning — QE15).
 */
export const ModuleDetailResponse = z
  .object({
    module_id: UuidString,
    pariwar_id: UuidString,
    partner_id: UuidString,
    partner_display_name_en: z.string(),
    partner_display_name_hi: z.string(),
    name_en: z.string(),
    name_hi: z.string(),
    description_en: z.string(),
    description_hi: z.string(),
    eligibility_filter: ModuleEligibilityFilterDto,
    scope_filter: ModuleScopeFilterDto,
    valid_from: Iso8601Datetime,
    valid_until: Iso8601Datetime,
    slot_capacity: z.number().int().nullable(),
    slots_remaining: z.number().int().nullable(),
    lead_handoff_url: z.string(),
    lead_handoff_signing_key_secret_name: z.string(),
    branding_bundle: ModuleBrandingBundleDto,
    current_state: ModuleState,
    archive_reason: ModuleArchiveReason.nullable(),
    created_at: Iso8601Datetime,
    updated_at: Iso8601Datetime,
    author_display_name: z.string(),
    authored_by_viewer: z.boolean(),
    publication: ModulePublicationDto.nullable(),
    lead_count: z.number().int().nonnegative(),
  })
  .strict();
export type ModuleDetailResponse = z.output<typeof ModuleDetailResponse>;

/** `POST …/modules` — the new draft's server-minted id. */
export const AuthorModuleResponse = z.object({ module_id: UuidString, state: z.literal('draft') }).strict();
export type AuthorModuleResponse = z.output<typeof AuthorModuleResponse>;

/** `POST …/modules/:id/publish` — `scheduled` for a future start, else `active`. */
export const PublishModuleResponse = z
  .object({
    module_id: UuidString,
    state: z.enum(['scheduled', 'active']),
    published_event_type: ModulePublishedEventType,
  })
  .strict();
export type PublishModuleResponse = z.output<typeof PublishModuleResponse>;

/** `POST …/modules/:id/withdraw`. */
export const WithdrawModuleResponse = z.object({ module_id: UuidString, state: z.literal('archived') }).strict();
export type WithdrawModuleResponse = z.output<typeof WithdrawModuleResponse>;
