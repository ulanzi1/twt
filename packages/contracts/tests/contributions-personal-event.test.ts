// The personal-event ASSERTION contracts — Story 10.26 (Task 5; AC1, AC7, AC8(c)).
//
// Two jobs:
//   1. LOCKSTEP the wire `PersonalEventKind` against `@twt/domain`'s `PERSONAL_EVENT_KINDS`. The
//      contract cannot IMPORT the domain in `src/` ([[project_contracts_domain_bundle_boundary]] —
//      the domain barrel re-exports `encryption` → `node:async_hooks`, which would leak `pg` into
//      the RN Metro bundle), so the enum is re-declared and the two are pinned HERE. A test-only
//      cross-package import is safe: it never reaches a bundle.
//   2. Pin AC1's structural discipline — no free text, and no approval-shaped field anywhere. This
//      is the assertion that stops the surface making a promise the Niyamavali forbids.

import { member } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  PersonalEventAssertionRequest,
  PersonalEventAssertionResponse,
  PersonalEventKind,
} from '../src/contributions/personal-event.js';

describe('AC8(c) — the wire enum is value-aligned with the domain enum (lockstep)', () => {
  it('carries EXACTLY the domain vocabulary, no more and no less', () => {
    expect([...PersonalEventKind.options].sort()).toEqual([...member.PERSONAL_EVENT_KINDS].sort());
  });

  it('every domain kind parses on the wire, and an unknown one does not', () => {
    for (const kind of member.PERSONAL_EVENT_KINDS) {
      expect(PersonalEventKind.safeParse(kind).success).toBe(true);
    }
    expect(PersonalEventKind.safeParse('bankruptcy').success).toBe(false);
  });
});

describe('AC1 — the REQUEST records; it never asks', () => {
  it('accepts a bare kind (the only thing a member must supply)', () => {
    expect(PersonalEventAssertionRequest.safeParse({ kind: 'bereavement' }).success).toBe(true);
  });

  it('accepts the OPTIONAL cycle reference (D5 — provenance, unpopulated by any surface today)', () => {
    expect(
      PersonalEventAssertionRequest.safeParse({
        kind: 'illness',
        cycleRef: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(true);
  });

  it('⭐ REJECTS every free-text-shaped field (D3 — Tier-1 PII must never reach events_log)', () => {
    for (const field of ['notes', 'note', 'details', 'description', 'reason', 'explanation', 'message']) {
      expect(
        PersonalEventAssertionRequest.safeParse({ kind: 'bereavement', [field]: 'my father died' })
          .success,
        `\`${field}\` was accepted — the .strict() contract must admit no free text`,
      ).toBe(false);
    }
  });

  it('carries NO member id — the subject is the authenticated session, never client-supplied', () => {
    expect(
      PersonalEventAssertionRequest.safeParse({
        kind: 'illness',
        memberId: '11111111-1111-4111-8111-111111111111',
      }).success,
    ).toBe(false);
    expect(Object.keys(PersonalEventAssertionRequest.shape)).toEqual(['kind', 'cycleRef']);
  });
});

describe('AC1 — the RESPONSE echoes what was recorded; it never adjudicates', () => {
  const valid = {
    eventId: '11111111-1111-4111-8111-111111111111',
    kind: 'bereavement' as const,
    recordedAt: '2026-08-06T10:00:00.000Z',
    grantsRelief: false as const,
  };

  it('accepts the recorded shape', () => {
    expect(PersonalEventAssertionResponse.safeParse(valid).success).toBe(true);
  });

  it('⭐ `grantsRelief` is a LITERAL false — the wire itself asserts the ratified §3.1 invariant', () => {
    // "the assertion is recorded on the member's own record but grants no restoration relief"
    // (`docs/legal/niyamavali.md:81`). A `z.boolean()` here would let a future handler ship `true`
    // silently; a literal forces a contract change and a review.
    expect(PersonalEventAssertionResponse.safeParse({ ...valid, grantsRelief: true }).success).toBe(false);
  });

  it('⭐ admits NO field that implies an outcome a member could wait for (AC1)', () => {
    const shape = Object.keys(PersonalEventAssertionResponse.shape);
    for (const banned of [
      'status',
      'approved',
      'approval',
      'decision',
      'reviewedBy',
      'reviewedAt',
      'expiresAt',
      'waiver',
      'exemption',
      'appealable',
    ]) {
      expect(
        shape,
        `the response carries \`${banned}\` — there is no counterparty, no reviewer and nothing to ` +
          `wait for. A field like this makes a false promise STRUCTURAL, which is the strongest ` +
          `version of the harm AC1 forbids.`,
      ).not.toContain(banned);
    }
    expect(shape).toEqual(['eventId', 'kind', 'recordedAt', 'grantsRelief']);
  });
});
