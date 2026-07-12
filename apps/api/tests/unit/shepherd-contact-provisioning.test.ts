// Shepherd staff-contact provisioning unit tests — Story 6.12 (Task 8, R1).
//
// The E.164 write-path validation on `users.contact_phone` / `users.contact_whatsapp` (the provisioning
// seam): a PRESENT contact must be canonical E.164 or throw InvalidContactChannelError BEFORE any DB write;
// `null`/`undefined`/'' is a valid absent channel (passes null through). Pure — a stub pool proves the
// query is (or is not) reached and receives the normalized values.

import { describe, expect, it, vi } from 'vitest';

import {
  E164_REGEX,
  InvalidContactChannelError,
  updateShepherdContact,
} from '../../src/modules/auth/admin/admin-auth.repo.js';

describe('E164_REGEX', () => {
  it('accepts canonical E.164 and rejects non-E.164', () => {
    expect(E164_REGEX.test('+919000000001')).toBe(true);
    expect(E164_REGEX.test('+14155550100')).toBe(true);
    expect(E164_REGEX.test('9000000001')).toBe(false); // no +country
    expect(E164_REGEX.test('+0123456789')).toBe(false); // leading 0 country
    expect(E164_REGEX.test('+91 90000 00001')).toBe(false); // spaces
    expect(E164_REGEX.test('')).toBe(false);
  });
});

describe('updateShepherdContact', () => {
  function stubPool(rowCount = 1) {
    const query = vi.fn().mockResolvedValue({ rowCount });
    return { query } as unknown as import('pg').Pool & { query: ReturnType<typeof vi.fn> };
  }

  it('writes normalized E.164 channels and returns the row count', async () => {
    const pool = stubPool(1);
    const n = await updateShepherdContact(pool, 'user-1', { phone: '+919000000001', whatsapp: '+919000000002' });
    expect(n).toBe(1);
    expect(pool.query).toHaveBeenCalledTimes(1);
    const args = pool.query.mock.calls[0]![1] as unknown[];
    expect(args).toEqual(['user-1', '+919000000001', '+919000000002']);
  });

  it('passes null through for an absent/empty channel (a valid one-channel shepherd)', async () => {
    const pool = stubPool(1);
    await updateShepherdContact(pool, 'user-1', { phone: '+919000000001', whatsapp: '' });
    const args = pool.query.mock.calls[0]![1] as unknown[];
    expect(args).toEqual(['user-1', '+919000000001', null]);
  });

  it('THROWS InvalidContactChannelError on a malformed value BEFORE any DB write', async () => {
    const pool = stubPool();
    await expect(updateShepherdContact(pool, 'user-1', { phone: '9000000001' })).rejects.toBeInstanceOf(
      InvalidContactChannelError,
    );
    expect(pool.query).not.toHaveBeenCalled();
  });
});
