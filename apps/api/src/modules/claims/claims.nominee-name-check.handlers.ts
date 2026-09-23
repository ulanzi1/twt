// The nominee NAME CHECK surface — Story 6.18 (AC2, AC3, AC9).
//
//   · GET  …/admin/claims/:claimCaseId/nominee-name-check — the two names, side by side.
//   · POST …/admin/claims/:claimCaseId/nominee-name-check — the District Admin's recorded verdict.
//
// `2026-09-19-226` cl.3/cl.5 (Trustee-ratified — Dhiraj Rahul + Kalpana Bharti): the District Admin
// looks at the holder name on each of the claim's two bank accounts beside the nominee(s) the member
// declared, and records whether they match. The system SHOWS; it ⛔ never compares and ⛔ never acts.
//
// ⛔⛔ TRAP 1 — NO COMPARISON HAPPENS IN THIS FILE. The read returns two INDEPENDENT lists; it does
// not pair an account with a nominee, order one by resemblance to the other, or emit any hint. There
// is no `nominee_rank` on an account by design (Story 6.8 D1 — the accounts are a claim-scoped
// payment channel), and nothing here invents one.
//
// ⛔⛔ TRAP 4 — THE PII RULES, which are the reason this route exists on its own key:
//   · The holder name and the filer's note are decrypted ONLY here, under
//     `claim.view_nominee_name_check`, from ONE per-claim read. ⛔ Never across a list.
//   · ⛔ NO name, ⛔ NO hash of a name and ⛔ NO note in any log, event payload, audit line, error
//     body or cache key. The audit line carries ids, ranks, verdicts and reason codes only.
//   · STRICT decrypt helpers, never the `…Soft` sentinel variants: a sentinel string entering a
//     human's name comparison would read as a name and could produce a false verdict. A failure is
//     reported AS a failure (`unreadable`), which is a different fact and must look like one.
//   · The nominee is a SECOND, LIVING Tier-1 subject — not the deceased — so their name is not
//     covered by the claim's own consent posture.

import { claim as claimDomain, ids, member as memberDomain, nominee as nomineeDomain, rbac } from '@twt/domain';
import type {
  ClaimsUnderCorrectionResponse,
  NomineeNameCheckAccount,
  NomineeNameCheckDeclaredNominee,
  NomineeNameCheckCurrent,
  NomineeNameCheckRequest,
  NomineeNameCheckResponse,
  NomineeNameCheckWriteResponse,
  ReadableName,
  ReadableNomineeName,
} from '@twt/contracts';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  AdminDisplayNameMissingError,
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { geoTreeResolverForRequest, loadActorGrants } from '../rbac/index.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import { decryptNomineeBankField } from './nominee-bank-crypto.js';
import { decryptTrusteeRationale } from './state-trustee-decision-crypto.js';
import { decryptNomineeField } from '../nominee/nominee-crypto.js';

/** The AC2 READ key — gates seeing the two names. */
export const NOMINEE_NAME_CHECK_VIEW_KEY = 'claim.view_nominee_name_check';
/** The AC3 WRITE key — gates recording the verdict. District Admin ONLY (`-226` cl.3). */
export const NOMINEE_NAME_CHECK_WRITE_KEY = 'claim.check_nominee_name';

/**
 * The RTBF sentinel `member/anonymize.ts` writes as an ENCRYPTED value. It decrypts SUCCESSFULLY to
 * this literal, so it can only be recognised after decryption — which is exactly why the DTO needs a
 * third state. ⛔ Rendering it as a name would present *"[anonymized]"* as the person the member
 * nominated.
 *
 * ⚠ IMPORTED, ⛔ NOT RE-SPELLED (code review 2026-09-20). This was a local `'[anonymized]'` literal;
 * every sibling handler imports the domain constant, and the WRITER owns the value. A change there
 * would have left this surface silently presenting the sentinel as a person's name.
 */
const ANONYMIZED_SENTINEL = memberDomain.ANONYMIZED_SENTINEL;

/**
 * Decrypt one Tier-1 field for this authorized surface, mapping a failure to `unreadable`.
 *
 * ⚠ The caught error is logged WITHOUT the ciphertext and WITHOUT any decrypted fragment — a decrypt
 * failure must not become the channel through which a name reaches the logs.
 */
async function readName(
  decrypt: () => Promise<string>,
  log: FastifyRequest['log'],
  what: string,
  claimCaseId: string,
): Promise<ReadableName> {
  try {
    const value = await decrypt();
    // ⚠ AN EMPTY DECRYPT IS A FAILURE, ⛔ not a person with no name (code review 2026-09-20). A
    // corrupt or legacy envelope can decrypt cleanly to `''`; reporting `{state:'readable', value:''}`
    // renders as a blank line that a District Admin reads as *"there is no name on this account"* —
    // a fact, and the wrong one. The soft decrypt helper already treats empty as a failure; this
    // matches it.
    if (value === '') {
      log.warn(
        { what, claimCaseId },
        'nominee-name-check: field decrypted to an empty string; returning unreadable',
      );
      return { state: 'unreadable' };
    }
    return { state: 'readable', value };
  } catch (err) {
    log.warn(
      { err: err instanceof Error ? err.name : 'unknown', what, claimCaseId },
      'nominee-name-check: field decrypt failed; returning unreadable',
    );
    return { state: 'unreadable' };
  }
}

/** Map a recorded domain check onto the wire shape. ⛔ Carries no name. */
function toCurrentCheck(
  check: claimDomain.RecordedNomineeNameCheck,
  actorDisplay: string,
): NomineeNameCheckCurrent {
  return {
    checked_at: check.checkedAt.toISOString(),
    checked_by_actor_display: actorDisplay,
    nominee_declaration_token: check.nomineeDeclarationToken,
    accounts: check.accounts.map((a) => ({
      account_rank: a.accountRank,
      account_updated_at: a.accountUpdatedAt,
      verdict: a.verdict,
      clerical_reason: a.clericalReason,
    })),
    passing: claimDomain.nomineeNameCheckPasses(check),
  };
}

/** Translate the domain write-path guards to stable 4xx codes (AC3). */
function translateNameCheckError(err: unknown): never {
  if (err instanceof claimDomain.NomineeNameCheckNotRecordableError) {
    throw new ConflictError(
      'The nominee name check cannot be recorded for this claim in its current state',
      'nominee_name_check.not_recordable',
      { state: err.currentState },
    );
  }
  if (err instanceof claimDomain.NomineeBankAccountsRequiredError) {
    // ⛔ NOT a denial and NOT a refusal of the claim — `-226` cl.7: the claim WAITS until both
    // accounts are given. The message says so, because an operator reading "required" could
    // otherwise reasonably conclude the claim is being rejected.
    throw new ConflictError(
      'This claim needs both bank accounts before it can be checked — it waits until they are added',
      'nominee_name_check.bank_details_required',
      { live_account_count: err.liveAccountCount },
    );
  }
  if (err instanceof claimDomain.NomineeNameCheckStaleError) {
    throw new ConflictError(
      'The bank details or the declared nominees changed after the names were read — please look again',
      'nominee_name_check.stale',
    );
  }
  if (err instanceof claimDomain.NomineeNameCheckInvalidError) {
    // ⚠ 400, ⛔ NOT 409 — the submission was never well-formed, so *"please look again"* would be
    // the wrong instruction. The boundary schema normally catches these; this fires when a
    // non-route caller (or a schema regression) reaches the domain with an incoherent verdict pair,
    // duplicate ranks, or no actor display name.
    throw new BadRequestError(
      'The nominee name check submission is not valid',
      'nominee_name_check.invalid',
      { detail: err.detail },
    );
  }
  if (err instanceof claimDomain.ClaimStreamConcurrencyError) {
    // ⛔ NOT a 500. `recordNomineeNameCheck` calls `projectClaimState`, which raises this on a
    // `(stream_id, event_version)` race. The sibling decision handlers have always mapped it to a
    // 409; this one ended at `throw err` and surfaced as an unexplained server error.
    // ⚠ Reachability is narrow — the claim row lock serialises every lock-holding writer, so it
    // needs an appender that skips the lock — but the sibling set should agree.
    throw new ConflictError(
      'Another change to this claim landed at the same moment — please try again',
      'nominee_name_check.stream_conflict',
    );
  }
  throw err;
}

/**
 * The domain errors this route is prepared to explain — and therefore the ONLY ones whose name may
 * ride the `…_rejected` audit line (code review 2026-09-20).
 *
 * ⚠ WHY A CLOSED VOCABULARY. The rejected line used to carry `err.name` for EVERY throw, so a DB
 * outage, a KMS failure or a plain bug wrote its internal class name into the audit stream as if it
 * were a governance outcome. An audit reader cannot tell *"the District Admin was refused"* from
 * *"the server fell over"* if both look the same. Anything unrecognised is recorded as
 * `unexpected_error` — true, and ⛔ not a leak of our internals.
 */
const AUDITED_REJECTION_REASONS = new Set([
  'NomineeNameCheckNotRecordableError',
  'NomineeBankAccountsRequiredError',
  'NomineeNameCheckStaleError',
  'NomineeNameCheckInvalidError',
  'ClaimStreamConcurrencyError',
]);

function auditedRejectionReason(err: unknown): string {
  const name = err instanceof Error ? err.name : 'unknown';
  return AUDITED_REJECTION_REASONS.has(name) ? name : 'unexpected_error';
}

export function createNomineeNameCheckHandlers(deps: AppDeps) {
  return {
    NOMINEE_NAME_CHECK_VIEW_KEY,
    NOMINEE_NAME_CHECK_WRITE_KEY,

    /**
     * GET — the two names, the filer's note, the dates, and the current check if there is one.
     *
     * The route chain [adminSession, scope, resolveDistrict, requirePermission(view, district)] has
     * already enforced an authenticated HUMAN actor + tenant + district scope. This handler
     * assembles the packet and emits the AUDITED read line. It emits ⛔ no `claim.*` event and takes
     * ⛔ no decision.
     */
    async getNomineeNameCheck(request: FastifyRequest): Promise<NomineeNameCheckResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      const district = request.nomineeNameCheckDistrict;
      if (!scopeTx || !actorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      if (district == null) {
        // Defensive: the district preHandler + the permission gate should already have denied.
        throw new ForbiddenError('Authorization required', 'auth.forbidden');
      }
      const { claimCaseId } = request.params as { claimCaseId: string };
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const cid = ids.claimId(claimCaseId);

      const claimRow = await claimDomain.getClaimCase(scopeTx.tx, pariwarId, cid);
      if (!claimRow) throw new NotFoundError('Claim not found', 'claim.not_found');

      const accountRows = await claimDomain.getClaimNomineeBankAccountsCiphertext(
        scopeTx.tx,
        pariwarId,
        cid,
      );
      const nomineeRows = await nomineeDomain.getMemberNominees(
        scopeTx.tx,
        pariwarId,
        claimRow.deceasedMemberId,
      );

      // ── The bank side. ⛔ Account number, raw IFSC and VPA are NEVER read here. ──
      const accounts: NomineeNameCheckAccount[] = [];
      for (const row of accountRows) {
        const holderName = await readName(
          () => decryptNomineeBankField(row.accountHolderNameCiphertext, scopeTx.pariwarId, deps.encryption),
          request.log,
          'holder_name',
          claimCaseId,
        );
        const note =
          row.nameDifferenceNoteCiphertext == null
            ? null
            : await readName(
                () =>
                  decryptNomineeBankField(
                    row.nameDifferenceNoteCiphertext as string,
                    scopeTx.pariwarId,
                    deps.encryption,
                  ),
                request.log,
                'name_difference_note',
                claimCaseId,
              );
        accounts.push({
          account_rank: row.accountRank as 1 | 2,
          account_updated_at: row.updatedAt.toISOString(),
          holder_name: holderName,
          name_difference_note: note,
        });
      }

      // ── The declared-nominee side. ⛔ No mobile, ⛔ no address. ──
      const declaredNominees: NomineeNameCheckDeclaredNominee[] = [];
      for (const row of nomineeRows) {
        let nomineeName: ReadableNomineeName;
        const read = await readName(
          () => decryptNomineeField(row.nameCiphertext, scopeTx.pariwarId, deps.encryption),
          request.log,
          'nominee_name',
          claimCaseId,
        );
        if (read.state === 'readable' && read.value === ANONYMIZED_SENTINEL) {
          // ⭐ Decrypted fine — but it is the RTBF sentinel, not a name. Reported as its own state.
          nomineeName = { state: 'anonymized' };
        } else {
          nomineeName = read;
        }
        declaredNominees.push({
          rank: row.rank,
          split_pct: row.splitPct,
          relationship: row.relationship,
          nominee_name: nomineeName,
        });
      }

      // ── The tokens and the two plain dates (⛔ no highlight, ⛔ no derived warning) ──
      const declarationRefs = nomineeRows.map((r) => ({ rank: r.rank, createdAt: r.createdAt }));
      const declarationToken = claimDomain.deriveNomineeDeclarationToken(declarationRefs);
      const nomineeDeclaredAt =
        declarationRefs.length === 0
          ? null
          : new Date(Math.max(...declarationRefs.map((r) => r.createdAt.getTime()))).toISOString();

      // ── The current check, if it is still current (AC3). `null` also covers "went stale". ──
      const recorded = await claimDomain.getLatestNomineeNameCheck(scopeTx.tx, pariwarId, cid);
      const liveAccountRefs = accountRows.map((r) => ({
        accountRank: r.accountRank,
        updatedAt: r.updatedAt,
      }));
      const recordedIsCurrent =
        recorded !== null &&
        claimDomain.isNomineeNameCheckCurrent(recorded, liveAccountRefs, declarationToken);
      const currentCheck = recordedIsCurrent && recorded ? toCurrentCheck(recorded, recorded.checkedByActorDisplay) : null;
      // ⭐ "Somebody checked, and then the details moved" is a DIFFERENT fact from "nobody has
      // checked" — and the console showed the same sentence for both until this was added.
      const latestCheckIsStale = recorded !== null && !recordedIsCurrent;

      // ── The Pariwar Admin's live RETURN (AC11), shown where the District Admin acts ──
      // `-227` cl.10 asks the District Admin to get the discrepancy corrected and re-check; the note
      // saying WHAT to correct belongs beside the names they are about to re-read.
      const returnRow = await claimDomain.getLiveCorrectionReturn(scopeTx.tx, pariwarId, cid);
      const correctionReturn =
        returnRow === undefined
          ? null
          : {
              returned_at: returnRow.decidedAt.toISOString(),
              returned_by_actor_display: returnRow.actorDisplay,
              note:
                returnRow.rationaleCiphertext === null
                  ? ({ state: 'unreadable' } as const)
                  : await readName(
                      () =>
                        decryptTrusteeRationale(
                          returnRow.rationaleCiphertext as string,
                          scopeTx.pariwarId,
                          deps.encryption,
                        ),
                      request.log,
                      'correction_return_note',
                      claimCaseId,
                    ),
              // ⭐ DERIVED — ⛔ no resubmit route and ⛔ no new key. The District Admin re-checking IS
              // the resubmission, and this reuses the very predicate the Pariwar Admin's vote reads,
              // so the console can never say "resubmitted" while the vote still refuses.
              resubmitted: await claimDomain.isReturnedClaimResubmitted(
                scopeTx.tx,
                pariwarId,
                cid,
                claimRow.deceasedMemberId,
                returnRow.decidedAt,
              ),
            };

      // AUDITED read — NON-PII context ONLY (Trap 4). ⛔ No name, ⛔ no hash, ⛔ no note.
      emitAuthAudit(deps, request, 'admin_nominee_name_check.read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        // ⭐ NAMES THE CLAIM — this line exists to record WHO looked at a living person's Tier-1
        // name and ON WHICH CLAIM. Without a locator the row defaulted to `user:<actorId>` and the
        // second half of that sentence was missing.
        resourceLocator: `claim:${claimCaseId.toLowerCase()}`,
        context: {
          claim_case_id: claimCaseId,
          district,
          deceased_member_id: claimRow.deceasedMemberId,
          account_ranks: accountRows.map((r) => r.accountRank),
          declared_nominee_count: nomineeRows.length,
        },
      });

      return {
        claim_case_id: claimCaseId,
        claim_state: claimRow.currentState,
        deceased_member_id: claimRow.deceasedMemberId,
        accounts,
        // ⭐ Said explicitly, never inferred from an empty array (AC2/AC6).
        accounts_complete: accountRows.length === 2,
        declared_nominees: declaredNominees,
        nominee_declaration_token: declarationToken,
        nominee_declared_at: nomineeDeclaredAt,
        claim_filed_at: claimRow.createdAt.toISOString(),
        current_check: currentCheck,
        latest_check_is_stale: latestCheckIsStale,
        correction_return: correctionReturn,
      };
    },

    /**
     * GET …/admin/claims/under-correction — the District Admin's CORRECTION QUEUE (AC11).
     *
     * ⚠⚠ THE SCOPE FILTER IS THE AUTHORIZATION BOUNDARY HERE, and it is worth being explicit
     * about why it looks different from every sibling route. A per-claim route resolves ONE
     * district and the RBAC hook refuses the whole request; a LIST has no single district to gate
     * on. So the route gate proves the caller holds `claim.view_nominee_name_check` somewhere in
     * this Pariwar, and every ROW is then tested with `rbac.hasPermission` for THAT KEY at the row's
     * district — the SAME predicate the per-claim gate evaluates, so the two cannot drift apart.
     * A District Admin for Patna sees Patna's returned claims and ⛔ not Vaishali's; a
     * `pariwar`-ceiling holder (pariwar_admin, super_admin) sees all of them, exactly as that
     * ceiling already implies ([[project_rbac_geo_scope_containment]]).
     * ⚠⚠ IT WAS RAW `rbac.scopeContains` OVER EVERY GRANT UNTIL 2026-09-23b, and this comment called
     * that "the SAME predicate". It was not: `hasPermission` also requires the grant's ROLE to carry
     * the key and the grant to sit within its role's ceiling. A District Admin who ALSO held any
     * key-less wider grant (`auditor`/`finance_officer` at `pariwar`, `state_trustee` at `state`)
     * saw every district's returned claims — and their decrypted return notes.
     * ⭐ The test runs INSIDE the domain read, BEFORE its page limit (`isVisible`), so a District
     * Admin's own rows are never crowded out by rows they cannot see.
     * ⛔ A row whose district cannot be resolved (`null`) is DROPPED, ⛔ never shown: an unresolved
     * locator fails closed, which is what `hasPermission` itself does with a null target.
     */
    async getClaimsUnderCorrection(request: FastifyRequest): Promise<ClaimsUnderCorrectionResponse> {
      const scopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      if (!scopeTx || !actorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      const pariwarId = ids.pariwarId(scopeTx.pariwarId);
      const grants = request.scopeGrants ?? (await loadActorGrants(scopeTx, actorId));
      const geoTree = geoTreeResolverForRequest(request);

      const limit = (request.query as { limit?: number } | undefined)?.limit;
      const isVisible = (row: { readonly district: string | null }): boolean =>
        rbac.hasPermission(
          grants,
          NOMINEE_NAME_CHECK_VIEW_KEY,
          { dimension: 'district', value: row.district, pariwarId: scopeTx.pariwarId },
          { resolver: geoTree },
        );
      const visible = await claimDomain.listClaimsUnderCorrection(scopeTx.tx, pariwarId, {
        ...(limit !== undefined ? { limit } : {}),
        isVisible,
      });

      const items = await Promise.all(
        visible.map(async (row) => ({
          claim_case_id: row.claimCaseId,
          deceased_member_id: row.deceasedMemberId,
          claim_state: row.currentState,
          claim_filed_at: row.claimFiledAt.toISOString(),
          returned_at: row.returnedAt?.toISOString() ?? null,
          returned_by_actor_display: row.returnedByActorDisplay,
          return_note:
            row.returnNoteCiphertext === null
              ? null
              : await readName(
                  () =>
                    decryptTrusteeRationale(
                      row.returnNoteCiphertext as string,
                      scopeTx.pariwarId,
                      deps.encryption,
                    ),
                  request.log,
                  'correction_return_note',
                  row.claimCaseId,
                ),
          sent_back_by_check: row.sentBackByCheck,
          accounts_complete: row.accountsComplete,
        })),
      );

      // AUDITED — who looked at the correction queue, and how much of it they could see.
      // ⛔ NON-PII: counts and ids only, ⛔ no name and ⛔ no note.
      emitAuthAudit(deps, request, 'admin_nominee_name_check.queue_read', {
        actorId,
        pariwarId: scopeTx.pariwarId,
        context: { visible_count: items.length },
      });
      // ⭐ ONE LINE PER DECRYPTED RETURN NOTE, locating its claim (BigDev 2026-09-23b, option 1).
      // The `queue_read` line above says the queue was opened; ⛔ it cannot say whose notes were
      // shown (its context is only hashed). The per-claim read of the same note leaves a
      // claim-locatable line, so this surface now does too. ⛔ NON-PII: ids + district, never the note.
      for (const row of visible) {
        if (row.returnNoteCiphertext === null) continue;
        emitAuthAudit(deps, request, 'admin_nominee_name_check.queue_note_read', {
          actorId,
          pariwarId: scopeTx.pariwarId,
          resourceLocator: `claim:${row.claimCaseId.toLowerCase()}`,
          context: { claim_case_id: row.claimCaseId, district: row.district },
        });
      }

      return { pariwar_id: scopeTx.pariwarId, items };
    },

    /**
     * POST — the District Admin records the per-account verdict.
     *
     * Opens its OWN scope tx (a WRITE), so the domain writer's claim lock and its token re-validation
     * run in one transaction with the event append.
     */
    async postNomineeNameCheck(
      request: FastifyRequest,
      reply: FastifyReply,
    ): Promise<NomineeNameCheckWriteResponse> {
      const outerScopeTx = request.scopeTx;
      const actorId = request.requestContext.actorId;
      const district = request.nomineeNameCheckDistrict;
      if (!outerScopeTx || !actorId) {
        throw new UnauthorizedError('Authentication required', 'auth.session_required');
      }
      if (district == null) throw new ForbiddenError('Authorization required', 'auth.forbidden');

      const { claimCaseId } = request.params as { claimCaseId: string };
      const body = request.body as NomineeNameCheckRequest;

      // R5 — the acting District Admin's display name is resolved SERVER-SIDE and snapshotted; the
      // request never carries an actor identity ([[project_admin_display_name_attribution]]).
      //
      // ⭐⭐ A MISSING NAME BLOCKS THE CHECK, BEFORE THE TRANSACTION OPENS (D3 = option A, code
      // review 2026-09-20). It used to be `?? ''`, which was never passed to the writer at all: the
      // 201 carried a real name, the event carried none, and every later read of that check showed
      // `—`. The whole design rests on *a NAMED HUMAN read the two names*, so an unattributable
      // check is worse than no check — it looks like a judgement someone made. The sibling handlers
      // already throw here; this one now matches them ([[project_admin_display_name_attribution]]).
      const resolvedDisplay = await getDisplayName(deps.pool, actorId);
      if (resolvedDisplay == null || resolvedDisplay.trim() === '') {
        throw new AdminDisplayNameMissingError(actorId);
      }
      const actorDisplay = resolvedDisplay;

      const scopeTx = await openScopeTx(deps, outerScopeTx.pariwarId);
      let ok = false;
      let result: Awaited<ReturnType<typeof claimDomain.recordNomineeNameCheck>> | undefined;
      let failure: unknown;
      try {
        result = await claimDomain.recordNomineeNameCheck(scopeTx.client, {
          claimCaseId: ids.claimId(claimCaseId),
          pariwarId: ids.pariwarId(outerScopeTx.pariwarId),
          nomineeDeclarationToken: body.nominee_declaration_token,
          accounts: body.accounts.map((a) => ({
            accountRank: a.account_rank,
            accountUpdatedAt: a.account_updated_at,
            verdict: a.verdict,
            clericalReason: a.clerical_reason ?? null,
          })),
          actorId,
          actorDisplay,
          actor: 'operator',
        });
        ok = true;
      } catch (err) {
        failure = err;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }

      // ⭐⭐ THE AUDIT LINES ARE EMITTED AFTER THE TRANSACTION IS CLOSED, AND THAT IS THE WHOLE
      // POINT OF THIS SHAPE (code review 2026-09-20). They used to sit INSIDE the `try`, under a
      // comment that said "Post-commit" — but `closeScopeTx` runs in the `finally`, i.e. AFTER them.
      // Two ways that lied:
      //   · a COMMIT that failed still wrote a `nominee_name_checked` line for a check that never
      //     landed, and no `_rejected` line (the `finally` runs after the `catch`);
      //   · anything that threw after `ok = true` wrote `_rejected` for a check that DID commit.
      // The cycle-freeze and verification-decision handlers already emitted after the `finally`;
      // this one is now consistent with them, and each line means what it says.
      if (failure !== undefined || result === undefined) {
        // Fail-closed AND audited (the 6.11 `decision_rejected` posture) — a refused check attempt
        // still leaves a trail. ⛔ The error context carries no name and no note.
        emitAuthAudit(deps, request, 'admin_claim.nominee_name_check_rejected', {
          actorId,
          pariwarId: outerScopeTx.pariwarId,
          // ⭐ NAMES THE CLAIM. `emitAuthAudit` HASHES `context` into `request_payload_hash` and
          // `audit_log_entries` has no context column, so without a locator the row read
          // `user:<actorId>` and an auditor could not tell WHICH claim was refused.
          resourceLocator: `claim:${claimCaseId.toLowerCase()}`,
          context: {
            claim_case_id: claimCaseId,
            district,
            reason: auditedRejectionReason(failure),
          },
        });
        return translateNameCheckError(failure);
      }

      // Post-commit sink line. NON-PII: ranks, verdicts and reason codes — ⛔ never a name.
      emitAuthAudit(deps, request, 'admin_claim.nominee_name_checked', {
        actorId,
        pariwarId: outerScopeTx.pariwarId,
        resourceLocator: `claim:${claimCaseId.toLowerCase()}`,
        context: {
          claim_case_id: claimCaseId,
          district,
          verdicts: body.accounts.map((a) => ({
            account_rank: a.account_rank,
            verdict: a.verdict,
            clerical_reason: a.clerical_reason ?? null,
          })),
        },
      });

      void reply.status(201);
      return {
        claim_case_id: claimCaseId,
        claim_state: result.claimState,
        checked_at: result.check.checkedAt.toISOString(),
        event_version: result.eventVersion,
        // ⭐ Read back off the RECORDED check, ⛔ not off the local variable — so the 201 and every
        // later GET are the same snapshot, from the same payload.
        current_check: toCurrentCheck(result.check, result.check.checkedByActorDisplay),
      };
    },
  };
}
