// `closeScopeTx` — the five properties of a change to every scope-tx caller (Story 6.36a's code review, round 2, 2026-10-15:
// a failed COMMIT is RETHROWN; it used to be swallowed as "a broken connection on close"). ⛔ A database: a stub client whose
// `query` resolves or rejects on demand.
//   (i)   COMMIT rejects ⇒ `closeScopeTx(…, true)` REJECTS (the caller must ⛔ report success);
//   (ii)  ROLLBACK rejects ⇒ resolves (there is nothing to lose);
//   (iii) the client is released on EVERY path — exactly once;
//   (iv)  a second close is a no-op (⛔ a double release, ⛔ a second statement) — the provisioning route's ROLLBACK after
//         its own failed COMMIT;
//   (v)   a tx whose `scopeSet` was cleared FIRST still COMMITs (the helpline write's `releaseHookTx`) — the no-op is keyed
//         on `closed`, ⛔ on `scopeSet`.

import type pg from 'pg';
import { describe, expect, it, vi } from 'vitest';

import { closeScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../src/types.js';

function stub(fail: 'COMMIT' | 'ROLLBACK' | null): { scopeTx: ScopeTx; query: ReturnType<typeof vi.fn>; release: ReturnType<typeof vi.fn> } {
  const query = vi.fn(async (text: string) => {
    if (text === fail) throw new Error(`${text} failed`);
    return { rows: [] };
  });
  const release = vi.fn();
  const client = { query, release } as unknown as pg.PoolClient;
  const scopeTx: ScopeTx = { client, tx: {} as ScopeTx['tx'], pariwarId: '00000000-0000-4000-8000-000000000001', scopeSet: true };
  return { scopeTx, query, release };
}

describe('closeScopeTx — a failed COMMIT is rethrown; the client is always released once', () => {
  it('(i) a COMMIT that fails REJECTS the close, and the client is released', async () => {
    const { scopeTx, release } = stub('COMMIT');
    await expect(closeScopeTx(scopeTx, true)).rejects.toThrow('COMMIT failed');
    expect(release).toHaveBeenCalledTimes(1);
    expect(scopeTx.scopeSet).toBe(false);
    expect(scopeTx.closed).toBe(true);
  });

  it('(ii) a ROLLBACK that fails is non-fatal, and the client is released', async () => {
    const { scopeTx, release } = stub('ROLLBACK');
    await expect(closeScopeTx(scopeTx, false)).resolves.toBeUndefined();
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('(iii) the happy paths COMMIT / ROLLBACK exactly once and release once', async () => {
    for (const commit of [true, false]) {
      const { scopeTx, query, release } = stub(null);
      await closeScopeTx(scopeTx, commit);
      expect(query).toHaveBeenCalledTimes(1);
      expect(query).toHaveBeenCalledWith(commit ? 'COMMIT' : 'ROLLBACK');
      expect(release).toHaveBeenCalledTimes(1);
    }
  });

  it('(iv) a second close is a no-op — the ROLLBACK after a failed COMMIT (the provisioning shape) sends ⛔ a statement, releases ⛔ again', async () => {
    const { scopeTx, query, release } = stub('COMMIT');
    await expect(closeScopeTx(scopeTx, true)).rejects.toThrow();
    await closeScopeTx(scopeTx, false);
    expect(query).toHaveBeenCalledTimes(1);
    expect(release).toHaveBeenCalledTimes(1);
  });

  it('(v) a tx whose `scopeSet` was cleared first (the helpline write) still COMMITs and releases', async () => {
    const { scopeTx, query, release } = stub(null);
    scopeTx.scopeSet = false;
    await closeScopeTx(scopeTx, true);
    expect(query).toHaveBeenCalledWith('COMMIT');
    expect(release).toHaveBeenCalledTimes(1);
  });
});
