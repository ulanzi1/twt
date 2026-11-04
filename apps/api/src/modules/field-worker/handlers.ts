// The field-worker registration handler — Story 13.1 (Task 7; QE9, QE17, QE18, QE22; AC8, AC13). The FIRST production
// caller of the field-worker primitive AND of Story 13.2's attribution-code registry (through the door, C1).
//
// ── THE WRITE: 12.2's `tenantWrite` SHAPE (`module.*` → `field_worker.*`), with ONE variance — review R3 ──────────
//   `requireIdempotencyKey` → `releaseHookTx` (commit + detach the hook's READ tx — TR7) → `withIdempotency` (claim; a replay
//   returns the RECORDED result; a failure RELEASES the key — TR9) → `prepare` (⚠ the variance: NO transaction is open yet)
//   → `openScopeTx` (bare BEGIN = READ COMMITTED; `SET LOCAL ROLE twt_app`) → `run` inside `try` → `finally { closeScopeTx(false) }`
//   (a no-op once committed) → `mapFieldWorkerError`.
// `prepare`, in order (QE9): the CONTENT rules (422 name / mobile — after the guards, before any KMS call) → the admin's
//   `display_name` (absent ⇒ 409, ⛔ fallback, BEFORE any write). It runs BEFORE `openScopeTx` because the display-name read
//   takes a connection from the SAME pool the scope transaction holds one of: with as many concurrent registrations as the pool
//   has connections, each would hold one and wait for another until the connect timeout (review R3). A refused body now opens
//   no transaction at all.
// `run`, in order (QE9): mint the id → `assertDistrictRecorded` at the transaction's own
//   `now()` (422 — BEFORE the KMS calls, so an unlisted district costs no encrypt) → seal name + mobile and the mobile index
//   (the transaction is open and idle meanwhile — accepted) → the duplicate-mobile PRE-CHECK (409, ⛔ audit line) →
//   `audit.withCompensatingAudit` whose `mutate` runs `registerFieldWorker` THEN `allocateAttributionCodeForRequest` on the
//   SAME transaction and COMMITS inside `mutate` (I11 — both or neither).
// Exhaustion: the door's re-exported class is caught by `instanceof`; the flag wrapper (its OWN committed transaction) is tried
//   and a failing flag write is logged by SQLSTATE only and SWALLOWED; the ORIGINAL exhaustion error is rethrown ⇒ the
//   `_rolled_back` audit line, the rollback, 503.
//
// ── What leaves this handler (I8, QE22) ─────────────────────────────────────────────────────────────────────────
// The 201 is `{ field_worker_id, district, current_state, kyc_status }` — ⛔ the code (allocated here, read only after approval
// by Story 13.1a / 13.1b), ⛔ a name, ⛔ a mobile. The audit intent's `resourceLocator` is `field_worker/<id>`, its `hashShape`
// `{ field_worker_id, district }` (a SHA-256 of a 10-digit mobile can be brute-forced), its `actorRole` the VERIFIED
// authorization's role — the object the gate stored, passed on unchanged and ⛔ recomputed (QE18, TR13). The district is ⛔
// trimmed or normalised: the gate compared the raw body bytes and the command refuses a genesis whose district differs from the
// authorization's target (TR12).

import { createHash, randomUUID } from 'node:crypto';

import type { RegisterFieldWorkerRequest, RegisterFieldWorkerResponse } from '@twt/contracts';
import { audit, canonicalJsonStringify, encryption, fieldWorker, idempotency, ids, marketplace } from '@twt/domain';
import type { FastifyReply, FastifyRequest } from 'fastify';

import type { AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, ApiError, BadRequestError, ConflictError, UnauthorizedError } from '../../http-errors.js';
import type { ScopeTx } from '../../types.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';
import {
  AttributionCodeAllocationExhaustedError,
  allocateAttributionCodeForRequest,
  flagAllocationExhaustedForRequest,
} from './attribution-code-access.js';
import { mapFieldWorkerError } from './errors.js';
import { sealFieldWorkerIdentity } from './field-worker-crypto.js';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;

/** The ONE permission key this surface gates on (QE10, catalog v59). ⚠ Also the genesis event's `trigger` value. */
export const FIELD_WORKER_REGISTER_KEY = 'field_worker.register';

/** A worker's name, as stored (QE9, as amended by review R6, R2-1, R3-1 / R3-10 and R4-2 / R4-3 / R4-15): NFC, trimmed, 1–120 characters, at least one letter, nothing invisible. */
export const FIELD_WORKER_NAME_MAX_LENGTH = 120;

/**
 * The longest run of CONSECUTIVE combining marks a name may hold (review R3-10, BigDev 2026-11-04): 8 or more in a row is refused —
 * a "Zalgo" name overdraws the rows around it. Real stacks are shorter: Devanagari ~3 (nukta + vowel sign + chandrabindu),
 * Vietnamese 2, a Tibetan subjoined stack + its vowel ~4–5. Counted AFTER NFC (a mark that composes is no longer a mark).
 */
export const FIELD_WORKER_NAME_MAX_MARK_RUN = 7;

/**
 * What a name may NOT contain, besides control characters: line and paragraph separators (`Zl`, `Zp`), private-use code points
 * (`Co`), FORMAT characters (`Cf` — review R3-1: the interlinear annotation controls U+FFF9–U+FFFB, the Arabic number signs and
 * the rest that are not default-ignorable), UNASSIGNED code points and noncharacters (`Cn` — by the Unicode version of the running
 * Node; a letter assigned in a later version is refused until Node catches up) and every DEFAULT-IGNORABLE code point — the
 * zero-width and filler characters, the bidi embedding / override / isolate controls, the word joiner, the soft hyphen, the BOM,
 * the tag characters (invisible ASCII) and the variation selectors. Each draws nothing, corrupts or re-orders what an operator
 * reads; `trim()` strips none of them from the middle of a name, and no event renames a worker, so one that gets in is sealed for good.
 */
const NAME_INVISIBLE = /[\p{Zl}\p{Zp}\p{Co}\p{Cf}\p{Cn}\p{Default_Ignorable_Code_Point}]/u;

/**
 * Three code points no category above catches (review R3-1, R4-3): U+2800 BRAILLE PATTERN BLANK (a symbol that draws nothing — the
 * classic filler bypass), U+FFFC OBJECT REPLACEMENT CHARACTER and U+FFFD REPLACEMENT CHARACTER (placeholders a client leaves after a
 * failed paste or a mis-decoded name — the name is already corrupt).
 */
const NAME_REFUSED: ReadonlySet<number> = new Set([0x2800, 0xfffc, 0xfffd]);

/**
 * The five format characters a REAL name carries, so they stay legal: ZWNJ (U+200C) and ZWJ (U+200D) in Indic and Persian scripts,
 * the directional marks LRM (U+200E), RLM (U+200F) and ALM (U+061C — review R3-1) in right-to-left ones. Numbers, ⛔ escapes written in source.
 */
const NAME_ALLOWED_INVISIBLE: ReadonlySet<number> = new Set([0x061c, 0x200c, 0x200d, 0x200e, 0x200f]);

function hasInvisibleCharacter(name: string): boolean {
  for (const ch of name) {
    const c = ch.codePointAt(0)!;
    if (NAME_REFUSED.has(c)) return true;
    if (NAME_INVISIBLE.test(ch) && !NAME_ALLOWED_INVISIBLE.has(c)) return true;
  }
  return false;
}

/**
 * A combining mark the name STARTS with or that follows whitespace has no base letter to sit on; a run past the cap is a Zalgo name
 * (R3-1, R3-10). ⚠ Both are tested on the name WITHOUT the five allowed invisibles (review R4-2): one placed between marks, or before
 * a mark, would otherwise hide it — `x` + (7 marks + ZWJ) × 14 drew 98 marks on one letter.
 */
const NAME_ORPHAN_MARK = /(?:^|\s)\p{M}/u;
const NAME_MARK_RUN_TOO_LONG = new RegExp(`\\p{M}{${FIELD_WORKER_NAME_MAX_MARK_RUN + 1},}`, 'u');

/** The name with the five allowed invisibles removed — what the mark rules judge (review R4-2). */
function withoutAllowedInvisibles(name: string): string {
  let out = '';
  for (const ch of name) if (!NAME_ALLOWED_INVISIBLE.has(ch.codePointAt(0)!)) out += ch;
  return out;
}

/**
 * The viramas (the vowel killers of the Brahmic scripts — Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada,
 * Malayalam, Sinhala) after which a FINAL ZWJ is real text: the legacy encodings of the Malayalam chillu letters and the Bengali
 * khanda ta end a word with virama + ZWJ (review R4-15 — the one exception to "never last"). Numbers, ⛔ escapes written in source.
 */
const VIRAMAS: ReadonlySet<number> = new Set([0x094d, 0x09cd, 0x0a4d, 0x0acd, 0x0b4d, 0x0bcd, 0x0c4d, 0x0ccd, 0x0d4d, 0x0dca]);
const ZWJ = 0x200d;

/**
 * Review R4-15 (BigDev 2026-11-04, R4-DN1 "1") — an allowed invisible sits BETWEEN two other characters: never the first, never the
 * last (except a ZWJ right after a virama — `VIRAMAS`), never next to another allowed invisible. Every real use does (a conjunct
 * joiner between a virama and a letter; a directional mark beside the text it steers); `A` + 119 × ZWJ, which reads "A", does not.
 */
function misplacedAllowedInvisible(name: string): boolean {
  const cps = [...name].map((ch) => ch.codePointAt(0)!);
  const allowed = (i: number): boolean => i >= 0 && i < cps.length && NAME_ALLOWED_INVISIBLE.has(cps[i]!);
  if (allowed(0)) return true;
  const last = cps.length - 1;
  if (allowed(last) && !(cps[last] === ZWJ && VIRAMAS.has(cps[last - 1] ?? -1))) return true;
  for (let i = 0; i < last; i += 1) if (allowed(i) && allowed(i + 1)) return true;
  return false;
}

/** True iff `s` holds a UTF-16 surrogate without its pair (`String.prototype.isWellFormed` is ES2024 — the lib is ES2022). */
function hasUnpairedSurrogate(s: string): boolean {
  for (let i = 0; i < s.length; i += 1) {
    const unit = s.charCodeAt(i);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = s.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1; // a well-formed pair
    } else if (unit >= 0xdc00 && unit <= 0xdfff) {
      return true;
    }
  }
  return false;
}

/**
 * The name's CONTENT rule (QE9, as amended by review R6, R2-1, R3-1 / R3-10 and R4-2 / R4-3 / R4-15) — `null` when it fails:
 * NFC-normalised and trimmed; 1–120 characters (code points); no control character (NUL included), no unpaired surrogate, no
 * invisible or corrupt character (see `NAME_INVISIBLE` and `NAME_REFUSED`; ZWJ, ZWNJ, LRM, RLM and ALM excepted — and each of those
 * BETWEEN two other characters, `misplacedAllowedInvisible`), no combining mark without a base (at the start, or after whitespace),
 * no run of more than `FIELD_WORKER_NAME_MAX_MARK_RUN` combining marks (both judged with the allowed invisibles removed), and AT LEAST ONE
 * LETTER (a name of digits and marks only reads as blank). The Hangul fillers (U+115F, U+1160, U+3164, U+FFA0) are LETTERS by
 * category yet draw nothing — they are default-ignorable, so the invisible-character rule refuses them before the letter test is
 * reached. ⛔ Logged or echoed anywhere.
 */
export function normalizeFieldWorkerName(raw: string): string | null {
  if (hasUnpairedSurrogate(raw)) return null;
  const name = raw.normalize('NFC').trim();
  const length = [...name].length;
  if (length < 1 || length > FIELD_WORKER_NAME_MAX_LENGTH) return null;
  if (/\p{Cc}/u.test(name)) return null;
  if (hasInvisibleCharacter(name)) return null;
  if (misplacedAllowedInvisible(name)) return null;
  const marksJudged = withoutAllowedInvisibles(name);
  if (NAME_ORPHAN_MARK.test(marksJudged) || NAME_MARK_RUN_TOO_LONG.test(marksJudged)) return null;
  if (!/\p{L}/u.test(name)) return null;
  return name;
}

// TOTAL (12.2 review RP10): an unencodable shape hashes to a fixed marker, ⛔ a throw while the audit intent is built.
function payloadHash(shape: Record<string, unknown>): string {
  let canonical: string;
  try {
    canonical = canonicalJsonStringify(shape);
  } catch {
    canonical = canonicalJsonStringify({ unhashable: true });
  }
  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function createFieldWorkerHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (key === '' || key.length > 200) throw new BadRequestError('An Idempotency-Key header is required', 'field_worker.idempotency_key_required');
    return key;
  }

  /** The scope-resolution hook's READ transaction ends BEFORE the write opens its own (the 12.2 copy). */
  async function releaseHookTx(request: FastifyRequest): Promise<void> {
    const hookTx = request.scopeTx;
    if (!hookTx?.scopeSet) return;
    hookTx.scopeSet = false;
    await closeScopeTx(hookTx, true).catch(() => undefined);
    // Detached, so nothing later in this request can reach a client that is back in the pool.
    request.scopeTx = undefined;
  }

  /** Claim the key; a replay returns the RECORDED response; a claim with ⛔ result yet is 409 in progress. */
  async function withIdempotency<T>(idemKey: string, run: () => Promise<T>): Promise<T> {
    const outcome = await idempotencyStore.claim(idemKey, IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', 'field_worker.idempotency_in_progress');
    }
    let settled = false;
    try {
      const out = await run();
      await idempotencyStore.recordResult(idemKey, (out ?? { done: true }) as unknown as Record<string, unknown>);
      settled = true;
      return out;
    } finally {
      if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
    }
  }

  interface WriteCtx {
    readonly scopeTx: ScopeTx;
    readonly pariwarId: string;
    readonly actorId: string;
    readonly traceId: string | null;
  }

  /** What `prepare` sees: no transaction exists yet, so no `scopeTx`. */
  type PrepareCtx = Omit<WriteCtx, 'scopeTx' | 'traceId'>;

  /**
   * A tenant write: claim → `prepare` (NO transaction open — review R3) → its own scope transaction → `run` (pre-checks, then
   * the audited mutation) → ROLLBACK if `run` did not COMMIT. `namespace` builds the key's prefix (TR8 — the store is global,
   * so tenant operations are namespaced). What `prepare` returns is handed to `run`.
   */
  async function tenantWrite<T, Pre>(
    request: FastifyRequest,
    namespace: (pariwarId: string, actorId: string) => string,
    prepare: (ctx: PrepareCtx) => Promise<Pre>,
    run: (ctx: WriteCtx, pre: Pre) => Promise<T>,
  ): Promise<T> {
    const scopeTx0 = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx0 || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    const pariwarId = scopeTx0.pariwarId;
    const traceId = request.requestContext.traceId ?? null;
    const key = requireIdempotencyKey(request);
    await releaseHookTx(request);
    return withIdempotency(`${namespace(pariwarId, actorId)}:${key}`, async () => {
      let pre: Pre;
      try {
        pre = await prepare({ pariwarId, actorId });
      } catch (err) {
        return mapFieldWorkerError(err);
      }
      const scopeTx = await openScopeTx(deps, pariwarId);
      try {
        return await run({ scopeTx, pariwarId, actorId, traceId }, pre);
      } catch (err) {
        return mapFieldWorkerError(err);
      } finally {
        await closeScopeTx(scopeTx, false); // a no-op once the mutation committed
      }
    });
  }

  /** `POST /api/v1/p/:pariwarId/field-workers` — register a worker and allocate their code in ONE transaction (QE9). */
  async function register(request: FastifyRequest, reply: FastifyReply) {
    const body = request.body as RegisterFieldWorkerRequest;
    // The VERIFIED result the gate stored (QE18) — passed on unchanged; ⛔ recomputed from `request.scopeGrants`.
    const authorization = request.authorizations?.[FIELD_WORKER_REGISTER_KEY];
    if (authorization === undefined) {
      // Programming error — the route was registered without its `requirePermissionHook`. Fail loud (500).
      throw new Error('[field-worker] register ran without the field_worker.register gate');
    }
    const out = await tenantWrite(
      request,
      (p, a) => `field_worker.register:${p}:${a}`,
      // PREPARE — inside the claim, BEFORE any transaction (review R3): nothing here needs one.
      async (ctx) => {
        // CONTENT rules (422) — after the guards, inside the claim, before any KMS call.
        const name = normalizeFieldWorkerName(body.name);
        if (name === null) throw new ApiError(422, 'field_worker.name_invalid', 'The name is not valid');
        const mobileE164 = encryption.normalizeMobile(body.mobile);
        if (mobileE164 === null) throw new ApiError(422, 'field_worker.mobile_invalid', 'The mobile number is not a valid Indian mobile number');

        // 6.11 R5 — the stored attribution; ⛔ fallback, BEFORE any write or audit line (G11). Its own pool connection, taken
        // while NO scope transaction holds one (review R3).
        const registeredByDisplay = await getDisplayName(deps.pool, ctx.actorId);
        if (registeredByDisplay === null) throw new AdminDisplayNameMissingError(ctx.actorId);
        return { name, mobileE164, registeredByDisplay };
      },
      async (ctx, pre): Promise<RegisterFieldWorkerResponse> => {
        const pariwarId = ids.pariwarId(ctx.pariwarId);
        const fieldWorkerId = ids.fieldWorkerId(randomUUID());
        const { name, mobileE164, registeredByDisplay } = pre;

        // QE17 — a LISTED district at THIS transaction's now(), compared byte for byte; BEFORE the KMS calls.
        const at = (await ctx.scopeTx.client.query<{ now: Date }>('SELECT now() AS now')).rows[0]!.now;
        await fieldWorker.assertDistrictRecorded(ctx.scopeTx.tx, pariwarId, body.district, at);

        const sealed = await sealFieldWorkerIdentity({ name, mobileE164 }, ctx.pariwarId, deps.encryption);

        // The duplicate-mobile PRE-CHECK (⛔ audit line on a refusal); the concurrent loser is caught by the index, by name.
        const live = await fieldWorker.findLiveFieldWorkerByMobileIndex(ctx.scopeTx.tx, pariwarId, sealed.mobileBlindIndex);
        if (live !== null) throw new fieldWorker.FieldWorkerMobileAlreadyRegisteredError(ctx.pariwarId);

        return audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ctx.pariwarId,
            actorId: ctx.actorId,
            actorRole: authorization.role,
            action: 'field_worker.registered',
            resourceLocator: `field_worker/${fieldWorkerId}`,
            requestPayloadHash: payloadHash({ field_worker_id: fieldWorkerId, district: body.district }),
            traceId: ctx.traceId,
          },
          mutate: async ({ auditId }) => {
            const genesis = await fieldWorker.registerFieldWorker(ctx.scopeTx.client, {
              pariwarId,
              fieldWorkerId,
              auditId,
              actor: 'operator',
              actorId: ctx.actorId,
              nameCiphertext: sealed.nameCiphertext,
              mobileCiphertext: sealed.mobileCiphertext,
              mobileBlindIndex: sealed.mobileBlindIndex,
              registeredByDisplay,
              district: body.district,
              authorization,
            });
            try {
              // The SAME transaction (I11). The returned code is ⛔ copied anywhere (QE22).
              await allocateAttributionCodeForRequest(request, ctx.scopeTx, { fieldWorkerId });
            } catch (err) {
              if (err instanceof AttributionCodeAllocationExhaustedError) {
                // ⚠ KNOWN RESIDUAL (review R2-2; deferred, D3): the flag wrapper resolves the display name and opens its OWN scope
                // transaction from the SAME pool while THIS request's scope transaction is still held — under pool saturation the flag
                // write can time out, and it is swallowed below. QE9 gives the flag its own committed transaction, and
                // `attribution-code-access.ts` is Story 13.2's door file (its export list is pinned) — not edited here. (In dev / CI
                // `servicePool` IS `pool`, so `withCompensatingAudit` also draws a second connection from it on every registration;
                // production has a separate service pool.) R3 moved only the display-name read of THIS handler out of the transaction.
                try {
                  await flagAllocationExhaustedForRequest(deps, request, { attempts: err.attempts });
                } catch (flagErr) {
                  console.error('[field-worker] exhaustion flag failed', { code: marketplace.pgSqlstateOf(flagErr) });
                }
              }
              throw err; // the ORIGINAL error — ⇒ `_rolled_back`, the rollback, 503 for an exhaustion
            }
            await closeScopeTx(ctx.scopeTx, true); // COMMIT — inside `mutate`, so a failed COMMIT writes the compensating line
            return {
              field_worker_id: fieldWorkerId,
              district: body.district,
              current_state: genesis.state,
              kyc_status: genesis.kycStatus,
            };
          },
        });
      },
    );
    return reply.code(201).send(out);
  }

  return { register };
}
