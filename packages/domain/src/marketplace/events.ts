// Module Marketplace event vocabulary + Zod payload schemas — Story 12.1 (QE3; AC3).
//
// The `module.*` event types are a module lifecycle's WRITE vocabulary: every legal transition is a
// named, dotted `resource.action` event on the module's `events_log` stream (stream_id = module_id).
// These schemas validate the event PAYLOAD; AR-14's `timestamp` / `pariwar_id` / actor id are the
// `events_log` columns `occurred_at` / `pariwar_id` / `actor_id` and are ⛔ duplicated as payload keys
// (the genesis carries `module_id` / `pariwar_id` only because it snapshots the whole manifest — the AC3
// exception, ratified by BigDev 2026-10-31, review RVQ1).
//
// ── Why these live in @twt/domain (⛔ @twt/contracts) ────────────────────────────────────────────
// `@twt/events` depends on @twt/domain; the registry (packages/events/src/registry.ts) imports these
// schemas, and so does the projector (marketplace/project.ts). The helpdesk/events.ts rationale.
//
// ── PINNED SEAM — event-name delimiter: single-dot snake_case ─────────────────────────────────────
// `module.lead_submitted`, ⛔ the epic prose's `module.lead-submitted`: the merged registry's convention
// is snake_case after one dot (pool/events.ts "PINNED SEAM"; helpdesk/events.ts and alert/events.ts
// "Event-name delimiter"). Read the registry for spellings, ⛔ the epic (TR9). Renaming a shipped event
// type is a migration of every stream that carries it — the spelling is pinned here, once.
//
// ── Actors (QE3, I11) ─────────────────────────────────────────────────────────────────────────────
// The claim set: `member` / `operator` / `trustee` / `system` (`system` iff `events_log.actor_id` is
// NULL). A lead is the member's own consented act, so `module.lead_submitted` takes `actor: 'member'`
// ONLY — and its actor id must BE the member (checked by the command and the projector). Every other
// event refuses `member`: a member cannot author, schedule, activate or archive a module.
//
// `.strict()` everywhere: an unknown key is a defect — and on the lead, the reason a payload can never
// grow member PII (I9).

import { z } from 'zod';

import {
  MARKETPLACE_MODULE_ARCHIVE_REASONS,
  MARKETPLACE_MODULE_STATES,
  MODULE_MANIFEST_SCHEMA_VERSION,
} from '../schema/marketplace_modules.js';
import {
  EligibilityFilterV1Schema,
  ModuleBrandingBundleSchema,
  ScopeFilterV1Schema,
  moduleDescriptionSchema,
  moduleLeadHandoffUrlSchema,
  moduleNameSchema,
  moduleSigningKeySecretNameSchema,
  moduleSlotCapacitySchema,
  refineModuleWindow,
} from './filters.js';

/** WHO caused a module event (the architecture §1.14 audit shape) — the claim set. */
export const moduleActorSchema = z.enum(['member', 'operator', 'trustee', 'system']);
export type ModuleEventActor = z.infer<typeof moduleActorSchema>;

/** The actors every NON-lead event accepts (I11 — ⛔ `member`). */
export const moduleStaffActorSchema = z.enum(['operator', 'trustee', 'system']);
export type ModuleStaffActor = z.infer<typeof moduleStaffActorSchema>;

/** A module-lifecycle-state literal, derived from the one tuple in schema/marketplace_modules.ts. */
export const moduleStateSchema = z.enum(MARKETPLACE_MODULE_STATES);
export const moduleArchiveReasonSchema = z.enum(MARKETPLACE_MODULE_ARCHIVE_REASONS);

/**
 * A LOWER-CASE canonical uuid. The lead's `member_id` / `lead_id` key two TEXT-keyed unique indexes on
 * `events_log` (migration 0193), so an upper-case spelling of the same id would bypass them — QE8 refuses
 * it here instead of normalising it.
 */
export const LOWER_UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const lowerUuidSchema = z.string().regex(LOWER_UUID_REGEX, 'must be a lower-case uuid');

/** Freeform human-readable audit note — the commands COMPUTE it (⛔ caller input), e.g. `module.archive:<reason>`. */
const triggerSchema = z.string().min(1);

const isoInstantSchema = z.string().datetime({ offset: true });

/**
 * `module.authored` → `draft` (the genesis: (none) → draft). Owner: Story 12.2's wizard route (⛔ production
 * emitter in 12.1 — I6). The FIRST event of the stream; it snapshots the WHOLE manifest, so the module is
 * audit-replayable from its stream alone. The content keys are the QE5 columns in snake_case, held to the
 * SAME field schemas `parseModuleManifest` uses.
 */
export const ModuleAuthoredPayloadSchema = z
  .object({
    from_state: z.null(),
    to_state: z.literal('draft'),
    trigger: triggerSchema,
    actor: moduleStaffActorSchema,
    module_id: lowerUuidSchema,
    pariwar_id: lowerUuidSchema,
    manifest_schema_version: z.literal(MODULE_MANIFEST_SCHEMA_VERSION),
    partner_id: lowerUuidSchema,
    name_en: moduleNameSchema,
    name_hi: moduleNameSchema,
    description_en: moduleDescriptionSchema,
    description_hi: moduleDescriptionSchema,
    eligibility_filter: EligibilityFilterV1Schema,
    scope_filter: ScopeFilterV1Schema,
    valid_from: isoInstantSchema,
    valid_until: isoInstantSchema,
    slot_capacity: moduleSlotCapacitySchema,
    lead_handoff_url: moduleLeadHandoffUrlSchema,
    lead_handoff_signing_key_secret_name: moduleSigningKeySecretNameSchema,
    branding_bundle: ModuleBrandingBundleSchema,
  })
  .strict()
  // The SAME window rule as the manifest input (RV7): a hand-built genesis is refused at the registry too.
  .superRefine(refineModuleWindow);
export type ModuleAuthoredPayload = z.infer<typeof ModuleAuthoredPayloadSchema>;

/** `module.scheduled`: `draft` → `scheduled` (before `valid_from`). Owner: Story 12.2. */
export const ModuleScheduledPayloadSchema = z
  .object({
    from_state: z.literal('draft'),
    to_state: z.literal('scheduled'),
    trigger: triggerSchema,
    actor: moduleStaffActorSchema,
  })
  .strict();
export type ModuleScheduledPayload = z.infer<typeof ModuleScheduledPayloadSchema>;

/** `module.activated`: `draft` | `scheduled` → `active` (inside the window). Owner: Story 12.2 / 12.6
 *  (⚠ nothing activates a `scheduled` module yet — carried item C2 (b)). */
export const ModuleActivatedPayloadSchema = z
  .object({
    from_state: z.enum(['draft', 'scheduled']),
    to_state: z.literal('active'),
    trigger: triggerSchema,
    actor: moduleStaffActorSchema,
  })
  .strict();
export type ModuleActivatedPayload = z.infer<typeof ModuleActivatedPayloadSchema>;

/**
 * `module.lead_submitted`: `active` → `active` — a SAME-STATE event that takes one place (QE7). Owner:
 * Story 12.3's lead route. Carries ⛔ PII (I9): the member is identified only by a lower-case `member_id`;
 * lead PII belongs in Story 12.5's entity (carried item C8 (c)). `slots_remaining_after` is null for an
 * uncapped module and is present-and-nullable (⛔ optional), so "uncapped" never reads as "not recorded".
 */
export const ModuleLeadSubmittedPayloadSchema = z
  .object({
    lead_id: lowerUuidSchema,
    member_id: lowerUuidSchema,
    slots_remaining_after: z.number().int().nonnegative().nullable(),
    from_state: z.literal('active'),
    to_state: z.literal('active'),
    trigger: triggerSchema,
    actor: z.literal('member'),
  })
  .strict();
export type ModuleLeadSubmittedPayload = z.infer<typeof ModuleLeadSubmittedPayloadSchema>;

/** `module.archived`: `draft` | `scheduled` | `active` → `archived`, terminal in 12.1 (C3). Owner: Story
 *  12.2 (a trustee archive) / 12.6 (the `system` sweep). */
export const ModuleArchivedPayloadSchema = z
  .object({
    from_state: z.enum(['draft', 'scheduled', 'active']),
    to_state: z.literal('archived'),
    trigger: triggerSchema,
    actor: moduleStaffActorSchema,
    reason: moduleArchiveReasonSchema,
  })
  .strict();
export type ModuleArchivedPayload = z.infer<typeof ModuleArchivedPayloadSchema>;

// ── The event-type vocabulary + the type→schema map (single source) ────────────────────────────────

export const MODULE_EVENT_TYPES = [
  'module.authored',
  'module.scheduled',
  'module.activated',
  'module.lead_submitted',
  'module.archived',
] as const;

/** The dotted `module.*` event-type literal union (genesis + four). */
export type ModuleEventType = (typeof MODULE_EVENT_TYPES)[number];

/**
 * type → payload-schema map. The ONE place the events bind to their schemas; the projector and the
 * registry (packages/events) both consume it. `satisfies` keeps it exhaustive — adding a
 * `ModuleEventType` without a schema is a compile error.
 */
export const MODULE_EVENT_PAYLOAD_SCHEMAS = {
  'module.authored': ModuleAuthoredPayloadSchema,
  'module.scheduled': ModuleScheduledPayloadSchema,
  'module.activated': ModuleActivatedPayloadSchema,
  'module.lead_submitted': ModuleLeadSubmittedPayloadSchema,
  'module.archived': ModuleArchivedPayloadSchema,
} as const satisfies Record<ModuleEventType, z.ZodTypeAny>;
