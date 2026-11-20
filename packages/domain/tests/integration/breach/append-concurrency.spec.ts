// The breach register — two-connection append race, own-committing (Story 14.3, Task 3; AC6; decision `2026-11-20-467` DL4).
// A `closed` and a `mitigation` append race on two real connections, both CALLING the writer (never a hand copy of its lock).
// Whoever takes the per-incident ADVISORY lock first commits first; the other waits AT that lock, then decides on what it finds:
//   · `closed` first  ⇒ the waiting `mitigation` is refused `breach.incident_closed`, and no entry sits after `closed`;
//   · `mitigation` first ⇒ the waiting `closed` lands after it — `entry_seq` order is commit order.
// The rows COMMIT and an append-only row can never be cleaned up, so every assertion is on this spec's own incident.

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { appendBreachEntry, appendBreachEntryInTx, compareBreachEntrySeq, openBreachIncident, readBreachIncident } from '../../../src/breach/index.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);

/** Wait until backend `pid` is blocked on a heavyweight lock (an advisory lock shows as wait_event_type `Lock`). */
async function untilWaitingOnLock(observer: pg.Pool, pid: number, ms = 5000): Promise<string> {
  const deadline = Date.now() + ms;
  for (;;) {
    const { rows } = await observer.query<{ t: string | null; e: string | null }>(
      `SELECT wait_event_type AS t, wait_event AS e FROM pg_stat_activity WHERE pid = $1`,
      [pid],
    );
    if (rows[0]?.t === 'Lock') return rows[0].e ?? '';
    if (Date.now() > deadline) throw new Error(`backend ${String(pid)} never waited on a lock`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe.skipIf(!hasDatabase)('the breach register — two-connection append race (own-committing)', { timeout: 20_000 }, () => {
  let pool: pg.Pool;
  /** Writer B's pool — ONE connection, so its backend pid is known before the race. */
  let poolB: pg.Pool;
  const actor = randomUUID();

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 4 });
    poolB = new pg.Pool({ connectionString: DATABASE_URL, max: 1 });
  });
  afterAll(async () => {
    await poolB.end();
    await pool.end();
  });

  const newIncident = async () =>
    (
      await openBreachIncident(pool, {
        incidentId: randomUUID(),
        isRehearsal: true,
        title: 'Race spec (rehearsal)',
        becameAwareAt: new Date(Date.now() - 60_000),
        detectionSource: 'other',
        actorId: actor,
        actorDisplay: 'Race Spec',
        auditId: randomUUID(),
      })
    ).incident.incidentId;
  const input = (incidentId: string, kind: 'closed' | 'mitigation' | 'note') => ({
    entryId: randomUUID(),
    incidentId,
    kind,
    payload: kind === 'closed' ? { summary: 'closed by the race' } : kind === 'note' ? { text: 'a note' } : { measures: 'a measure', status: 'implemented' },
    actorId: actor,
    actorDisplay: 'Race Spec',
    auditId: randomUUID(),
  });

  /** A holds the lock with `first` (uncommitted); B calls the own-committing writer with `second` and must WAIT; then A commits. */
  async function race(incidentId: string, first: 'closed' | 'mitigation', second: 'closed' | 'mitigation' | 'note', secondSpelling: (id: string) => string = (id) => id) {
    const pidB = (await poolB.query<{ pid: number }>('SELECT pg_backend_pid() AS pid')).rows[0]!.pid;
    const a = await pool.connect();
    let bWrite: Promise<unknown> | undefined;
    try {
      await a.query('BEGIN');
      await appendBreachEntryInTx(a, input(incidentId, first));
      const b = appendBreachEntry(poolB, input(secondSpelling(incidentId), second)).then(
        (value) => ({ ok: true as const, value }),
        (error: unknown) => ({ ok: false as const, error }),
      );
      bWrite = b;
      expect(await untilWaitingOnLock(pool, pidB)).toBe('advisory');
      await a.query('COMMIT');
      return await b;
    } finally {
      await a.query('ROLLBACK').catch(() => undefined);
      a.release();
      await bWrite?.catch(() => undefined);
    }
  }

  it('⭐ `closed` commits first: the waiting `mitigation` is refused `breach.incident_closed`; no entry has a higher `entry_seq` than `closed`', async () => {
    const incidentId = await newIncident();
    const b = await race(incidentId, 'closed', 'mitigation');
    expect(b.ok).toBe(false);
    expect(b.ok ? null : b.error).toMatchObject({ code: 'breach.incident_closed', status: 409 });
    const read = await readBreachIncident(pool, incidentId);
    expect(read?.entries.map((e) => e.kind)).toEqual(['closed']);
    const closedSeq = read!.entries.find((e) => e.kind === 'closed')!.entrySeq;
    expect(read!.entries.every((e) => compareBreachEntrySeq(e.entrySeq, closedSeq) <= 0)).toBe(true);
  });

  it('⭐ `mitigation` commits first: the waiting `closed` lands AFTER it — `entry_seq` order is commit order — and then nothing more is admitted', async () => {
    const incidentId = await newIncident();
    const b = await race(incidentId, 'mitigation', 'closed');
    expect(b.ok).toBe(true);
    const read = await readBreachIncident(pool, incidentId);
    expect(read?.entries.map((e) => e.kind)).toEqual(['mitigation', 'closed']);
    expect(compareBreachEntrySeq(read!.entries[0]!.entrySeq, read!.entries[1]!.entrySeq)).toBeLessThan(0);
    expect(read!.entries[0]!.recordedAt.getTime()).toBeLessThanOrEqual(read!.entries[1]!.recordedAt.getTime());
    await expect(appendBreachEntry(pool, input(incidentId, 'mitigation'))).rejects.toMatchObject({ code: 'breach.incident_closed' });
  });

  it('⭐ the id in ANOTHER CASE takes the SAME lock: `closed` first ⇒ an upper-case `note` waits, then is refused (review 2026-11-20)', async () => {
    const incidentId = await newIncident();
    const b = await race(incidentId, 'closed', 'note', (id) => id.toUpperCase());
    expect(b.ok).toBe(false);
    expect(b.ok ? null : b.error).toMatchObject({ code: 'breach.incident_closed', status: 409 });
    expect((await readBreachIncident(pool, incidentId))?.entries.map((e) => e.kind)).toEqual(['closed']);
  });

  it('two appends to DIFFERENT incidents never wait on each other', async () => {
    const one = await newIncident();
    const two = await newIncident();
    const a = await pool.connect();
    try {
      await a.query('BEGIN');
      await appendBreachEntryInTx(a, input(one, 'mitigation'));
      const other = await appendBreachEntry(poolB, input(two, 'mitigation'));
      expect(other.entries.map((e) => e.kind)).toEqual(['mitigation']);
      await a.query('COMMIT');
    } finally {
      await a.query('ROLLBACK').catch(() => undefined);
      a.release();
    }
  });
});
