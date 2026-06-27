// Medical-disclosure handlers — Story 3.5 (Task 6; AC1/AC2/AC3/AC4/AC6).
//
// The fourth signup-wizard SURFACE (between nominees 3.4 and payment 3.6). `submit` is THE
// load-bearing path: it persists ONE Tier-1-encrypted disclosure row (APPEND-ONLY history — R2),
// records a `consent_records` entry via the audit-or-throw chain (R3 — Story 3.5 is the FIRST
// consent-registry consumer in apps/api), and emits `member.medical_disclosed` via the projector
// — a NON-TRANSITION marker (from_state === to_state; R4). `status` returns the latest disclosure
// as a NON-PII summary + the history count. `imaList` returns the resolved catalog + ack copy.
//
// ── Audit-or-throw chain (R3 — mirror rules/index.ts:508-518) ─────────────────────────────
// Ordering inside submit: resolve BOTH clauses → writeAuditEntry (servicePool, BYPASSRLS, its own
// tx → auditId) → recordConsent({ auditId }) → appendMedicalDisclosure({ consentId }) →
// projectMemberState event → buildStatus → ok=true → emitAuthAudit (fire-and-forget, last). The
// consent insert + disclosure insert + event all run inside the member scope tx, so a throw rolls
// them back together (AC6). An orphan audit line on a later rollback is the known, benign artifact.
//
// ── PII discipline (R1) ──────────────────────────────────────────────────────────────────────
// Selected condition codes + free-text are Tier-1 encrypted in the handler before the accessor
// sees them; the event payload + audit hash carry only condition_count + ima_list_version + ack —
// NEVER the codes / free-text. The status response echoes count + a presence flag, never the bytes.
//
// ── Re-runnable for Story 3.9 (R3/scope guard) ───────────────────────────────────────────────
// `submit` is the re-runnable disclosure SERVICE: Story 3.9 attaches `requireMemberStepUp(deps,
// 'medical_disclosure_update')` on its Life Events route and reuses this handler with zero
// changes. NO step-up here (signup — the member holds a fresh signup-continuation session).

import { createHash } from 'node:crypto';

import {
  MedicalAckLocale,
  type ImaListResponse,
  type MedicalDiscloseRequest,
  type MedicalDisclosureStatusResponse,
  type MedicalDisclosureSummary,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  consent,
  ids,
  medical as medicalDomain,
  member as memberDomain,
} from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import {
  BadRequestError,
  ConflictError,
  ServiceUnavailableError,
  UnauthorizedError,
} from '../../http-errors.js';
import { emitAuthAudit } from '../auth/shared/audit.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { ScopeTx } from '../../types.js';
import { encryptMedicalField } from './medical-crypto.js';

/** Lifecycle states in which a medical disclosure is rejected (terminal — R2). */
const TERMINAL_STATES = new Set(['withdrawn', 'anonymized']);

export function createMedicalHandlers(deps: AppDeps) {
  const enc = deps.encryption;

  /** Read the authenticated member's (memberId, pariwarId) or fail 401. */
  function memberCtx(request: FastifyRequest): { memberIdStr: string; pariwarIdStr: string } {
    const memberIdStr = request.requestContext.actorId;
    const pariwarIdStr = request.requestContext.pariwarId;
    if (!memberIdStr || !pariwarIdStr) {
      throw new UnauthorizedError('Authentication required', 'auth.session_required');
    }
    return { memberIdStr, pariwarIdStr };
  }

  /** Map a stored disclosure row to its NON-PII summary (never the raw condition codes / free-text). */
  function toSummary(
    row: Awaited<ReturnType<typeof medicalDomain.getMedicalDisclosures>>[number],
  ): MedicalDisclosureSummary {
    return {
      disclosedAt: row.acknowledgedAt.toISOString(),
      imaListVersion: row.imaListVersion,
      conditionCount: row.conditionCount,
      // presence flag only — NEVER decrypt / echo the free-text bytes back.
      hasAdditionalContext: row.additionalContextCiphertext !== null,
      ackLocale: MedicalAckLocale.parse(row.acknowledgmentTextLocale),
    };
  }

  /**
   * Assemble the status view from the member's full history with ONE accessor call: `latest` is
   * the head (newest), `historyCount` is the row count (no separate COUNT query — R: one call,
   * two values). Decrypts NOTHING for the summary.
   */
  async function buildStatus(
    scopeTx: ScopeTx,
    pariwarId: ids.PariwarId,
    memberId: ids.MemberId,
  ): Promise<MedicalDisclosureStatusResponse> {
    const rows = await medicalDomain.getMedicalDisclosures(scopeTx.tx, pariwarId, memberId);
    const head = rows[0];
    return { latest: head ? toSummary(head) : null, historyCount: rows.length };
  }

  return {
    /**
     * POST /api/v1/member/medical-disclosure — submit a medical disclosure. Resolves BOTH clauses
     * (AC6), audit-or-throws a consent (R3), appends a disclosure row (append-only — R2), and emits
     * `member.medical_disclosed` (non-transition marker — R4). Rejected when the member is missing
     * (clean 409 — resolves 3.4 D3), terminal, the ack is not true (AC2), an IMA code is unknown,
     * or a required clause is unresolvable (AC6).
     */
    async submit(request: FastifyRequest): Promise<MedicalDisclosureStatusResponse> {
      const body = request.body as MedicalDiscloseRequest;
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const traceId = request.requestContext.traceId ?? null;

      // Server-enforce the ack (AC2/AC6) — never trust only the contract's z.literal(true). The
      // ack is ALWAYS required, even when zero conditions are selected (R5).
      if (body.acknowledged !== true) {
        throw new BadRequestError(
          'Concealment acknowledgment is required',
          'medical.acknowledgment_required',
        );
      }

      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const memberId = ids.memberId(memberIdStr);
        const pariwarId = ids.pariwarId(pariwarIdStr);

        // 1. Explicit member-existence probe FIRST (getMemberStateAt is non-nullable — a missing
        //    member replays to pending-kyc; this gives a clean 409 instead, resolving 3.4 D3).
        const exists = await memberDomain.memberExists(scopeTx.tx, pariwarId, memberId);
        if (!exists) {
          throw new ConflictError('Member not found', 'medical.member_not_found');
        }
        const state = await memberDomain.getMemberStateAt(scopeTx.tx, memberId, deps.clock());
        if (TERMINAL_STATES.has(state)) {
          throw new ConflictError(
            'Member is in a terminal state — medical disclosure cannot be recorded',
            'medical.member_terminal',
          );
        }

        // 3. Resolve BOTH clauses first (AC6 — atomically fail if either is absent, before any
        //    client-input validation that could mask a provisioning gap).
        const imaList = await medicalDomain.resolveImaList(scopeTx.tx, pariwarId);
        if (!imaList) {
          throw new ConflictError(
            'The IMA list is not available for this Pariwar',
            'medical.ima_list_unavailable',
          );
        }
        const concealment = await medicalDomain.resolveConcealmentClause(scopeTx.tx, pariwarId);
        if (!concealment) {
          throw new ConflictError(
            'The concealment clause is not available for this Pariwar',
            'medical.concealment_clause_unavailable',
          );
        }
        // 4. Validate EVERY submitted code against the resolved catalog (server-authoritative). The
        //    server's resolved version wins over any optimistic client `imaListVersion`.
        const unknownCodes = body.conditionCodes.filter(
          (c) => !medicalDomain.isKnownImaCode(imaList.conditions, c),
        );
        if (unknownCodes.length > 0) {
          throw new BadRequestError(
            `Unknown IMA condition codes: ${unknownCodes.join(', ')}`,
            'medical.unknown_condition_code',
          );
        }
        const ackText = medicalDomain.ackTextForLocale(concealment, body.ackLocale);

        // 4. Encrypt — ALWAYS, even when conditionCodes = [] (the column is non-null; '[]' encrypts
        //    to a valid ciphertext that round-trips).
        const disclosedConditionsCiphertext = await encryptMedicalField(
          canonicalJsonStringify(body.conditionCodes),
          pariwarIdStr,
          enc,
        );
        const additionalContextCiphertext = body.additionalContext
          ? await encryptMedicalField(body.additionalContext, pariwarIdStr, enc)
          : null;
        const conditionCount = body.conditionCodes.length;

        // 5. Audit-or-throw: write the audit line FIRST (servicePool, its own tx) — the hash is
        //    over NON-PII only (never the codes / free-text) — then thread its id.
        const requestPayloadHash = createHash('sha256')
          .update(
            canonicalJsonStringify({
              ima_list_version: imaList.version,
              condition_count: conditionCount,
              concealment_clause_version_id: concealment.clauseVersionId,
            }),
            'utf8',
          )
          .digest('hex');
        const auditRow = await audit.writeAuditEntry(deps.servicePool, {
          pariwarId: pariwarIdStr,
          actorId: memberIdStr,
          actorRole: null,
          action: 'member_medical.disclosed',
          resourceLocator: `member:${memberIdStr}:medical-disclosure`,
          requestPayloadHash,
          responseStatus: 200,
          traceId,
        });
        const auditId = auditRow.auditId;

        // 6. Record the consent (insert FIRST — let the DB mint consent_id; the disclosure carries
        //    its returned id). consent_artifact_ref = the niy.concealment.r14 clause_version_id.
        const consentRow = await consent.recordConsent(scopeTx.tx, {
          pariwarId,
          subjectId: memberIdStr,
          consentType: 'medical_disclosure_ack',
          consentArtifactRef: concealment.clauseVersionId,
          grantedViaActor: 'member_self',
          consentPayload: { checkboxTextShown: ackText, locale: body.ackLocale },
          auditId,
        });

        // 7. Append the disclosure row (append-only history — NO delete of prior rows).
        await medicalDomain.appendMedicalDisclosure(scopeTx.tx, {
          memberId,
          pariwarId,
          imaListVersion: imaList.version,
          disclosedConditionsCiphertext,
          additionalContextCiphertext,
          conditionCount,
          acknowledgmentTextLocale: body.ackLocale,
          clauseVersionId: concealment.clauseVersionId,
          consentId: consentRow.consentId,
        });

        // 8. Emit the non-transition marker event (from_state === to_state — R4). NON-PII payload.
        await memberDomain.projectMemberState(scopeTx.client, {
          memberId,
          pariwarId,
          eventType: 'member.medical_disclosed',
          payload: {
            from_state: state,
            to_state: state,
            trigger: 'medical_disclosure',
            actor: 'member',
            ima_list_version: imaList.version,
            condition_count: conditionCount,
            acknowledged: true,
            ack_locale: body.ackLocale,
          },
          actorId: memberIdStr,
        });

        // 9. Assemble the response; set ok=true ONLY after it succeeds (3.4 P2: if buildStatus
        //    throws, the scope tx rolls back and a fire-and-forget audit must NOT have fired).
        const result = await buildStatus(scopeTx, pariwarId, memberId);
        ok = true;
        // 10. Fire-and-forget audit, AFTER ok=true — NO PII (count + version only).
        emitAuthAudit(deps, request, 'member_medical.disclosed', {
          actorId: memberIdStr,
          pariwarId: pariwarIdStr,
          context: { ima_list_version: imaList.version, condition_count: conditionCount },
        });
        return result;
      } finally {
        // 11.
        await closeScopeTx(scopeTx, ok);
      }
    },

    /** GET /api/v1/member/medical-disclosure — the latest disclosure (NON-PII) + history count. */
    async status(request: FastifyRequest): Promise<MedicalDisclosureStatusResponse> {
      const { memberIdStr, pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const result = await buildStatus(
          scopeTx,
          ids.pariwarId(pariwarIdStr),
          ids.memberId(memberIdStr),
        );
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },

    /**
     * GET /api/v1/member/medical-disclosure/ima-list — the resolved IMA catalog (version +
     * bilingual conditions) + the concealment-ack copy. Returns 503 when EITHER clause is absent
     * (the registry is unprovisioned for this Pariwar — not a client error; the SUBMIT path uses
     * 409 per AC6, 503 is GET-only).
     */
    async imaList(request: FastifyRequest): Promise<ImaListResponse> {
      const { pariwarIdStr } = memberCtx(request);
      const scopeTx = await openScopeTx(deps, pariwarIdStr);
      let ok = false;
      try {
        const pariwarId = ids.pariwarId(pariwarIdStr);
        const imaList = await medicalDomain.resolveImaList(scopeTx.tx, pariwarId);
        if (!imaList) {
          throw new ServiceUnavailableError(
            'The IMA list is not provisioned for this Pariwar',
            'medical.ima_list_service_unavailable',
          );
        }
        const concealment = await medicalDomain.resolveConcealmentClause(scopeTx.tx, pariwarId);
        if (!concealment) {
          throw new ServiceUnavailableError(
            'The concealment clause is not provisioned for this Pariwar',
            'medical.concealment_clause_service_unavailable',
          );
        }
        const result: ImaListResponse = {
          version: imaList.version,
          conditions: imaList.conditions.map((c) => ({
            code: c.code,
            labelEn: c.label_en,
            labelHi: c.label_hi,
          })),
          ackText: { en: concealment.ackTextEn, hi: concealment.ackTextHi },
        };
        ok = true;
        return result;
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    },
  };
}
