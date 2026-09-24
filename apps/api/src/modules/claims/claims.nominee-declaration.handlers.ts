// The nominee declaration HISTORY on the District Admin's console — Story 6.20 (Task 4 / Task 5;
// AC3, AC4, AC7, AC9, D4, D7, D10, D12, D14).
//
//   · GET  …/nominee-declaration            — the TIMELINE (metadata only) — `claim.view_nominee_name_check`
//   · GET  …/nominee-declaration/snapshots  — the DECRYPTED snapshots, ON DEMAND (D10) — same key
//   · POST …/nominee-determination          — the District Admin's DETERMINATION (D4) — + `claim.determine_nominee_declaration`
//   · GET  …/nominee-corrections            — the corrections, target beside proposal — view key
//   · POST …/nominee-corrections            — the helpline operator RAISES one (CC2) — `claim.raise_nominee_correction`
//   · POST …/nominee-corrections/:id/district-decision — STEP 1 — `claim.approve_nominee_correction_district`
//   · POST …/nominee-corrections/:id/pariwar-decision  — STEP 2 — `claim.approve_nominee_correction_pariwar`
//   · GET  /api/v1/p/:pariwarId/admin/nominee-refusals — the Pariwar Admin's `-239` READ SURFACE (D14)
//
// ⛔⛔ INVARIANT 1 / 6 — nothing here computes "this changed after the death", highlights, pre-selects
// or diffs anything. The timeline shows `recorded_at` AND `effective_at`; the District Admin decides.
// ⛔ It is ⛔ NOT in the console packet (D12, T7) — an on-demand route like 6.18's names read.
// ⭐ Decrypt-AFTER-authorize (the route chain has run), strict helpers that map a failure to
// `unreadable`, and an audit line with ids and codes ONLY — ⛔ never a name, date or note (AC9).
// ⭐ Mutations emit their audit lines AFTER the transaction closes (6.18's corrected shape), so each line
// means what it says.

import { claim as claimDomain, ids, member as memberDomain, nominee as nomineeDomain } from '@twt/domain';
import type {
  NomineeCorrectionDecisionRequest,
  NomineeCorrectionListResponse,
  NomineeCorrectionRaiseRequest,
  NomineeCorrectionView,
  NomineeCorrectionWriteResponse,
  NomineeDeclarationSnapshotsResponse,
  NomineeDeclarationTimelineResponse,
  NomineeDeterminationRequest,
  NomineeDeterminationWriteResponse,
  NomineeCorrectionPendingListResponse,
  NomineeRefusalListResponse,
  ReadableName,
  ReadableNomineeName,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptNomineeField, encryptNomineeField } from '../nominee/nominee-crypto.js';
import {
  decryptCorrectionNote,
  decryptDeterminationField,
  encryptCorrectionNote,
  encryptDeterminationField,
} from './nominee-declaration-crypto.js';
import { decryptVerifierRationale } from './verifier-decision-crypto.js';

/** The timeline READ key — reused, ⛔ no fifth key (`-241` §2). */
export const NOMINEE_DECLARATION_VIEW_KEY = 'claim.view_nominee_name_check';
export const NOMINEE_DETERMINATION_KEY = 'claim.determine_nominee_declaration';
export const NOMINEE_CORRECTION_RAISE_KEY = 'claim.raise_nominee_correction';
export const NOMINEE_CORRECTION_DISTRICT_KEY = 'claim.approve_nominee_correction_district';
export const NOMINEE_CORRECTION_PARIWAR_KEY = 'claim.approve_nominee_correction_pariwar';
/** The Pariwar Admin's refusal read surface rides their own correction-approval key (D8 reuse-check: same actor, same pariwar dimension). */
export const NOMINEE_REFUSAL_VIEW_KEY = NOMINEE_CORRECTION_PARIWAR_KEY;

const SENTINEL = memberDomain.ANONYMIZED_SENTINEL;

type Log = FastifyRequest['log'];

/** Decrypt one Tier-1 field for an authorized surface; a failure (or an empty decrypt) is `unreadable`. */
async function readable(decrypt: () => Promise<string>, log: Log, what: string, claimCaseId: string): Promise<ReadableName> {
  try {
    const value = await decrypt();
    if (value === '') return { state: 'unreadable' };
    return { state: 'readable', value };
  } catch (err) {
    // ⚠ The class name only — ⛔ never the ciphertext or a fragment of a decrypt.
    log.warn({ err: err instanceof Error ? err.name : 'unknown', what, claimCaseId }, 'nominee-declaration: decrypt failed; unreadable');
    return { state: 'unreadable' };
  }
}

/** A nominee NAME adds the third state: the RTBF sentinel decrypts fine and is ⛔ not a person's name. */
async function readableNomineeName(decrypt: () => Promise<string>, log: Log, claimCaseId: string): Promise<ReadableNomineeName> {
  const r = await readable(decrypt, log, 'nominee_name', claimCaseId);
  return r.state === 'readable' && r.value === SENTINEL ? { state: 'anonymized' } : r;
}

function scopeOf(request: FastifyRequest) {
  const scopeTx = request.scopeTx;
  const actorId = request.requestContext.actorId;
  if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
  return { scopeTx, actorId, pariwarId: ids.pariwarId(scopeTx.pariwarId) };
}

async function resolveDisplay(deps: AppDeps, actorId: string): Promise<string> {
  const display = await getDisplayName(deps.pool, actorId);
  if (display == null || display.trim() === '') throw new AdminDisplayNameMissingError(actorId);
  return display;
}

const locator = (claimCaseId: string) => `claim:${claimCaseId.toLowerCase()}`;

/** Map a determination refusal onto HTTP. ⛔ Never a 500 for a guard the writer owns. */
function translateDetermination(err: unknown): never {
  if (err instanceof claimDomain.NomineeDeterminationRefusedError) {
    if (err.reason === 'not_found') throw new NotFoundError('Claim not found', 'claim.not_found');
    throw new ConflictError('The nominee determination was refused', `nominee_determination.${err.reason}`);
  }
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) {
    throw new ConflictError('The claim changed while the determination was being recorded — please try again', 'nominee_determination.concurrent');
  }
  throw err;
}

/** Map a correction refusal onto HTTP (404 for an absent claim or correction, else a typed 409). */
export function translateCorrection(err: unknown): never {
  if (err instanceof claimDomain.NomineeCorrectionRefusedError) {
    if (err.reason === 'not_found' || err.reason === 'claim_not_found') {
      throw new NotFoundError('Not found', `nominee_correction.${err.reason}`);
    }
    throw new ConflictError('The nominee correction was refused', `nominee_correction.${err.reason}`);
  }
  if (err instanceof memberDomain.MemberStreamConcurrencyError || err instanceof claimDomain.ClaimStreamConcurrencyError) {
    throw new ConflictError('The declaration changed concurrently — please try again', 'nominee_correction.concurrent');
  }
  throw err;
}

/** The reason code a refused write is audited with — a bounded code, ⛔ never a message with data in it. */
function auditReason(err: unknown): string {
  if (err instanceof claimDomain.NomineeDeterminationRefusedError) return err.reason;
  if (err instanceof claimDomain.NomineeCorrectionRefusedError) return err.reason;
  return err instanceof Error ? err.name : 'unknown';
}

/**
 * Encrypt a raise's proposal + note and call the domain writer in its OWN transaction. Shared by the
 * helpline route here and the member-app route (`createMemberNomineeCorrectionHandler` below), so the two can ⛔ never drift.
 */
export async function raiseCorrectionCore(
  deps: AppDeps,
  input: {
    pariwarIdStr: string;
    claimCaseId: string;
    body: NomineeCorrectionRaiseRequest;
    raisedVia: 'helpline' | 'member_app';
    raisedByActorId: string;
    /** Member route: the claim's deceased MUST be this member (Ravi-mode), else 404. */
    requireDeceasedMemberId?: string;
  },
): Promise<{ correctionId: string }> {
  const p = input.pariwarIdStr;
  const enc = deps.encryption;
  const b = input.body;
  const [name, mobile, address, note] = await Promise.all([
    encryptNomineeField(b.proposed.name, p, enc),
    encryptNomineeField(b.proposed.mobile, p, enc),
    b.proposed.address ? encryptNomineeField(b.proposed.address, p, enc) : Promise.resolve(null),
    encryptCorrectionNote(b.note, p, enc),
  ]);
  const scopeTx = await openScopeTx(deps, p);
  let ok = false;
  try {
    if (input.requireDeceasedMemberId !== undefined) {
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, ids.pariwarId(p), ids.claimId(input.claimCaseId));
      // ⛔ Existence is never leaked: another member's claim reads exactly like a missing one.
      if (!claimRow || claimRow.deceasedMemberId !== input.requireDeceasedMemberId) {
        throw new claimDomain.NomineeCorrectionRefusedError(input.claimCaseId, 'claim_not_found', 'no such claim for this member');
      }
    }
    const res = await claimDomain.raiseNomineeCorrection(scopeTx.client, {
      claimCaseId: ids.claimId(input.claimCaseId),
      pariwarId: ids.pariwarId(p),
      rank: b.rank,
      ...(b.target_version_id !== undefined ? { targetVersionId: b.target_version_id } : {}),
      proposedNameCiphertext: name,
      proposedRelationship: b.proposed.relationship,
      proposedMobileCiphertext: mobile,
      proposedAddressCiphertext: address,
      raiseNoteCiphertext: note,
      raisedVia: input.raisedVia,
      raisedByActorId: input.raisedByActorId,
    });
    ok = true;
    return { correctionId: res.correctionId };
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
}

export function createNomineeDeclarationHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  return {
    /** GET — the timeline: every version's metadata beside the live determination's marks. */
    async getTimeline(request: FastifyRequest): Promise<NomineeDeclarationTimelineResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const cid = ids.claimId(claimCaseId);
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');

      const versions = await nomineeDomain.listNomineeDeclarationVersions(scopeTx.tx, pariwarId, claimRow.deceasedMemberId);
      const live = await claimDomain.getLiveNomineeDetermination(scopeTx.tx, pariwarId, cid);
      const effective = await claimDomain.getEffectiveNomineeDeclaration(scopeTx.tx, pariwarId, cid);
      // D17 — the earlier claims' determinations for the same death, shown READ-ONLY (⛔ never pre-filled).
      const earlier = await claimDomain.listEarlierClaimNomineeDeterminations(scopeTx.tx, pariwarId, cid);
      const head = (rank: number) =>
        versions.filter((v) => v.rank === rank).reduce<number | null>((m, v) => Math.max(m ?? 0, v.versionNo), null);

      emitAuthAudit(deps, request, 'admin_nominee_declaration.timeline_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        resourceLocator: locator(claimCaseId),
        context: { claim_case_id: claimCaseId, version_count: versions.length, declaration_status: effective.status },
      });

      return {
        claim_case_id: claimCaseId,
        claim_state: claimRow.currentState,
        deceased_member_id: claimRow.deceasedMemberId,
        versions: versions.map((v) => ({
          version_id: v.versionId,
          rank: v.rank as 1 | 2,
          version_no: v.versionNo,
          kind: v.kind,
          source: v.source,
          relationship: v.relationship,
          split_pct: v.splitPct,
          recorded_at: v.recordedAt.toISOString(),
          effective_at: v.effectiveAt.toISOString(),
          corrects_version_id: v.correctsVersionId,
        })),
        watermark: { rank1: head(1), rank2: head(2) },
        live_determination: live
          ? {
              determination_id: live.row.determinationId,
              decided_at: live.row.decidedAt.toISOString(),
              decided_by_display: live.row.decidedByDisplay,
              marks: live.items.map((i) => ({ version_id: i.versionId, mark: i.mark })),
            }
          : null,
        earlier_determinations: earlier.map((e) => ({
          claim_case_id: e.claimCaseId,
          claim_state: e.claimState,
          determination_id: e.determinationId,
          decided_at: e.decidedAt.toISOString(),
          decided_by_display: e.decidedByDisplay,
          marks: e.items.map((i) => ({ version_id: i.versionId, mark: i.mark })),
        })),
        declaration_status: effective.status,
        determination_recordable: (claimDomain.NOMINEE_DETERMINATION_RECORDABLE_STATES as readonly string[]).includes(
          claimRow.currentState,
        ),
      };
    },

    /** GET — the decrypted snapshots, ON DEMAND (D10). Decrypt-after-authorize; audited with ids only. */
    async getSnapshots(request: FastifyRequest): Promise<NomineeDeclarationSnapshotsResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const cid = ids.claimId(claimCaseId);
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
      const p = scopeTx.pariwarId;
      const log = request.log;

      const versions = await nomineeDomain.listNomineeDeclarationVersions(scopeTx.tx, pariwarId, claimRow.deceasedMemberId);
      const snapshots = [];
      for (const v of versions) {
        snapshots.push({
          version_id: v.versionId,
          name: v.nameCiphertext === null ? null : await readableNomineeName(() => decryptNomineeField(v.nameCiphertext!, p, enc), log, claimCaseId),
          mobile: v.mobileCiphertext === null ? null : await readable(() => decryptNomineeField(v.mobileCiphertext!, p, enc), log, 'nominee_mobile', claimCaseId),
          address: v.addressCiphertext === null ? null : await readable(() => decryptNomineeField(v.addressCiphertext!, p, enc), log, 'nominee_address', claimCaseId),
        });
      }
      const live = await claimDomain.getLiveNomineeDetermination(scopeTx.tx, pariwarId, cid);

      // ⭐ Records WHO opened a living person's details and ON WHICH CLAIM — ⛔ never the details.
      emitAuthAudit(deps, request, 'admin_nominee_declaration.snapshots_read', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: { claim_case_id: claimCaseId, version_count: versions.length, determination_read: live !== null },
      });

      return {
        claim_case_id: claimCaseId,
        snapshots,
        live_determination: live
          ? {
              determination_id: live.row.determinationId,
              certificate_date: await readable(() => decryptDeterminationField(live.row.certificateDateCiphertext, p, enc), log, 'certificate_date', claimCaseId),
              note: await readable(() => decryptDeterminationField(live.row.noteCiphertext, p, enc), log, 'determination_note', claimCaseId),
            }
          : null,
      };
    },

    /** POST — the District Admin's determination (D4). The writer VALIDATES; it ⛔ never decides. */
    async postDetermination(request: FastifyRequest, reply: FastifyReply): Promise<NomineeDeterminationWriteResponse> {
      const { scopeTx: outer, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as NomineeDeterminationRequest;
      const p = outer.pariwarId;

      // ⭐ EVERY refusal is audited — the display-name lookup, the encryption and the scope open included
      // (code review 2026-09-24: those used to throw before the `try` and leave no `_rejected` line).
      let result: Awaited<ReturnType<typeof claimDomain.recordNomineeDetermination>> | undefined;
      let failure: unknown;
      try {
        const actorDisplay = await resolveDisplay(deps, actorId);
        const [dateCt, noteCt] = await Promise.all([
          encryptDeterminationField(body.certificate_date, p, enc),
          encryptDeterminationField(body.note, p, enc),
        ]);
        const scopeTx = await openScopeTx(deps, p);
        let ok = false;
        try {
          result = await claimDomain.recordNomineeDetermination(scopeTx.client, {
            claimCaseId: ids.claimId(claimCaseId),
            pariwarId: ids.pariwarId(p),
            certificateDate: body.certificate_date,
            certificateDateCiphertext: dateCt,
            noteCiphertext: noteCt,
            marks: body.marks.map((m) => ({ versionId: m.version_id, mark: m.mark })),
            watermark: body.watermark,
            expectedLiveDeterminationId: body.expected_live_determination_id,
            actorId,
            actorDisplay,
            actor: 'operator',
          });
          ok = true;
        } finally {
          await closeScopeTx(scopeTx, ok);
        }
      } catch (err) {
        failure = err;
      }

      if (failure !== undefined || result === undefined) {
        emitAuthAudit(deps, request, 'admin_claim.nominee_determination_rejected', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(claimCaseId),
          context: { claim_case_id: claimCaseId, reason: auditReason(failure) },
        });
        return translateDetermination(failure);
      }
      // The write COMMITTED — it is audited as recorded BEFORE anything else can fail.
      emitAuthAudit(deps, request, 'admin_claim.nominee_determination_recorded', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: {
          claim_case_id: claimCaseId,
          determination_id: result.determinationId,
          stands_count: result.standsCount,
          discarded_count: result.discardedCount,
        },
      });
      // ⭐ The resulting status is read AFTER the commit, in its own read scope (code review 2026-09-24). Read
      // inside the write's `try`, a failure here audited a committed determination as `_rejected` and
      // answered 500 — or, on a Postgres error, silently turned the COMMIT into a rollback.
      const readTx = await openScopeTx(deps, p);
      let status: string;
      try {
        status = (await claimDomain.getEffectiveNomineeDeclaration(readTx.tx, ids.pariwarId(p), ids.claimId(claimCaseId))).status;
      } finally {
        await closeScopeTx(readTx, true);
      }

      void reply.status(201);
      return {
        claim_case_id: claimCaseId,
        determination_id: result.determinationId,
        superseded_determination_id: result.supersededDeterminationId,
        stands_count: result.standsCount,
        discarded_count: result.discardedCount,
        declaration_status: status as NomineeDeterminationWriteResponse['declaration_status'],
        event_version: result.eventVersion,
      };
    },

    /** GET — the corrections, each with its TARGET beside its PROPOSAL (decrypted; ⛔ never compared). */
    async listCorrections(request: FastifyRequest): Promise<NomineeCorrectionListResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const cid = ids.claimId(claimCaseId);
      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');
      const p = scopeTx.pariwarId;
      const log = request.log;

      const rows = await claimDomain.listNomineeCorrections(scopeTx.tx, pariwarId, cid);
      const targets = await nomineeDomain.getNomineeVersionsByIds(scopeTx.tx, pariwarId, rows.map((r) => r.targetVersionId));
      const note = (ct: string | null) =>
        ct === null ? Promise.resolve(null) : readable(() => decryptCorrectionNote(ct, p, enc), log, 'correction_note', claimCaseId);

      const corrections: NomineeCorrectionView[] = [];
      for (const r of rows) {
        const t = targets.find((v) => v.versionId === r.targetVersionId);
        corrections.push({
          correction_id: r.correctionId,
          claim_case_id: claimCaseId,
          rank: r.rank as 1 | 2,
          target_version_id: r.targetVersionId,
          target: {
            relationship: t?.relationship ?? null,
            name: t?.nameCiphertext ? await readableNomineeName(() => decryptNomineeField(t.nameCiphertext!, p, enc), log, claimCaseId) : null,
            mobile: t?.mobileCiphertext ? await readable(() => decryptNomineeField(t.mobileCiphertext!, p, enc), log, 'nominee_mobile', claimCaseId) : null,
          },
          proposed: {
            relationship: r.proposedRelationship,
            name: await readableNomineeName(() => decryptNomineeField(r.proposedNameCiphertext, p, enc), log, claimCaseId),
            mobile: await readable(() => decryptNomineeField(r.proposedMobileCiphertext, p, enc), log, 'proposed_mobile', claimCaseId),
            address: r.proposedAddressCiphertext
              ? await readable(() => decryptNomineeField(r.proposedAddressCiphertext!, p, enc), log, 'proposed_address', claimCaseId)
              : null,
          },
          raised_via: r.raisedVia,
          raised_at: r.raisedAt.toISOString(),
          raise_note: (await note(r.raiseNoteCiphertext))!,
          step: r.step,
          district_admin:
            r.daDecidedAt && r.daDisplay
              ? { actor_display: r.daDisplay, decided_at: r.daDecidedAt.toISOString(), note: await note(r.daNoteCiphertext) }
              : null,
          pariwar_admin:
            r.paDecidedAt && r.paDisplay
              ? { actor_display: r.paDisplay, decided_at: r.paDecidedAt.toISOString(), note: await note(r.paNoteCiphertext) }
              : null,
          declined_at_step: r.declinedAtStep,
          applied_version_id: r.appliedVersionId,
        });
      }
      emitAuthAudit(deps, request, 'admin_nominee_correction.list_read', {
        actorId,
        pariwarId: p,
        resourceLocator: locator(claimCaseId),
        context: { claim_case_id: claimCaseId, correction_count: rows.length },
      });
      return { claim_case_id: claimCaseId, corrections };
    },

    /** POST — the helpline operator raises a correction on the family's behalf (CC2). */
    async postRaiseCorrection(request: FastifyRequest, reply: FastifyReply): Promise<NomineeCorrectionWriteResponse> {
      const { scopeTx, actorId } = scopeOf(request);
      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as NomineeCorrectionRaiseRequest;
      try {
        const { correctionId } = await raiseCorrectionCore(deps, {
          pariwarIdStr: scopeTx.pariwarId,
          claimCaseId,
          body,
          raisedVia: 'helpline',
          raisedByActorId: actorId,
        });
        emitAuthAudit(deps, request, 'admin_claim.nominee_correction_raised', {
          actorId,
          pariwarId: scopeTx.pariwarId,
          resourceLocator: locator(claimCaseId),
          context: { claim_case_id: claimCaseId, correction_id: correctionId, rank: body.rank, raised_via: 'helpline' },
        });
        void reply.status(201);
        return { correction_id: correctionId, claim_case_id: claimCaseId, step: 'da_pending', applied_version_id: null };
      } catch (err) {
        emitAuthAudit(deps, request, 'admin_claim.nominee_correction_rejected', {
          actorId,
          pariwarId: scopeTx.pariwarId,
          resourceLocator: locator(claimCaseId),
          context: { claim_case_id: claimCaseId, step: 'raise', reason: auditReason(err) },
        });
        return translateCorrection(err);
      }
    },

    /** POST — STEP 1 (District Admin) or STEP 2 (Pariwar Admin), selected by `which`. */
    decide(which: 'district' | 'pariwar') {
      return async (request: FastifyRequest): Promise<NomineeCorrectionWriteResponse> => {
        const { scopeTx: outer, actorId } = scopeOf(request);
        const { claimCaseId, correctionId } = request.params as { claimCaseId: string; correctionId: string };
        const body = request.body as NomineeCorrectionDecisionRequest;
        const p = outer.pariwarId;

        // ⭐ EVERY refusal is audited — the display-name lookup, the encryption and the scope open included.
        let res: { step: NomineeCorrectionWriteResponse['step']; appliedVersionId: string | null } | undefined;
        let failure: unknown;
        try {
          const actorDisplay = await resolveDisplay(deps, actorId);
          const noteCiphertext = await encryptCorrectionNote(body.note, p, enc);
          const scopeTx = await openScopeTx(deps, p);
          let ok = false;
          try {
            const input = {
              correctionId: ids.nomineeCorrectionId(correctionId),
              claimCaseId: ids.claimId(claimCaseId),
              pariwarId: ids.pariwarId(p),
              outcome: body.outcome,
              noteCiphertext,
              actorId,
              actorDisplay,
            };
            if (which === 'district') {
              res = { ...(await claimDomain.decideNomineeCorrectionAsDistrictAdmin(scopeTx.client, input)), appliedVersionId: null };
            } else {
              res = await claimDomain.decideNomineeCorrectionAsPariwarAdmin(scopeTx.client, input);
            }
            ok = true;
          } finally {
            await closeScopeTx(scopeTx, ok);
          }
        } catch (err) {
          failure = err;
        }
        if (failure !== undefined || res === undefined) {
          emitAuthAudit(deps, request, 'admin_claim.nominee_correction_rejected', {
            actorId,
            pariwarId: p,
            resourceLocator: locator(claimCaseId),
            context: { claim_case_id: claimCaseId, correction_id: correctionId, step: which, reason: auditReason(failure) },
          });
          return translateCorrection(failure);
        }
        emitAuthAudit(
          deps,
          request,
          which === 'district' ? 'admin_claim.nominee_correction_district_decided' : 'admin_claim.nominee_correction_pariwar_decided',
          {
            actorId,
            pariwarId: p,
            resourceLocator: locator(claimCaseId),
            context: { claim_case_id: claimCaseId, correction_id: correctionId, outcome: body.outcome, step: res.step },
          },
        );
        return { correction_id: correctionId, claim_case_id: claimCaseId, step: res.step, applied_version_id: res.appliedVersionId };
      };
    },

    /** GET — the Pariwar Admin's queue: corrections awaiting STEP 2. ⛔ No PII (ids, rank, channel, instants). */
    async listPendingForPariwarAdmin(request: FastifyRequest): Promise<NomineeCorrectionPendingListResponse> {
      const { scopeTx, pariwarId } = scopeOf(request);
      const { limit } = (request.query ?? {}) as { limit?: number };
      const rows = await claimDomain.listPendingNomineeCorrections(scopeTx.tx, pariwarId, 'pa_pending', limit !== undefined ? { limit } : {});
      return {
        items: rows.map((r) => ({
          correction_id: r.correctionId,
          claim_case_id: r.claimCaseId,
          rank: r.rank as 1 | 2,
          raised_via: r.raisedVia,
          raised_at: r.raisedAt.toISOString(),
        })),
      };
    },

    /** GET — the Pariwar Admin's `-239` refusals (D14). A NOTIFICATION surface, ⛔ never an approval step. */
    async listRefusals(request: FastifyRequest): Promise<NomineeRefusalListResponse> {
      const { scopeTx, actorId, pariwarId } = scopeOf(request);
      const { limit } = (request.query ?? {}) as { limit?: number };
      const rows = await claimDomain.listNomineeRefusals(scopeTx.tx, pariwarId, limit !== undefined ? { limit } : {});
      const p = scopeTx.pariwarId;
      const items = [];
      for (const r of rows) {
        items.push({
          claim_case_id: r.claimCaseId,
          deceased_member_id: r.deceasedMemberId,
          claim_state: r.claimState,
          refused_at: r.refusedAt.toISOString(),
          refused_by_display: r.refusedByDisplay,
          rationale:
            r.rationaleCiphertext === null
              ? null
              : await readable(() => decryptVerifierRationale(r.rationaleCiphertext!, p, enc), request.log, 'refusal_rationale', r.claimCaseId),
        });
      }
      emitAuthAudit(deps, request, 'admin_nominee_refusal.list_read', {
        actorId,
        pariwarId: p,
        context: { refusal_count: items.length },
      });
      // ⭐ ONE line per rationale the list ATTEMPTED to decrypt, locating its claim — 6.18's ruled precedent
      // (`queue_note_read`, BigDev 2026-09-23b option 1): the list line alone records that the page was
      // opened, ⛔ not whose Tier-1 rationale was shown. ⛔ NON-PII: ids only, never the rationale.
      for (const r of rows) {
        if (r.rationaleCiphertext === null) continue;
        emitAuthAudit(deps, request, 'admin_nominee_refusal.rationale_read', {
          actorId,
          pariwarId: p,
          resourceLocator: locator(r.claimCaseId),
          context: { claim_case_id: r.claimCaseId },
        });
      }
      return { items };
    },
  };
}

/**
 * `POST /api/v1/member/claims/:claimCaseId/nominee-corrections` — the FAMILY raises a correction through
 * the app (CC2, `-237` cl.3). A MEMBER route (session + the `nominee_change` step-up, AR-24 / D9), ⛔ no
 * admin chain, ⛔ no key.
 * Ravi-mode: the claim's deceased must BE the session's member (the nominee-bank precedent), else 404.
 * ⛔ The same core as the helpline raise, so the two surfaces cannot drift.
 */
export function createMemberNomineeCorrectionHandler(deps: AppDeps) {
  return async function raiseMember(request: FastifyRequest, reply: FastifyReply): Promise<NomineeCorrectionWriteResponse> {
    const memberId = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberId || !pariwarIdStr) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const { claimCaseId } = request.params as { claimCaseId: string };
    const body = request.body as NomineeCorrectionRaiseRequest;
    try {
      const { correctionId } = await raiseCorrectionCore(deps, {
        pariwarIdStr,
        claimCaseId,
        body,
        raisedVia: 'member_app',
        raisedByActorId: memberId,
        requireDeceasedMemberId: memberId,
      });
      emitAuthAudit(deps, request, 'member_claim.nominee_correction_raised', {
        actorId: memberId,
        pariwarId: pariwarIdStr,
        resourceLocator: locator(claimCaseId),
        context: { claim_case_id: claimCaseId, correction_id: correctionId, rank: body.rank, raised_via: 'member_app' },
      });
      void reply.status(201);
      return { correction_id: correctionId, claim_case_id: claimCaseId, step: 'da_pending', applied_version_id: null };
    } catch (err) {
      emitAuthAudit(deps, request, 'member_claim.nominee_correction_rejected', {
        actorId: memberId,
        pariwarId: pariwarIdStr,
        resourceLocator: locator(claimCaseId),
        context: { claim_case_id: claimCaseId, step: 'raise', reason: auditReason(err) },
      });
      return translateCorrection(err);
    }
  };
}
