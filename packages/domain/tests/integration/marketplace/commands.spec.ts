// Story 12.1 — the five commands + the lead pre-check, sequentially, inside one rolled-back transaction
// per test (AC5, AC6, AC7's authoring leg). Live DB. Windows are relative to the transaction's own
// `SELECT now()` (TR4); the legs that need time to PASS live in commands-clock.spec.ts, and the races in
// module-stream-concurrency.spec.ts. Every refusal names its typed error class, leaves no event and the
// row unchanged, and leaves the caller's transaction usable (asserted with a follow-up query). I4 is
// checked after every command.

import { createHash, randomUUID } from 'node:crypto';

import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { withCompensatingAudit } from '../../../src/audit/compensating.js';
import { bindScopedDb } from '../../../src/db.js';
import { pariwarId as toPariwarId, type ModuleId } from '../../../src/ids/index.js';
import {
  activateModule,
  archiveModule,
  authorModule,
  checkModuleLeadAllowed,
  scheduleModule,
  submitModuleLead,
  type ModuleCommandBase,
} from '../../../src/marketplace/commands.js';
import {
  ModuleArchiveReasonNotSatisfiedError,
  ModuleGenesisAlreadyExistsError,
  ModuleGenesisMissingError,
  ModuleIllegalTransitionError,
  ModuleLeadAlreadySubmittedError,
  ModuleLeadDuplicateError,
  ModuleManifestInvalidError,
  ModuleNotActiveError,
  ModuleOutsideWindowError,
  ModulePersistError,
  ModuleProjectorInputError,
  ModuleSlotsExhaustedError,
  ModuleStreamConcurrencyError,
} from '../../../src/marketplace/errors.js';
import { parseModuleManifest } from '../../../src/marketplace/filters.js';
import { projectModuleGenesis, projectModuleTransition } from '../../../src/marketplace/project.js';
import { DATABASE_URL, getTx, hasDatabase, setupLiveDb } from '../../../src/test-utils/integration-setup.js';
import { PARIWAR_A, PARIWAR_B, enterAppScope } from '../_helpers.js';
import {
  HOUR_MS,
  expectRowMatchesStream,
  manifestInput,
  newLeadId,
  newMemberId,
  newModuleId,
  rowOf,
  streamTypes,
  txNow,
} from './_fixtures.js';

const A = toPariwarId(PARIWAR_A);
const B = toPariwarId(PARIWAR_B);
const OPERATOR = randomUUID();

function base(moduleId: ModuleId, o: Partial<ModuleCommandBase> = {}): ModuleCommandBase {
  return { pariwarId: A, moduleId, auditId: randomUUID(), actor: 'operator', actorId: OPERATOR, ...o };
}

/** Author (+ optionally activate) a module on the test transaction. */
async function authored(
  client: pg.PoolClient,
  o: { activate?: boolean; manifest?: Record<string, unknown> } = {},
): Promise<ModuleId> {
  const id = newModuleId();
  const now = await txNow(client);
  await authorModule(client, { ...base(id), manifest: manifestInput(now, o.manifest) });
  if (o.activate) await activateModule(client, base(id));
  return id;
}

/** The test transaction is still usable (a refusal rolled back its own savepoint). */
async function expectTxUsable(client: pg.PoolClient): Promise<void> {
  const r = await client.query<{ one: number }>('SELECT 1 AS one');
  expect(r.rows[0]!.one).toBe(1);
}

/** Assert a refusal: the typed class, no new event, the row unchanged, the transaction usable. */
async function expectRefused(
  client: pg.PoolClient,
  id: string,
  run: () => Promise<unknown>,
  cls: new (...args: never[]) => Error,
): Promise<void> {
  const typesBefore = await streamTypes(client, id);
  const rowBefore = await rowOf(client, id);
  await expect(run()).rejects.toBeInstanceOf(cls);
  await expectTxUsable(client);
  expect(await streamTypes(client, id)).toEqual(typesBefore);
  expect(await rowOf(client, id)).toEqual(rowBefore);
}

function lead(id: ModuleId, memberId = newMemberId(), leadId = newLeadId()) {
  return { ...base(id), actor: 'member' as const, actorId: memberId as string, memberId, leadId };
}

describe.skipIf(!hasDatabase)('marketplace commands — authoring (AC5, AC7)', () => {
  setupLiveDb();

  it('authorModule writes module.authored + a draft row; payload content == row content, column by column', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = newModuleId();
    const now = await txNow(client);
    const input = manifestInput(now);
    const auditId = randomUUID();

    const res = await authorModule(client, { ...base(id), auditId, manifest: input });
    expect(res).toMatchObject({ eventVersion: 1, state: 'draft' });

    const ev = await client.query<{ payload: Record<string, unknown>; actor_id: string; pariwar_id: string }>(
      "SELECT payload, actor_id, pariwar_id FROM events_log WHERE stream_id = $1 AND event_type = 'module.authored'",
      [id],
    );
    const p = ev.rows[0]!.payload;
    const row = (await rowOf(client, id))!;
    expect(ev.rows[0]!.actor_id).toBe(OPERATOR);
    expect(ev.rows[0]!.pariwar_id).toBe(PARIWAR_A);
    expect(p).toMatchObject({ from_state: null, to_state: 'draft', trigger: 'module.author', actor: 'operator' });
    expect(p['module_id']).toBe(row['module_id']);
    expect(p['pariwar_id']).toBe(row['pariwar_id']);
    expect(p['manifest_schema_version']).toBe(row['manifest_schema_version']);
    for (const col of [
      'partner_id',
      'name_en',
      'name_hi',
      'description_en',
      'description_hi',
      'eligibility_filter',
      'scope_filter',
      'slot_capacity',
      'lead_handoff_url',
      'lead_handoff_signing_key_secret_name',
      'branding_bundle',
    ]) {
      expect(p[col], col).toEqual(row[col]);
    }
    expect(p['valid_from']).toBe((row['valid_from'] as Date).toISOString());
    expect(p['valid_until']).toBe((row['valid_until'] as Date).toISOString());
    expect(row).toMatchObject({
      current_state: 'draft',
      state_event_version: '1',
      slots_remaining: 5,
      archive_reason: null,
      audit_id: auditId,
    });
    await expectRowMatchesStream(client, id);
  });

  it('A5: valid_until ≤ now() is refused with ModuleOutsideWindowError; a past valid_from is accepted', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = await txNow(client);
    const id = newModuleId();
    const past = manifestInput(now, {
      valid_from: new Date(now.getTime() - 2 * HOUR_MS).toISOString(),
      valid_until: now.toISOString(),
    });
    await expect(authorModule(client, { ...base(id), manifest: past })).rejects.toBeInstanceOf(ModuleOutsideWindowError);
    await expectTxUsable(client);
    expect(await streamTypes(client, id)).toEqual([]);
    // The default fixture's valid_from is an hour in the past.
    await expect(authorModule(client, { ...base(newModuleId()), manifest: manifestInput(now) })).resolves.toMatchObject({
      state: 'draft',
    });
  });

  it('an invalid manifest is ModuleManifestInvalidError with no event', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = newModuleId();
    const now = await txNow(client);
    await expect(
      authorModule(client, { ...base(id), manifest: manifestInput(now, { scope_filter: { version: 1, scope: 'role', values: ['x'] } }) }),
    ).rejects.toBeInstanceOf(ModuleManifestInvalidError);
    expect(await streamTypes(client, id)).toEqual([]);
  });

  it('a genesis on a non-empty stream is ModuleGenesisAlreadyExistsError, and the transaction stays usable', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client);
    const now = await txNow(client);
    await expect(authorModule(client, { ...base(id), manifest: manifestInput(now) })).rejects.toBeInstanceOf(
      ModuleGenesisAlreadyExistsError,
    );
    await expectTxUsable(client);
    // …and again straight through the projector (step 2 → the typed error, the savepoint rolled back).
    await expect(
      projectModuleGenesis(client, {
        pariwarId: A,
        moduleId: id,
        manifest: parseModuleManifest(manifestInput(now)),
        auditId: randomUUID(),
        actor: 'system',
        actorId: null,
      }),
    ).rejects.toBeInstanceOf(ModuleGenesisAlreadyExistsError);
    await expectTxUsable(client);
    expect(await streamTypes(client, id)).toEqual(['module.authored']);
  });

  it('a wrong-Pariwar genesis (scope A, pariwarId B) propagates 42501 unchanged, and the transaction stays usable', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = await txNow(client);
    await expect(
      authorModule(client, { ...base(newModuleId(), { pariwarId: B }), manifest: manifestInput(now) }),
    ).rejects.toMatchObject({ cause: expect.objectContaining({ code: '42501' }) });
    await expectTxUsable(client);
  });
});

describe.skipIf(!hasDatabase)('marketplace commands — lifecycle (AC5)', () => {
  setupLiveDb();

  it('draft → scheduled (before valid_from) → active is refused until valid_from; draft → active inside the window', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = await txNow(client);
    const future = {
      valid_from: new Date(now.getTime() + HOUR_MS).toISOString(),
      valid_until: new Date(now.getTime() + 2 * HOUR_MS).toISOString(),
    };
    const id = await authored(client, { manifest: future });
    const s = await scheduleModule(client, base(id));
    expect(s).toMatchObject({ fromState: 'draft', state: 'scheduled', eventVersion: 2 });
    await expectRowMatchesStream(client, id);
    await expectRefused(client, id, () => activateModule(client, base(id)), ModuleOutsideWindowError);

    const live = await authored(client);
    await expectRefused(client, live, () => scheduleModule(client, base(live)), ModuleOutsideWindowError);
    const a = await activateModule(client, base(live));
    expect(a).toMatchObject({ fromState: 'draft', state: 'active', eventVersion: 2 });
    await expectRowMatchesStream(client, live);
    const ev = await client.query<{ payload: unknown }>(
      "SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'module.activated'",
      [live],
    );
    expect(ev.rows[0]!.payload).toEqual({ from_state: 'draft', to_state: 'active', trigger: 'module.activate', actor: 'operator' });
  });

  it('guard order: a missing row is ModuleGenesisMissingError (also another tenant’s), then legality, then the window', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ghost = newModuleId();
    await expect(scheduleModule(client, base(ghost))).rejects.toBeInstanceOf(ModuleGenesisMissingError);
    await expect(archiveModule(client, { ...base(ghost), reason: 'trustee_archived' })).rejects.toBeInstanceOf(
      ModuleGenesisMissingError,
    );
    await expectTxUsable(client);
    const id = await authored(client, { activate: true });
    // active → scheduled is illegal (legality is judged BEFORE the window).
    await expectRefused(client, id, () => scheduleModule(client, base(id)), ModuleIllegalTransitionError);
    await expectRefused(client, id, () => activateModule(client, base(id)), ModuleIllegalTransitionError);
    // Another tenant's id is invisible (RLS + the explicit predicate) ⇒ missing.
    await expect(activateModule(client, base(id, { pariwarId: B }))).rejects.toBeInstanceOf(ModuleGenesisMissingError);
  });

  it('archive: trustee_archived from draft / scheduled / active; archived is terminal', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = await txNow(client);
    const fromDraft = await authored(client);
    const fromScheduled = await authored(client, {
      manifest: { valid_from: new Date(now.getTime() + HOUR_MS).toISOString(), valid_until: new Date(now.getTime() + 2 * HOUR_MS).toISOString() },
    });
    await scheduleModule(client, base(fromScheduled));
    const fromActive = await authored(client, { activate: true });
    for (const id of [fromDraft, fromScheduled, fromActive]) {
      const auditId = randomUUID();
      const r = await archiveModule(client, { ...base(id, { actor: 'trustee', auditId }), reason: 'trustee_archived' });
      expect(r).toMatchObject({ state: 'archived', reason: 'trustee_archived' });
      expect(await rowOf(client, id)).toMatchObject({ current_state: 'archived', archive_reason: 'trustee_archived', audit_id: auditId });
      await expectRowMatchesStream(client, id);
      await expectRefused(client, id, () => archiveModule(client, { ...base(id), reason: 'trustee_archived' }), ModuleIllegalTransitionError);
      await expectRefused(client, id, () => activateModule(client, base(id)), ModuleIllegalTransitionError);
      await expectRefused(client, id, () => scheduleModule(client, base(id)), ModuleIllegalTransitionError); // RP15
    }
    const ev = await client.query<{ payload: unknown }>(
      "SELECT payload FROM events_log WHERE stream_id = $1 AND event_type = 'module.archived'",
      [fromActive],
    );
    expect(ev.rows[0]!.payload).toEqual({
      from_state: 'active',
      to_state: 'archived',
      trigger: 'module.archive:trustee_archived',
      actor: 'trustee',
      reason: 'trustee_archived',
    });
  });

  it('archive reasons: valid_until_reached before valid_until and slot_capacity_exhausted with places left / uncapped are refused', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true });
    await expectRefused(
      client,
      id,
      () => archiveModule(client, { ...base(id), reason: 'valid_until_reached' }),
      ModuleArchiveReasonNotSatisfiedError,
    );
    await expectRefused(
      client,
      id,
      () => archiveModule(client, { ...base(id), reason: 'slot_capacity_exhausted' }),
      ModuleArchiveReasonNotSatisfiedError,
    );
    const uncapped = await authored(client, { activate: true, manifest: { slot_capacity: null } });
    await expectRefused(
      client,
      uncapped,
      () => archiveModule(client, { ...base(uncapped), reason: 'slot_capacity_exhausted' }),
      ModuleArchiveReasonNotSatisfiedError,
    );
    // A draft module at full capacity has places left, so it is refused for THAT reason. ⚠ The `state === 'active'` clause
    // of the guard cannot be isolated by any test: a module that is not active cannot hold 0 places (RP13).
    //
    const draft = await authored(client);
    await expectRefused(
      client,
      draft,
      () => archiveModule(client, { ...base(draft), reason: 'slot_capacity_exhausted' }),
      ModuleArchiveReasonNotSatisfiedError,
    );
  });

  it('projectModuleTransition rejects module.authored with ModuleGenesisAlreadyExistsError', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client);
    await expect(
      projectModuleTransition(client, {
        pariwarId: A,
        moduleId: id,
        eventType: 'module.authored' as never,
        payload: {},
        auditId: randomUUID(),
        actor: 'operator',
        actorId: OPERATOR,
        lockedRow: { currentState: 'draft', stateEventVersion: 1, slotsRemaining: 5, slotCapacity: 5 },
      }),
    ).rejects.toBeInstanceOf(ModuleGenesisAlreadyExistsError);
  });
});

describe.skipIf(!hasDatabase)('marketplace commands — the I11 actor rules (AC5)', () => {
  setupLiveDb();

  it('the I11 actor legs each throw ModuleProjectorInputError with no event; a system-actor archive for an automatic reason is allowed', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const now = await txNow(client);
    const id = await authored(client, { activate: true });
    const member = newMemberId();

    // A lead by an operator; a member registering SOMEONE ELSE's interest.
    await expectRefused(client, id, () => submitModuleLead(client, { ...lead(id, member), actor: 'operator' as never }), ModuleProjectorInputError);
    await expectRefused(client, id, () => submitModuleLead(client, { ...lead(id, member), actorId: randomUUID() }), ModuleProjectorInputError);

    // A member cannot author, schedule, activate or archive.
    const memberBase = (m: ModuleId) => base(m, { actor: 'member', actorId: member });
    const fresh = newModuleId();
    await expect(authorModule(client, { ...memberBase(fresh), manifest: manifestInput(now) })).rejects.toBeInstanceOf(
      ModuleProjectorInputError,
    );
    expect(await streamTypes(client, fresh)).toEqual([]);
    const draft = await authored(client);
    await expectRefused(client, draft, () => scheduleModule(client, memberBase(draft)), ModuleProjectorInputError);
    await expectRefused(client, draft, () => activateModule(client, memberBase(draft)), ModuleProjectorInputError);
    await expectRefused(client, draft, () => archiveModule(client, { ...memberBase(draft), reason: 'trustee_archived' }), ModuleProjectorInputError);

    // actor / actorId mismatch: `system` with an id; an operator with none.
    await expectRefused(client, draft, () => activateModule(client, base(draft, { actor: 'system', actorId: OPERATOR })), ModuleProjectorInputError);
    await expectRefused(client, draft, () => activateModule(client, base(draft, { actorId: null })), ModuleProjectorInputError);

    // A raw projector lead whose actorId ≠ payload.member_id.
    await expectRefused(
      client,
      id,
      () =>
        projectModuleTransition(client, {
          pariwarId: A,
          moduleId: id,
          eventType: 'module.lead_submitted',
          payload: {
            lead_id: newLeadId(),
            member_id: member,
            slots_remaining_after: 4,
            from_state: 'active',
            to_state: 'active',
            trigger: 'module.lead_submit',
            actor: 'member',
          },
          auditId: randomUUID(),
          actor: 'member',
          actorId: randomUUID(),
          lockedRow: { currentState: 'active', stateEventVersion: 2, slotsRemaining: 5, slotCapacity: 5 },
        }),
      ModuleProjectorInputError,
    );
    // …and a system-actor archive is allowed (the 12.6 sweep) — for an AUTOMATIC reason. `trustee_archived` is a
    // person's decision, so the sweep cannot record it (code review RV8: attribution, checklist family 8).
    await expectRefused(
      client,
      draft,
      () => archiveModule(client, { ...base(draft, { actor: 'system', actorId: null }), reason: 'trustee_archived' }),
      ModuleProjectorInputError,
    );
    const full = await authored(client, { activate: true, manifest: { slot_capacity: 1 } });
    await submitModuleLead(client, lead(full));
    await expect(
      archiveModule(client, { ...base(full, { actor: 'system', actorId: null }), reason: 'slot_capacity_exhausted' }),
    ).resolves.toMatchObject({ state: 'archived', reason: 'slot_capacity_exhausted' });
  });
});

describe.skipIf(!hasDatabase)('marketplace commands — leads, places and idempotency (AC6, QE7, QE8)', () => {
  setupLiveDb();

  it('a capped module counts places exactly; replay, already-submitted and duplicate refusals never decrement', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true, manifest: { slot_capacity: 2 } });
    const a = newMemberId();
    const aLead = newLeadId();

    const first = await submitModuleLead(client, lead(id, a, aLead));
    expect(first).toMatchObject({ replayed: false, slotsRemainingAfter: 1, fromState: 'active', state: 'active', eventVersion: 3 });
    expect(await rowOf(client, id)).toMatchObject({ slots_remaining: 1, current_state: 'active' });
    await expectRowMatchesStream(client, id);
    const ev = await client.query<{ payload: unknown; actor_id: string }>(
      "SELECT payload, actor_id FROM events_log WHERE stream_id = $1 AND event_type = 'module.lead_submitted'",
      [id],
    );
    expect(ev.rows[0]).toEqual({
      payload: {
        lead_id: aLead,
        member_id: a,
        slots_remaining_after: 1,
        from_state: 'active',
        to_state: 'active',
        trigger: 'module.lead_submit',
        actor: 'member',
      },
      actor_id: a,
    });

    // (i) The identical call replayed — the original result, ⛔ event, ⛔ decrement.
    const typesBefore = await streamTypes(client, id);
    const replay = await submitModuleLead(client, lead(id, a, aLead));
    expect(replay).toEqual({ replayed: true, leadId: aLead, eventVersion: 3, slotsRemainingAfter: 1 });
    expect(await streamTypes(client, id)).toEqual(typesBefore);

    // (iii) The same member with a NEW lead id; (ii) A's lead id for a DIFFERENT member.
    await expectRefused(client, id, () => submitModuleLead(client, lead(id, a)), ModuleLeadAlreadySubmittedError);
    await expectRefused(client, id, () => submitModuleLead(client, lead(id, newMemberId(), aLead)), ModuleLeadDuplicateError);

    // The last place, then none.
    const second = await submitModuleLead(client, lead(id));
    expect(second).toMatchObject({ replayed: false, slotsRemainingAfter: 0 });
    await expectRefused(client, id, () => submitModuleLead(client, lead(id)), ModuleSlotsExhaustedError);
    // ⛔ automatic archive at zero — it stays active (C2) — and only now does slot_capacity_exhausted hold.
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'active', slots_remaining: 0 });
    await archiveModule(client, { ...base(id, { actor: 'system', actorId: null }), reason: 'slot_capacity_exhausted' });
    expect(await rowOf(client, id)).toMatchObject({ current_state: 'archived', slots_remaining: 0, archive_reason: 'slot_capacity_exhausted' });
    await expectRowMatchesStream(client, id);
  });

  it('a lead id reused on ANOTHER module is ModuleLeadDuplicateError (the global 23505), with no decrement', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const one = await authored(client, { activate: true });
    const two = await authored(client, { activate: true });
    const shared = newLeadId();
    await submitModuleLead(client, lead(one, newMemberId(), shared));
    await expectRefused(client, two, () => submitModuleLead(client, lead(two, newMemberId(), shared)), ModuleLeadDuplicateError);
    expect(await rowOf(client, two)).toMatchObject({ slots_remaining: 5, state_event_version: '2' });
    await expectRowMatchesStream(client, two);
  });

  it('an uncapped module accepts leads with slots_remaining_after: null', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true, manifest: { slot_capacity: null } });
    for (let n = 0; n < 3; n += 1) {
      expect(await submitModuleLead(client, lead(id))).toMatchObject({ replayed: false, slotsRemainingAfter: null });
    }
    expect(await rowOf(client, id)).toMatchObject({ slot_capacity: null, slots_remaining: null, state_event_version: '5' });
    await expectRowMatchesStream(client, id);
  });

  it('a lead on a non-active module is ModuleNotActiveError (draft, scheduled, archived)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const draft = await authored(client);
    await expectRefused(client, draft, () => submitModuleLead(client, lead(draft)), ModuleNotActiveError);
    const now = await txNow(client);
    const scheduled = await authored(client, {
      manifest: { valid_from: new Date(now.getTime() + HOUR_MS).toISOString(), valid_until: new Date(now.getTime() + 2 * HOUR_MS).toISOString() },
    });
    await scheduleModule(client, base(scheduled));
    expect(await rowOf(client, scheduled)).toMatchObject({ current_state: 'scheduled' });
    await expectRefused(client, scheduled, () => submitModuleLead(client, lead(scheduled)), ModuleNotActiveError);
    const archived = await authored(client, { activate: true });
    await archiveModule(client, { ...base(archived), reason: 'trustee_archived' });
    await expectRefused(client, archived, () => submitModuleLead(client, lead(archived)), ModuleNotActiveError);
    await expect(submitModuleLead(client, lead(newModuleId()))).rejects.toBeInstanceOf(ModuleGenesisMissingError);
    await expectTxUsable(client);
  });

  // RP3 — the most realistic redelivery: the lead took the LAST place and the sweep archived the module. QE7 puts
  // `replay` BEFORE `not_active`, so the member's retried request still gets its original answer, not a refusal.
  it('RP3: a redelivered lead is REPLAYED after the last place was taken and the module archived — a NEW member is refused', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true, manifest: { slot_capacity: 1 } });
    const member = newMemberId();
    const leadId = newLeadId();
    const first = await submitModuleLead(client, lead(id, member, leadId));
    expect(first).toMatchObject({ replayed: false, slotsRemainingAfter: 0 });
    await archiveModule(client, { ...base(id, { actor: 'system', actorId: null }), reason: 'slot_capacity_exhausted' });
    const types = await streamTypes(client, id);
    const row = await rowOf(client, id);

    const again = await submitModuleLead(client, lead(id, member, leadId));
    expect(again).toMatchObject({ replayed: true, leadId, eventVersion: first.eventVersion, slotsRemainingAfter: 0 });
    expect(await streamTypes(client, id)).toEqual(types);
    expect(await rowOf(client, id)).toEqual(row);
    await expectRefused(client, id, () => submitModuleLead(client, lead(id, newMemberId())), ModuleNotActiveError);
  });

  it('checkModuleLeadAllowed returns each refusal, and ok / replayed (the QE7 ORDER is pinned DB-free in commands-guards.test.ts)', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const db = bindScopedDb(client);
    const id = await authored(client, { activate: true, manifest: { slot_capacity: 1 } });
    const draft = await authored(client);
    const a = newMemberId();
    const aLead = newLeadId();
    const check = (m: ModuleId, memberId = newMemberId(), leadId = newLeadId()) =>
      checkModuleLeadAllowed(db, { pariwarId: A, moduleId: m, memberId, leadId });

    expect(await check(newModuleId())).toEqual({ ok: false, refusal: 'not_found' });
    expect(await check(draft)).toEqual({ ok: false, refusal: 'not_active' });
    expect(await check(id, a, aLead)).toEqual({ ok: true, replayed: false });
    await submitModuleLead(client, lead(id, a, aLead));
    expect(await check(id, a, aLead)).toEqual({ ok: true, replayed: true });
    // At 0 places, `slots_exhausted` outranks the duplicate / already-submitted refusals (QE7 order).
    expect(await check(id)).toEqual({ ok: false, refusal: 'slots_exhausted' });
    expect(await check(id, a)).toEqual({ ok: false, refusal: 'slots_exhausted' });
    // With places left, the lead-id / member refusals are reached.
    const roomy = await authored(client, { activate: true });
    const b = newMemberId();
    const bLead = newLeadId();
    await submitModuleLead(client, lead(roomy, b, bLead));
    expect(await check(roomy, newMemberId(), bLead)).toEqual({ ok: false, refusal: 'duplicate_lead' });
    expect(await check(roomy, b)).toEqual({ ok: false, refusal: 'already_submitted' });
    // The pre-check is read-only: it wrote nothing.
    expect(await streamTypes(client, roomy)).toEqual(['module.authored', 'module.activated', 'module.lead_submitted']);
  });
});

describe.skipIf(!hasDatabase)('marketplace commands — across tenants (RP5)', () => {
  setupLiveDb();

  /** A module authored (and activated) under Pariwar B. */
  async function moduleInB(client: pg.PoolClient): Promise<ModuleId> {
    await enterAppScope(client, PARIWAR_B);
    const id = newModuleId();
    await authorModule(client, { ...base(id, { pariwarId: B }), manifest: manifestInput(await txNow(client)) });
    await activateModule(client, base(id, { pariwarId: B }));
    return id;
  }

  it('a lead_id reused under ANOTHER Pariwar is ModuleLeadDuplicateError: RLS hides the row, only the global index refuses it', async () => {
    const { client } = getTx();
    const idB = await moduleInB(client);
    const shared = newLeadId();
    await submitModuleLead(client, { ...lead(idB, newMemberId(), shared), pariwarId: B });

    await enterAppScope(client, PARIWAR_A);
    const idA = await authored(client, { activate: true });
    await expectRefused(client, idA, () => submitModuleLead(client, lead(idA, newMemberId(), shared)), ModuleLeadDuplicateError);
    expect(await rowOf(client, idA)).toMatchObject({ slots_remaining: 5, state_event_version: '2' });
    await expectRowMatchesStream(client, idA);
  });

  it('a genesis for a module_id already authored under ANOTHER Pariwar is ModuleGenesisAlreadyExistsError; neither stream changes', async () => {
    const { client } = getTx();
    const idB = await moduleInB(client);
    const typesInB = await streamTypes(client, idB);

    await enterAppScope(client, PARIWAR_A);
    await expect(authorModule(client, { ...base(idB), manifest: manifestInput(await txNow(client)) })).rejects.toBeInstanceOf(
      ModuleGenesisAlreadyExistsError,
    );
    await expectTxUsable(client);
    expect(await streamTypes(client, idB)).toEqual([]); // A sees nothing of B's stream, and wrote nothing into it

    await enterAppScope(client, PARIWAR_B);
    expect(await streamTypes(client, idB)).toEqual(typesInB);
  });

  it('submitModuleLead with pariwarId ≠ the session scope finds no row: ModuleGenesisMissingError, nothing written', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const idA = await authored(client, { activate: true });
    const typesInA = await streamTypes(client, idA);

    await enterAppScope(client, PARIWAR_B);
    await expect(submitModuleLead(client, lead(idA))).rejects.toBeInstanceOf(ModuleGenesisMissingError); // pariwarId A, scope B
    await expectTxUsable(client);

    await enterAppScope(client, PARIWAR_A);
    expect(await streamTypes(client, idA)).toEqual(typesInA);
    expect(await rowOf(client, idA)).toMatchObject({ slots_remaining: 5, state_event_version: '2' });
  });
});

describe.skipIf(!hasDatabase)('marketplace projector — the write-side integrity guards (I3, I4; RP6)', () => {
  setupLiveDb();

  // An active module is at version 2 (authored, activated), capacity 5, five places left.
  const LOCKED = { currentState: 'active' as const, stateEventVersion: 2, slotsRemaining: 5, slotCapacity: 5 };

  /** Run `run` inside a savepoint that is ALWAYS rolled back, and return what it threw. A guard that fires AFTER the append must not leave the stray event behind. */
  async function thrown(client: pg.PoolClient, run: () => Promise<unknown>): Promise<unknown> {
    await client.query('SAVEPOINT rp6');
    let err: unknown;
    try {
      await run();
    } catch (e) {
      err = e;
    }
    await client.query('ROLLBACK TO SAVEPOINT rp6');
    await client.query('RELEASE SAVEPOINT rp6');
    return err;
  }

  function leadPayload(member: string, o: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      lead_id: newLeadId(),
      member_id: member,
      slots_remaining_after: 4,
      from_state: 'active',
      to_state: 'active',
      trigger: 'module.lead_submit',
      actor: 'member',
      ...o,
    };
  }

  function project(
    client: pg.PoolClient,
    id: ModuleId,
    member: string,
    o: { payload?: Record<string, unknown>; lockedRow?: typeof LOCKED; auditId?: string } = {},
  ) {
    return projectModuleTransition(client, {
      pariwarId: A,
      moduleId: id,
      eventType: 'module.lead_submitted',
      payload: o.payload ?? leadPayload(member),
      auditId: o.auditId ?? randomUUID(),
      actor: 'member',
      actorId: member,
      lockedRow: o.lockedRow ?? LOCKED,
    });
  }

  it.each([
    ['the stream head (2) ≠ the locked version — drift', { lockedRow: { ...LOCKED, stateEventVersion: 1 } }, ModuleStreamConcurrencyError],
    ['the payload from_state disagrees with the locked row', { payload: { from_state: 'draft' } }, ModuleProjectorInputError],
    ['the payload actor ≠ the input actor', { payload: { actor: 'operator' } }, ModuleProjectorInputError],
    ['slots_remaining_after ≠ the expected places', { payload: { slots_remaining_after: 3 } }, ModuleProjectorInputError],
    ['the payload fails its strict schema (an extra key — I9, no PII)', { payload: { member_name: 'A. B.' } }, ModuleProjectorInputError],
  ])('refuses when %s — typed, nothing written, the transaction usable', async (_label, o, cls) => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true });
    const member = newMemberId() as string;
    const types = await streamTypes(client, id);
    const row = await rowOf(client, id);
    const spec = o as { payload?: Record<string, unknown>; lockedRow?: typeof LOCKED };
    const opts = { lockedRow: spec.lockedRow, payload: spec.payload === undefined ? undefined : leadPayload(member, spec.payload) };

    expect(await thrown(client, () => project(client, id, member, opts as never))).toBeInstanceOf(cls);

    await expectTxUsable(client);
    expect(await streamTypes(client, id)).toEqual(types);
    expect(await rowOf(client, id)).toEqual(row);
  });

  it('a row UPDATE that fails AFTER the append is a ModulePersistError carrying its SQLSTATE — and the params stay out of the message', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true });
    const member = newMemberId() as string;
    const types = await streamTypes(client, id);

    // A non-uuid audit id is accepted by the append (events_log has no such column) and refused by the UPDATE: 22P02.
    const err = await thrown(client, () => project(client, id, member, { auditId: 'not-a-uuid' }));

    expect(err).toBeInstanceOf(ModulePersistError);
    expect((err as ModulePersistError).sqlstate).toBe('22P02');
    expect((err as ModulePersistError).message).not.toContain('params:');
    expect(await streamTypes(client, id)).toEqual(types); // the savepoint took the appended event with it
  });

  it('a 0-row UPDATE is a ModulePersistError too — the event was appended, so silence would leave the stream ahead of the row', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const ghost = newModuleId(); // a stream with NO row
    const err = await thrown(client, () =>
      projectModuleTransition(client, {
        pariwarId: A,
        moduleId: ghost,
        eventType: 'module.activated',
        payload: { from_state: 'draft', to_state: 'active', trigger: 'module.activate', actor: 'operator' },
        auditId: randomUUID(),
        actor: 'operator',
        actorId: OPERATOR,
        lockedRow: { currentState: 'draft', stateEventVersion: 0, slotsRemaining: null, slotCapacity: null },
      }),
    );

    expect(err).toBeInstanceOf(ModulePersistError);
    expect((err as ModulePersistError).sqlstate).toBeNull();
    expect((err as ModulePersistError).message).toContain('expected 1 row updated, got 0');
    expect(await streamTypes(client, ghost)).toEqual([]);
  });
});

describe.skipIf(!hasDatabase)('marketplace commands — composed under the real audit wrapper (AC5, QE15)', () => {
  setupLiveDb();
  let auditPool: pg.Pool;

  beforeAll(() => {
    auditPool = new pg.Pool({ connectionString: DATABASE_URL, max: 2, ssl: false });
  });
  afterAll(async () => {
    await auditPool.end();
  });

  it('a pre-check passes, a race takes the last place, and the wrapped submit writes intent + _rolled_back', async () => {
    const { client } = getTx();
    await enterAppScope(client, PARIWAR_A);
    const id = await authored(client, { activate: true, manifest: { slot_capacity: 1 } });
    const memberA = newMemberId();
    const leadA = newLeadId();
    const baseline = await auditPool.query<{ seq: string | null }>('SELECT max(seq) AS seq FROM audit_log_entries');
    const since = baseline.rows[0]!.seq ?? '0';

    // (2) The pre-check passes for A …
    expect(
      await checkModuleLeadAllowed(bindScopedDb(client), { pariwarId: A, moduleId: id, memberId: memberA, leadId: leadA }),
    ).toEqual({ ok: true, replayed: false });
    // (3) … B takes the last place in the same transaction (the race) …
    await submitModuleLead(client, lead(id));
    // (4) … so A's wrapped submit is refused UNDER THE LOCK.
    const auditIntent = {
      pariwarId: PARIWAR_A,
      actorId: memberA as string,
      actorRole: 'member',
      action: 'module.lead_submitted',
      resourceLocator: `module/${id}`,
      requestPayloadHash: createHash('sha256').update(JSON.stringify({ module_id: id, lead_id: leadA })).digest('hex'),
    };
    await expect(
      withCompensatingAudit(auditPool, {
        auditIntent,
        mutate: ({ auditId }) => submitModuleLead(client, { ...lead(id, memberA, leadA), auditId }),
      }),
    ).rejects.toBeInstanceOf(ModuleSlotsExhaustedError);
    await expectTxUsable(client);

    // (5) The intent line + the compensating line, newer than the baseline. (Audit rows commit permanently.)
    const rows = await auditPool.query<{ action: string; resource_locator: string; response_status: number }>(
      'SELECT action, resource_locator, response_status FROM audit_log_entries WHERE seq > $1 AND resource_locator = $2 ORDER BY seq',
      [since, `module/${id}`],
    );
    expect(rows.rows).toEqual([
      { action: 'module.lead_submitted', resource_locator: `module/${id}`, response_status: 200 },
      { action: 'module.lead_submitted_rolled_back', resource_locator: `module/${id}`, response_status: 500 },
    ]);
    expect(await rowOf(client, id)).toMatchObject({ slots_remaining: 0 });
  });
});
