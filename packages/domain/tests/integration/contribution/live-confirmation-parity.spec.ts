// "Live-confirmed" parity: the SQL projection ↔ the pure `hasLiveConfirmation` — Story 10.24. :5433
//
// Story 10.24's fact reads answer "does this member hold a LIVE confirmation at `at`?" in SQL, over
// the ledger's `reversed_at` column. The rest of the codebase answers the same question with the pure
// `hasLiveConfirmation` (`contribution/read.ts`) over event-id sets. Two spellings of one rule is
// exactly the drift class [[project_epic6_drizzle_correlated_subquery_bug]] cost this codebase once
// already — and there the DB-free unit tests could not catch it, because the bug lived in the SQL.
//
// This spec is the pin that makes the SQL form a PROJECTION of the shared definition rather than a
// second definition of it. For each scenario it computes the answer BOTH ways from the SAME source
// events and asserts they agree:
//
//   · SQL   — `readContributionFactInputs(...).totalCount > 0`, i.e. the ledger's
//             `confirmed_at <= at AND (reversed_at IS NULL OR reversed_at > at)` predicate.
//   · PURE  — `hasLiveConfirmation(confirmedEventIds, reversedConfirmedEventIds)`, i.e. "≥1 confirmed
//             event id not named by any reversal".
//
// The scenarios are chosen to be the ones where a naive implementation diverges: re-confirmation after
// a reversal (monotonic re-green), a reversal naming an id the member never held, and the AS-OF cases
// where a reversal exists but has not happened yet at `at`.
//
// Own-committing writers accumulate rows, so every assertion is over ids this test itself minted
// ([[project_live_db_test_gotchas]]).

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import type { Db } from '../../../src/db.js';
import { readContributionFactInputs } from '../../../src/contribution/facts.js';
import { CONFIRMED_EVENT_TYPE, hasLiveConfirmation } from '../../../src/contribution/read.js';
import { memberId as toMemberId, pariwarId as toPariwarId } from '../../../src/ids/index.js';
import { RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE } from '../../../src/reconciliation/events.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

const AT = new Date('2026-08-05T00:00:00.000Z');

describe.skipIf(!hasDatabase)(
  'Story 10.24 — the SQL live-confirmation predicate agrees with the pure hasLiveConfirmation (:5433)',
  { timeout: 20000 },
  () => {
    setupLiveDb();

    async function confirm(
      tx: Db,
      stream: string,
      memberId: string,
      poolId: string,
      version: number,
      occurredAt: Date,
    ): Promise<string> {
      const eventId = randomUUID();
      await tx.insert(eventsLog).values({
        eventId,
        streamId: stream,
        eventType: CONFIRMED_EVENT_TYPE,
        payload: { memberId, poolId, alertId: stream },
        eventVersion: version,
        actorId: null,
        pariwarId: PARIWAR_A,
        occurredAt,
      });
      return eventId;
    }

    async function reverse(
      tx: Db,
      stream: string,
      memberId: string,
      reversedConfirmedEventId: string,
      version: number,
      occurredAt: Date,
    ): Promise<void> {
      await tx.insert(eventsLog).values({
        streamId: stream,
        eventType: RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE,
        payload: { memberId, reversedConfirmedEventId, alertId: stream },
        eventVersion: version,
        actorId: null,
        pariwarId: PARIWAR_A,
        occurredAt,
      });
    }

    /** The PURE answer, computed from the member's own source events at `at` (no ledger involved). */
    async function pureAnswer(tx: Db, memberId: string, at: Date): Promise<boolean> {
      const rows = await tx
        .select({
          eventId: eventsLog.eventId,
          eventType: eventsLog.eventType,
          occurredAt: eventsLog.occurredAt,
          payload: eventsLog.payload,
        })
        .from(eventsLog)
        .where(and(eq(eventsLog.pariwarId, PARIWAR_A)));
      const confirmedEventIds: string[] = [];
      const reversedConfirmedEventIds = new Set<string>();
      for (const row of rows) {
        if (row.occurredAt.getTime() > at.getTime()) continue; // AS-OF: ignore the future
        const payload = row.payload as Record<string, unknown>;
        if (payload['memberId'] !== memberId) continue;
        if (row.eventType === CONFIRMED_EVENT_TYPE) confirmedEventIds.push(row.eventId);
        if (row.eventType === RECONCILIATION_CONFIRMATION_REVERSED_EVENT_TYPE) {
          const id = payload['reversedConfirmedEventId'];
          if (typeof id === 'string') reversedConfirmedEventIds.add(id);
        }
      }
      return hasLiveConfirmation(confirmedEventIds, reversedConfirmedEventIds);
    }

    /** The SQL answer, via the ledger the trigger maintains. */
    async function sqlAnswer(tx: Db, memberId: string, at: Date): Promise<boolean> {
      const inputs = await readContributionFactInputs(
        tx,
        { pariwarId: toPariwarId(PARIWAR_A), memberId: toMemberId(memberId) },
        at,
      );
      return inputs.totalCount > 0;
    }

    async function expectAgreement(
      tx: Db,
      memberId: string,
      at: Date,
      expected: boolean,
    ): Promise<void> {
      const [sql, pure] = await Promise.all([sqlAnswer(tx, memberId, at), pureAnswer(tx, memberId, at)]);
      expect(sql, 'the SQL ledger predicate disagreed with the expectation').toBe(expected);
      expect(pure, 'the pure hasLiveConfirmation disagreed with the expectation').toBe(expected);
      expect(sql, 'SQL and pure gave DIFFERENT answers — a second definition has drifted in').toBe(pure);
    }

    it('one live confirmation → both say LIVE', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      await confirm(tx, stream, memberId, randomUUID(), 1, new Date('2026-01-10T00:00:00Z'));
      await expectAgreement(tx, memberId, AT, true);
    });

    it('the only confirmation reversed → both say NOT live', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      const c1 = await confirm(tx, stream, memberId, randomUUID(), 1, new Date('2026-01-10T00:00:00Z'));
      await reverse(tx, stream, memberId, c1, 2, new Date('2026-02-10T00:00:00Z'));
      await expectAgreement(tx, memberId, AT, false);
    });

    it('MONOTONIC RE-GREEN: a fresh confirmation after a reversal → both say LIVE', async () => {
      // The scenario a "any reversal ⇒ held forever" implementation gets wrong.
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      const c1 = await confirm(tx, stream, memberId, randomUUID(), 1, new Date('2026-01-10T00:00:00Z'));
      await reverse(tx, stream, memberId, c1, 2, new Date('2026-02-10T00:00:00Z'));
      await confirm(tx, stream, memberId, randomUUID(), 3, new Date('2026-03-10T00:00:00Z'));
      await expectAgreement(tx, memberId, AT, true);
    });

    it('a reversal naming an id the member NEVER held un-confirms nothing → both say LIVE', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      await confirm(tx, stream, memberId, randomUUID(), 1, new Date('2026-01-10T00:00:00Z'));
      await reverse(tx, stream, memberId, randomUUID(), 2, new Date('2026-02-10T00:00:00Z'));
      await expectAgreement(tx, memberId, AT, true);
    });

    it('AS-OF: a reversal that has not happened yet at `at` does not apply → both say LIVE', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      const c1 = await confirm(tx, stream, memberId, randomUUID(), 1, new Date('2026-01-10T00:00:00Z'));
      await reverse(tx, stream, memberId, c1, 2, new Date('2026-07-01T00:00:00Z'));
      // Evaluated BEFORE the reversal instant — the confirmation was live then, and still is at `at`.
      await expectAgreement(tx, memberId, new Date('2026-03-01T00:00:00Z'), true);
      // …and NOT live at an instant after it.
      await expectAgreement(tx, memberId, AT, false);
    });

    it('AS-OF: a confirmation that has not happened yet at `at` does not count → both say NOT live', async () => {
      const { tx, client } = getTx();
      await enterAppScope(client, PARIWAR_A);
      const memberId = randomUUID();
      const stream = randomUUID();
      await confirm(tx, stream, memberId, randomUUID(), 1, new Date('2026-09-10T00:00:00Z'));
      await expectAgreement(tx, memberId, AT, false);
    });
  },
);
