// Helpdesk ticket read accessors — live-DB integration (Story 10.1, Task 5; review-hardening chunk 2).
//
// `getTicketById` and `listTicketsForPariwar` had ZERO test coverage before this file — including the
// `LIST_TICKETS_FOR_PARIWAR_LIMIT = 200` cap added during code review (chunk 1), which had never been
// exercised anywhere. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ids } from '../../../src/index.js';
import {
  projectTicketGenesis,
  projectTicketTransition,
  type ProjectTicketGenesisInput,
} from '../../../src/helpdesk/project.js';
import { getTicketById, listTicketQueueForPariwar, listTicketsForPariwar } from '../../../src/helpdesk/read.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

function genesisInput(ticketId: string, pariwarId: string, body: string): ProjectTicketGenesisInput {
  const memberId = randomUUID();
  return {
    ticketId: ids.helpdeskTicketId(ticketId),
    pariwarId: ids.pariwarId(pariwarId),
    subjectMemberId: ids.memberId(memberId),
    subjectActorId: null,
    category: 'kyc-trouble',
    subCategory: null,
    body,
    attachments: [],
    memberScopeContext: { pariwar_id: pariwarId, state: null, district: null, block: null, subject_member_id: memberId },
    routingPolicyVersion: 1,
    targetRole: 'helpline_operator',
    targetScopeDimension: 'pariwar',
    targetScopeValue: pariwarId,
    matchedRuleIndex: 0,
    assignedAt: new Date('2026-08-03T06:00:00Z'),
    slaFirstResponseDue: new Date('2026-08-04T06:00:00Z'),
    slaResolutionDue: new Date('2026-08-08T18:30:00Z'),
    auditId: randomUUID(),
    createdVia: 'member_app',
    operatorAttribution: null,
    // Story 10.29 — element 1's intake capture. The ordinary case is `null` (the member did not ask);
    // ⛔ present-and-nullable on the input, never optional, so a fixture cannot silently omit it.
    memberStaffMediationRequestedAt: null,
    actor: 'member',
    actorId: memberId,
    claimCaseId: null,
    poolId: null,
    moduleId: null,
    validityLookupId: null,
  };
}

describe.skipIf(!hasDatabase)('helpdesk read accessors', () => {
  setupLiveDb();

  it('getTicketById returns the ticket for the caller\'s tenant, and null for an absent id', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A, 'find me'));

    const found = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(found).not.toBeNull();
    expect(found!.body).toBe('find me');

    const missing = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(randomUUID()));
    expect(missing).toBeNull();
  });

  it('listTicketsForPariwar returns the Pariwar\'s tickets newest-first', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // `now()` is frozen at TRANSACTION start in Postgres, so three sequential real projectTicketGenesis
    // calls within this one test transaction would all land the SAME created_at — a raw INSERT with
    // EXPLICIT distinct created_at values is the only way to prove the ORDER BY clause itself, not just
    // that ties don't crash. Bypasses the projector (state-writer guard), mirroring the 200-cap test below.
    await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
    await client.query(
      `INSERT INTO helpdesk_tickets
         (ticket_id, pariwar_id, subject_member_id, subject_actor_id, category, body, current_state,
          state_event_version, routed_to_scope_dimension, routed_to_role, routing_policy_version,
          member_scope_context, assigned_at, sla_first_response_due, sla_resolution_due, audit_id,
          created_via, created_at, updated_at)
       VALUES
         (gen_random_uuid(), $1::uuid, gen_random_uuid(), NULL, 'kyc-trouble', 'first', 'open', 1,
          'pariwar', 'helpline_operator', 1, '{}'::jsonb, now(), now(), now(), gen_random_uuid(),
          'member_app', now() - interval '2 seconds', now()),
         (gen_random_uuid(), $1::uuid, gen_random_uuid(), NULL, 'kyc-trouble', 'second', 'open', 1,
          'pariwar', 'helpline_operator', 1, '{}'::jsonb, now(), now(), now(), gen_random_uuid(),
          'member_app', now() - interval '1 second', now()),
         (gen_random_uuid(), $1::uuid, gen_random_uuid(), NULL, 'kyc-trouble', 'third', 'open', 1,
          'pariwar', 'helpline_operator', 1, '{}'::jsonb, now(), now(), now(), gen_random_uuid(),
          'member_app', now(), now())`,
      [PARIWAR_A],
    );

    const rows = await listTicketsForPariwar(tx, ids.pariwarId(PARIWAR_A));
    const bodies = rows.map((r) => r.body);
    // Newest-first: 'third' (created_at = now()) before 'second' (now()-1s) before 'first' (now()-2s).
    expect(bodies.indexOf('third')).toBeLessThan(bodies.indexOf('second'));
    expect(bodies.indexOf('second')).toBeLessThan(bodies.indexOf('first'));
  });

  it('listTicketsForPariwar is capped at LIST_TICKETS_FOR_PARIWAR_LIMIT (200) even when a Pariwar has more tickets', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);

    // Bulk raw INSERT (not the full projector — 205 sequential projectTicketGenesis calls would be
    // needlessly slow for a pure cardinality check) under the state-writer guard, mirroring the
    // existing XOR-CHECK raw-INSERT test's pattern.
    await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
    await client.query(
      `INSERT INTO helpdesk_tickets
         (ticket_id, pariwar_id, subject_member_id, subject_actor_id, category, body, current_state,
          state_event_version, routed_to_scope_dimension, routed_to_role, routing_policy_version,
          member_scope_context, assigned_at, sla_first_response_due, sla_resolution_due, audit_id, created_via)
       SELECT gen_random_uuid(), $1::uuid, gen_random_uuid(), NULL, 'kyc-trouble', 'bulk-' || g, 'open',
              1, 'pariwar', 'helpline_operator', 1, '{}'::jsonb, now(), now(), now(), gen_random_uuid(), 'member_app'
       FROM generate_series(1, 205) AS g`,
      [PARIWAR_A],
    );

    const rows = await listTicketsForPariwar(tx, ids.pariwarId(PARIWAR_A));
    expect(rows.length).toBe(200);
  });
});

describe.skipIf(!hasDatabase)('listTicketQueueForPariwar — the paginated admin queue (Story 10.4, AC1)', () => {
  setupLiveDb();

  /** Seed N distinct OPEN tickets (body, role, age) via a raw guarded INSERT so one test transaction
   *  can prove ordering + role/pagination filters. The migration-0084 trigger permits a guarded INSERT
   *  ONLY at current_state='open' (a non-'open' seed must go through the transition projector — see the
   *  state-filter test), so this helper only seeds open rows. */
  async function seedOpenTickets(
    client: import('pg').PoolClient,
    rows: { body: string; role: string; ageSeconds: number }[],
  ): Promise<void> {
    await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
    for (const r of rows) {
      await client.query(
        `INSERT INTO helpdesk_tickets
           (ticket_id, pariwar_id, subject_member_id, subject_actor_id, category, body, current_state,
            state_event_version, routed_to_scope_dimension, routed_to_role, routing_policy_version,
            member_scope_context, assigned_at, sla_first_response_due, sla_resolution_due, audit_id,
            created_via, created_at, updated_at)
         VALUES (gen_random_uuid(), $1::uuid, gen_random_uuid(), NULL, 'kyc-trouble', $2, 'open',
                 1, 'pariwar', $3, 1, '{}'::jsonb, now(), now(), now(), gen_random_uuid(), 'member_app',
                 now() - ($4 || ' seconds')::interval, now())`,
        [PARIWAR_A, r.body, r.role, String(r.ageSeconds)],
      );
    }
  }

  it('returns tickets newest-first (assert membership + relative order, not counts)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await seedOpenTickets(client, [
      { body: 'q-old', role: 'helpline_operator', ageSeconds: 30 },
      { body: 'q-mid', role: 'helpline_operator', ageSeconds: 20 },
      { body: 'q-new', role: 'finance_officer', ageSeconds: 10 },
    ]);
    const rows = await listTicketQueueForPariwar(tx, ids.pariwarId(PARIWAR_A));
    const bodies = rows.map((r) => r.body);
    expect(bodies).toContain('q-new');
    expect(bodies.indexOf('q-new')).toBeLessThan(bodies.indexOf('q-mid'));
    expect(bodies.indexOf('q-mid')).toBeLessThan(bodies.indexOf('q-old'));
  });

  it('filters by lifecycle state (an in_progress ticket built through the projector)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // s-open: a raw guarded open row. s-prog: a real genesis + pick-up transition → in_progress.
    await seedOpenTickets(client, [{ body: 's-open', role: 'helpline_operator', ageSeconds: 30 }]);
    const progId = randomUUID();
    await projectTicketGenesis(client, genesisInput(progId, PARIWAR_A, 's-prog'));
    await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(progId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.picked_up',
      trigger: 'helpdesk.transition:pick_up',
      actor: 'staff',
      actorId: randomUUID(),
    });

    const rows = await listTicketQueueForPariwar(tx, ids.pariwarId(PARIWAR_A), { state: 'in_progress' });
    const bodies = rows.map((r) => r.body);
    expect(bodies).toContain('s-prog');
    expect(bodies).not.toContain('s-open');
    expect(rows.every((r) => r.currentState === 'in_progress')).toBe(true);
  });

  it('filters by routed_to_role ("my queue")', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await seedOpenTickets(client, [
      { body: 'r-help', role: 'helpline_operator', ageSeconds: 30 },
      { body: 'r-fin', role: 'finance_officer', ageSeconds: 20 },
    ]);
    const rows = await listTicketQueueForPariwar(tx, ids.pariwarId(PARIWAR_A), { routedToRole: 'finance_officer' });
    const bodies = rows.map((r) => r.body);
    expect(bodies).toContain('r-fin');
    expect(bodies).not.toContain('r-help');
    expect(rows.every((r) => r.routedToRole === 'finance_officer')).toBe(true);
  });

  it('paginates via limit + offset (clamped page size)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await seedOpenTickets(client, [
      { body: 'p1', role: 'helpline_operator', ageSeconds: 40 },
      { body: 'p2', role: 'helpline_operator', ageSeconds: 30 },
      { body: 'p3', role: 'helpline_operator', ageSeconds: 20 },
    ]);
    const page1 = await listTicketQueueForPariwar(tx, ids.pariwarId(PARIWAR_A), { state: 'open', limit: 2, offset: 0 });
    const page2 = await listTicketQueueForPariwar(tx, ids.pariwarId(PARIWAR_A), { state: 'open', limit: 2, offset: 2 });
    expect(page1.length).toBe(2);
    // The two pages are disjoint (no ticket_id appears in both) — pagination advances correctly.
    const ids1 = new Set(page1.map((r) => r.ticketId));
    expect(page2.some((r) => ids1.has(r.ticketId))).toBe(false);
  });
});
