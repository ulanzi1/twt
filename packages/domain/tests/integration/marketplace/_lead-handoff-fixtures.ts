// Shared fixtures for the Story 12.5 lead-handoff live-DB specs. Every seed runs AS THE SESSION USER (the superuser — RLS-exempt,
// grants-exempt) inside the per-test transaction (setupLiveDb's ROLLBACK reverts it), BEFORE a spec steps into `twt_app`.
// A state the commands cannot reach (a row on attempt 7, a `held_since` 25 h old) is seeded by a raw INSERT of a LEGAL row —
// ⛔ ALTERing the table, ⛔ disabling the guard ([[project_test_only_ddl_use_pg_temp_clone]]).

import { randomUUID } from 'node:crypto';

import type pg from 'pg';
import { expect } from 'vitest';

import { serializeEnvelope } from '../../../src/encryption/envelope.js';
import { RAW_INSERT_SQL, rawInsertParams, seedPartner } from './_fixtures.js';

/** The ids one handoff needs. */
export interface HandoffWorld {
  readonly pariwarId: string;
  readonly partnerId: string;
  readonly moduleId: string;
  readonly memberId: string;
  readonly leadId: string;
  readonly consentId: string;
}

/** Insert a module row AS THE SUPERUSER under the projector's guard (the 12.1 raw-insert shape). */
export async function seedModule(
  client: pg.PoolClient,
  pariwarId: string,
  partnerId: string,
  o: { state?: 'active' | 'archived'; reason?: string | null } = {},
): Promise<string> {
  const id = randomUUID();
  await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
  // The genesis is `draft` / version 1 (12.1 I3); each later state is a guarded UPDATE with a strictly higher version.
  await client.query(RAW_INSERT_SQL, rawInsertParams(id, pariwarId, { partnerId }));
  await client.query(`UPDATE marketplace_modules SET current_state = 'active', state_event_version = 2 WHERE module_id = $1`, [id]);
  if (o.state === 'archived') {
    await archiveModuleRow(client, id, o.reason ?? 'trustee_archived');
  }
  await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
  return id;
}

/** Archive a seeded module (the guarded UPDATE the projector would issue), with `reason`. */
export async function archiveModuleRow(client: pg.PoolClient, moduleId: string, reason: string): Promise<void> {
  await client.query("SET LOCAL app.marketplace_module_state_writer = 'on'");
  await client.query(
    `UPDATE marketplace_modules SET current_state = 'archived', archive_reason = $2::marketplace_module_archive_reason,
            state_event_version = state_event_version + 1
      WHERE module_id = $1`,
    [moduleId, reason],
  );
  await client.query("SET LOCAL app.marketplace_module_state_writer = 'off'");
}

/** Insert a `members` row directly (the `seedMember` shape). */
export async function seedMemberRow(client: pg.PoolClient, pariwarId: string, memberId: string = randomUUID()): Promise<string> {
  await client.query(`INSERT INTO members (member_id, pariwar_id, state, state_event_version) VALUES ($1, $2, 'active', 1)`, [memberId, pariwarId]);
  return memberId;
}

/** Insert one `module_lead_handoff` consent row directly (⛔ audit linkage — a consumer concern). */
export async function seedLeadConsent(
  client: pg.PoolClient,
  pariwarId: string,
  o: { subjectId: string; artifactRef: string | null; consentType?: string; revoked?: boolean },
): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO consent_records (consent_id, subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload,
                                  granted_at, revoked_at)
     VALUES ($1, $2, $3, $4::consent_type, $5, 'member_self', '{}', now() - interval '1 minute',
             CASE WHEN $6 THEN now() ELSE NULL END)`,
    [id, o.subjectId, pariwarId, o.consentType ?? 'module_lead_handoff', o.artifactRef, o.revoked === true],
  );
  return id;
}

/** A partner, an ACTIVE module, a member and a `module_lead_handoff` consent for a fresh lead — the parents of one handoff. */
export async function seedHandoffWorld(client: pg.PoolClient, pariwarId: string): Promise<HandoffWorld> {
  const partnerId = await seedPartner(client, pariwarId);
  const moduleId = await seedModule(client, pariwarId, partnerId);
  const memberId = await seedMemberRow(client, pariwarId);
  const leadId = randomUUID();
  const consentId = await seedLeadConsent(client, pariwarId, { subjectId: memberId, artifactRef: leadId });
  return { pariwarId, partnerId, moduleId, memberId, leadId, consentId };
}

/**
 * A well-formed envelope that opens to nothing (the sweep is what decrypts one; the schema and command specs never do). It parses, so
 * `recordLeadHandoff`'s shape check passes.
 */
export const SEALED_PLACEHOLDER = serializeEnvelope({
  kekRef: 'projects/p/locations/l/keyRings/r/cryptoKeys/k',
  encryptedDek: new Uint8Array([1]),
  iv: new Uint8Array(12).fill(2),
  ciphertext: new Uint8Array([3]),
  authTag: new Uint8Array(16).fill(4),
  aadShape: 'v1',
});

/**
 * A raw INSERT of a LEGAL handoff row for `w`, every column settable (the superuser bypasses the column grant). Defaults: a fresh `due`
 * row holding a placeholder ciphertext, its `next_attempt_at` a century ago so a claim in the same transaction reaches it FIRST (a
 * committed foreign row cannot outrank it).
 */
export async function insertHandoffRaw(
  client: pg.PoolClient,
  w: HandoffWorld,
  o: Partial<{
    status: string;
    outcomeDetail: string | null;
    attemptCount: number;
    ciphertext: string | null;
    claimToken: string | null;
    claimedAtSql: string;
    heldSinceSql: string;
    deliveredAtSql: string;
    updatedAtSql: string;
    nextAttemptAtSql: string;
    partnerReference: string | null;
  }> = {},
): Promise<void> {
  const status = o.status ?? 'due';
  const attempting = status === 'attempting';
  await client.query(
    `INSERT INTO marketplace_lead_handoffs
       (lead_id, pariwar_id, module_id, member_id, consent_id, envelope_version, member_fields_ciphertext, status, outcome_detail,
        attempt_count, next_attempt_at, claim_token, claimed_at, held_since, delivered_at, audit_id, updated_at, partner_reference)
     VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8, $9, ${o.nextAttemptAtSql ?? "now() - interval '100 years'"}, $10,
             ${attempting ? (o.claimedAtSql ?? 'now()') : 'NULL'}, ${o.heldSinceSql ?? 'NULL'},
             ${status === 'delivered' ? (o.deliveredAtSql ?? 'now()') : 'NULL'}, $11, ${o.updatedAtSql ?? 'now()'}, $12)`,
    [
      w.leadId,
      w.pariwarId,
      w.moduleId,
      w.memberId,
      w.consentId,
      o.ciphertext === undefined ? SEALED_PLACEHOLDER : o.ciphertext,
      status,
      o.outcomeDetail ?? null,
      o.attemptCount ?? 0,
      attempting ? (o.claimToken ?? randomUUID()) : (o.claimToken ?? null),
      randomUUID(),
      o.partnerReference ?? null,
    ],
  );
}

/** The row, raw. */
export async function handoffRow(client: pg.PoolClient, leadId: string): Promise<Record<string, unknown>> {
  const { rows } = await client.query('SELECT * FROM marketplace_lead_handoffs WHERE lead_id = $1', [leadId]);
  expect(rows).toHaveLength(1);
  return rows[0] as Record<string, unknown>;
}

/**
 * Run `text` inside a savepoint and assert it is refused with `code` — and, when given, a message that CONTAINS `message` (the guard's
 * own words) or a named constraint. The savepoint is rolled back so the test's transaction stays usable.
 */
export async function expectRefused(
  client: pg.PoolClient,
  text: string,
  params: unknown[],
  code: string,
  o: { message?: string; constraint?: string } = {},
): Promise<void> {
  await client.query('SAVEPOINT expect_refused');
  let caught: { code?: string; message?: string; constraint?: string } | null = null;
  try {
    await client.query(text, params);
  } catch (e) {
    caught = e as { code?: string; message?: string; constraint?: string };
  }
  await client.query('ROLLBACK TO SAVEPOINT expect_refused');
  await client.query('RELEASE SAVEPOINT expect_refused');
  expect(caught, `expected ${code} from: ${text}`).not.toBeNull();
  expect(caught!.code).toBe(code);
  if (o.message !== undefined) expect(caught!.message).toContain(o.message);
  if (o.constraint !== undefined) expect(caught!.constraint).toBe(o.constraint);
}
