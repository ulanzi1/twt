// Story 13.1 (AC3; QE6, QE7, QE12, QE17, QE18, QE20; I7, I8) — the payload schemas (seven; Story 13.1f adds the eighth, the undo). DB-free.

import { describe, expect, it } from 'vitest';

import {
  FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS,
  FIELD_WORKER_EVENT_TYPES,
  FieldWorkerAuthorizationSnapshotSchema,
  FieldWorkerEndingUndonePayloadSchema,
  FieldWorkerPostedPayloadSchema,
  FieldWorkerRegisteredPayloadSchema,
  FieldWorkerTerminatedPayloadSchema,
  isCalendarDateString,
} from '../../src/field-worker/events.js';

const AUTH = {
  permission_key: 'field_worker.register',
  role: 'district_admin',
  grant: { dimension: 'district', value: 'Patna', grant_id: '33333333-3333-4333-8333-333333333333' },
  target: { dimension: 'district', value: 'Patna' },
  catalog_version: 59,
};
/** Story 13.1a AD3 — the approval's snapshot (a pariwar_admin grant, key `field_worker.approve`). */
const APPROVE_AUTH = {
  permission_key: 'field_worker.approve',
  role: 'pariwar_admin',
  grant: { dimension: 'pariwar', value: '11111111-1111-4111-8111-111111111111' },
  target: { dimension: 'district', value: 'Patna' },
  catalog_version: 60,
};
/** Story 13.1c AD3 / AD4 — a lifecycle act's snapshot (key = the act's; the move's is `field_worker.move`). */
const actAuth = (permission_key: string) => ({ ...APPROVE_AUTH, permission_key, catalog_version: 62 });
/** `o` without `key` (a payload missing one required field). */
const without = (o: Record<string, unknown>, key: string): Record<string, unknown> => Object.fromEntries(Object.entries(o).filter(([k]) => k !== key));

const VALID: Record<(typeof FIELD_WORKER_EVENT_TYPES)[number], Record<string, unknown>> = {
  'field_worker.registered': { from_state: null, to_state: 'pending_kyc', trigger: 'field_worker.register', actor: 'operator', authorization: AUTH, district: 'Patna' },
  'field_worker.kyc_completed': { from_state: 'pending_kyc', to_state: 'pending_kyc', trigger: 'field_worker.kyc_complete', actor: 'operator', authorization: APPROVE_AUTH },
  'field_worker.activated': { from_state: 'pending_kyc', to_state: 'active', trigger: 'field_worker.activate', actor: 'trustee', authorization: APPROVE_AUTH },
  'field_worker.suspended': { from_state: 'active', to_state: 'suspended', trigger: 'field_worker.suspend:under_review', actor: 'operator', authorization: actAuth('field_worker.suspend'), reason_code: 'under_review' },
  'field_worker.reactivated': { from_state: 'suspended', to_state: 'active', trigger: 'field_worker.reactivate', actor: 'operator', authorization: actAuth('field_worker.reactivate') },
  'field_worker.terminated': { from_state: 'active', to_state: 'terminated', trigger: 'field_worker.terminate:inactive', actor: 'operator', authorization: actAuth('field_worker.terminate'), reason_code: 'inactive', ended_on: '2026-11-01' },
  'field_worker.posted': { from_state: 'active', to_state: 'active', trigger: 'field_worker.post', actor: 'operator', authorization: actAuth('field_worker.move'), from_district: 'Patna', to_district: 'Gaya', reason_code: 'reassigned' },
  'field_worker.ending_undone': { from_state: 'terminated', to_state: 'active', trigger: 'field_worker.undo_ending:mistake', actor: 'operator', authorization: actAuth('field_worker.undo_ending'), cause: 'mistake', appeal_id: null, undone_ending_version: 4, reason_code: null },
};

/** Story 13.1f (AD15, R2-D1) — the ONE key each event's snapshot is pinned to. */
const KEY_OF: Record<(typeof FIELD_WORKER_EVENT_TYPES)[number], string> = {
  'field_worker.registered': 'field_worker.register',
  'field_worker.kyc_completed': 'field_worker.approve',
  'field_worker.activated': 'field_worker.approve',
  'field_worker.suspended': 'field_worker.suspend',
  'field_worker.reactivated': 'field_worker.reactivate',
  'field_worker.terminated': 'field_worker.terminate',
  'field_worker.posted': 'field_worker.move',
  'field_worker.ending_undone': 'field_worker.undo_ending',
};

describe('the eight payloads (AC3; Story 13.1f adds the undo)', () => {
  it('EIGHT types, one schema each; every valid example parses', () => {
    expect(FIELD_WORKER_EVENT_TYPES).toHaveLength(8);
    for (const t of FIELD_WORKER_EVENT_TYPES) expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse(VALID[t]).success, t).toBe(true);
  });

  it('single-dot snake_case — ⛔ the epic’s `kyc-completed` (G8)', () => {
    for (const t of FIELD_WORKER_EVENT_TYPES) expect(t).toMatch(/^field_worker\.[a-z_]+$/);
  });

  it('I8: `.strict()` — NO payload can carry a name or a mobile key (nor any unknown key)', () => {
    for (const t of FIELD_WORKER_EVENT_TYPES) {
      for (const key of ['name', 'mobile', 'name_ciphertext', 'mobile_ciphertext', 'mobile_blind_index', 'phone', 'pariwar_id', 'field_worker_id']) {
        expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], [key]: 'x' }).success, `${t} + ${key}`).toBe(false);
      }
    }
  });

  // Review R3-16 — `trigger` is ⛔ free text: each type takes exactly its command's value (QE6), a reason suffix only from its own list.
  it('I8 / QE6: `trigger` is the command’s computed value — free text, another type’s value or a reason from another list is refused', () => {
    const refused: ReadonlyArray<readonly [(typeof FIELD_WORKER_EVENT_TYPES)[number], string]> = [
      ['field_worker.registered', 'Vikram Kumar registered by phone'],
      ['field_worker.kyc_completed', 'field_worker.activate'],
      ['field_worker.activated', 'field_worker.activate '],
      ['field_worker.suspended', 'field_worker.suspend:Ramesh asked'],
      ['field_worker.suspended', 'field_worker.suspend:inactive'], // a TERMINATION reason
      ['field_worker.suspended', 'field_worker.suspend'],
      ['field_worker.reactivated', 't'],
      ['field_worker.terminated', 'field_worker.terminate:under_review'], // a SUSPENSION reason
      ['field_worker.posted', 'field_worker.post:reassigned'],
      ['field_worker.ending_undone', 'field_worker.undo_ending:appeal_allowed'], // the trigger names the cause (`mistake` here)
      ['field_worker.ending_undone', 'field_worker.undo_ending'],
    ];
    for (const [t, trigger] of refused) {
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], trigger }).success, `${t} ${trigger}`).toBe(false);
    }
    for (const r of ['under_review', 'at_worker_request']) {
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS['field_worker.suspended'].safeParse({ ...VALID['field_worker.suspended'], trigger: `field_worker.suspend:${r}`, reason_code: r }).success, r).toBe(true);
    }
  });

  it('I7: human actors only — `system` and `member` are refused on ALL eight', () => {
    for (const t of FIELD_WORKER_EVENT_TYPES) {
      for (const actor of ['system', 'member']) expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], actor }).success, `${t} ${actor}`).toBe(false);
    }
  });

  it('QE12: each reason list is its own — `reassigned` is not a suspension reason, `under_review` not a termination one, a post needs a reason', () => {
    expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS['field_worker.suspended'].safeParse({ ...VALID['field_worker.suspended'], reason_code: 'reassigned' }).success).toBe(false);
    expect(FieldWorkerTerminatedPayloadSchema.safeParse({ ...VALID['field_worker.terminated'], reason_code: 'under_review' }).success).toBe(false);
    expect(FieldWorkerPostedPayloadSchema.safeParse(without(VALID['field_worker.posted'], 'reason_code')).success).toBe(false);
    expect(FieldWorkerPostedPayloadSchema.safeParse({ ...VALID['field_worker.posted'], reason_code: 'at_worker_request' }).success).toBe(true);
    // Story 13.1d (13.1c R2-D1) — the snapshot's key is PINNED to the move-key list: the acceptance's key passes, any other fails.
    expect(FieldWorkerPostedPayloadSchema.safeParse({ ...VALID['field_worker.posted'], authorization: actAuth('field_worker.answer_move_request') }).success).toBe(true);
    for (const key of ['field_worker.register', 'field_worker.request_move', 'field_worker.suspend', 'member.view']) {
      expect(FieldWorkerPostedPayloadSchema.safeParse({ ...VALID['field_worker.posted'], authorization: actAuth(key) }).success, key).toBe(false);
    }
    expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS['field_worker.activated'].safeParse({ ...VALID['field_worker.activated'], reason_code: 'inactive' }).success).toBe(false);
  });

  it('QE17: a posting never changes the state and always changes the district', () => {
    expect(FieldWorkerPostedPayloadSchema.safeParse({ ...VALID['field_worker.posted'], to_state: 'suspended' }).success).toBe(false);
    expect(FieldWorkerPostedPayloadSchema.safeParse({ ...VALID['field_worker.posted'], to_district: 'Patna' }).success).toBe(false);
    expect(FieldWorkerPostedPayloadSchema.safeParse({ ...VALID['field_worker.posted'], from_state: 'terminated', to_state: 'terminated' }).success).toBe(false);
  });

  it('QE20: ended_on is a REAL YYYY-MM-DD date', () => {
    for (const bad of ['2026-02-30', '2026-13-01', '26-11-01', '2026-11-1', '2026-11-01T00:00:00Z', '']) {
      expect(isCalendarDateString(bad), bad).toBe(false);
      expect(FieldWorkerTerminatedPayloadSchema.safeParse({ ...VALID['field_worker.terminated'], ended_on: bad }).success, bad).toBe(false);
    }
    for (const good of ['2024-02-29', '2026-11-01', '2026-12-31']) expect(isCalendarDateString(good), good).toBe(true);
  });

  // Story 13.1a AD3 — the approval's two events now REQUIRE the snapshot (13.1 QE18's "other five events when their routes are built").
  it('kyc_completed and activated REQUIRE the authorization snapshot; ⛔ an approver name key in the payload', () => {
    for (const t of ['field_worker.kyc_completed', 'field_worker.activated'] as const) {
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse(without(VALID[t], 'authorization')).success, t).toBe(false);
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], approved_by_display: 'Meera' }).success, t).toBe(false);
    }
  });

  // Story 13.1c AD3 — the last three events REQUIRE it too: every field-worker event now records which authorization allowed it (`-443` Q3 A).
  it('suspended, reactivated and terminated REQUIRE the authorization snapshot (13.1c AD3)', () => {
    for (const t of ['field_worker.suspended', 'field_worker.reactivated', 'field_worker.terminated'] as const) {
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse(VALID[t]).success, t).toBe(true);
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse(without(VALID[t], 'authorization')).success, t).toBe(false);
      // CONTROL — the same snapshot without the stray key parses, so the refusal below is the extra `display_name` and nothing else (review CR6).
      // Story 13.1f (AD15, TR10): RE-KEYED to the event's own pinned key (the control must still parse) — ⛔ inverted.
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], authorization: actAuth(KEY_OF[t]) }).success, t).toBe(true);
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], authorization: { ...actAuth(KEY_OF[t]), display_name: 'Meera' } }).success, t).toBe(false);
    }
  });

  it('`died` (`-455`) is a termination reason with its trigger; ⛔ a suspension reason', () => {
    expect(FieldWorkerTerminatedPayloadSchema.safeParse({ ...VALID['field_worker.terminated'], reason_code: 'died', trigger: 'field_worker.terminate:died' }).success).toBe(true);
    expect(
      FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS['field_worker.suspended'].safeParse({ ...VALID['field_worker.suspended'], reason_code: 'died', trigger: 'field_worker.suspend:died' }).success,
    ).toBe(false);
  });

  it('the genesis carries a non-blank district and the authorization snapshot', () => {
    expect(FieldWorkerRegisteredPayloadSchema.safeParse({ ...VALID['field_worker.registered'], district: '  ' }).success).toBe(false);
    expect(FieldWorkerRegisteredPayloadSchema.safeParse(without(VALID['field_worker.registered'], 'authorization')).success).toBe(false);
  });
});

describe('the authorization snapshot (QE18, AC3)', () => {
  it('is `.strict()` and carries NO personal data, no Pariwar and no actor key', () => {
    for (const key of ['pariwar_id', 'actor_id', 'name', 'mobile', 'display_name']) {
      expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, [key]: 'x' }).success, key).toBe(false);
    }
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, grant: { ...AUTH.grant, user_id: 'x' } }).success).toBe(false);
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, target: { ...AUTH.target, extra: 1 } }).success).toBe(false);
  });

  it('grant.value is null IFF the grant is global (a super_admin grant parses — else AC8’s super_admin leg is a 500)', () => {
    const globalGrant = { ...AUTH, role: 'super_admin', grant: { dimension: 'global', value: null } };
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse(globalGrant).success).toBe(true);
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, grant: { dimension: 'global', value: 'x' } }).success).toBe(false);
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, grant: { dimension: 'district', value: null } }).success).toBe(false);
  });

  it('target.value is a non-null string; grant_id is a uuid and optional', () => {
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, target: { dimension: 'district', value: null } }).success).toBe(false);
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, grant: { ...AUTH.grant, grant_id: 'not-a-uuid' } }).success).toBe(false);
    expect(FieldWorkerAuthorizationSnapshotSchema.safeParse({ ...AUTH, grant: { dimension: 'district', value: 'Patna' } }).success).toBe(true);
  });
});

// Story 13.1f (AD15 — 13.1c R2-D1 answered) — EVERY worker event pins its snapshot's key: a snapshot signed with any other key is refused.
describe('every event pins its key (AD15, R2-D1)', () => {
  it('a snapshot of another key — the stray `x`, a sibling act, a member key — is refused on all eight; its own key parses', () => {
    for (const t of FIELD_WORKER_EVENT_TYPES) {
      const auth = (VALID[t]['authorization'] ?? {}) as Record<string, unknown>;
      expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], authorization: { ...auth, permission_key: KEY_OF[t] } }).success, `${t} own`).toBe(true);
      for (const key of ['x', 'member.view', t === 'field_worker.terminated' ? 'field_worker.suspend' : 'field_worker.terminate']) {
        expect(FIELD_WORKER_EVENT_PAYLOAD_SCHEMAS[t].safeParse({ ...VALID[t], authorization: { ...auth, permission_key: key } }).success, `${t} ${key}`).toBe(false);
      }
    }
  });
});

// Story 13.1f (AD2; AC1 (i)) — the undo's payload.
describe('field_worker.ending_undone (AD2)', () => {
  const ok = VALID['field_worker.ending_undone'];
  const APPEAL = '44444444-4444-4444-8444-444444444444';
  const allowed = (key: string) => ({ ...ok, trigger: 'field_worker.undo_ending:appeal_allowed', cause: 'appeal_allowed', appeal_id: APPEAL, authorization: actAuth(key) });

  it('a control per cause parses: a slip under undo_ending; an allowed appeal under EITHER hear key', () => {
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse(ok).success).toBe(true);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse(allowed('field_worker.hear_ending_appeal')).success).toBe(true);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse(allowed('field_worker.hear_ending_appeal_as_panel')).success).toBe(true);
  });

  it('refuses each wrong cause–key pairing: mistake + a hear key; appeal_allowed + undo_ending; appeal_allowed with no appeal; mistake WITH an appeal', () => {
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, authorization: actAuth('field_worker.hear_ending_appeal') }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse(allowed('field_worker.undo_ending')).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...allowed('field_worker.hear_ending_appeal'), appeal_id: null }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, appeal_id: APPEAL }).success).toBe(false);
  });

  it('the restored reason is present IFF the target is suspended (a suspension reason only); the target is never terminated', () => {
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, to_state: 'suspended', reason_code: 'under_review' }).success).toBe(true);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, to_state: 'suspended', reason_code: null }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, to_state: 'active', reason_code: 'under_review' }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, to_state: 'suspended', reason_code: 'inactive' }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, to_state: 'terminated' }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, from_state: 'active' }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, to_state: 'pending_kyc' }).success).toBe(true);
  });

  it('names the undone ending (a version >= 2 — the genesis is never an ending)', () => {
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse({ ...ok, undone_ending_version: 1 }).success).toBe(false);
    expect(FieldWorkerEndingUndonePayloadSchema.safeParse(without(ok, 'undone_ending_version')).success).toBe(false);
  });
});

// Story 13.1f (AD8, AD12) — the two optional keys on existing events.
describe('appeal_heard_by on terminated (AD8) and previous_field_worker_id on registered (AD12)', () => {
  it('appeal_heard_by is OPTIONAL in the schema (a legacy event parses) and one of the two hearers', () => {
    expect(FieldWorkerTerminatedPayloadSchema.safeParse(VALID['field_worker.terminated']).success).toBe(true);
    for (const h of ['pariwar_admin', 'trustee_panel']) {
      expect(FieldWorkerTerminatedPayloadSchema.safeParse({ ...VALID['field_worker.terminated'], appeal_heard_by: h }).success, h).toBe(true);
    }
    expect(FieldWorkerTerminatedPayloadSchema.safeParse({ ...VALID['field_worker.terminated'], appeal_heard_by: 'district_admin' }).success).toBe(false);
  });

  it('previous_field_worker_id is an optional uuid', () => {
    expect(FieldWorkerRegisteredPayloadSchema.safeParse({ ...VALID['field_worker.registered'], previous_field_worker_id: '55555555-5555-4555-8555-555555555555' }).success).toBe(true);
    expect(FieldWorkerRegisteredPayloadSchema.safeParse({ ...VALID['field_worker.registered'], previous_field_worker_id: 'Vikram' }).success).toBe(false);
  });
});
