// Claim-time nominee bank CONCURRENCY — true two-connection races (Story 6.8, Task 7).
//
// The sequential nominee-bank.spec proves latest-wins BEHAVIOUR + the PRESENCE of the claim row
// lock on a single connection. This spec proves the third level the 6.7 retro flagged: ACTUAL
// two-connection race behaviour — that the `SELECT … FOR UPDATE` claim row lock the writer takes
// serialises genuinely concurrent, own-committing editors, so exactly one editor's pair survives
// cleanly (no interleaved/partial rows, no duplicate-rank constraint violation surfaced as an
// unhandled error).
//
// Why the outcome is deterministic (NOT flaky): the claim row lock serialises the two writers; the
// second acquires it only after the first commits, then does its own delete-then-insert. The final
// state is ALWAYS exactly two rows (one editor's pair), and no attempt errors on a duplicate rank
// (the loser deletes before it inserts).
//
// ⚠ Own-committing (NOT setupLiveDb): a real race needs REAL concurrent COMMITs on SEPARATE pool
// clients. Cleanup is by the specific claim ids this suite creates: a `claims` delete cascades to
// claim_nominee_bank_accounts; `events_log` is append-only, so its rows are removed under
// `SET LOCAL session_replication_role='replica'`. Assertions key on our OWN ids, never absolute
// counts — [[project_live_db_test_gotchas]].

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import { projectClaimState, recordClaimNomineeBankAccounts } from '../../../src/claim/index.js';
import type { NomineeBankAccountInput } from '../../../src/claim/nominee-bank-persist.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
const MEMBER_ACTOR = '99999999-9999-9999-9999-999999999999';
const TIMEOUT = 20_000;

const accountsFixture = (tag: string): NomineeBankAccountInput[] => [
  {
    accountRank: 1,
    accountHolderNameCiphertext: `enc:v1:holder-1:${tag}`,
    accountNumberCiphertext: `enc:v1:acct-1:${tag}`,
    ifscCiphertext: `enc:v1:ifsc-1:${tag}`,
    vpaCiphertext: null,
    bankName: 'State Bank of India',
    branch: 'Nariman Point',
    ifscValidated: true,
  },
  {
    accountRank: 2,
    accountHolderNameCiphertext: `enc:v1:holder-2:${tag}`,
    accountNumberCiphertext: `enc:v1:acct-2:${tag}`,
    ifscCiphertext: `enc:v1:ifsc-2:${tag}`,
    vpaCiphertext: null,
    bankName: 'HDFC Bank',
    branch: 'Worli',
    ifscValidated: true,
  },
];

describe.skipIf(!hasDatabase)('claim-time nominee bank — two-connection concurrency (own-committing)', () => {
  let pool: pg.Pool;
  const createdClaims: string[] = [];

  async function onOwnTx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (err) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw err;
    } finally {
      client.release();
    }
  }

  async function seedClaimInVerification(): Promise<ClaimId> {
    const cid = toClaimId(randomUUID());
    const mid: MemberId = toMemberId(randomUUID());
    createdClaims.push(cid);
    await onOwnTx(async (client) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
        projectClaimState(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          deceasedMemberId: mid,
          intakeChannels: ['member_app'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra },
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', {
        deceased_member_id: mid,
        intake_channel: 'member_app',
        claimant_actor_id: null,
      });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
        selected_member_ids: [randomUUID()],
        metric_id: 'district_cohort_v1',
        metric_version: 1,
      });
    });
    return cid;
  }

  async function countRows(sql: string, params: unknown[]): Promise<number> {
    const r = await pool.query(sql, params);
    return Number((r.rows[0] as { n: string }).n);
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) => console.error('[nominee-bank-concurrency.spec] idle client error:', err.message));
  });

  afterAll(async () => {
    if (createdClaims.length > 0) {
      await pool
        .query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims])
        .catch((e: Error) => console.error('[nominee-bank-concurrency.spec] claims cleanup:', e.message));
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[nominee-bank-concurrency.spec] events_log cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  it(
    'N concurrent recordings on ONE claim → the claim row lock serialises them; exactly one pair persists, no duplicate-rank error',
    async () => {
      const cid = await seedClaimInVerification();
      const N = 6;

      const results = await Promise.allSettled(
        Array.from({ length: N }, (_, i) =>
          onOwnTx((client) =>
            recordClaimNomineeBankAccounts(client, {
              claimCaseId: cid,
              pariwarId: PARIWAR_A,
              accounts: accountsFixture(`writer-${i}`),
              recordedByActor: MEMBER_ACTOR,
              actor: 'member',
            }),
          ),
        ),
      );

      // Every attempt SUCCEEDS — the FOR UPDATE lock serialises them; each does its own
      // delete-then-insert, so none hits a duplicate-rank (23505) constraint violation.
      const rejected = results.flatMap((r) => (r.status === 'rejected' ? [r.reason] : []));
      expect(rejected).toEqual([]);

      // The DB holds EXACTLY the two accounts of the last committer — never 3+ rows, never a torn pair.
      expect(
        await countRows('SELECT count(*)::text AS n FROM claim_nominee_bank_accounts WHERE claim_case_id = $1', [cid]),
      ).toBe(2);
      const rows = (
        await pool.query(
          'SELECT account_rank, account_number_ciphertext FROM claim_nominee_bank_accounts WHERE claim_case_id = $1 ORDER BY account_rank',
          [cid],
        )
      ).rows as Array<{ account_rank: number; account_number_ciphertext: string }>;
      expect(rows.map((r) => r.account_rank)).toEqual([1, 2]);

      // Whole-writer-pair coherence (review finding, 2026-07-11): the surviving pair must be
      // WHOLLY one writer's commit, never a mix of e.g. rank #1 from writer-2 and rank #2 from
      // writer-5. Each fixture's ciphertext embeds its own writer tag (`enc:v1:acct-{rank}:{tag}`)
      // — extract the tag from each row and assert they match each other AND are one of the N
      // attempted writer tags (not merely equal-by-coincidence, e.g. both undefined).
      const tagOf = (ciphertext: string, rank: 1 | 2): string => {
        const prefix = `enc:v1:acct-${rank}:`;
        expect(ciphertext.startsWith(prefix)).toBe(true);
        return ciphertext.slice(prefix.length);
      };
      const tagRank1 = tagOf(rows[0]!.account_number_ciphertext, 1);
      const tagRank2 = tagOf(rows[1]!.account_number_ciphertext, 2);
      expect(tagRank2).toBe(tagRank1);
      expect(Array.from({ length: N }, (_, i) => `writer-${i}`)).toContain(tagRank1);

      // One identity event per successful recording (all N committed, serialised).
      expect(
        await countRows(
          "SELECT count(*)::text AS n FROM events_log WHERE stream_id = $1 AND event_type = 'claim.nominee_bank_recorded'",
          [cid],
        ),
      ).toBe(N);
    },
    TIMEOUT,
  );
});
