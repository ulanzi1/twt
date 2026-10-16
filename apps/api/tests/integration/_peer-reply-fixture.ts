// Story 6.27b (Task 1b) — the SHARED API fixture for neighbours' answers, LIFTED from 6.27a's
// `claims/peer-answers-console.spec.ts` (⛔ never a copy per spec): a neighbour member (name + mobile, real encryption),
// a selection and pings on an EXISTING claim (`attachPings` — the every-approver worlds are already at later states), the
// composed `seedClaimWithPings` (mints its own claim, `null` → `verification_in_progress`), and the REAL member PUT route
// (`put`) — so the date's three indexes are built by the REAL index helper (`deathDateBlindIndex`) with the SAME Pariwar
// key the certificate fixture uses.

import { randomUUID } from 'node:crypto';

import { claim, encryption, ids } from '@twt/domain';
import type { FastifyInstance } from 'fastify';
import type pg from 'pg';
import { expect } from 'vitest';

import type { AppDeps } from '../../src/context.js';
import { signAccessToken } from '../../src/modules/auth/member/tokens.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';

type Json = Record<string, unknown>;

export interface PeerFixtureEnv {
  readonly pool: pg.Pool;
  readonly deps: AppDeps;
  readonly app: FastifyInstance;
}

/** A neighbour member: a KYC name and a mobile, both under the REAL encryption. */
export async function seedNeighbour(env: PeerFixtureEnv, pariwarId: string, name: string, mobile: string): Promise<string> {
  const memberId = randomUUID();
  await env.pool.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
  await env.pool.query(
    `INSERT INTO member_kyc_profiles (member_id, pariwar_id, name_ciphertext, dob_ciphertext, verification_strength, source)
     VALUES ($1, $2, $3, $4, 'self_declared', 'manual')`,
    [
      memberId,
      pariwarId,
      await encryption.encryptKycField(name, pariwarId, env.deps.encryption),
      await encryption.encryptKycField('1970-01-01', pariwarId, env.deps.encryption),
    ],
  );
  await env.pool.query(`INSERT INTO member_identities (member_id, pariwar_id, mobile_ciphertext, mobile_blind_index) VALUES ($1, $2, $3, $4)`, [
    memberId,
    pariwarId,
    await encryption.encryptMobile(mobile, env.deps.encryption),
    `bi-${randomUUID()}`,
  ]);
  return memberId;
}

/**
 * The ONE selection of an EXISTING claim and a ping per neighbour — TEXTED where `texted[i]` (`send_outcome = 'accepted'`).
 * ⭐ Story 6.36 — `workplace` given ⇒ a `workplace_named_v1` selection with that `source` (on the selection AND every ping)
 * and the staff line; omitted ⇒ the legacy metric id `'m'` with NULLs (as before).
 */
export async function attachPings(
  env: PeerFixtureEnv,
  pariwarId: string,
  claimCaseId: string,
  deceasedMemberId: string,
  neighbours: readonly string[],
  texted: readonly boolean[],
  workplace?: { source: 'workplace' | 'named_by_member'; recentChangeBeforeFiling: boolean },
): Promise<string[]> {
  const selectionId = randomUUID();
  if (workplace) {
    await env.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at, source, previous_workplace_counted,
         recent_change_before_filing, ranked_member_ids)
       VALUES ($1, $2, $3, $4, now(), 'workplace_named_v1', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours', $6, false, $7, $5::uuid[])`,
      [selectionId, claimCaseId, pariwarId, deceasedMemberId, neighbours, workplace.source, workplace.recentChangeBeforeFiling],
    );
  } else {
    await env.pool.query(
      `INSERT INTO claim_peer_mesh_selections (selection_id, claim_case_id, pariwar_id, deceased_member_id, deceased_created_at, metric_id,
         metric_version, selected_member_ids, candidate_snapshot, response_window_expires_at)
       VALUES ($1, $2, $3, $4, now(), 'm', 1, $5::uuid[], '[]'::jsonb, now() + interval '72 hours')`,
      [selectionId, claimCaseId, pariwarId, deceasedMemberId, neighbours],
    );
  }
  const pingIds: string[] = [];
  for (const [i, m] of neighbours.entries()) {
    const pingId = randomUUID();
    pingIds.push(pingId);
    await env.pool.query(`INSERT INTO claim_peer_mesh_pings (ping_id, selection_id, pariwar_id, member_id, source) VALUES ($1, $2, $3, $4, $5)`, [
      pingId,
      selectionId,
      pariwarId,
      m,
      workplace?.source ?? null,
    ]);
    if (texted[i]) {
      await env.pool.query(
        `UPDATE claim_peer_mesh_pings SET send_outcome = 'accepted', attempt_count = 1, send_updated_at = clock_timestamp() WHERE ping_id = $1`,
        [pingId],
      );
    }
  }
  return pingIds;
}

/** A claim of a fresh death driven `null` → `verification_in_progress` (own transaction), then `attachPings`. */
export async function seedClaimWithPings(env: PeerFixtureEnv, pariwarId: string, neighbours: readonly string[], texted: readonly boolean[]) {
  const deceased = ids.memberId(randomUUID());
  const cid = ids.claimId(randomUUID());
  const scopeTx = await openScopeTx(env.deps, pariwarId);
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
  const pingIds = await attachPings(env, pariwarId, cid, deceased, neighbours, texted);
  return { cid, deceased, pingIds };
}

/** The neighbour saves ONE answer through the REAL member route (real encryption + the date's three indexes). */
export async function put(env: PeerFixtureEnv, p: string, m: string, ping: string, key: string, value: Json): Promise<void> {
  const tok = signAccessToken(env.app, { memberId: m, pariwarId: p, deviceId: 'd' }, 15 * 60 * 1000);
  const res = await env.app.inject({
    method: 'PUT',
    url: `/api/v1/p/${p}/member/peer-requests/${ping}/answers/${key}`,
    headers: { authorization: `Bearer ${tok}`, origin: 'http://localhost:3001', 'idempotency-key': randomUUID() },
    payload: { value },
  });
  expect(res.statusCode, res.body).toBe(200);
}
