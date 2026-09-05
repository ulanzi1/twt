// Nominee-bank masking-schedule admin handlers — Story 11b.3a (Task 5; AC5, AC6).
//
// Thin handlers over the `@twt/domain` masking-schedule accessors, on the scoped admin chain
// [requireAdminSession, scopeResolutionHook, requirePermissionHook(
// pariwar.manage_nominee_bank_masking)] — the `directory-publication` precedent, which is itself the
// `degraded-mode` one. The mechanism — rationale, audit anchor, actor/display consistency, the grant
// check, the close-head-then-insert-head supersession — is owned ENTIRELY by
// `setNomineeBankMaskingSchedule` and is ⛔ NOT re-implemented here. This module's whole job is to
// assemble a correctly-shaped input and call it.
//
// Governance of record: `2026-08-28-160` cl.10(b)-(d) (Trustee-ratified) · `2026-09-02-178` (D8(ii)
// — the knob is the TRUST's, centrally: `super_admin`) · `2026-09-02-179` cl.1 (D8-default
// FAIL-OPEN) · `2026-09-02-183` cl.1-3 (D8(i) — the key, minted; catalog v39).
//
// ── ⚠⭐ THE PROJECT'S FIRST SELF-SERVE PRESENTATION-TOGGLE UI, AND SAYING SO IS THE POINT ────────
// Story 11a.1 shipped ⛔ NO admin toggle screen, deliberately, as a scope boundary: presentation
// changes have so far been governed by a WRITE PATH with required rationale + actor + audit anchor
// and ⛔ no screen at all. ⛔ That is ⛔ not a reason to refuse this screen — `2026-09-02-178` put the
// authority centrally and a lever with no surface is the thing `2026-08-21-147` cl.1(c) withdrew as
// an acceptable answer for the sibling kill switch. ⭐ It IS a reason to record the first.
//
// ── The rejection paths, each with a DESIGNED status ────────────────────────────────────────────────
//   400 — an empty/whitespace rationale, or a day count outside 0…MAX, rejected at the CONTRACT
//         boundary (`SetNomineeBankMaskingRequest`).
//   401 — no admin session (`requireAdminSession`).
//   403 — the session lacks the grant (`requirePermissionHook`). ⭐ THIS is the denial path, and it
//         is the one `pariwar_admin` hits: `2026-09-02-178` FORECLOSED that role.
//   409 — the acting admin has no `users.display_name` (`AdminDisplayNameMissingError`).
// ⛔ NONE of them is a 500. `UngovernedNomineeBankMaskingChangeError` `extends Error` (not
// `ApiError`) and is NOT registered in `middleware/error-mapping/index.ts`, whose documented default
// is "Anything else → 500". It is the domain's BACKSTOP; if a denied caller ever reaches it, the
// route's own gate is missing — fix the gate, ⛔ never widen an assertion to accept the 500.
//
// ── PII discipline ──────────────────────────────────────────────────────────────────────────────────
// ⛔⛔ NOTHING HERE READS, DECRYPTS, LOGS OR ECHOES A BANK FIELD. This module writes a per-Pariwar
// SETTING; `2026-08-28-160` cl.10(g) keeps the complete details in the protected internal record and
// masking is a PROJECTION applied on the PUBLIC read path. The config row + audit lines carry ids +
// timestamps + the chosen setting + a staff-authored rationale + the acting admin's controlled
// `users.display_name`. ⛔ NEVER an account number, holder name, IFSC or VPA.

import { createHash, randomUUID } from 'node:crypto';

import type {
  NomineeBankMaskingScheduleResponse,
  SetNomineeBankMaskingRequest,
} from '@twt/contracts';
import {
  audit,
  canonicalJsonStringify,
  claim as claimDomain,
  ids,
  schema,
  type Db,
} from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';

/**
 * The `pariwar.manage_nominee_bank_masking` key (Story 11b.3a, catalog v39) — `super_admin` ONLY.
 * ⛔ Sourced from the domain constant, ⛔ not re-typed: the key string lives in one place.
 */
const MANAGE_NOMINEE_BANK_MASKING_KEY = claimDomain.NOMINEE_BANK_MASKING_PERMISSION_KEY;

/** The Story 1.10 audit action — dotted-lowercase MULTI-dot (the writer's regex permits multiple). */
const AUDIT_ACTION_CHANGED = 'pariwar.nominee_bank_masking.changed';

/**
 * Serialize a schedule row → the transport DTO (Date → Iso8601 at the boundary).
 *
 * ⭐ A `null` row is `configured: false`, which under `D8-default` (`2026-09-02-179` cl.1) means
 * **FAIL-OPEN** — details stay FULLY VISIBLE after close until the Trust sets a window. ⚠⛔ That is a
 * DIFFERENT FACT from a Trust that deliberately chose a long window, and the operator is shown which
 * one they are looking at. ⛔ Never signal absence only by all-null attribution fields.
 */
function toScheduleDto(
  row: schema.PariwarNomineeBankMaskingScheduleRow | null,
): NomineeBankMaskingScheduleResponse {
  if (row === null) {
    return {
      setting: null,
      configured: false,
      effectiveFrom: null,
      changedByDisplay: null,
      rationale: null,
      version: null,
    };
  }
  return {
    // ⭐ Mapped through the DOMAIN's own row→setting function, ⛔ not re-derived here: it is the one
    // place that knows a NULL `mask_after_days` on an `after_days` row means the DB CHECK is gone,
    // and it throws loudly rather than picking a side.
    setting: claimDomain.settingFromRow(row),
    configured: true,
    effectiveFrom: row.effectiveFrom.toISOString(),
    changedByDisplay: row.changedByDisplay,
    rationale: row.rationale,
    version: row.version,
  };
}

export function createNomineeBankMaskingHandlers(deps: AppDeps) {
  /** Read the scope-resolved tx + actor, or throw (the route chain guarantees both are present). */
  function scopeCtx(request: FastifyRequest): { tx: Db; pariwarIdStr: string; actorId: string } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) {
      throw new Error('[nominee-bank-masking] handler ran without session + scope-resolution');
    }
    return { tx: scopeTx.tx, pariwarIdStr: scopeTx.pariwarId, actorId };
  }

  return {
    MANAGE_NOMINEE_BANK_MASKING_KEY,

    /**
     * GET the Pariwar's current masking schedule (absent row ⇒ the unconfigured, FAIL-OPEN shape).
     *
     * ⚠ Reads the OPEN HEAD (what is configured), ⛔ not the window in force at `now` — they differ
     * only for a head whose `effective_from` is in the future, which this write path cannot create
     * (it always takes the server's instant). The console shows what a person set.
     */
    async getSchedule(request: FastifyRequest): Promise<NomineeBankMaskingScheduleResponse> {
      const { tx, pariwarIdStr } = scopeCtx(request);
      const row = await claimDomain.getNomineeBankMaskingHead(tx, ids.pariwarId(pariwarIdStr));
      return toScheduleDto(row);
    },

    /**
     * PUT the governed change (close the head + insert a new one + audit, compensated on failure
     * per ADR-0030).
     *
     * ⚠⛔ THE EFFECT ON THE PUBLIC SURFACE IS ⛔ NOT IMMEDIATE, and this is one of the THREE places
     * that is written down (the schema file and the public route header carry the others):
     * `/sahyog-vivran/[driveToken]` is `edge_cacheable` at `s-maxage=300`, so the
     * PREVIOUS projection keeps being served from every warm PoP for up to five minutes — and here
     * what is served stale is a **FULL ACCOUNT NUMBER**. ⛔ **Direct SQL is NOT the operational
     * fallback**, in this code, in the console copy, or anywhere else. The console discloses the gap;
     * ⛔ nothing here may imply otherwise.
     */
    async setSchedule(request: FastifyRequest): Promise<NomineeBankMaskingScheduleResponse> {
      const { tx, pariwarIdStr, actorId } = scopeCtx(request);
      const body = request.body as SetNomineeBankMaskingRequest;
      const pariwarId = ids.pariwarId(pariwarIdStr);

      // Fail-closed: a missing display name BLOCKS the change rather than falling back to an email
      // or an id ([[project_admin_display_name_attribution]]). ⛔ The client NEVER supplies this — a
      // browser-supplied display name would let an operator lie about who changed how long a
      // family's bank account number stays public. Resolved BEFORE the domain write so the 409
      // arrives without a partial state change.
      const actorDisplay = await getDisplayName(deps.pool, actorId);
      if (actorDisplay === null) {
        throw new AdminDisplayNameMissingError(actorId);
      }

      // Pre-generate the §1.5 audit anchor so the audit intent line and the inserted row agree on it
      // (writing the LINE is the caller's obligation — the domain's 10.12 narrow-write posture).
      const auditId = randomUUID();
      // ⭐ ONE INSTANT for the close and the insert. `setNomineeBankMaskingSchedule` closes the prior
      // head AT this instant and opens the new one AT it, so there is ⛔ no sub-millisecond gap with
      // no row in force. ⛔ Never let the accessor default it, and ⛔ never pass a caller-supplied
      // instant: a back-dated window would retroactively re-characterise what this setting was in
      // force for, and when. ⛔ [Review, 11b.11] This schedule has ⛔ NO PUBLIC CONSUMER as of Story
      // 11b.11 — the public Sahyog Vivran read no longer resolves it, so a gap here no longer
      // exposes an account number on that surface; it is retained dormant.
      const effectiveFrom = deps.clock();

      return audit.withCompensatingAudit(deps.servicePool, {
        // Audit over the PII-free change fields. ⛔ NO bank field of any kind appears here.
        auditIntent: {
          pariwarId: pariwarIdStr,
          actorId,
          actorRole: null,
          action: AUDIT_ACTION_CHANGED,
          // A NEW locator site — constructed narrowly (this Pariwar's schedule + the chosen setting)
          // and ⛔ not a widening of any existing locator (the `2026-08-21-146` re-examination
          // trigger on resourceLocator widening).
          resourceLocator: `pariwar/${pariwarIdStr}/nominee-bank-masking;mode=${body.setting.mode}`,
          requestPayloadHash: createHash('sha256')
            .update(
              canonicalJsonStringify({
                pariwar_id: pariwarIdStr,
                audit_id: auditId,
                mode: body.setting.mode,
                mask_after_days:
                  body.setting.mode === 'after_days' ? body.setting.maskAfterDays : null,
                effective_from: effectiveFrom.toISOString(),
                rationale: body.rationale,
              }),
              'utf8',
            )
            .digest('hex'),
          traceId: request.requestContext.traceId ?? null,
        },
        mutate: async () => {
          const row = await claimDomain.setNomineeBankMaskingSchedule(tx, {
            pariwarId,
            setting: body.setting,
            effectiveFrom,
            changedByActor: ids.userId(actorId),
            changedByDisplay: actorDisplay,
            rationale: body.rationale,
            auditId,
            // The grants `scopeResolutionHook` already loaded — ⛔ do NOT call loadActorGrants again.
            // `?? []` is the house fail-closed idiom: an absent value must resolve to NO grants, not
            // to an unchecked write. ⚠ The domain's own check is a BACKSTOP; `requirePermissionHook`
            // is what produces the 403 a denied caller actually sees.
            actorGrants: request.scopeGrants ?? [],
          });
          return toScheduleDto(row);
        },
      });
    },
  };
}
