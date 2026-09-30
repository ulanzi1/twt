// The claim-correction REMINDERS — the daily sweep, the family SMS and the staff push — Story 6.19b (Tasks 3, 4, 6;
// AC2, AC3, AC4; the shared spec's D3, D4, D7, D11, D20, D21, D26, D30, D32–D34 as amended by `2026-09-29-266` …
// `-271`).
//
// ── What runs when ────────────────────────────────────────────────────────────────────────────────────────────
// ⭐ The SWEEP (daily 10:00 IST) enumerates OPEN runs — a raw, bounded, cross-tenant read on the BYPASSRLS pool,
// alarmed at its cap — and, per run, in ONE scope transaction under the trustee lock:
//   · ends the run when its return is no longer the live one (`superseded`) or it reached day 90 (`day_90`) — through
//     the domain's end-run, ⛔ never re-derived;
//   · ⭐ tier (a) `resubmitted` PAUSES the whole run (⛔ no send, ⛔ no record); tier (b) "the family's part is done"
//     pauses the FAMILY only (`-269` §2); D30 (nobody nameable) sends the family ⛔ nothing — the District Admin is
//     still reminded;
//   · D3's CATCH-UP per person: the latest due slot with ⛔ no record is enqueued ONCE (`late` unless it is today's),
//     older missed slots are written `skipped_superseded` — ⛔ no burst;
//   · the STAFF rows are written by the sweep itself (a staff row sends nothing — the queue is the channel, AC4):
//     the District Admin's scheduled reminder (D34 — ONE per claim per day, the open run's days; D21 stops it once
//     every family recipient is letter-eligible AND delivered), the staff run's day-12 escalation to every Pariwar
//     Admin, the letter chase (found-dead + 7 … + 12, escalated on + 13), and each person's ONE `letter_second_due`;
//   · then one staff PUSH per staff member with a row today (deduped by its own `staff_push` row).
// Before the runs: the EXHAUSTED-ROW FINALISER (a time bound — every row still `attempting` from a previous IST day
// becomes `error` + alarm; ⛔ no catch-up for it), D26's `skipped_superseded` markers for runs ended by a mark change
// on one of their slot days, and the `rejected_unreachable` burst alarm (≥ 3 on one day — a content-level block).
//
// ⭐ The CHILD (one family SMS): re-check + claim in ONE transaction under the lock (the domain's
// `beginCorrectionFamilySend`), COMMIT, then decrypt → resolve config → send (10-second timeout) → compare-and-set.
// It throws ONLY on a transient failure (`rate_limited`, `api_unavailable`, a timeout, a Secret Manager outage), so
// pg-boss retries (the SAME job re-claims its own row at once). ⚠ At-least-once: recorded, ⛔ never hidden.
//
// ⛔ NOTHING here approves, refuses or closes a claim (invariant 1). ⛔ No name in any message (invariant 4).
// ⛔ Never `delivered` for an accept (invariant 3). ⛔ Job payloads carry ids — ⛔ never a number.

import { createHash } from 'node:crypto';

import {
  createSmsDltProvider,
  dispatch,
  type AuditPort,
  type ProviderRegistry,
  type RenderedMessageHash,
  type SmsAppClient,
} from '@twt/channels';
import { Alert } from '@twt/contracts';
import {
  claim as claimDomain,
  cycleCalendar,
  encryption,
  ids,
  notifications,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CLAIM_CORRECTION_SMS_TEMPLATES,
  claimCorrectionHelplineConfigKey,
  renderClaimCorrectionSms,
  type ClaimCorrectionSmsLocale,
  type ClaimCorrectionSmsMessage,
} from './claim-correction-sms-templates.js';

// ── Operational knobs ────────────────────────────────────────────────────────────────────────────────────────

/** IST — never a UTC cron (architecture §scheduling). */
export const CLAIM_CORRECTION_TZ = 'Asia/Kolkata';
/** Max open runs one sweep considers — a full batch is ALARMED, never silently capped. */
export const DEFAULT_CORRECTION_SWEEP_RUN_LIMIT = 1000;
/** A send is abandoned after this and counted `api_unavailable` (the OTP path's `sms-step-up-delivery.ts` budget). */
export const CORRECTION_SEND_TIMEOUT_MS = 10_000;
/** D26's marker window — runs ended `mark_changed` within this are checked for a slot-day marker. */
export const CORRECTION_MARK_CHANGE_LOOKBACK_MS = 36 * 60 * 60 * 1000;
/** `-269` §4 — one day's `rejected_unreachable` sends at or above this alarm (a content-level carrier block). */
export const CORRECTION_UNREACHABLE_BURST_THRESHOLD = 3;
/** The family SMS child's own retry policy — ⛔ not borrowed from `contribution-notify-triggers`'s (same VALUES
 * today by coincidence; declared here so a future edit to that unrelated feature cannot silently change this one). */
export const CHILD_RETRY_LIMIT = 4;
export const CHILD_RETRY_DELAY_SECONDS = 60;
/**
 * ⚠ The SWEEP and STAFF-PUSH retry policy, stated — ⛔ never pg-boss 12.19.1's default (2 IMMEDIATE retries,
 * `QUEUE_DEFAULTS`). Both are idempotent (the reminder table's UNIQUE; the push's own row).
 */
export const CORRECTION_SWEEP_RETRY = { retryLimit: 2, retryDelay: 60, retryBackoff: true } as const;
export const CORRECTION_PUSH_RETRY = { retryLimit: 2, retryDelay: 60, retryBackoff: true } as const;

// ── Payloads (NON-PII: ids and dates only — ⛔ never a number, a name or an address) ───────────────────────────

export interface CorrectionFamilySmsPayload {
  readonly runId: string;
  readonly claimCaseId: string;
  readonly slotDay: number;
  readonly personKey: string;
  /** The IST date the sweep enqueued it for (`sent_on`). */
  readonly sentOn: string;
  readonly late: boolean;
}

export interface CorrectionStaffPushPayload {
  readonly claimCaseId: string;
  readonly runId: string;
  readonly slotDay: number;
  readonly userId: string;
  readonly sentOn: string;
}

// ── Deps ─────────────────────────────────────────────────────────────────────────────────────────────────────

export interface ClaimCorrectionReminderDeps {
  /** The BYPASSRLS service pool — the cross-tenant scans and the `withPariwarScope` pool (⚠ `max: 2` in boot). */
  readonly pool: pg.Pool;
  /** Tier-1 decrypt + the number hash (the jobs KMS deps). */
  readonly encryption: encryption.FieldCryptoDeps;
  /** THE one global SMS gateway client (`buildContributionProviderResolver`). */
  readonly smsAppClient: SmsAppClient;
  /** Config NAME → value, `null` = "not provisioned"; THROWS on a Secret Manager outage (`resolveSmsDltConfig`). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** The staff push's `dispatch()` seams. */
  readonly push: {
    readonly audit: AuditPort;
    readonly hashRendered: RenderedMessageHash;
    readonly resolveProviders?: (key: { pariwarId: string; category: Alert['alert_category'] }) => Promise<ProviderRegistry>;
  };
  readonly now?: () => Date;
  readonly onAlarm?: (message: string) => void;
  readonly runLimit?: number;
  readonly sendTimeoutMs?: number;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

function alarmOf(deps: ClaimCorrectionReminderDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

// ── The exported SEND (6.19c calls it for the closure notice — D32) ─────────────────────────────────────────

/** What one claim-correction SMS attempt came to. `transient` ⇒ the caller throws so pg-boss retries. */
export type ClaimCorrectionSmsResult =
  | { readonly kind: 'final'; readonly outcome: 'accepted'; readonly providerMessageId: string | null; readonly detail: null }
  | {
      readonly kind: 'final';
      readonly outcome: 'rejected_invalid_number' | 'rejected_unreachable' | 'error';
      readonly providerMessageId: null;
      readonly detail: string;
      /** A permanent failure that needs a human (config, template, auth) — the caller alarms. */
      readonly alarm: boolean;
    }
  | { readonly kind: 'transient'; readonly detail: string };

class SendTimeoutError extends Error {}

function withTimeout<T>(pending: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SendTimeoutError('timeout')), ms);
    pending.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/**
 * ⭐ SEND ONE CLAIM-CORRECTION SMS (D7 — a DIRECT DLT SMS to an explicit E.164 number; ⛔ not `dispatch()`, ⛔ not an
 * Alert). Fails CLOSED on a missing DLT template id, an unset helpline number (per Pariwar, `-269` §5) or an
 * unconfigured gateway — `error`, alarm, ⛔ never a fixture `accepted` (T13). The provider never throws (S3): its
 * `rejected` is classified — `invalid_number` → `rejected_invalid_number`; `carrier_reject` → `rejected_unreachable`
 * (`-269` §4); `dlt_template_not_approved` / `auth` / `unknown` → `error` + alarm, FINAL; `rate_limited` /
 * `api_unavailable` (and a timeout, and a Secret Manager outage) → TRANSIENT.
 */
export async function sendClaimCorrectionSms(
  deps: Pick<ClaimCorrectionReminderDeps, 'smsAppClient' | 'resolveConfig' | 'sendTimeoutMs'>,
  input: {
    readonly message: ClaimCorrectionSmsMessage;
    readonly locale: ClaimCorrectionSmsLocale;
    readonly pariwarId: string;
    readonly claimCaseId: string;
    /** The E.164 recipient — decrypted by the caller, ⛔ never logged. */
    readonly e164: string;
  },
): Promise<ClaimCorrectionSmsResult> {
  const template = CLAIM_CORRECTION_SMS_TEMPLATES[input.message][input.locale];
  let dltTemplateId: string | null;
  let helpline: string | null;
  try {
    dltTemplateId = await deps.resolveConfig(template.dltTemplateIdConfigKey);
    helpline = await deps.resolveConfig(claimCorrectionHelplineConfigKey(input.pariwarId));
  } catch {
    // A Secret Manager / network OUTAGE (`resolveSmsDltConfig` re-throws everything but "not provisioned").
    return { kind: 'transient', detail: 'config_unavailable:secret_manager' };
  }
  if (dltTemplateId === null || dltTemplateId.trim() === '') {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:dlt_template_id_missing', alarm: true };
  }
  if (helpline === null || helpline.trim() === '') {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:helpline_number_missing', alarm: true };
  }
  if (!deps.smsAppClient.isConfigured()) {
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:sms_gateway_unconfigured', alarm: true };
  }
  const body = renderClaimCorrectionSms(input.message, input.locale, {
    reference: claimDomain.claimShortReference(input.claimCaseId),
    helpline: helpline.trim(),
  });
  try {
    // ⚠ `messaging()` INSIDE the try: a half-configured client throws here, and that is a config fault, ⛔ a crash.
    const provider = createSmsDltProvider({ messaging: deps.smsAppClient.messaging(), dltTemplateId: dltTemplateId.trim() });
    const result = await withTimeout(
      provider.send({ channel: 'sms', title: null, body, deepLink: null }, { channel: 'sms', address: input.e164 }),
      deps.sendTimeoutMs ?? CORRECTION_SEND_TIMEOUT_MS,
    );
    if (result.status === 'accepted') {
      return { kind: 'final', outcome: 'accepted', providerMessageId: result.providerMessageId, detail: null };
    }
    const detail = result.detail ?? 'unknown:NO_DETAIL';
    const errorClass = detail.split(':')[0];
    switch (errorClass) {
      case 'invalid_number':
        return { kind: 'final', outcome: 'rejected_invalid_number', providerMessageId: null, detail, alarm: false };
      case 'carrier_reject':
        return { kind: 'final', outcome: 'rejected_unreachable', providerMessageId: null, detail, alarm: false };
      case 'rate_limited':
      case 'api_unavailable':
        return { kind: 'transient', detail };
      default:
        return { kind: 'final', outcome: 'error', providerMessageId: null, detail, alarm: true };
    }
  } catch (err) {
    if (err instanceof SendTimeoutError) return { kind: 'transient', detail: 'api_unavailable:timeout' };
    return { kind: 'final', outcome: 'error', providerMessageId: null, detail: 'config:sms_messaging_unavailable', alarm: true };
  }
}

// ── The CHILD — one family SMS ──────────────────────────────────────────────────────────────────────────────

/** A transient failure — thrown so pg-boss retries the SAME job (which re-claims its own row at once). */
export class ClaimCorrectionTransientError extends Error {
  public readonly name = 'ClaimCorrectionTransientError';
}

export type CorrectionFamilySmsChildResult =
  | { readonly status: 'sent'; readonly outcome: string }
  | { readonly status: 'skipped'; readonly reason: string }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE family SMS (AC2/AC3). The re-check and the claim happen in ONE transaction under the trustee lock
 * (`beginCorrectionFamilySend`) on the ONE client of that scope tx; the decrypt, the config reads and the send happen
 * AFTER its commit (the jobs domain pool is `max: 2` — ⛔ never a second checkout inside the lock); the row moves to
 * its final state after the send by compare-and-set. A failed re-check completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries)
 */
export async function runCorrectionFamilySmsChild(
  deps: ClaimCorrectionReminderDeps,
  envelope: JobEnvelope<CorrectionFamilySmsPayload>,
  jobId: string,
): Promise<CorrectionFamilySmsChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-correction-sms: missing pariwarId for run ${p.runId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);

  const begun = await withPariwarScope(deps.pool, pid, (_db, client) =>
    claimDomain.beginCorrectionFamilySend(client, {
      pariwarId,
      claimCaseId,
      runId: p.runId,
      slotDay: p.slotDay,
      personKey: p.personKey,
      sentOn: p.sentOn,
      late: p.late,
      jobId,
      now,
    }),
  );
  if (begun.kind === 'skipped') return { status: 'skipped', reason: begun.reason };
  if (begun.kind === 'noop') return { status: 'noop', reason: begun.reason };

  // ── After the commit: decrypt, hash, send ─────────────────────────────────────────────────────────────────
  const finalise = (fields: {
    outcome: 'accepted' | 'rejected_invalid_number' | 'rejected_unreachable' | 'no_target' | 'error';
    providerMessageId?: string | null;
    detail?: string | null;
    recipientNumberHash?: string | null;
  }) =>
    withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.finaliseCorrectionReminder(db, {
        pariwarId,
        reminderId: begun.reminderId,
        jobId,
        recipientVersionId: begun.person.versionId,
        ...fields,
      }),
    );
  const transient = async (detail: string): Promise<never> => {
    await withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.noteCorrectionReminderTransient(db, { pariwarId, reminderId: begun.reminderId, jobId, detail }),
    );
    throw new ClaimCorrectionTransientError(`[jobs] claim-correction-sms: transient ${detail} for run ${p.runId}`);
  };

  let e164: string | null;
  try {
    e164 = await claimDomain.resolveCorrectionMobile(
      begun.person.mobileCiphertext,
      begun.person.mobileSource,
      pid,
      deps.encryption,
    );
  } catch {
    // A KMS outage or an unreadable envelope — retried; if it never clears, the finaliser records `error` tomorrow.
    return transient('decrypt_failed:tier1');
  }
  if (e164 === null) {
    // A vacated version's null mobile, an erasure sentinel or a malformed number ⇒ `no_target` WITHOUT a send (D20).
    await finalise({ outcome: 'no_target', detail: 'no_target:no_sendable_number', recipientNumberHash: null });
    return { status: 'sent', outcome: 'no_target' };
  }
  const recipientNumberHash = await claimDomain.correctionNumberHash(e164, pid, deps.encryption);

  const result = await sendClaimCorrectionSms(deps, {
    message: 'reminder',
    locale: begun.contactLocale,
    pariwarId: pid,
    claimCaseId: p.claimCaseId,
    e164,
  });
  if (result.kind === 'transient') return transient(result.detail);
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-correction-sms: ${result.detail} for claim ${p.claimCaseId} run ${p.runId} — recorded error (fail-closed)`);
  }
  const moved = await finalise({
    outcome: result.outcome,
    providerMessageId: result.providerMessageId,
    detail: result.detail,
    recipientNumberHash,
  });
  if (!moved) alarm(`[jobs] claim-correction-sms: the row for run ${p.runId} slot ${String(p.slotDay)} moved on before its finalise`);
  return { status: 'sent', outcome: result.outcome };
}

// ── The STAFF PUSH — one per (claim, staff member, IST date) ─────────────────────────────────────────────────

const CORRECTION_PUSH_ALERT_NAMESPACE = '9d1f3b6a-2c47-4e8b-b5a0-6f0e1c2d3a4b';

function uuidV5(namespaceUuid: string, name: string): string {
  const nsBytes = Buffer.from(namespaceUuid.replace(/-/g, ''), 'hex');
  const hash = createHash('sha1').update(Buffer.concat([nsBytes, Buffer.from(name, 'utf8')])).digest();
  const bytes = hash.subarray(0, 16);
  bytes[6] = (bytes[6]! & 0x0f) | 0x50;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = bytes.toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

/** The staff push's copy — ENGLISH (staff copy is English-only), name-free, naming the correction queue. */
export function correctionStaffPushText(items: readonly { readonly purpose: string }[], reference: string): {
  readonly title: string;
  readonly body: string;
} {
  const n = items.length;
  const escalated = items.some((i) => i.purpose === 'escalation');
  return {
    title: escalated ? `Claim ${reference}: a correction chase needs you` : `Claim ${reference}: correction reminder`,
    body: `${String(n)} item${n === 1 ? '' : 's'} due today on claim ${reference}. Open the correction queue in the admin app.`,
  };
}

export type CorrectionStaffPushResult =
  | { readonly status: 'pushed'; readonly outcome: 'accepted' | 'no_target' | 'error' }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE daily staff push per (claim, staff member, IST date) (AC4, D11, D34). Claims its own `staff_push` row (the
 * partial UNIQUE on `(claim_case_id, recipient_key, sent_on)` — a sweep retry after a same-day mark switch cannot key
 * a second push on the new run), reads that day's staff rows for the member, then pushes through `dispatch()` narrowed
 * to push (`resolveDelivery: () => ({ push: target })` — ⛔ not `fanOutAlert`, ⛔ no Telegram mirror). Admin device
 * tokens live under `ADMIN_GLOBAL_NAMESPACE`, read in a scope set to it. ⛔ No token ⇒ `no_target` with ⛔ no alarm
 * (the day-one state). ⚠ INERT ON DAY ONE — ⛔ no admin client registers a device token yet.
 */
export async function runCorrectionStaffPush(
  deps: ClaimCorrectionReminderDeps,
  envelope: JobEnvelope<CorrectionStaffPushPayload>,
  jobId: string,
): Promise<CorrectionStaffPushResult> {
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarmOf(deps)(`[jobs] claim-correction-push: missing pariwarId for claim ${p.claimCaseId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const recipientKey = `staff:${p.userId}`;

  const claimed = await withPariwarScope(deps.pool, pid, async (db: Db, client) => {
    await claimDomain.acquireCorrectionChaseLock(client, pid, p.claimCaseId);
    const c = await claimDomain.claimCorrectionReminder(db, {
      pariwarId,
      claimCaseId,
      runId: p.runId,
      slotDay: p.slotDay,
      recipientKey,
      purpose: 'staff_push',
      subjectKey: '',
      sentOn: p.sentOn,
      late: false,
      jobId,
      now,
    });
    if (c.status !== 'claimed') return { c, items: [] as { purpose: string }[], deceased: null as string | null };
    const { rows } = await client.query<{ purpose: string }>(
      `SELECT purpose FROM claim_correction_reminders
        WHERE pariwar_id = $1 AND claim_case_id = $2 AND recipient_key = $3 AND sent_on = $4
          AND outcome = 'recorded' AND purpose IN ('staff_reminder', 'letter_chase', 'letter_second_due', 'escalation')`,
      [pid, p.claimCaseId, recipientKey, p.sentOn],
    );
    const claimRow = await claimDomain.readCorrectionClaimRow(db, pariwarId, claimCaseId);
    return { c, items: rows, deceased: claimRow?.deceasedMemberId ?? null };
  });
  if (claimed.c.status !== 'claimed') return { status: 'noop', reason: claimed.c.status };
  const reminderId = claimed.c.reminderId;
  const finalise = (outcome: 'accepted' | 'no_target' | 'error', detail: string | null, providerMessageId: string | null = null) =>
    withPariwarScope(deps.pool, pid, (db: Db) =>
      claimDomain.finaliseCorrectionReminder(db, { pariwarId, reminderId, jobId, outcome, detail, providerMessageId }),
    );

  if (claimed.items.length === 0 || claimed.deceased === null) {
    await finalise('no_target', 'no_target:no_items_today');
    return { status: 'pushed', outcome: 'no_target' };
  }

  const targets = await withPariwarScope(deps.pool, encryption.ADMIN_GLOBAL_NAMESPACE, (db: Db) =>
    notifications.resolvePushTargets(db, deps.encryption, encryption.ADMIN_GLOBAL_NAMESPACE, 'admin', p.userId),
  );
  if (targets.length === 0) {
    // The day-one state — ⛔ no admin device token. ⛔ No alarm (it would fire daily for every claim).
    await finalise('no_target', 'no_target:no_admin_device_token');
    return { status: 'pushed', outcome: 'no_target' };
  }

  const text = correctionStaffPushText(claimed.items, claimDomain.claimShortReference(p.claimCaseId));
  const alert = Alert.parse({
    alert_id: uuidV5(CORRECTION_PUSH_ALERT_NAMESPACE, `${p.claimCaseId}:${p.userId}:${p.sentOn}`),
    pariwar_id: pid,
    // The deceased member as the SUBJECT (D11) — the push goes to the staff member's device, ⛔ never the member's.
    member_id: claimed.deceased,
    time_critical: false,
    provenance_refs: {},
    created_at: now.toISOString(),
    created_by_actor: 'system',
    alert_category: 'alert_published',
    payload_data: { title: text.title, body: text.body },
  });
  const providers = deps.push.resolveProviders
    ? await deps.push.resolveProviders({ pariwarId: pid, category: 'alert_published' })
    : undefined;
  let accepted = false;
  let providerMessageId: string | null = null;
  for (const target of targets) {
    const outcome = await dispatch(alert, {
      ...(providers ? { providers } : {}),
      resolveDelivery: () => Promise.resolve({ push: target }),
      hashRendered: deps.push.hashRendered,
      audit: deps.push.audit,
    });
    const attempt = outcome.attempts.find((a) => a.channel === 'push');
    if (attempt?.outcome === 'sent') {
      accepted = true;
      providerMessageId = attempt.result?.providerMessageId ?? providerMessageId;
    }
  }
  await finalise(accepted ? 'accepted' : 'error', accepted ? null : 'push:not_accepted', providerMessageId);
  return { status: 'pushed', outcome: accepted ? 'accepted' : 'error' };
}

// ── The SWEEP ────────────────────────────────────────────────────────────────────────────────────────────────

export interface CorrectionSweepResult {
  readonly scannedRuns: number;
  readonly endedRuns: number;
  readonly enqueuedSms: number;
  readonly staffRows: number;
  readonly enqueuedPushes: number;
  readonly finalisedStuck: number;
  readonly markers: number;
}

/**
 * ⭐ THE DAILY SWEEP (AC2, AC4). See the module header for what it does and in what order. A per-run try/catch — one
 * claim's failure (⚠ `resolveClaimCorrectionState` re-throws anything that is not one of its three "not yet"
 * errors) never costs another claim its reminder; the next tick retries it.
 */
export async function runCorrectionReminderSweep(
  deps: ClaimCorrectionReminderDeps,
  boss: EnqueueBoss,
): Promise<CorrectionSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const today = cycleCalendar.istDateOf(now);
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);

  // (1) THE EXHAUSTED-ROW FINALISER — a time bound, ⛔ not a retry count: the retry horizon (60 s with backoff over 4
  //     tries) is minutes, ⛔ never a day. `error` is FINAL — ⛔ no catch-up for that slot.
  const stuck = await deps.pool.query<{ reminder_id: string; claim_case_id: string }>(
    `UPDATE claim_correction_reminders
        SET outcome = 'error',
            first_detail = COALESCE(first_detail, detail),
            detail = 'exhausted:attempting_past_day',
            updated_at = clock_timestamp()
      WHERE outcome = 'attempting' AND claimed_at < $1
      RETURNING reminder_id, claim_case_id`,
    [cycleCalendar.istMidnightAt(today)],
  );
  if (stuck.rows.length > 0) {
    alarm(
      `[jobs] claim-correction-sweep: finalised ${String(stuck.rows.length)} reminder(s) still 'attempting' from a previous ` +
        `IST day to 'error' (claims: ${[...new Set(stuck.rows.map((r) => r.claim_case_id))].join(', ')})`,
    );
  }

  // (2) `-269` §4 — a BURST of `rejected_unreachable` on one day (evaluated the next morning). `carrier_reject` also
  //     covers spam filters: a content-level block would make everyone letter-eligible. Letter-eligibility is ⛔ not
  //     undone — a letter is only added reach.
  const yesterday = cycleCalendar.addCalendarDays(today, -1);
  const burst = await deps.pool.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM claim_correction_reminders
      WHERE purpose = 'family_sms' AND outcome = 'rejected_unreachable' AND sent_on = $1`,
    [yesterday],
  );
  const burstCount = burst.rows[0]?.n ?? 0;
  if (burstCount >= CORRECTION_UNREACHABLE_BURST_THRESHOLD) {
    alarm(
      `[jobs] claim-correction-sweep: ${String(burstCount)} family SMS on ${yesterday} were refused by the network ` +
        `(rejected_unreachable) — check the DLT content / sender for a carrier-level block`,
    );
  }

  // (3) D26 — a run ended by a mark change ON ONE OF ITS SLOT DAYS: `skipped_superseded` for each recipient with ⛔ no
  //     row for that slot (an existing row is left as it is; the child's re-check already stopped the send).
  let markers = 0;
  const changed = await deps.pool.query<{ run_id: string; claim_case_id: string; pariwar_id: string }>(
    `SELECT run_id, claim_case_id, pariwar_id FROM claim_correction_runs
      WHERE end_reason = 'mark_changed' AND ended_at > $1
      ORDER BY ended_at ASC
      LIMIT $2`,
    [new Date(now.getTime() - CORRECTION_MARK_CHANGE_LOOKBACK_MS), limit],
  );
  for (const row of changed.rows) {
    try {
      markers += await withPariwarScope(deps.pool, row.pariwar_id, (db: Db) => writeMarkChangeMarkers(db, row));
    } catch (err) {
      alarm(`[jobs] claim-correction-sweep: D26 markers failed for run ${row.run_id} — ${String(err)}`);
    }
  }

  // (4) THE OPEN RUNS — bounded, ordered, alarmed at the cap.
  const open = await deps.pool.query<{ run_id: string; claim_case_id: string; pariwar_id: string }>(
    `SELECT run_id, claim_case_id, pariwar_id FROM claim_correction_runs
      WHERE ended_at IS NULL
      ORDER BY opened_at ASC, run_id ASC
      LIMIT $1`,
    [limit],
  );
  let endedRuns = 0;
  let enqueuedSms = 0;
  let staffRows = 0;
  let enqueuedPushes = 0;
  for (const row of open.rows) {
    try {
      const plan = await withPariwarScope(deps.pool, row.pariwar_id, (db: Db, client) =>
        planRun(deps, db, client, row, now, today, alarm),
      );
      if (plan.ended) endedRuns += 1;
      staffRows += plan.staffRows;
      const ctx = { pariwarId: row.pariwar_id, requestId: `claim.correction:${row.run_id}:${today}`, actorId: null, traceId: `claim.correction:${row.run_id}:${today}` };
      for (const sms of plan.sms) {
        try {
          await boss.send(
            QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS,
            { ...ctx, payload: sms } satisfies JobEnvelope<CorrectionFamilySmsPayload>,
            {
              // ⚠ A LABEL only — the `standard` policy enforces ⛔ no singleton uniqueness; the table is the dedup.
              singletonKey: `${sms.runId}:${String(sms.slotDay)}:${sms.personKey}:family_sms:`,
              retryLimit: CHILD_RETRY_LIMIT,
              retryDelay: CHILD_RETRY_DELAY_SECONDS,
              retryBackoff: true,
            },
          );
          enqueuedSms += 1;
        } catch (err) {
          alarm(`[jobs] claim-correction-sweep: failed to enqueue a family SMS for run ${row.run_id} — ${String(err)}`);
        }
      }
      for (const push of plan.pushes) {
        try {
          await boss.send(
            QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH,
            { ...ctx, payload: push } satisfies JobEnvelope<CorrectionStaffPushPayload>,
            { singletonKey: `${push.claimCaseId}:${push.userId}:${push.sentOn}`, ...CORRECTION_PUSH_RETRY },
          );
          enqueuedPushes += 1;
        } catch (err) {
          alarm(`[jobs] claim-correction-sweep: failed to enqueue a staff push for claim ${row.claim_case_id} — ${String(err)}`);
        }
      }
    } catch (err) {
      alarm(`[jobs] claim-correction-sweep: run ${row.run_id} (claim ${row.claim_case_id}) failed — ${String(err)}`);
    }
  }
  if (open.rows.length >= limit) {
    alarm(
      `[jobs] claim-correction-sweep: hit the ${String(limit)}-run batch cap — more open runs remain; the next tick ` +
        `picks them up (raise the run limit if this recurs)`,
    );
  }
  const result = {
    scannedRuns: open.rows.length,
    endedRuns,
    enqueuedSms,
    staffRows,
    enqueuedPushes,
    finalisedStuck: stuck.rows.length,
    markers,
  };
  console.info('[jobs] claim-correction-sweep', JSON.stringify(result));
  return result;
}

/** D26's markers for ONE run ended `mark_changed` (see the sweep's step 3). Returns how many were written. */
async function writeMarkChangeMarkers(
  db: Db,
  row: { run_id: string; claim_case_id: string; pariwar_id: string },
): Promise<number> {
  const pariwarId = ids.pariwarId(row.pariwar_id);
  const claimCaseId = ids.claimId(row.claim_case_id);
  const run = await claimDomain.readCorrectionRun(db, pariwarId, row.run_id);
  if (run === null || run.endedAt === null) return 0;
  const endedOn = cycleCalendar.istDateOf(run.endedAt);
  const day = claimDomain.correctionRunDay(run.day0, endedOn);
  const slot = claimDomain
    .correctionReminderSchedule(run.kind, run.day0)
    .find((s) => s.kind === 'reminder' && s.day === day);
  if (slot === undefined) return 0;
  let n = 0;
  const base = { pariwarId, claimCaseId, runId: run.runId, slotDay: day, sentOn: endedOn } as const;
  if (run.kind === 'family' || run.kind === 'direction') {
    const recipients = await claimDomain.readCorrectionRecipients(db, pariwarId, claimCaseId);
    for (const person of recipients.people) {
      if (
        await claimDomain.insertFinalCorrectionReminder(db, {
          ...base,
          recipientKey: person.personKey,
          purpose: 'family_sms',
          subjectKey: '',
          outcome: 'skipped_superseded',
          detail: 'mark_changed',
        })
      ) {
        n += 1;
      }
    }
  }
  return n;
}

interface RunPlan {
  readonly ended: boolean;
  readonly sms: CorrectionFamilySmsPayload[];
  readonly pushes: CorrectionStaffPushPayload[];
  readonly staffRows: number;
}

/**
 * Plan ONE open run for today (the sweep's step 4) inside its scope transaction, under the trustee lock: end it, or
 * pause it, or write its staff rows and return the family SMS and staff pushes to enqueue.
 */
async function planRun(
  deps: ClaimCorrectionReminderDeps,
  db: Db,
  client: pg.PoolClient,
  row: { run_id: string; claim_case_id: string; pariwar_id: string },
  now: Date,
  today: string,
  alarm: (m: string) => void,
): Promise<RunPlan> {
  const pariwarId = ids.pariwarId(row.pariwar_id);
  const claimCaseId = ids.claimId(row.claim_case_id);
  const idle: RunPlan = { ended: false, sms: [], pushes: [], staffRows: 0 };
  await claimDomain.acquireCorrectionChaseLock(client, row.pariwar_id, row.claim_case_id);
  const run = await claimDomain.readCorrectionRun(db, pariwarId, row.run_id);
  if (run === null || run.endedAt !== null) return idle;

  // ── The stop predicate (D4), through the domain's helpers — ⛔ never re-derived ──────────────────────────────
  const ret = await claimDomain.getLiveCorrectionReturn(db, pariwarId, claimCaseId);
  if (!ret || ret.decisionId !== run.returnDecisionId) {
    await claimDomain.endCorrectionRun(client, { pariwarId, claimCaseId, runId: run.runId, reason: 'superseded' });
    return { ...idle, ended: true };
  }
  if (claimDomain.isCorrectionRunExpired(run.day0, today)) {
    await claimDomain.endCorrectionRun(client, { pariwarId, claimCaseId, runId: run.runId, reason: 'day_90' });
    return { ...idle, ended: true };
  }
  const d = claimDomain.correctionRunDay(run.day0, today);

  // ── The pause tiers (`-269` §2) ─────────────────────────────────────────────────────────────────────────────
  const claimRow = await claimDomain.readCorrectionClaimRow(db, pariwarId, claimCaseId);
  if (claimRow === null) return idle;
  const correction = await claimDomain.resolveClaimCorrectionState(
    db,
    pariwarId,
    claimCaseId,
    ids.memberId(claimRow.deceasedMemberId),
    claimRow.currentState,
  );
  if (correction.resubmitted) return idle; // tier (a): the WHOLE run pauses — ⛔ no send, ⛔ no record
  const familyPaused = (await claimDomain.readFamilyPartDoneAt(db, pariwarId, claimCaseId, ret.decidedAt)) !== null;

  const schedule = claimDomain.correctionReminderSchedule(run.kind, run.day0);
  const reminderDays = schedule.filter((s) => s.kind === 'reminder').map((s) => s.day);
  const shepherd = await claimDomain.getLiveShepherd(db, pariwarId, claimCaseId);
  const daKey = shepherd ? `staff:${shepherd.shepherdActorId}` : 'staff:unassigned';
  const staffRowsNow = await claimDomain.readRunStaffRows(db, pariwarId, run.runId);
  const isFamilyRun = run.kind === 'family' || run.kind === 'direction';
  let staffRows = 0;

  const writeStaff = async (fields: {
    slotDay: number;
    recipientKey: string;
    purpose: 'staff_reminder' | 'letter_chase' | 'letter_second_due' | 'escalation';
    subjectKey: string;
    late: boolean;
  }): Promise<void> => {
    const unassigned = fields.recipientKey === 'staff:unassigned';
    const inserted = await claimDomain.insertFinalCorrectionReminder(db, {
      pariwarId,
      claimCaseId,
      runId: run.runId,
      sentOn: today,
      ...fields,
      outcome: unassigned ? 'no_target' : 'recorded',
      detail: unassigned ? 'no_target:no_staff_recipient' : null,
    });
    if (inserted) {
      staffRows += 1;
      if (unassigned) {
        alarm(`[jobs] claim-correction-sweep: ⛔ no ${fields.purpose === 'escalation' ? 'Pariwar Admin' : 'live shepherd'} for claim ${row.claim_case_id} — the ${fields.purpose} is on the queue with no one to push`);
      }
    }
  };
  const pariwarAdmins = async (): Promise<string[]> => {
    const admins = await claimDomain.listAdminsByRole(db, pariwarId, 'pariwar_admin');
    if (admins.truncated) {
      alarm(`[jobs] claim-correction-sweep: pariwar ${pariwarId} has ⛔ 50+ active Pariwar Admins — the escalation push list may be incomplete`);
    }
    return admins.entries.length > 0 ? admins.entries.map((a) => `staff:${a.userId}`) : ['staff:unassigned'];
  };

  // ── The family (AC3): recipients, per-person state, D30 ──────────────────────────────────────────────────────
  const sms: CorrectionFamilySmsPayload[] = [];
  let states: claimDomain.RunPersonState[] = [];
  let familyCanBeReminded = false;
  if (isFamilyRun) {
    const recipients = await claimDomain.readCorrectionRecipients(db, pariwarId, claimCaseId);
    familyCanBeReminded = recipients.cannotRemind === null;
    if (familyCanBeReminded) {
      states = await claimDomain.readRunPersonStates(db, pariwarId, run, recipients.people, { crypto: deps.encryption });
    }
  }
  const familyRows = isFamilyRun ? await claimDomain.readRunFamilyRows(db, pariwarId, run.runId) : [];

  if (isFamilyRun && familyCanBeReminded && !familyPaused) {
    for (const { person, state } of states) {
      if (state.letterDelivered) continue; // `-250` #1 — a recorded delivery stops that person's reminders
      const recorded = new Set(familyRows.filter((r) => r.recipientKey === person.personKey).map((r) => r.slotDay));
      const cu = claimDomain.correctionCatchUp(reminderDays, recorded, d);
      for (const day of cu.skip) {
        await claimDomain.insertFinalCorrectionReminder(db, {
          pariwarId,
          claimCaseId,
          runId: run.runId,
          slotDay: day,
          sentOn: today,
          recipientKey: person.personKey,
          purpose: 'family_sms',
          subjectKey: '',
          outcome: 'skipped_superseded',
          detail: 'catch_up',
        });
      }
      if (cu.send) {
        sms.push({ runId: run.runId, claimCaseId: row.claim_case_id, slotDay: cu.send.day, personKey: person.personKey, sentOn: today, late: cu.send.late });
      }
    }
  }

  // ── The District Admin's scheduled reminder (D34), stopped by D21 ───────────────────────────────────────────
  const everyoneDelivered =
    isFamilyRun && states.length > 0 && states.every((s) => s.state.foundDeadOn !== null && s.state.letterDelivered);
  if (!everyoneDelivered) {
    const recordedStaff = new Set(staffRowsNow.filter((r) => r.purpose === 'staff_reminder').map((r) => r.slotDay));
    const cu = claimDomain.correctionCatchUp(reminderDays, recordedStaff, d);
    // ⚠ ⛔ No `skipped_superseded` markers for staff slots: the D34 day key would collide, and a staff row is ⛔ an
    // attempt at anyone — the queue always shows the item.
    if (cu.send) await writeStaff({ slotDay: cu.send.day, recipientKey: daKey, purpose: 'staff_reminder', subjectKey: '', late: cu.send.late });
  }

  // ── The staff run's day-12 escalation to every Pariwar Admin (`-258` detail 2) ──────────────────────────────
  if (run.kind === 'staff' && d >= claimDomain.STAFF_RUN_ESCALATION_DAY) {
    const done = staffRowsNow.some((r) => r.purpose === 'escalation' && r.slotDay === claimDomain.STAFF_RUN_ESCALATION_DAY && r.subjectKey === '');
    if (!done) {
      for (const key of await pariwarAdmins()) {
        await writeStaff({ slotDay: claimDomain.STAFF_RUN_ESCALATION_DAY, recipientKey: key, purpose: 'escalation', subjectKey: '', late: d > claimDomain.STAFF_RUN_ESCALATION_DAY });
      }
    }
  }

  // ── The letter track (D20, D21): the chase, its escalation, and the ONE second-letter reminder per person ──
  if (isFamilyRun && familyCanBeReminded) {
    const letters = await claimDomain.readRunLetters(db, pariwarId, run.runId);
    for (const { person, state } of states) {
      if (state.foundDeadOn === null) continue;
      const fd = claimDomain.calendarDaysBetween(state.foundDeadOn, today);
      if (!state.letterDelivered && !familyPaused) {
        // The chase: found-dead + 7 … + 12, EVERY due day (D20/`-231` C: "daily through + 12", ⛔ not once total —
        // tier (b) and D30 stop it). D3's catch-up applies here too: a sweep day this window missed gets a
        // `skipped_superseded` marker rather than silently no row at all, matching family_sms/staff_reminder.
        if (fd >= claimDomain.LETTER_CHASE_FIRST_OFFSET) {
          const lastOffset = Math.min(fd, claimDomain.LETTER_CHASE_LAST_OFFSET);
          const foundDeadOn = state.foundDeadOn;
          const slotOfOffset = (off: number): number =>
            claimDomain.correctionRunDay(run.day0, cycleCalendar.addCalendarDays(foundDeadOn, off));
          const dueSlots: number[] = [];
          for (let off = claimDomain.LETTER_CHASE_FIRST_OFFSET; off <= lastOffset; off += 1) dueSlots.push(slotOfOffset(off));
          const recordedSlots = new Set(
            staffRowsNow.filter((r) => r.purpose === 'letter_chase' && r.subjectKey === person.personKey).map((r) => r.slotDay),
          );
          const cuChase = claimDomain.correctionCatchUp(dueSlots, recordedSlots, d);
          for (const skipSlot of cuChase.skip) {
            if (skipSlot < claimDomain.CORRECTION_RUN_HORIZON_DAYS) {
              await claimDomain.insertFinalCorrectionReminder(db, {
                pariwarId,
                claimCaseId,
                runId: run.runId,
                slotDay: skipSlot,
                sentOn: today,
                recipientKey: daKey,
                purpose: 'letter_chase',
                subjectKey: person.personKey,
                outcome: 'skipped_superseded',
                detail: 'catch_up',
              });
            }
          }
          if (cuChase.send && cuChase.send.day < claimDomain.CORRECTION_RUN_HORIZON_DAYS) {
            await writeStaff({
              slotDay: cuChase.send.day,
              recipientKey: daKey,
              purpose: 'letter_chase',
              subjectKey: person.personKey,
              late: cuChase.send.late,
            });
          }
        }
      }
      if (!state.letterDelivered && fd >= claimDomain.LETTER_CHASE_ESCALATION_OFFSET) {
        // "Thereafter" (`-231` C) — ONE escalation to every Pariwar Admin on found-dead + 13.
        const escDate = cycleCalendar.addCalendarDays(state.foundDeadOn, claimDomain.LETTER_CHASE_ESCALATION_OFFSET);
        const slot = claimDomain.correctionRunDay(run.day0, escDate);
        const has = staffRowsNow.some((r) => r.purpose === 'escalation' && r.subjectKey === person.personKey);
        if (slot < claimDomain.CORRECTION_RUN_HORIZON_DAYS && !has) {
          for (const key of await pariwarAdmins()) {
            await writeStaff({ slotDay: slot, recipientKey: key, purpose: 'escalation', subjectKey: person.personKey, late: escDate < today });
          }
        }
      }
      if (state.firstDeliveredOn !== null) {
        // D21 / `-231` D — ONE reminder at the first delivery + 30 days, unless a second letter is already posted.
        const hasSecond = letters.some((l) => l.personKey === person.personKey && l.sequence === 2);
        const due = cycleCalendar.addCalendarDays(state.firstDeliveredOn, claimDomain.SECOND_LETTER_DUE_AFTER_DAYS);
        const slot = claimDomain.correctionRunDay(run.day0, due);
        const has = staffRowsNow.some((r) => r.purpose === 'letter_second_due' && r.subjectKey === person.personKey);
        if (!hasSecond && due <= today && slot < claimDomain.CORRECTION_RUN_HORIZON_DAYS && !has) {
          await writeStaff({ slotDay: slot, recipientKey: daKey, purpose: 'letter_second_due', subjectKey: person.personKey, late: due < today });
        }
      }
    }
  }

  // ── One push per staff member with a recorded row TODAY on this claim (the push dedups on its own row) ───────
  const { rows: todays } = await client.query<{ recipient_key: string }>(
    `SELECT DISTINCT recipient_key FROM claim_correction_reminders
      WHERE pariwar_id = $1 AND claim_case_id = $2 AND sent_on = $3 AND outcome = 'recorded'
        AND purpose IN ('staff_reminder', 'letter_chase', 'letter_second_due', 'escalation')`,
    [row.pariwar_id, row.claim_case_id, today],
  );
  const pushes = todays
    .map((r) => r.recipient_key)
    .filter((k) => k.startsWith('staff:') && k !== 'staff:unassigned')
    .map((k) => ({ claimCaseId: row.claim_case_id, runId: run.runId, slotDay: d, userId: k.slice('staff:'.length), sentOn: today }));

  void now;
  return { ended: false, sms, pushes, staffRows };
}

// ── Registration ─────────────────────────────────────────────────────────────────────────────────────────────

/** Register the three queues, their workers, and the daily 10:00 IST sweep (AC2). */
export async function registerClaimCorrectionReminderWorkers(
  boss: QueueClient,
  deps: ClaimCorrectionReminderDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS);
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_FAMILY_SMS, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      // A transient throw fails THIS job (pg-boss retries it with the same id); ⛔ never a sibling's.
      results.push(await runCorrectionFamilySmsChild(deps, job.data as JobEnvelope<CorrectionFamilySmsPayload>, job.id));
    }
    return { processed: results.length, results };
  });

  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH);
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_STAFF_PUSH, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(await runCorrectionStaffPush(deps, job.data as JobEnvelope<CorrectionStaffPushPayload>, job.id));
    }
    return { processed: results.length, results };
  });

  await boss.createQueue(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP);
  await boss.work(QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runCorrectionReminderSweep(deps, boss);
      console.info('[jobs] claim-correction-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-correction-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_CORRECTION_REMINDER_SWEEP,
    opts.sweepCron ?? claimDomain.CORRECTION_REMINDER_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY },
  );
}
