// AC6(a) — the Story 4.8 cache-epoch obligation, discharged and TESTED — Story 10.24 (Task 7). :5433
//
// Migration `0036:88-90` wrote down an obligation in its own comment:
//
//   "FUTURE validity-relevant event families (claim.*, contribution.* — Epic 6/8/9 producers) MUST
//    extend this WHEN scope when they land."
//
// It lands with Story 10.24 — and it CANNOT be discharged by widening 0036's WHEN clause, which is the
// thing a reader skimming that comment would try. 0036's trigger keys on `member_id = NEW.stream_id`,
// and a `contribution.confirmed` rides the ALERT stream: the stream id is the alert, not the member.
// Widening the WHEN would fire the trigger and delete NOTHING, which is the worst outcome available —
// an obligation that looks discharged and is not. So migration 0093 adds a SECOND trigger keyed on
// `payload->>'memberId'`.
//
// Why it matters at all: the 4.8 cache key is
// `(member_id, member_state_hash, rule_registry_version, cohort_epoch)`, and `member_state_hash` is the
// max `event_version` on the member's OWN stream — so a confirmation does not shift the key one bit.
// Without this trigger, freshness after a confirmation would rest ENTIRELY on the 60s TTL. (That still
// satisfies FR-12A's ≤60s freshness; this makes it immediate and closes the recorded obligation.)
//
// ⚠ EXPLICITLY REJECTED, do not re-open: adding a payload-shape/version component to the frozen 4.8
// cache key. Story 10.17 D5 rejected exactly that, by name, for exactly this transient.

import { randomUUID } from 'node:crypto';

import { and, eq, sql } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { CONFIRMED_EVENT_TYPE } from '../../../src/contribution/read.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { memberValidityCache } from '../../../src/schema/member_validity_cache.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

describe.skipIf(!hasDatabase)(
  'Story 10.24 AC6(a) — contribution events invalidate the member validity cache (:5433)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    /** Seed one warm cache row for a member. */
    async function seedCacheRow(tx: Db, memberId: string): Promise<void> {
      await tx.insert(memberValidityCache).values({
        memberId: toMemberId(memberId),
        pariwarId: toPariwarId(PARIWAR_A),
        memberStateHash: 'hash-1',
        ruleRegistryVersion: 'rrv-1',
        cohortInvalidationEpoch: 0,
        payload: { memberId } as never,
        validityPayloadHash: 'vph-1',
      });
    }

    async function cacheRowCount(tx: Db, memberId: string): Promise<number> {
      const rows = await tx
        .select({ memberId: memberValidityCache.memberId })
        .from(memberValidityCache)
        .where(
          and(
            eq(memberValidityCache.pariwarId, PARIWAR_A),
            eq(memberValidityCache.memberId, toMemberId(memberId)),
          ),
        );
      return rows.length;
    }

    /** Append an event on an ALERT stream carrying the member in its payload. */
    async function appendOnAlertStream(
      tx: Db,
      eventType: string,
      memberId: string,
    ): Promise<void> {
      await tx.insert(eventsLog).values({
        streamId: randomUUID(), // the ALERT stream — deliberately NOT the member id
        eventType,
        payload: { memberId, poolId: randomUUID() },
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_A,
      });
    }

    it('a contribution.confirmed DELETES the member cache row IN THE SAME TRANSACTION', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      await seedCacheRow(tx, memberId);
      expect(await cacheRowCount(tx, memberId)).toBe(1);

      await appendOnAlertStream(tx, CONFIRMED_EVENT_TYPE, memberId);

      // Not "eventually" and not on the next read — gone in the same transactional breath as the
      // append, which is what makes a rolled-back append also roll back the purge.
      expect(await cacheRowCount(tx, memberId)).toBe(0);
    });

    it('a reconciliation.confirmation-reversed also invalidates (un-confirming changes the facts too)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      await seedCacheRow(tx, memberId);
      await appendOnAlertStream(tx, RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE, memberId);
      expect(await cacheRowCount(tx, memberId)).toBe(0);
    });

    it('the yellow/red contribution families invalidate too — the whole family is in scope', async () => {
      for (const eventType of ['contribution.utr-attested', 'contribution.reconciliation-mismatch']) {
        const { tx, client } = getTx();
        await enterAppScope(client, PARIWAR_A);
        const memberId = randomUUID();
        await seedCacheRow(tx, memberId);
        await appendOnAlertStream(tx, eventType, memberId);
        expect(await cacheRowCount(tx, memberId), `${eventType} did not invalidate`).toBe(0);
      }
    });

    it('invalidates ONLY the named member — a co-assigned member keeps their warm row', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const contributor = randomUUID();
      const bystander = randomUUID();
      await seedCacheRow(tx, contributor);
      await seedCacheRow(tx, bystander);

      await appendOnAlertStream(tx, CONFIRMED_EVENT_TYPE, contributor);

      expect(await cacheRowCount(tx, contributor)).toBe(0);
      // A per-member purge, not a per-alert one: every member of that cycle shares the alert stream,
      // and blowing the whole cohort's cache on every confirmation would be a self-inflicted stampede.
      expect(await cacheRowCount(tx, bystander)).toBe(1);
    });

    it('an event with NO memberId in its payload is a safe no-op (never a whole-tenant purge)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      await seedCacheRow(tx, memberId);
      await tx.insert(eventsLog).values({
        streamId: randomUUID(),
        eventType: CONFIRMED_EVENT_TYPE,
        payload: { poolId: randomUUID() }, // memberId ABSENT
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_A,
      });
      // A NULL memberId must not degenerate into `member_id = NULL` matching nothing OR into a
      // predicate-less DELETE; the trigger guards it explicitly.
      expect(await cacheRowCount(tx, memberId)).toBe(1);
    });

    it("0036's member-stream trigger still works — the new trigger ADDS scope, never replaces it", async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      await seedCacheRow(tx, memberId);
      await tx.insert(eventsLog).values({
        streamId: memberId, // the MEMBER's own stream — 0036's key
        eventType: 'member.vyawastha_shulk_paid',
        payload: {},
        eventVersion: 1,
        actorId: null,
        pariwarId: PARIWAR_A,
      });
      expect(await cacheRowCount(tx, memberId)).toBe(0);
    });

    it('both triggers are registered on events_log (the migration actually applied)', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const rows = await tx.execute(
        sql`SELECT tgname FROM pg_trigger WHERE tgrelid = 'events_log'::regclass AND NOT tgisinternal`,
      );
      const names = (Array.isArray(rows) ? rows : ((rows as { rows: unknown[] }).rows ?? [])).map(
        (r) => (r as { tgname: string }).tgname,
      );
      expect(names).toContain('member_validity_cache_invalidate_on_member_event');
      expect(names).toContain('member_validity_cache_invalidate_on_contribution_event');
      expect(names).toContain('member_contribution_ledger_project_on_event');
    });
  },
);
