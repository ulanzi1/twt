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
  MODULE_LEAD_ROUTES,
  MODULE_PARTNER_FORM_COUNT_KINDS,
  MODULE_PARTNER_FORM_STAGE_LABEL_MAX,
  MODULE_PARTNER_FORM_STAGES_MAX,
  MODULE_MAX_SCOPE_VALUE_LENGTH,
  MODULE_MAX_SCOPE_VALUES,
  MODULE_PUBLISHED_EVENT_TYPES,
  MODULE_PUBLISH_STEP_UP_CONTEXT,
  MODULE_SCOPE_KINDS,
  MODULE_STATES,
  ModuleEligibilityFilterDto,
  ModuleListResponse,
  ModuleScopeFilterDto,
  ModuleCountTotalDto,
  ModuleFlooredFigureDto,
  ModulePartnerFormFiguresDto,
  ModuleScopeOptionDto,
  PublishModuleRequest,
  RecordPartnerFormTotalsRequest,
  WithdrawModuleRequest,
} from '../src/modules/index.js';

describe('modules contract ↔ domain sync-guard', () => {
  it('the state / archive-reason / eligibility tuples equal the domain tuples', () => {
    expect([...MODULE_STATES]).toEqual([...schema.MARKETPLACE_MODULE_STATES]);
    expect([...MODULE_ARCHIVE_REASONS]).toEqual([...schema.MARKETPLACE_MODULE_ARCHIVE_REASONS]);
    expect([...MODULE_ELIGIBILITY_MEMBER_STATES]).toEqual([...marketplace.ELIGIBILITY_MEMBER_STATES]);
    expect([...MODULE_PUBLISHED_EVENT_TYPES]).toEqual([...schema.MODULE_PUBLISHED_EVENT_TYPES]);
  });

  it('Story 12.5b: the route, the count kinds and the totals bounds equal the domain\'s; the figures DTO carries exactly the kinds', () => {
    expect([...MODULE_LEAD_ROUTES]).toEqual([...schema.MARKETPLACE_MODULE_LEAD_ROUTES]);
    expect([...MODULE_PARTNER_FORM_COUNT_KINDS]).toEqual([...schema.PARTNER_FORM_COUNT_KINDS]);
    expect(MODULE_PARTNER_FORM_STAGES_MAX).toBe(schema.PARTNER_FORM_STAGES_MAX);
    expect(MODULE_PARTNER_FORM_STAGE_LABEL_MAX).toBe(schema.PARTNER_FORM_STAGE_LABEL_MAX);
    // The DTO is refined (RD1's second floor), so its object is the effect's inner type.
    const figures = ModulePartnerFormFiguresDto.innerType();
    expect(Object.keys(figures.shape.counts.shape).sort()).toEqual([...MODULE_PARTNER_FORM_COUNT_KINDS].sort());
  });

  it('the scope kinds equal the domain ScopeFilterV1 discriminants, and the scope bounds equal the domain constants', () => {
    expect([...MODULE_SCOPE_KINDS]).toEqual(marketplace.ScopeFilterV1Schema.options.map((o) => o.shape.scope.value));
    expect(MODULE_MAX_SCOPE_VALUES).toBe(marketplace.MAX_SCOPE_VALUES);
    expect(MODULE_MAX_SCOPE_VALUE_LENGTH).toBe(marketplace.MAX_SCOPE_VALUE_LENGTH);
  });

  // 12.2 review RB5: the response DTOs RE-DECLARE the eligibility grammar and the unusable reasons, so a clause kind or a
  // reason added in the domain within `version: 1` would fail the strict response serializer (a 500 on the detail GET /
  // the scope options) with CI green. Compared, each read off the live schema objects: the clause KINDS, the clause CAP,
  // the `member_state_in` clause's STATES enum, and the unusable REASONS. NOT compared: the other refinements (the
  // domain's uniqueness checks, `.min(1)`, field-level bounds) — a stricter domain cannot 500 the response.
  it('the detail DTO\'s eligibility clause kinds, clause cap and member states equal the domain EligibilityFilterV1 (RB5)', () => {
    // The DTO declares v1's ONE clause as a plain object; a second kind makes it a union, and this line with it.
    const dtoClause = ModuleEligibilityFilterDto.shape.clauses.element;
    expect([dtoClause.shape.kind.value]).toEqual(marketplace.EligibilityClauseSchema.options.map((o) => o.shape.kind.value));
    // Review PT17: the states the clause may name — the DTO's own enum against the domain clause's (under its `superRefine`).
    expect([...dtoClause.shape.states.element.options]).toEqual([
      ...marketplace.MemberStateInClauseSchema.shape.states.innerType().element.options,
    ]);
    expect(ModuleEligibilityFilterDto.shape.clauses._def.maxLength?.value).toBe(marketplace.MAX_ELIGIBILITY_CLAUSES);
    // The domain's array sits under its uniqueness `superRefine` (a ZodEffects).
    expect(marketplace.EligibilityFilterV1Schema.shape.clauses.innerType()._def.maxLength?.value).toBe(marketplace.MAX_ELIGIBILITY_CLAUSES);
  });

  it('the scope option DTO\'s unusable_reason enum equals the domain\'s reasons (RB5)', () => {
    const reason = ModuleScopeOptionDto.shape.unusable_reason;
    expect(reason.isNullable()).toBe(true);
    expect([...reason.unwrap().options]).toEqual([...marketplace.MODULE_SCOPE_OPTION_UNUSABLE_REASONS]);
    // …and the domain's builder emits only those (a too-long place, and a usable one).
    const built = marketplace.buildModuleScopeOptions(null, { items: ['Patna', 'x'.repeat(MODULE_MAX_SCOPE_VALUE_LENGTH + 1)], hasMore: false });
    for (const o of built.districts) {
      const wire = { value: o.value, state: o.state, usable: o.usable, unusable_reason: o.unusableReason };
      expect(ModuleScopeOptionDto.safeParse(wire).success).toBe(true);
    }
    expect(built.districts.map((o) => o.unusableReason).sort()).toEqual([null, 'too_long'].sort());
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
    lead_route: 'trust_sends',
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

  it('Story 12.5b: AuthorModuleRequest requires lead_route (⛔ default) and takes the route fields as nullable', () => {
    const noRoute: Record<string, unknown> = { ...author };
    delete noRoute['lead_route'];
    expect(AuthorModuleRequest.safeParse(noRoute).success).toBe(false);
    expect(AuthorModuleRequest.safeParse({ ...author, lead_route: 'both' }).success).toBe(false);
    expect(
      AuthorModuleRequest.safeParse({
        ...author,
        lead_route: 'partner_form',
        partner_form_url: 'https://partner.example/apply?offer=x',
        lead_handoff_url: null,
        lead_handoff_signing_key_secret_name: null,
        slot_capacity: null,
      }).success,
    ).toBe(true);
  });

  it('PublishModuleRequest needs all three ticks TRUE and the publisher\'s lead_route; WithdrawModuleRequest is an empty strict object', () => {
    const ticks = { tone_checklist_confirmed: true, hindi_reviewed: true, partner_agreement_confirmed: true };
    const ok = { ...ticks, lead_route: 'partner_form' };
    expect(PublishModuleRequest.safeParse(ok).success).toBe(true);
    // Story 12.5b (QE6 (A)) — ⛔ default: a publish without the route is refused.
    expect(PublishModuleRequest.safeParse(ticks).success).toBe(false);
    for (const k of Object.keys(ticks)) {
      expect(PublishModuleRequest.safeParse({ ...ok, [k]: false }).success).toBe(false);
      const without: Record<string, unknown> = { ...ok };
      delete without[k];
      expect(PublishModuleRequest.safeParse(without).success).toBe(false);
    }
    expect(WithdrawModuleRequest.safeParse({}).success).toBe(true);
    expect(WithdrawModuleRequest.safeParse({ reason: 'x' }).success).toBe(false);
  });

  it('Story 12.5b: RecordPartnerFormTotalsRequest — 1–20 stages of a label and a whole number; ⛔ a member key', () => {
    const ok = { period_start: '2026-11-01', period_end: '2026-11-30', stages: [{ label: 'Started', figure: 3 }] };
    expect(RecordPartnerFormTotalsRequest.safeParse(ok).success).toBe(true);
    expect(RecordPartnerFormTotalsRequest.safeParse({ ...ok, stages: [] }).success).toBe(false);
    expect(RecordPartnerFormTotalsRequest.safeParse({ ...ok, stages: Array.from({ length: 21 }, () => ({ label: 'S', figure: 9 })) }).success).toBe(false);
    expect(RecordPartnerFormTotalsRequest.safeParse({ ...ok, stages: [{ label: 'S', figure: 1.5 }] }).success).toBe(false);
    expect(RecordPartnerFormTotalsRequest.safeParse({ ...ok, stages: [{ label: 'S', figure: 9, member_id: 'x' }] }).success).toBe(false);
  });

  it('Story 12.5b (I4): a floored figure below 5 cannot be serialized — the response DTO refuses it', () => {
    expect(ModuleFlooredFigureDto.safeParse({ figure: 5, below_floor: false }).success).toBe(true);
    expect(ModuleFlooredFigureDto.safeParse({ figure: null, below_floor: true }).success).toBe(true);
    expect(ModuleFlooredFigureDto.safeParse({ figure: 4, below_floor: false }).success).toBe(false);
    expect(ModuleFlooredFigureDto.safeParse({ figure: 7, below_floor: true }).success).toBe(false);
    expect(ModuleFlooredFigureDto.safeParse({ figure: null, below_floor: false }).success).toBe(false);
  });

  // Review RD1 (Decision `2026-11-22-490` (1)): an all-days figure is floored OR withheld ("not shown"), never both; and the figures DTO
  // is a second floor — ⛔ a numeric all-days figure beside a listed day of that kind below 5 (the 6 − 5 = 1 case).
  it('RD1: an all-days figure is floored or withheld, never both; ⛔ a numeric all-days figure beside a day below 5', () => {
    expect(ModuleCountTotalDto.safeParse({ figure: 12, below_floor: false, withheld: false }).success).toBe(true);
    expect(ModuleCountTotalDto.safeParse({ figure: null, below_floor: true, withheld: false }).success).toBe(true);
    expect(ModuleCountTotalDto.safeParse({ figure: null, below_floor: false, withheld: true }).success).toBe(true);
    for (const bad of [
      { figure: 12, below_floor: false, withheld: true },
      { figure: null, below_floor: true, withheld: true },
      { figure: 3, below_floor: false, withheld: false },
      { figure: null, below_floor: false, withheld: false },
    ]) {
      expect(ModuleCountTotalDto.safeParse(bad).success, JSON.stringify(bad)).toBe(false);
    }
    expect(ModuleCountTotalDto.safeParse({ figure: 12, below_floor: false }).success).toBe(false); // `withheld` is required
    const shown = (figure: number) => ({ figure, below_floor: false });
    const below = { figure: null, below_floor: true };
    const allShown = { card_shown: shown(5), card_opened: shown(5), went_to_partner: shown(5), came_back: shown(5) };
    const total = (figure: number) => ({ figure, below_floor: false, withheld: false });
    const withheld = { figure: null, below_floor: false, withheld: true };
    const figuresWith = (cardShownTotal: unknown) => ({
      counts: { card_shown: cardShownTotal, card_opened: total(5), went_to_partner: total(5), came_back: total(5) },
      days: [
        { day: '2026-11-02', counts: { ...allShown, card_shown: below } },
        { day: '2026-11-01', counts: allShown },
      ],
      partner_totals: [],
    });
    const leak = ModulePartnerFormFiguresDto.safeParse(figuresWith(total(6)));
    expect(leak.success).toBe(false);
    expect(leak.error?.issues.map((i) => i.path)).toEqual([['counts', 'card_shown']]);
    expect(ModulePartnerFormFiguresDto.safeParse(figuresWith(withheld)).success).toBe(true);
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
