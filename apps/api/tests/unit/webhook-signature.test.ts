// Meta X-Hub-Signature-256 verification — DB-free unit tests (Story 5.4, Task 4).

import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { verifyMetaSignature } from '../../src/modules/channel-webhooks/signature.js';

const SECRET = 'app-secret-value';
const BODY = Buffer.from(JSON.stringify({ object: 'whatsapp_business_account', entry: [] }), 'utf8');

function sign(body: Buffer, secret: string): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

describe('verifyMetaSignature', () => {
  it('accepts a correct signature over the exact raw body', () => {
    expect(verifyMetaSignature(BODY, sign(BODY, SECRET), SECRET)).toBe(true);
  });

  it('rejects a signature computed with the wrong secret', () => {
    expect(verifyMetaSignature(BODY, sign(BODY, 'wrong-secret'), SECRET)).toBe(false);
  });

  it('rejects when the body was tampered after signing', () => {
    const sig = sign(BODY, SECRET);
    const tampered = Buffer.from(BODY.toString('utf8').replace('entry', 'entrx'), 'utf8');
    expect(verifyMetaSignature(tampered, sig, SECRET)).toBe(false);
  });

  it('fails closed on an absent header', () => {
    expect(verifyMetaSignature(BODY, undefined, SECRET)).toBe(false);
  });

  it('fails closed on a header missing the sha256= prefix', () => {
    const hex = createHmac('sha256', SECRET).update(BODY).digest('hex');
    expect(verifyMetaSignature(BODY, hex, SECRET)).toBe(false);
  });

  it('fails closed on a malformed (non-hex / wrong-length) signature', () => {
    expect(verifyMetaSignature(BODY, 'sha256=not-hex', SECRET)).toBe(false);
    expect(verifyMetaSignature(BODY, 'sha256=abcd', SECRET)).toBe(false);
  });
});
