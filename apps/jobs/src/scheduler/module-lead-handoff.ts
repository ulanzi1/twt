// The partner LEAD HANDOFF sweep — Story 12.5 (Task 5; Decision `2026-11-21-483` QE6 (A), QE7, QE8 (A), QE9, QE13, QE14, QE17, QE21 (C),
// QE22 (A), QE24 (A); AC5–AC8, AC9's purge half, AC11).
//
// A member's registered interest in a partner offer (12.3's lead route — ⛔ built yet, so NO row exists in production: I1) is recorded as a
// `due` row of `marketplace_lead_handoffs` in the lead's own transaction. This per-minute cron is the ONLY thing that sends it: one signed
// HTTPS POST to the module's `lead_handoff_url`, AT LEAST ONCE (the partner dedupes on `Idempotency-Key: <lead_id>`).
//
// ── The tick (QE13 — the ONE copy is the story's; this follows it) ──────────────────────────────────────
//   S1  The roster Row 26 guard FIRST: under an RLS-bound login the claim would see ⛔ row with ⛔ error ⇒ ONE `rls_bound_role` alarm.
//   S2  The lapse (W10), then the purge (W12, ≤ 100 rows) — each its own statement — then the WAITING PASS (W14; Decision
//       `2026-11-22-487`, amended by `-488`): EVERY `due` row — waiting out a retry, or due now but not reached by the claim — has its
//       member's side re-read (P0–P5, a scope transaction that commits) and its offer's withdrawal checked, and is cancelled at once on
//       a stop — `-484` Q4 A's "at once" is the tick's minute, ⛔ the retry's backoff or the row's turn. Paged, under its own time budget,
//       resuming from a cursor, ONE cycle a pass (it wraps to the top and stops where it began — round 3). ⚠ A backlog beyond one
//       budget takes several ticks to cycle. ⛔ secret, ⛔ DNS, ⛔ decrypt, ⛔ audit
//       line, ⛔ request. A throw in the lapse or the purge ⇒ ONE `sweep_failed:<error>` alarm, end; a throw in the waiting pass ⇒ ONE
//       `waiting_pass_failed:<error>` alarm, the PASS ends and the claim runs (`-488` (2)).
//   S3  Claim ONE row (W2), EXCLUDING the tick's `keyHeld` modules and `open` authorities (the per-tick breaker: their rows are simply ⛔
//       claimed). Repeat until `tickBudgetMs` has passed SINCE THE TICK BEGAN — a TIME budget (the first row always runs; round 3: S1–S2
//       count against it).
//   S4  Read the module (explicit Pariwar predicate) and COMPUTE the partner-side verdict — ⛔ write: withdrawn (`trustee_archived`,
//       QE22 (A)) outranks a refusal (`url_refused`, `port_refused`); a throw ⇒ hold `db`, end the tick.
//   S5  ONLY on an ok verdict: the secret (cached per tick per NAME — ⛔ across ticks, so a rotation is seen within one tick), then DNS +
//       the address table. A key hold adds the module to `keyHeld`; a DNS hold or an address refusal adds the authority to `open`.
//   S6  ⭐ THE MEMBER'S SIDE DECIDES FIRST, ON EVERY ATTEMPT: P0–P5 in a scope transaction that COMMITS before any write or request (I2).
//       Then exactly one of: unsound / a throw ⇒ hold `db` (a throw ends the tick); a P1–P5 failure ⇒ cancel (W9); withdrawn ⇒ cancel
//       `module_withdrawn`; a refusal ⇒ W8; `address_refused` ⇒ a COUNTED W4 / W5 (QE21 (C)); a hold ⇒ W6 / W7; ok ⇒ S7.
//   S7  ONE audit line (`module.lead_handoff_fields_decrypted`), written first, whose `mutate` is the decrypt and NOTHING else (TR7).
//       A key the key service REJECTS is a HOLD (`kms`) that ends the tick, ⛔ a final failure (`-487`): the rejection cannot tell a
//       wrong key reference — every row — from one bad row.
//   S8  Build the body, sign it, POST it — ⛔ connection held (TR8).
//   S9  The `module.lead_handoff_attempted` line: up to 3 tries; if all fail, write nothing more — the row lapses (at least once).
//   S10 Settle: W3, W4 / W5, or W8. A transient outcome adds the authority to `open`.
//   W15 (Story 12.5b QE5; `-486` R2 C) — LAST, after the claim loop ends (⛔ inside S2: a visits fault there would stop the waiting pass
//       and every `trust_sends` delivery of the tick — a fault in one route must ⛔ stop the other): ONE bounded DELETE of the
//       partner-form visit records more than 90 days old. It runs even when the budget is spent. A throw ends ONLY W15: ONE
//       `visit_purge_failed:<error>` alarm (an error name and a SQLSTATE only); the next tick retries.
// ⭐ Story 12.5b (QE5; amends `-483` QE13 and `-487`'s W14 pass by name, Decision `2026-11-22-489`): a row whose module is a `partner_form`
// offer is a BUG UPSTREAM (such an offer never passes a member on — I2; the record command and the 0216 trigger refuse it). S4 decides
// it FIRST — before withdrawn, the URL, S5 and S6 — and the waiting pass before the member's side: cancelled `partner_form_route` at
// once, ONE `module_lead_handoff_route_refused` alarm (ids only); ⛔ secret, ⛔ DNS, ⛔ member read, ⛔ decrypt, ⛔ audit line, ⛔
// request. ⚠ A deliberate departure from 12.5's I2 ("the member's side decides first"): I2 orders the checks before a SEND, and this
// row is never sent — reading the member's side for it would only add a way to HOLD a row that must go.
// ⚠ A hold whose cause is GLOBAL (`kms`, `audit`, a THROWN `db`) ENDS THE TICK — each further row would cost two audit lines under the
// global audit lock. A key, DNS or unsound-read hold is ONE row's problem: the tick goes on.
//
// ── Alarms (ids, closed words, error names — ⛔ a member field, the URL, an address, a header, a body, a secret, an error message: I8) ──
//   · `module_lead_handoff_failed` — EVERY row that reaches `failed_delivery` (W5, W7, W8, W10): the epic's "flagged for
//     partner-relationship review" (K-3's trigger);
//   · `module_lead_handoff_held:<word>` — once per module per tick (once per tick for the global words);
//   · `module_lead_handoff_setup_fault` — the first 401 / 403 / 404 / `address_refused` per module per tick (QE21 (C));
//   · `stale_claim` — a settle that lost its claim (I11); `rls_bound_role`; `sweep_failed:<error>`; `waiting_pass_failed:<error>`;
//   · (Story 12.5b) `module_lead_handoff_route_refused` — every `partner_form` row cancelled; `visit_purge_failed:<error>` — W15.
//
// ⚠ The access-wrapper gate does ⛔ scan `apps/jobs` (its README); this file's audit pairing is pinned by its test. The bare attempted
// line (S9) is BY DESIGN outside the marketplace domain roots (Task 7).

import { createHash, randomUUID } from 'node:crypto';

import { audit, canonicalJsonStringify, marketplace, smsDelivery, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { checkLeadUrl, classifyLeadOutcome, createPartnerLeadClient, type PartnerLeadClient, type PartnerLeadResponse } from './partner-lead-client.js';

/** Every minute (QE13). */
export const DEFAULT_MODULE_LEAD_HANDOFF_CRON = '* * * * *';
export const MODULE_LEAD_HANDOFF_TZ = 'Asia/Kolkata';
/** The decrypt line (QE14 (b)); `_rolled_back` is its automatic twin. */
export const MODULE_LEAD_FIELDS_DECRYPTED_ACTION = 'module.lead_handoff_fields_decrypted';
/** The per-request line (QE14 (c)). */
export const MODULE_LEAD_ATTEMPTED_ACTION = 'module.lead_handoff_attempted';
/** The attempted line's synthetic statuses when no response came (QE14 (c)). */
export const ATTEMPTED_STATUS_TIMEOUT = 599;
export const ATTEMPTED_STATUS_NETWORK = 598;
/** The attempted line's tries (S9). */
export const ATTEMPTED_LINE_TRIES = 3;

/** What the sweep needs — composed in boot from its own pool, the jobs KMS deps and the Secret Manager read. */
export interface ModuleLeadHandoffDeps {
  /** The tick's OWN pool (`max: 3`): the claim, each scope transaction, the audit lines. BYPASSRLS today (Row 26). */
  readonly pool: pg.Pool;
  readonly encryption: marketplace.LeadFieldsCryptoDeps;
  /** The module's signing secret by NAME: the value, `null` for NOT_FOUND, a throw for an outage (`resolveSmsDltConfig` in production). */
  readonly resolveSecret: (secretName: string) => Promise<string | null>;
  /** ⚠ Tests only — a client built with a test seam. Production omits it (the default is `createPartnerLeadClient()`). */
  readonly client?: PartnerLeadClient;
  /** The alarm sink (default `console.warn`). */
  readonly onAlarm?: (message: string) => void;
  /** The clock for the signature's `t` (default `Date.now`). */
  readonly now?: () => number;
  // ⚠ Tests only — QE6's constants as options, so no test waits or edits a frozen column.
  readonly retryScheduleMs?: readonly number[];
  readonly maxAttempts?: number;
  readonly leaseMs?: number;
  readonly holdRetryMs?: number;
  readonly maxHoldMs?: number;
  readonly auditRetryPauseMs?: number;
  readonly tickBudgetMs?: number;
  readonly retentionDays?: number;
  /** Story 12.5b (W15) — the visit record's retention (default 90 — `-486` R2 C). */
  readonly visitRetentionDays?: number;
  /** The waiting pass's time budget and page (S2, `-487`). */
  readonly waitingBudgetMs?: number;
  readonly waitingPage?: number;
  /** The waiting pass's cursor (default: one per process). A test passes its own so no test inherits another's. */
  readonly waitingCursor?: WaitingCursor;
}

/** Where the waiting pass resumes: the last `lead_id` it looked at, or null (from the start). In memory only — a restart starts over. */
export interface WaitingCursor {
  leadId: string | null;
}

export interface ModuleLeadHandoffTickResult {
  /** True when the Row 26 guard refused to sweep. */
  readonly refused: boolean;
  readonly lapsed: number;
  readonly purged: number;
  /** Waiting rows cancelled by the waiting pass (W14). */
  readonly cancelledWaiting: number;
  readonly claimed: number;
  /** Requests made (S8). */
  readonly sent: number;
  /** Story 12.5b — partner-form visit records removed by W15 (90 days old). */
  readonly visitsPurged: number;
}

/** After one row: take the next, or end the tick. */
type Next = 'next' | 'end_tick';

/** S4 / S5's partner-side verdict — COMPUTED, ⛔ written. */
type PartnerVerdict =
  | { readonly kind: 'ok'; readonly hostname: string; readonly path: string; readonly address: string; readonly secret: string; readonly partnerId: string }
  | { readonly kind: 'withdrawn' }
  | { readonly kind: 'refuse'; readonly detail: 'failed_delivery:url_refused' | 'failed_delivery:port_refused' }
  | { readonly kind: 'address_refused' }
  | { readonly kind: 'hold'; readonly word: 'signing_key' | 'dns'; readonly why: string };

/** The name of a thrown error. ⛔ Its message: it can carry a bound value. */
const errorName = (err: unknown): string => (err instanceof Error ? err.name : 'unknown');

/** A SQLSTATE or a Node code, else the name (the twin's `faultClass`). */
function faultClass(err: unknown): string {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]{3,24}$/.test(code)) return `code:${code}`;
  if (typeof code === 'number' && Number.isInteger(code)) return `code:${String(code)}`;
  return errorName(err);
}

const sha256Hex = (bytes: Buffer | string): string => createHash('sha256').update(bytes).digest('hex');

/** The per-tick state: the breaker sets, the secret cache, the alarms already raised. */
interface Tick {
  readonly keyHeld: Set<string>;
  readonly open: Set<string>;
  readonly secrets: Map<
    string,
    Promise<
      | { readonly kind: 'ok'; readonly value: string }
      | { readonly kind: 'not_found' }
      | { readonly kind: 'padded' }
      | { readonly kind: 'outage'; readonly fault: string }
    >
  >;
  readonly raised: Set<string>;
  sent: number;
}

/** Work ONE claimed row. A throw leaves it `attempting`: the caller alarms, ends the tick, and the lease finishes the row (I11). */
async function processRow(deps: ModuleLeadHandoffDeps, tick: Tick, row: marketplace.ClaimedLeadHandoff, claimToken: string): Promise<Next> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const client = deps.client ?? defaultClient();
  const { leadId, pariwarId, moduleId } = row;
  const ref = { pariwarId, leadId, claimToken };
  const where = `pariwar ${pariwarId} module ${moduleId} lead ${leadId}`;
  const say = (what: string): void => alarm(`[jobs] module-lead-handoff: ${what} — ${where}`);
  const once = (key: string, what: string): void => {
    if (tick.raised.has(key)) return;
    tick.raised.add(key);
    say(what);
  };
  const failed = (detail: string): void => say(`module_lead_handoff_failed (${detail}) — for partner-relationship review`);
  const stale = (): void => say('stale_claim — the row had moved on (its lease lapsed and it was re-claimed); this worker wrote nothing');

  /** W6 / W7. A hold on a GLOBAL cause ends the tick, and so does its expiry. */
  const hold = async (word: marketplace.LeadHandoffHoldWord, why: string, global: boolean): Promise<Next> => {
    const result = await marketplace.holdLeadHandoff(deps.pool, {
      ...ref,
      word,
      ...(deps.holdRetryMs === undefined ? {} : { holdRetryMs: deps.holdRetryMs }),
      ...(deps.maxHoldMs === undefined ? {} : { maxHoldMs: deps.maxHoldMs }),
    });
    if (result === 'stale') stale();
    else if (result === 'expired') failed(`failed_delivery:hold_expired:${word}`);
    else once(global ? `held:${word}` : `held:${word}:${moduleId}`, `module_lead_handoff_held:${word}_unavailable (${why}) — ⛔ sent; retried in a minute`);
    return global ? 'end_tick' : 'next';
  };

  /** W4 / W5 for a counted transient outcome (a request was made, or `address_refused`). */
  const release = async (detail: string, setupFault: boolean): Promise<void> => {
    const result = await marketplace.releaseLeadHandoff(deps.pool, {
      ...ref,
      detail,
      ...(deps.retryScheduleMs === undefined ? {} : { retryScheduleMs: deps.retryScheduleMs }),
      ...(deps.maxAttempts === undefined ? {} : { maxAttempts: deps.maxAttempts }),
    });
    if (result === 'stale') return stale();
    if (setupFault) {
      once(`setup:${moduleId}`, `module_lead_handoff_setup_fault (${detail}) — the partner's endpoint, secret or address needs mending; retried on the schedule`);
    }
    if (result === 'exhausted') failed('failed_delivery:retries_exhausted');
  };

  /** W8 with its alarm. */
  const fail = async (detail: string): Promise<void> => {
    if (await marketplace.failLeadHandoff(deps.pool, { ...ref, detail })) failed(detail);
    else stale();
  };

  // ── S4 — the module, and the partner-side verdict (COMPUTED, ⛔ written) ──
  let module: marketplace.LeadHandoffModule | null;
  try {
    module = await marketplace.readLeadHandoffModule(deps.pool, { pariwarId, moduleId });
  } catch (err) {
    return hold('db', `module read ${faultClass(err)}`, true);
  }
  if (module === null) return hold('db', 'module read found no row', false);

  // ── Story 12.5b (QE5) — a `partner_form` offer's row is decided FIRST: cancelled at once, ONE alarm, nothing else ──
  if (module.leadRoute !== 'trust_sends') {
    if (await marketplace.cancelLeadHandoff(deps.pool, { ...ref, word: 'partner_form_route' })) {
      say("module_lead_handoff_route_refused (cancelled:partner_form_route) — a partner's-own-page offer never passes a member on; a bug upstream");
    } else stale();
    return 'next';
  }

  let verdict: PartnerVerdict;
  if (module.currentState === 'archived' && module.archiveReason === 'trustee_archived') {
    verdict = { kind: 'withdrawn' };
  } else if (module.leadHandoffUrl === null || module.signingKeySecretName === null) {
    // Unreachable for a `trust_sends` row (0216 `marketplace_modules_route_columns`) — refused, ⛔ guessed.
    verdict = { kind: 'refuse', detail: 'failed_delivery:url_refused' };
  } else {
    const url = checkLeadUrl(module.leadHandoffUrl);
    if (url.kind === 'url_refused') verdict = { kind: 'refuse', detail: 'failed_delivery:url_refused' };
    else if (url.kind === 'port_refused') verdict = { kind: 'refuse', detail: 'failed_delivery:port_refused' };
    else {
      // ── S5 — the secret (cached per tick per NAME), then DNS + the address table ──
      const name = module.signingKeySecretName;
      let cached = tick.secrets.get(name);
      if (cached === undefined) {
        cached = deps.resolveSecret(name).then(
          // A value of nothing but whitespace is NOT a key, and neither is one with whitespace AROUND it: `key\n` (a version written
          // with `echo`) would sign every lead with the newline and the partner would answer 401 to each. The bytes are ⛔ altered —
          // trimming would sign with a key the partner may not hold — so the row is HELD until the version is mended.
          (value) =>
            value === null || value.trim() === ''
              ? ({ kind: 'not_found' } as const)
              : value.trim() !== value
                ? ({ kind: 'padded' } as const)
                : ({ kind: 'ok', value } as const),
          (err: unknown) => ({ kind: 'outage', fault: faultClass(err) }) as const,
        );
        tick.secrets.set(name, cached);
      }
      const secret = await cached;
      if (secret.kind !== 'ok') {
        tick.keyHeld.add(moduleId);
        const why =
          secret.kind === 'not_found'
            ? 'the secret was not found'
            : secret.kind === 'padded'
              ? 'the secret value has whitespace around it'
              : `Secret Manager unavailable [${secret.fault}]`;
        verdict = { kind: 'hold', word: 'signing_key', why };
      } else {
        const resolved = await client.resolve(url.hostname);
        if (resolved.kind === 'dns_unavailable') {
          tick.open.add(row.authority);
          verdict = { kind: 'hold', word: 'dns', why: 'the partner host did not resolve' };
        } else if (resolved.kind === 'address_refused') {
          tick.open.add(row.authority);
          verdict = { kind: 'address_refused' };
        } else {
          verdict = { kind: 'ok', hostname: url.hostname, path: url.path, address: resolved.address, secret: secret.value, partnerId: module.partnerId };
        }
      }
    }
  }

  // ── S6 — the member's side decides FIRST (I2): P0–P5 in a scope transaction that COMMITS ──
  let member: marketplace.LeadHandoffPredicateVerdict;
  try {
    member = await withPariwarScope(deps.pool, pariwarId, (db: Db, c: pg.PoolClient) => marketplace.readLeadHandoffPredicates(db, c, row));
  } catch (err) {
    return hold('db', `a member-side read failed [${faultClass(err)}]`, true);
  }
  if (member.kind === 'unsound') return hold('db', `the member-side read is unsound (${member.why})`, false);
  if (member.kind === 'cancel') {
    if (!(await marketplace.cancelLeadHandoff(deps.pool, { ...ref, word: member.word }))) stale();
    return 'next';
  }
  if (verdict.kind === 'withdrawn') {
    if (!(await marketplace.cancelLeadHandoff(deps.pool, { ...ref, word: 'module_withdrawn' }))) stale();
    return 'next';
  }
  if (verdict.kind === 'refuse') {
    await fail(verdict.detail);
    return 'next';
  }
  if (verdict.kind === 'address_refused') {
    await release('released:address_refused', true);
    return 'next';
  }
  if (verdict.kind === 'hold') return hold(verdict.word, verdict.why, false);

  // ── S7 — ONE audit line, written first; the decrypt alone is its `mutate` (TR7) ──
  let sealed: marketplace.SealedLeadMemberFieldsV1;
  try {
    sealed = await audit.withCompensatingAudit(deps.pool, {
      auditIntent: {
        pariwarId,
        actorId: null,
        actorRole: 'system',
        action: MODULE_LEAD_FIELDS_DECRYPTED_ACTION,
        resourceLocator: `module_lead/${leadId}`,
        requestPayloadHash: sha256Hex(canonicalJsonStringify({ attempt: row.attemptCount, lead_id: leadId })),
        traceId: null,
      },
      mutate: () => marketplace.openLeadMemberFieldsV1(deps.encryption, { pariwarId, leadId, ciphertext: member.ciphertext }),
    });
  } catch (err) {
    if (err instanceof marketplace.LeadHandoffFieldsUnreadableError) {
      // Decision `2026-11-22-487` (1): a key the key service REJECTS is rejected for EVERY row when the key reference is wrong, and the
      // rejection cannot tell that from one bad row — so it is a HOLD (the attempt given back, the lead kept for the hold window) that
      // ends the tick, ⛔ a final failure. A held row comes back a minute later, behind every row already due: no stall.
      if (err.stage === 'key_rejected') return hold('kms', 'the key service rejected the key', true);
      await fail('failed_delivery:fields_unreadable');
      return 'next';
    }
    if (err instanceof marketplace.LeadHandoffDecryptUnavailableError) return hold('kms', 'the key service is unavailable', true);
    return hold('audit', `the decrypt audit line failed [${faultClass(err)}]`, true);
  }

  // ── S8 — build, sign, POST (⛔ connection held) ──
  const body = marketplace.buildLeadEnvelopeBody({ leadId, pariwarId, moduleId, partnerId: verdict.partnerId, submittedAt: row.createdAt, sealed });
  const headers = marketplace.leadRequestHeaders({
    secret: verdict.secret,
    t: Math.floor((deps.now ?? Date.now)() / 1000),
    body,
    pariwarId,
    moduleId,
    leadId,
  });
  const response: PartnerLeadResponse = await client.post({ hostname: verdict.hostname, path: verdict.path, address: verdict.address, headers, body });
  tick.sent += 1;

  // ── S9 — the attempted line: AFTER the response, BEFORE the settle; up to 3 tries ──
  const status = response.kind === 'response' ? response.status : response.kind === 'timeout' ? ATTEMPTED_STATUS_TIMEOUT : ATTEMPTED_STATUS_NETWORK;
  let lineWritten = false;
  let lastFault = 'none';
  for (let i = 0; i < ATTEMPTED_LINE_TRIES && !lineWritten; i += 1) {
    if (i > 0) await new Promise<void>((resolve) => setTimeout(resolve, deps.auditRetryPauseMs ?? marketplace.LEAD_HANDOFF_AUDIT_RETRY_PAUSE_MS));
    try {
      await audit.writeAuditEntry(deps.pool, {
        pariwarId,
        actorId: null,
        actorRole: 'system',
        action: MODULE_LEAD_ATTEMPTED_ACTION,
        resourceLocator: `module_lead/${leadId}/attempt/${String(row.attemptCount)}`,
        requestPayloadHash: sha256Hex(body),
        responseStatus: status >= 100 && status <= 599 ? status : ATTEMPTED_STATUS_NETWORK,
        traceId: null,
      });
      lineWritten = true;
    } catch (err) {
      lastFault = faultClass(err);
    }
  }
  if (!lineWritten) {
    say(`the attempted audit line could not be written [${lastFault}] — the row is left to its lease (at least once)`);
    return 'end_tick';
  }

  // ── S10 — settle ──
  const outcome = classifyLeadOutcome(response);
  if (outcome.kind === 'delivered') {
    const partnerReference = response.kind === 'response' ? response.partnerReference : null;
    if (!(await marketplace.settleLeadHandoffDelivered(deps.pool, { ...ref, httpStatus: outcome.status, partnerReference }))) stale();
    return 'next';
  }
  if (outcome.kind === 'transient') {
    tick.open.add(row.authority);
    await release(outcome.detail, outcome.setupFault);
    return 'next';
  }
  await fail(outcome.detail);
  return 'next';
}

let sharedClient: PartnerLeadClient | null = null;
/** The production client — built with NO argument (fence rule (e)), once per process. */
function defaultClient(): PartnerLeadClient {
  sharedClient ??= createPartnerLeadClient();
  return sharedClient;
}

/** The production cursor of the waiting pass — one per process. */
const processWaitingCursor: WaitingCursor = { leadId: null };

/**
 * ⭐ S2's waiting pass (W14; Decision `2026-11-22-487` (2), AMENDED by `-488`). For EVERY `due` row (`-488` (1) — one waiting out a
 * retry AND one due now that the claim may not reach): the member's side FIRST (the same P0–P5, in a scope transaction that commits),
 * then the offer (QE22 (A)); a stop cancels the row at once with the word S6 would write. `unsound` writes nothing — the row's own
 * attempt holds it. ONE CYCLE per pass: from behind the cursor to the end, then from the top back to where it started (round 3). The
 * cursor moves BEFORE each read. A THROW — listing a page, or reading or cancelling one row — ENDS THE PASS with ONE
 * `waiting_pass_failed` alarm and the tick goes on to the claim (`-488` (2)): the cursor is already past that row, so the next tick's
 * cycle starts behind it and comes round to it last. ⚠ It never throws. Returns how many rows it cancelled.
 */
async function runWaitingPass(deps: ModuleLeadHandoffDeps): Promise<number> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const cursor = deps.waitingCursor ?? processWaitingCursor;
  const budget = deps.waitingBudgetMs ?? marketplace.LEAD_HANDOFF_WAITING_BUDGET_MS;
  // The page the read REALLY returns (clamped once, here and in the read): a short page is the end of the list.
  const pageSize = marketplace.waitingPageSize(deps.waitingPage);
  const started = Date.now();
  // ⭐ ONE CYCLE per pass (code review 2026-11-22, round 3): the pass starts behind the cursor, runs to the end of the list, then WRAPS
  // to the top and stops at the row it started behind — so the rows before the cursor are re-checked in THIS tick too, ⛔ only on the
  // next one. (Without it, a pass that stopped part-way — a budget, a throw — left the next tick the tail alone, and a cursor left on
  // the last row made the next tick re-check nothing.)
  const startAt = cursor.leadId;
  let wrapped = startAt === null;
  let cancelled = 0;
  let at: string | null = null;
  try {
    for (;;) {
      const page = await marketplace.listWaitingLeadHandoffs(deps.pool, { afterLeadId: cursor.leadId, limit: pageSize });
      for (const waiting of page) {
        // After the wrap, a row past the start has been re-checked already in this pass: the cycle is complete.
        if (wrapped && startAt !== null && waiting.leadId > startAt) {
          cursor.leadId = null;
          return cancelled;
        }
        cursor.leadId = waiting.leadId;
        at = waiting.leadId;
        // Story 12.5b (QE5) — a `partner_form` offer's row: cancelled BEFORE the member's side is read (it is never sent).
        if (waiting.routePartnerForm) {
          if (await marketplace.cancelWaitingLeadHandoff(deps.pool, { pariwarId: waiting.pariwarId, leadId: waiting.leadId, word: 'partner_form_route' })) {
            cancelled += 1;
            alarm(
              `[jobs] module-lead-handoff: module_lead_handoff_route_refused (cancelled:partner_form_route) — a partner's-own-page offer never passes a member on; a bug upstream — pariwar ${waiting.pariwarId} module ${waiting.moduleId} lead ${waiting.leadId}`,
            );
          }
          at = null;
          if (Date.now() - started >= budget) return cancelled;
          continue;
        }
        const member = await withPariwarScope(deps.pool, waiting.pariwarId, (db: Db, c: pg.PoolClient) => marketplace.readLeadHandoffPredicates(db, c, waiting));
        const word: marketplace.LeadHandoffCancelWord | null =
          member.kind === 'cancel' ? member.word : member.kind === 'ok' && waiting.moduleWithdrawn ? 'module_withdrawn' : null;
        if (word !== null && (await marketplace.cancelWaitingLeadHandoff(deps.pool, { pariwarId: waiting.pariwarId, leadId: waiting.leadId, word }))) cancelled += 1;
        at = null;
        // A time budget (the first row always runs): the next tick resumes behind this row.
        if (Date.now() - started >= budget) return cancelled;
      }
      if (page.length < pageSize) {
        // The end of the list. Before the wrap: go round to the top, once. After it: the cycle is complete.
        if (wrapped) {
          cursor.leadId = null;
          return cancelled;
        }
        wrapped = true;
        cursor.leadId = null;
      }
    }
  } catch (err) {
    const fault = faultClass(err);
    alarm(
      `[jobs] module-lead-handoff: module_lead_handoff.waiting_pass_failed:${errorName(err)}${fault.startsWith('code:') ? ` [${fault}]` : ''} ` +
        `${at === null ? 'listing a page' : `at lead ${at}`} — the pass ends here, the claim still runs`,
    );
    return cancelled;
  }
}

/** One sweep. It always resolves. */
export async function runModuleLeadHandoffTick(deps: ModuleLeadHandoffDeps): Promise<ModuleLeadHandoffTickResult> {
  // The TICK's budget runs from its START (code review 2026-11-22, round 3): the lapse, the purge and the waiting pass's up-to-10 s
  // count against the 45 s, so the widened pass (`-488` (1)) does not push a tick past its minute.
  const tickStarted = Date.now();
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const sweepFailed = (step: string, err: unknown): void => {
    const fault = faultClass(err);
    alarm(`[jobs] module-lead-handoff: module_lead_handoff.sweep_failed:${errorName(err)}${fault.startsWith('code:') ? ` [${fault}]` : ''} at the ${step} — this tick swept nothing further`);
  };
  const empty = { lapsed: 0, purged: 0, cancelledWaiting: 0, claimed: 0, sent: 0, visitsPurged: 0 };

  // ── S1 ──
  try {
    if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
      alarm(
        '[jobs] module-lead-handoff: module_lead_handoff.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ' +
          '⛔ swept — a partner lead stays as it is until it can',
      );
      return { refused: true, ...empty };
    }
  } catch (err) {
    sweepFailed('role check', err);
    return { refused: false, ...empty };
  }

  // ── S2 ──
  let lapsed: marketplace.LapsedLeadHandoff[];
  let purged: number;
  try {
    lapsed = await marketplace.lapseLeadHandoffs(deps.pool, {
      ...(deps.leaseMs === undefined ? {} : { leaseMs: deps.leaseMs }),
      ...(deps.maxAttempts === undefined ? {} : { maxAttempts: deps.maxAttempts }),
      ...(deps.retryScheduleMs === undefined ? {} : { retryScheduleMs: deps.retryScheduleMs }),
    });
  } catch (err) {
    sweepFailed('lapse', err);
    return { refused: false, ...empty };
  }
  for (const l of lapsed) {
    if (l.status === 'failed_delivery') {
      alarm(`[jobs] module-lead-handoff: module_lead_handoff_failed (failed_delivery:outcome_unknown) — for partner-relationship review — pariwar ${l.pariwarId} module ${l.moduleId} lead ${l.leadId}`);
    }
  }
  try {
    purged = await marketplace.purgeLeadHandoffFields(deps.pool, deps.retentionDays === undefined ? {} : { retentionDays: deps.retentionDays });
  } catch (err) {
    sweepFailed('purge', err);
    return { refused: false, ...empty, lapsed: lapsed.length };
  }
  // `-488` (2): the waiting pass never throws — a throw in it ends the PASS (its own alarm), ⛔ the tick.
  const cancelledWaiting = await runWaitingPass(deps);

  // ── S3–S10, under a time budget ──
  const tick: Tick = { keyHeld: new Set(), open: new Set(), secrets: new Map(), raised: new Set(), sent: 0 };
  const budget = deps.tickBudgetMs ?? marketplace.LEAD_HANDOFF_TICK_BUDGET_MS;
  const started = tickStarted;
  let claimed = 0;
  do {
    const claimToken = randomUUID();
    let row: marketplace.ClaimedLeadHandoff | null;
    try {
      row = await marketplace.claimDueLeadHandoff(deps.pool, { claimToken, excludeModuleIds: [...tick.keyHeld], excludeAuthorities: [...tick.open] });
    } catch (err) {
      sweepFailed('claim', err);
      break;
    }
    if (row === null) break;
    claimed += 1;
    try {
      if ((await processRow(deps, tick, row, claimToken)) === 'end_tick') break;
    } catch (err) {
      // The row stays `attempting`; the lease finishes it. ⛔ The next row: a systemic fault would burn the queue.
      alarm(`[jobs] module-lead-handoff: a row crashed [${faultClass(err)}] — the tick ends, the lease finishes it — pariwar ${row.pariwarId} lead ${row.leadId}`);
      break;
    }
  } while (Date.now() - started < budget);

  // ── W15 (Story 12.5b QE5) — LAST, even when the budget is spent; a throw ends ONLY W15 ──
  let visitsPurged = 0;
  try {
    visitsPurged = await marketplace.purgeExpiredPartnerFormVisits(
      deps.pool,
      deps.visitRetentionDays === undefined ? {} : { retentionDays: deps.visitRetentionDays },
    );
  } catch (err) {
    const fault = faultClass(err);
    alarm(
      `[jobs] module-lead-handoff: module_lead_handoff.visit_purge_failed:${errorName(err)}${fault.startsWith('code:') ? ` [${fault}]` : ''} — ` +
        'the partner-form visit records were not purged this tick; the next tick retries',
    );
  }

  if (lapsed.length > 0 || purged > 0 || cancelledWaiting > 0 || claimed > 0 || visitsPurged > 0) {
    console.info('[jobs] module-lead-handoff tick', JSON.stringify({ lapsed: lapsed.length, purged, cancelledWaiting, claimed, sent: tick.sent, visitsPurged }));
  }
  return { refused: false, lapsed: lapsed.length, purged, cancelledWaiting, claimed, sent: tick.sent, visitsPurged };
}

/**
 * Register the queue + worker + per-minute cron (IST). `localConcurrency: 1` — ONE tick at a time on the tick's own pool (pg-boss `^12`
 * hands the handler an ARRAY of jobs); a tick that runs past the minute is covered by the 5-minute lease.
 */
export async function registerModuleLeadHandoffCron(
  boss: QueueClient,
  deps: ModuleLeadHandoffDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_MODULE_LEAD_HANDOFF_CRON;
  const tz = opts.tz ?? MODULE_LEAD_HANDOFF_TZ;
  await boss.createQueue(QUEUE_NAMES.MODULE_LEAD_HANDOFF);
  await boss.work(QUEUE_NAMES.MODULE_LEAD_HANDOFF, { localConcurrency: 1 }, async (jobs: Job[]) => {
    const result = await runModuleLeadHandoffTick(deps);
    return { jobs: jobs.length, ...result };
  });
  await boss.schedule(QUEUE_NAMES.MODULE_LEAD_HANDOFF, cron, {}, { tz });
}
