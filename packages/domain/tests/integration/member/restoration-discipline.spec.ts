// The restoration-discipline instrument, on the live DB — Story 10.23 (AC2, AC3, AC4, AC10b). :5433
//
// What can only be proved here, and not in the pure suite:
//   · AC3  — the FR-8 VERSION PIN survives a Trustee re-tune (needs real clause_versions rows);
//   · AC3  — the RATIFIED unprovisioned posture: no clause ⇒ no row AND no event;
//   · AC4  — `expires_at` is DB-authoritative and CALENDAR-correct (Postgres interval arithmetic);
//   · AC2  — idempotency + the ratified re-imposition bar, against a real event stream;
//   · AC10b — migration 0036's `LIKE 'member.%'` trigger already covers this family (asserted,
//             never assumed — the whole point of Story 10.24's contrasting `0093` sibling trigger).

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import {
  clauseVersionId as toClauseVersionId,
  memberId as toMemberId,
  pariwarId as toPariwarId,
} from '../../../src/ids/index.js';
import {
  getCurrentMemberRestorationDiscipline,
  getMemberRestorationDiscipline,
} from '../../../src/member/restoration-discipline/overlay.js';
import { resolveRestorationDisciplinePolicy } from '../../../src/member/restoration-discipline/policy.js';
import { imposeRestorationLockIn } from '../../../src/member/restoration-discipline/write.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { memberRestorationImpositions } from '../../../src/schema/member_restoration_impositions.js';
import { memberValidityCache } from '../../../src/schema/member_validity_cache.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import {
  PARIWAR_A,
  PARIWAR_B,
  enterAppScope,
  seedClauseVersion,
  seedEvent,
  seedMember,
} from '../_helpers.js';

const POLICY_CLAUSE = 'niy.restoration-discipline.policy';
const R7D = 'niy.contribution-discipline.r7-d';

/** R7(D): 3-month lock-in + catch-up — an UNSATISFIABLE completion condition (Escalation 6). */
const R7D_PAYLOAD = { restoration: { lock_in_months: 3, catch_up_required: true } };
/** R7(C)-shaped: 3-month lock-in + a SATISFIABLE consecutive-contribution package. */
const SATISFIABLE_PAYLOAD = { restoration: { lock_in_months: 3, consecutive_required: 5 } };

const ANCHOR = {
  earliestSkipClosedAt: new Date('2026-03-15T00:00:00.000Z'),
  lastConfirmedAt: new Date('2026-02-01T00:00:00.000Z'),
  skipsCurrentYear: 1,
};

/**
 * Which DB constraint did this write violate? Drizzle WRAPS the pg error ("Failed query: …"), so the
 * constraint name lives on `err.cause`, NOT on `err.message` — the same shape the 23505 savepoint
 * retry relies on ([[project_domain_limit_clamp_and_savepoint_retry]]). Asserting on the NAME rather
 * than merely "it threw" is what makes these the revert-sanity teeth for the two CHECKs: drop a CHECK
 * from migration 0097 and the write SUCCEEDS, so the assertion fails instead of passing on some
 * unrelated error. (The `banners.spec.ts` precedent, reused verbatim.)
 */
function violatedConstraint(err: unknown): string | undefined {
  return (err as { cause?: { constraint?: string } } | undefined)?.cause?.constraint;
}

/** The pg error TEXT, likewise off `err.cause` (privilege errors carry no `constraint`). */
function causeMessage(err: unknown): string {
  return String((err as { cause?: { message?: string } } | undefined)?.cause?.message ?? '');
}

describe.skipIf(!hasDatabase)(
  'Story 10.23 — the restoration-discipline instrument (:5433)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    async function seedPolicy(
      tx: Db,
      pariwarId: string,
      opts: { version?: number; effectiveDate?: Date; rule?: string } = {},
    ): Promise<string> {
      return seedClauseVersion(tx, pariwarId, {
        clauseId: POLICY_CLAUSE,
        version: opts.version ?? 1,
        effectiveDate: opts.effectiveDate ?? new Date('2025-01-01T00:00:00Z'),
        payload: {
          rule_code: 'RESTORATION-DISCIPLINE',
          month_counting: 'calendar_end_of_month_clamped',
          concurrency_rule: opts.rule ?? 'max_over_live',
        },
      });
    }

    async function rowsFor(tx: Db, memberId: string) {
      return tx
        .select()
        .from(memberRestorationImpositions)
        .where(eq(memberRestorationImpositions.memberId, toMemberId(memberId)));
    }

    async function eventsFor(tx: Db, memberId: string) {
      return tx
        .select({ eventType: eventsLog.eventType, payload: eventsLog.payload })
        .from(eventsLog)
        .where(
          and(
            eq(eventsLog.streamId, memberId),
            eq(eventsLog.eventType, 'member.restoration_discipline.imposed'),
          ),
        );
    }

    async function impose(
      tx: Db,
      client: Parameters<typeof imposeRestorationLockIn>[0],
      memberId: string,
      opts: {
        clauseVersionId: string;
        policyClauseVersionId: string;
        payload?: Record<string, unknown>;
        clauseId?: string;
        anchor?: typeof ANCHOR;
      },
    ) {
      return imposeRestorationLockIn(client, {
        memberId: toMemberId(memberId),
        pariwarId: toPariwarId(PARIWAR_A),
        clauseId: opts.clauseId ?? R7D,
        clausePayload: opts.payload ?? R7D_PAYLOAD,
        clauseVersionId: toClauseVersionId(opts.clauseVersionId),
        policyClauseVersionId: toClauseVersionId(opts.policyClauseVersionId),
        concurrencyRule: 'max_over_live',
        episodeAnchor: opts.anchor ?? ANCHOR,
        now: new Date(),
      });
    }

    // ── AC4 — DB-authoritative, calendar-correct expiry ─────────────────────────────────────────
    it('AC4 — `imposed_at` is DB-authoritative and `expires_at` is a CALENDAR month shift', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);

      const result = await impose(tx, client, memberId, {
        clauseVersionId: clauseV,
        policyClauseVersionId: policyV,
      });
      expect(result.decision.impose).toBe(true);
      const imposed = result.imposed!;

      // Exactly three CALENDAR months — not 90 days, not 3×30×86_400_000.
      const [row] = await rowsFor(tx, memberId);
      expect(row).toBeDefined();
      const [check] = (
        await tx.execute<{ same: boolean }>(
          sql`SELECT (${imposed.expiresAt} = ${imposed.imposedAt}::timestamptz + interval '3 months') AS same`,
        )
      ).rows;
      expect(check?.same).toBe(true);
      expect(imposed.expiresAt.getTime()).toBeGreaterThan(imposed.imposedAt.getTime());
    });

    it('AC4 — the month shift CLAMPS at month end (a Jan-31 anchor never overflows into March)', async () => {
      // Proved against Postgres itself, which is what actually computes it at the imposition site.
      const { tx } = getTx();
      const [row] = (
        await tx.execute<{ clamped: string }>(
          sql`SELECT (timestamptz '2026-01-31T00:00:00Z' + make_interval(months => 1)) AS clamped`,
        )
      ).rows;
      expect(new Date(row!.clamped).toISOString().slice(0, 10)).toBe('2026-02-28');
    });

    // ── AC3 — the FR-8 version pin ──────────────────────────────────────────────────────────────
    it('⭐ AC3 — a Trustee RE-TUNE of both clauses does NOT move an existing member`s expiry', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV1 = await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: R7D,
        version: 1,
        payload: R7D_PAYLOAD,
      });
      const policyV1 = await seedPolicy(tx, PARIWAR_A, { version: 1 });
      await enterAppScope(client, PARIWAR_A);

      const imposed = (
        await impose(tx, client, memberId, {
          clauseVersionId: clauseV1,
          policyClauseVersionId: policyV1,
        })
      ).imposed!;
      const pinnedExpiry = imposed.expiresAt.toISOString();

      // The Trustee Panel publishes NEW versions of BOTH clauses, effective in the past, with
      // different values — a 12-month lock-in instead of 3.
      await seedClauseVersion(tx, PARIWAR_A, {
        clauseId: R7D,
        version: 2,
        effectiveDate: new Date('2025-06-01T00:00:00Z'),
        payload: { restoration: { lock_in_months: 12, catch_up_required: true } },
      });
      await seedPolicy(tx, PARIWAR_A, { version: 2, effectiveDate: new Date('2025-06-01T00:00:00Z') });

      // ⭐ Re-read the overlay AFTER the new versions' effective_date. The member's expiry has NOT
      // moved: the event payload pinned `lock_in_months` and both clause_version_ids at imposition.
      // ⚠ This is what `resolveByClauseVersionId` protects and `resolveByClauseId` would destroy —
      // the latter returns the CURRENT version and would silently re-lock every existing member.
      const overlay = await getCurrentMemberRestorationDiscipline(tx, toMemberId(memberId), new Date());
      expect(overlay.state).toBe('in-lock-in');
      expect(overlay.expiresAt?.toISOString()).toBe(pinnedExpiry);
      expect(overlay.impositions[0]?.lockInMonths).toBe(3);
      expect(String(overlay.impositions[0]?.clauseVersionId)).toBe(clauseV1);
      expect(String(overlay.impositions[0]?.policyClauseVersionId)).toBe(policyV1);
    });

    // ── AC3 — the RATIFIED unprovisioned posture ────────────────────────────────────────────────
    it('⛔ AC3 — an UNPROVISIONED Pariwar resolves to null: no imposition is even attempted', async () => {
      // Decision 2026-08-07-088 clause 2: do NOT impose; surface a named sentinel. Imposing under a
      // code default is explicitly rejected — coverage removal under a convention no Pariwar ratified.
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_B, { state: 'active' });
      await enterAppScope(client, PARIWAR_B);

      const policy = await resolveRestorationDisciplinePolicy(tx, toPariwarId(PARIWAR_B), new Date());
      expect(policy).toBeNull();

      // The caller (apps/jobs) short-circuits on that null, so nothing is written at all.
      expect(await rowsFor(tx, memberId)).toHaveLength(0);
      expect(await eventsFor(tx, memberId)).toHaveLength(0);
    });

    it('AC3 — a MALFORMED policy payload is also `null` — never a guessed default', async () => {
      const { tx, client } = getTx();
      await seedClauseVersion(tx, PARIWAR_B, {
        clauseId: POLICY_CLAUSE,
        payload: { rule_code: 'X', month_counting: 'calendar_end_of_month_clamped', concurrency_rule: 'min_over_live' },
      });
      await enterAppScope(client, PARIWAR_B);
      expect(
        await resolveRestorationDisciplinePolicy(tx, toPariwarId(PARIWAR_B), new Date()),
      ).toBeNull();
    });

    // ── AC2 — idempotency + the ratified re-imposition bar ──────────────────────────────────────
    it('AC2 — a second imposition for the same LIVE clause is skipped: no 2nd row, no 2nd event', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);

      await impose(tx, client, memberId, { clauseVersionId: clauseV, policyClauseVersionId: policyV });
      const second = await impose(tx, client, memberId, {
        clauseVersionId: clauseV,
        policyClauseVersionId: policyV,
      });

      expect(second.decision).toEqual({ impose: false, reason: 'already-live-for-clause' });
      expect(await rowsFor(tx, memberId)).toHaveLength(1);
      expect(await eventsFor(tx, memberId)).toHaveLength(1);
    });

    it('⛔ AC2 — the event payload carries BOTH pinned versions, the duration and the episode', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await impose(tx, client, memberId, { clauseVersionId: clauseV, policyClauseVersionId: policyV });

      const [ev] = await eventsFor(tx, memberId);
      const p = ev!.payload as Record<string, unknown>;
      expect(p['clause_id']).toBe(R7D);
      expect(p['clause_version_id']).toBe(clauseV);
      expect(p['policy_clause_version_id']).toBe(policyV);
      expect(p['lock_in_months']).toBe(3);
      expect(p['concurrency_rule']).toBe('max_over_live');
      expect(p['episode_key']).toBe('2026-03-15T00:00:00.000Z|skips:1');
      // Decision 2026-08-08-091 — pinned like `lock_in_months`, and what a LATER `shouldImpose` call
      // matches on for this row (not `episode_key`, which is audit data only).
      expect(p['completion_unsatisfiable']).toBe(true);
      // D5 — AUTOMATIC: no actor, no reason code, no free text, no PII anywhere.
      expect(p['actor']).toBe('system');
      expect(p).not.toHaveProperty('reason_code');
      expect(p).not.toHaveProperty('actor_id');
      // AC1 — a lifecycle NON-transition: the reducer is identity by construction.
      expect(p['from_state']).toBe(p['to_state']);
    });

    it('⭐ AC1 — `members.state` NEVER moves: the imposition is a lifecycle NON-transition', async () => {
      // ⚠ THIS TEST NEEDS A REAL EVENT STREAM, and the first draft did not have one — a lesson worth
      // recording. `projectMemberState` REPLAYS the member's whole stream and writes the result to
      // `members.state`. A member seeded straight into `members` has no events, so the replay lands
      // on the initial state and the assertion failed with `expected 'pending-kyc' to be 'active'` —
      // a TEST artifact, not an instrument defect. Building the real signup→lock-in→active walk is
      // what makes this assertion mean "the imposition is identity" rather than "the seed survived".
      const { tx, client } = getTx();
      const memberId = randomUUID();
      await seedMember(tx, PARIWAR_A, { memberId, state: 'pending-kyc' });
      const ev = async (n: number, eventType: string, payload: unknown = {}): Promise<void> => {
        await seedEvent(tx, PARIWAR_A, { streamId: memberId, eventVersion: n, eventType, payload });
      };
      await ev(1, 'member.signup_initiated');
      await ev(2, 'member.kyc_completed');
      await ev(3, 'member.vyawastha_shulk_paid');
      await ev(4, 'member.lock_in_expired', { kyc_verified: true }); // → 'active'

      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);

      const stateNow = async (): Promise<string | undefined> =>
        (
          await tx.execute<{ state: string }>(
            sql`SELECT state FROM members WHERE member_id = ${memberId}::uuid`,
          )
        ).rows[0]?.state;

      await impose(tx, client, memberId, { clauseVersionId: clauseV, policyClauseVersionId: policyV });

      // The replay INCLUDING the imposition event still lands on `active`: the event falls through
      // the reducer's `default: return state` arm, so `members.state` provably cannot move (AC1).
      // No `ALTER TYPE`, no reducer arm, no projector edit, no allowlist entry — and this is the
      // proof rather than the claim.
      expect(await stateNow()).toBe('active');
    });

    // ── AC10(b) — the Story 4.8 cache trigger already covers this family ────────────────────────
    it('⭐ AC10(b) — migration 0036 ALREADY invalidates: a `member.*` event on the MEMBER stream', async () => {
      // ⚠ ASSERTED, NOT ASSUMED. Story 10.24's contribution events ride the ALERT stream and needed
      // `0093`'s sibling trigger keyed on `payload->>'memberId'`; this family rides the MEMBER's OWN
      // stream, so `0036`'s `member_id = NEW.stream_id` delete already reaches it and NO new trigger
      // is correct. The difference is exactly why this is a test and not a comment.
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);

      await tx.insert(memberValidityCache).values({
        memberId: toMemberId(memberId),
        pariwarId: toPariwarId(PARIWAR_A),
        memberStateHash: 'hash-1',
        ruleRegistryVersion: 'rrv-1',
        cohortInvalidationEpoch: 0,
        payload: { memberId } as never,
        validityPayloadHash: 'vph-1',
      });
      const count = async (): Promise<number> =>
        (
          await tx
            .select({ memberId: memberValidityCache.memberId })
            .from(memberValidityCache)
            .where(eq(memberValidityCache.memberId, toMemberId(memberId)))
        ).length;
      expect(await count()).toBe(1);

      await impose(tx, client, memberId, { clauseVersionId: clauseV, policyClauseVersionId: policyV });

      // Gone in the SAME transactional breath as the append — so a rolled-back imposition also rolls
      // back the purge. ⛔ No payload-shape component was added to the frozen 4.8 cache key (10.17 D5).
      expect(await count()).toBe(0);
    });

    // ── The table's structural guarantees ───────────────────────────────────────────────────────
    it('AC1 — the table is APPEND-ONLY for the app role: UPDATE and DELETE are both refused', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await impose(tx, client, memberId, { clauseVersionId: clauseV, policyClauseVersionId: policyV });

      // An imposition is an immutable historical fact; expiry happens by the clock, never by an
      // UPDATE. And unlike `member_moderation_actions` there is no Tier-1 byte needing an RTBF
      // carve-out (D5), so append-only holds absolutely.
      //
      // ⚠ ONE denied statement per test, deliberately. A failed statement ABORTS the surrounding
      // transaction (`25P02: current transaction is aborted`), so asserting UPDATE and DELETE in one
      // test made the SECOND assertion read 25P02 instead of the 42501 it was written to catch — it
      // would have gone green against a table that granted DELETE. The DELETE half lives in its own
      // test below ([[project_live_db_test_gotchas]]).
      await expect(
        tx.execute(sql`UPDATE member_restoration_impositions SET lock_in_months = 1`),
      ).rejects.toSatisfy((err: unknown) => /permission denied/i.test(causeMessage(err)));
    });

    it('AC1 — the table is APPEND-ONLY: DELETE is refused too (its own tx — see the note above)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      await expect(
        tx.execute(sql`DELETE FROM member_restoration_impositions`),
      ).rejects.toSatisfy((err: unknown) => /permission denied/i.test(causeMessage(err)));
    });

    it('D3 — a ZERO-length lock-in is unwritable at the DB, on EVERY path including raw SQL', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      await enterAppScope(client, PARIWAR_A);
      // `imposesRestorationObligation` is TRUE for R7(A), which ships `lock_in_months: 0` — so the
      // structural backstop matters independently of the semantic one in `readLockInMonths`.
      await expect(
        tx.execute(sql`
          INSERT INTO member_restoration_impositions
            (pariwar_id, member_id, clause_id, clause_version_id, policy_clause_version_id,
             lock_in_months, concurrency_rule, episode_key, imposed_at, expires_at)
          VALUES (${PARIWAR_A}::uuid, ${memberId}::uuid, 'niy.contribution-discipline.r7-a',
                  ${randomUUID()}::uuid, ${randomUUID()}::uuid, 0, 'max_over_live', 'no-record|skips:0',
                  now(), now() + interval '3 months')
        `),
      ).rejects.toSatisfy(
        (err: unknown) =>
          violatedConstraint(err) === 'member_restoration_impositions_lock_in_months_positive',
      );
    });

    it('§3.1 prescribes a BOUNDED consequence — `expires_at <= imposed_at` is refused', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      await enterAppScope(client, PARIWAR_A);
      await expect(
        tx.execute(sql`
          INSERT INTO member_restoration_impositions
            (pariwar_id, member_id, clause_id, clause_version_id, policy_clause_version_id,
             lock_in_months, concurrency_rule, episode_key, imposed_at, expires_at)
          VALUES (${PARIWAR_A}::uuid, ${memberId}::uuid, ${R7D},
                  ${randomUUID()}::uuid, ${randomUUID()}::uuid, 3, 'max_over_live', 'no-record|skips:0',
                  now(), now())
        `),
      ).rejects.toSatisfy(
        (err: unknown) =>
          violatedConstraint(err) === 'member_restoration_impositions_expires_after_imposed',
      );
    });

    it('review finding — an UNKNOWN concurrency rule is unwritable at the DB, on EVERY path including raw SQL', async () => {
      // `concurrency_rule` is registry data (AC5) with only an app-layer Zod enum guarding it before
      // this fix; a corrupt or future-registry value could otherwise land un-combinable by
      // `combineLiveExpiries`'s exhaustive `switch` at READ time instead of being refused at WRITE time.
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      await enterAppScope(client, PARIWAR_A);
      await expect(
        tx.execute(sql`
          INSERT INTO member_restoration_impositions
            (pariwar_id, member_id, clause_id, clause_version_id, policy_clause_version_id,
             lock_in_months, concurrency_rule, episode_key, imposed_at, expires_at)
          VALUES (${PARIWAR_A}::uuid, ${memberId}::uuid, ${R7D},
                  ${randomUUID()}::uuid, ${randomUUID()}::uuid, 3, 'sum_of_all', 'no-record|skips:0',
                  now(), now() + interval '3 months')
        `),
      ).rejects.toSatisfy(
        (err: unknown) =>
          violatedConstraint(err) === 'member_restoration_impositions_concurrency_rule_known',
      );
    });

    it('the BOUNDED reader is replay-correct — an imposition is invisible BEFORE it happened', async () => {
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      await impose(tx, client, memberId, { clauseVersionId: clauseV, policyClauseVersionId: policyV });

      const before = await getMemberRestorationDiscipline(
        tx,
        toMemberId(memberId),
        new Date('2020-01-01T00:00:00.000Z'),
      );
      expect(before.state).toBe('never-imposed');
    });

    it('⛔ AC2 — RE-IMPOSITION after expiry is barred for the SAME unresolved episode (ratified)', async () => {
      // Decision 2026-08-07-088 clause 3. Simulated by imposing, then asking the predicate what it
      // would do at an instant PAST the expiry with the same episode still unresolved.
      const { tx, client } = getTx();
      const memberId = await seedMember(tx, PARIWAR_A, { state: 'active' });
      const clauseV = await seedClauseVersion(tx, PARIWAR_A, { clauseId: R7D, payload: R7D_PAYLOAD });
      const policyV = await seedPolicy(tx, PARIWAR_A);
      await enterAppScope(client, PARIWAR_A);
      const first = await impose(tx, client, memberId, {
        clauseVersionId: clauseV,
        policyClauseVersionId: policyV,
      });
      const pastExpiry = new Date(first.imposed!.expiresAt.getTime() + 86_400_000);

      const overlay = await getCurrentMemberRestorationDiscipline(tx, toMemberId(memberId), pastExpiry);
      expect(overlay.state).toBe('expired');

      const { shouldImpose } = await import('../../../src/member/restoration-discipline/write.js');
      expect(shouldImpose(overlay, R7D, R7D_PAYLOAD, pastExpiry)).toEqual({
        impose: false,
        reason: 'same-unresolved-episode',
      });

      // …but a SATISFIABLE package re-imposes normally: the bar is conditional on unsatisfiability —
      // and lifts on the CURRENT candidate payload alone, with no rewrite of the row seeded above.
      expect(shouldImpose(overlay, R7D, SATISFIABLE_PAYLOAD, pastExpiry)).toEqual({ impose: true });
    });
  },
);
