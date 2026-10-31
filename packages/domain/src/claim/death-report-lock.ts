// "A death is reported" for a WRITE on the member's own record — Story 6.38 (N9, DL18, DL19; `2026-10-31-424` Q2 (a) / (b)).
//
// The 6.20 D3 shape (`nominee-lock.ts` `lockNomineeDeclarationForEdit`), for every other after-death lock: take the claim
// INTAKE key for `(pariwarId, memberId)` FIRST — the key every intake takes before it mints — and only then read the ONE
// predicate. A write and a first intake then serialise: an intake that wins makes the write see the claim and refuse; a write
// that wins lands legitimately "before the report". ⛔ Take ⛔ other advisory lock before this call (intake → anything else).
// Callers: withdrawal (`withdrawal.death_reported`), the Life Events guard (`life_events.death_reported`), the medical
// declaration (`medical.death_reported`).

import type pg from 'pg';

import { bindScopedDb } from '../db.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { isDeathReportStanding } from './death-report.js';
import { intakeAdvisoryLockKey } from './icp-lock.js';

/** Take the intake key, then answer "does a death report stand for this member?" — in the caller's transaction. */
export async function lockAndReadDeathReport(
  client: pg.PoolClient,
  pariwarId: PariwarId,
  memberId: MemberId,
): Promise<boolean> {
  await client.query('SELECT pg_advisory_xact_lock($1)', [intakeAdvisoryLockKey(pariwarId, memberId).toString()]);
  return isDeathReportStanding(bindScopedDb(client), pariwarId, memberId);
}
