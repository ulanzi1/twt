// Story 3.13 (Task 3.3; DL7, DL9, DL11, AC9) — the identity check's vocabularies are DOMAIN-OWNED and MIRRORED in contracts;
// this pins each pair in lockstep, and pins what the request may ⛔ carry (N5: ⛔ number, ⛔ image, ⛔ upload).

import { member, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import {
  IDENTITY_CHECK_DOCUMENT_KINDS,
  IDENTITY_CHECK_EVIDENCE_KINDS,
  IDENTITY_CHECK_NOT_CONFIRMED_REASONS,
  IDENTITY_CHECK_OUTCOMES,
  IDENTITY_CHECK_QUEUE_MAX_LIMIT,
  IDENTITY_CHECK_QUEUE_STATES,
  IdentityCheckDetailResponse,
  IdentityCheckQueueEntry,
  IdentityCheckQueueQuery,
  IdentityCheckRecordRequest,
  ProfileSection,
} from '../src/index.js';

describe('Story 3.13 — the identity check vocabulary', () => {
  it('each contracts tuple equals the domain tuple, in order', () => {
    expect([...IDENTITY_CHECK_OUTCOMES]).toEqual([...schema.IDENTITY_VALIDATION_OUTCOMES]);
    expect([...IDENTITY_CHECK_EVIDENCE_KINDS]).toEqual([...schema.IDENTITY_VALIDATION_EVIDENCE_KINDS]);
    expect([...IDENTITY_CHECK_DOCUMENT_KINDS]).toEqual([...schema.IDENTITY_VALIDATION_DOCUMENT_KINDS]);
    expect([...IDENTITY_CHECK_NOT_CONFIRMED_REASONS]).toEqual([...schema.IDENTITY_VALIDATION_NOT_CONFIRMED_REASONS]);
    expect([...IDENTITY_CHECK_QUEUE_STATES]).toEqual([...member.IDENTITY_VALIDATION_ELIGIBLE_STATES]);
    expect(IDENTITY_CHECK_QUEUE_MAX_LIMIT).toBe(member.IDENTITY_CHECK_QUEUE_LIMIT.cap);
  });

  it('DL7 — ⛔ `uploaded_documents` in THIS story (row 3-16 mints it)', () => {
    expect(IDENTITY_CHECK_EVIDENCE_KINDS as readonly string[]).not.toContain('uploaded_documents');
  });
});

describe('Story 3.13 — AC9: the record request carries ⛔ number, ⛔ image, ⛔ upload', () => {
  const ok = { outcome: 'confirmed', evidence_kind: 'photo_id_in_person', document_kind: 'voter_id' };

  it('the well-formed body parses (the control)', () => {
    expect(IdentityCheckRecordRequest.safeParse(ok).success).toBe(true);
    expect(
      IdentityCheckRecordRequest.safeParse({ outcome: 'not_confirmed', not_confirmed_reason: 'member_not_reached', note: 'Phoned twice' }).success,
    ).toBe(true);
  });

  it.each([
    ['document_number', { document_number: '1234 5678 9012' }],
    ['aadhaar_number', { aadhaar_number: '123456789012' }],
    ['aadhaar_last4', { aadhaar_last4: '9012' }],
    ['image', { image: 'data:image/jpeg;base64,AAAA' }],
    ['upload_id', { upload_id: '6b1f0b7e-2c56-4b55-9d0b-3a0a2b1c4d5e' }],
  ])('a body with `%s` is refused (`.strict()`)', (_label, extra) => {
    expect(IdentityCheckRecordRequest.safeParse({ ...ok, ...extra }).success).toBe(false);
  });

  it('an unknown vocabulary value is refused (a closed `z.enum`)', () => {
    expect(IdentityCheckRecordRequest.safeParse({ ...ok, evidence_kind: 'uploaded_documents' }).success).toBe(false);
    expect(IdentityCheckRecordRequest.safeParse({ ...ok, document_kind: 'ration_card' }).success).toBe(false);
    expect(IdentityCheckRecordRequest.safeParse({ ...ok, outcome: 'maybe' }).success).toBe(false);
  });

  it('a note is at most 1,000 CODE POINTS (a Devanagari note is not cut short by UTF-16 length)', () => {
    const hindi = 'क'.repeat(1000);
    expect(IdentityCheckRecordRequest.safeParse({ ...ok, note: hindi }).success).toBe(true);
    expect(IdentityCheckRecordRequest.safeParse({ ...ok, note: hindi + 'क' }).success).toBe(false);
  });

  it('⛔ field in the request, queue or detail contract is named like a number, an Aadhaar or an image', () => {
    const keys = [
      ...Object.keys(IdentityCheckRecordRequest.shape),
      ...Object.keys(IdentityCheckQueueEntry.shape),
      ...Object.keys(IdentityCheckDetailResponse.shape),
    ];
    expect(keys.length).toBeGreaterThan(15); // the control
    expect(keys.filter((k) => /number|aadhaar|image|upload/.test(k))).toEqual([]);
  });
});

describe('Story 3.13 — DL11: the queue is bounded and carries ⛔ PII', () => {
  it('the `limit` is bounded (forced pagination)', () => {
    expect(IdentityCheckQueueQuery.safeParse({ limit: String(IDENTITY_CHECK_QUEUE_MAX_LIMIT) }).success).toBe(true);
    expect(IdentityCheckQueueQuery.safeParse({ limit: String(IDENTITY_CHECK_QUEUE_MAX_LIMIT + 1) }).success).toBe(false);
  });

  it('a queue row has ⛔ name, ⛔ mobile', () => {
    const keys = Object.keys(IdentityCheckQueueEntry.shape);
    expect(keys.filter((k) => /name|mobile|dob|birth|photo/.test(k))).toEqual([]);
  });
});

describe('Story 3.13 — DL14: the data export\'s identity checks (⛔ staff attribution)', () => {
  const item = ProfileSection.shape.identityChecks.element;
  const ok = {
    decidedAt: '2026-11-01T09:00:00.000Z',
    outcome: 'not_confirmed',
    evidenceKind: 'photo_id_in_person',
    documentKind: null,
    notConfirmedReason: 'no_document_shown',
    note: 'came without an ID',
  };

  it('a well-formed act parses (the control)', () => {
    expect(item.safeParse(ok).success).toBe(true);
    expect(item.safeParse({ ...ok, outcome: 'confirmed', notConfirmedReason: null, documentKind: 'passport', note: null }).success).toBe(true);
  });

  it.each([['decidedByDisplay', 'Asha'], ['decidedByActorId', 'x'], ['staffName', 'Asha']])('⛔ `%s` (strict)', (key, value) => {
    expect(item.safeParse({ ...ok, [key]: value }).success).toBe(false);
  });
});
