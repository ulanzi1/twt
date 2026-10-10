// The SUSPICION NOTICES — the daily SWEEP and the SMS CHILD — Story 6.24b (Task 5; AC7b, AC9b; `2026-10-07-292` RF11 /
// RF12, `2026-10-07-293` item 1 B, `2026-10-08-295` RB3, RB5, RB12, RB15, RB18; Story 6.29 — `2026-10-10-302` RN2, RN3, RN5, RN10).
//
// The three once-ever texts of a `-239` suspicion refusal (each ONCE per claim, EVER — 0151's UNIQUE):
//   · `suspicion_refusal`     — FQ7 B: to the nominee the District Admin found in place at the death;
//   · `closed_after_appeal`   — `-291` Q2 B: to the true nominee when an allowed appeal closes her claim;
//   · `refusal_appeal_notice` — `-293` item 1 B: to the refused person, with the last date to appeal.
// ⛔ Never `dispatch()` — a DIRECT DLT SMS through the shared core (`sendClaimDltSms`, RB4), the sibling registry's words.
//
// ── The sweep, daily 10:00 IST ─────────────────────────────────────────────────────────────────────────────────
//   (1) RB12's CONFIG CHECK, FIRST (`-302` RN2 — before the give-up): the gateway and each needed template id once per run
//       (both locales for `appeal_notice` — its locale is known only under the lock); the per-Pariwar helpline memoised —
//       for the Pariwars of STALLED rows now, then LAZILY as the pages reveal Pariwars. A gap — null / blank /
//       unconfigured, or ANY Secret Manager fault — HOLDS that (purpose, Pariwar): ⛔ enqueued, ⛔ NEW row written. The next
//       run re-selects it (⛔ finished row) ⇒ once go-live sets the ids, every notice still due is sent;
//   (2) `-302` RN2 — THE PARK: every `attempting` row past the send lease whose (purpose, Pariwar) is HELD is parked
//       (`'sweep:held'`) — ⛔ given up while held — + ONE alarm (claim ids);
//   (3) RB3's give-up (AS AMENDED BY `-302` RN3), over the UN-held scopes only — rows whose `aging_since` (a parked row's
//       credited by the time it has sat parked) is before 00:00 IST of (today − 2), still `attempting` and ⛔ claimed
//       within the send lease ⇒ `error` + an alarm (claim ids);
//   (4) per purpose, page the domain's selector (keyset, the Pariwar allowlist) and enqueue ONE child per (claim,
//       purpose) — the payload is ids only;
//   (5) ONE end-of-run alarm for the held claims — per purpose, the count and the claim ids.
// ── The child ───────────────────────────────────────────────────────────────────────────────────────────────────
//   RB12's race guard (the same checks — a gap ⇒ `held_config`, ⛔ row, ⛔ decrypt, an alarm) → the Pariwar's name mode,
//   read ONCE in its OWN scope tx (RB5) → the CLAIMING transaction (`beginSuspicionNotice` — the claim-row lock, the
//   re-check, the recipient, the row) → COMMIT → (⛔ KMS under the lock) the deceased's name (RB5: erased / unresolvable /
//   none ⇒ `no_target`) → the recipient's number → its keyed hash → the send → compare-and-set.
//   It throws ONLY on a transient failure (pg-boss retries the SAME job, which re-claims its own row at once).
// ⚠ AT-LEAST-ONCE (6.19b's): a timeout or crash after a gateway accept may produce a second text — `attempt_count` /
// `first_detail` record it. ⛔ NOTHING here writes a claim decision, event or state (invariant 7, AC9b).
// ⛔ No number, name or address in a payload, a log line or an alarm — ids only.

import {
  claim as claimDomain,
  encryption,
  ids,
  kyc as kycDomain,
  member as memberDomain,
  notifications,
  schema,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import {
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_SWEEP_EXPIRE_SECONDS,
  CORRECTION_SWEEP_RETRY,
  DEFAULT_CORRECTION_SWEEP_BUDGET_MS,
  DEFAULT_CORRECTION_SWEEP_MAX_RUNS,
  DEFAULT_CORRECTION_SWEEP_RUN_LIMIT,
  ClaimCorrectionTransientError,
  type ClaimCorrectionReminderDeps,
} from './claim-correction-reminders.js';
import { claimCorrectionHelplineConfigKey } from './claim-correction-sms-templates.js';
import { sendClaimDltSms } from './claim-dlt-sms-send.js';
import {
  SUSPICION_NOTICE_SMS_TEMPLATES,
  formatAppealUntil,
  renderSuspicionNoticeSms,
  suspicionNoticeDltConfigKey,
  type SuspicionNoticeSmsLocale,
  type SuspicionNoticeSmsMessage,
} from './suspicion-notice-sms-templates.js';

type Purpose = schema.SuspicionNoticePurpose;

/** The notice machine's deps — 6.19b's, minus the staff push (⛔ none here). */
export type ClaimSuspicionNoticeDeps = Omit<ClaimCorrectionReminderDeps, 'push'>;

/** The child's payload — ids ONLY (⛔ never a number, a name or an address). */
export interface SuspicionNoticePayload {
  readonly claimCaseId: string;
  readonly purpose: Purpose;
}

/** The purposes, in the order the sweep runs them. */
export const SUSPICION_NOTICE_SWEEP_PURPOSES = ['suspicion_refusal', 'closed_after_appeal', 'refusal_appeal_notice'] as const satisfies readonly Purpose[];

/** Each purpose's message (RB1). */
const MESSAGE_OF: Readonly<Record<Purpose, SuspicionNoticeSmsMessage>> = {
  suspicion_refusal: 'refusal_notice',
  closed_after_appeal: 'closed_notice',
  refusal_appeal_notice: 'appeal_notice',
};

/** The locales a purpose may send in — `hi` for (a) / (b) (RF11); BOTH for (c) (its `contact_locale`, read under the lock). */
const LOCALES_OF: Readonly<Record<Purpose, readonly SuspicionNoticeSmsLocale[]>> = {
  suspicion_refusal: ['hi'],
  closed_after_appeal: ['hi'],
  refusal_appeal_notice: ['hi', 'en'],
};

function alarmOf(deps: ClaimSuspicionNoticeDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

// ── RB12 — the config check (the sweep's, and the child's race guard) ────────────────────────────────────────────

/** A config value that is SET (⛔ null, ⛔ blank). ANY Secret Manager fault — known or transient — is a gap. */
async function configSet(deps: ClaimSuspicionNoticeDeps, key: string): Promise<'set' | 'missing' | 'fault'> {
  try {
    const v = await deps.resolveConfig(key);
    return v === null || v.trim() === '' ? 'missing' : 'set';
  } catch {
    // ⭐ RB12 — known OR transient (`classifySecretManagerFault` would split them), a fault HOLDS: ⛔ a slot spent on it.
    return 'fault';
  }
}

/** The gateway + the purpose's template ids — `null` when ready, else the gap (ids-only wording). */
async function purposeConfigGap(deps: ClaimSuspicionNoticeDeps, purpose: Purpose): Promise<string | null> {
  if (!deps.smsAppClient.isConfigured()) return 'config:sms_gateway_unconfigured';
  for (const locale of LOCALES_OF[purpose]) {
    const state = await configSet(deps, suspicionNoticeDltConfigKey(MESSAGE_OF[purpose], locale));
    if (state === 'fault') return 'config:secret_manager';
    if (state === 'missing') return `config:dlt_template_id_missing:${locale}`;
  }
  return null;
}

/** The Pariwar's helpline number (6.19's per-Pariwar key, RF11) — `null` when set, else the gap. */
async function helplineGap(deps: ClaimSuspicionNoticeDeps, pariwarId: string): Promise<string | null> {
  const state = await configSet(deps, claimCorrectionHelplineConfigKey(pariwarId));
  if (state === 'fault') return 'config:secret_manager';
  if (state === 'missing') return 'config:helpline_number_missing';
  return null;
}

// ── The SWEEP ─────────────────────────────────────────────────────────────────────────────────────────────────

export interface SuspicionNoticeSweepResult {
  readonly scannedClaims: number;
  readonly enqueued: number;
  /** Claims held by a config gap (RB12) — ⛔ enqueued, ⛔ NEW row written. */
  readonly heldForConfig: number;
  /** In-flight rows newly parked by a hold (`-302` RN2) — ⛔ given up while held. */
  readonly parkedForConfig: number;
  readonly finalisedStuck: number;
  readonly budgetExhausted: boolean;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/**
 * ⭐ THE DAILY SWEEP. See the module header. A per-claim try/catch around the enqueue — one claim's failure never costs
 * another its notice; the next tick retries it.
 */
export async function runSuspicionNoticeSweep(deps: ClaimSuspicionNoticeDeps, boss: EnqueueBoss): Promise<SuspicionNoticeSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxClaims = Math.max(1, deps.maxRuns ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? DEFAULT_CORRECTION_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: SuspicionNoticeSweepResult = { scannedClaims: 0, enqueued: 0, heldForConfig: 0, parkedForConfig: 0, finalisedStuck: 0, budgetExhausted: false };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm('[jobs] claim-suspicion-notice-sweep: REFUSED — `pariwarAllowlist` is set while NODE_ENV is production (it is test-only); nothing was swept');
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm('[jobs] claim-suspicion-notice-sweep: REFUSED — `pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant); nothing was swept');
    return empty;
  }

  // (1) RB12 — the gateway + each purpose's template ids, ONCE per run; the helpline per Pariwar, memoised (the SAME memo the
  // main loop reads — one run never both parks and enqueues a Pariwar).
  const purposeGaps = new Map<Purpose, string | null>();
  for (const purpose of SUSPICION_NOTICE_SWEEP_PURPOSES) purposeGaps.set(purpose, await purposeConfigGap(deps, purpose));
  const helplineByPariwar = new Map<string, string | null>();
  const gapOf = async (purpose: Purpose, pariwarId: string): Promise<string | null> => {
    const purposeGap = purposeGaps.get(purpose) ?? null;
    if (purposeGap !== null) return purposeGap;
    if (!helplineByPariwar.has(pariwarId)) helplineByPariwar.set(pariwarId, await helplineGap(deps, pariwarId));
    return helplineByPariwar.get(pariwarId) ?? null;
  };

  // (2) `-302` RN2 — THE PARK, BEFORE the give-up. ⚠ A cross-tenant READ (the stalled scopes) and WRITE (the park) on the BYPASSRLS
  // pool, DELIBERATELY — the reasoning is at `listStalledSuspicionNoticeScopes`' / `parkHeldSuspicionNotices`' DELIBERATE blocks.
  // ⚠ A budget guard, as the main loop's: the stalled set is normally small (crash-left rows only), but an unbounded run of
  // Secret Manager reads here (one per distinct stalled Pariwar) would otherwise never be caught by the main loop's own check.
  let budgetExhausted = false;
  let budgetExhaustedDuringScopeScan = false;
  const held: claimDomain.SuspicionNoticeScope[] = [];
  const unheld: claimDomain.SuspicionNoticeScope[] = [];
  for (const scope of await claimDomain.listStalledSuspicionNoticeScopes(deps.pool, { now, allow })) {
    if (clockMs() - startedMs > budgetMs) {
      budgetExhausted = true;
      budgetExhaustedDuringScopeScan = true;
      break;
    }
    ((await gapOf(scope.purpose, scope.pariwarId)) === null ? unheld : held).push(scope);
  }
  const parked = await claimDomain.parkHeldSuspicionNotices(deps.pool, { now, allow, held });
  if (parked.length > 0) {
    const parkedByPurpose = new Map<Purpose, string[]>();
    for (const p of parked) parkedByPurpose.set(p.purpose, [...(parkedByPurpose.get(p.purpose) ?? []), p.claimCaseId as string]);
    const parts = [...parkedByPurpose.entries()].map(([purpose, list]) => `${purpose}: ${String(list.length)} (claims: ${sampleIds(list)})`);
    alarm(
      `[jobs] claim-suspicion-notice-sweep: ${String(parked.length)} in-flight notice(s) newly PARKED — their purpose / Pariwar is ` +
        `held by a config gap; ⛔ given up while held, re-tried once it is fixed — ${parts.join('; ')}`,
    );
  }

  // (3) RB3 (AS AMENDED BY `-302` RN3) — THE GIVE-UP, over the UN-held scopes only. ⚠ A CROSS-TENANT WRITE on the BYPASSRLS
  // pool, DELIBERATELY — the reasoning, the lease guard and the RE-EXAMINE triggers are at `expireExhaustedSuspicionNotices`'
  // DELIBERATE block. The cross-tenant READ that follows (the selectors) carries its own block at `selectDueSuspicionNotices`.
  const stuck = await claimDomain.expireExhaustedSuspicionNotices(deps.pool, {
    cutoff: claimDomain.suspicionNoticeReclaimCutoff(now),
    now,
    allow,
    scopes: unheld,
  });
  if (stuck.length > 0) {
    alarm(
      `[jobs] claim-suspicion-notice-sweep: gave up ${String(stuck.length)} notice(s) still 'attempting' after ` +
        `${String(claimDomain.SUSPICION_NOTICE_RECLAIM_DAYS)} IST days — recorded 'error' (exhausted:attempting_three_days) ` +
        `(claims: ${sampleIds([...new Set(stuck.map((s) => s.claimCaseId as string))])})`,
    );
  }

  let scannedClaims = 0;
  let enqueued = 0;
  let bounded = false;
  const heldClaims = new Map<Purpose, string[]>();

  sweep: for (const purpose of SUSPICION_NOTICE_SWEEP_PURPOSES) {
    if (budgetExhausted) break sweep;
    let after: string | null = null;
    for (;;) {
      const page = await claimDomain.selectDueSuspicionNotices(deps.pool, { purpose, after, limit, allow });
      for (const due of page.due) {
        if (scannedClaims >= maxClaims) {
          bounded = true;
          break sweep;
        }
        if (clockMs() - startedMs > budgetMs) {
          budgetExhausted = true;
          break sweep;
        }
        scannedClaims += 1;
        if ((await gapOf(purpose, due.pariwarId)) !== null) {
          heldClaims.set(purpose, [...(heldClaims.get(purpose) ?? []), due.claimCaseId]);
          continue;
        }
        // (4) ONE child per (claim, purpose).
        try {
          await boss.send(
            QUEUE_NAMES.CLAIM_SUSPICION_NOTICE_SMS,
            {
              pariwarId: due.pariwarId,
              requestId: `claim.suspicion_notice:${due.claimCaseId}:${purpose}`,
              actorId: null,
              traceId: `claim.suspicion_notice:${due.claimCaseId}:${purpose}`,
              payload: { claimCaseId: due.claimCaseId, purpose },
            } satisfies JobEnvelope<SuspicionNoticePayload>,
            {
              // ⚠ A LABEL only — the `standard` policy enforces ⛔ no singleton uniqueness; the table is the dedup.
              singletonKey: `${due.claimCaseId}:${purpose}`,
              retryLimit: CHILD_RETRY_LIMIT,
              retryDelay: CHILD_RETRY_DELAY_SECONDS,
              retryBackoff: true,
            },
          );
          enqueued += 1;
        } catch (err) {
          alarm(`[jobs] claim-suspicion-notice-sweep: failed to enqueue the ${purpose} notice for claim ${due.claimCaseId} — ${String(err)}`);
        }
      }
      if (page.scanned < Math.min(limit, claimDomain.SUSPICION_NOTICE_PAGE_CAP) || page.lastClaimCaseId === null) break;
      after = page.lastClaimCaseId;
    }
  }

  // (5) ONE end-of-run alarm for every claim a config gap held (RB12) — per purpose, the count and the ids.
  const heldForConfig = [...heldClaims.values()].reduce((n, l) => n + l.length, 0);
  if (heldForConfig > 0) {
    const parts = [...heldClaims.entries()].map(([purpose, list]) => `${purpose}: ${String(list.length)} (claims: ${sampleIds(list)})`);
    alarm(
      `[jobs] claim-suspicion-notice-sweep: ${String(heldForConfig)} notice(s) HELD — the DLT template id, the helpline number ` +
        `or the SMS gateway is not configured; ⛔ nothing was enqueued for them (an in-flight one is parked, ⛔ given up), and they will be sent once it is — ${parts.join('; ')}`,
    );
  }
  if (budgetExhausted && budgetExhaustedDuringScopeScan && scannedClaims === 0) {
    // ⚠ Distinguished from the branch below (review round 2): "0 claim(s)" there would misleadingly read as "nothing was due" —
    // the budget was actually spent classifying stalled (purpose, Pariwar) scopes, BEFORE the enqueue scan ever started.
    alarm(`[jobs] claim-suspicion-notice-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget scanning stalled scopes (park phase) — the enqueue scan did ⛔ run today`);
  } else if (budgetExhausted) {
    alarm(`[jobs] claim-suspicion-notice-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ${String(scannedClaims)} claim(s) — the rest were ⛔ NOT swept today`);
  } else if (bounded) {
    alarm(`[jobs] claim-suspicion-notice-sweep: hit the hard bound of ${String(maxClaims)} claims — the rest were ⛔ NOT swept today`);
  }
  return { scannedClaims, enqueued, heldForConfig, parkedForConfig: parked.length, finalisedStuck: stuck.length, budgetExhausted };
}

// ── The CHILD — one notice ─────────────────────────────────────────────────────────────────────────────────────

export type SuspicionNoticeChildResult =
  | { readonly status: 'sent'; readonly outcome: string }
  | { readonly status: 'held_config'; readonly reason: string }
  | { readonly status: 'skipped'; readonly reason: 'already_final' | 'held_by_other' | 'not_due' | 'recheck_failed' }
  | { readonly status: 'no_target'; readonly reason: string }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE notice. See the module header. A failed re-check completes ⛔ without throwing.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job)
 */
export async function runSuspicionNoticeChild(
  deps: ClaimSuspicionNoticeDeps,
  envelope: JobEnvelope<SuspicionNoticePayload>,
  jobId: string,
): Promise<SuspicionNoticeChildResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-suspicion-notice: missing pariwarId for claim ${p.claimCaseId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const tag = `${p.purpose} notice for claim ${p.claimCaseId}`;

  // RB12's RACE GUARD — the sweep's checks again, BEFORE a row or a decrypt (config may have vanished since).
  const gap = (await purposeConfigGap(deps, p.purpose)) ?? (await helplineGap(deps, pid));
  if (gap !== null) {
    alarm(`[jobs] claim-suspicion-notice: the ${tag} is HELD — ${gap}; ⛔ nothing written (the next sweep re-selects it)`);
    return { status: 'held_config', reason: gap };
  }

  // RB5 — the name mode, read ONCE in its OWN scope tx, BEFORE the claiming transaction (⛔ a catch inside that one).
  let mode: Awaited<ReturnType<typeof kycDomain.resolvePublicNamePresentationMode>>;
  try {
    mode = await withPariwarScope(deps.pool, pariwarId, (db: Db) => kycDomain.resolvePublicNamePresentationMode(db, pariwarId));
  } catch {
    alarm(`[jobs] claim-suspicion-notice: the name-mode read failed for the ${tag} — retrying`);
    throw new ClaimCorrectionTransientError(`[jobs] claim-suspicion-notice: transient mode_read_failed for claim ${p.claimCaseId}`);
  }

  // ── The CLAIMING transaction: the claim-row lock, the re-check, the recipient, the row ──
  const begun = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
    claimDomain.beginSuspicionNotice(client, { pariwarId, claimCaseId, purpose: p.purpose, jobId, now }),
  );
  if (begun.kind === 'already_final' || begun.kind === 'held_by_other' || begun.kind === 'not_due') {
    return { status: 'skipped', reason: begun.kind };
  }
  if (begun.kind === 'expired') {
    // `-297` §2 — a claiming commit happened, so a text MAY have gone: ALWAYS alarmed (ids + the detail only).
    alarm(`[jobs] claim-suspicion-notice: the ${tag} — the re-check now fails after an attempt was claimed (a text may have gone); recorded 'error' (${begun.detail})`);
    return { status: 'skipped', reason: 'recheck_failed' };
  }
  if (begun.kind === 'no_target') {
    // RB15 / RB18 — the domain FINISHED the slot; ONE alarm so a ratified text is ⛔ lost unseen (ids + reason only).
    alarm(`[jobs] claim-suspicion-notice: the ${tag} was NOT sent — ${begun.reason}; recorded 'no_target'`);
    return { status: 'no_target', reason: begun.reason };
  }

  // ── After the commit: ⛔ KMS under the lock ──
  const db = (fn: (d: Db) => Promise<unknown>) => withPariwarScope(deps.pool, pariwarId, fn);
  const finalise = async (input: Omit<Parameters<typeof claimDomain.finaliseSuspicionNotice>[1], 'pariwarId' | 'noticeId' | 'jobId'>) => {
    const moved = (await db((d) =>
      claimDomain.finaliseSuspicionNotice(d, { pariwarId, noticeId: begun.noticeId, jobId, ...input }),
    )) as boolean;
    if (!moved) alarm(`[jobs] claim-suspicion-notice: the row of the ${tag} moved on before its finalise (the outcome was ${input.outcome})`);
  };
  // ⭐ `-302` RN5 — every `detail` the child writes, alarms or throws is BUILT (`suspicionNoticeDetail`), ⛔ the core's raw text.
  const transient = async (detail: string): Promise<never> => {
    const noted = (await db((d) =>
      claimDomain.noteSuspicionNoticeTransient(d, { pariwarId, noticeId: begun.noticeId, jobId, detail }),
    )) as boolean;
    if (!noted) alarm(`[jobs] claim-suspicion-notice: the row of the ${tag} moved on before its transient note (${detail})`);
    throw new ClaimCorrectionTransientError(`[jobs] claim-suspicion-notice: transient ${detail} for claim ${p.claimCaseId}`);
  };
  const noTarget = async (detail: string): Promise<SuspicionNoticeChildResult> => {
    await finalise({ outcome: 'no_target', detail, recipientVersionId: begun.recipient.versionId });
    // `2026-10-09-298` — the reason is TRUE for this attempt, but a re-claimed row (attempt 2+) had a prior attempt claimed,
    // which MAY have sent before it died: say so to staff (ids + the reason only). A first attempt is unchanged.
    if (begun.attemptCount > 1) {
      alarm(`[jobs] claim-suspicion-notice: the ${tag} finished 'no_target' (${detail}) on attempt ${String(begun.attemptCount)} — a prior attempt was claimed and may have sent`);
    }
    return { status: 'no_target', reason: detail };
  };

  if (begun.recipient.unresolved !== null) {
    return noTarget(claimDomain.suspicionNoticeDetail({ kind: 'no_target', reason: begun.recipient.unresolved }));
  }

  // RB5 — `{member}`: the deceased's KYC name, MODE-RESOLVED (`-181`); erased / unresolvable / none ⇒ `no_target`.
  const profile = (await db((d) => kycDomain.getMemberKycProfile(d, pariwarId, begun.deceasedMemberId))) as
    | Awaited<ReturnType<typeof kycDomain.getMemberKycProfile>>
    | undefined;
  if (!profile || profile.nameCiphertext === null) return noTarget(claimDomain.suspicionNoticeDetail({ kind: 'name', reason: 'none' }));
  let storedName: string;
  try {
    storedName = await encryption.decryptKycField(profile.nameCiphertext, pariwarId, deps.encryption);
  } catch {
    return transient(claimDomain.suspicionNoticeDetail({ kind: 'pre_send', fault: 'decrypt_failed:kyc' }));
  }
  if (storedName === memberDomain.ANONYMIZED_SENTINEL) return noTarget(claimDomain.suspicionNoticeDetail({ kind: 'name', reason: 'erased' }));
  const member = notifications.resolveMemberFacingDeceasedName(mode, storedName);
  if (member === '') return noTarget(claimDomain.suspicionNoticeDetail({ kind: 'name', reason: 'unresolvable' }));

  // The recipient's number (null / the erasure sentinel / ⛔ a valid Indian mobile ⇒ `no_target`).
  let e164: string | null;
  try {
    e164 = await claimDomain.resolveCorrectionMobile(begun.recipient.mobileCiphertext, begun.recipient.source, pariwarId, deps.encryption);
  } catch {
    return transient(claimDomain.suspicionNoticeDetail({ kind: 'pre_send', fault: 'decrypt_failed:tier1' }));
  }
  if (e164 === null) return noTarget(claimDomain.suspicionNoticeDetail({ kind: 'no_target', reason: 'no_sendable_number' }));
  let hash: string;
  try {
    hash = await claimDomain.correctionNumberHash(e164, pariwarId, deps.encryption);
  } catch {
    return transient(claimDomain.suspicionNoticeDetail({ kind: 'pre_send', fault: 'hash_failed:tier1' }));
  }

  // ── The send ──
  const message = MESSAGE_OF[p.purpose];
  const locale = begun.locale;
  const date = message === 'appeal_notice' && begun.appealUntil !== null ? formatAppealUntil(begun.appealUntil) : undefined;
  const result = await sendClaimDltSms(deps, {
    dltTemplateIdConfigKey: SUSPICION_NOTICE_SMS_TEMPLATES[message][locale].dltTemplateIdConfigKey,
    pariwarId: pid,
    e164,
    render: (helpline) => renderSuspicionNoticeSms(message, locale, { member, helpline, ...(date !== undefined ? { date } : {}) }),
  });
  // The core's detail is RAW (a gateway `<code>` can be any string — a phone number included): ⛔ stored, alarmed or thrown as is.
  const detail = result.detail === null ? null : claimDomain.suspicionNoticeDetail({ kind: 'send', detail: result.detail });
  if (result.kind === 'transient') return transient(detail!);
  if (result.outcome !== 'accepted' && result.alarm) {
    alarm(`[jobs] claim-suspicion-notice: ${detail!} for the ${tag} — recorded error (fail-closed)`);
  }
  await finalise({
    outcome: result.outcome,
    providerMessageId: result.providerMessageId,
    detail,
    recipientVersionId: begun.recipient.versionId,
    recipientNumberHash: hash,
  });
  return { status: 'sent', outcome: result.outcome };
}

// ── Registration ─────────────────────────────────────────────────────────────────────────────────────────────

/** The daily cron — 10:00 IST (6.19's hour). */
export const SUSPICION_NOTICE_SWEEP_CRON = '0 10 * * *';

/** Register the two queues, their workers and the daily 10:00 IST sweep. */
export async function registerClaimSuspicionNoticeWorkers(
  boss: QueueClient,
  deps: ClaimSuspicionNoticeDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_SUSPICION_NOTICE_SMS);
  await boss.work(QUEUE_NAMES.CLAIM_SUSPICION_NOTICE_SMS, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(await runSuspicionNoticeChild(deps, job.data as JobEnvelope<SuspicionNoticePayload>, job.id));
    }
    return { processed: results.length, results };
  });

  // ⚠ The expiry is set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, while
  // `schedule` upserts its options on every boot and pg-boss copies them onto each job it fires.
  await boss.createQueue(QUEUE_NAMES.CLAIM_SUSPICION_NOTICE_SWEEP, { expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_SUSPICION_NOTICE_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runSuspicionNoticeSweep(deps, boss);
      console.info('[jobs] claim-suspicion-notice-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-suspicion-notice-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_SUSPICION_NOTICE_SWEEP,
    opts.sweepCron ?? SUSPICION_NOTICE_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS },
  );
}
