// Helpdesk projector + current_state write-rejection trigger — live-DB integration
// (Story 10.1, Task 7; AC4). The projector creates the ticket row (current_state='open') + the genesis
// event atomically; the BEFORE INSERT OR UPDATE trigger (migration 0084) rejects any current_state write
// not issued under the projector's `app.helpdesk_state_writer = 'on'` guard. Twin of the alert trigger
// regression. Live DB only.

import { randomUUID } from 'node:crypto';

import { and, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { ids } from '../../../src/index.js';
import {
  HelpdeskGenesisAlreadyExistsError,
  HelpdeskGenesisMissingError,
  HelpdeskIllegalTransitionError,
} from '../../../src/helpdesk/errors.js';
import type { ProjectTicketGenesisInput } from '../../../src/helpdesk/project.js';
import { projectTicketGenesis, projectTicketTransition } from '../../../src/helpdesk/project.js';
import { getTicketById, listTicketEvents, replayTicketThread } from '../../../src/helpdesk/read.js';
import { eventsLog } from '../../../src/schema/events_log.js';
import { getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, enterAppScope } from '../_helpers.js';

function genesisInput(
  ticketId: string,
  pariwarId: string,
  overrides: Partial<ProjectTicketGenesisInput> = {},
): ProjectTicketGenesisInput {
  const memberId = randomUUID();
  // `actorId` is `events_log.actor_id` — the acting user, always non-null for a member/operator/staff
  // actor (only a `system` actor, e.g. the auto-close job, carries a null actorId). The real API route
  // always resolves a non-null `request.requestContext.actorId` for both created_via paths — here the
  // filing member is also the acting user.
  const actorId = memberId;
  return {
    ticketId: ids.helpdeskTicketId(ticketId),
    pariwarId: ids.pariwarId(pariwarId),
    subjectMemberId: ids.memberId(memberId),
    subjectActorId: null,
    category: 'kyc-trouble' as const,
    subCategory: null,
    body: 'help with KYC',
    attachments: [],
    memberScopeContext: { pariwar_id: pariwarId, state: null, district: null, block: null, subject_member_id: memberId },
    routingPolicyVersion: 1,
    targetRole: 'helpline_operator',
    targetScopeDimension: 'pariwar' as const,
    targetScopeValue: pariwarId,
    matchedRuleIndex: 0,
    assignedAt: new Date('2026-08-03T06:00:00Z'),
    slaFirstResponseDue: new Date('2026-08-04T06:00:00Z'),
    slaResolutionDue: new Date('2026-08-08T18:30:00Z'),
    auditId: randomUUID(),
    createdVia: 'member_app' as const,
    operatorAttribution: null,
    actor: 'member' as const,
    actorId,
    claimCaseId: null,
    poolId: null,
    moduleId: null,
    validityLookupId: null,
    ...overrides,
  };
}

describe.skipIf(!hasDatabase)('helpdesk projector + trigger (AC4)', () => {
  setupLiveDb();

  it('projectTicketGenesis creates the row (current_state=open) + the genesis event atomically', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();

    const result = await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A));
    expect(result.state).toBe('open');
    expect(result.eventVersion).toBe(1);

    const row = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(row).not.toBeNull();
    expect(row!.currentState).toBe('open');
    expect(row!.stateEventVersion).toBe(1);
    expect(row!.routedToRole).toBe('helpline_operator');
    expect(row!.routedToScopeDimension).toBe('pariwar');
    expect(row!.routingPolicyVersion).toBe(1);

    const events = await tx
      .select({ eventType: eventsLog.eventType })
      .from(eventsLog)
      .where(and(eq(eventsLog.streamId, ticketId), eq(eventsLog.eventType, 'helpdesk.ticket_created')));
    expect(events).toHaveLength(1);
  });

  it('a second genesis for the same ticket_id is rejected (genesis is first-and-only)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A));
    await expect(projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A))).rejects.toThrow(
      HelpdeskGenesisAlreadyExistsError,
    );
  });

  it('an operator-filed ticket (subjectActorId set, subjectMemberId null) is created correctly through the real function', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    const actorId = randomUUID();
    const result = await projectTicketGenesis(
      client,
      genesisInput(ticketId, PARIWAR_A, {
        subjectMemberId: null,
        subjectActorId: ids.userId(actorId),
        createdVia: 'helpline_call',
        operatorAttribution: 'Operator Priya (Helpline Desk 2)',
        actor: 'operator',
        actorId,
      }),
    );
    expect(result.state).toBe('open');

    const row = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(row).not.toBeNull();
    expect(row!.subjectActorId).toBe(actorId);
    expect(row!.subjectMemberId).toBeNull();
    expect(row!.createdVia).toBe('helpline_call');
  });

  it('projectTicketGenesis rejects a genesis with BOTH subject refs set (the payload schema\'s XOR superRefine fires before either INSERT is attempted)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await expect(
      projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A, { subjectActorId: ids.userId(randomUUID()) })),
    ).rejects.toThrow();
  });

  it('projectTicketGenesis rejects an actor/actorId mismatch — actor "system" with a non-null actorId', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await expect(
      projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A, { actor: 'system', actorId: randomUUID() })),
    ).rejects.toThrow(/actor\/actorId mismatch/);
  });

  it('projectTicketGenesis rejects an actor/actorId mismatch — a non-system actor with a null actorId', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await expect(
      projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A, { actor: 'member', actorId: null })),
    ).rejects.toThrow(/actor\/actorId mismatch/);
  });

  it('a direct UPDATE helpdesk_tickets SET current_state without the projector guard is REJECTED (P0001)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A));

    const err = await client
      .query("UPDATE helpdesk_tickets SET current_state = 'in_progress' WHERE ticket_id = $1", [ticketId])
      .then(() => null)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('P0001');
    expect((err as Error).message).toContain('helpdesk_tickets.current_state direct write rejected');
  });

  it('a direct UPDATE touching ONLY state_event_version is REJECTED (the cache pair travels together)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A));

    const err = await client
      .query('UPDATE helpdesk_tickets SET state_event_version = 999 WHERE ticket_id = $1', [ticketId])
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('P0001');
  });

  it('a non-state UPDATE (updated_at only) is NOT rejected by the trigger — and the UPDATE actually applies (not silently swallowed)', async () => {
    const { client, tx } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ticketId = randomUUID();
    await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A));

    const before = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    const forcedUpdatedAt = new Date(before!.updatedAt.getTime() + 60_000);
    await expect(
      client.query('UPDATE helpdesk_tickets SET updated_at = $2 WHERE ticket_id = $1', [ticketId, forcedUpdatedAt]),
    ).resolves.toBeDefined();

    const after = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(after!.updatedAt.getTime()).toBe(forcedUpdatedAt.getTime());
  });

  it('the exactly-one-subject CHECK rejects a row with BOTH subject refs', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    // Bypass the projector guard is irrelevant here — the CHECK fires on the INSERT shape. Build a raw
    // INSERT under the state-writer guard so we isolate the CHECK (not the trigger) as the rejecter.
    await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
    const err = await client
      .query(
        `INSERT INTO helpdesk_tickets
           (ticket_id, pariwar_id, subject_member_id, subject_actor_id, category, body, current_state,
            state_event_version, routed_to_scope_dimension, routed_to_role, routing_policy_version,
            member_scope_context, assigned_at, sla_first_response_due, sla_resolution_due, audit_id, created_via)
         VALUES ($1,$2,$3,$4,'kyc-trouble','x','open',1,'pariwar','helpline_operator',1,'{}'::jsonb,
                 now(), now(), now(), $5, 'member_app')`,
        [randomUUID(), PARIWAR_A, randomUUID(), randomUUID(), randomUUID()],
      )
      .then(() => null)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('23514'); // check_violation
  });

  it('the exactly-one-subject CHECK rejects a row with NEITHER subject ref set', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await client.query("SET LOCAL app.helpdesk_state_writer = 'on'");
    const err = await client
      .query(
        `INSERT INTO helpdesk_tickets
           (ticket_id, pariwar_id, subject_member_id, subject_actor_id, category, body, current_state,
            state_event_version, routed_to_scope_dimension, routed_to_role, routing_policy_version,
            member_scope_context, assigned_at, sla_first_response_due, sla_resolution_due, audit_id, created_via)
         VALUES ($1,$2,NULL,NULL,'kyc-trouble','x','open',1,'pariwar','helpline_operator',1,'{}'::jsonb,
                 now(), now(), now(), $3, 'member_app')`,
        [randomUUID(), PARIWAR_A, randomUUID()],
      )
      .then(() => null)
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(Error);
    expect((err as { code?: string }).code).toBe('23514'); // check_violation
  });
});

// ── Story 10.4 — projectTicketTransition (the append + re-project sibling of the genesis) ─────────
describe.skipIf(!hasDatabase)('helpdesk transition projector (Story 10.4, AC2)', () => {
  setupLiveDb();

  async function seedTicket(ticketId: string): Promise<string> {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const memberId = randomUUID();
    await projectTicketGenesis(client, genesisInput(ticketId, PARIWAR_A, { subjectMemberId: ids.memberId(memberId), actorId: memberId }));
    return memberId;
  }

  it('pick-up advances open → in_progress, bumps state_event_version, appends the event (v2)', async () => {
    const { client, tx } = getTx();
    const ticketId = randomUUID();
    const staffId = randomUUID();
    await seedTicket(ticketId);

    const result = await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(ticketId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.picked_up',
      trigger: 'helpdesk.transition:pick_up',
      actor: 'staff',
      actorId: staffId,
    });
    expect(result.fromState).toBe('open');
    expect(result.state).toBe('in_progress');
    expect(result.eventVersion).toBe(2);

    const row = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(row!.currentState).toBe('in_progress');
    expect(row!.stateEventVersion).toBe(2);
  });

  it('a staff reply (awaiting_member) stores the message; replayTicketThread surfaces it as a staff reply', async () => {
    const { client, tx } = getTx();
    const ticketId = randomUUID();
    const staffId = randomUUID();
    await seedTicket(ticketId);
    await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(ticketId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.picked_up',
      trigger: 'helpdesk.transition:pick_up',
      actor: 'staff',
      actorId: staffId,
    });
    await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(ticketId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.awaiting_member',
      trigger: 'helpdesk.transition:reply',
      actor: 'staff',
      actorId: staffId,
      message: 'Could you share your UTR number?',
    });

    const row = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(row!.currentState).toBe('awaiting_member');
    const thread = replayTicketThread(await listTicketEvents(tx, ids.helpdeskTicketId(ticketId)));
    // opening (member) + staff reply.
    expect(thread.map((e) => e.kind)).toEqual(['opening', 'staff_reply']);
    expect(thread[1]).toMatchObject({ author: 'staff', body: 'Could you share your UTR number?' });
  });

  it('a member reply (member_replied) returns awaiting_member → in_progress and surfaces as a member reply', async () => {
    const { client, tx } = getTx();
    const ticketId = randomUUID();
    const staffId = randomUUID();
    const memberId = await seedTicket(ticketId);
    await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(ticketId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.awaiting_member',
      trigger: 'helpdesk.transition:reply',
      actor: 'staff',
      actorId: staffId,
      message: 'What is your UTR?',
    });
    const result = await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(ticketId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.member_replied',
      trigger: 'helpdesk.transition:member_reply',
      actor: 'member',
      actorId: memberId,
      message: 'It is 1234567890.',
    });
    expect(result.fromState).toBe('awaiting_member');
    expect(result.state).toBe('in_progress');

    const thread = replayTicketThread(await listTicketEvents(tx, ids.helpdeskTicketId(ticketId)));
    expect(thread.map((e) => e.kind)).toEqual(['opening', 'staff_reply', 'member_reply']);
  });

  it('an ILLEGAL transition (resolve an open ticket) throws HelpdeskIllegalTransitionError and appends NO event', async () => {
    const { client, tx } = getTx();
    const ticketId = randomUUID();
    await seedTicket(ticketId);
    // open --(resolved)--> identity (illegal: resolve applies only from in_progress|awaiting_member).
    await expect(
      projectTicketTransition(client, {
        ticketId: ids.helpdeskTicketId(ticketId),
        pariwarId: ids.pariwarId(PARIWAR_A),
        eventType: 'helpdesk.resolved',
        trigger: 'helpdesk.transition:resolve',
        actor: 'staff',
        actorId: randomUUID(),
        message: 'done',
      }),
    ).rejects.toThrow(HelpdeskIllegalTransitionError);

    // No no-op event was appended — the stream still holds only the genesis (v1).
    const events = await listTicketEvents(tx, ids.helpdeskTicketId(ticketId));
    expect(events).toHaveLength(1);
    const row = await getTicketById(tx, ids.pariwarId(PARIWAR_A), ids.helpdeskTicketId(ticketId));
    expect(row!.currentState).toBe('open');
  });

  it('a message-bearing schema violation (awaiting_member with NO message) is rejected pre-write (ZodError)', async () => {
    const { client, tx } = getTx();
    const ticketId = randomUUID();
    await seedTicket(ticketId);
    await expect(
      projectTicketTransition(client, {
        ticketId: ids.helpdeskTicketId(ticketId),
        pariwarId: ids.pariwarId(PARIWAR_A),
        eventType: 'helpdesk.awaiting_member',
        trigger: 'helpdesk.transition:reply',
        actor: 'staff',
        actorId: randomUUID(),
        // message omitted — the strict schema requires it.
      }),
    ).rejects.toThrow();
    const events = await listTicketEvents(tx, ids.helpdeskTicketId(ticketId));
    expect(events).toHaveLength(1);
  });

  it('a transition against a non-existent ticket stream throws HelpdeskGenesisMissingError', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    await expect(
      projectTicketTransition(client, {
        ticketId: ids.helpdeskTicketId(randomUUID()),
        pariwarId: ids.pariwarId(PARIWAR_A),
        eventType: 'helpdesk.picked_up',
        trigger: 'helpdesk.transition:pick_up',
        actor: 'staff',
        actorId: randomUUID(),
      }),
    ).rejects.toThrow(HelpdeskGenesisMissingError);
  });

  it('the re-projected current_state write goes THROUGH the guard — a concurrent raw UPDATE is still rejected (P0001)', async () => {
    const { client } = getTx();
    const ticketId = randomUUID();
    await seedTicket(ticketId);
    await projectTicketTransition(client, {
      ticketId: ids.helpdeskTicketId(ticketId),
      pariwarId: ids.pariwarId(PARIWAR_A),
      eventType: 'helpdesk.picked_up',
      trigger: 'helpdesk.transition:pick_up',
      actor: 'staff',
      actorId: randomUUID(),
    });
    // The guard is tx-scoped SET LOCAL, reset after the projector's UPDATE — a subsequent raw write is rejected.
    const err = await client
      .query("UPDATE helpdesk_tickets SET current_state = 'resolved' WHERE ticket_id = $1", [ticketId])
      .then(() => null)
      .catch((e: unknown) => e);
    expect((err as { code?: string }).code).toBe('P0001');
  });
});
