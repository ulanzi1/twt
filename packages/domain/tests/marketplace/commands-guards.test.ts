// Story 12.1 (AC5, AC6, QE6, QE7, I10) — the command guards, DB-free. A stub `pg.PoolClient` answers the handful
// of statements a command issues, in the shape drizzle's node-postgres driver reads back (`rowMode: 'array'` for a
// `RETURNING`), so the WHOLE success path runs. It pins what the live specs cannot cheaply reach:
//   - the QE7 refusal ORDER, exhaustively: replay first, then not-active, outside-window, slots, duplicate lead,
//     already submitted (code review RP3 / RP13);
//   - the half-open window [valid_from, valid_until) at EQUALITY, per command (QE6; RP7);
//   - I10: SAVEPOINT → LOCK → NOW → HEAD → APPEND for schedule / activate / archive (RP4);
//   - the lead retry's RECOVERY path and its observed backoff (AC6; RP12).

import { afterEach, describe, expect, it, vi } from 'vitest';
import type pg from 'pg';

import { memberId, moduleId, moduleLeadId, pariwarId } from '../../src/ids/index.js';
import { activateModule, archiveModule, scheduleModule, submitModuleLead } from '../../src/marketplace/commands.js';
import {
  ModuleArchiveReasonNotSatisfiedError,
  ModuleGenesisMissingError,
  ModuleLeadAlreadySubmittedError,
  ModuleLeadDuplicateError,
  ModuleNotActiveError,
  ModuleOutsideWindowError,
  ModuleSlotsExhaustedError,
} from '../../src/marketplace/errors.js';
import type { MarketplaceModuleState } from '../../src/schema/marketplace_modules.js';

const PARIWAR = pariwarId('11111111-1111-1111-1111-111111111111');
const MODULE = moduleId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const MEMBER = memberId('9b2f6c6e-3f4a-4d5b-8c7d-1e2f3a4b5c6d');
const OTHER_MEMBER = '3a4b5c6d-9b2f-4c6e-8d1e-2f3a9b2f6c6e';
const LEAD = moduleLeadId('c56a4180-65aa-42ec-a945-5fd21dec0538');
const OTHER_LEAD = 'd1e2f3a4-b5c6-4d7e-8f90-a1b2c3d4e5f6';
const STAFF = '2c1f0a9e-8b7d-4c6e-9f5a-3b2c1d0e9f8a';
const AUDIT = '0d4b8e2a-1c3f-4a5b-9c6d-7e8f9a0b1c2d';
const EVENT_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';

const HOUR = 3_600_000;
/** The transaction-start instant every command judges against. */
const NOW = new Date('2026-11-15T12:00:00.000Z');
const at = (offsetMs: number): Date => new Date(NOW.getTime() + offsetMs);

interface StubRow {
  state: MarketplaceModuleState;
  version: number;
  slotsRemaining: number | null;
  slotCapacity: number | null;
  validFrom: Date;
  validUntil: Date;
}
const ROW: StubRow = {
  state: 'active',
  version: 3,
  slotsRemaining: 5,
  slotCapacity: 10,
  validFrom: at(-HOUR),
  validUntil: at(HOUR),
};

interface Behaviour {
  /** The locked row; `null` ⇒ no row in this Pariwar. */
  row?: Partial<StubRow> | null;
  /** The stream's existing leads that match the call's lead id OR member. */
  existing?: { lead_id: string; member_id: string }[];
  /** Errors the events_log INSERT throws, in order; once exhausted the INSERT succeeds. */
  appendFailures?: unknown[];
}

function classify(text: string): string {
  const t = text.trim().replace(/\s+/g, ' ');
  if (t.startsWith('SAVEPOINT')) return 'SAVEPOINT';
  if (t.startsWith('ROLLBACK TO SAVEPOINT')) return 'ROLLBACK TO';
  if (t.startsWith('RELEASE SAVEPOINT')) return 'RELEASE';
  if (t.includes('FROM marketplace_modules') && t.endsWith('FOR UPDATE')) return 'LOCK';
  if (t.startsWith('SELECT payload, event_version FROM events_log')) return 'EXISTING';
  if (t.startsWith('SELECT now()')) return 'NOW';
  if (t.startsWith('SELECT max(event_version)')) return 'HEAD';
  if (/^insert into "events_log"/i.test(t)) return 'APPEND';
  if (/^update "marketplace_modules"/i.test(t)) return 'UPDATE';
  if (t.startsWith('SET LOCAL app.marketplace_module_state_writer')) return t.includes("'on'") ? 'GUARD ON' : 'GUARD OFF';
  return `OTHER: ${t.slice(0, 40)}`;
}

function stub(b: Behaviour = {}): { client: pg.PoolClient; calls: string[] } {
  const row = b.row === null ? null : { ...ROW, ...b.row };
  const failures = [...(b.appendFailures ?? [])];
  const calls: string[] = [];
  const query = async (arg: unknown): Promise<{ rows: unknown[]; rowCount: number; fields: unknown[] }> => {
    const cfg = typeof arg === 'string' ? { text: arg } : (arg as { text?: unknown; rowMode?: string });
    const kind = classify(String(cfg.text ?? ''));
    calls.push(kind);
    const out = (rows: unknown[]) => ({ rows, rowCount: rows.length, fields: [] });
    const returning = (value: string) => out((cfg as { rowMode?: string }).rowMode === 'array' ? [[value]] : [{ value }]);
    switch (kind) {
      case 'LOCK':
        return out(
          row === null
            ? []
            : [
                {
                  current_state: row.state,
                  state_event_version: String(row.version),
                  slots_remaining: row.slotsRemaining,
                  slot_capacity: row.slotCapacity,
                  valid_from: row.validFrom,
                  valid_until: row.validUntil,
                },
              ],
        );
      case 'EXISTING':
        return out(
          (b.existing ?? []).map((e, i) => ({
            payload: { lead_id: e.lead_id, member_id: e.member_id, slots_remaining_after: 4 },
            event_version: String(4 + i),
          })),
        );
      case 'NOW':
        return out([{ now: NOW }]);
      case 'HEAD':
        return out([{ max: String(row?.version ?? 0) }]);
      case 'APPEND': {
        const failure = failures.shift();
        if (failure !== undefined) throw failure;
        return returning(EVENT_ID);
      }
      case 'UPDATE':
        return returning(MODULE);
      default:
        return out([]);
    }
  };
  return { client: { query } as unknown as pg.PoolClient, calls };
}

const staff = { pariwarId: PARIWAR, moduleId: MODULE, auditId: AUDIT, actor: 'operator' as const, actorId: STAFF };
const leadInput = {
  pariwarId: PARIWAR,
  moduleId: MODULE,
  auditId: AUDIT,
  actor: 'member' as const,
  actorId: MEMBER as string,
  memberId: MEMBER,
  leadId: LEAD,
};
const MINE = { lead_id: LEAD, member_id: MEMBER as string };

afterEach(() => {
  vi.restoreAllMocks();
});

describe('submitModuleLead — the QE7 order, exhaustively (RP3, RP13)', () => {
  const PAST = { validFrom: at(-2 * HOUR), validUntil: at(-HOUR) };

  it.each([
    ['an archived module', { state: 'archived' as const }],
    ['a draft module', { state: 'draft' as const }],
    ['a scheduled module', { state: 'scheduled' as const }],
    ['a window that has closed', PAST],
    ['a capped module at 0 places', { slotsRemaining: 0 }],
  ])('a REPLAY beats the refusal for %s — the original result, no new event', async (_label, row) => {
    const { client, calls } = stub({ row, existing: [MINE] });
    await expect(submitModuleLead(client, leadInput)).resolves.toMatchObject({ replayed: true, leadId: LEAD });
    expect(calls).not.toContain('APPEND');
  });

  it.each([
    ['not_found: no row in this Pariwar', { row: null }, ModuleGenesisMissingError],
    ['not_active: a draft module', { row: { state: 'draft' as const } }, ModuleNotActiveError],
    ['not_active: a scheduled module', { row: { state: 'scheduled' as const } }, ModuleNotActiveError],
    ['not_active: an archived module', { row: { state: 'archived' as const } }, ModuleNotActiveError],
    ['not_active BEATS outside_window', { row: { state: 'draft' as const, ...PAST } }, ModuleNotActiveError],
    ['outside_window: the window has closed', { row: PAST }, ModuleOutsideWindowError],
    ['outside_window BEATS slots_exhausted', { row: { ...PAST, slotsRemaining: 0 } }, ModuleOutsideWindowError],
    [
      'slots_exhausted BEATS duplicate_lead',
      { row: { slotsRemaining: 0 }, existing: [{ lead_id: LEAD, member_id: OTHER_MEMBER }] },
      ModuleSlotsExhaustedError,
    ],
    [
      'duplicate_lead BEATS already_submitted',
      {
        existing: [
          { lead_id: LEAD, member_id: OTHER_MEMBER },
          { lead_id: OTHER_LEAD, member_id: MEMBER as string },
        ],
      },
      ModuleLeadDuplicateError,
    ],
    ['already_submitted: this member, another lead id', { existing: [{ lead_id: OTHER_LEAD, member_id: MEMBER as string }] }, ModuleLeadAlreadySubmittedError],
  ])('%s', async (_label, behaviour, errorClass) => {
    const { client, calls } = stub(behaviour as Behaviour);
    await expect(submitModuleLead(client, leadInput)).rejects.toBeInstanceOf(errorClass);
    expect(calls).not.toContain('APPEND');
    expect(calls.slice(-2)).toEqual(['ROLLBACK TO', 'RELEASE']); // the caller's transaction stays usable
  });
});

describe('the half-open window [valid_from, valid_until) at EQUALITY (QE6, RP7)', () => {
  const reached = (calls: string[]): boolean => calls.includes('APPEND');

  it('activate: valid_from is INCLUSIVE, valid_until is EXCLUSIVE', async () => {
    const open = stub({ row: { state: 'scheduled', validFrom: at(0), validUntil: at(HOUR) } });
    await expect(activateModule(open.client, staff)).resolves.toMatchObject({ state: 'active' });
    const justBefore = stub({ row: { state: 'scheduled', validFrom: at(1), validUntil: at(HOUR) } });
    await expect(activateModule(justBefore.client, staff)).rejects.toBeInstanceOf(ModuleOutsideWindowError);
    expect(reached(justBefore.calls)).toBe(false);

    const lastMs = stub({ row: { state: 'scheduled', validFrom: at(-HOUR), validUntil: at(1) } });
    await expect(activateModule(lastMs.client, staff)).resolves.toMatchObject({ state: 'active' });
    const closed = stub({ row: { state: 'scheduled', validFrom: at(-HOUR), validUntil: at(0) } });
    await expect(activateModule(closed.client, staff)).rejects.toBeInstanceOf(ModuleOutsideWindowError);
    expect(reached(closed.calls)).toBe(false);
  });

  it('schedule: only while now < valid_from (so now == valid_from is refused)', async () => {
    const equal = stub({ row: { state: 'draft', validFrom: at(0), validUntil: at(HOUR) } });
    await expect(scheduleModule(equal.client, staff)).rejects.toBeInstanceOf(ModuleOutsideWindowError);
    expect(reached(equal.calls)).toBe(false);
    const before = stub({ row: { state: 'draft', validFrom: at(1), validUntil: at(HOUR) } });
    await expect(scheduleModule(before.client, staff)).resolves.toMatchObject({ state: 'scheduled' });
  });

  it('lead: now == valid_from is open, now == valid_until is closed', async () => {
    const first = stub({ row: { validFrom: at(0), validUntil: at(HOUR) } });
    await expect(submitModuleLead(first.client, leadInput)).resolves.toMatchObject({ replayed: false });
    const closed = stub({ row: { validFrom: at(-HOUR), validUntil: at(0) } });
    await expect(submitModuleLead(closed.client, leadInput)).rejects.toBeInstanceOf(ModuleOutsideWindowError);
    expect(reached(closed.calls)).toBe(false);
  });

  it('archive valid_until_reached: now == valid_until is enough, 1 ms short is not', async () => {
    const equal = stub({ row: { validFrom: at(-HOUR), validUntil: at(0) } });
    await expect(archiveModule(equal.client, { ...staff, reason: 'valid_until_reached' })).resolves.toMatchObject({
      state: 'archived',
    });
    const short = stub({ row: { validFrom: at(-HOUR), validUntil: at(1) } });
    await expect(archiveModule(short.client, { ...staff, reason: 'valid_until_reached' })).rejects.toBeInstanceOf(
      ModuleArchiveReasonNotSatisfiedError,
    );
    expect(reached(short.calls)).toBe(false);
  });
});

describe('I10 — the row lock comes before any events_log read or append (RP4)', () => {
  const PREFIX = ['SAVEPOINT', 'LOCK', 'NOW', 'HEAD', 'APPEND'];

  it.each([
    ['schedule', { state: 'draft' as const, validFrom: at(HOUR), validUntil: at(2 * HOUR) }, (c: pg.PoolClient) => scheduleModule(c, staff)],
    ['activate', { state: 'draft' as const }, (c: pg.PoolClient) => activateModule(c, staff)],
    ['archive', {}, (c: pg.PoolClient) => archiveModule(c, { ...staff, reason: 'trustee_archived' })],
  ])('%s: SAVEPOINT → LOCK → NOW → HEAD → APPEND, then the guarded UPDATE', async (_label, row, run) => {
    const { client, calls } = stub({ row });
    await run(client);
    expect(calls.slice(0, PREFIX.length)).toEqual(PREFIX);
    expect(calls.slice(PREFIX.length)).toEqual(['GUARD ON', 'UPDATE', 'GUARD OFF', 'RELEASE']);
  });

  it('lead: SAVEPOINT → LOCK → EXISTING → NOW → HEAD → APPEND', async () => {
    const { client, calls } = stub();
    await submitModuleLead(client, leadInput);
    expect(calls.slice(0, 6)).toEqual(['SAVEPOINT', 'LOCK', 'EXISTING', 'NOW', 'HEAD', 'APPEND']);
  });
});

describe('the lead retry — recovery and backoff (AC6, RP12)', () => {
  const versionConflict = (): Error =>
    Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      constraint: 'events_log_stream_id_event_version_uq',
    });

  /** Record every delay `setTimeout` is asked for, and run it at once. */
  function recordDelays(): number[] {
    const delays: number[] = [];
    const real = globalThis.setTimeout;
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void, ms?: number) => {
      delays.push(ms ?? 0);
      return real(fn, 0);
    }) as never);
    return delays;
  }

  it('two version conflicts and then success: three attempts, the lock re-issued each time, backoff 10 then 20 ms', async () => {
    const delays = recordDelays();
    const { client, calls } = stub({ appendFailures: [versionConflict(), versionConflict()] });

    await expect(submitModuleLead(client, leadInput)).resolves.toMatchObject({ replayed: false, eventVersion: 4 });

    expect(delays).toEqual([10, 20]);
    for (const kind of ['SAVEPOINT', 'LOCK', 'EXISTING', 'NOW', 'HEAD', 'APPEND']) {
      expect(calls.filter((c) => c === kind)).toHaveLength(3);
    }
    expect(calls.filter((c) => c === 'UPDATE')).toHaveLength(1);
    expect(calls.filter((c) => c === 'ROLLBACK TO')).toHaveLength(2);
  });

  it('exhaustion sleeps BETWEEN attempts only: 3 attempts, two sleeps (10, 20), none after the last', async () => {
    const delays = recordDelays();
    const { client } = stub({ appendFailures: [versionConflict(), versionConflict(), versionConflict()] });
    await expect(submitModuleLead(client, leadInput)).rejects.toThrow();
    expect(delays).toEqual([10, 20]);
  });
});
