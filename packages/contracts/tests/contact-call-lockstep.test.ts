// Story 6.37c (LD10) — the call record's wire vocabularies are in LOCKSTEP with the domain (and so with migration 0169's
// CHECKs, which the domain's policy spec pins). The contracts ⛔ never import `@twt/domain` at runtime
// ([[project_contracts_domain_bundle_boundary]]) — this TEST is the only bridge. Plus the request's boundary refusals.

import { describe, expect, it } from 'vitest';

import { schema } from '@twt/domain';

import {
  CONTACT_CALL_ANSWERED_BY,
  CONTACT_CALL_CHASES,
  CONTACT_CALL_OUTCOMES,
  ContactCallDto,
  ContactCallNumberQuery,
  ContactCallNumberResponse,
  RecordContactCallRequest,
} from '../src/index.js';

describe('the call record vocabularies (Story 6.37c)', () => {
  it('⭐ who answered, the outcome and the chase EQUAL the domain tuples, in order', () => {
    expect([...CONTACT_CALL_ANSWERED_BY]).toEqual([...schema.CONTACT_CALL_ANSWERED_BY]);
    expect([...CONTACT_CALL_OUTCOMES]).toEqual([...schema.CONTACT_CALL_OUTCOMES]);
    expect([...CONTACT_CALL_CHASES]).toEqual([...schema.CONTACT_LADDER_CHASES]);
  });

  it('the request refuses a bad person key, an unreal date, an unknown role or outcome, an extra key — SHAPE only (review P18: `reached` + nobody/someone-else is the DOMAIN\'s `reached_needs_answer` refusal, ⛔ a schema refine, so Fastify\'s own validator never masks it)', () => {
    const ok = { person_key: 'claimant', called_on: '2026-10-18', answered_by: 'the_person', outcome: 'reached' };
    expect(RecordContactCallRequest.safeParse(ok).success).toBe(true);
    expect(RecordContactCallRequest.safeParse({ ...ok, answered_by: 'family_member' }).success).toBe(true);
    expect(RecordContactCallRequest.safeParse({ ...ok, answered_by: 'nobody', outcome: 'not_reached' }).success).toBe(true);
    expect(RecordContactCallRequest.safeParse({ ...ok, person_key: 'nominee:X' }).success).toBe(false);
    expect(RecordContactCallRequest.safeParse({ ...ok, called_on: '2026-02-30' }).success).toBe(false);
    expect(RecordContactCallRequest.safeParse({ ...ok, answered_by: 'neighbour' }).success).toBe(false);
    expect(RecordContactCallRequest.safeParse({ ...ok, outcome: 'voicemail' }).success).toBe(false);
    expect(RecordContactCallRequest.safeParse({ ...ok, note: 'free text' }).success).toBe(false); // ⛔ free text
    // `reached` + `nobody` / `someone_else` is STRUCTURALLY valid at this layer — each field is a real enum member;
    // `recordContactCall`'s `reached_needs_answer` refusal is what actually rejects the combination (domain test).
    expect(RecordContactCallRequest.safeParse({ ...ok, answered_by: 'nobody' }).success).toBe(true);
    expect(RecordContactCallRequest.safeParse({ ...ok, answered_by: 'someone_else' }).success).toBe(true);
  });

  it('the DTO and the reveal are `.strict()` (⛔ a number on the DTO; ⛔ an extra field)', () => {
    const dto = {
      call_id: '00000000-0000-4000-8000-000000000001',
      person_key: 'claimant',
      chase: 'correction',
      called_on: '2026-10-18',
      answered_by: 'the_person',
      outcome: 'reached',
      recorded_by: 'District Admin One',
      recorded_at: '2026-10-18T05:00:00.000Z',
    };
    expect(ContactCallDto.safeParse(dto).success).toBe(true);
    expect(ContactCallDto.safeParse({ ...dto, number: '+919812345678' }).success).toBe(false);
    expect(ContactCallNumberQuery.safeParse({ person_key: 'claimant' }).success).toBe(true);
    expect(ContactCallNumberResponse.safeParse({ person_key: 'claimant', number: null }).success).toBe(true);
    expect(ContactCallNumberResponse.safeParse({ person_key: 'claimant', number: '+91', extra: 1 }).success).toBe(false);
  });
});
