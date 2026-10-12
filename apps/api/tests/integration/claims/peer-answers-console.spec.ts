// Story 6.27a (Task 7; AC7) — what the District Admin sees in the verifier console's peer-mesh section (PM13, PM25 (c)),
// on a live DB (:5433). The answers are saved through the REAL member route (real encryption + the three date indexes).
//   · the 72-hour label + window; per neighbour: the NAME (decrypted), the send status for every value incl. `not_sent`,
//     every live answer with its English words (the date decrypted), submitted or not, app / helpline, "changed N times";
//   · the call-back mobile ONLY on a "yes" — decrypted, normalised — and each showing reported ONCE to the audit callback;
//   · a failed decrypt is `unavailable`, ⛔ a blank;
//   · the section books EXACTLY its reads (6) and Postgres receives exactly that many statements;
//   · PM25 (c): an actor holding an UN-completed assignment with ⛔ no completed FULL visit gets ⛔ no section (`undefined`,
//     after ONE read). (A completed `certificate_check` alone vs a completed full visit: the domain predicate's own legs in
//     `packages/domain/tests/integration/claim/peer-mesh-reply.spec.ts`, where the real inspection writers seed them.)

import { randomUUID } from 'node:crypto';

import { claim, encryption, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { assemblePeerMesh } from '../../../src/modules/claims/claims.verifier-console.handlers.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;

describe.skipIf(!hasDatabase)('Story 6.27a — the District Admin sees the neighbours\' answers (:5433)', { timeout: 30000 }, () => {
  let t: TestApp;
  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await teardown(t);
  });

  async function seedNeighbour(pariwarId: string, name: string, mobile: string): Promise<string> {
    const memberId = randomUUID();
    await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
    await t.pool.query(
      `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
       VALUES ($1, $2, $3, $4, 'self_declared', 'manual')`,
      [memberId, pariwarId, await encryption.encryptKycField(name, pariwarId, t.deps.encryption), await encryption.encryptKycField('1970-01-01', pariwarId, t.deps.encryption)],
    );
    await t.pool.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
      memberId,
      pariwarId,
      await encryption.encryptMobile(mobile, t.deps.encryption),
      `bi-${randomUUID()}`,
    ]);
    return memberId;
  }

  async function seedClaimWithPings(pariwarId: string, neighbours: readonly string[], texted: readonly boolean[]) {
    const deceased = ids.memberId(randomUUID());
    const cid = ids.claimId(randomUUID());
    const scopeTx = await openScopeTx(t.deps, pariwarId);
    const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
      claim.projectClaimState(scopeTx.client, {
        claimCaseId: cid,
        pariwarId: ids.pariwarId(pariwarId),
        deceasedMemberId: deceased,
        intakeChannels: ['helpline'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
        actorId: null,
      });
    try {
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceased), intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [...neighbours], metric_id: 'm', metric_version: 1 });
      await closeScopeTx(scopeTx, true);
    } catch (err) {
      await closeScopeTx(scopeTx, false);
      throw err;
    }
    const selectionId = randomUUID();
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, cid, pariwarId, deceased, neighbours],
    );
    const pingIds: string[] = [];
    for (const [i, m] of neighbours.entries()) {
      const pingId = randomUUID();
      pingIds.push(pingId);
      await t.pool.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [pingId, selectionId, pariwarId, m]);
      if (texted[i]) await t.pool.query(`UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', attempt_count = 1, send_updated_at = clock_timestamp() WHERE ping_id = $1`, [pingId]);
    }
    return { cid, pingIds };
  }

  async function put(p: string, m: string, ping: string, key: string, value: Json) {
    const tok = signAccessToken(t.app, { memberId: m, pariwarId: p, deviceId: 'd' }, 15 * 60 * 1000);
    const res = await t.app.inject({
      method: 'PUT',
      url: `/api/v1/p/${p}/member/peer-requests/${ping}/answers/${key}`,
      headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001', 'idempotency-key': randomUUID() },
      payload: { value },
    });
    expect(res.statusCode, res.body).toBe(200);
  }

  /** The section on its own, counting booked reads and the statements Postgres receives. */
  async function section(p: string, cid: string, actorId: string, onShown?: (pingId: string) => void) {
    const scopeTx = await openScopeTx(t.deps, p);
    const statements: string[] = [];
    const client = scopeTx.client as unknown as { query: (...a: unknown[]) => unknown };
    const realQuery = client.query.bind(client);
    client.query = (...args: unknown[]) => {
      const first = args[0] as string | { text: string };
      statements.push(typeof first === 'string' ? first : first.text);
      return realQuery(...args);
    };
    let booked = 0;
    try {
      const out = await assemblePeerMesh(
        t.deps,
        {
          db: scopeTx.tx,
          client: scopeTx.client,
          pariwarId: p,
          claimCaseId: cid,
          district: 'Patna',
          actorId,
          grants: [],
          traceId: null,
          ...(onShown ? { onCallbackMobileShown: onShown } : {}),
        },
        ids.claimId(cid),
        { bump: () => (booked += 1) },
        'Ram K.',
      );
      client.query = realQuery as never;
      await closeScopeTx(scopeTx, true);
      return { out, booked, statements: statements.filter((s) => !/SAVEPOINT/.test(s)) };
    } catch (err) {
      client.query = realQuery as never;
      await closeScopeTx(scopeTx, false);
      throw err;
    }
  }

  it('names, send status, every live answer in English (the date decrypted), how / when saved, "changed N times", the call-back mobile on a "yes" (audited once) — and EXACTLY 6 reads', async () => {
    const p = randomUUID();
    const asha = await seedNeighbour(p, 'Asha Devi', '+919876543210');
    const bina = await seedNeighbour(p, 'Bina Kumari', '+919812345678');
    const { cid, pingIds } = await seedClaimWithPings(p, [asha, bina], [true, false]);
    await put(p, asha, pingIds[0]!, 'has_died', { codes: ['not_sure'] });
    await put(p, asha, pingIds[0]!, 'has_died', { codes: ['died'] }); // changed once
    await put(p, asha, pingIds[0]!, 'death_date', { date: '2026-10-01' });
    await put(p, asha, pingIds[0]!, 'callback_consent', { codes: ['yes'] });

    const shown: string[] = [];
    const { out, booked, statements } = await section(p, cid, randomUUID(), (pingId) => shown.push(pingId));
    expect(out?.status).toBe('present');
    const tr = out?.status === 'present' ? out.transcript : null;
    expect(tr?.outcome).toBe('pending');
    expect(tr?.windowExpiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const a = tr!.pings.find((x) => x.memberId === asha)!;
    const b = tr!.pings.find((x) => x.memberId === bina)!;
    expect(a.responderName).toEqual({ status: 'shown', text: 'Asha Devi' });
    expect(a.sendStatus).toBe('accepted');
    expect(b.sendStatus).toBe('not_sent');
    expect(b.reply).toBeNull();
    expect(b.callbackMobile).toEqual({ status: 'none' });
    expect(a.reply?.submitted).toBe(false);
    const byKey = Object.fromEntries(a.reply!.answers.map((x) => [x.questionKey, x]));
    expect(byKey['has_died']).toMatchObject({ question: 'Has Ram K. died?', value: { kind: 'codes', codes: ['died'], labels: ['Yes, they have died'] }, savedVia: 'member_app', changeCount: 1 });
    expect(byKey['death_date']).toMatchObject({ value: { kind: 'date', date: '2026-10-01' }, changeCount: 0 });
    expect(a.callbackMobile).toEqual({ status: 'shown', text: '+919876543210' });
    expect(shown).toEqual([pingIds[0]]);
    // EXACTLY the reads it books: the inspector check, the selection, the pings, the responses, the answers, the contacts.
    expect(booked).toBe(6);
    expect(statements).toHaveLength(6);
  });

  it('a failed decrypt is `unavailable` — ⛔ a blank', async () => {
    const p = randomUUID();
    const asha = await seedNeighbour(p, 'Asha Devi', '+919876543210');
    const { cid, pingIds } = await seedClaimWithPings(p, [asha], [true]);
    await put(p, asha, pingIds[0]!, 'has_died', { codes: ['died'] });
    await put(p, asha, pingIds[0]!, 'death_date', { date: '2026-10-01' });
    // corrupt the stored ciphertext (the erasure arm admits a ciphertext-only rewrite) and the name
    await t.pool.query(`UPDATE claim_peer_mesh_reply_answers SET value_ciphertext = 'enc:v1:garbage' WHERE claim_case_id = $1 AND question_key = 'death_date'`, [cid]);
    await t.pool.query(`UPDATE member_kyc_profiles SET name_ciphertext = 'enc:v1:garbage' WHERE member_id = $1`, [asha]);
    const { out } = await section(p, cid, randomUUID());
    const ping = out?.status === 'present' ? out.transcript.pings[0]! : null;
    expect(ping?.responderName).toEqual({ status: 'unavailable' });
    expect(ping?.reply?.answers.find((x) => x.questionKey === 'death_date')?.value).toEqual({ kind: 'unavailable' });
  });

  it('PM25 (c) — ⛔ section (the field ABSENT) for an actor holding an UN-completed assignment; another actor still sees it', async () => {
    const p = randomUUID();
    const asha = await seedNeighbour(p, 'Asha Devi', '+919876543210');
    const { cid } = await seedClaimWithPings(p, [asha], [true]);
    const inspector = `inspector-${randomUUID()}`;
    await t.pool.query(
      `INSERT INTO claim_ground_inspections (ground_inspection_id, claim_case_id, pariwar_id, district, inspection_stage, inspection_site_type,
         inspector_actor_id, scheduled_at, status)
       VALUES ($1, $2, $3, 'Patna', 'initial', 'family_residence', $4, now(), 'scheduled')`,
      [randomUUID(), cid, p, inspector],
    );
    const hidden = await section(p, cid, inspector);
    expect(hidden.out).toBeUndefined();
    expect(hidden.booked).toBe(1); // ⛔ further read — ⛔ a count, ⛔ a name reaches the inspector
    expect((await section(p, cid, randomUUID())).out?.status).toBe('present');
    // (a completed `certificate_check` alone vs a completed full visit — `peer-mesh-reply.spec.ts`, the domain predicate)
  });
});
