// Unit test for `withCompensatingAudit` (ADR-0030 / Epic 5 retro AI-5-3).
//
// `writeAuditEntry` is mocked — this asserts the PROTOCOL (call order, the
// `_rolled_back` action derivation, the swallow-and-rethrow shape), not the real
// hash-chain writer (that's `write.ts`'s own concern, exercised live via the
// channel-config / degraded-mode integration specs).

import { beforeEach, describe, expect, it, vi } from 'vitest';

const writeAuditEntry = vi.fn();

vi.mock('../../src/audit/write.js', () => ({
  writeAuditEntry,
}));

const { withCompensatingAudit } = await import('../../src/audit/compensating.js');

const INTENT = {
  pariwarId: '11111111-1111-1111-1111-111111111111',
  actorId: '22222222-2222-2222-2222-222222222222',
  actorRole: null,
  action: 'pariwar.wa_config_update',
  resourceLocator: 'pariwar/p1/channel-config/whatsapp',
  requestPayloadHash: 'a'.repeat(64),
  traceId: null,
};

const FAKE_POOL = {} as never;

describe('withCompensatingAudit', () => {
  beforeEach(() => {
    writeAuditEntry.mockReset();
  });

  it('writes the intent audit line, then runs mutate, and returns its result on success', async () => {
    writeAuditEntry.mockResolvedValue({ auditId: 'row-1' });
    const mutate = vi.fn().mockResolvedValue('mutate-result');

    const result = await withCompensatingAudit(FAKE_POOL, { auditIntent: INTENT, mutate });

    expect(result).toBe('mutate-result');
    expect(writeAuditEntry).toHaveBeenCalledTimes(1);
    expect(writeAuditEntry).toHaveBeenCalledWith(FAKE_POOL, { ...INTENT, responseStatus: 200 });
    // mutate must run AFTER the intent audit commits — assert ordering via call sequencing.
    const auditOrder = writeAuditEntry.mock.invocationCallOrder[0];
    const mutateOrder = mutate.mock.invocationCallOrder[0];
    expect(auditOrder).toBeDefined();
    expect(mutateOrder).toBeDefined();
    expect(auditOrder as number).toBeLessThan(mutateOrder as number);
  });

  it('fires a compensating `${action}_rolled_back` line (status 500) and rethrows when mutate throws', async () => {
    writeAuditEntry.mockResolvedValueOnce({ auditId: 'row-1' }).mockResolvedValueOnce({ auditId: 'row-2' });
    const boom = new Error('mutation failed');
    const mutate = vi.fn().mockRejectedValue(boom);

    await expect(withCompensatingAudit(FAKE_POOL, { auditIntent: INTENT, mutate })).rejects.toBe(boom);

    expect(writeAuditEntry).toHaveBeenCalledTimes(2);
    expect(writeAuditEntry).toHaveBeenNthCalledWith(1, FAKE_POOL, { ...INTENT, responseStatus: 200 });
    expect(writeAuditEntry).toHaveBeenNthCalledWith(2, FAKE_POOL, {
      ...INTENT,
      action: 'pariwar.wa_config_update_rolled_back',
      responseStatus: 500,
    });
  });

  it('swallows a failure in the compensating write itself and still rethrows the ORIGINAL error', async () => {
    writeAuditEntry
      .mockResolvedValueOnce({ auditId: 'row-1' })
      .mockRejectedValueOnce(new Error('compensating write also failed'));
    const originalErr = new Error('original mutation error');
    const mutate = vi.fn().mockRejectedValue(originalErr);

    await expect(withCompensatingAudit(FAKE_POOL, { auditIntent: INTENT, mutate })).rejects.toBe(originalErr);
    expect(writeAuditEntry).toHaveBeenCalledTimes(2);
  });

  it('never calls mutate when the intent audit write itself throws', async () => {
    const intentErr = new Error('intent audit write failed');
    writeAuditEntry.mockRejectedValueOnce(intentErr);
    const mutate = vi.fn();

    await expect(withCompensatingAudit(FAKE_POOL, { auditIntent: INTENT, mutate })).rejects.toBe(intentErr);
    expect(mutate).not.toHaveBeenCalled();
    // No compensating write either — nothing was armed (the intent line never committed).
    expect(writeAuditEntry).toHaveBeenCalledTimes(1);
  });
});
