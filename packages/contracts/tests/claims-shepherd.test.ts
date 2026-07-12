// Member shepherd read DTO + admin reassign DTOs — pure, DB-free (Story 6.12, Task 8).
//
// Covers the discriminated MemberShepherdResponse (assigned | not_assigned), the E.164 contact wire shape,
// `.strict()` rejection of unknown keys, and the admin reassign request/response shapes.

import { describe, expect, it } from 'vitest';

import {
  MemberShepherdResponse,
  ShepherdReassignRequest,
  ShepherdReassignResponse,
} from '../src/claims/shepherd.js';

describe('MemberShepherdResponse', () => {
  it('parses an assigned shepherd with both E.164 channels', () => {
    const parsed = MemberShepherdResponse.parse({
      status: 'assigned',
      display_name: 'Anita Sharma',
      role_label: 'District Admin',
      contact: { phone: '+919000000001', whatsapp: '+919000000002' },
    });
    expect(parsed).toMatchObject({ status: 'assigned', display_name: 'Anita Sharma' });
  });

  it('parses an assigned shepherd with a single channel (the other null)', () => {
    expect(
      MemberShepherdResponse.parse({
        status: 'assigned',
        display_name: 'Anita',
        role_label: 'District Admin',
        contact: { phone: '+919000000001', whatsapp: null },
      }),
    ).toBeTruthy();
  });

  it('parses the not_assigned state', () => {
    expect(MemberShepherdResponse.parse({ status: 'not_assigned' })).toEqual({ status: 'not_assigned' });
  });

  it('REJECTS a non-E.164 contact number', () => {
    expect(() =>
      MemberShepherdResponse.parse({
        status: 'assigned',
        display_name: 'Anita',
        role_label: 'District Admin',
        contact: { phone: '9000000001', whatsapp: null }, // missing '+<country>'
      }),
    ).toThrow();
  });

  it('REJECTS an unknown key (.strict) on the assigned branch', () => {
    expect(() =>
      MemberShepherdResponse.parse({
        status: 'assigned',
        display_name: 'Anita',
        role_label: 'District Admin',
        contact: { phone: '+919000000001', whatsapp: null },
        shepherd_actor_id: '11111111-1111-1111-1111-111111111111', // not a member-facing field
      }),
    ).toThrow();
  });

  it('REJECTS an empty display_name', () => {
    expect(() =>
      MemberShepherdResponse.parse({
        status: 'assigned',
        display_name: '',
        role_label: 'District Admin',
        contact: { phone: '+919000000001', whatsapp: null },
      }),
    ).toThrow();
  });
});

describe('Shepherd reassign DTOs', () => {
  it('the request carries ONLY the target actor id (.strict)', () => {
    expect(
      ShepherdReassignRequest.parse({ target_shepherd_actor_id: '11111111-1111-1111-1111-111111111111' }),
    ).toBeTruthy();
    expect(() =>
      ShepherdReassignRequest.parse({
        target_shepherd_actor_id: '11111111-1111-1111-1111-111111111111',
        actor_id: '22222222-2222-2222-2222-222222222222', // server-derived — never client-submitted
      }),
    ).toThrow();
  });

  it('the response carries NON-PII routing coordinates + display (never contact phone/WhatsApp)', () => {
    const parsed = ShepherdReassignResponse.parse({
      assignment_id: '11111111-1111-1111-1111-111111111111',
      claim_case_id: '22222222-2222-2222-2222-222222222222',
      shepherd_actor_id: '33333333-3333-3333-3333-333333333333',
      shepherd_display: 'Anita Sharma',
      role_label: 'District Admin',
      previous_shepherd_actor_id: '44444444-4444-4444-4444-444444444444',
      assignment_reason: 'reassignment',
      assigned_at: '2026-07-12T00:00:00.000Z',
      claim_state: 'verification_in_progress',
    });
    expect(parsed.assignment_reason).toBe('reassignment');
    // No contact channel fields exist on the admin response shape (AC8).
    expect((parsed as Record<string, unknown>)['contact']).toBeUndefined();
  });

  it('accepts a null previous_shepherd_actor_id (a fresh fallback with no prior shepherd)', () => {
    expect(
      ShepherdReassignResponse.parse({
        assignment_id: '11111111-1111-1111-1111-111111111111',
        claim_case_id: '22222222-2222-2222-2222-222222222222',
        shepherd_actor_id: '33333333-3333-3333-3333-333333333333',
        shepherd_display: 'Anita',
        role_label: 'District Admin',
        previous_shepherd_actor_id: null,
        assignment_reason: 'fallback',
        assigned_at: '2026-07-12T00:00:00.000Z',
        claim_state: 'verification_in_progress',
      }).previous_shepherd_actor_id,
    ).toBeNull();
  });
});
