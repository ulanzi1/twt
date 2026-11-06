// The FIELD WORKER CODE SMS sweep — Story 13.1b (Task 5; decision `2026-11-06-450` AD2–AD5, AD7, AD10–AD13; AC2–AC8, AC13).
//
// A newly approved field worker is sent their code by SMS. The approval's transaction recorded the text as DUE
// (`field_worker_code_sms_sends`, written by `activateFieldWorker`); this per-minute cron is the only thing that sends it. ⛔ `dispatch()`:
// it is keyed on a member, and a worker is not one. It sends through the generic DLT path (`prepareDltSms`, then `sendPreparedDltSms`).
//
// ── The tick ────────────────────────────────────────────────────────────────────────────────────────
//   0. ⭐ The roster Row 26 guard FIRST: under an RLS-bound login the claim would see ⛔ row with ⛔ error, a quiet "nothing due". So
//      `canReadAcrossPariwars` false ⇒ ONE `rls_bound_role` alarm and the tick ends. A throw from the guard, the lapse or the claim ⇒ ONE
//      `sweep_failed:<error name>` alarm and the tick ends: pg-boss logs ⛔ handler throw, and the lapse is what expires rows.
//   1. The lapse: `attempting` past the lease ⇒ `exhausted:outcome_unknown`, `due` past the max age ⇒ `exhausted:expired`, ONE alarm a row.
//   2. Up to `FIELD_WORKER_CODE_SMS_TICK_MAX` times: claim ONE row (TR6: a batch's tail would wait out its lease) and work it.
//
// ── One row, in this order (AC7) ────────────────────────────────────────────────────────────────────
//   (a) the claim, committed: from here on the row is `attempting`, and only a definite no sends it back.
//   (b) one scope transaction reads the state, the sealed mobile, the code, the language, IN THAT ORDER, stopping at a worker who is not
//       `active` (13.1a's rule: ⛔ a code read for a worker who is not active), and closes.
//   (c) `prepareDltSms`: a config refusal touches ⛔ audit line and ⛔ KMS (TR3).
//   (d) ONE audit line, written first, naming the system, then the decrypt, as its `mutate` and nothing else (TR2: a send failure inside it
//       would write a false `_rolled_back` over a decrypt that succeeded).
//   (e) the gateway call. (f) settle, or release.
// ⭐ ⛔ CONNECTION is held across (d) or (e): the audit line needs one of its own, and this pool is the sweep's own (`max: 3`, `localConcurrency: 1`;
// [[project_jobs_pool_two_connection_starvation]]).
// ⭐ AT MOST ONCE (AD3, I2). Anything that MAY have reached the gateway is FINAL `exhausted:outcome_unknown…`, read as "not confirmed" (AD12).
// Anything that DEFINITELY did not goes back to `due` behind its backoff. A release ends the tick (most of its causes are global, and
// one per-row fault must not cost the queue a day), and so does a send result that says the GATEWAY is failing: the next row would fare
// the same, each with a decrypt. A crash leaves the row `attempting` and ends the tick; the lease finishes it.
// ⭐ This file reaches the code registry by name: it is the ONE reviewed `ALLOWED` entry outside the module and the API door (AD7, the reach
// fence). Its Pariwar source is the claimed row's `pariwar_id`, passed to `withPariwarScope`, and the registry re-proves the scope on the
// connection. The code is ⛔ copied onto the row.
// ⛔ LOGGED, ALARMED OR THROWN: a mobile, a code, a template id or `err.message` (it can carry a bound value). Ids, details and error names
// only. ⛔ The fixture provider: it reports `accepted` (TR7); `prepareDltSms` is the only route.

import { createHash, randomUUID } from 'node:crypto';

import type { SmsAppClient } from '@twt/channels';
import {
  attributionCode,
  audit,
  canonicalJsonStringify,
  claim,
  fieldWorker,
  ids,
  smsDelivery,
  withPariwarScope,
  type Db,
  type schema,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { ALERT_SMS_FINALISE_BACKOFF_MS } from './alert-sms-send.js';
import { prepareDltSms, sendPreparedDltSms, type ClaimCorrectionSmsResult, type ClaimDltSmsPreflight } from './claim-dlt-sms-send.js';
import { FIELD_WORKER_CODE_SMS_TEMPLATES, renderFieldWorkerCodeSms } from './field-worker-code-sms-templates.js';

/** Every minute (AD2): up to a minute or so between an approval and its text. */
export const DEFAULT_FIELD_WORKER_CODE_SMS_CRON = '* * * * *';
export const FIELD_WORKER_CODE_SMS_TZ = 'Asia/Kolkata';
/** The audit action; `_rolled_back` is its automatic twin. */
export const FIELD_WORKER_CODE_SMS_AUDIT_ACTION = 'field_worker.code_sms_mobile_decrypted';
/** At most this many rows a tick, each its own claim. */
export const FIELD_WORKER_CODE_SMS_TICK_MAX = 20;

/** What the sweep needs — composed in boot from the sweep's own pool and the shared SMS deps. */
export interface FieldWorkerCodeSmsDeps {
  /** The tick's OWN pool: the claim, each scope transaction, and the audit lines. BYPASSRLS today (Row 26). */
  readonly pool: pg.Pool;
  readonly encryption: fieldWorker.FieldWorkerDecryptDeps;
  readonly smsAppClient: SmsAppClient;
  /** The Secret Manager read (`resolveSmsDltConfig` in production). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** MG5 — the ONE process pre-flight memo (absent ⇒ ⛔ pre-flight). */
  readonly smsPreflight?: ClaimDltSmsPreflight;
  /** Override the send timeout (tests). */
  readonly sendTimeoutMs?: number;
  /** The alarm sink (default `console.warn`) — ids and details only. */
  readonly onAlarm?: (message: string) => void;
  /** The pauses between settle tries (tests pass `[0, 0]`); default the twin's. */
  readonly finaliseBackoffMs?: readonly number[];
  /** Tests only: the domain judges on the DB clock, and `created_at` cannot be backdated by an update. */
  readonly tickMax?: number;
  readonly leaseMs?: number;
  readonly maxAgeMs?: number;
}

export interface FieldWorkerCodeSmsTickResult {
  /** True when the Row 26 guard refused to sweep. */
  readonly refused: boolean;
  /** Rows the lapse ended. */
  readonly lapsed: number;
  /** Rows claimed this tick. */
  readonly claimed: number;
}

/** After one row: take the next, or end the tick. */
type Next = 'next' | 'end_tick';

/** What the read found. ⛔ `Row` carries it past the scope's COMMIT. */
type ReadResult =
  | { readonly kind: 'not_active' }
  | { readonly kind: 'no_code' }
  | { readonly kind: 'ready'; readonly mobileCiphertext: string; readonly code: string; readonly locale: schema.FieldWorkerCodeSmsLocale };

/** The name of a thrown error. ⛔ Its message: it can carry a bound value. */
const errorName = (err: unknown): string => (err instanceof Error ? err.name : 'unknown');

/** The CLASS of a thrown error: a SQLSTATE or Node code, else its name (the twin's `faultClass`). */
function faultClass(err: unknown): string {
  const code = (err as { code?: unknown } | null | undefined)?.code;
  if (typeof code === 'string' && /^[A-Z0-9_]{3,24}$/.test(code)) return `code:${code}`;
  return errorName(err);
}

const GATEWAY_CODE = /^[A-Za-z0-9_.-]{1,64}$/;
/** A six-digit run could be the code (TR9): `claim.sanitizeSmsGatewayCode` bars seven, so one reaches this file. */
const SIX_DIGITS = /[0-9]{6}/;

/**
 * Classify FIRST, sanitise second (the Outcomes section): split a gateway word at its first colon, and replace a `<code>` token outside the
 * grammar with `unknown`, keeping the class, so `rate_limited:…` stays released and `invalid_number:…` stays `rejected_invalid_number`.
 */
function splitGatewayWord(word: string): { readonly cls: string; readonly code: string } {
  const at = word.indexOf(':');
  const token = at < 0 ? '' : word.slice(at + 1);
  return { cls: at < 0 ? word : word.slice(0, at), code: GATEWAY_CODE.test(token) && !SIX_DIGITS.test(token) ? token : 'unknown' };
}

/** What became of a send: the row's end, whether a person is told, whether the next row may run. */
type Settlement =
  | { readonly kind: 'release'; readonly detail: string }
  | {
      readonly kind: 'final';
      readonly outcome: fieldWorker.FieldWorkerCodeSmsFinalOutcome;
      readonly detail: string | null;
      readonly providerMessageId?: string;
      readonly alarm: boolean;
      readonly next: Next;
    };

const unknownOutcome = (cause: string): Settlement => ({
  kind: 'final',
  outcome: 'error',
  detail: `${fieldWorker.FIELD_WORKER_CODE_SMS_OUTCOME_UNKNOWN_PREFIX}:${cause}`,
  alarm: true,
  next: 'end_tick',
});

/**
 * The Outcomes table's send rows. Only `rate_limited:*` goes back: the gateway answered, and it said no. Every other transient MAY have
 * reached it. The SEND's `config:sms_messaging_unavailable` is an unknown (`provider.send` began), unlike prepare's (AD12, G11).
 * @internal exported for its unit test.
 */
export function settleSend(core: ClaimCorrectionSmsResult): Settlement {
  if (core.kind === 'transient') {
    const { cls, code } = splitGatewayWord(core.detail);
    if (cls === 'rate_limited') return { kind: 'release', detail: `rate_limited:${code}` };
    return unknownOutcome(`api_unavailable:${code}`);
  }
  if (core.outcome === 'accepted') {
    if (!core.providerMessageId) return unknownOutcome('unknown:no_request_id');
    return { kind: 'final', outcome: 'accepted', detail: null, providerMessageId: core.providerMessageId, alarm: false, next: 'next' };
  }
  const { cls, code } = splitGatewayWord(core.detail);
  if (core.outcome === 'rejected_invalid_number') {
    return { kind: 'final', outcome: 'rejected_invalid_number', detail: `invalid_number:${code}`, alarm: false, next: 'next' };
  }
  if (core.outcome === 'rejected_unreachable') {
    return { kind: 'final', outcome: 'rejected_unreachable', detail: `carrier_reject:${code}`, alarm: false, next: 'next' };
  }
  if (cls === 'auth' || cls === 'dlt_template_not_approved') {
    return { kind: 'final', outcome: 'error', detail: `${cls}:${code}`, alarm: true, next: 'end_tick' };
  }
  if (core.detail === 'config:sms_messaging_unavailable') return unknownOutcome('unknown:sms_messaging_unavailable');
  return unknownOutcome(`unknown:${code}`);
}

/** A `prepareDltSms` refusal as a storable detail: nothing was sent, so the word stands, its `<code>` token sanitised. */
function refusalDetail(detail: string): string {
  const { cls, code } = splitGatewayWord(detail);
  return `${cls}:${code}`;
}

/** Work ONE claimed row. A throw leaves it `attempting`: the caller logs it, ends the tick, and the lease finishes the row (TR4). */
async function processRow(deps: FieldWorkerCodeSmsDeps, row: fieldWorker.ClaimedFieldWorkerCodeSms, claimToken: string): Promise<Next> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const { sendId, pariwarId, fieldWorkerId } = row;
  const where = `pariwar ${pariwarId} send ${sendId}`;
  const say = (what: string): void => alarm(`[jobs] field-worker-code-sms: ${what} — ${where}`);

  /**
   * AD3 — the twin's `finalise`, in full, for a settle and a release alike: a THROW is retried after each pause; a `false` is ⛔ retried, the
   * row moved on; a `false` after an earlier throw is worded as unconfirmed, because that try may have committed; when every try throws,
   * alarm with the send id and, on an accept, the gateway's request id, the only handle on that text. The row is left to its lease.
   * It answers whether OUR write landed, so a caller says "ended" only then (code review CB45): each miss has already alarmed here.
   */
  const record = async (write: (client: pg.PoolClient) => Promise<boolean>, answered: string, requestId?: string): Promise<boolean> => {
    const pauses = deps.finaliseBackoffMs ?? ALERT_SMS_FINALISE_BACKOFF_MS;
    const handle = requestId === undefined ? '' : ` (gateway request ${requestId})`;
    let threw = false;
    let lastFault = 'none';
    for (let i = 0; i <= pauses.length; i += 1) {
      let wrote: boolean;
      try {
        wrote = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) => write(client));
      } catch (err) {
        lastFault = faultClass(err);
        threw = true;
        const pause = pauses[i];
        if (pause !== undefined && pause > 0) await new Promise<void>((resolve) => setTimeout(resolve, pause));
        continue;
      }
      // Outside the `try` on purpose: the CAS has COMPLETED, so a throwing alarm sink must not make this loop retry it.
      if (!wrote) {
        say(
          threw
            ? `a record try failed and a later one found the row already moved on — whether OUR write landed is unconfirmed; the send ended ${answered}${handle}`
            : `the row had already moved on (the record lost) — the send ended ${answered}${handle}`,
        );
      }
      return wrote;
    }
    say(`the send ended ${answered} but its record could not be written [${lastFault}] — it is left to its lease${handle}`);
    return false;
  };

  const settle = async (
    outcome: fieldWorker.FieldWorkerCodeSmsFinalOutcome,
    detail: string | null,
    opts: { readonly locale?: schema.FieldWorkerCodeSmsLocale; readonly providerMessageId?: string } = {},
  ): Promise<boolean> =>
    record(
      (client) => fieldWorker.settleFieldWorkerCodeSms(client, { pariwarId, sendId, claimToken, outcome, detail, ...opts }),
      outcome,
      opts.providerMessageId,
    );

  /** AD3 — back to `due`, or, on attempt `MAX_ATTEMPTS`, final: the ceiling bounds a stuck row. Either way the tick ends. */
  const release = async (detail: string, locale?: schema.FieldWorkerCodeSmsLocale): Promise<Next> => {
    if (row.attemptCount >= fieldWorker.FIELD_WORKER_CODE_SMS_MAX_ATTEMPTS) {
      if (await settle('error', 'exhausted:attempts', locale === undefined ? {} : { locale })) {
        say(`the text was not sent after ${row.attemptCount} attempts (last ${detail}) — ended exhausted:attempts; an officer reads the code by hand`);
      }
      return 'end_tick';
    }
    await record((client) => fieldWorker.releaseFieldWorkerCodeSms(client, { pariwarId, sendId, claimToken, detail }), `released (${detail})`);
    return 'end_tick';
  };

  // ── (b) the read ──
  let read: ReadResult;
  try {
    read = await withPariwarScope(deps.pool, pariwarId, async (db: Db, client: pg.PoolClient): Promise<ReadResult> => {
      const P = ids.pariwarId(pariwarId);
      const worker = await fieldWorker.getFieldWorkerForCodeSms(db, P, ids.fieldWorkerId(fieldWorkerId));
      if (worker === null) return { kind: 'no_code' };
      if (worker.currentState !== 'active') return { kind: 'not_active' };
      const held = await attributionCode.readAttributionCodeForFieldWorker(client, { pariwarId: P, fieldWorkerId: ids.fieldWorkerId(fieldWorkerId) });
      if (held === null) return { kind: 'no_code' };
      const locale = await claim.resolvePariwarDefaultLocale(db, P);
      return { kind: 'ready', mobileCiphertext: worker.mobileCiphertext, code: held.code, locale };
    });
  } catch (err) {
    if (err instanceof claim.PeerRequestLocaleMissingError) {
      if (await settle('error', 'config:pariwar_locale_missing')) {
        say('the Pariwar has no passport row, so no language — ended config:pariwar_locale_missing');
      }
      return 'next';
    }
    console.error('[jobs] field-worker-code-sms: the read failed', JSON.stringify({ sendId, error: errorName(err) }));
    return release('api_unavailable:db');
  }
  if (read.kind === 'not_active') {
    await settle('skipped_not_active', null);
    return 'next';
  }
  if (read.kind === 'no_code') {
    if (await settle('error', 'no_code')) say('an integrity fault: no worker or no code for a claimed row — ended no_code');
    return 'next';
  }
  const { mobileCiphertext, code, locale } = read;

  // ── (c) prepare: every check before the network; `render` and `values` close over the SAME locals ──
  const template = FIELD_WORKER_CODE_SMS_TEMPLATES[locale];
  const prep = await prepareDltSms(deps, {
    dltTemplateIdConfigKey: template.dltTemplateIdConfigKey,
    template: { text: template.registeredText, slots: template.slots },
    render: () => renderFieldWorkerCodeSms(locale, code),
    values: () => ({ code }),
    preflightFailOpen: true,
  });
  if (prep.kind === 'transient') return release(prep.detail, locale);
  if (prep.kind === 'final') {
    const detail = refusalDetail(prep.detail);
    if (await settle('error', detail, { locale })) {
      say(`the text cannot be prepared (${detail}) — ended, ⛔ sent later (AD13); an officer reads the code by hand`);
    }
    return 'next';
  }
  const { prepared } = prep;
  if (prepared.preflightWarning !== undefined) {
    say(`pre-flight unproven (${prepared.preflightWarning}) — sending is permitted (fail open); a text scrubbed by DLT comes back undelivered (roster Row 32)`);
  }

  // ── (d) one audit line, written first; the decrypt alone is its `mutate` ──
  let e164: string;
  try {
    e164 = await audit.withCompensatingAudit(deps.pool, {
      auditIntent: {
        pariwarId,
        actorId: null,
        actorRole: 'system',
        action: FIELD_WORKER_CODE_SMS_AUDIT_ACTION,
        resourceLocator: `field_worker/${fieldWorkerId}`,
        requestPayloadHash: createHash('sha256')
          .update(canonicalJsonStringify({ field_worker_id: fieldWorkerId, send_id: sendId }), 'utf8')
          .digest('hex'),
        traceId: null,
      },
      mutate: () => fieldWorker.decryptFieldWorkerField(mobileCiphertext, pariwarId, deps.encryption),
    });
  } catch (err) {
    if (err instanceof fieldWorker.FieldWorkerIdentityUnreadableError) {
      if (await settle('error', `identity_unreadable:${err.stage}`, { locale })) {
        say(`the stored mobile cannot be read (${err.stage}) — ended; an officer reads the code by hand`);
      }
      // Code review CB44 (BigDev, option A): a key the KMS rejects for this row is rejected for EVERY row when the key reference is wrong
      // (`-449`), so the next row would fare the same, as after `auth:*`: end the tick. A corrupt envelope or a failed tag is this row's alone.
      return err.stage === 'key_rejected' ? 'end_tick' : 'next';
    }
    if (err instanceof fieldWorker.FieldWorkerDecryptUnavailableError) return release('api_unavailable:kms', locale);
    console.error('[jobs] field-worker-code-sms: the audit line failed', JSON.stringify({ sendId, error: errorName(err) }));
    return release('api_unavailable:audit', locale);
  }

  // ── (e) the gateway ──
  const core = await sendPreparedDltSms(deps, prepared, { e164, correlation: { kind: 'fw', rowId: sendId } });

  // ── (f) settle, or release ──
  const settled = settleSend(core);
  if (settled.kind === 'release') return release(settled.detail, locale);
  const landed = await settle(settled.outcome, settled.detail, {
    locale,
    ...(settled.providerMessageId === undefined ? {} : { providerMessageId: settled.providerMessageId }),
  });
  if (settled.alarm && landed) say(`the send ended ${settled.outcome} (${settled.detail ?? 'no detail'}) — ⛔ re-sent; an officer reads the code by hand`);
  return settled.next;
}

/** One sweep. It always resolves. */
export async function runFieldWorkerCodeSmsTick(deps: FieldWorkerCodeSmsDeps): Promise<FieldWorkerCodeSmsTickResult> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const sweepFailed = (err: unknown): void => {
    // pg's `DatabaseError.name` is `error`, so the class rides beside the name when there is a code (the module-activation lesson).
    const fault = faultClass(err);
    alarm(`[jobs] field-worker-code-sms: field_worker_code_sms.sweep_failed:${errorName(err)}${fault.startsWith('code:') ? ` [${fault}]` : ''} — this tick swept nothing further`);
  };
  let lapsed: fieldWorker.LapsedFieldWorkerCodeSms[];
  try {
    if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
      alarm(
        '[jobs] field-worker-code-sms: field_worker_code_sms.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ' +
          '⛔ swept — a due code text stays due until it can, or until it expires at the max age (24 h); then an officer reads the code by hand',
      );
      return { refused: true, lapsed: 0, claimed: 0 };
    }
    lapsed = await fieldWorker.lapseFieldWorkerCodeSms(deps.pool, {
      ...(deps.leaseMs === undefined ? {} : { leaseMs: deps.leaseMs }),
      ...(deps.maxAgeMs === undefined ? {} : { maxAgeMs: deps.maxAgeMs }),
    });
  } catch (err) {
    sweepFailed(err);
    return { refused: false, lapsed: 0, claimed: 0 };
  }
  for (const r of lapsed) {
    alarm(`[jobs] field-worker-code-sms: ended ${r.detail} — ⛔ re-sent; an officer reads the code by hand — pariwar ${r.pariwarId} send ${r.sendId}`);
  }
  let claimed = 0;
  const tickMax = deps.tickMax ?? FIELD_WORKER_CODE_SMS_TICK_MAX;
  while (claimed < tickMax) {
    const claimToken = randomUUID();
    let row: fieldWorker.ClaimedFieldWorkerCodeSms | null;
    try {
      row = await fieldWorker.claimNextFieldWorkerCodeSms(deps.pool, { claimToken });
    } catch (err) {
      sweepFailed(err);
      break;
    }
    if (row === null) break;
    claimed += 1;
    try {
      if ((await processRow(deps, row, claimToken)) === 'end_tick') break;
    } catch (err) {
      // TR4 — the row stays `attempting` and the lease ends it `exhausted:outcome_unknown`. ⛔ The next row: a missing copy key would burn twenty.
      console.error('[jobs] field-worker-code-sms: a row crashed — the tick ends, the lease finishes it', JSON.stringify({ sendId: row.sendId, error: errorName(err) }));
      break;
    }
  }
  if (lapsed.length > 0 || claimed > 0) {
    console.info('[jobs] field-worker-code-sms tick', JSON.stringify({ lapsed: lapsed.length, claimed }));
  }
  return { refused: false, lapsed: lapsed.length, claimed };
}

/**
 * Register the queue + worker + per-minute cron (IST). `localConcurrency: 1` — ONE tick at a time on the tick's own pool (pg-boss `^12` hands
 * the handler an ARRAY of jobs).
 */
export async function registerFieldWorkerCodeSmsCron(
  boss: QueueClient,
  deps: FieldWorkerCodeSmsDeps,
  opts: { cron?: string; tz?: string } = {},
): Promise<void> {
  const cron = opts.cron ?? DEFAULT_FIELD_WORKER_CODE_SMS_CRON;
  const tz = opts.tz ?? FIELD_WORKER_CODE_SMS_TZ;
  await boss.createQueue(QUEUE_NAMES.FIELD_WORKER_CODE_SMS);
  await boss.work(QUEUE_NAMES.FIELD_WORKER_CODE_SMS, { localConcurrency: 1 }, async (jobs: Job[]) => {
    const result = await runFieldWorkerCodeSmsTick(deps);
    return { jobs: jobs.length, ...result };
  });
  await boss.schedule(QUEUE_NAMES.FIELD_WORKER_CODE_SMS, cron, {}, { tz });
}
