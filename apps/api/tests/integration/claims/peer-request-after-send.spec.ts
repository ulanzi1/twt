// Story 6.27c (Task 5.3; AC7) — the member surface LIGHTS UP after a send, E2E on a live DB (:5433). 6.27a's home card, notice-strip
// item and list are ONE component fed by the list route (`PeerRequestEntry` — null until the list has items), so the route is the
// surface: before the send the neighbour's list is EMPTY and the request is the route's 404; after the REAL domain writers send it
// (`beginPeerMeshRequest` → COMMIT → `finalisePeerMeshRequest` accepted — the jobs child's two transactions) the list shows it with
// "asked on" = the send's IST date, the detail opens, and the texted link's code resolves to it.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids } from '@twt/domain';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { signAccessToken } from '../../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../../src/modules/multi-tenant/scope-tx.js';
import { createTestApp, hasDatabase, teardown, type TestApp } from '../_setup.js';

type Json = Record<string, unknown>;
const ORIGIN = 'http://localhost:3001';

describe.skipIf(!hasDatabase)('Story 6.27c — the member surface after a send (:5433)', { timeout: 30000 }, () => {
  let t: TestApp;

  beforeAll(async () => {
    t = await createTestApp();
  });
  afterAll(async () => {
    await teardown(t);
  });

  async function onScope<T>(pariwarId: string, fn: (s: Awaited<ReturnType<typeof openScopeTx>>) => Promise<T>): Promise<T> {
    const s = await openScopeTx(t.deps, pariwarId);
    try {
      const out = await fn(s);
      await closeScopeTx(s, true);
      return out;
    } catch (err) {
      await closeScopeTx(s, false);
      throw err;
    }
  }

  async function call(method: 'GET', url: string, tok: string) {
    const res = await t.app.inject({ method, url, headers: { origin: ORIGIN, authorization: `Bearer ${tok}` } });
    return { status: res.statusCode, body: res.json() as Json };
  }

  it('⭐ AC7 — ⛔ visible before the send; after it: in the list ("asked on" = the send date), the detail opens, the link resolves', async () => {
    const p = randomUUID();
    const neighbour = randomUUID();
    const deceased = ids.memberId(randomUUID());
    const cid = ids.claimId(randomUUID());
    // 📌 Story 6.35 — the begin resolves the recipient's language (LS8), which reads the passport. ⚠ This spec leaves its rows
    // behind (⛔ cleanup), so the passport must satisfy `BrandingBundle`: one `'{}'` row 500s every later
    // `GET /api/v1/provisioning/pariwars` on the same database (`pariwar-provisioning.spec.ts` — the 6.35 second review).
    await t.pool.query(
      `INSERT INTO pariwar_passport (pariwar_id, display_name_en, display_name_hi, legal_name, branding_bundle, locale_default)
       VALUES ($1, 'P', 'प', 'T', $2, 'hi')`,
      [p, JSON.stringify({ logo_url: 'https://x/l.png', primary_color: '#0A3D62', secondary_color: '#FFFFFF' })],
    );
    await t.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [neighbour, p]);
    await t.pool.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, 'enc:test:x', $3)`, [
      neighbour,
      p,
      `idx-${randomUUID()}`,
    ]);
    await onScope(p, async (s) => {
      const emit = (from: string | null, to: string, eventType: string, extra: Json = {}) =>
        claim.projectClaimState(s.client, {
          claimCaseId: cid,
          pariwarId: ids.pariwarId(p),
          deceasedMemberId: deceased,
          intakeChannels: ['helpline'],
          claimantActorId: null,
          eventType: eventType as never,
          payload: { from_state: from, to_state: to, trigger: 'seed', actor: 'system', ...extra },
          actorId: null,
        });
      await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: String(deceased), intake_channel: 'helpline', claimant_actor_id: null });
      await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
      await emit('intake_converged', 'documents_pending', 'claim.documents_received');
      await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', { selected_member_ids: [neighbour], metric_id: 'm', metric_version: 1 });
    });
    const selectionId = randomUUID();
    const pingId = randomUUID();
    await t.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, ARRAY[$5]::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, cid, p, deceased, neighbour],
    );
    await t.pool.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id) VALUES ($1, $2, $3, $4)`, [pingId, selectionId, p, neighbour]);
    const tok = signAccessToken(t.app, { memberId: neighbour, pariwarId: p, deviceId: 'test-device' }, 15 * 60 * 1000);
    const base = `/api/v1/p/${p}/member/peer-requests`;

    // ⛔ texted yet: the list is empty (the home card / strip render nothing) and the request is the route's 404.
    expect((await call('GET', `${base}?limit=5`, tok)).body).toEqual({ items: [] });
    expect((await call('GET', `${base}/${pingId}`, tok)).status).toBe(404);

    // THE SEND — the jobs child's two transactions, on the REAL domain writers (the gateway's accept stands in between).
    const begun = await onScope(p, (s) =>
      claim.beginPeerMeshRequest(s.client, {
        pariwarId: ids.pariwarId(p),
        claimCaseId: cid,
        pingId: ids.peerMeshPingId(pingId),
        jobId: 'job-1',
        now: new Date(),
        nameFault: null,
        unusableLocales: [],
        nomineeMatch: { mobileIndexes: [], memberIds: [] }, // Story 6.36d / 6.36e — the deceased declared ⛔ nominee here
      }),
    );
    expect(begun.kind).toBe('begun');
    if (begun.kind !== 'begun') return;
    // `attempting` is ⛔ yet texted — still invisible
    expect((await call('GET', `${base}?limit=5`, tok)).body).toEqual({ items: [] });
    // …and its link resolves to ⛔ ping yet — the ONE 404 (review round 2 P13: on the REAL writers' row, ⛔ a hand-built one)
    expect((await call('GET', `${base}/by-link/${begun.linkCode}`, tok)).status).toBe(404);
    expect(
      await onScope(p, (s) =>
        claim.finalisePeerMeshRequest(s.tx, {
          pariwarId: ids.pariwarId(p),
          pingId: ids.peerMeshPingId(pingId),
          jobId: 'job-1',
          outcome: 'accepted',
          providerMessageId: 'gw-1',
          recipientNumberHash: 'h',
        }),
      ),
    ).toBe(true);
    const sentAt = (await t.pool.query<{ send_updated_at: Date }>(`SELECT send_updated_at FROM claim_peer_mesh_pings WHERE ping_id = $1`, [pingId])).rows[0]!
      .send_updated_at;

    const list = await call('GET', `${base}?limit=5`, tok);
    expect(list.status).toBe(200);
    expect(list.body['items']).toEqual([expect.objectContaining({ pingId, askedOn: cycleCalendar.istDateOf(sentAt) })]);
    const detail = await call('GET', `${base}/${pingId}`, tok);
    expect(detail.status).toBe(200);
    expect(detail.body['pingId']).toBe(pingId);
    expect((await call('GET', `${base}/by-link/${begun.linkCode}`, tok)).body).toEqual({ pingId });
  });
});
