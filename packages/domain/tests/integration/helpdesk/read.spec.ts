// Helpdesk ticket read accessors — live-DB integration (Story 10.1, Task 5; review-hardening chunk 2).
//
// `getTicketById` and `listTicketsForPariwar` had ZERO test coverage before this file — including the
// `LIST_TICKETS_FOR_PARIWAR_LIMIT = 200` cap added during code review (chunk 1), which had never been
// exercised anywhere. Live DB only.

import { randomUUID } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { ids } from '../../../src/index.js';
import { projectTicketGenesis, type ProjectTicketGenesisInput } from '../../../src/helpdesk/project.js';
import { getTicketById, listTicketsForPariwar } from '../../../src/helpdesk/read.js';
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
