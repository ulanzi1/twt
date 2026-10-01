// A RETURNED claim, seeded for the claim-correction reminder live test (Story 6.19b). ⛔ Not a test file.
//
// ⚠ WHY A LOCAL SEED, ⛔ NOT the domain's `tests/integration/_helpers.ts`: apps/jobs compiles with `rootDir: "."`, so its
// tests cannot import across packages by path, and apps/jobs has ⛔ no shared helpers (6.19b slice trap S5). This seeds
// through the PUBLIC `@twt/domain` API and the REAL writers (the projector, the declaration writers, the certificate
// review, the determination, the name check, the return, the mark) — raw inserts only where the domain has ⛔ no
// writer (the OCR job owns `claim_documents` / the certificate upload; the contact record's own rows).
// ⭐ REAL Tier-1 envelopes (S5): the nominee and claimant mobiles and the address are encrypted under the SAME
// fake-KMS deps the sweep decrypts with, so the send path, the number hash and the AC9b sentinels are exercised for
// real — ⛔ never `'enc:v1:…'` placeholders here.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, encryption, ids, nominee, schema, setPariwarScope, bindScopedDb } from '@twt/domain';
import type pg from 'pg';

export type Enc = encryption.FieldCryptoDeps;

export async function encryptField(value: string, pariwarId: string, fieldClass: string, enc: Enc): Promise<string> {
  const ct = await encryption.encryptTier1(Buffer.from(value, 'utf-8'), { pariwarId, fieldClass }, enc.kms, enc.kekRef);
  return encryption.serializeEnvelope(ct);
}

/** Run `fn` in its OWN committed transaction as `twt_app` under the Pariwar's scope (RLS applies). */
export async function onOwnTx<T>(pool: pg.Pool, pariwarId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL ROLE twt_app');
    await setPariwarScope(client, pariwarId);
    const out = await fn(client);
    await client.query('COMMIT');
    return out;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export interface SeededReturnedClaim {
  readonly claimCaseId: string;
  readonly deceasedMemberId: string;
  readonly returnId: string;
  readonly runId: string | null;
  readonly nomineeVersionIds: readonly string[];
}

export interface SeedReturnedClaimOptions {
  /** The nominees' plaintext mobiles (one or two). */
  readonly nomineeMobiles?: readonly string[];
  /** When set, the claimant is NONE of the nominees — the block, with this plaintext mobile. */
  readonly claimantMobile?: string | null;
  readonly contactLocale?: 'hi' | 'en';
  readonly mustAct?: 'family' | 'staff' | null;
  /** The plaintext address sentinel for every contact row (AC9b). */
  readonly address?: string;
  /** `false` ⇒ ⛔ no contact record (D30 `no_contact_record`). */
  readonly withContact?: boolean;
}

/**
 * A claim at `verifier_approved` with an accepted certificate, a declaration of N nominees (real mobile envelopes), an
 * all-`stands` determination, two accounts, a passing check and a contact record — then RETURNED and marked.
 */
export async function seedReturnedClaim(
  pool: pg.Pool,
  pariwarId: string,
  enc: Enc,
  opts: SeedReturnedClaimOptions = {},
): Promise<SeededReturnedClaim> {
  const cid = ids.claimId(randomUUID());
  const mid = ids.memberId(randomUUID());
  const pid = ids.pariwarId(pariwarId);
  const mobiles = opts.nomineeMobiles ?? ['9812345678'];
  const certificateDate = cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date()), 1);

  // (1) The claim through the projector, to `verifier_review`.
  await onOwnTx(pool, pariwarId, async (client) => {
    const emit = (from: string | null, to: string, eventType: string, extra: Record<string, unknown> = {}) =>
      claim.projectClaimState(client, {
        claimCaseId: cid,
        pariwarId: pid,
        deceasedMemberId: mid,
        intakeChannels: ['member_app'],
        claimantActorId: null,
        eventType: eventType as never,
        payload: { from_state: from, to_state: to, trigger: 'test', actor: 'system', ...extra } as never,
        actorId: null,
      });
    await emit(null, 'intake_pending', 'claim.intake_initiated', { deceased_member_id: mid, intake_channel: 'member_app', claimant_actor_id: null });
    await emit('intake_pending', 'intake_converged', 'claim.intake_converged');
    await emit('intake_converged', 'documents_pending', 'claim.documents_received');
    await emit('documents_pending', 'verification_in_progress', 'claim.peer_mesh_pinged', {
      selected_member_ids: [randomUUID()],
      metric_id: 'district_cohort_v1',
      metric_version: 1,
    });
    await emit('verification_in_progress', 'verifier_review', 'claim.verifier_reviewing');
  });

  // (2) The declaration (real mobile envelopes), the accepted certificate, the determination.
  const versionIds = await onOwnTx(pool, pariwarId, async (client) => {
    const db = bindScopedDb(client);
    await db
      .insert(schema.members)
      .values({ memberId: mid, pariwarId: pid, state: 'active', stateEventVersion: 1 })
      .onConflictDoNothing();
    const { ranks } = nominee.deriveNomineeSplit(mobiles.length);
    const rows = await Promise.all(
      mobiles.map(async (m, i) => ({
        rank: ranks[i]!.rank,
        splitPct: ranks[i]!.splitPct,
        relationship: i === 0 ? 'spouse' : 'son',
        nameCiphertext: await encryptField(`Nominee ${String(i + 1)}`, pariwarId, 'member_nominee', enc),
        mobileCiphertext: await encryptField(m, pariwarId, 'member_nominee', enc),
        addressCiphertext: null,
      })),
    );
    await nominee.replaceMemberNominees(db, { memberId: mid, pariwarId: pid, nominees: rows });
    const plan = nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(db, pid, mid), rows.map((r) => r.rank));
    const appended = await nominee.appendMemberDeclarationVersions(db, {
      memberId: mid,
      pariwarId: pid,
      plan,
      nominees: rows,
      recordedAt: new Date('2026-01-05T06:00:00.000Z'),
      eventVersion: null,
    });

    const docId = randomUUID();
    const uploadId = randomUUID();
    const key = `pariwar/${pid}/claim/${cid}/death_certificate/${docId}/${uploadId}`;
    await db.insert(schema.claimDocuments).values({
      claimDocumentId: docId as never,
      claimCaseId: cid,
      pariwarId: pid,
      documentType: 'death_certificate',
      storageObjectKey: key,
      contentType: 'application/pdf',
      byteSize: 1024,
      parityOutcome: 'match',
      parityFlags: {},
      ocrConfidence: 0.9,
      verifierReviewRequired: false,
    });
    await db.insert(schema.claimDeathCertificateUploads).values({
      uploadId: uploadId as never,
      claimCaseId: cid,
      pariwarId: pid,
      deceasedMemberId: mid,
      claimDocumentId: docId as never,
      storageObjectKey: key,
      contentType: 'application/pdf',
      byteSize: 1024,
      channel: 'member_app',
      uploadedByActorId: null,
      uploadedAt: new Date(),
      parityOutcome: 'match',
      parityFlags: {},
      ocrConfidence: 0.9,
    });
    const review = await claim.recordDeathCertificateReview(client, {
      claimCaseId: cid,
      pariwarId: pid,
      verdict: 'accepted',
      certificateToken: uploadId,
      acceptedDate: certificateDate,
      acceptedDateCiphertext: `enc:v1:accepted-date:${certificateDate}`,
      rejectionReason: null,
      noteCiphertext: 'enc:v1:review-note',
      expectedLiveReviewId: null,
      actorId: randomUUID(),
      actorDisplay: 'Test District Admin',
      actor: 'operator',
      now: new Date(Math.max(Date.now(), Date.parse(`${certificateDate}T12:00:00+05:30`))),
    } as never);
    const versions = await nominee.listNomineeDeclarationVersions(db, pid, mid);
    await claim.recordNomineeDetermination(client, {
      claimCaseId: cid,
      pariwarId: pid,
      certificateDate,
      certificateDateCiphertext: 'enc:v1:certificate-date',
      noteCiphertext: 'enc:v1:determination-note',
      marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
      watermark: {
        rank1: versions.filter((v) => v.rank === 1).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null),
        rank2: versions.filter((v) => v.rank === 2).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null),
      },
      expectedLiveDeterminationId: null,
      deathCertificateReviewId: (review as { reviewId: string }).reviewId,
      certificateDateCheck: 'match',
      actorId: randomUUID(),
      actorDisplay: 'Test District Admin',
      actor: 'operator',
    } as never);
    return appended.map((a: { versionId: string }) => a.versionId as string);
  });

  // (3) Two accounts + a passing check, then `verifier_approved`, the contact record, the return and the mark.
  const out = await onOwnTx(pool, pariwarId, async (client) => {
    const db = bindScopedDb(client);
    await db.insert(schema.claimNomineeBankAccounts).values(
      [1, 2].map((rank) => ({
        claimCaseId: cid,
        pariwarId: pid,
        accountRank: rank,
        accountHolderNameCiphertext: `enc:v1:holder-${rank}`,
        accountNumberCiphertext: `enc:v1:acct-${rank}`,
        ifscCiphertext: `enc:v1:ifsc-${rank}`,
        bankName: 'HDFC Bank',
        ifscValidated: true,
      })),
    );
    const { rows: acctRows } = await client.query<{ account_rank: number; updated_at: Date }>(
      'SELECT account_rank, updated_at FROM claim_nominee_bank_accounts WHERE pariwar_id = $1 AND claim_case_id = $2',
      [pid, cid],
    );
    const live = acctRows.map((r) => ({ accountRank: r.account_rank, updatedAt: r.updated_at }));
    const token = (await claim.getEffectiveNomineeDeclaration(db, pid, cid)).token;
    await claim.recordNomineeNameCheck(client, {
      claimCaseId: cid,
      pariwarId: pid,
      nomineeDeclarationToken: token,
      accounts: live
        .sort((a, b) => a.accountRank - b.accountRank)
        .map((a) => ({ accountRank: a.accountRank as 1 | 2, accountUpdatedAt: a.updatedAt.toISOString(), verdict: 'matches' as const, clericalReason: null })),
      actorId: randomUUID(),
      actorDisplay: 'Test District Admin',
      actor: 'operator',
    });
    await claim.projectClaimState(client, {
      claimCaseId: cid,
      pariwarId: pid,
      deceasedMemberId: mid,
      intakeChannels: ['member_app'],
      claimantActorId: null,
      eventType: 'claim.verifier_approved' as never,
      payload: { from_state: 'verifier_review', to_state: 'verifier_approved', trigger: 'test', actor: 'system' } as never,
      actorId: null,
    });

    // D30 — `withContact: false` reaches a claim with ⛔ no contact record.
    if (opts.withContact !== false) {
      const [agreement] = await db
        .insert(schema.consentRecords)
        .values({
          subjectId: mid,
          pariwarId: pid,
          consentType: 'claim_contact_agreement',
          consentArtifactRef: cid,
          grantedViaActor: 'member_self',
          consentPayload: { checkboxTextShown: 'fixture', locale: 'en' },
          grantedAt: new Date(Date.now() - 60_000),
        } as never)
        .returning({ consentId: schema.consentRecords.consentId });
      const block = opts.claimantMobile !== undefined && opts.claimantMobile !== null;
      const address = await encryptField(opts.address ?? 'House 1, Fixture Lane', pariwarId, 'claim_contact', enc);
      const [contact] = await db
        .insert(schema.claimContacts)
        .values({
          claimCaseId: cid,
          pariwarId: pid,
          deceasedMemberId: mid,
          claimantNomineeVersionId: (block ? null : versionIds[0]) as never,
          claimantNameCiphertext: block ? await encryptField('Claimant Fixture', pariwarId, 'claim_contact', enc) : null,
          claimantMobileCiphertext: block ? await encryptField(opts.claimantMobile!, pariwarId, 'claim_contact', enc) : null,
          claimantAddressCiphertext: block ? address : null,
          agreementConsentId: agreement!.consentId,
          contactLocale: opts.contactLocale ?? 'hi',
          recordedByActor: 'fixture',
          recordedVia: 'member_app',
        })
        .returning({ contactId: schema.claimContacts.contactId });
      for (const v of versionIds) {
        await db.insert(schema.claimContactNominees).values({
          contactId: contact!.contactId,
          claimCaseId: cid,
          pariwarId: pid,
          nomineeVersionId: v as never,
          addressCiphertext: address,
          relationship: block ? 'son' : null,
        });
      }
    }

    const ret = await claim.returnToDistrictAdmin(client, {
      claimCaseId: cid,
      pariwarId: pid,
      reasonCode: 'other',
      rationaleCiphertext: 'enc:v1:return-note',
      actorId: randomUUID(),
      actorDisplay: 'Pariwar Admin One',
      actor: 'trustee',
    });
    let runId: string | null = null;
    if (opts.mustAct !== null) {
      const w = await claim.writeCorrectionMark(client, {
        pariwarId: pid,
        claimCaseId: cid,
        mustAct: opts.mustAct ?? 'family',
        actorId: randomUUID(),
        actorDisplay: 'Pariwar Admin One',
        setByRole: 'pariwar_admin',
        noteCiphertext: null,
        isReturnMark: true, // I8 — the run's day 0 is the RETURN's `decided_at` (IST), ⛔ never a passed `now`
      });
      runId = w.openedRun?.runId ?? null;
    }
    return { returnId: ret.decision.decisionId as string, runId };
  });
  return { claimCaseId: cid, deceasedMemberId: mid, nomineeVersionIds: versionIds, ...out };

}

/**
 * Delete everything a test created — and FAIL LOUDLY if a claim or a run survives (a surviving OPEN run would be read
 * by every later sweep in the shared database).
 * ⚠ The claims go FIRST and ⛔ NOT under the replica role: `session_replication_role = 'replica'` disables the RI
 * triggers too, so a `DELETE FROM claims` there would ⛔ not cascade and would orphan the runs, reminders and letters.
 * The cascade itself is allowed by the append-only tables' triggers (`pg_trigger_depth() > 1`). Only the rows ⛔ no
 * cascade reaches (`events_log`, the nominee history, the consents, the staff fixtures) are then deleted under the
 * replica role — each OPTIONAL delete in its own SAVEPOINT, so one failure (25P02) can ⛔ never roll back the rest.
 */
export async function cleanupClaims(
  pool: pg.Pool,
  claimCaseIds: readonly string[],
  memberIds: readonly string[],
  extra: { readonly userIds?: readonly string[] } = {},
): Promise<void> {
  const userIds = extra.userIds ?? [];
  if (claimCaseIds.length === 0 && userIds.length === 0) return;
  if (claimCaseIds.length > 0) await pool.query('DELETE FROM claims WHERE claim_case_id = ANY($1)', [claimCaseIds]);
  const failures: string[] = [];
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    await c.query("SET LOCAL session_replication_role = 'replica'");
    const optional = async (label: string, statement: string, params: unknown[]): Promise<void> => {
      await c.query('SAVEPOINT cleanup_step');
      try {
        await c.query(statement, params);
        await c.query('RELEASE SAVEPOINT cleanup_step');
      } catch (e) {
        await c.query('ROLLBACK TO SAVEPOINT cleanup_step');
        failures.push(`${label}: ${(e as Error).message}`);
      }
    };
    if (claimCaseIds.length > 0) await optional('events_log', 'DELETE FROM events_log WHERE stream_id = ANY($1)', [claimCaseIds]);
    if (memberIds.length > 0) {
      await optional('member_nominee_versions', 'DELETE FROM member_nominee_versions WHERE member_id = ANY($1)', [memberIds]);
      await optional('member_nominees', 'DELETE FROM member_nominees WHERE member_id = ANY($1)', [memberIds]);
      await optional('consent_records', 'DELETE FROM consent_records WHERE subject_id = ANY($1)', [memberIds]);
    }
    if (userIds.length > 0) {
      await optional('member_device_tokens', 'DELETE FROM member_device_tokens WHERE principal_id = ANY($1::uuid[])', [userIds]);
      await optional('role_grants', 'DELETE FROM role_grants WHERE user_id = ANY($1::uuid[])', [userIds]);
      await optional('users', 'DELETE FROM users WHERE id = ANY($1::uuid[])', [userIds]);
    }
    await c.query('COMMIT');
  } catch (e) {
    await c.query('ROLLBACK').catch(() => undefined);
    throw e;
  } finally {
    c.release();
  }
  if (failures.length > 0) console.warn('[claim-correction seed] cleanup — optional deletes failed:', failures.join('; '));
  if (claimCaseIds.length > 0) {
    const { rows } = await pool.query<{ claims: number; runs: number }>(
      `SELECT (SELECT count(*) FROM claims WHERE claim_case_id = ANY($1))::int AS claims,
              (SELECT count(*) FROM claim_correction_runs WHERE claim_case_id = ANY($1))::int AS runs`,
      [claimCaseIds],
    );
    const left = rows[0]!;
    if (left.claims > 0 || left.runs > 0) {
      throw new Error(
        `[claim-correction seed] cleanup LEFT ${String(left.claims)} claim(s) and ${String(left.runs)} run(s) behind — ` +
          'a surviving open run is swept by every later suite',
      );
    }
  }
}
