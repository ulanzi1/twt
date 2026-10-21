// The WhatsApp CODE handlers — Story 5.13 (WC1–WC5, WC9, WC10, WC15–WC17; AC1, AC2, AC4–AC6, AC8, AC11; Decision 2026-10-21-374
// option A, Trustee-ratified; build decisions in Decision 2026-10-21-376). For a member signing up whose WhatsApp is on another
// phone: the server sends a 6-digit code to the REGISTERED number (I2) and a correct code typed back writes the SAME consent row
// and PENDING → ACTIVE transition as the member's own WhatsApp message (I5). A code switches on WhatsApp and nothing else — its
// own table, its own routes, ⛔ a session, ⛔ a step-up, ⛔ `member_auth_otps` (I4); only the `otp.ts` PRIMITIVES are reused.
//
// ⭐ THE SEND, in FIVE steps (WC1) — every failure that is ⛔ Meta's happens BEFORE anything is counted:
//   0. pre-check: every DATABASE read in a short READ-ONLY scope tx (T19 — the tables are tenant-RLS), CLOSED before any network
//      call; the refusals in their ONE order (`checkCodeSendAllowed`) ⇒ a refusal answers here with ⛔ decrypt (⛔ KMS line);
//   1. resolve (code-delivery.ts): config + template name + token + decrypt + the client, bounded, ⛔ tx open (T3) ⇒ 503;
//   2. claim (tx 1): lock → the refusals RE-DECIDED (config + state re-read) BEFORE any audit wrapper (T14) →
//      `withCompensatingAudit(member.wa_opt_in_code_sent, insertCodeSlot)` → COMMIT;
//   3. send: ONLY the Meta call, ⛔ tx, ⛔ lock;
//   4. outcome (tx 2): lock → `recordCodeSendOutcome` (a `released` mark inside `withCompensatingAudit(…code_released)`) →
//      COMMIT → only THEN the 502 / 503 (the commit-then-throw rule — T14).
// ⭐ THE VERIFY, in THREE steps (WC5) — a refusal inside the wrapper would write "activated" + `_rolled_back` AND roll back a wrong
// attempt (tries unlimited): (1) lock → ACTIVE / PENDING check → the live codes → `matchCode` (constant time, every row, ⛔ early
// exit), all OUTSIDE any wrapper; (2) correct → the activation inside `withCompensatingAudit(member.wa_opt_in_activated)`;
// (3) wrong / ⛔ live code → `recordWrongAttempt` inside `withCompensatingAudit(member.wa_opt_in_code_rejected)` whose `mutate`
// RETURNS, COMMIT, THEN the 409.
// ⛔ The code (or its hash) in a log line, an audit line, an error detail or a response (I7).

import { randomUUID } from 'node:crypto';

import {
  SendWaOptInCodeResponse,
  WaOptInCodeErrorDetails,
  type CreateWaOptInResponse,
  type VerifyWaOptInCodeRequest,
  type VerifyWaOptInCodeResponse,
} from '@twt/contracts';
import { audit, channelConfig, consent, ids, member, waOptIn, type Db } from '@twt/domain';
import type { FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { BadGatewayError, ConflictError, ServiceUnavailableError, UnauthorizedError } from '../../http-errors.js';
import { generateOtp, hashOtp, timingSafeHashCompare } from '../auth/shared/otp.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import type { WaCodeConfig, WaCodeDelivery, WaCodeSendOutcome } from './code-delivery.js';

type CodeOfferFields = Pick<CreateWaOptInResponse, 'codeAvailable' | 'codesRemaining' | 'liveCode' | 'liveCodeDelivery'>;

/** The mint's fallback when its database reads themselves fail (all four are required in a `.strict()` response — WC4). */
const CODE_OFFER_NONE: CodeOfferFields = { codeAvailable: false, codesRemaining: 0, liveCode: false, liveCodeDelivery: null };

/** The fields the code route reads off `pariwar_wa_config` (both the channel check and the client config). */
type WaConfigRow = NonNullable<Awaited<ReturnType<typeof channelConfig.getWaConfig>>>;

function codeConfigOf(config: WaConfigRow | null): WaCodeConfig | null {
  return config
    ? { phoneNumberId: config.phoneNumberId, accessTokenSecretName: config.accessTokenSecretName, graphApiVersion: config.graphApiVersion }
    : null;
}

/** Every code error's `details` — built FROM the shared schema (the app parses it with the same one). */
function codeDetails(
  state: waOptIn.WaOptInCodeState | null,
  extra: { retryAfterSeconds?: number | null; attemptsRemaining?: 0 | 1 } = {},
): WaOptInCodeErrorDetails {
  const s = state ?? waOptIn.WA_OPT_IN_CODE_STATE_NONE;
  return WaOptInCodeErrorDetails.parse({ codesRemaining: s.codesRemaining, liveCode: s.liveCode, ...extra });
}

/** A send refusal (WC1 steps 0 and 2) as its HTTP error — the codes the app maps (AC9). */
function refusalError(r: Extract<waOptIn.CheckCodeSendResult, { ok: false }>): ConflictError {
  const details = codeDetails(r.codeState, { retryAfterSeconds: r.codeState?.retryAfterSeconds ?? null });
  switch (r.refusal) {
    case 'channel_unavailable':
      return new ConflictError('WhatsApp delivery is not enabled for this Pariwar', 'wa_opt_in.channel_unavailable', details);
    case 'already_active':
      return new ConflictError('You are already opted in to WhatsApp notifications', 'wa_opt_in.already_active', details);
    case 'not_pending':
      return new ConflictError('There is no open WhatsApp request', 'wa_opt_in.not_pending', details);
    case 'not_signing_up':
    case 'yes_ended_before':
      return new ConflictError('A WhatsApp code is not offered here', 'wa_opt_in.code_not_offered', details);
    case 'limit':
      return new ConflictError('No more WhatsApp codes can be sent for this request', 'wa_opt_in.code_limit_reached', details);
    case 'too_soon':
      return new ConflictError('Please wait before asking for another code', 'wa_opt_in.code_resend_too_soon', details);
  }
}

/**
 * ⭐ WC5 step 1 — the typed code against EVERY live code of the request, each with `timingSafeHashCompare` and ⛔ early exit (a
 * helper of its own — the access-wrapper invariant (f) scans it, F18). Returns the matched `codeId`, or null. ⛔ `===` on a hash.
 */
export function matchCode(code: string, live: readonly waOptIn.LiveCode[]): string | null {
  const typed = hashOtp(code);
  let matched: string | null = null;
  for (const row of live) {
    const hit = timingSafeHashCompare(typed, row.codeHash);
    if (hit && matched === null) matched = row.codeId;
  }
  return matched;
}

interface MemberCtx {
  readonly memberIdStr: string;
  readonly pariwarIdStr: string;
  readonly memberId: ids.MemberId;
  readonly pariwarId: ids.PariwarId;
}

function memberCtx(request: FastifyRequest): MemberCtx {
  const memberIdStr = request.requestContext.actorId;
  const pariwarIdStr = request.requestContext.pariwarId;
  if (!memberIdStr || !pariwarIdStr) {
    throw new UnauthorizedError('Authentication required', 'auth.session_required');
  }
  return { memberIdStr, pariwarIdStr, memberId: ids.memberId(memberIdStr), pariwarId: ids.pariwarId(pariwarIdStr) };
}

/** A short READ-ONLY scope tx (T19) — the reads, then CLOSED before any network call (T3). */
async function readInScope<T>(deps: AppDeps, pariwarIdStr: string, read: (tx: Db) => Promise<T>): Promise<T> {
  const scopeTx = await openScopeTx(deps, pariwarIdStr);
  let ok = false;
  try {
    await scopeTx.client.query('SET TRANSACTION READ ONLY');
    const out = await read(scopeTx.tx);
    ok = true;
    return out;
  } finally {
    await closeScopeTx(scopeTx, ok);
  }
}

/** Step 0 / step 2's reads — the config, the member's lifecycle state (WC17) and the ordered refusal check. */
async function readSendGate(tx: Db, ctx: MemberCtx): Promise<{ config: WaConfigRow | null; gate: waOptIn.CheckCodeSendResult }> {
  const config = await channelConfig.getWaConfig(tx, ctx.pariwarId);
  const memberState = await member.getCurrentMemberState(tx, ctx.memberId);
  const gate = await waOptIn.checkCodeSendAllowed(tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId, memberState, config });
  return { config, gate };
}

/**
 * ⭐ WC4 — the mint's code fields, computed AFTER the mint committed: the database reads (config, WC17, WC15, the code state) in
 * their own short read-only scope tx, the cheap refusals FIRST (a member they rule out — every `active` member minting from
 * Settings — costs ⛔ Secret Manager read), then the bounded availability. A Secret Manager failure or timeout ⇒ `codeAvailable:
 * false` with the database-derived fields KEPT (a live code stays typeable); only a failure of the database reads ⇒ the fallback.
 */
export async function readCodeOffer(deps: AppDeps, delivery: WaCodeDelivery, ctx: MemberCtx): Promise<CodeOfferFields> {
  let read: { config: WaConfigRow | null; gate: waOptIn.CheckCodeSendResult };
  try {
    read = await readInScope(deps, ctx.pariwarIdStr, (tx) => readSendGate(tx, ctx));
  } catch {
    return CODE_OFFER_NONE;
  }
  const state = read.gate.codeState ?? waOptIn.WA_OPT_IN_CODE_STATE_NONE;
  const fields = { codesRemaining: state.codesRemaining, liveCode: state.liveCode, liveCodeDelivery: state.liveCodeDelivery };
  // `too_soon` still offers the code (the wait is the form's — AC9); every other refusal closes it.
  const allowed = read.gate.ok || read.gate.refusal === 'too_soon';
  if (!allowed) return { codeAvailable: false, ...fields };
  const availability = await delivery.availability(ctx.pariwarIdStr, codeConfigOf(read.config)).catch(() => ({ ok: false as const, reason: 'template_unresolved' as const }));
  if (!availability.ok) delivery.log({ event: 'code_unavailable', pariwarId: ctx.pariwarIdStr, detail: availability.reason });
  return { codeAvailable: availability.ok, ...fields };
}

export function createWaCodeHandlers(deps: AppDeps, delivery: WaCodeDelivery) {
  /** The audit intent of a WhatsApp-code line (WC9): the member, `member_app_wa_code`, the PENDING's phrase. */
  function codeAuditIntent(
    ctx: MemberCtx,
    args: { action: string; afterState: 'PENDING' | 'ACTIVE'; verificationPhrase: string; traceId: string | null },
  ): audit.AuditIntentArgs {
    return {
      pariwarId: ctx.pariwarIdStr,
      actorId: ctx.memberIdStr,
      actorRole: null,
      action: args.action,
      resourceLocator: `pariwar/${ctx.pariwarIdStr}/member/${ctx.memberIdStr}/wa-opt-in`,
      requestPayloadHash: waOptIn.waOptInAuditPayloadHash({
        originatingChannel: 'member_app_wa_code',
        memberId: ctx.memberIdStr,
        verificationPhrase: args.verificationPhrase,
        beforeState: 'PENDING',
        afterState: args.afterState,
      }),
      traceId: args.traceId,
    };
  }

  /** WC1 step 4 — record what Meta did, under the lock, COMMITTED; returns the request's code state after it. */
  async function recordOutcome(
    ctx: MemberCtx,
    claim: { codeId: string; optInId: ids.MemberWaOptInId; verificationPhrase: string },
    outcome: WaCodeSendOutcome,
    traceId: string | null,
  ): Promise<waOptIn.WaOptInCodeState> {
    const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
    let ok = false;
    try {
      await waOptIn.lockMemberWaYes(scopeTx.tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId });
      const at = { pariwarId: ctx.pariwarId, codeId: claim.codeId };
      if (outcome.kind === 'released' || outcome.kind === 'scope') {
        // A provably-unsent call (incl. `scope` — WC3 (a)) frees its seq — audited (WC9); every `mutate` RETURNS (T14).
        await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: codeAuditIntent(ctx, { action: 'member.wa_opt_in_code_released', afterState: 'PENDING', verificationPhrase: claim.verificationPhrase, traceId }),
          mutate: () => waOptIn.recordCodeSendOutcome(scopeTx.tx, { ...at, record: { outcome: 'released', detail: outcome.detail } }),
        });
      } else if (outcome.kind === 'accepted') {
        await waOptIn.recordCodeSendOutcome(scopeTx.tx, { ...at, record: { outcome: 'accepted', providerMessageId: outcome.wamid } });
      } else {
        // `may_have_sent` / `refused` — COUNTED; carried by the slot's `code_sent` line (WC9 — ⛔ a line of its own).
        await waOptIn.recordCodeSendOutcome(scopeTx.tx, { ...at, record: { outcome: outcome.kind, detail: outcome.detail } });
      }
      const state = await waOptIn.getCodeState(scopeTx.tx, { pariwarId: ctx.pariwarId, optInId: claim.optInId });
      ok = true;
      return state;
    } finally {
      // ⚠ A failed COMMIT rethrows (`closeScopeTx`) — the row then stays `sending`: counted, live until it expires (WC3).
      await closeScopeTx(scopeTx, ok);
    }
  }

  return {
    /** POST /api/v1/member/wa-opt-in/code — send a code to the registered number (WC1's five steps). */
    async send(request: FastifyRequest): Promise<SendWaOptInCodeResponse> {
      const ctx = memberCtx(request);
      const traceId = request.requestContext.traceId ?? null;

      // ── Step 0 — the advisory pre-check (every database read; ⛔ lock, ⛔ network) ──────────────────────────────────────
      const pre = await readInScope(deps, ctx.pariwarIdStr, async (tx) => {
        const read = await readSendGate(tx, ctx);
        const mobileCiphertext = read.gate.ok
          ? await waOptIn.getMemberMobileCiphertext(tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId })
          : null;
        return { ...read, mobileCiphertext };
      });
      if (!pre.gate.ok) throw refusalError(pre.gate);

      // ── Step 1 — resolve (⛔ tx open; a failure ⇒ 503, ⛔ row, ⛔ audit line, ⛔ fetch) ─────────────────────────────────────
      const resolved = await delivery.resolve(ctx.pariwarIdStr, codeConfigOf(pre.config), pre.mobileCiphertext);
      if (!resolved.ok) {
        delivery.log({ event: 'code_unavailable', pariwarId: ctx.pariwarIdStr, detail: resolved.reason });
        throw new ServiceUnavailableError('The WhatsApp code is not available just now', 'wa_opt_in.code_unavailable', codeDetails(pre.gate.codeState));
      }

      // ── Step 2 — claim (tx 1): the refusals RE-DECIDED under the lock, BEFORE any audit wrapper ─────────────────────────
      const code = generateOtp();
      const tx1 = await openScopeTx(deps, ctx.pariwarIdStr);
      let ok1 = false;
      let refused: ConflictError | null = null;
      let claim: { codeId: string; optInId: ids.MemberWaOptInId; verificationPhrase: string } | null = null;
      try {
        await waOptIn.lockMemberWaYes(tx1.tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId });
        const { gate } = await readSendGate(tx1.tx, ctx);
        if (!gate.ok) {
          refused = refusalError(gate); // ⛔ written — the tx rolls back with nothing in it, ⛔ audit line
        } else {
          const pending = gate.pending;
          const slot = await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: codeAuditIntent(ctx, { action: 'member.wa_opt_in_code_sent', afterState: 'PENDING', verificationPhrase: pending.verificationPhrase, traceId }),
            mutate: () =>
              waOptIn.insertCodeSlot(tx1.tx, { pariwarId: ctx.pariwarId, optInId: pending.optInId, memberId: ctx.memberId, codeHash: hashOtp(code) }),
          });
          claim = { codeId: slot.codeId, optInId: pending.optInId, verificationPhrase: pending.verificationPhrase };
          ok1 = true;
        }
      } finally {
        await closeScopeTx(tx1, ok1);
      }
      if (refused) throw refused;
      if (!claim) throw new Error('[wa-code] the claim produced ⛔ slot');

      // ── Step 3 — the Meta call, OUTSIDE any tx / lock ───────────────────────────────────────────────────────────────────
      let outcome: WaCodeSendOutcome;
      try {
        outcome = await delivery.send(ctx.pariwarIdStr, resolved.plan, code);
      } catch {
        // ⛔ expected (`send` never throws) — a throw between the claim and the call never left ⇒ released.
        outcome = { kind: 'released', detail: 'pre_send:unexpected' };
      }

      // ── Step 4 — the outcome (tx 2), COMMITTED, then the answer ────────────────────────────────────────────────────────
      const after = await recordOutcome(ctx, claim, outcome, traceId);
      const retryAfterSeconds = after.retryAfterSeconds;
      switch (outcome.kind) {
        case 'accepted':
        case 'may_have_sent':
          return SendWaOptInCodeResponse.parse({
            delivery: outcome.kind === 'accepted' ? 'sent' : 'uncertain',
            codesRemaining: Math.min(1, after.codesRemaining),
            retryAfterSeconds,
          });
        case 'scope':
          throw new ServiceUnavailableError('The WhatsApp code is not available just now', 'wa_opt_in.code_unavailable', codeDetails(after, { retryAfterSeconds }));
        case 'released':
        case 'refused':
          throw new BadGatewayError('The WhatsApp code could not be sent', 'wa_opt_in.code_send_failed', codeDetails(after, { retryAfterSeconds }));
      }
    },

    /** POST /api/v1/member/wa-opt-in/code/verify — a correct code switches WhatsApp on (WC5's three steps). */
    async verify(request: FastifyRequest): Promise<VerifyWaOptInCodeResponse> {
      const ctx = memberCtx(request);
      const traceId = request.requestContext.traceId ?? null;
      const { code } = request.body as VerifyWaOptInCodeRequest;

      const scopeTx = await openScopeTx(deps, ctx.pariwarIdStr);
      const tx = scopeTx.tx;
      let ok = false;
      let rejected: ConflictError | null = null;
      try {
        // ── Step 1 — every check OUTSIDE any audit wrapper ──────────────────────────────────────────────────────────────
        await waOptIn.lockMemberWaYes(tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId });
        if (await waOptIn.hasActiveOptIn(tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId })) {
          throw new ConflictError('You are already opted in to WhatsApp notifications', 'wa_opt_in.already_active', codeDetails(null));
        }
        const pending = await waOptIn.getPendingOptInRequest(tx, { pariwarId: ctx.pariwarId, memberId: ctx.memberId });
        if (!pending) throw new ConflictError('There is no open WhatsApp request', 'wa_opt_in.not_pending', codeDetails(null));
        const theRequest = { pariwarId: ctx.pariwarId, optInId: pending.optInId };
        const live = await waOptIn.findLiveCodes(tx, theRequest);
        const matched = matchCode(code, live);

        if (matched !== null) {
          // ── Step 2 — correct: the SAME yes as the worker's match (I5), audit-first, ONE tx under the lock ─────────────────
          const memberState = await member.getCurrentMemberState(tx, ctx.memberId);
          const consentId = ids.consentId(randomUUID());
          await audit.withCompensatingAudit(deps.servicePool, {
            auditIntent: codeAuditIntent(ctx, { action: 'member.wa_opt_in_activated', afterState: 'ACTIVE', verificationPhrase: pending.verificationPhrase, traceId }),
            mutate: async ({ auditId }) => {
              if (!(await waOptIn.consumeCode(tx, { pariwarId: ctx.pariwarId, codeId: matched }))) {
                throw new Error('[wa-code] the matched code was ⛔ live at consume');
              }
              await consent.recordConsent(tx, {
                pariwarId: ctx.pariwarId,
                subjectId: ctx.memberIdStr,
                consentType: 'whatsapp_opt_in',
                grantedViaActor: 'member_self',
                // §3.4 — *"recorded with timestamp + the UI context"*: `granted_at` + the signup step (WC5, WC17).
                consentPayload: { source: 'member_app_wa_code', uiContext: 'signup', memberState, codeId: matched },
                auditId,
                consentId,
              });
              // ⛔ customer-service window opened (⛔ inbound message) ⇒ `windowExpiresAt` null (F4). A 0-row (the sweep won) throws
              // `WaOptInStateError` ⇒ the wrapper writes `_rolled_back`, the tx rolls back (the code NOT consumed) ⇒ 409 invalid_state.
              await deps.waOptInActivate(tx, { pariwarId: ctx.pariwarId, optInId: pending.optInId, windowExpiresAt: null, consentId });
            },
          });
          ok = true;
          return { state: 'ACTIVE' };
        }

        // ── Step 3 — wrong, or ⛔ live code: the attempt COMMITTED (`mutate` RETURNS), THEN the 409 ─────────────────────────
        const wrong = await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: codeAuditIntent(ctx, { action: 'member.wa_opt_in_code_rejected', afterState: 'PENDING', verificationPhrase: pending.verificationPhrase, traceId }),
          mutate: () => waOptIn.recordWrongAttempt(tx, theRequest),
        });
        ok = true;
        const state = { codesRemaining: wrong.codesRemaining, liveCode: wrong.liveCode, liveCodeDelivery: null, retryAfterSeconds: null };
        rejected =
          live.length === 0
            ? new ConflictError('This code is no longer valid', 'wa_opt_in.code_no_longer_valid', codeDetails(state))
            : new ConflictError('That code is not right', 'wa_opt_in.code_wrong', codeDetails(state, { attemptsRemaining: wrong.attemptsRemaining }));
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
      throw rejected ?? new Error('[wa-code] verify reached ⛔ answer');
    },
  };
}
