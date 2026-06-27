// Medical disclosure — domain UNIT tests (Story 3.5, Task 10). DB-free.
//
// Pure surfaces:
//   · IMA catalog integrity — `ImaListPayloadSchema` / `isKnownImaCode` / `IMA_LIST_CLAUSE_ID`:
//     the registry-backed catalog parses, and code membership is exact.
//   · concealment clause — `ConcealmentPayloadSchema` / `ackTextForLocale` / `CONCEALMENT_CLAUSE_ID`.
//   · MedicalDisclosedPayloadSchema — the widened (Task 4) NON-PII event payload: it accepts
//     {…auditShape, ima_list_version, condition_count, acknowledged:true, ack_locale} and
//     `.strict()`-REJECTS any PII key (condition codes / free-text) that must never enter the
//     plaintext events_log (R1).
//
// The encrypted round-trip + RLS + append-only history are DB behaviours — covered by the live-DB
// integration spec (tests/integration/medical/member-medical-disclosures.spec.ts), not here.

import { describe, expect, it } from 'vitest';

import { MedicalDisclosedPayloadSchema } from '../../src/member/events.js';
import {
  CONCEALMENT_CLAUSE_ID,
  ConcealmentPayloadSchema,
  IMA_LIST_CLAUSE_ID,
  ImaListPayloadSchema,
  ackTextForLocale,
  isKnownImaCode,
} from '../../src/medical/index.js';

const CONDITIONS = [
  { code: 'ckd', label_en: 'Chronic kidney disease', label_hi: 'गुर्दा रोग' },
  { code: 'malignancy', label_en: 'Cancer / malignancy', label_hi: 'कैंसर' },
] as const;

describe('IMA catalog — clause id + payload + code membership (AC1)', () => {
  it('IMA_LIST_CLAUSE_ID is the canonical slug', () => {
    expect(IMA_LIST_CLAUSE_ID).toBe('niy.medical.ima-list');
  });

  it('ImaListPayloadSchema accepts a valid catalog (passthrough tolerates structural keys)', () => {
    const parsed = ImaListPayloadSchema.parse({
      rule_code: 'IMA-LIST',
      title_en: 'IMA list',
      conditions: CONDITIONS,
      provisional: true,
    });
    expect(parsed.conditions).toHaveLength(2);
  });

  it('rejects an empty condition catalog (min 1)', () => {
    expect(() => ImaListPayloadSchema.parse({ conditions: [] })).toThrow();
  });

  it('rejects a condition missing a bilingual label (.strict() condition)', () => {
    expect(() =>
      ImaListPayloadSchema.parse({ conditions: [{ code: 'ckd', label_en: 'x' }] }),
    ).toThrow();
  });

  it('isKnownImaCode is exact membership over the resolved set', () => {
    expect(isKnownImaCode(CONDITIONS, 'ckd')).toBe(true);
    expect(isKnownImaCode(CONDITIONS, 'malignancy')).toBe(true);
    expect(isKnownImaCode(CONDITIONS, 'unknown-code')).toBe(false);
    expect(isKnownImaCode([], 'ckd')).toBe(false);
  });
});

describe('concealment clause — clause id + payload + locale pick (AC2/AC3)', () => {
  it('CONCEALMENT_CLAUSE_ID is the canonical slug', () => {
    expect(CONCEALMENT_CLAUSE_ID).toBe('niy.concealment.r14');
  });

  it('ConcealmentPayloadSchema requires both ack-text locales', () => {
    expect(() =>
      ConcealmentPayloadSchema.parse({ ack_text_en: 'EN copy', ack_text_hi: 'HI copy' }),
    ).not.toThrow();
    expect(() => ConcealmentPayloadSchema.parse({ ack_text_en: 'EN only' })).toThrow();
  });

  it('ackTextForLocale picks the locale-correct copy', () => {
    const clause = { clauseVersionId: 'x' as never, ackTextEn: 'EN copy', ackTextHi: 'HI copy' };
    expect(ackTextForLocale(clause, 'en')).toBe('EN copy');
    expect(ackTextForLocale(clause, 'hi')).toBe('HI copy');
  });
});

describe('MedicalDisclosedPayloadSchema — NON-PII, strict (Task 4 / R1)', () => {
  const base = {
    from_state: 'pending-fee',
    to_state: 'pending-fee',
    trigger: 'medical_disclosure',
    actor: 'member',
    ima_list_version: '0e1c0004-0000-4000-8000-000000000004',
    acknowledged: true,
    ack_locale: 'en',
  } as const;

  it('accepts the non-PII audit shape (count + version + ack), incl. zero conditions', () => {
    expect(() => MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: 0 })).not.toThrow();
    expect(() => MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: 3 })).not.toThrow();
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: 1, ack_locale: 'hi' }),
    ).not.toThrow();
  });

  it('REJECTS any PII key (.strict() — condition codes / free-text never enter the event-log)', () => {
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: 1, conditions: ['ckd'] }),
    ).toThrow();
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({
        ...base,
        condition_count: 1,
        additional_context: 'free text',
      }),
    ).toThrow();
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({
        ...base,
        condition_count: 1,
        disclosed_conditions: ['ckd'],
      }),
    ).toThrow();
  });

  it('rejects acknowledged !== true (the recorded disclosure is ALWAYS acknowledged)', () => {
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: 0, acknowledged: false }),
    ).toThrow();
  });

  it('rejects a negative condition_count', () => {
    expect(() => MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: -1 })).toThrow();
  });

  it('rejects a bad ack_locale', () => {
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({ ...base, condition_count: 0, ack_locale: 'fr' }),
    ).toThrow();
  });

  it('requires the widened fields (version + count + ack are mandatory)', () => {
    expect(() =>
      MedicalDisclosedPayloadSchema.parse({
        from_state: 'pending-fee',
        to_state: 'pending-fee',
        trigger: 'medical_disclosure',
        actor: 'member',
      }),
    ).toThrow();
  });
});
