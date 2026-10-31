// Story 12.1 (AC6) — the lead's backstop retry, DB-free. A stub `pg.PoolClient` whose `events_log` INSERT
// always rejects `{ code: '23505', constraint: 'events_log_stream_id_event_version_uq' }`. Asserts:
// `MAX_LEAD_APPEND_ATTEMPTS = 3` attempts in TOTAL, then `ModuleStreamConcurrencyError` propagates; each
// attempt runs inside `SAVEPOINT module_lead_append`, re-issues the `FOR UPDATE`, and ends with
// `ROLLBACK TO` + `RELEASE` (TR3 — a 23505 aborts the transaction, so a retry needs the savepoint); the
// backoff is `min(200, 10·2^attempt)` ms.

import { describe, expect, it } from 'vitest';
import type pg from 'pg';

import { memberId, moduleId, moduleLeadId, pariwarId } from '../../src/ids/index.js';
import { MAX_LEAD_APPEND_ATTEMPTS, leadRetryBackoffMs, submitModuleLead } from '../../src/marketplace/commands.js';
import {
  ModuleLeadAlreadySubmittedError,
  ModuleProjectorInputError,
  ModuleStreamConcurrencyError,
} from '../../src/marketplace/errors.js';

const PARIWAR = pariwarId('11111111-1111-1111-1111-111111111111');
const MODULE = moduleId('6ba7b810-9dad-41d1-80b4-00c04fd430c8');
const MEMBER = memberId('9b2f6c6e-3f4a-4d5b-8c7d-1e2f3a4b5c6d');
const LEAD = moduleLeadId('c56a4180-65aa-42ec-a945-5fd21dec0538');

/** Classify one query by its leading SQL, for the recorded call sequence. */
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
  return `OTHER: ${t.slice(0, 40)}`;
}

function stubClient(insertError: unknown): { client: pg.PoolClient; calls: string[] } {
  const calls: string[] = [];
  const query = async (arg: unknown): Promise<{ rows: unknown[]; rowCount: number; fields: unknown[] }> => {
    const text = typeof arg === 'string' ? arg : String((arg as { text?: unknown }).text ?? '');
    const kind = classify(text);
    calls.push(kind);
    const result = (rows: unknown[]) => ({ rows, rowCount: rows.length, fields: [] });
    switch (kind) {
      case 'LOCK':
        return result([
          {
            current_state: 'active',
            state_event_version: '3',
            slots_remaining: 5,
            slot_capacity: 10,
            valid_from: new Date('2000-01-01T00:00:00Z'),
            valid_until: new Date('2999-01-01T00:00:00Z'),
          },
        ]);
      case 'NOW':
        return result([{ now: new Date() }]);
      case 'HEAD':
        return result([{ max: '3' }]);
      case 'APPEND':
        throw insertError;
      default:
        return result([]);
    }
  };
  return { client: { query } as unknown as pg.PoolClient, calls };
}

const input = {
  pariwarId: PARIWAR,
  moduleId: MODULE,
  auditId: '0d4b8e2a-1c3f-4a5b-9c6d-7e8f9a0b1c2d',
  actor: 'member' as const,
  actorId: MEMBER as string,
  leadId: LEAD,
  memberId: MEMBER,
};

const ONE_ATTEMPT = ['SAVEPOINT', 'LOCK', 'EXISTING', 'NOW', 'HEAD', 'APPEND', 'ROLLBACK TO', 'RELEASE'];

describe('submitModuleLead — the backstop retry (QE7)', () => {
  it('MAX_LEAD_APPEND_ATTEMPTS is 3 and the backoff is min(200, 10·2^attempt)', () => {
    expect(MAX_LEAD_APPEND_ATTEMPTS).toBe(3);
    expect([0, 1, 2, 3, 4, 5].map(leadRetryBackoffMs)).toEqual([10, 20, 40, 80, 160, 200]);
  });

  it('a version conflict is attempted 3 times in total, then ModuleStreamConcurrencyError propagates', async () => {
    const versionConflict = Object.assign(new Error('duplicate key value violates unique constraint'), {
      code: '23505',
      constraint: 'events_log_stream_id_event_version_uq',
    });
    const { client, calls } = stubClient(versionConflict);

    await expect(submitModuleLead(client, input)).rejects.toBeInstanceOf(ModuleStreamConcurrencyError);
    expect(calls.filter((c) => c === 'APPEND')).toHaveLength(MAX_LEAD_APPEND_ATTEMPTS);
    // Each attempt: its own savepoint, the lock RE-ISSUED, and ROLLBACK TO + RELEASE before retrying.
    expect(calls).toEqual([...ONE_ATTEMPT, ...ONE_ATTEMPT, ...ONE_ATTEMPT]);
  });

  it('the conflict is found under a drizzle-style wrapper too (the cause chain is walked — TR3)', async () => {
    const wrapped = Object.assign(new Error('Failed query'), {
      cause: Object.assign(new Error('dup'), { code: '23505', constraint: 'events_log_stream_id_event_version_uq' }),
    });
    const { client, calls } = stubClient(wrapped);
    await expect(submitModuleLead(client, input)).rejects.toBeInstanceOf(ModuleStreamConcurrencyError);
    expect(calls.filter((c) => c === 'APPEND')).toHaveLength(3);
  });

  it('a NON-retriable 23505 (module_lead_member_uq) is mapped and NOT retried', async () => {
    const memberConflict = Object.assign(new Error('dup'), { code: '23505', constraint: 'module_lead_member_uq' });
    const { client, calls } = stubClient(memberConflict);
    await expect(submitModuleLead(client, input)).rejects.toBeInstanceOf(ModuleLeadAlreadySubmittedError);
    expect(calls).toEqual(ONE_ATTEMPT);
  });

  it('the I11 actor check runs FIRST — before any statement', async () => {
    const { client, calls } = stubClient(new Error('unreachable'));
    await expect(submitModuleLead(client, { ...input, actor: 'operator' as never })).rejects.toBeInstanceOf(
      ModuleProjectorInputError,
    );
    await expect(
      submitModuleLead(client, { ...input, actorId: '2c1f0a9e-8b7d-4c6e-9f5a-3b2c1d0e9f8a' }),
    ).rejects.toBeInstanceOf(ModuleProjectorInputError);
    expect(calls).toEqual([]);
  });
});
