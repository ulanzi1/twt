// Story 3.13 (Task 3.3; DL7, DL9, DL11, AC9) — the identity check's vocabularies are DOMAIN-OWNED and MIRRORED in contracts;
// this pins each pair in lockstep, and pins what the request may ⛔ carry (N5: ⛔ number, ⛔ image, ⛔ upload).

import { member, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  IDENTITY_CHECK_DOCUMENT_KINDS,
  IDENTITY_CHECK_EVIDENCE_KINDS,
  IDENTITY_CHECK_NOT_CONFIRMED_REASONS,
  IDENTITY_CHECK_OUTCOMES,
  IDENTITY_CHECK_QUEUE_MAX_LIMIT,
  IDENTITY_CHECK_QUEUE_STATES,
  IdentityCheckQueueEntry,
  IdentityCheckQueueQuery,
  IdentityCheckRecordRequest,
  ProfileSection,
} from '../src/index.js';
import * as identityCheckContract from '../src/members/identity-check.js';

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

  /**
   * Every key at every depth of a schema (objects, nested objects, array elements; `nullable` / `optional` / `effects` unwrapped),
   * as `Parent.path.key` — so a number creeping into a NESTED object (the detail's `identity`, a history entry, the export's
   * element) is caught, ⛔ only the top-level keys (code review R3-P22).
   */
  function allKeys(schemaIn: z.ZodTypeAny, path: string, out: string[]): string[] {
    const s: z.ZodTypeAny = schemaIn;
    // Wrappers: walk what they wrap (a union / intersection / pipeline: every branch).
    if (s instanceof z.ZodNullable || s instanceof z.ZodOptional) return allKeys(s.unwrap() as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodDefault) return allKeys(s.removeDefault() as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodCatch) return allKeys(s.removeCatch() as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodEffects) return allKeys(s.innerType() as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodBranded) return allKeys(s.unwrap() as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodReadonly) return allKeys(s.unwrap() as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodLazy) return allKeys(s.schema as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodArray) return allKeys(s.element as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodRecord) return allKeys(s.valueSchema as z.ZodTypeAny, path, out);
    if (s instanceof z.ZodPipeline) {
      allKeys(s._def.in as z.ZodTypeAny, path, out);
      return allKeys(s._def.out as z.ZodTypeAny, path, out);
    }
    if (s instanceof z.ZodIntersection) {
      allKeys(s._def.left as z.ZodTypeAny, path, out);
      return allKeys(s._def.right as z.ZodTypeAny, path, out);
    }
    if (s instanceof z.ZodUnion || s instanceof z.ZodDiscriminatedUnion) {
      for (const o of s.options as z.ZodTypeAny[]) allKeys(o, path, out);
      return out;
    }
    if (s instanceof z.ZodObject) {
      for (const [k, child] of Object.entries(s.shape as Record<string, z.ZodTypeAny>)) {
        out.push(`${path}.${k}`);
        allKeys(child, `${path}.${k}`, out);
      }
      return out;
    }
    // Leaves: nothing below them is named.
    if (
      s instanceof z.ZodString ||
      s instanceof z.ZodNumber ||
      s instanceof z.ZodBigInt ||
      s instanceof z.ZodBoolean ||
      s instanceof z.ZodDate ||
      s instanceof z.ZodEnum ||
      s instanceof z.ZodNativeEnum ||
      s instanceof z.ZodLiteral ||
      s instanceof z.ZodNull ||
      s instanceof z.ZodUndefined ||
      s instanceof z.ZodUnknown ||
      s instanceof z.ZodAny
    ) {
      return out;
    }
    // ⭐ (code review R4-P9) A kind the walk does not know FAILS LOUDLY — ⛔ a schema silently skipped, whose `*_number` field
    // would then never be checked.
    throw new Error(`allKeys: unhandled zod kind ${s.constructor.name} at '${path}' — teach the walk this kind`);
  }

  it('⛔ field at ANY depth of ANY identity-check schema (or the export element) is named like a number, an Aadhaar or an image', () => {
    const schemas = Object.entries(identityCheckContract).filter(([, v]) => v instanceof z.ZodType) as [string, z.ZodTypeAny][];
    const objects = schemas.filter(([, v]) => allKeys(v, '', []).length > 0).map(([n]) => n);
    // The control: every object schema the module exports is walked — a new one is walked the day it is added.
    expect(objects).toEqual(
      expect.arrayContaining([
        'IdentityCheckQueueQuery',
        'IdentityCheckQueueEntry',
        'IdentityCheckQueueResponse',
        'IdentityCheckHistoryEntry',
        'IdentityCheckDetailResponse',
        'IdentityCheckRecordRequest',
        'IdentityCheckRecordResponse',
        'IdentityCheckMobileResponse',
      ]),
    );
    const keys = [
      ...schemas.flatMap(([n, v]) => allKeys(v, n, [])),
      ...allKeys(ProfileSection.shape.identityChecks, 'ProfileSection.identityChecks', []),
    ];
    // The control: the nested keys are reached (the detail's identity, a history entry inside the detail, the export element).
    expect(keys).toEqual(
      expect.arrayContaining([
        'IdentityCheckDetailResponse.identity.date_of_birth',
        'IdentityCheckDetailResponse.history.document_kind',
        'ProfileSection.identityChecks.documentKind',
      ]),
    );
    expect(keys.filter((k) => /number|aadhaar|image|upload/i.test(k.split('.').pop() ?? ''))).toEqual([]);
  });

  it('⭐ R4-P9 — the walk reaches a number field behind a union, a default, a brand, a lazy and a record — and an UNKNOWN kind fails loudly', () => {
    const decoy = z.object({
      u: z.union([z.object({ a_number: z.string() }), z.object({ b: z.string() })]),
      d: z.array(z.object({ c_number: z.string() })).default([]),
      br: z.object({ e_number: z.string() }).brand<'X'>(),
      lz: z.lazy(() => z.object({ f_number: z.string() })),
      rec: z.record(z.object({ g_number: z.string() })),
    });
    expect(allKeys(decoy, 'Decoy', []).filter((k) => /number/.test(k)).sort()).toEqual([
      'Decoy.br.e_number',
      'Decoy.d.c_number',
      'Decoy.lz.f_number',
      'Decoy.rec.g_number',
      'Decoy.u.a_number',
    ]);
    expect(() => allKeys(z.object({ fn: z.function() }), 'Odd', [])).toThrow(/unhandled zod kind ZodFunction at '\.?Odd\.fn'/);
  });

  it('a decoy nested number field IS caught by the walk (the walk can fail)', () => {
    const decoy = z.object({ outer: z.object({ inner: z.array(z.object({ document_number: z.string() })).nullable() }) });
    expect(allKeys(decoy, 'Decoy', []).filter((k) => /number/.test(k))).toEqual(['Decoy.outer.inner.document_number']);
  });
});

describe('Story 3.13 — DL11: the queue is bounded and carries ⛔ PII', () => {
  it('⭐ R4-P10 — the domain\'s offset ceiling IS the contract\'s (the domain holds its own copy: it can never import a contracts value)', () => {
    expect(member.IDENTITY_CHECK_QUEUE_MAX_OFFSET).toBe(identityCheckContract.IDENTITY_CHECK_QUEUE_MAX_OFFSET);
    expect(IdentityCheckQueueQuery.safeParse({ offset: String(identityCheckContract.IDENTITY_CHECK_QUEUE_MAX_OFFSET) }).success).toBe(true);
    expect(IdentityCheckQueueQuery.safeParse({ offset: String(identityCheckContract.IDENTITY_CHECK_QUEUE_MAX_OFFSET + 1) }).success).toBe(false);
  });

  it('the `limit` is bounded (forced pagination)', () => {
    expect(IdentityCheckQueueQuery.safeParse({ limit: String(IDENTITY_CHECK_QUEUE_MAX_LIMIT) }).success).toBe(true);
    expect(IdentityCheckQueueQuery.safeParse({ limit: String(IDENTITY_CHECK_QUEUE_MAX_LIMIT + 1) }).success).toBe(false);
  });

  it('a queue row has ⛔ name, ⛔ mobile', () => {
    const keys = Object.keys(IdentityCheckQueueEntry.shape);
    expect(keys.filter((k) => /name|mobile|dob|birth|photo/.test(k))).toEqual([]);
  });
});

describe('Story 3.13 — DL14 (as amended by `-504` item 5): the data export\'s identity checks (⛔ the staff note, ⛔ staff attribution)', () => {
  const item = ProfileSection.shape.identityChecks.element;
  const ok = {
    decidedAt: '2026-11-01T09:00:00.000Z',
    outcome: 'not_confirmed',
    evidenceKind: 'photo_id_in_person',
    documentKind: null,
    notConfirmedReason: 'no_document_shown',
  };

  it('a well-formed act parses (the control)', () => {
    expect(item.safeParse(ok).success).toBe(true);
    expect(item.safeParse({ ...ok, outcome: 'confirmed', notConfirmedReason: null, documentKind: 'passport' }).success).toBe(true);
  });

  it.each([['decidedByDisplay', 'Asha'], ['decidedByActorId', 'x'], ['staffName', 'Asha'], ['note', 'came without an ID']])('⛔ `%s` (strict)', (key, value) => {
    expect(item.safeParse({ ...ok, [key]: value }).success).toBe(false);
  });
});
