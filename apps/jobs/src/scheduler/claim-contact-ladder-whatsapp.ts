// The claimant's WHATSAPP STEP of the delivery ladder — the QUARTER-HOURLY SWEEP and the per-ladder CHILD (Story 6.37d, Tasks 5–6;
// AC4, AC5; WS6–WS10; I1–I5, I10; `2026-10-17-350` ruling 2 (1) *"after SMS has been sent and not been delivered for 4 hours, send
// message over WhatsApp"*, `-351` 1 A, `-357` the claimant only, `2026-10-20-368` Q1 A *"between 9 am and 8 pm"*).
// ⭐ I5 — ONE Meta template sent DIRECTLY through the ONE WhatsApp client cache (`ContributionProviderWiring.whatsappAppCache`):
// ⛔ the alert cascade (whose WhatsApp → SMS step would send a SECOND text), ⛔ an SMS, ⛔ the fixture provider (it reports
// `accepted` for a message that never went — T2). A WhatsApp refusal ⛔ falls back to a text: the ladder's own SMS steps are the
// fallback. This module is a SIBLING of `claim-contact-ladder.ts` so the symbol fence can scan it alone (T29).
//
// ── The sweep, every 15 minutes IST, AROUND THE CLOCK ─────────────────────────────────────────────────────────────────────
//   (0) the role guard (`canReadAcrossPariwars` — false ⇒ ONE alarm, the tick ends; ⛔ "nothing due");
//   (1) the LAPSED in-flight send rows finished `may_have_sent:lease_lapsed` (⛔ re-sent);
//   (2) the STARTS — a ladder for every `family_sms` row REPORTED `undelivered` in the last EIGHT hours (`-370` d2 — was two) that has ⛔ ladder
//       (`sms_send_deliveries.reported_at` — the time WE received a report; ⛔ a "previous tick" watermark exists: a missed tick is
//       covered by the overlap, a duplicate start absorbed by `claim_contact_ladders_origin_uq`), through the SAME start as the
//       10:00 sweep (`startContactLaddersForClaim` — ⛔ `advance`), then LD13's start tail (the burst / hash alarms — ADR-0042's
//       ratified bound counts on them). ⚠ A report the correlator settles more than eight hours after receipt, or a flip to
//       `undelivered` by an earlier-received report, is started by the next 10:00 sweep instead (disclosed);
//   (3) only INSIDE 09:00–20:00 IST — the due steps (SQL only, ⛔ HMAC, ⛔ decrypt): running ladders whose step is `pending` 4 hours
//       after the origin, and send rows `attempting` with ⛔ marker and a lapsed lease — ONE child each.
// ── The child (one ladder) ────────────────────────────────────────────────────────────────────────────────────────────────
//   at night ⇒ re-enqueued at the next 09:00 BEFORE anything else; (1) OUTSIDE any lock — the config (the switch, the token, the
//   template name for the claim's language, the helpline) and, for the certificate chase, every person's hash (CR7); (2) UNDER the
//   chase lock — `beginContactLadderWhatsapp` (the ends, the stops, the basis, the gate; the send row claimed, the step `sent`);
//   COMMIT; (3) decrypt → normalise → hash (≠ the ladder's ⇒ `no_target`), the bound values validated; (4) the window again, THE
//   IN-FLIGHT MARKER (`lost` ⇒ a transient), the window after it; (5) the send (`timeoutMs`); (6) the bounded finalise per
//   `classifyDirectWaSendFailure` (`-366` d2's order): may_have_sent ⇒ recorded, ⛔ resent; transient ⇒ retried, the FINAL attempt
//   finishes `skipped:transient_exhausted`; recipient ⇒ `rejected_recipient`; scope / unknown scope ⇒ `refused` + ALARM (⛔ a park —
//   the narrowing of `-365` Consequence 2 recorded by `-367`).
// ⛔ NOTHING here writes an event or a claim state, approves, refuses or closes a claim. ⛔ No name, number or helpline in a
// payload, a log line, an alarm or a `detail` — ids only. ⚠ Alarms reach the LOGS only until roster Row 32 (h).

import { assertWhatsappBodyParams, classifyDirectWaSendFailure, type WhatsappAppCache, type WhatsappMessagingHandle } from '@twt/channels';
import { channelConfig, claim as claimDomain, cycleCalendar, ids, smsDelivery, withPariwarScope, type Db } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  type ContactLadderDeps,
  mergeTally,
  newTally,
  raiseLadderStartAlarms,
  startContactLaddersForClaim,
} from './claim-contact-ladder.js';
import { CLAIM_CONTACT_WA_LANGUAGE, type ClaimContactWaLocale } from './claim-contact-wa-templates.js';
import { claimCorrectionHelplineConfigKey } from './claim-correction-sms-templates.js';
import {
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_PLAN_LOCK_TIMEOUT,
  CORRECTION_SWEEP_RETRY,
  ClaimCorrectionTransientError,
  type CorrectionChildAttempt,
} from './claim-correction-reminders.js';
import { CORRECTION_SEND_TIMEOUT_MS } from './claim-dlt-sms-send.js';
import { TEMPLATE_NAME_FORM } from './claim-peer-mesh-wa-reminders.js';
import { PEER_REQUEST_DEFER_FLOOR_MS, isInPeerRequestSendWindow, nextPeerRequestSendWindowStart } from './claim-peer-mesh-requests.js';
import { waTemplateConfigKey, type WaTemplatePurpose } from './wa-template-config-key.js';

/**
 * The step's deps — the ladder's own (the pool, the KMS deps, the config resolver; the START reuses the 10:00 plan) + THE one
 * per-process WhatsApp client cache and the fail-loud secret resolver (`resolveChannelSecret`).
 */
export type ContactLadderWhatsappDeps = ContactLadderDeps & {
  readonly whatsappAppCache: WhatsappAppCache;
  /** Secret NAME → value, FAIL-LOUD: any throw ⇒ `skipped:whatsapp_config_unreadable` + alarm. */
  readonly resolveSecret: (secretName: string) => Promise<string>;
};

/** The child's payload — ids ONLY. */
export interface ContactLadderWhatsappPayload {
  readonly ladderId: string;
  readonly claimCaseId: string;
  readonly chase: 'correction' | 'certificate';
}

/** The quarter-hourly cron — around the clock (a report at 21:00 still starts its ladder that night; its WhatsApp waits for 09:00). */
export const CONTACT_LADDER_WA_SWEEP_CRON = '*/15 * * * *';
/** The sweep job's expiry — inside its own quarter hour (⛔ the daily ladder sweep's 90 minutes). */
export const CONTACT_LADDER_WA_SWEEP_EXPIRE_SECONDS = 12 * 60;
/** The child's expiry — ≤ 10 min (one send ≤ its 10 s timeout + the bounded statements). ⛔ 6.31's 45. */
export const CONTACT_LADDER_WA_CHILD_EXPIRE_SECONDS = 10 * 60;
/** AC4 — a quarter-hourly start considers reports RECEIVED in the last this-many hours (the overlap covers a missed tick). */
export const CONTACT_LADDER_WA_START_WINDOW_HOURS = 8; // Decision 2026-10-20-370 decision 2 (was 2): covers MSG91's 2 h / 6 h correlation retries
/** The start scan's page size (raw SQL — clamped BY HAND, AC12) and the tick's claim bound (hitting it is ALARMED). */
export const CONTACT_LADDER_WA_START_PAGE = 500;
export const CONTACT_LADDER_WA_START_MAX_CLAIMS = 5_000;
/** The due-step selection's page size and the tick's child bound (hitting it is ALARMED). */
export const CONTACT_LADDER_WA_DUE_PAGE = 500;
export const CONTACT_LADDER_WA_MAX_CHILDREN = 5_000;

/** The daily ladder sweep's hour — a quarter-hourly start after it stores SMS 2 by the late-start rule (WS6). */
const DAILY_RUN_HOUR_IST = 10;

function alarmOf(deps: Pick<ContactLadderDeps, 'onAlarm'>): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

/** WS14 (ii) — `contact_ladder.whatsapp`, one log line per outcome / skip reason, by ids. */
function logOutcome(outcome: string, p: ContactLadderWhatsappPayload, pariwarId: string): void {
  console.info(`[jobs] contact-ladder-whatsapp: contact_ladder.whatsapp ${outcome} — ladder ${p.ladderId}, claim ${p.claimCaseId}, Pariwar ${pariwarId}`);
}

/** The SQLSTATEs of the lock / statement timeouts, walking the `.cause` chain. */
function isLockTimeout(err: unknown): boolean {
  let e: unknown = err;
  const seen = new Set<unknown>();
  while (typeof e === 'object' && e !== null && !seen.has(e)) {
    const code = (e as { readonly code?: unknown }).code;
    if (code === '55P03' || code === '57014') return true;
    seen.add(e);
    e = (e as { readonly cause?: unknown }).cause;
  }
  return false;
}

/** WS6 — the date of the NEXT daily 10:00 IST run: today before 10:00 IST, else tomorrow. */
export function nextDailyLadderRunOn(now: Date): string {
  return cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(new Date(now.getTime() - DAILY_RUN_HOUR_IST * 3_600_000)), 1);
}

/**
 * T27 — a body VALUE Meta would refuse (a newline, a tab, or four or more spaces in a row — third-party documented). The helpline
 * is a config value: one bad value must ⛔ become a Meta refusal on every ladder.
 */
export function isUnsendableWhatsappValue(value: string): boolean {
  return /[\n\r\t]/.test(value) || / {4,}/.test(value);
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ContactLadderWhatsappSweepResult {
  readonly refused: boolean;
  readonly finishedLapsed: number;
  readonly startClaims: number;
  readonly started: number;
  readonly enqueued: number;
  readonly inWindow: boolean;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/** ONE child per ladder — ids only; `singletonKey` is a LABEL (pg-boss 12 ⛔ dedupes a standard queue — the chase lock, the UNIQUE `ladder_id` and the holder CAS are the dedup). */
export async function enqueueContactLadderWhatsappChild(
  boss: EnqueueBoss,
  input: { readonly pariwarId: string; readonly payload: ContactLadderWhatsappPayload; readonly startAfter?: Date },
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SEND,
    {
      pariwarId: input.pariwarId,
      requestId: `claim.contact_ladder_wa:${input.payload.ladderId}`,
      actorId: null,
      traceId: `claim.contact_ladder_wa:${input.payload.ladderId}`,
      payload: input.payload,
    } satisfies JobEnvelope<ContactLadderWhatsappPayload>,
    {
      singletonKey: `${input.payload.ladderId}:wa`,
      retryLimit: CHILD_RETRY_LIMIT,
      retryDelay: CHILD_RETRY_DELAY_SECONDS,
      retryBackoff: true,
      expireInSeconds: CONTACT_LADDER_WA_CHILD_EXPIRE_SECONDS,
      ...(input.startAfter !== undefined ? { startAfter: input.startAfter } : {}),
    },
  );
}

/**
 * ⚠ CROSS-TENANT — the BYPASSRLS pool only (the sweep checked it first). The claims of ONE chase with a `family_sms` row accepted
 * and REPORTED `undelivered` whose report was RECEIVED in the last `CONTACT_LADDER_WA_START_WINDOW_HOURS` and that is ⛔ the origin of
 * a ladder (⛔ the 14-day candidate set — T4). Ids only; keyset on `claim_case_id`; a `MATERIALIZED` CTE under the page's LIMIT.
 * Review R7 (2026-10-20) — `reminderIds` carries EVERY matching reminder for the claim (`array_agg` under the GROUP BY, ⛔ a
 * plain `DISTINCT` row per reminder — that would let the SAME `claim_case_id` span two keyset pages and silently drop rows):
 * the shared start (`startContactLaddersForClaim`) considers every recipient's full 14-day candidate set, so WITHOUT this the
 * quarter-hourly tick started a ladder for ANY recipient with an old uncovered report once ONE recipient's report tripped the
 * recency scan — even a recipient whose own report was meant to wait for the next 10:00 daily sweep. The caller narrows the
 * start to origins actually IN this set (`StartsOnly.eligibleOriginRowIds`).
 *
 * ── DELIBERATE: a CROSS-TENANT READ on the BYPASSRLS pool (family 9) ── ids only (`claim_case_id`, `pariwar_id`,
 * `reminder_id` — a correction/certificate reminder row's own id, ⛔ PII); every write follows in the per-claim scope
 * transaction `startContactLaddersForClaim` opens, after its own locked re-check. The caller checks `canReadAcrossPariwars`
 * FIRST. `allow` (tests) narrows it. RE-EXAMINE when: the result carries more than ids, the read projects PII, a write is
 * added on this pool, the pool loses BYPASSRLS, or a per-tenant scheduler exists.
 */
async function listNewReportClaims(
  pool: pg.Pool,
  input: { readonly chase: 'correction' | 'certificate'; readonly after: string | null; readonly allow: readonly string[] | null },
): Promise<{ readonly claimCaseId: string; readonly pariwarId: string; readonly reminderIds: readonly string[] }[]> {
  const table = input.chase === 'correction' ? 'claim_correction_reminders' : 'claim_certificate_reminders';
  const kind = input.chase === 'correction' ? 'cr' : 'ce';
  const limit = Math.min(Math.max(1, CONTACT_LADDER_WA_START_PAGE), 1000);
  const { rows } = await pool.query<{ claim_case_id: string; pariwar_id: string; reminder_ids: string[] }>(
    `WITH c AS MATERIALIZED (
       SELECT r.claim_case_id, r.pariwar_id, r.reminder_id FROM ${table} r
         JOIN sms_send_deliveries d ON d.send_kind = $1 AND d.send_row_id = r.reminder_id AND d.pariwar_id = r.pariwar_id
        WHERE r.purpose = 'family_sms' AND r.outcome = 'accepted' AND d.delivery_state = 'undelivered'
          AND d.reported_at >= now() - make_interval(hours => $2)
          AND NOT EXISTS (SELECT 1 FROM claim_contact_ladders l WHERE l.chase = $3 AND l.origin_row_id = r.reminder_id)
          -- Decision -370 fix-diff review: skip a report whose person ALREADY has a running ladder in this chase (the start would decline it
          -- (one ladder at a time), so re-planning it every tick of the 8-hour window was pure lock and KMS load.
          AND NOT EXISTS (SELECT 1 FROM claim_contact_ladders l2 WHERE l2.chase = $3 AND l2.claim_case_id = r.claim_case_id
                            AND l2.person_key = r.recipient_key AND l2.state = 'running')
     )
     SELECT claim_case_id, pariwar_id, array_agg(DISTINCT reminder_id) AS reminder_ids
       FROM c
      WHERE ($4::uuid IS NULL OR claim_case_id > $4::uuid)
        AND ($5::uuid[] IS NULL OR pariwar_id = ANY($5::uuid[]))
      GROUP BY claim_case_id, pariwar_id
      ORDER BY claim_case_id ASC
      LIMIT $6`,
    [kind, CONTACT_LADDER_WA_START_WINDOW_HOURS, input.chase, input.after, input.allow === null ? null : [...input.allow], limit],
  );
  return rows.map((r) => ({ claimCaseId: r.claim_case_id, pariwarId: r.pariwar_id, reminderIds: r.reminder_ids }));
}

/** ⭐ THE QUARTER-HOURLY SWEEP. See the module header. A per-claim / per-ladder try/catch — one never costs another its step. */
export async function runContactLadderWhatsappSweep(deps: ContactLadderWhatsappDeps, boss: EnqueueBoss): Promise<ContactLadderWhatsappSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const inWindow = isInPeerRequestSendWindow(now);
  const empty: ContactLadderWhatsappSweepResult = { refused: true, finishedLapsed: 0, startClaims: 0, started: 0, enqueued: 0, inWindow };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm('[jobs] contact-ladder-whatsapp: REFUSED — `pariwarAllowlist` is set while NODE_ENV is production (it is test-only); nothing was swept');
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm('[jobs] contact-ladder-whatsapp: REFUSED — `pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant); nothing was swept');
    return empty;
  }
  // (0) T24 — an RLS-bound role would see ⛔ row: ⛔ ladder would start, ⛔ step would go. Refuse, loudly (roster Row 26).
  if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
    alarm('[jobs] contact-ladder-whatsapp: contact_ladder.rls_bound_role — the pool role cannot read across Pariwars (roster Row 26); ⛔ swept');
    return empty;
  }

  // (1) The LAPSED in-flight rows FIRST — regardless of the window and the ladder's state (⛔ such row is stranded).
  const lapsed: { sendId: string; claimCaseId: string; pariwarId: string }[] = [];
  for (;;) {
    const batch = await claimDomain.finishLapsedInFlightContactLadderWhatsapp(deps.pool, { now, allow });
    lapsed.push(...batch);
    if (batch.length < claimDomain.CONTACT_LADDER_WA_MAINTENANCE_BATCH) break;
  }
  for (const l of lapsed) {
    console.info(`[jobs] contact-ladder-whatsapp: contact_ladder.whatsapp may_have_sent:lease_lapsed — send ${l.sendId}, claim ${l.claimCaseId}, Pariwar ${l.pariwarId}`);
  }

  // (2) The STARTS for reports received in the last eight hours (`-370` d2) — the SAME start as the 10:00 sweep, ⛔ `advance`.
  const today = cycleCalendar.istDateOf(now);
  const startsOnly = { nextDailyRunOn: nextDailyLadderRunOn(now) };
  const tally = newTally();
  let startClaims = 0;
  let startBounded = false;
  starts: for (const chase of ['correction', 'certificate'] as const) {
    let cursor: string | null = null;
    for (;;) {
      const page = await listNewReportClaims(deps.pool, { chase, after: cursor, allow });
      for (const row of page) {
        if (startClaims >= CONTACT_LADDER_WA_START_MAX_CLAIMS) {
          startBounded = true;
          break starts;
        }
        startClaims += 1;
        try {
          mergeTally(
            tally,
            await startContactLaddersForClaim(deps, chase, row, today, {
              ...startsOnly,
              eligibleOriginRowIds: new Set(row.reminderIds),
            }),
          );
        } catch (err) {
          alarm(`[jobs] contact-ladder-whatsapp: the ${chase} start for claim ${row.claimCaseId} failed${isLockTimeout(err) ? ' (a lock / statement timeout — the next tick retries)' : ''} — ${err instanceof Error ? err.name : 'error'}`);
        }
      }
      if (page.length < CONTACT_LADDER_WA_START_PAGE) break;
      cursor = page[page.length - 1]!.claimCaseId;
    }
  }
  await raiseLadderStartAlarms(deps, tally);
  if (startBounded) alarm(`[jobs] contact-ladder-whatsapp: hit the start bound of ${String(CONTACT_LADDER_WA_START_MAX_CLAIMS)} claims — the rest wait for the next tick`);

  // (3) The due steps — enqueued ONLY inside the window (a child at night would only defer itself).
  let enqueued = 0;
  if (inWindow) {
    let after: string | null = null;
    let bounded = false;
    due: for (;;) {
      const page = await claimDomain.listDueContactLadderWhatsapp(deps.pool, { now, after, limit: CONTACT_LADDER_WA_DUE_PAGE, allow });
      for (const d of page) {
        if (enqueued >= CONTACT_LADDER_WA_MAX_CHILDREN) {
          bounded = true;
          break due;
        }
        try {
          await enqueueContactLadderWhatsappChild(boss, {
            pariwarId: d.pariwarId,
            payload: { ladderId: d.ladderId, claimCaseId: d.claimCaseId, chase: d.chase },
          });
          enqueued += 1;
        } catch (err) {
          alarm(`[jobs] contact-ladder-whatsapp: failed to enqueue the WhatsApp step of ladder ${d.ladderId} — ${err instanceof Error ? err.name : 'error'}`);
        }
      }
      if (page.length < CONTACT_LADDER_WA_DUE_PAGE) break;
      after = page[page.length - 1]!.ladderId;
    }
    if (bounded) alarm(`[jobs] contact-ladder-whatsapp: hit the bound of ${String(CONTACT_LADDER_WA_MAX_CHILDREN)} WhatsApp steps — the rest wait for the next tick`);
  }
  return { refused: false, finishedLapsed: lapsed.length, startClaims, started: tally.started, enqueued, inWindow };
}

// ── The config (AC5 (1) — OUTSIDE any lock) ────────────────────────────────────────────────────────────────────

interface StepConfig {
  readonly verdict: claimDomain.LadderWhatsappConfigVerdict;
  readonly templateName: string | null;
  readonly helpline: string | null;
  readonly client: WhatsappMessagingHandle | null;
}

const PURPOSE: Readonly<Record<'correction' | 'certificate', WaTemplatePurpose>> = {
  correction: 'claim_contact.correction_reminder',
  certificate: 'claim_contact.certificate_reminder',
};

/**
 * ⭐ AC5 (1) / WS9 — the Pariwar's WhatsApp config for the claim's language, every Secret Manager read HERE (⛔ network under the
 * chase lock). It only READS: the verdict is an INPUT the begin judges AFTER the ends / stops (and re-reads the switch under the
 * lock). Unset template name, the switch off, ⛔ phone number ⇒ `whatsapp_not_configured` (a Pariwar not yet live — ⛔ alarm); a
 * THROW (an outage, or a dotted name refused `INVALID_ARGUMENT` — F7), a blank token name, a client config throw ⇒
 * `whatsapp_config_unreadable`; a malformed name ⇒ `whatsapp_template_invalid`; an unreadable, missing or unsendable helpline (T27)
 * ⇒ `helpline_unreadable` — each of the last three a FAULT (alarmed when the begin records it).
 */
async function stepConfig(deps: ContactLadderWhatsappDeps, pariwarId: ids.PariwarId, chase: 'correction' | 'certificate', locale: ClaimContactWaLocale): Promise<StepConfig> {
  const none = (verdict: claimDomain.LadderWhatsappConfigVerdict): StepConfig => ({ verdict, templateName: null, helpline: null, client: null });
  const wa = await withPariwarScope(deps.pool, pariwarId, (db: Db) => channelConfig.getWaConfig(db, pariwarId));
  if (wa === null || !wa.enabled) return none('whatsapp_not_configured');
  const phoneNumberId = wa.phoneNumberId?.trim() ?? '';
  if (phoneNumberId === '') return none('whatsapp_not_configured');
  let templateName: string | null;
  try {
    templateName = (await deps.resolveConfig(waTemplateConfigKey(PURPOSE[chase], locale, pariwarId)))?.trim() ?? null;
  } catch {
    return none('whatsapp_config_unreadable');
  }
  if (templateName === null || templateName === '') return none('whatsapp_not_configured');
  if (!TEMPLATE_NAME_FORM.test(templateName)) return none('whatsapp_template_invalid');
  let helpline: string | null;
  try {
    helpline = (await deps.resolveConfig(claimCorrectionHelplineConfigKey(pariwarId)))?.trim() ?? null;
  } catch {
    return none('helpline_unreadable');
  }
  if (helpline === null || helpline === '' || isUnsendableWhatsappValue(helpline)) return none('helpline_unreadable');
  const secretName = wa.accessTokenSecretName?.trim() ?? '';
  if (secretName === '') return none('whatsapp_config_unreadable');
  let accessToken: string;
  try {
    accessToken = await deps.resolveSecret(secretName);
  } catch {
    return none('whatsapp_config_unreadable');
  }
  let client: WhatsappMessagingHandle;
  try {
    client = deps.whatsappAppCache.messagingFor(pariwarId, { phoneNumberId, accessToken, graphApiVersion: wa.graphApiVersion });
  } catch {
    return none('whatsapp_config_unreadable');
  }
  return { verdict: 'ok', templateName, helpline, client };
}

// ── The CHILD — one ladder ─────────────────────────────────────────────────────────────────────────────────────

export type ContactLadderWhatsappChildResult =
  | { readonly status: 'sent'; readonly outcome: 'accepted' | 'rejected_recipient' | 'may_have_sent' | 'refused' | 'transient_exhausted' }
  | { readonly status: 'skipped'; readonly reason: string; readonly where: 'step' | 'row' }
  | { readonly status: 'no_target'; readonly reason: 'no_sendable_number' | 'hash_mismatch' }
  | { readonly status: 'ended'; readonly state: string }
  | { readonly status: 'deferred'; readonly startAfter: Date }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE ladder's WhatsApp step. See the module header.
 * @throws ClaimCorrectionTransientError  a transient failure before the final attempt (pg-boss retries the SAME job — it re-claims
 *   its own row)
 * @throws Error  a finalise that failed after Meta ACCEPTED the message (after ONE alarm carrying the ids and the wamid — the only
 *   record of it; the lapsed-row finisher later records `may_have_sent:lease_lapsed`)
 */
export async function runContactLadderWhatsappChild(
  deps: ContactLadderWhatsappDeps,
  boss: EnqueueBoss,
  envelope: JobEnvelope<ContactLadderWhatsappPayload>,
  jobId: string,
  attempt?: CorrectionChildAttempt,
): Promise<ContactLadderWhatsappChildResult> {
  const alarm = alarmOf(deps);
  const clock = (): Date => deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] contact-ladder-whatsapp: missing pariwarId for ladder ${p.ladderId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const tag = `ladder ${p.ladderId} (claim ${p.claimCaseId}, Pariwar ${pid})`;
  const finalAttempt = attempt === undefined || attempt.retryCount >= attempt.retryLimit;
  const scoped = <T>(fn: (d: Db) => Promise<T>) => withPariwarScope(deps.pool, pariwarId, fn);

  // ⛔ Never at night — at its OWN start, BEFORE any read or re-claim (a night re-take would re-claim the row every 45 minutes and
  // the 09:00 child would answer `held_by_other`).
  const deferToMorning = async (at: Date): Promise<ContactLadderWhatsappChildResult> => {
    const next = nextPeerRequestSendWindowStart(at);
    const startAfter = new Date(Math.max(next.getTime(), at.getTime() + PEER_REQUEST_DEFER_FLOOR_MS));
    await enqueueContactLadderWhatsappChild(boss, { pariwarId: pid, payload: p, startAfter });
    return { status: 'deferred', startAfter };
  };
  const startAt = clock();
  if (!isInPeerRequestSendWindow(startAt)) return deferToMorning(startAt);

  // ── (1) OUTSIDE any lock: the claim's language, the config, the certificate hashes (CR7) ──
  const contact = await scoped((db) => claimDomain.readClaimContact(db, pariwarId, claimCaseId));
  const locale: ClaimContactWaLocale = contact.contact?.contactLocale === 'en' ? 'en' : 'hi';
  const config = await stepConfig(deps, pariwarId, p.chase, locale);
  let certificatePrelock: { people: readonly claimDomain.CertificatePerson[]; hashes: Map<string, claimDomain.CertificateNumberHash> } | undefined;
  if (p.chase === 'certificate') {
    const recipients = await scoped((db) => claimDomain.readCertificateRecipients(db, pariwarId, claimCaseId));
    const people = recipients.cannotRemind === null ? recipients.people : [];
    certificatePrelock = { people, hashes: await claimDomain.hashCertificateRecipients(people, pid, deps.encryption) };
  }

  // ── (2) UNDER the chase lock: the two-half re-check, the claim, the step `sent` — COMMIT ──
  let begun: claimDomain.BeginContactLadderWhatsappResult;
  try {
    begun = await withPariwarScope(deps.pool, pariwarId, async (_db: Db, client: pg.PoolClient) => {
      await client.query(`SET LOCAL lock_timeout = '${CORRECTION_PLAN_LOCK_TIMEOUT}'`);
      return claimDomain.beginContactLadderWhatsapp(client, {
        pariwarId,
        claimCaseId,
        ladderId: p.ladderId,
        chase: p.chase,
        jobId,
        now: clock(),
        inWindow: isInPeerRequestSendWindow(clock()),
        nextWindowStart: nextPeerRequestSendWindowStart(clock()),
        config: { verdict: config.verdict, templateName: config.templateName, locale },
        finalAttempt,
        crypto: deps.encryption,
        ...(certificatePrelock !== undefined ? { certificatePrelock } : {}),
      });
    });
  } catch (err) {
    if (isLockTimeout(err)) throw new ClaimCorrectionTransientError(`[jobs] contact-ladder-whatsapp: lock wait timed out for ${tag} — retrying`);
    if (err instanceof claimDomain.CertificateRecipientsMovedError) {
      throw new ClaimCorrectionTransientError(`[jobs] contact-ladder-whatsapp: the contact record moved for ${tag} — retrying`);
    }
    throw err;
  }
  if (begun.kind === 'noop') return { status: 'noop', reason: begun.reason };
  if (begun.kind === 'ended') {
    logOutcome(`ended:${begun.state}`, p, pid);
    return { status: 'ended', state: begun.state };
  }
  if (begun.kind === 'skipped') {
    logOutcome(`skipped:${begun.reason}`, p, pid);
    if (claimDomain.LADDER_WHATSAPP_CONFIG_FAULTS.includes(begun.reason as claimDomain.LadderWhatsappConfigVerdict)) {
      alarm(`[jobs] contact-ladder-whatsapp: contact_ladder.whatsapp_config_fault — ${begun.reason} in Pariwar ${pid}; the WhatsApp step of ${tag} was recorded skipped (⛔ sent — the ladder goes on to its texts)`);
    }
    if (begun.reason === 'hash_unavailable') {
      alarm(`[jobs] contact-ladder-whatsapp: contact_ladder.hash_unavailable — the number could not be hashed on the final attempt for ${tag}; the WhatsApp step was recorded skipped`);
    }
    return { status: 'skipped', reason: begun.reason, where: begun.where };
  }
  if (begun.kind === 'wait') return { status: 'noop', reason: 'not_due' };
  if (begun.kind === 'defer') {
    const startAfter = new Date(Math.max(begun.until.getTime(), clock().getTime() + PEER_REQUEST_DEFER_FLOOR_MS));
    await enqueueContactLadderWhatsappChild(boss, { pariwarId: pid, payload: p, startAfter });
    return { status: 'deferred', startAfter };
  }
  if (begun.kind === 'transient') {
    throw new ClaimCorrectionTransientError(`[jobs] contact-ladder-whatsapp: transient ${begun.detail} for ${tag} — retrying`);
  }

  // ── After the commit: ⛔ KMS under a lock ──
  const row = { pariwarId, sendId: begun.sendId, jobId };
  /** A pre-send fault: the note and a retry — or, on the FINAL attempt, `skipped:hash_unavailable` + the alarm. */
  const preSendFault = async (detail: string): Promise<ContactLadderWhatsappChildResult> => {
    if (finalAttempt) {
      const done = await scoped((d) => claimDomain.finishContactLadderWhatsappSkipped(d, { ...row, reason: 'hash_unavailable' }));
      alarm(`[jobs] contact-ladder-whatsapp: contact_ladder.hash_unavailable — the number could not be read or hashed on the final attempt for ${tag}; recorded skipped${done ? '' : ' (the row had moved on)'}`);
      logOutcome('skipped:hash_unavailable', p, pid);
      return { status: 'skipped', reason: 'hash_unavailable', where: 'row' };
    }
    await scoped((d) => claimDomain.noteContactLadderWhatsappTransient(d, { ...row, detail, phase: 'pre_send' }));
    throw new ClaimCorrectionTransientError(`[jobs] contact-ladder-whatsapp: transient ${detail} for ${tag} — retrying`);
  };
  // ── (3) decrypt → normalise → hash; ≠ the ladder's ⇒ `no_target` ──
  let e164: string | null;
  try {
    e164 = await claimDomain.resolveCorrectionMobile(begun.person.mobileCiphertext, begun.person.mobileSource, pid, deps.encryption);
  } catch {
    return preSendFault(claimDomain.contactLadderWaDetail('decrypt_failed', 'tier1'));
  }
  if (e164 === null) {
    const done = await scoped((d) => claimDomain.finishContactLadderWhatsappNoTarget(d, { ...row, reason: 'no_sendable_number' }));
    if (!done) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its no_target finish`);
    logOutcome('no_target:no_sendable_number', p, pid);
    return { status: 'no_target', reason: 'no_sendable_number' };
  }
  let hash: string;
  try {
    hash = await claimDomain.correctionNumberHash(e164, pid, deps.encryption);
  } catch {
    return preSendFault(claimDomain.contactLadderWaDetail('hash_failed', 'tier1'));
  }
  if (!claimDomain.sameNumberHash(hash, begun.recipientNumberHash)) {
    const done = await scoped((d) => claimDomain.finishContactLadderWhatsappNoTarget(d, { ...row, reason: 'hash_mismatch' }));
    if (!done) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its no_target finish`);
    logOutcome('no_target:hash_mismatch', p, pid);
    return { status: 'no_target', reason: 'hash_mismatch' };
  }
  // The bound values — validated BEFORE the marker (the client's own rules + T27), so a bad VALUE never reaches it.
  const reference = claimDomain.claimShortReference(p.claimCaseId);
  const helpline = config.helpline ?? '';
  const values = [reference, helpline];
  try {
    assertWhatsappBodyParams(values);
    if (values.some(isUnsendableWhatsappValue)) throw new Error('unsendable value');
  } catch {
    await scoped((d) => claimDomain.finishContactLadderWhatsappSkipped(d, { ...row, reason: 'helpline_unreadable' }));
    alarm(`[jobs] contact-ladder-whatsapp: contact_ladder.whatsapp_config_fault — helpline_unreadable in Pariwar ${pid}; the WhatsApp step of ${tag} was recorded skipped`);
    logOutcome('skipped:helpline_unreadable', p, pid);
    return { status: 'skipped', reason: 'helpline_unreadable', where: 'row' };
  }

  // ── (4) the window AT the marker; THE IN-FLIGHT MARKER; the window AFTER it commits ──
  const markAt = clock();
  if (!isInPeerRequestSendWindow(markAt)) return deferToMorning(markAt);
  const marked = await scoped((d) =>
    claimDomain.markContactLadderWhatsappInFlight(d, { ...row, leaseMarginMs: claimDomain.CONTACT_LADDER_WA_HANDOFF_MARGIN_MS, now: clock() }),
  );
  if (marked === 'capped') {
    // `-370` / `-371` backstop — this job holds the row but its two ambiguous sends are spent: ⛔ a call, finish it now.
    const done = await scoped((d) =>
      claimDomain.finishContactLadderWhatsappSendCapped(d, { ...row, transient: claimDomain.contactLadderWaDetail('marker_lost', 'send_cap'), phase: 'at_marker' }),
    );
    if (!done) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its send-cap finish`);
    logOutcome('may_have_sent:send_cap (at the marker — ⛔ sent)', p, pid);
    return { status: 'sent', outcome: 'may_have_sent' };
  }
  if (marked === 'lost') {
    const lost = claimDomain.contactLadderWaDetail('marker_lost', 'lease');
    if (finalAttempt) {
      const done = await scoped((d) => claimDomain.finishContactLadderWhatsappExhausted(d, { ...row, transient: lost, phase: 'pre_send' }));
      // Round 2 (P10) — `lost` means another job (or a same-job-id twin) holds the row: the finish then matches ⛔ row, and
      // THAT holder's outcome stands — ⛔ report an exhausted finish this job never wrote.
      if (!done) {
        logOutcome('noop (marker lost to another holder — the row is ⛔ this job\'s)', p, pid);
        return { status: 'noop', reason: 'marker_lost' };
      }
      logOutcome('skipped:transient_exhausted', p, pid);
      return { status: 'sent', outcome: 'transient_exhausted' };
    }
    await scoped((d) => claimDomain.noteContactLadderWhatsappTransient(d, { ...row, detail: lost, phase: 'pre_send' }));
    throw new ClaimCorrectionTransientError(`[jobs] contact-ladder-whatsapp: ${tag} — the lease lapsed before the send (⛔ sent); retrying`);
  }
  const afterMarkAt = clock();
  if (!isInPeerRequestSendWindow(afterMarkAt)) {
    const released = await scoped((d) => claimDomain.releaseContactLadderWhatsappInFlight(d, row));
    if (!released) alarm(`[jobs] contact-ladder-whatsapp: ${tag} — moved on before its marker could be released for the night`);
    return deferToMorning(afterMarkAt);
  }

  // ── (5) The send — the reminder's two values (I6), the template for the claim's language, its registered code ──
  let wamid: string | null = null;
  let failure: unknown = null;
  try {
    wamid = await config.client!.send(
      { to: e164.replace(/^\+/, ''), templateName: begun.templateName, languageCode: CLAIM_CONTACT_WA_LANGUAGE[begun.locale], bodyParams: values },
      { timeoutMs: deps.sendTimeoutMs ?? CORRECTION_SEND_TIMEOUT_MS },
    );
  } catch (err) {
    failure = err;
  }

  // ── (6) The bounded finalise, per `-366` d2's order ──
  const finalise = (fields: { outcome: 'accepted' | 'rejected_recipient' | 'may_have_sent' | 'refused'; providerMessageId?: string; detail?: string }) =>
    withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) => claimDomain.finaliseContactLadderWhatsapp(client, { ...row, ...fields }));
  if (wamid !== null) {
    let moved: boolean;
    try {
      moved = await finalise({ outcome: 'accepted', providerMessageId: wamid });
    } catch (err) {
      alarm(`[jobs] contact-ladder-whatsapp: ${tag} — Meta ACCEPTED the WhatsApp (wamid ${wamid}) but its finalise FAILED (${err instanceof Error ? err.name : 'error'}); the row will be recorded may_have_sent:lease_lapsed`);
      throw err;
    }
    if (!moved) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its finalise (Meta accepted it, wamid ${wamid})`);
    logOutcome('accepted', p, pid);
    return { status: 'sent', outcome: 'accepted' };
  }
  const outcome = classifyDirectWaSendFailure(failure);
  if (outcome.kind === 'may_have_sent') {
    const detail = claimDomain.contactLadderWaDetail('may_have_sent', outcome.token);
    const moved = await finalise({ outcome: 'may_have_sent', detail });
    if (!moved) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its finalise (${detail})`);
    logOutcome(detail, p, pid);
    return { status: 'sent', outcome: 'may_have_sent' };
  }
  if (outcome.kind === 'transient') {
    const note = claimDomain.contactLadderWaTransientDetail(outcome.token);
    // Decisions -370 / -371 — the row's SECOND send Meta may have acted on (a 5xx after the connection opened): finish it
    // `may_have_sent:send_cap`, ⛔ a third call. A 429 or a connection that never opened is ⛔ counted (the domain decides).
    if (await scoped((d) => claimDomain.finishContactLadderWhatsappSendCapped(d, { ...row, transient: note }))) {
      logOutcome(`may_have_sent:send_cap (after ${note})`, p, pid);
      return { status: 'sent', outcome: 'may_have_sent' };
    }
    if (finalAttempt) {
      // The FINAL token is logged (the row alone cannot prove a post-send 5xx happened — `first_detail` keeps the first).
      const done = await scoped((d) => claimDomain.finishContactLadderWhatsappExhausted(d, { ...row, transient: note, phase: 'post_send' }));
      if (!done) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its exhausted finish (${note})`);
      logOutcome(`skipped:transient_exhausted (final ${note})`, p, pid);
      return { status: 'sent', outcome: 'transient_exhausted' };
    }
    await scoped((d) => claimDomain.noteContactLadderWhatsappTransient(d, { ...row, detail: note, phase: 'post_send' }));
    throw new ClaimCorrectionTransientError(`[jobs] contact-ladder-whatsapp: transient ${note} for ${tag} — retrying`);
  }
  if (outcome.kind === 'recipient') {
    const detail = claimDomain.contactLadderWaDetail('rejected_recipient', outcome.token);
    const moved = await finalise({ outcome: 'rejected_recipient', detail });
    if (!moved) alarm(`[jobs] contact-ladder-whatsapp: the send row of ${tag} moved on before its finalise (${detail})`);
    logOutcome(detail, p, pid);
    return { status: 'sent', outcome: 'rejected_recipient' };
  }
  // Scope-wide (every 132xxx included — `template_not_approved`) or unknown scope — RECORDED + ALARMED, ⛔ parked (WS8 (v)): the
  // ladder cannot wait; the next ladders of the Pariwar refuse the same way until it is fixed (T10 — the alarm is the signal).
  const detail = claimDomain.contactLadderWaDetail('refused', outcome.token);
  const moved = await finalise({ outcome: 'refused', detail });
  alarm(
    `[jobs] contact-ladder-whatsapp: contact_ladder.whatsapp_refused — Meta refused the WhatsApp step of ${tag} (${detail}, ` +
      `${outcome.kind === 'scope' ? "the Pariwar's account, number or template" : 'scope unknown'}); recorded refused, ⛔ retried — the ladder goes on to its texts${moved ? '' : ' (the row had moved on)'}`,
  );
  logOutcome(detail, p, pid);
  return { status: 'sent', outcome: 'refused' };
}

// ── Registration ───────────────────────────────────────────────────────────────────────────────────────────────

/** Register the two queues, their workers and the quarter-hourly IST sweep (beside `registerContactLadderWorkers`). */
export async function registerContactLadderWhatsappWorkers(
  boss: QueueClient,
  deps: ContactLadderWhatsappDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  // `includeMetadata` — the child reads its retry count (the FINAL attempt records what never cleared).
  await boss.createQueue(QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SEND, { expireInSeconds: CONTACT_LADDER_WA_CHILD_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SEND, { includeMetadata: true }, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      const meta = job as Job & { readonly retryCount?: unknown; readonly retryLimit?: unknown };
      const attempt =
        typeof meta.retryCount === 'number' && typeof meta.retryLimit === 'number' ? { retryCount: meta.retryCount, retryLimit: meta.retryLimit } : undefined;
      results.push(await runContactLadderWhatsappChild(deps, boss, job.data as JobEnvelope<ContactLadderWhatsappPayload>, job.id, attempt));
    }
    return { processed: results.length, results };
  });
  // ⚠ The expiry set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, `schedule` upserts.
  await boss.createQueue(QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SWEEP, { expireInSeconds: CONTACT_LADDER_WA_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SWEEP, async () => {
    try {
      return await runContactLadderWhatsappSweep(deps, boss);
    } catch (err) {
      console.error('[jobs] contact-ladder-whatsapp tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_CONTACT_LADDER_WA_SWEEP,
    opts.sweepCron ?? CONTACT_LADDER_WA_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CONTACT_LADDER_WA_SWEEP_EXPIRE_SECONDS },
  );
}
