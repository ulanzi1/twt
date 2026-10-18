// The DELIVERY LADDER's and the CALL RECORD's READS — Story 6.37c (Task 2; LD6, LD8, LD10, LD12). A LEAF: it imports
// only the schema and the pure rules, so the chase row readers (`readReturnFamilyRows`, `readClaimCertificateFamilyRows`)
// and the correction closure gate can read ladders without an import cycle ([[project_type_only_import_cycle_trap]] —
// ⛔ `correction-reminder-record.ts`, ⛔ `correction-closure.ts`, ⛔ `certificate-reminder*.ts` here).
// Tenant-scoped (`pariwar_id` explicit on every statement — T12). ⛔ Writes, ⛔ crypto.

import { and, asc, eq, inArray } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { ClaimId, PariwarId, TrusteeDecisionId } from '../ids/index.js';
import { claimContactCalls, type ClaimContactCallRow } from '../schema/claim_contact_calls.js';
import {
  claimContactLadders,
  type ClaimContactLadderRow,
  type ContactLadderChase,
} from '../schema/claim_contact_ladders.js';
import { claimCertificateReminders } from '../schema/claim_certificate_reminder.js';
import { claimCorrectionReminders, claimCorrectionRuns } from '../schema/claim_correction_chase.js';
import { smsSendDeliveries, type SmsDeliveryState } from '../schema/sms_send_deliveries.js';
import type { ConcludedLadderFact } from './contact-ladder.js';

/**
 * Every ladder of a claim in one chase (any state), oldest first. Correction ladders are filtered to a RETURN when
 * one is given (every correction reader keys on the live return).
 */
export async function readClaimLadders(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  chase: ContactLadderChase,
  returnDecisionId?: string,
): Promise<ClaimContactLadderRow[]> {
  return db
    .select()
    .from(claimContactLadders)
    .where(
      and(
        eq(claimContactLadders.pariwarId, pariwarId),
        eq(claimContactLadders.claimCaseId, claimCaseId),
        eq(claimContactLadders.chase, chase),
        ...(returnDecisionId === undefined ? [] : [eq(claimContactLadders.returnDecisionId, returnDecisionId)]),
      ),
    )
    .orderBy(asc(claimContactLadders.createdAt), asc(claimContactLadders.ladderId));
}

/** The CONCLUDED ladders of a claim in one chase (scoped to a return for correction) — the mapping's input (LD6). */
export async function readConcludedLadderFacts(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  chase: ContactLadderChase,
  returnDecisionId?: string,
): Promise<ConcludedLadderFact[]> {
  const rows = await db
    .select({
      personKey: claimContactLadders.personKey,
      recipientNumberHash: claimContactLadders.recipientNumberHash,
      originRowId: claimContactLadders.originRowId,
      concludedOn: claimContactLadders.concludedOn,
    })
    .from(claimContactLadders)
    .where(
      and(
        eq(claimContactLadders.pariwarId, pariwarId),
        eq(claimContactLadders.claimCaseId, claimCaseId),
        eq(claimContactLadders.chase, chase),
        eq(claimContactLadders.state, 'concluded_undelivered'),
        ...(returnDecisionId === undefined ? [] : [eq(claimContactLadders.returnDecisionId, returnDecisionId)]),
      ),
    );
  return rows.map((r) => ({ ...r, concludedOn: r.concludedOn! }));
}

/**
 * ⭐ LD8 / `-351` 6 A — is ANY correction ladder RUNNING for any person of the claim's live return? The closure gate's
 * `ladder_running` (a CERTIFICATE ladder holds ⛔ the correction closure — PQ2 A).
 */
export async function hasRunningCorrectionLadder(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  returnDecisionId: string,
): Promise<boolean> {
  const rows = await db
    .select({ ladderId: claimContactLadders.ladderId })
    .from(claimContactLadders)
    .where(
      and(
        eq(claimContactLadders.pariwarId, pariwarId),
        eq(claimContactLadders.claimCaseId, claimCaseId),
        eq(claimContactLadders.chase, 'correction'),
        eq(claimContactLadders.returnDecisionId, returnDecisionId),
        eq(claimContactLadders.state, 'running'),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/** A correction `ladder_sms` row of a return, with its delivery state (LD8's `reachedByLadderSms`, the ladder's ends). */
export interface ReturnLadderSmsRow {
  readonly reminderId: string;
  readonly runId: string;
  readonly recipientKey: string;
  readonly subjectKey: string;
  readonly sentOn: string;
  readonly outcome: string;
  readonly recipientNumberHash: string | null;
  readonly createdAt: Date;
  readonly deliveryState: SmsDeliveryState | null;
}

/**
 * Every correction `ladder_sms` row of the live return's runs (a ladder SMS keys on its origin's run, which is in the
 * return), with 6.37b's recorded delivery state — ⛔ `readReturnFamilyRows` widened (LD2: every `family_sms` reader
 * ignores a ladder SMS by construction; its reach is added on purpose, here).
 */
export async function readReturnLadderSmsRows(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  returnDecisionId: string,
): Promise<ReturnLadderSmsRow[]> {
  const rows = await db
    .select({
      reminderId: claimCorrectionReminders.reminderId,
      runId: claimCorrectionReminders.runId,
      recipientKey: claimCorrectionReminders.recipientKey,
      subjectKey: claimCorrectionReminders.subjectKey,
      sentOn: claimCorrectionReminders.sentOn,
      outcome: claimCorrectionReminders.outcome,
      recipientNumberHash: claimCorrectionReminders.recipientNumberHash,
      createdAt: claimCorrectionReminders.createdAt,
      deliveryState: smsSendDeliveries.deliveryState,
    })
    .from(claimCorrectionReminders)
    .innerJoin(
      claimCorrectionRuns,
      and(
        eq(claimCorrectionRuns.runId, claimCorrectionReminders.runId),
        eq(claimCorrectionRuns.pariwarId, claimCorrectionReminders.pariwarId),
      ),
    )
    .leftJoin(
      smsSendDeliveries,
      and(
        eq(smsSendDeliveries.sendKind, 'cr'),
        eq(smsSendDeliveries.sendRowId, claimCorrectionReminders.reminderId),
        eq(smsSendDeliveries.pariwarId, claimCorrectionReminders.pariwarId),
      ),
    )
    .where(
      and(
        eq(claimCorrectionReminders.pariwarId, pariwarId),
        eq(claimCorrectionReminders.claimCaseId, claimCaseId),
        eq(claimCorrectionReminders.purpose, 'ladder_sms'),
        eq(claimCorrectionRuns.returnDecisionId, returnDecisionId as TrusteeDecisionId),
      ),
    )
    .orderBy(asc(claimCorrectionReminders.sentOn), asc(claimCorrectionReminders.createdAt));
  return rows.map((r) => ({ ...r, deliveryState: r.deliveryState ?? null }));
}

/** Every certificate `ladder_sms` row of the claim (any run), with 6.37b's recorded delivery state (`ce`). */
export async function readClaimCertificateLadderSmsRows(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
): Promise<ReturnLadderSmsRow[]> {
  const rows = await db
    .select({
      reminderId: claimCertificateReminders.reminderId,
      runId: claimCertificateReminders.runId,
      recipientKey: claimCertificateReminders.recipientKey,
      subjectKey: claimCertificateReminders.subjectKey,
      sentOn: claimCertificateReminders.sentOn,
      outcome: claimCertificateReminders.outcome,
      recipientNumberHash: claimCertificateReminders.recipientNumberHash,
      createdAt: claimCertificateReminders.createdAt,
      deliveryState: smsSendDeliveries.deliveryState,
    })
    .from(claimCertificateReminders)
    .leftJoin(
      smsSendDeliveries,
      and(
        eq(smsSendDeliveries.sendKind, 'ce'),
        eq(smsSendDeliveries.sendRowId, claimCertificateReminders.reminderId),
        eq(smsSendDeliveries.pariwarId, claimCertificateReminders.pariwarId),
      ),
    )
    .where(
      and(
        eq(claimCertificateReminders.pariwarId, pariwarId),
        eq(claimCertificateReminders.claimCaseId, claimCaseId),
        eq(claimCertificateReminders.purpose, 'ladder_sms'),
      ),
    )
    .orderBy(asc(claimCertificateReminders.sentOn), asc(claimCertificateReminders.createdAt));
  return rows.map((r) => ({ ...r, deliveryState: r.deliveryState ?? null }));
}

/**
 * The `created_at` of each ladder ORIGIN row (by id), in the chase's own send table — what a ladder COVERS starts there
 * (LD5). A missing id is absent from the map.
 */
export async function readLadderOriginCreatedAt(
  db: Db,
  pariwarId: PariwarId,
  chase: ContactLadderChase,
  originRowIds: readonly string[],
): Promise<Map<string, Date>> {
  if (originRowIds.length === 0) return new Map();
  const t = chase === 'correction' ? claimCorrectionReminders : claimCertificateReminders;
  const rows = await db
    .select({ reminderId: t.reminderId, createdAt: t.createdAt })
    .from(t)
    .where(and(eq(t.pariwarId, pariwarId), inArray(t.reminderId, [...new Set(originRowIds)])));
  return new Map(rows.map((r) => [r.reminderId, r.createdAt]));
}

/** Every call recorded on a claim (either surface), oldest first — ⛔ PII (a role, a date, an outcome). */
export async function readClaimContactCalls(
  db: Db,
  pariwarId: PariwarId,
  claimCaseId: ClaimId,
  personKeys?: readonly string[],
): Promise<ClaimContactCallRow[]> {
  if (personKeys !== undefined && personKeys.length === 0) return [];
  return db
    .select()
    .from(claimContactCalls)
    .where(
      and(
        eq(claimContactCalls.pariwarId, pariwarId),
        eq(claimContactCalls.claimCaseId, claimCaseId),
        ...(personKeys === undefined ? [] : [inArray(claimContactCalls.personKey, [...personKeys])]),
      ),
    )
    .orderBy(asc(claimContactCalls.calledOn), asc(claimContactCalls.createdAt));
}
