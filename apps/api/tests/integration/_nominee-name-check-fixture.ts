// Story 6.18 (AC4) — the nominee name-check fixture for API E2E specs.
//
// Every approving path (P1 `adjudicateClaim`, P3 `voteOnFrozenClaim`, P4 `finalizeR9Outcome`) now
// requires the claim's two live bank accounts AND a current, PASSING District Admin name check
// (`2026-09-19-226` cl.3-cl.5, cl.7). E2E specs that drive a claim and then approve it through the
// HTTP surface need this one call in their `seedClaim`.
//
// ⭐ IT IS DELIBERATELY NOT A BACKDOOR FOR THE CHECK — the check goes through the REAL
// `recordNomineeNameCheck`, including that writer's own state-window, coherence and token
// re-validation. A helper that stubbed the gate would make every E2E approval test silently stop
// proving the gate holds.
//
// ⚠⚠ BUT THE HEADER USED TO OVERCLAIM, AND THE OVERCLAIM MATTERED (code review 2026-09-20). It
// said the fixture *"seeds two real account rows"*. They are raw-SQL INSERTs with PLACEHOLDER
// ciphertext (`enc:v1:holder-1`), so:
//   · `recordClaimNomineeBankAccounts` — the real bank writer — is ⛔ never exercised, and neither
//     is its `updated_at` movement, which is the whole mechanism D5 staleness rests on. A test
//     whose SUBJECT is the D5 chain must drive that writer itself, across two COMMITTED
//     transactions;
//   · the ciphertexts are ⛔ not decryptable, so the AC2 read returns `unreadable` and ⛔ no
//     plaintext name ever exists. A PII test built on this fixture cannot fail — there is nothing
//     to leak. Plant real plaintext through the real route for that.

import { randomUUID } from 'node:crypto';

import { claim, cycleCalendar, ids, nominee } from '@twt/domain';

import type { AppDeps } from '../../src/context.js';
import {
  decryptDeathCertificateReviewField,
  encryptDeathCertificateReviewField,
} from '../../src/modules/claims/death-certificate-crypto.js';
import { deathDateBlindIndex, encryptGroundInspectionField } from '../../src/modules/claims/ground-inspection-crypto.js';
import { closeScopeTx, openScopeTx } from '../../src/modules/multi-tenant/scope-tx.js';

type ScopeTx = Awaited<ReturnType<typeof openScopeTx>>;

// ── Story 6.21a (D12) — the death certificate ────────────────────────────────────────────────────────
// ⭐ TEST-ONLY RAW INSERTS of the certificate itself (the OCR job is its sole production writer and there is ⛔ no
// domain writer), a private copy of the domain `_helpers.ts` pair. The REVIEW goes through the REAL writer,
// with the accepted date encrypted under the REAL field class — 6.20's timeline and determination handler
// decrypt it and compare it with the date the District Admin sends.

/** Raw-insert a death certificate (the row + ONE upload, made CURRENT) in the caller's scope tx. */
export async function insertDeathCertificate(
  scopeTx: ScopeTx,
  pariwarId: string,
  claimCaseId: string,
  opts: { readonly uploadedAt?: Date; /** a caller-PINNED key (a spec's per-claim marker) */ readonly storageObjectKey?: string } = {},
): Promise<{ claimDocumentId: string; uploadId: string; storageObjectKey: string }> {
  const claimRow = await claim.getClaimCase(scopeTx.tx, ids.pariwarId(pariwarId), ids.claimId(claimCaseId));
  if (!claimRow) throw new Error(`[fixture] claim ${claimCaseId} not found in ${pariwarId}`);
  const existing = await scopeTx.client.query<{ claim_document_id: string }>(
    `SELECT claim_document_id FROM claim_documents WHERE pariwar_id = $1 AND claim_case_id = $2 AND document_type = 'death_certificate'`,
    [pariwarId, claimCaseId],
  );
  const claimDocumentId = existing.rows[0]?.claim_document_id ?? randomUUID();
  const uploadId = randomUUID();
  const storageObjectKey =
    opts.storageObjectKey ?? `pariwar/${pariwarId}/claim/${claimCaseId}/death_certificate/${claimDocumentId}/${uploadId}`;
  if (existing.rows[0]) {
    await scopeTx.client.query(`UPDATE claim_documents SET storage_object_key = $2, updated_at = now() WHERE claim_document_id = $1`, [
      claimDocumentId,
      storageObjectKey,
    ]);
  } else {
    await scopeTx.client.query(
      `INSERT INTO claim_documents (claim_document_id, pariwar_id, claim_case_id, document_type, storage_object_key,
         content_type, byte_size, parity_outcome, parity_flags, ocr_confidence, verifier_review_required)
       VALUES ($1, $2, $3, 'death_certificate', $4, 'application/pdf', 1024, 'match', '{}'::jsonb, 0.9, false)`,
      [claimDocumentId, pariwarId, claimCaseId, storageObjectKey],
    );
  }
  await scopeTx.client.query(
    `INSERT INTO claim_death_certificate_uploads (upload_id, claim_case_id, pariwar_id, deceased_member_id, claim_document_id,
       storage_object_key, content_type, byte_size, channel, uploaded_by_actor_id, uploaded_at,
       parity_outcome, parity_flags, ocr_confidence)
     VALUES ($1, $2, $3, $4, $5, $6, 'application/pdf', 1024, 'member_app', NULL, $7, 'match', '{}'::jsonb, 0.9)`,
    [uploadId, claimCaseId, pariwarId, claimRow.deceasedMemberId, claimDocumentId, storageObjectKey, opts.uploadedAt ?? new Date()],
  );
  return { claimDocumentId, uploadId, storageObjectKey };
}

/**
 * Ensure the claim's CURRENT certificate is ACCEPTED with `date` (default tomorrow, IST) — through the REAL
 * review writer, reusing an accepted review with the same date. Returns its review id. The claim must be in
 * the review window.
 */
export async function ensureAcceptedDeathCertificate(
  deps: AppDeps,
  scopeTx: ScopeTx,
  pariwarId: string,
  claimCaseId: string,
  opts: { readonly date?: string } = {},
): Promise<string> {
  const pid = ids.pariwarId(pariwarId);
  const cid = ids.claimId(claimCaseId);
  const date = opts.date ?? certificateDateAfterEverything();
  const snap = await claim.readDeathCertificateSnapshot(scopeTx.tx, pid, cid);
  const status = claim.deathCertificateStatus(snap);
  if (status === 'accepted') {
    const accepted = await claim.getCurrentAcceptedDeathCertificate(scopeTx.tx, pid, cid);
    if (accepted && (await decryptDeathCertificateReviewField(accepted.acceptedDateCiphertext, pariwarId, deps.encryption)) === date) {
      return accepted.reviewId;
    }
  }
  let token = snap.currentUploadId as string | null;
  if (status === 'missing' || status === 'rejected' || token === null) {
    token = (await insertDeathCertificate(scopeTx, pariwarId, claimCaseId)).uploadId;
  }
  const [dateCt, noteCt] = await Promise.all([
    encryptDeathCertificateReviewField(date, pariwarId, deps.encryption),
    encryptDeathCertificateReviewField('fixture: the date is clear', pariwarId, deps.encryption),
  ]);
  const r = await claim.recordDeathCertificateReview(scopeTx.client, {
    claimCaseId: cid,
    pariwarId: pid,
    verdict: 'accepted',
    certificateToken: token,
    acceptedDate: date,
    acceptedDateCiphertext: dateCt,
    rejectionReason: null,
    noteCiphertext: noteCt,
    expectedLiveReviewId: (snap.liveReview?.reviewId as string | undefined) ?? null,
    actorId: randomUUID(),
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
    // D4's clock — the date may be TOMORROW (IST), so the fixture accepts on that day.
    now: new Date(Math.max(Date.now(), Date.parse(`${date}T12:00:00+05:30`))),
  });
  return r.reviewId;
}

/**
 * ⭐ Story 6.26a (GI15) — give a claim a COMPLETE ground inspection (`groundInspectionApprovalState`) through the REAL
 * writers, in the caller's scope tx: an own FULL (`initial`) assignment, one `original_certificate` photo row, completed
 * against the CURRENT upload with verdict `matches` and a family date EQUAL to the accepted date (⛔ no warning by
 * default), encrypted and blind-indexed under the REAL field classes, on the review's clock (the date may be TOMORROW).
 * ⛔ Nothing when already complete, or when the claim has ⛔ no current upload (the certificate conjunct answers first).
 * The claim must be in the inspection write window. Returns the new assignment id, or `null`.
 */
export async function ensureGroundInspection(
  deps: AppDeps,
  scopeTx: ScopeTx,
  pariwarId: string,
  claimCaseId: string,
  opts: { readonly force?: boolean; readonly stage?: 'initial' | 'certificate_check'; readonly verdict?: 'matches' | 'does_not_match' } = {},
): Promise<string | null> {
  const pid = ids.pariwarId(pariwarId);
  const cid = ids.claimId(claimCaseId);
  const facts = await claim.readGroundInspectionApprovalFacts(scopeTx.tx, pid, cid);
  if (facts.currentUploadId === null) return null;
  if (opts.force !== true && claim.groundInspectionApprovalState(facts).complete) return null;
  const accepted = await claim.getCurrentAcceptedDeathCertificate(scopeTx.tx, pid, cid);
  const date =
    (accepted ? await decryptDeathCertificateReviewField(accepted.acceptedDateCiphertext, pariwarId, deps.encryption) : null) ??
    certificateDateAfterEverything();
  const stage = opts.stage ?? 'initial';
  const inspector = randomUUID();
  const { groundInspection } = await claim.scheduleGroundInspection(scopeTx.client, {
    claimCaseId: cid,
    pariwarId: pid,
    district: 'Patna',
    inspectionStage: stage,
    inspectionSiteType: 'family_residence',
    inspectorActorId: inspector,
    scheduledAt: new Date(),
    scheduledByActor: inspector,
    idempotencyKey: randomUUID(),
  });
  const gid = groundInspection.groundInspectionId;
  await claim.addGroundInspectionPhoto(scopeTx.client, {
    pariwarId: pid,
    groundInspectionId: gid,
    actingActorId: inspector,
    storageObjectKey: `fixture/ground-inspection/${gid}/original-certificate.jpg`,
    contentType: 'image/jpeg',
    byteSize: 1024,
    photoKind: 'original_certificate',
  });
  await claim.completeGroundInspection(scopeTx.client, {
    pariwarId: pid,
    groundInspectionId: gid,
    actingActorId: inspector,
    originalCertificateVerdict: opts.verdict ?? 'matches',
    comparedCertificateUploadId: facts.currentUploadId,
    deathDate: {
      plaintext: date,
      ciphertext: await encryptGroundInspectionField(date, pariwarId, deps.encryption),
      index: await deathDateBlindIndex(date, pariwarId, deps.encryption),
      source: stage === 'certificate_check' ? 'original_certificate' : 'family_statement',
    },
    // The review's clock (the date may be TOMORROW, IST) — the inline twin of the review's `now` above.
    now: new Date(Math.max(Date.now(), Date.parse(`${date}T12:00:00+05:30`))),
  });
  return gid;
}

/**
 * Give a claim its two bank accounts and a recorded, PASSING name check so it can pass the AC4 gate.
 * Opens and commits its own scope tx. The claim must already be in one of
 * `NOMINEE_NAME_CHECK_RECORDABLE_STATES`.
 *
 * Pass `verdicts` to build the negative fixture instead — e.g. `['matches', 'does_not_match']`, the
 * "sent back for correction" case (AC5), which must NOT pass the gate and must NEVER be denied.
 */
export async function seedNomineeNameCheck(
  deps: AppDeps,
  pariwarId: string,
  claimCaseId: string,
  opts: {
    readonly verdicts?: readonly ('matches' | 'clerical_difference' | 'does_not_match')[];
    readonly clericalReasons?: readonly (('initial' | 'married_name' | 'bank_shortened_name') | null)[];
    /** The acting staff display name snapshotted into the event (D3). Non-empty by construction. */
    readonly actorDisplay?: string;
    /**
     * ⭐ OPT OUT of seeding a check at all — for the specs that must reach an UNCHECKED claim.
     * Every `seedClaim` in this suite calls this fixture unconditionally, so without this flag
     * ⛔ no test could construct the very claim the AC4/AC6 gates exist to refuse, and the 409
     * mappings for `…nominee_name_check_required` / `…bank_details_required` were asserted
     * NOWHERE (code review 2026-09-20, chunk 5).
     */
    readonly skip?: boolean;
    /** Seed the accounts but ⛔ NOT the check — the "two accounts, nobody checked" case (AC4). */
    readonly accountsOnly?: boolean;
    /** Seed only ONE account — `-226` cl.7's "the claim WAITS" case (AC6). */
    readonly singleAccount?: boolean;
    /** Story 6.20 (T16) — `'skip'` leaves the claim UNDETERMINED (the AC5 gate's 409). Default: a
     *  "no discards" determination through the REAL writer, plus a one-nominee declaration when the
     *  deceased has none. */
    readonly determination?: 'no_discards' | 'skip';
    /** Story 6.21a (D12) — `'accepted'` (default): the current death certificate is accepted through the REAL
     *  review writer, BEFORE any determination (D8 needs it). `'skip'` reaches a claim with ⛔ no accepted
     *  certificate — the gate's `…death_certificate_acceptance_required` — and seeds ⛔ no determination. */
    readonly certificate?: 'accepted' | 'skip';
    /** ⭐ Story 6.19a (D14, AC11a) — the claim's CONTACT RECORD, which the approval gate now requires AFTER the
     *  rest. Default `'seed'` (in the `accountsOnly` / `singleAccount` modes too — D14 runs after the gates those
     *  modes exercise, so it is inert there): a complete record, bound to the EFFECTIVE versions once the
     *  determination is effective, else to the PROJECTED ones. `'skip'` reaches `…claim_contact_required`
     *  (`no_record`). A bare `skip: true` stays a pure no-op. */
    readonly contact?: 'seed' | 'skip';
    /** ⭐ Story 6.26a (GI15) — the COMPLETE ground inspection the approval gate now requires (`-263` FQ9 A), AFTER the
     *  name check. Default `'completed'` (`ensureGroundInspection` — real writers; ⛔ nothing when already complete or
     *  ⛔ no current upload; in the `accountsOnly` / `singleAccount` modes too, where it is inert). `'skip'` reaches
     *  `…ground_inspection_required`. A bare `skip: true` stays a pure no-op. */
    readonly inspection?: 'completed' | 'skip';
  } = {},
): Promise<void> {
  if (opts.skip === true) {
    // Story 6.21a — an EXPLICIT `certificate: 'accepted'` with `skip` seeds the accepted certificate ONLY (no
    // accounts, no determination, no check): the claim then reaches the gate's NEXT blocker (6.18's bank
    // accounts) rather than the certificate conjunct, which runs first. A bare `skip` stays a pure no-op.
    if (opts.certificate === 'accepted') {
      const scopeTx = await openScopeTx(deps, pariwarId);
      let ok = false;
      try {
        await ensureAcceptedDeathCertificate(deps, scopeTx, pariwarId, claimCaseId);
        ok = true;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    }
    return;
  }
  const verdicts = opts.verdicts ?? (['matches', 'matches'] as const);
  const clericalReasons = opts.clericalReasons ?? [null, null];
  // ⚠ A SHORT ARRAY THROWS. `verdicts[i] ?? 'matches'` silently produced a PASSING verdict on the
  // ranks a caller did not mention — a negative fixture quietly becoming a positive one.
  if (!opts.singleAccount && verdicts.length !== 2) {
    throw new Error(
      `[fixture] verdicts must cover both accounts, got ${verdicts.length} — a short array used to default the missing ranks to 'matches'`,
    );
  }
  const scopeTx = await openScopeTx(deps, pariwarId);
  let ok = false;
  try {
    // Two live accounts — `-226` cl.7 makes both mandatory before a claim can be decided.
    await scopeTx.client.query(
      `DELETE FROM claim_nominee_bank_accounts WHERE pariwar_id = $1 AND claim_case_id = $2`,
      [pariwarId, claimCaseId],
    );
    await scopeTx.client.query(
      opts.singleAccount === true
        ? `INSERT INTO claim_nominee_bank_accounts
             (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
              account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
           VALUES ($1,$2,1,'enc:v1:holder-1','enc:v1:acct-1','enc:v1:ifsc-1','State Bank of India',true)`
        : `INSERT INTO claim_nominee_bank_accounts
             (claim_case_id, pariwar_id, account_rank, account_holder_name_ciphertext,
              account_number_ciphertext, ifsc_ciphertext, bank_name, ifsc_validated)
           VALUES ($1,$2,1,'enc:v1:holder-1','enc:v1:acct-1','enc:v1:ifsc-1','State Bank of India',true),
                  ($1,$2,2,'enc:v1:holder-2','enc:v1:acct-2','enc:v1:ifsc-2','HDFC Bank',true)`,
      [claimCaseId, pariwarId],
    );

    // ⭐ Story 6.20 (AC5, T16) — the as-at-death DETERMINATION the gate asks for BEFORE the check.
    // Seeded here, ahead of the `accountsOnly` return, so "nobody CHECKED" still reaches the name-check
    // 409 rather than `nominee_determination_required` — a different fact. `determination: 'skip'`
    // builds the UNDETERMINED claim instead.
    // ⭐ Story 6.21a (D7, D8) — the ACCEPTED certificate the gate asks for FIRST, and the determination's date.
    const reviewId =
      opts.certificate === 'skip' ? null : await ensureAcceptedDeathCertificate(deps, scopeTx, pariwarId, claimCaseId);
    if (opts.determination !== 'skip' && reviewId !== null) {
      await seedDeclarationAndDetermination(scopeTx, pariwarId, claimCaseId, reviewId);
    }

    // ⛔ The "two accounts but NOBODY CHECKED" fixture stops here — exactly the claim AC4's gate
    // must refuse with `nominee_name_check_required`, and the one no test could build before.
    if (opts.accountsOnly === true || opts.singleAccount === true) {
      if (opts.inspection !== 'skip') await ensureGroundInspection(deps, scopeTx, pariwarId, claimCaseId);
      if (opts.contact !== 'skip') await ensureClaimContact(scopeTx, pariwarId, claimCaseId);
      ok = true;
      return;
    }

    const stamps = await scopeTx.client.query<{ account_rank: number; updated_at: Date }>(
      `SELECT account_rank, updated_at FROM claim_nominee_bank_accounts
        WHERE pariwar_id = $1 AND claim_case_id = $2 ORDER BY account_rank`,
      [pariwarId, claimCaseId],
    );

    const claimRow = await claim.getClaimCase(
      scopeTx.tx,
      ids.pariwarId(pariwarId),
      ids.claimId(claimCaseId),
    );
    if (!claimRow) throw new Error(`[fixture] claim ${claimCaseId} not found in ${pariwarId}`);

    // Story 6.20 (AC5) — the token of the EFFECTIVE as-at-death declaration, read through the same
    // accessor the writer re-validates against.
    const token = (
      await claim.getEffectiveNomineeDeclaration(scopeTx.tx, ids.pariwarId(pariwarId), ids.claimId(claimCaseId))
    ).token;

    await claim.recordNomineeNameCheck(scopeTx.client, {
      claimCaseId: ids.claimId(claimCaseId),
      pariwarId: ids.pariwarId(pariwarId),
      nomineeDeclarationToken: token,
      accounts: stamps.rows.map((row, i) => ({
        accountRank: row.account_rank as 1 | 2,
        accountUpdatedAt: new Date(row.updated_at).toISOString(),
        verdict: verdicts[i]!,
        clericalReason: clericalReasons[i] ?? null,
      })),
      actorId: randomUUID(),
      // ⛔ NOT a placeholder: the writer refuses an empty display name (D3), so every seeded check
      // carries a name exactly as a real one does.
      actorDisplay: opts.actorDisplay ?? 'Anita (District Admin)',
      actor: 'operator',
    });
    if (opts.inspection !== 'skip') await ensureGroundInspection(deps, scopeTx, pariwarId, claimCaseId);
    if (opts.contact !== 'skip') await ensureClaimContact(scopeTx, pariwarId, claimCaseId);
    ok = true;
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
}

/**
 * ⭐ Story 6.19a — seed a COMPLETE contact record when the claim has none (TEST-ONLY raw inserts, placeholder
 * ciphertext — ⛔ not decryptable, so ⛔ never the fixture for a PII-leak test: plant real plaintext through the
 * real routes for that). Binding follows the writer's helpline rule (W2): the EFFECTIVE versions once the
 * determination is effective, else the PROJECTED ones; the claimant is the first bound version, or — with no
 * bound version at all — the claimant block. The agreement is a live `claim_contact_agreement` consent linked
 * through `agreement_consent_id` (D15, per claim). Returns the bound version ids.
 */
export async function ensureClaimContact(
  scopeTx: ScopeTx,
  pariwarId: string,
  claimCaseId: string,
): Promise<readonly string[]> {
  const pid = ids.pariwarId(pariwarId);
  const cid = ids.claimId(claimCaseId);
  const claimRow = await claim.getClaimCase(scopeTx.tx, pid, cid);
  if (!claimRow) throw new Error(`[fixture] claim ${claimCaseId} not found in ${pariwarId}`);
  const effective = await claim.getEffectiveNomineeDeclaration(scopeTx.tx, pid, cid);
  const bound =
    effective.status === 'effective'
      ? effective.entries.map((e) => e.versionId as string)
      : (await nominee.getProjectedNomineeVersions(scopeTx.tx, pid, claimRow.deceasedMemberId)).map((v) => v.versionId as string);
  const existing = await claim.readClaimContact(scopeTx.tx, pid, cid);
  if (existing.contact !== null) {
    // ⭐ A record THIS FIXTURE wrote earlier (a spec that seeds before the declaration or the determination exists)
    // is TOPPED UP: a row for each newly bound version with ⛔ no counted row (own or chain-carried, W4a). A
    // record a spec wrote itself — through the real routes — is ⛔ never touched.
    if (existing.contact.recordedByActor !== 'fixture') return [];
    const index = await claim.readVersionChainIndex(scopeTx.tx, pid, claimRow.deceasedMemberId);
    const blockSide = existing.contact.claimantNomineeVersionId === null;
    for (const versionId of bound) {
      if (claim.resolveContactRow(versionId, existing.nominees, index) !== null) continue;
      await scopeTx.client.query(
        `INSERT INTO claim_contact_nominees (contact_id, claim_case_id, pariwar_id, nominee_version_id, address_ciphertext, relationship)
         VALUES ($1, $2, $3, $4, 'enc:v1:nominee-address', $5)`,
        [existing.contact.contactId, claimCaseId, pariwarId, versionId, blockSide ? 'son' : null],
      );
    }
    return bound;
  }
  const agreement = await scopeTx.client.query<{ consent_id: string }>(
    `INSERT INTO consent_records (subject_id, pariwar_id, consent_type, consent_artifact_ref, granted_via_actor, consent_payload)
     VALUES ($1, $2, 'claim_contact_agreement', $3, 'member_self', '{"checkboxTextShown":"fixture","locale":"en"}'::jsonb)
     RETURNING consent_id`,
    [claimRow.deceasedMemberId, pariwarId, claimCaseId],
  );
  const claimant = bound[0] ?? null;
  const contact = await scopeTx.client.query<{ contact_id: string }>(
    `INSERT INTO claim_contacts (claim_case_id, pariwar_id, deceased_member_id, claimant_nominee_version_id,
       claimant_name_ciphertext, claimant_mobile_ciphertext, claimant_address_ciphertext, agreement_consent_id,
       recorded_by_actor, recorded_via)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'fixture', 'member_app') RETURNING contact_id`,
    [
      claimCaseId,
      pariwarId,
      claimRow.deceasedMemberId,
      claimant,
      claimant === null ? 'enc:v1:claimant-name' : null,
      claimant === null ? 'enc:v1:claimant-mobile' : null,
      claimant === null ? 'enc:v1:claimant-address' : null,
      agreement.rows[0]!.consent_id,
    ],
  );
  for (const versionId of bound) {
    await scopeTx.client.query(
      `INSERT INTO claim_contact_nominees (contact_id, claim_case_id, pariwar_id, nominee_version_id, address_ciphertext, relationship)
       VALUES ($1, $2, $3, $4, 'enc:v1:nominee-address', $5)`,
      [contact.rows[0]!.contact_id, claimCaseId, pariwarId, versionId, claimant === null ? 'son' : null],
    );
  }
  return bound;
}

/** Tomorrow in IST — a certificate date against which every version dated up to now STANDS. */
function certificateDateAfterEverything(): string {
  return cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date()), 1);
}

/**
 * Story 6.20 (T16) — give the claim's deceased a VERSIONED declaration (when they have none) and a live
 * "no discards" determination (when there is none), both through the real domain writers. ⛔ Never a
 * raw `member_nominees` INSERT: that row would be unversioned and fail closed (D1).
 */
async function seedDeclarationAndDetermination(
  scopeTx: Awaited<ReturnType<typeof openScopeTx>>,
  pariwarId: string,
  claimCaseId: string,
  /** Story 6.21a (D8) — the accepted review whose date (tomorrow, IST) the determination uses. */
  deathCertificateReviewId: string,
): Promise<void> {
  const pid = ids.pariwarId(pariwarId);
  const cid = ids.claimId(claimCaseId);
  const claimRow = await claim.getClaimCase(scopeTx.tx, pid, cid);
  if (!claimRow) throw new Error(`[fixture] claim ${claimCaseId} not found in ${pariwarId}`);
  const mid = claimRow.deceasedMemberId;

  const before = await claim.getEffectiveNomineeDeclaration(scopeTx.tx, pid, cid);
  if (before.status === 'unversioned') {
    throw new Error('[fixture] the deceased has member_nominees rows with NO version — seed them through the declare path');
  }
  let versions = await nominee.listNomineeDeclarationVersions(scopeTx.tx, pid, mid);
  if (versions.length === 0) {
    await scopeTx.client.query(
      `INSERT INTO members (member_id, pariwar_id, state, state_event_version)
       VALUES ($1, $2, 'active', 1) ON CONFLICT (member_id) DO NOTHING`,
      [mid, pariwarId],
    );
    const row = {
      rank: 1 as const,
      splitPct: 100 as const,
      relationship: 'spouse',
      nameCiphertext: 'enc:v1:nominee-name-1',
      mobileCiphertext: 'enc:v1:nominee-mobile-1',
      addressCiphertext: null,
    };
    await nominee.replaceMemberNominees(scopeTx.tx, { memberId: mid, pariwarId: pid, nominees: [row] });
    await nominee.appendMemberDeclarationVersions(scopeTx.tx, {
      memberId: mid,
      pariwarId: pid,
      plan: nominee.planDeclarationVersions(await nominee.getNomineeVersionHeads(scopeTx.tx, pid, mid), [1]),
      nominees: [row],
      recordedAt: new Date('2026-01-05T06:00:00.000Z'),
      eventVersion: null,
    });
    versions = await nominee.listNomineeDeclarationVersions(scopeTx.tx, pid, mid);
  }
  if (before.determinationId !== null) return;
  const head = (rank: number) =>
    versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);
  await claim.recordNomineeDetermination(scopeTx.client, {
    claimCaseId: cid,
    pariwarId: pid,
    certificateDate: certificateDateAfterEverything(),
    certificateDateCiphertext: 'enc:v1:certificate-date',
    noteCiphertext: 'enc:v1:determination-note',
    marks: versions.map((v) => ({ versionId: v.versionId, mark: 'stands' as const })),
    watermark: { rank1: head(1), rank2: head(2) },
    expectedLiveDeterminationId: null,
    deathCertificateReviewId,
    certificateDateCheck: 'match',
    actorId: randomUUID(),
    actorDisplay: 'Anita (District Admin)',
    actor: 'operator',
  });
}
