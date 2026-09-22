// Story 6.18 — the CHECK WRITE under true two-connection races (Task 7, checklist family 2 residual).
//
// ⚠⚠ WHY A SECOND CONCURRENCY FILE. `nominee-name-check-return-concurrency.spec.ts` closed the
// RETURN loop's exclusion invariants. The family-2 bullet said *"no two-connection race is proven for
// ANY new write"*, and `recordNomineeNameCheck` — the write this whole story exists to add — still
// had none. This closes that.
//
// ⭐ THE INVARIANT UNDER TEST is AC3's staleness rule, which is a rule ABOUT CONCURRENCY and is
// therefore ⛔ unprovable on one connection. `recordNomineeNameCheck` refuses when a submitted
// `account_updated_at` no longer matches the live row:
//     *"account #N was edited after the names were read — check again"*
// On a single connection the bank edit and the check share a transaction, so the check always reads
// its own edit and the guard can ⛔ never fire for the reason it exists. Two own-committing
// connections are the only way to produce the real sequence: read stamps → someone else commits an
// edit → submit.
//
// ⚠⚠ AND A DELIBERATE DIFFERENCE FROM THE RETURN-LOOP SPEC: there, an exact 1-fulfilled/1-rejected
// partition was correct, because the two writers were mutually exclusive by construction. Here they
// are ⛔ NOT: which transaction acquires the `claims` row lock first is genuinely unspecified, and
// BOTH orderings are legitimate. Asserting "the check always fails" would be asserting a race
// outcome, and such a test passes or fails with the scheduler.
// ⇒ so this asserts the INVARIANT that holds under BOTH orderings, and asserts it exactly:
//     · the bank write ALWAYS succeeds (it is serialised and carries no staleness guard); and
//     · the check EITHER succeeds against stamps that were live when it ran, OR is refused with the
//       TYPED `NomineeNameCheckStaleError` — and ⛔ never, under any ordering, succeeds while
//       carrying stamps that the accounts no longer have.
//   That last clause is the actual safety property: a recorded verdict must describe the accounts
//   that were really there ([[feedback_gate_scope_semantic_coverage]] — pin the rule, not a timing).

import { randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { setPariwarScope } from '../../../src/db.js';
import { claimId as toClaimId, memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import type { ClaimId, MemberId } from '../../../src/ids/index.js';
import {
  NomineeNameCheckStaleError,
  getLatestNomineeNameCheck,
  isNomineeNameCheckCurrent,
  projectClaimState,
  recordClaimNomineeBankAccounts,
  recordNomineeNameCheck,
} from '../../../src/claim/index.js';
import type { NomineeBankAccountInput } from '../../../src/claim/nominee-bank-persist.js';
import { bindScopedDb } from '../../../src/db.js';

const DATABASE_URL = process.env['DATABASE_URL'];
const hasDatabase = Boolean(DATABASE_URL);
const PARIWAR_A = toPariwarId('11111111-1111-1111-1111-111111111111');
const DISTRICT_ADMIN = '77777777-7777-7777-7777-777777777777';
const MEMBER_ACTOR = '99999999-9999-9999-9999-999999999999';
const TIMEOUT = 20_000;

const accountsFixture = (tag: string): NomineeBankAccountInput[] =>
  [1, 2].map((rank) => ({
    accountRank: rank as 1 | 2,
    accountHolderNameCiphertext: `enc:v1:holder-${rank}-${tag}`,
    accountNumberCiphertext: `enc:v1:acct-${rank}-${tag}`,
    ifscCiphertext: `enc:v1:ifsc-${rank}-${tag}`,
    vpaCiphertext: null,
    nameDifferenceNoteCiphertext: null,
    bankName: rank === 1 ? 'State Bank of India' : 'HDFC Bank',
    branch: 'Nariman Point, Mumbai',
    ifscValidated: true,
  }));

describe.skipIf(!hasDatabase)('Story 6.18 — the check write vs a concurrent bank edit (own-committing)', () => {
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

  /** A claim at `verifier_review` with two live accounts — the state a check is recordable in. */
  async function seedClaimWithAccounts(): Promise<{ cid: ClaimId; mid: MemberId }> {
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
      await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
      await recordClaimNomineeBankAccounts(client, {
        claimCaseId: cid,
        pariwarId: PARIWAR_A,
        accounts: accountsFixture('seed'),
        recordedByActor: MEMBER_ACTOR,
        actor: 'member',
      });
    });
    return { cid, mid };
  }

  /** The live `(rank, updated_at)` stamps — what a District Admin's screen would have read. */
  async function liveStamps(cid: ClaimId): Promise<{ accountRank: number; updatedAt: Date }[]> {
    const r = await pool.query(
      `SELECT account_rank AS "accountRank", updated_at AS "updatedAt"
         FROM claim_nominee_bank_accounts
        WHERE claim_case_id = $1 ORDER BY account_rank`,
      [cid],
    );
    return r.rows as { accountRank: number; updatedAt: Date }[];
  }

  async function tokenFor(mid: MemberId): Promise<string> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SET LOCAL ROLE twt_app');
      await setPariwarScope(client, PARIWAR_A);
      const { getMemberNomineeDeclarationRefs } = await import('../../../src/nominee/declaration-ref.js');
      const { deriveNomineeDeclarationToken } = await import('../../../src/claim/nominee-name-check.js');
      const refs = await getMemberNomineeDeclarationRefs(bindScopedDb(client), PARIWAR_A, mid);
      await client.query('COMMIT');
      return deriveNomineeDeclarationToken(refs);
    } finally {
      client.release();
    }
  }

  beforeAll(() => {
    pool = new pg.Pool({ connectionString: DATABASE_URL, max: 16, ssl: false, connectionTimeoutMillis: 5000 });
    pool.on('error', (err) =>
      console.error('[nominee-name-check-write-concurrency.spec] idle client error:', err.message),
    );
  });

  afterAll(async () => {
    if (createdClaims.length > 0) {
      await pool
        .query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [createdClaims])
        .catch((e: Error) => console.error('[nominee-name-check-write-concurrency.spec] claims cleanup:', e.message));
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        await c.query("SET LOCAL session_replication_role = 'replica'");
        await c.query('DELETE FROM events_log WHERE stream_id = ANY($1)', [createdClaims]);
        await c.query('COMMIT');
      } catch (e) {
        await c.query('ROLLBACK').catch(() => undefined);
        console.error('[nominee-name-check-write-concurrency.spec] events_log cleanup:', (e as Error).message);
      } finally {
        c.release();
      }
    }
    await pool.end();
  });

  // ── D5's FOUNDATION — that the REAL writer moves `updated_at` at all ──────────────────────
  //
  // ⚠⚠ THE WHOLE OF D5 RESTS ON THIS AND ⛔ NOTHING PROVED IT (code review, added 2026-09-22).
  // Every staleness test in this story moved the stamp BY HAND —
  // `tx.update(...).set({ updatedAt: new Date(Date.now() + 60_000) })` — and then asserted that a
  // moved stamp stales a check. ⭐ That proves the COMPARISON, ⛔ never the PREMISE. If
  // `recordClaimNomineeBankAccounts` were changed to an UPSERT that preserved `updated_at`, D5
  // would be silently disabled — a post-approval correction would leave the old check CURRENT and
  // every AC4 gate would wave it through — and EVERY one of those tests would still be green.
  //
  // ⭐ It has to be here, and ⛔ not in the single-transaction suite, for the reason the earlier
  // sibling records: Postgres `now()` is TRANSACTION-START time, so inside one BEGIN the
  // before-stamp and the after-stamp are the SAME VALUE however many times you rewrite the rows.
  // The `_helpers.ts` comment already says a spec whose subject is the D5 chain must drive the real
  // writer across two COMMITTED transactions; this is that spec.

  it(
    '⭐⭐ the REAL writer moves `updated_at` across two COMMITTED transactions — D5 has a premise',
    async () => {
      const { cid } = await seedClaimWithAccounts();
      const before = await liveStamps(cid);
      expect(before).toHaveLength(2);

      // ⛔ NON-VACUITY, AND IT IS THE INTERESTING HALF: within the SEEDING transaction both rows
      // carry the identical `now()`. So "the stamps differ afterwards" cannot be explained by the
      // rows having been staggered to begin with.
      expect(
        new Set(before.map((s) => s.updatedAt.toISOString())).size,
        'the two seeded rows already had different stamps — the assertion below would be weaker',
      ).toBe(1);

      await onOwnTx((client) =>
        recordClaimNomineeBankAccounts(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          accounts: accountsFixture('d5-premise'),
          recordedByActor: MEMBER_ACTOR,
          actor: 'member',
        }),
      );

      const after = await liveStamps(cid);
      expect(after).toHaveLength(2);
      for (const row of after) {
        const was = before.find((b) => b.accountRank === row.accountRank);
        expect(was, `rank ${row.accountRank} vanished`).toBeDefined();
        // ⭐ STRICTLY LATER. `>=` would pass for a writer that preserved the timestamp, which is
        // the exact regression this test exists to catch.
        expect(
          row.updatedAt.getTime(),
          `rank ${row.accountRank}: the writer did not move updated_at — D5 is disabled`,
        ).toBeGreaterThan(was!.updatedAt.getTime());
      }
    },
    TIMEOUT,
  );

  it(
    '⭐⭐ …and that ALONE stales a recorded PASSING check — D5 end to end, ⛔ no hand-written UPDATE',
    async () => {
      // ⭐ THE CHAIN D5 ACTUALLY CLAIMS, with every link driven by production code:
      //   record a passing check → it is CURRENT → the real bank writer commits a correction →
      //   the SAME check is now STALE. ⛔ No `tx.update`, ⛔ no fabricated timestamp.
      const { cid, mid } = await seedClaimWithAccounts();
      const token = await tokenFor(mid);
      const stamps = await liveStamps(cid);

      await onOwnTx((client) =>
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: token,
          accounts: stamps.map((s) => ({
            accountRank: s.accountRank as 1 | 2,
            accountUpdatedAt: s.updatedAt.toISOString(),
            verdict: 'matches' as const,
            clericalReason: null,
          })),
          actorId: DISTRICT_ADMIN,
          actorDisplay: 'Anita (District Admin)',
          actor: 'operator',
        }),
      );

      const recorded = await onOwnTx((client) =>
        getLatestNomineeNameCheck(bindScopedDb(client), PARIWAR_A, cid),
      );
      expect(recorded, 'the check was not recorded — everything below would be vacuous').not.toBeNull();

      // ⭐ POSITIVE CONTROL — CURRENT before the correction. Without this, "stale afterwards" could
      // equally mean the check was never current at all (a token mismatch, a rank mismatch, …).
      const liveRefs = (await liveStamps(cid)).map((s) => ({
        accountRank: s.accountRank,
        updatedAt: s.updatedAt,
      }));
      expect(
        isNomineeNameCheckCurrent(recorded!, liveRefs, token),
        'the freshly recorded check was ALREADY not current',
      ).toBe(true);

      // The helpline corrects the accounts — the real writer, its own committed transaction.
      await onOwnTx((client) =>
        recordClaimNomineeBankAccounts(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          accounts: accountsFixture('d5-corrected'),
          recordedByActor: MEMBER_ACTOR,
          actor: 'member',
        }),
      );

      const refsAfter = (await liveStamps(cid)).map((s) => ({
        accountRank: s.accountRank,
        updatedAt: s.updatedAt,
      }));
      expect(
        isNomineeNameCheckCurrent(recorded!, refsAfter, token),
        'a correction left the old check CURRENT — `-227` cl.12 / D5 is not holding',
      ).toBe(false);

      // ⭐ AND THE DECLARATION TOKEN IS ⛔ NOT WHAT CHANGED. A reader could otherwise suspect the
      // staleness came from the nominee side; it did not — the token is byte-identical.
      expect(await tokenFor(mid)).toBe(token);
    },
    TIMEOUT,
  );

  it(
    '⭐⭐ READ stamps → ANOTHER connection commits an edit → SUBMIT ⇒ the TYPED staleness refusal (the real sequence)',
    async () => {
      // ⚠⚠ THIS IS THE TEST THAT ACTUALLY PROVES THE GUARD, and it exists because the free-running
      // race below does ⛔ NOT reach this arm: instrumented over 5 consecutive runs it took the
      // "check won the lock" branch 5/5 times. A branch a fixture never reaches is ⛔ not covered
      // ([[project_live_db_test_gotchas]] — the arms must be REACHED or they are unreachable).
      //
      // ⭐ Ordering is forced here, and that is the POINT, ⛔ not a weakening: this is the real-world
      // sequence AC3's guard was written for — a District Admin reads the names, a helpline operator
      // corrects an account while the verdict is being typed, and the verdict is then submitted
      // against stamps that have moved. It is still a genuine TWO-CONNECTION test: the edit COMMITS
      // on a separate connection before the check runs, which is precisely what ⛔ cannot be
      // expressed on one connection, where the check would read its own uncommitted edit.
      const { cid, mid } = await seedClaimWithAccounts();
      const stampsAsRead = await liveStamps(cid);
      const token = await tokenFor(mid);
      expect(stampsAsRead).toHaveLength(2);

      // Someone else edits the accounts — on their OWN connection, and it COMMITS.
      await onOwnTx((client) =>
        recordClaimNomineeBankAccounts(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          accounts: accountsFixture('corrected-first'),
          recordedByActor: MEMBER_ACTOR,
          actor: 'member',
        }),
      );

      const stampsNow = await liveStamps(cid);
      expect(
        stampsNow.map((s) => s.updatedAt.toISOString()),
        'the edit did not move the stamps — the refusal below would be vacuous',
      ).not.toEqual(stampsAsRead.map((s) => s.updatedAt.toISOString()));

      // The District Admin submits the verdict they formed BEFORE the edit.
      await expect(
        onOwnTx((client) =>
          recordNomineeNameCheck(client, {
            claimCaseId: cid,
            pariwarId: PARIWAR_A,
            nomineeDeclarationToken: token,
            accounts: stampsAsRead.map((s) => ({
              accountRank: s.accountRank as 1 | 2,
              accountUpdatedAt: s.updatedAt.toISOString(),
              verdict: 'matches' as const,
              clericalReason: null,
            })),
            actorId: DISTRICT_ADMIN,
            actorDisplay: 'Anita (District Admin)',
            actor: 'operator',
          }),
        ),
      ).rejects.toBeInstanceOf(NomineeNameCheckStaleError);

      // ⭐ And nothing was recorded — a refusal that still wrote would be the worst outcome of all.
      const recorded = await onOwnTx((client) =>
        getLatestNomineeNameCheck(bindScopedDb(client), PARIWAR_A, cid),
      );
      expect(recorded, 'a stale submission left a recorded verdict behind').toBeNull();
    },
    TIMEOUT,
  );

  it(
    '⭐⭐ a check racing a bank edit is EITHER recorded against live stamps OR refused as stale — ⛔ never recorded stale',
    async () => {
      const { cid, mid } = await seedClaimWithAccounts();
      const stamps = await liveStamps(cid);
      const token = await tokenFor(mid);
      expect(stamps, 'the fixture produced no accounts — the race below would be vacuous').toHaveLength(2);

      // ⭐ THE REAL SEQUENCE: the District Admin has already READ these stamps (above), and a
      // helpline operator edits the accounts at the same moment the verdict is submitted.
      const [checkResult, bankResult] = await Promise.allSettled([
        onOwnTx((client) =>
          recordNomineeNameCheck(client, {
            claimCaseId: cid,
            pariwarId: PARIWAR_A,
            nomineeDeclarationToken: token,
            accounts: stamps.map((s) => ({
              accountRank: s.accountRank as 1 | 2,
              accountUpdatedAt: s.updatedAt.toISOString(),
              verdict: 'matches' as const,
              clericalReason: null,
            })),
            actorId: DISTRICT_ADMIN,
            actorDisplay: 'Anita (District Admin)',
            actor: 'operator',
          }),
        ),
        onOwnTx((client) =>
          recordClaimNomineeBankAccounts(client, {
            claimCaseId: cid,
            pariwarId: PARIWAR_A,
            accounts: accountsFixture('corrected'),
            recordedByActor: MEMBER_ACTOR,
            actor: 'member',
          }),
        ),
      ]);

      // ⭐ The bank write has no staleness guard and is serialised — it always lands.
      expect(bankResult.status, 'the bank edit should always succeed').toBe('fulfilled');

      const afterStamps = await liveStamps(cid);
      const recorded = await onOwnTx((client) =>
        getLatestNomineeNameCheck(bindScopedDb(client), PARIWAR_A, cid),
      );

      if (checkResult.status === 'rejected') {
        // ⚠ OBSERVED: on this machine the check wins the lock 5/5 runs, so this arm is ⛔ NOT
        // reached in practice — the forced-order test above is what proves the refusal. This arm is
        // kept because the ordering is genuinely unspecified and a scheduler change must ⛔ not turn
        // a correct refusal into a test failure.
        // The refusal must be the TYPED staleness error — a raw error here would reach the District
        // Admin as a 500 instead of "check again".
        expect(checkResult.reason).toBeInstanceOf(NomineeNameCheckStaleError);
        expect(recorded, 'a refused check must leave NO recorded verdict').toBeNull();
      } else {
        // ⭐ The check won the lock. Then its stamps must be exactly the ones it submitted — and
        // ⛔ NOT the post-edit ones, which is the corruption this whole invariant guards against.
        expect(recorded).not.toBeNull();
        expect(recorded?.accounts.map((a) => a.accountUpdatedAt).sort()).toEqual(
          stamps.map((s) => s.updatedAt.toISOString()).sort(),
        );
        // And the bank edit that followed genuinely moved the stamps, so the check is now STALE
        // for approval purposes — which is AC5's rule, observed rather than assumed.
        expect(afterStamps.map((s) => s.updatedAt.toISOString()).sort()).not.toEqual(
          stamps.map((s) => s.updatedAt.toISOString()).sort(),
        );
      }
    },
    TIMEOUT,
  );

  it(
    '⭐ two concurrent CHECKS both land — a check does ⛔ not edit accounts, so neither can stale the other',
    async () => {
      // ⚠ This is the POSITIVE CONTROL for the test above: it proves the staleness refusal is caused
      // by the BANK EDIT and ⛔ not by concurrency as such. Two checks race on the same claim lock,
      // neither touches `claim_nominee_bank_accounts`, so both submit stamps that are still live.
      const { cid, mid } = await seedClaimWithAccounts();
      const stamps = await liveStamps(cid);
      const token = await tokenFor(mid);

      const mkCheck = (who: string) => (client: pg.PoolClient) =>
        recordNomineeNameCheck(client, {
          claimCaseId: cid,
          pariwarId: PARIWAR_A,
          nomineeDeclarationToken: token,
          accounts: stamps.map((s) => ({
            accountRank: s.accountRank as 1 | 2,
            accountUpdatedAt: s.updatedAt.toISOString(),
            verdict: 'matches' as const,
            clericalReason: null,
          })),
          actorId: DISTRICT_ADMIN,
          actorDisplay: who,
          actor: 'operator',
        });

      const results = await Promise.allSettled([
        onOwnTx(mkCheck('Anita (District Admin)')),
        onOwnTx(mkCheck('Bhavna (District Admin)')),
      ]);

      expect(
        results.filter((r) => r.status === 'rejected').map((r) => (r as PromiseRejectedResult).reason?.message),
        'a concurrent check was refused — staleness must come from an ACCOUNT EDIT, not from concurrency',
      ).toEqual([]);

      // ⭐ Two events, one claim, no interleaving corruption — and the latest read is one of them.
      const recorded = await onOwnTx((client) =>
        getLatestNomineeNameCheck(bindScopedDb(client), PARIWAR_A, cid),
      );
      expect(recorded).not.toBeNull();
      expect(['Anita (District Admin)', 'Bhavna (District Admin)']).toContain(recorded?.checkedByActorDisplay);

      // ⚠ 2026-09-22 (code review): "two events, one claim" was asserted only through the LATEST
      // read above, which proves ⛔ only that neither write was REJECTED — a silent no-op on the
      // loser (an appender that swallows a second write instead of appending it) would satisfy that
      // too. Query `events_log` directly to confirm TWO distinct `claim.nominee_name_checked` events
      // really landed, not one.
      const eventCount = await onOwnTx(async (client) => {
        const r = await client.query<{ count: string }>(
          `SELECT count(*)::text AS count FROM events_log WHERE pariwar_id = $1 AND stream_id = $2 AND event_type = $3`,
          [PARIWAR_A, cid, 'claim.nominee_name_checked'],
        );
        return Number(r.rows[0]!.count);
      });
      expect(eventCount, 'two concurrent checks landed but events_log carries fewer than two events').toBe(2);
    },
    TIMEOUT,
  );
});
