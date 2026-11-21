// Story 12.5 (AC3; QE3 (A), QE6 (A), QE12; I5) — the v1 body, the signature and the attribution header. DB-free, PURE.
//
// The vectors are FROZEN: the body bytes and the signature were computed once and cross-checked OUTSIDE Node
// (`printf '%s' "1795000000.<body>" | openssl dgst -sha256 -hmac whsec_test_0123456789` gives the same hex). A change to the body's
// shape, its key order or the signed string fails here first — and is a contract change for every partner.

import { createHmac, timingSafeEqual } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import {
  buildLeadEnvelopeBody,
  leadAttributionHeader,
  leadEnvelopeV1,
  leadRequestHeaders,
  leadSignatureHeader,
  type LeadEnvelopeInput,
} from '../../src/marketplace/lead-envelope.js';

const INPUT: LeadEnvelopeInput = {
  leadId: '7C9E6679-7425-40DE-944B-E07FC1F90AE7',
  pariwarId: '11111111-1111-1111-1111-111111111111',
  moduleId: '6ba7b810-9dad-41d1-80b4-00c04fd430c8',
  partnerId: '0f8fad5b-d9cb-469f-a165-70867728950e',
  submittedAt: new Date('2026-11-21T10:15:30.123Z'),
  sealed: {
    version: 1,
    nonce: '00112233445566778899aabbccddeeff',
    full_name: 'Sita Devi',
    mobile: '+919876543210',
    district: 'Patna',
    preferred_language: 'hi',
  },
};
const SECRET = 'whsec_test_0123456789';
const T = 1795000000;

const FROZEN_BODY =
  '{"attribution":{"lead_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","module_id":"6ba7b810-9dad-41d1-80b4-00c04fd430c8","pariwar_id":"11111111-1111-1111-1111-111111111111","source":"twt"},"envelope_version":1,"lead_id":"7c9e6679-7425-40de-944b-e07fc1f90ae7","member":{"district":"Patna","full_name":"Sita Devi","mobile":"+919876543210","preferred_language":"hi"},"module_id":"6ba7b810-9dad-41d1-80b4-00c04fd430c8","nonce":"00112233445566778899aabbccddeeff","pariwar_id":"11111111-1111-1111-1111-111111111111","partner_id":"0f8fad5b-d9cb-469f-a165-70867728950e","submitted_at":"2026-11-21T10:15:30.123Z"}';
const FROZEN_V1 = '30f80543aa4756fbf46ce4f9497d8d6b4584dbab039fb0718b2b19986f42194f';

/** The RECEIVER's check, written independently of the code under test (the ADR's receiver guide): parse, recompute, compare. */
function receiverVerifies(secret: string, header: string, body: Buffer, nowSeconds: number): boolean {
  const m = /^t=(\d+), v1=([0-9a-f]{64})$/.exec(header);
  if (m === null) return false;
  const t = Number(m[1]);
  if (Math.abs(nowSeconds - t) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${m[1]!}.`).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(m[2]!, 'hex'));
}

describe('LeadEnvelopeV1 — the body (QE12)', () => {
  it('equals the frozen bytes (canonical JSON, sorted keys, lower-case ids)', () => {
    expect(buildLeadEnvelopeBody(INPUT).toString('utf-8')).toBe(FROZEN_BODY);
  });

  it('has EXACTLY the v1 keys — ⛔ member_id, ⛔ module text, ⛔ consent text', () => {
    const env = leadEnvelopeV1(INPUT);
    expect(Object.keys(env).sort()).toEqual(
      ['attribution', 'envelope_version', 'lead_id', 'member', 'module_id', 'nonce', 'pariwar_id', 'partner_id', 'submitted_at'].sort(),
    );
    expect(Object.keys(env.attribution).sort()).toEqual(['lead_id', 'module_id', 'pariwar_id', 'source']);
    expect(JSON.stringify(env)).not.toContain('member_id');
  });

  it('its member section is EXACTLY the sealed four (I5)', () => {
    const s = INPUT.sealed;
    expect(leadEnvelopeV1(INPUT).member).toEqual({
      full_name: s.full_name,
      mobile: s.mobile,
      district: s.district,
      preferred_language: s.preferred_language,
    });
  });

  it('the bytes are IDENTICAL on every attempt (nothing depends on the clock or the attempt)', () => {
    expect(buildLeadEnvelopeBody(INPUT).equals(buildLeadEnvelopeBody({ ...INPUT }))).toBe(true);
  });
});

describe('the signature (QE3 (A))', () => {
  const body = Buffer.from(FROZEN_BODY, 'utf-8');

  it('equals the frozen vector — exactly ONE v1', () => {
    const header = leadSignatureHeader(SECRET, T, body);
    expect(header).toBe(`t=${String(T)}, v1=${FROZEN_V1}`);
    expect(header.match(/v1=/g)).toHaveLength(1);
  });

  it('verifies with an independent reference implementation (createHmac over "<t>." + body)', () => {
    expect(receiverVerifies(SECRET, leadSignatureHeader(SECRET, T, body), body, T + 10)).toBe(true);
  });

  it('fails if the body changes by ONE byte', () => {
    const header = leadSignatureHeader(SECRET, T, body);
    const bent = Buffer.from(body);
    bent[bent.length - 3] = bent[bent.length - 3]! ^ 0x01;
    expect(receiverVerifies(SECRET, header, bent, T)).toBe(false);
  });

  it('fails if the timestamp changes', () => {
    const header = leadSignatureHeader(SECRET, T, body).replace(`t=${String(T)}`, `t=${String(T + 1)}`);
    expect(receiverVerifies(SECRET, header, body, T)).toBe(false);
  });

  it('fails under another secret, and outside the receiver window', () => {
    const header = leadSignatureHeader(SECRET, T, body);
    expect(receiverVerifies(`${SECRET}\n`, header, body, T)).toBe(false);
    expect(receiverVerifies(SECRET, header, body, T + 301)).toBe(false);
  });

  it('refuses a t that is not whole unix seconds', () => {
    expect(() => leadSignatureHeader(SECRET, 1.5, body)).toThrow(RangeError);
    expect(() => leadSignatureHeader(SECRET, -1, body)).toThrow(RangeError);
  });
});

describe('the headers (QE3, QE6, QE12)', () => {
  it('the attribution header is EXACTLY `pariwar=<id>, module=<id>, lead_id=<uuid>` (the epic AC)', () => {
    expect(leadAttributionHeader(INPUT)).toBe(
      'pariwar=11111111-1111-1111-1111-111111111111, module=6ba7b810-9dad-41d1-80b4-00c04fd430c8, lead_id=7c9e6679-7425-40de-944b-e07fc1f90ae7',
    );
  });

  it('sends exactly four headers, the Idempotency-Key being the lead id', () => {
    const body = buildLeadEnvelopeBody(INPUT);
    expect(leadRequestHeaders({ secret: SECRET, t: T, body, ...INPUT })).toEqual({
      'Content-Type': 'application/json',
      'X-TWT-Attribution':
        'pariwar=11111111-1111-1111-1111-111111111111, module=6ba7b810-9dad-41d1-80b4-00c04fd430c8, lead_id=7c9e6679-7425-40de-944b-e07fc1f90ae7',
      'X-TWT-Signature': `t=${String(T)}, v1=${FROZEN_V1}`,
      'Idempotency-Key': '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    });
  });
});
