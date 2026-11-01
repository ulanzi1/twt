// Module Marketplace contracts — Story 12.2 (Task 4; AC13).
//
// TWO jobs: (1) the test-only sync-guard binding the re-declared wire tuples to the @twt/domain source tuples (contracts
// cannot import domain in SHIPPED files — the bundle boundary — so this test, which never ships, is the drift guard);
// (2) the request DTOs are SHAPE-only and `.strict()` (QE18), and the responses refuse a stray field.

import { marketplace, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  AuthorModuleRequest,
  CreateModulePartnerRequest,
  MODULE_ARCHIVE_REASONS,
  MODULE_DISTRICT_SOURCES,
  MODULE_ELIGIBILITY_MEMBER_STATES,
  MODULE_MAX_SCOPE_VALUE_LENGTH,
  MODULE_MAX_SCOPE_VALUES,
  MODULE_PUBLISHED_EVENT_TYPES,
  MODULE_PUBLISH_STEP_UP_CONTEXT,
  MODULE_SCOPE_KINDS,
  MODULE_STATES,
  ModuleListResponse,
  ModuleScopeFilterDto,
  PublishModuleRequest,
  WithdrawModuleRequest,
} from '../src/modules/index.js';

describe('modules contract ↔ domain sync-guard', () => {
  it('the state / archive-reason / eligibility tuples equal the domain tuples', () => {
    expect([...MODULE_STATES]).toEqual([...schema.MARKETPLACE_MODULE_STATES]);
    expect([...MODULE_ARCHIVE_REASONS]).toEqual([...schema.MARKETPLACE_MODULE_ARCHIVE_REASONS]);
    expect([...MODULE_ELIGIBILITY_MEMBER_STATES]).toEqual([...marketplace.ELIGIBILITY_MEMBER_STATES]);
    expect([...MODULE_PUBLISHED_EVENT_TYPES]).toEqual([...schema.MODULE_PUBLISHED_EVENT_TYPES]);
  });

  it('the scope kinds equal the domain ScopeFilterV1 discriminants, and the scope bounds equal the domain constants', () => {
    expect([...MODULE_SCOPE_KINDS]).toEqual(marketplace.ScopeFilterV1Schema.options.map((o) => o.shape.scope.value));
    expect(MODULE_MAX_SCOPE_VALUES).toBe(marketplace.MAX_SCOPE_VALUES);
    expect(MODULE_MAX_SCOPE_VALUE_LENGTH).toBe(marketplace.MAX_SCOPE_VALUE_LENGTH);
  });

  it('the district sources are exactly what buildModuleScopeOptions can return', () => {
    const fromTree = marketplace.buildModuleScopeOptions({ version: 1, document: { version: 1, nodes: [] } }, { items: [], hasMore: false });
    const noTree = marketplace.buildModuleScopeOptions(null, { items: [], hasMore: false });
    expect([fromTree.districtSource, noTree.districtSource].sort()).toEqual([...MODULE_DISTRICT_SOURCES].sort());
  });

  it('the publish step-up context is the bare string the gate compares (TR9)', () => {
    expect(MODULE_PUBLISH_STEP_UP_CONTEXT).toBe('module_publish');
  });
});

describe('modules request DTOs — shape-only and strict (QE18)', () => {
  const author = {
    partner_id: '0f8fad5b-d9cb-469f-a165-70867728950e',
    name_en: 'x',
    name_hi: 'x',
    description_en: 'x',
    description_hi: 'x',
    eligibility_filter: { version: 1, clauses: [] },
    scope_filter: { version: 9, scope: 'role' },
    valid_from: 'not a date',
    valid_until: 'not a date',
    slot_capacity: -3,
    lead_handoff_url: 'http://x',
    lead_handoff_signing_key_secret_name: '!!',
  };

  it('AuthorModuleRequest accepts content the DOMAIN refuses (the domain is the content validator)', () => {
    expect(AuthorModuleRequest.safeParse(author).success).toBe(true);
  });

  it('AuthorModuleRequest refuses a non-UUID partner_id, a module_id, a branding_bundle and an unknown key', () => {
    expect(AuthorModuleRequest.safeParse({ ...author, partner_id: 'nope' }).success).toBe(false);
    expect(AuthorModuleRequest.safeParse({ ...author, module_id: author.partner_id }).success).toBe(false);
    expect(AuthorModuleRequest.safeParse({ ...author, branding_bundle: {} }).success).toBe(false);
    expect(AuthorModuleRequest.safeParse({ ...author, commission_terms: 'x' }).success).toBe(false);
  });

  it('PublishModuleRequest needs all three ticks TRUE; WithdrawModuleRequest is an empty strict object', () => {
    const ok = { tone_checklist_confirmed: true, hindi_reviewed: true, partner_agreement_confirmed: true };
    expect(PublishModuleRequest.safeParse(ok).success).toBe(true);
    for (const k of Object.keys(ok)) {
      expect(PublishModuleRequest.safeParse({ ...ok, [k]: false }).success).toBe(false);
      const without: Record<string, unknown> = { ...ok };
      delete without[k];
      expect(PublishModuleRequest.safeParse(without).success).toBe(false);
    }
    expect(WithdrawModuleRequest.safeParse({}).success).toBe(true);
    expect(WithdrawModuleRequest.safeParse({ reason: 'x' }).success).toBe(false);
  });

  it('CreateModulePartnerRequest is shape-only and strict', () => {
    expect(CreateModulePartnerRequest.safeParse({ display_name_en: '', display_name_hi: '' }).success).toBe(true);
    expect(CreateModulePartnerRequest.safeParse({ display_name_en: 'a', display_name_hi: 'b', partner_id: 'x' }).success).toBe(false);
  });
});

describe('modules response DTOs', () => {
  it('ModuleScopeFilterDto is the stored grammar (role / cohort absent)', () => {
    expect(ModuleScopeFilterDto.safeParse({ version: 1, scope: 'members-all' }).success).toBe(true);
    expect(ModuleScopeFilterDto.safeParse({ version: 1, scope: 'district', values: ['Patna'] }).success).toBe(true);
    expect(ModuleScopeFilterDto.safeParse({ version: 1, scope: 'role', values: ['x'] }).success).toBe(false);
  });

  it('ModuleListResponse is { items, next_cursor } and strict', () => {
    expect(ModuleListResponse.safeParse({ items: [], next_cursor: null }).success).toBe(true);
    expect(ModuleListResponse.safeParse({ items: [], next_cursor: null, total: 0 }).success).toBe(false);
  });
});
