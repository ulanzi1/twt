// Module Marketplace wire enums — Story 12.2 (Task 4; `2026-11-01-433`).
//
// RE-DECLARED here (⛔ imported from @twt/domain) for the bundle boundary ([[project_contracts_domain_bundle_boundary]] —
// a domain import leaks `pg` into the browser / Metro bundles). The domain owns the source tuples
// (`schema/marketplace_modules.ts`, `marketplace/filters.ts`, `schema/marketplace_module_publications.ts`); a TEST-ONLY
// sync-guard (tests/modules.test.ts) imports both and asserts they never drift.

import { z } from 'zod';

/** The module lifecycle (12.1 QE6): `draft → scheduled → active → archived`; `draft → active` too. */
export const MODULE_STATES = ['draft', 'scheduled', 'active', 'archived'] as const;
export const ModuleState = z.enum(MODULE_STATES);
export type ModuleState = z.output<typeof ModuleState>;

/** Why a module was archived (12.1 QE6). 12.2's withdraw is always `trustee_archived`. */
export const MODULE_ARCHIVE_REASONS = ['trustee_archived', 'valid_until_reached', 'slot_capacity_exhausted'] as const;
export const ModuleArchiveReason = z.enum(MODULE_ARCHIVE_REASONS);
export type ModuleArchiveReason = z.output<typeof ModuleArchiveReason>;

/** The member lifecycle states a `member_state_in` eligibility clause may name (every state except withdrawn / anonymized). */
export const MODULE_ELIGIBILITY_MEMBER_STATES = [
  'pending-kyc',
  'pending-fee',
  'pending-valid',
  'lock-in',
  'active',
  'active-in-grace',
  'lapsed-unpaid',
] as const;
export const ModuleEligibilityMemberState = z.enum(MODULE_ELIGIBILITY_MEMBER_STATES);
export type ModuleEligibilityMemberState = z.output<typeof ModuleEligibilityMemberState>;

/** The audience kinds v1 writes (`role` / `cohort` stay ABSENT — `-433` QE17). */
export const MODULE_SCOPE_KINDS = ['members-all', 'state', 'district'] as const;
export const ModuleScopeKind = z.enum(MODULE_SCOPE_KINDS);
export type ModuleScopeKind = z.output<typeof ModuleScopeKind>;

/** The publish event a publication records (QE7 (A): a future start schedules, otherwise it activates). */
export const MODULE_PUBLISHED_EVENT_TYPES = ['module.scheduled', 'module.activated'] as const;
export const ModulePublishedEventType = z.enum(MODULE_PUBLISHED_EVENT_TYPES);
export type ModulePublishedEventType = z.output<typeof ModulePublishedEventType>;

/** Where the no-tree / tree district options came from (QE5). */
export const MODULE_DISTRICT_SOURCES = ['geo_tree', 'workplace_districts'] as const;
export const ModuleDistrictSource = z.enum(MODULE_DISTRICT_SOURCES);
export type ModuleDistrictSource = z.output<typeof ModuleDistrictSource>;

/**
 * The step-up action context for PUBLISH — the ONLY 12.2 route that requires one (I5, QE10). Shared by the API gate and
 * the admin client because the gate compares a BARE STRING (TR9).
 */
export const MODULE_PUBLISH_STEP_UP_CONTEXT = 'module_publish';

/** The most scope values a module may name, and the longest one (12.1 QE9 — `MAX_SCOPE_VALUES` / `MAX_SCOPE_VALUE_LENGTH`). */
export const MODULE_MAX_SCOPE_VALUES = 200;
export const MODULE_MAX_SCOPE_VALUE_LENGTH = 120;
