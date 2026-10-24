// Story 11b.4, migration 0182 — the Send's Idempotency-Key lives ON the submission row. Pure legs (no database):
//   · the key's shape (`isMemorialSendIdempotencyKey`) and its LOCKSTEP with the migration's CHECK;
//   · `insertMemorialSubmission`'s SAVEPOINT + 23505 handling, against a recording fake `Db`: a unique violation (direct or
//     drizzle-wrapped `cause.code`) whose key is now on a row ⇒ the replay; one whose key is on no row (another index fired) ⇒
//     rethrown; any other error ⇒ rethrown WITHOUT a re-read; every path rolls back to (or releases) the savepoint.
// The live legs (the index, the CHECK, the grant; the real race) are in `tests/integration/rls/memorial-policy-regression.spec.ts`
// and `apps/api/tests/integration/memorial/{send-commit,races}.spec.ts`.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { PgDialect } from 'drizzle-orm/pg-core';
import type { SQL } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../src/db.js';
import { ids } from '../../src/index.js';
import {
  MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN,
  insertMemorialSubmission,
  isMemorialSendIdempotencyKey,
} from '../../src/memorial/index.js';

describe('the Send key shape (0182)', () => {
  it('admits a UUID, a ULID, a nanoid and exactly 128 characters; refuses blank, 129 characters, whitespace and other punctuation', () => {
    for (const ok of ['0f8c2b1e-6d3a-4c1b-9a7e-2d5f8b3c4a1e', '01HZX5V3K8Q9R7T6Y5W4E3D2C1', 'V1StGXR8_Z5jdHi6B-myT', 'a', `${'A'.repeat(64)}${'z9_-'.repeat(16)}`]) {
      expect(isMemorialSendIdempotencyKey(ok), ok).toBe(true);
    }
    for (const bad of ['', ' ', 'x'.repeat(129), 'has space', 'with.dot', 'semi;colon', 'slash/x', 'ü', 'tab\there', 'new\nline']) {
      expect(isMemorialSendIdempotencyKey(bad), JSON.stringify(bad)).toBe(false);
    }
  });

  it('is not a global (stateful) regex — the same key tests true twice', () => {
    expect(MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN.flags).not.toContain('g');
    expect(isMemorialSendIdempotencyKey('abc')).toBe(true);
    expect(isMemorialSendIdempotencyKey('abc')).toBe(true);
  });

  it('LOCKSTEP: the migration\'s CHECK carries exactly the handler\'s pattern', () => {
    const migration = readFileSync(
      fileURLToPath(new URL('../../migrations/0182_memorial-send-idempotency-key.sql', import.meta.url)),
      'utf8',
    );
    expect(migration).toContain(`idempotency_key ~ '${MEMORIAL_SEND_IDEMPOTENCY_KEY_PATTERN.source}'`);
  });
});

const dialect = new PgDialect();

interface FakeOptions {
  /** What the insert does: return a row, or throw this error. */
  readonly insert: { readonly row: Record<string, unknown> } | { readonly error: unknown };
  /** What the key re-read finds. */
  readonly reread: Record<string, unknown> | null;
}

/** A recording fake of the three `Db` shapes `insertMemorialSubmission` uses (execute / insert…returning / select…limit). */
function fakeDb(opts: FakeOptions) {
  const statements: string[] = [];
  let rereads = 0;
  const db = {
    execute: async (q: SQL) => {
      statements.push(dialect.sqlToQuery(q).sql);
      return { rows: [] };
    },
    insert: () => ({
      values: () => ({
        returning: async () => {
          statements.push('INSERT');
          if ('error' in opts.insert) throw opts.insert.error;
          return [opts.insert.row];
        },
      }),
    }),
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => {
            rereads += 1;
            statements.push('REREAD');
            return opts.reread === null ? [] : [opts.reread];
          },
        }),
      }),
    }),
  };
  return { db: db as unknown as Db, statements, rereads: () => rereads };
}

const values = {
  pariwarId: ids.pariwarId('7a1c3e5f-0b2d-4c6e-8f1a-3b5d7e9f1a2c'),
  poolId: ids.poolId('2b4d6f8a-1c3e-4a5b-9c7d-0e2f4a6b8c1d'),
  claimCaseId: ids.claimId('3c5e7a9b-2d4f-4b6c-8d0e-1f3a5b7c9d2e'),
  deceasedMemberId: ids.memberId('4d6f8b0c-3e5a-4c7d-9e1f-2a4b6c8d0e3f'),
  supersedesSubmissionId: null,
  bodyCiphertext: 'enc:v1:body',
  altTextCiphertext: null,
  photoObjectKey: null,
  photoMime: null,
  authorisationCopyVersion: 'v1',
  authorisationLocale: 'hi' as const,
  handoverRecipient: 'latest' as const,
  handoverNomineeRef: '5e7a9c1d-4f6b-4d8e-8f2a-3b5c7d9e1f4a',
  idempotencyKey: 'k-1',
};

const SAVEPOINT = 'SAVEPOINT memorial_submission_insert';
const RELEASE = 'RELEASE SAVEPOINT memorial_submission_insert';
const ROLLBACK_TO = 'ROLLBACK TO SAVEPOINT memorial_submission_insert';

describe('insertMemorialSubmission — the SAVEPOINT and the 23505 replay (0182)', () => {
  it('a clean insert: SAVEPOINT → INSERT → RELEASE, { kind: inserted }, ⛔ a re-read', async () => {
    const f = fakeDb({ insert: { row: { submissionId: 'new' } }, reread: null });
    const out = await insertMemorialSubmission(f.db, values);
    expect(out).toEqual({ kind: 'inserted', row: { submissionId: 'new' } });
    expect(f.statements).toEqual([SAVEPOINT, 'INSERT', RELEASE]);
  });

  it.each([
    ['a direct pg 23505', Object.assign(new Error('dup'), { code: '23505' })],
    ['a drizzle-wrapped 23505 (cause.code)', Object.assign(new Error('Failed query'), { cause: { code: '23505' } })],
  ])('%s whose key is NOW on a row (an unlocked same-key writer won) ⇒ rolled back to the savepoint, re-read, { kind: replay }', async (_label, error) => {
    const f = fakeDb({ insert: { error }, reread: { submissionId: 'theirs' } });
    const out = await insertMemorialSubmission(f.db, values);
    expect(out).toEqual({ kind: 'replay', row: { submissionId: 'theirs' } });
    // The ROLLBACK TO comes BEFORE the re-read — the caller's transaction is usable again (an aborted tx refuses every statement).
    expect(f.statements).toEqual([SAVEPOINT, 'INSERT', ROLLBACK_TO, 'REREAD']);
  });

  it('a 23505 whose key is on NO row (another index fired — the chain\'s supersedes_uq / pool_root_uq) ⇒ the original error is rethrown', async () => {
    const error = Object.assign(new Error('Failed query'), { cause: { code: '23505' } });
    const f = fakeDb({ insert: { error }, reread: null });
    await expect(insertMemorialSubmission(f.db, values)).rejects.toBe(error);
    expect(f.statements).toEqual([SAVEPOINT, 'INSERT', ROLLBACK_TO, 'REREAD']);
  });

  it('any other error ⇒ rolled back to the savepoint and rethrown, ⛔ a re-read', async () => {
    const error = Object.assign(new Error('check'), { cause: { code: '23514' } });
    const f = fakeDb({ insert: { error }, reread: { submissionId: 'never-read' } });
    await expect(insertMemorialSubmission(f.db, values)).rejects.toBe(error);
    expect(f.rereads()).toBe(0);
    expect(f.statements).toEqual([SAVEPOINT, 'INSERT', ROLLBACK_TO]);
  });
});
