// Story 12.5 (AC2's seal half; QE5 (A), QE11 (A)) — the v1 member-field allow-list and the seal / open. DB-free (the fake KMS).
//
// ⚠ TR13: the Devanagari name is BUILT with `String.fromCharCode` — a typed one lands raw (and with invisible joiners) on disk.

import { randomBytes, randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { createFakeKmsProvider } from '../../src/encryption/fake-kms-provider.js';
import { encryptTier1, serializeEnvelope } from '../../src/encryption/envelope.js';
import type { KmsProvider } from '../../src/encryption/kms-provider.js';
import {
  LeadHandoffDecryptUnavailableError,
  LeadHandoffFieldsInvalidError,
  LeadHandoffFieldsUnreadableError,
} from '../../src/marketplace/errors.js';
import {
  leadMemberFieldsV1Schema,
  openLeadMemberFieldsV1,
  parseLeadMemberFieldsInput,
  sealLeadMemberFieldsV1,
  sealedLeadMemberFieldsV1Schema,
} from '../../src/marketplace/lead-member-fields.js';

const kms = createFakeKmsProvider({ kekBytes: randomBytes(32), hmacKeyBytes: randomBytes(32) });
const enc = { kms, kekRef: { resourceName: 'projects/p/locations/l/keyRings/r/cryptoKeys/k' } };
const P = randomUUID();

/** "राम कुमार" — built from code points (TR13). */
const HINDI_NAME = String.fromCharCode(0x0930, 0x093e, 0x092e, 0x0020, 0x0915, 0x0941, 0x092e, 0x093e, 0x0930);

const valid = {
  full_name: 'Sita Devi Kumari Prasad',
  mobile: '98765 43210',
  district: 'Patna',
  preferred_language: 'hi' as const,
};

describe('LeadMemberFieldsV1 — the allow-list (QE5 (A))', () => {
  it('accepts the four, normalises the mobile to +91, and keeps the name WHOLE (⛔ trimmed, ⛔ shortened)', () => {
    const name = '  Ram Prasad Singh Yadav  ';
    const out = parseLeadMemberFieldsInput({ ...valid, full_name: name });
    expect(out).toEqual({ full_name: name, mobile: '+919876543210', district: 'Patna', preferred_language: 'hi' });
  });

  it('accepts a Devanagari name byte for byte, and a null district', () => {
    const out = parseLeadMemberFieldsInput({ ...valid, full_name: HINDI_NAME, district: null });
    expect(out.full_name).toBe(HINDI_NAME);
    expect(out.district).toBeNull();
  });

  it.each([
    ['a fifth key (.strict())', { ...valid, date_of_birth: '1980-01-01' }, 'date_of_birth'],
    ['a missing mobile', { full_name: 'A', district: null, preferred_language: 'en' }, 'mobile'],
    ['a mobile normalizeMobile rejects', { ...valid, mobile: '12345' }, 'mobile'],
    ['a landline-shaped number', { ...valid, mobile: '0412-2234567' }, 'mobile'],
    ['a blank name', { ...valid, full_name: '   ' }, 'full_name'],
    ['an empty name', { ...valid, full_name: '' }, 'full_name'],
    ['a 121-character name', { ...valid, full_name: 'x'.repeat(121) }, 'full_name'],
    ['a NUL in the name', { ...valid, full_name: `a${String.fromCharCode(0)}b` }, 'full_name'],
    ['an unpaired surrogate in the district', { ...valid, district: `a${String.fromCharCode(0xd800)}` }, 'district'],
    ['a language outside hi | en', { ...valid, preferred_language: 'bn' }, 'preferred_language'],
  ])('refuses %s (LeadHandoffFieldsInvalidError naming the FIELD, ⛔ its value)', (_label, input, field) => {
    let caught: unknown;
    try {
      parseLeadMemberFieldsInput(input);
    } catch (err) {
      caught = err;
    }
    expect(caught).toBeInstanceOf(LeadHandoffFieldsInvalidError);
    const e = caught as LeadHandoffFieldsInvalidError;
    expect(e.fields).toContain(field);
    expect(e.message).not.toContain('12345');
    expect(e.message).not.toContain('1980');
  });

  it('the STORED schema takes only the canonical mobile', () => {
    expect(leadMemberFieldsV1Schema.safeParse({ ...valid, mobile: '+919876543210' }).success).toBe(true);
    expect(leadMemberFieldsV1Schema.safeParse({ ...valid, mobile: '9876543210' }).success).toBe(false);
  });
});

describe('sealLeadMemberFieldsV1 / openLeadMemberFieldsV1 (QE11 (A))', () => {
  it('round-trips the sealed object: version 1, a 32-hex nonce, the four', async () => {
    const leadId = randomUUID();
    const sealed = await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId, fields: valid });
    expect(sealed.startsWith('enc:v1:')).toBe(true);
    const opened = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId, ciphertext: sealed });
    expect(opened).toEqual({
      version: 1,
      nonce: expect.stringMatching(/^[0-9a-f]{32}$/),
      full_name: valid.full_name,
      mobile: '+919876543210',
      district: 'Patna',
      preferred_language: 'hi',
    });
    expect(sealedLeadMemberFieldsV1Schema.safeParse(opened).success).toBe(true);
  });

  it('mints a FRESH nonce on every call (a replay seals anew)', async () => {
    const leadId = randomUUID();
    const a = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId, ciphertext: await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId, fields: valid }) });
    const b = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId, ciphertext: await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId, fields: valid }) });
    expect(a.nonce).not.toBe(b.nonce);
  });

  it('refuses invalid fields BEFORE any KMS call', async () => {
    let calls = 0;
    const spy: KmsProvider = { ...kms, encryptDek: async (...a) => { calls += 1; return kms.encryptDek(...a); } };
    await expect(sealLeadMemberFieldsV1({ ...enc, kms: spy }, { pariwarId: P, leadId: randomUUID(), fields: { ...valid, mobile: 'x' } })).rejects.toBeInstanceOf(
      LeadHandoffFieldsInvalidError,
    );
    expect(calls).toBe(0);
  });

  it('a string sealed for one lead_id does NOT open as another lead (the rowKey)', async () => {
    const sealed = await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId: randomUUID(), fields: valid });
    const err = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId: randomUUID(), ciphertext: sealed }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LeadHandoffFieldsUnreadableError);
    expect(['key_rejected', 'authentication']).toContain((err as LeadHandoffFieldsUnreadableError).stage);
  });

  it('nor under another Pariwar', async () => {
    const leadId = randomUUID();
    const sealed = await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId, fields: valid });
    await expect(openLeadMemberFieldsV1(enc, { pariwarId: randomUUID(), leadId, ciphertext: sealed })).rejects.toBeInstanceOf(LeadHandoffFieldsUnreadableError);
  });

  it('classifies: not an envelope ⇒ envelope', async () => {
    const err = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId: randomUUID(), ciphertext: 'not-an-envelope' }).catch((e: unknown) => e);
    expect((err as LeadHandoffFieldsUnreadableError).stage).toBe('envelope');
  });

  it('classifies: a key service that fails any other way ⇒ unavailable (retry helps)', async () => {
    const leadId = randomUUID();
    const sealed = await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId, fields: valid });
    const down: KmsProvider = { ...kms, decryptDek: () => Promise.reject(Object.assign(new Error('unavailable'), { code: 14 })) };
    await expect(openLeadMemberFieldsV1({ ...enc, kms: down }, { pariwarId: P, leadId, ciphertext: sealed })).rejects.toBeInstanceOf(
      LeadHandoffDecryptUnavailableError,
    );
  });

  it('classifies: the key unwrapped but the tag failed ⇒ authentication', async () => {
    const leadId = randomUUID();
    const sealed = await sealLeadMemberFieldsV1(enc, { pariwarId: P, leadId, fields: valid });
    const json = JSON.parse(Buffer.from(sealed.slice('enc:v1:'.length), 'base64').toString('utf-8')) as Record<string, string>;
    const ct = Buffer.from(json['ciphertext']!, 'base64');
    ct[0] = (ct[0]! ^ 0xff) & 0xff;
    json['ciphertext'] = ct.toString('base64');
    const tampered = 'enc:v1:' + Buffer.from(JSON.stringify(json), 'utf-8').toString('base64');
    const err = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId, ciphertext: tampered }).catch((e: unknown) => e);
    expect((err as LeadHandoffFieldsUnreadableError).stage).toBe('authentication');
  });

  it('classifies: it opens but is not a sealed object ⇒ schema', async () => {
    const leadId = randomUUID();
    const bogus = serializeEnvelope(
      await encryptTier1(Buffer.from(JSON.stringify({ version: 1, full_name: 'x' }), 'utf-8'), { pariwarId: P, fieldClass: 'module_lead_fields', rowKey: leadId }, kms, enc.kekRef),
    );
    const err = await openLeadMemberFieldsV1(enc, { pariwarId: P, leadId, ciphertext: bogus }).catch((e: unknown) => e);
    expect((err as LeadHandoffFieldsUnreadableError).stage).toBe('schema');
  });
});
