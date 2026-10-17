// THE NEIGHBOURS' TEXT — the per-claim SMS CHILD and the daily SWEEP — Story 6.27c (Task 4; AC2–AC5b; `2026-10-10-303` Q1 A,
// `2026-10-10-304` Q6 A, `2026-10-10-305` §2 item 4, `2026-10-10-311` PM1–PM5, PM14–PM16, PM21, PM22; `2026-10-12-324`;
// `2026-10-14-330` SW22–SW27; `2026-10-16-343`). The SHAPE of 6.24b / 6.29's `claim-suspicion-notices.ts`, ADAPTED: a CHILD per
// CLAIM (it sends each of that claim's due pings in turn), a hold per PARIWAR (every config gap here is per Pariwar or global).
// ⛔ Never `dispatch()` — a DIRECT DLT SMS through the shared core (`sendClaimDltSms`), the sibling registry's words.
//
// ── The child (one claim) ───────────────────────────────────────────────────────────────────────────────────────────────
//   (1) QUIET HOURS — outside 09:00–20:00 IST ⇒ ⛔ ping begun; the child re-enqueued with `startAfter` = the next 09:00 IST
//       (checked at the start, AND again at each begin and each provider handoff — the clock read afresh each time);
//   (2) R11's RACE GUARD — the sweep's checks again (the gateway, `APP_LINKS_BASE_URL` for an app link, the LIVE questionnaire
//       and ⛔ question of it `'pending'` (AC2b), the template id of the Pariwar's language, the helpline, ANY Secret Manager
//       fault) BEFORE a ping is begun ⇒ `held_config` + ONE ids-only alarm, ⛔ slot used up;
//   (3) the due pings — ⛔ any ⇒ `noop` (⛔ name decrypted for nothing — R8's hook enqueues on every no-op SELECT re-run);
//       a locale-read DB fault in (2) is a RETRY (the sweep skips the Pariwar that run), ⛔ a hold — a MISSING passport is a hold;
//   (4) R9 — the deceased's NAME, ONCE, outside any claiming transaction: the mode (`-181`), the KYC name, the erased sentinel,
//       the mode-resolved form and its length (`fitsDltAlphanumeric`) — a fault is CLAIM-WIDE (`no_target:name_<reason>`, ⛔
//       replaced); a decrypt THROW is a retry (⛔ stored — ⛔ ping begun yet);
//   (5) per due ping, in `ping_id` order (and every replacement the run creates): the CLAIMING transaction
//       (`beginPeerMeshRequest` — claim → ping locks, R1) → COMMIT → (⛔ KMS under a lock) the neighbour's number →
//       `normalizeMobile` → its keyed hash → the send → the compare-and-set. An UNUSABLE number is R6 (a second transaction
//       finishes the row `no_sendable_number` and replaces it — unless R5); a decrypt / hash THROW is a transient (⛔ R6 — a KMS
//       outage ⛔ drops a neighbour and texts another). A transient ⇒ the note + the NEXT ping; the child throws at the END
//       (pg-boss retries the SAME job, which re-claims its own rows at once; finished pings are skipped) — UNLESS 20:00 IST
//       passes first: then the child RETURNS deferred (with its counts) and the 09:00 child re-claims those rows past their lease.
//       A lease that lapsed (or nearly) before the handoff ⇒ ⛔ sent (another child may hold the row). A final about the SCOPE
//       (`config:*`, `auth`, `dlt_template_not_approved` — `isScopeWideSendFault`) ⇒ the run STOPS, `held_config` (⛔ every slot
//       used up in one run; ⚠ a fault the sweep cannot see costs one slot per child run — recorded, W10).
//       ⚠ RECORDED (review round 2 D1 (a) — R5 / `-343` as built): EVERY re-claim counts as "a prior attempt may have sent",
//       including one whose first attempt provably ⛔ reached the send core — a `decrypt_failed:tier1` / `hash_failed:tier1`
//       transient, a row begun but ⛔ handed off when 20:00 passed, or one whose lease lapsed before the handoff (P6). On that
//       re-claim a failed re-check finishes `error` (`-297` §2), and an unusable number or a name fault finishes `no_target` — ⛔ replaced — with the "may have sent" alarm,
//       although ⛔ text went (one fewer neighbour asked; the ground inspection carries it — `-310` CF4). ⭐ Trigger: such an
//       alarm on a row whose `provider_message_id` is NULL — then a "handed to the send core" marker (`deferred-work.md`). The
//       send core's own config reads after the 20:00 check are outside it (review residual).
// ── The sweep, daily 10:30 IST (inside the send hours; after the suspicion sweep's 10:00) ─────────────────────────────────
//   (1) config per Pariwar FIRST (memoised) → (2) the stalled scopes → the HELD ones' in-flight pings PARKED + ONE alarm →
//   (3) the give-up (three IST days of UN-parked time) over the UN-held ones → (4) the paged due claims (R16 — `answerWindowSql`),
//   ONE child per claim in an un-held Pariwar → (5) ONE end-of-run alarm for the held claims (ids only).
// ⚠ AT-LEAST-ONCE (6.19b's): a timeout or crash after a gateway accept may produce a second text — `attempt_count` /
// `first_detail` record it. ⛔ NOTHING here writes a claim decision, event or state (AC5b; invariant 7).
// ⛔ No number, name or LINK CODE in a payload, a log line, an alarm or a `detail` — ids only (PM21 (e)).

import { buildAppLinkUrl } from '@twt/contracts';
import {
  claim as claimDomain,
  cycleCalendar,
  encryption,
  ids,
  kyc as kycDomain,
  member as memberDomain,
  notifications,
  questionnaires,
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
import { helplineNotCallbackNumberWarning, sendClaimDltSms } from './claim-dlt-sms-send.js';
import {
  PEER_MESH_REQUEST_SMS_TEMPLATES,
  fitsDltAlphanumeric,
  fitsDltUrl,
  peerMeshRequestDltConfigKey,
  renderPeerMeshRequest,
  type PeerMeshRequestSmsLocale,
} from './peer-mesh-sms-templates.js';
import { resolveAppLinksOrigin } from './staff-email-config.js';

/** The text machine's deps — 6.19b's, minus the staff push, plus the app-link base and (tests) the questionnaire registry. */
export interface ClaimPeerMeshRequestDeps extends Omit<ClaimCorrectionReminderDeps, 'push'> {
  /** `APP_LINKS_BASE_URL`, read at boot (the `ADMIN_APP_ORIGIN` precedent) and VALIDATED every run (R12). */
  readonly appLinksBaseUrl: string | undefined;
  /** ⚠ TESTS ONLY — the questionnaire registry the live version is resolved from (default: the shipped one). */
  readonly questionnaireRegistry?: readonly questionnaires.QuestionnaireDefinition[];
}

/** The child's payload — ids ONLY (⛔ a number, a name, a link code). */
export interface PeerMeshRequestPayload {
  readonly claimCaseId: string;
}

function alarmOf(deps: ClaimPeerMeshRequestDeps): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

// ── AC2 — the send hours (⛔ never at night) ─────────────────────────────────────────────────────────────────────────

/** The first IST hour a text may be sent in. */
export const PEER_REQUEST_SEND_START_HOUR_IST = 9;
/** The IST hour from which ⛔ text is sent (exclusive end). */
export const PEER_REQUEST_SEND_END_HOUR_IST = 20;
const HOUR_MS = 60 * 60 * 1000;
/**
 * P6 — how much of the send lease must REMAIN at the handoff: the core's two untimed Secret Manager reads plus its send
 * (`CORRECTION_SEND_TIMEOUT_MS`, 10 s) still follow, and another child may re-claim the row once the lease lapses.
 */
export const PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS = 2 * 60 * 1000;
/** The least a quiet-hours deferral waits (P8 — host-vs-DB clock skew at 09:00 ⛔ re-enqueues in a tight loop). */
export const PEER_REQUEST_DEFER_FLOOR_MS = 60 * 1000;

/** 00:00 IST opening the IST day `days` after `now`'s — the domain's IST primitives (⛔ a seventh copy of the offset, BF11). */
function istMidnight(now: Date, days = 0): Date {
  return cycleCalendar.istMidnightAt(cycleCalendar.addCalendarDays(cycleCalendar.istDateOf(now), days));
}

/** Is `now` inside 09:00 (inclusive) – 20:00 (exclusive) IST? */
export function isInPeerRequestSendWindow(now: Date): boolean {
  const sinceMidnight = now.getTime() - istMidnight(now).getTime();
  return sinceMidnight >= PEER_REQUEST_SEND_START_HOUR_IST * HOUR_MS && sinceMidnight < PEER_REQUEST_SEND_END_HOUR_IST * HOUR_MS;
}

/** The next 09:00 IST after `now` — today's when `now` is before it, else tomorrow's (only ever called outside the window). */
export function nextPeerRequestSendWindowStart(now: Date): Date {
  const todayStart = new Date(istMidnight(now).getTime() + PEER_REQUEST_SEND_START_HOUR_IST * HOUR_MS);
  if (now.getTime() < todayStart.getTime()) return todayStart;
  return new Date(istMidnight(now, 1).getTime() + PEER_REQUEST_SEND_START_HOUR_IST * HOUR_MS);
}

// ── R11 — the config check (the sweep's, and the child's race guard) ────────────────────────────────────────────────

/** A config value that is SET (⛔ null, ⛔ blank). ANY Secret Manager fault — known or transient — is a gap (RB12). */
async function configSet(deps: ClaimPeerMeshRequestDeps, key: string): Promise<'set' | 'missing' | 'fault'> {
  try {
    const v = await deps.resolveConfig(key);
    return v === null || v.trim() === '' ? 'missing' : 'set';
  } catch {
    return 'fault';
  }
}

/**
 * The app-link base's gap (R12), or `null`: ⛔ an app-link origin ⇒ `config:app_links_base_url_invalid`; an origin whose link
 * cannot fit the registered `{link}` slot ⇒ `config:app_link_too_long` (6.27c review F6 — every code has the SAME length, so
 * the link a real code makes is the link every text carries; ⛔ found only after a once-ever slot is begun).
 */
export function appLinksConfigGap(appLinksBaseUrl: string | undefined): string | null {
  const origin = resolveAppLinksOrigin(appLinksBaseUrl);
  if (origin === null) return 'config:app_links_base_url_invalid';
  if (!fitsDltUrl(buildAppLinkUrl(origin, 'peerRequest', claimDomain.generatePeerRequestLinkCode()))) return 'config:app_link_too_long';
  return null;
}

/** The GLOBAL gaps — the gateway and the app-link base (R12). `null` when ready, else the gap (an ALARM code — ⛔ stored). */
function globalConfigGap(deps: ClaimPeerMeshRequestDeps): string | null {
  if (!deps.smsAppClient.isConfigured()) return 'config:sms_gateway_unconfigured';
  return appLinksConfigGap(deps.appLinksBaseUrl);
}

/** What a ready Pariwar sends in. */
interface PariwarSendConfig {
  readonly locale: PeerMeshRequestSmsLocale;
}

/**
 * The Pariwar's language could ⛔ be read (a DB fault — 6.27c review round 2 P7). ⛔ A config gap: the child RETRIES (pg-boss), the
 * sweep SKIPS the Pariwar this run (⛔ held, ⛔ parked, ⛔ enqueued — the next tick reads it again).
 */
class PeerRequestLocaleReadError extends Error {
  constructor() {
    super('[jobs] claim-peer-mesh-request: the Pariwar locale read failed');
    this.name = 'PeerRequestLocaleReadError';
  }
}

/**
 * The PER-PARIWAR gaps: the LIVE questionnaire (⛔ none ⇒ `questionnaire_unavailable`; a `'pending'` question ⇒
 * `counsel_basis_pending` — AC2b), the Pariwar's language (R10), its template id, its helpline. ⛔ Stored — alarm codes only.
 * @throws PeerRequestLocaleReadError  the locale read failed — a transient, ⛔ a gap
 */
async function pariwarConfig(
  deps: ClaimPeerMeshRequestDeps,
  pariwarId: string,
): Promise<{ readonly gap: string } | { readonly gap: null; readonly config: PariwarSendConfig }> {
  const live = questionnaires.resolveLiveVersion('peer_mesh', pariwarId, deps.questionnaireRegistry);
  if (live === null) return { gap: 'config:questionnaire_unavailable' };
  if (questionnaires.pendingCounselBasisKeys(live).length > 0) return { gap: 'config:counsel_basis_pending' };
  let locale: PeerMeshRequestSmsLocale;
  try {
    const pid = ids.pariwarId(pariwarId);
    locale = (await withPariwarScope(deps.pool, pid, (db: Db) => claimDomain.resolvePeerRequestLocale(db, pid))).locale;
  } catch (err) {
    // ⛔ passport row — a DATA gap a retry ⛔ fixes ⇒ HELD; anything else is a failed READ ⇒ a transient (P7)
    if (err instanceof claimDomain.PeerRequestLocaleMissingError) return { gap: 'config:locale_unavailable' };
    throw new PeerRequestLocaleReadError();
  }
  const template = await configSet(deps, peerMeshRequestDltConfigKey(locale));
  if (template === 'fault') return { gap: 'config:secret_manager' };
  if (template === 'missing') return { gap: `config:dlt_template_id_missing:${locale}` };
  const helpline = await configSet(deps, claimCorrectionHelplineConfigKey(pariwarId));
  if (helpline === 'fault') return { gap: 'config:secret_manager' };
  if (helpline === 'missing') return { gap: 'config:helpline_number_missing' };
  return { gap: null, config: { locale } };
}

/**
 * P1 — is a FINAL `error` from the send core about the SCOPE (its config, the gateway account, the template), ⛔ the recipient?
 * The core's own config finals (`config:*` — a fault after the race guard, BF8) and the gateway's `auth` / `dlt_template_not_approved`
 * classes: the next ping of the claim would end the same way. ⛔ `unknown` (it may be the number).
 */
export function isScopeWideSendFault(rawDetail: string | null): boolean {
  if (rawDetail === null) return false;
  return rawDetail.startsWith('config:') || rawDetail.startsWith('auth:') || rawDetail.startsWith('dlt_template_not_approved:');
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────────

export interface PeerMeshRequestSweepResult {
  readonly scannedClaims: number;
  readonly enqueued: number;
  /** Claims held by a config gap (R11) — ⛔ enqueued, ⛔ ping begun. */
  readonly heldForConfig: number;
  /** In-flight pings newly parked by a hold (RN2) — ⛔ given up while held. */
  readonly parkedForConfig: number;
  readonly finalisedStuck: number;
  readonly budgetExhausted: boolean;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/** The sweep's marker for a Pariwar whose config could ⛔ be read this run (P7) — ⛔ a gap string. */
const CONFIG_UNREADABLE: unique symbol = Symbol('peer-request-config-unreadable');

/** ONE child per claim — ids only; `singletonKey` is a LABEL (the claim lock + the per-ping CAS are the dedup). */
export async function enqueuePeerMeshRequestChild(
  boss: EnqueueBoss,
  input: { readonly pariwarId: string; readonly claimCaseId: string; readonly startAfter?: Date },
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CLAIM_PEER_MESH_REQUEST_SMS,
    {
      pariwarId: input.pariwarId,
      requestId: `claim.peer_mesh_request:${input.claimCaseId}`,
      actorId: null,
      traceId: `claim.peer_mesh_request:${input.claimCaseId}`,
      payload: { claimCaseId: input.claimCaseId },
    } satisfies JobEnvelope<PeerMeshRequestPayload>,
    {
      // ⚠ A LABEL only — the `standard` policy enforces ⛔ singleton uniqueness; two children of one claim may run at once.
      singletonKey: input.claimCaseId,
      retryLimit: CHILD_RETRY_LIMIT,
      retryDelay: CHILD_RETRY_DELAY_SECONDS,
      retryBackoff: true,
      ...(input.startAfter !== undefined ? { startAfter: input.startAfter } : {}),
    },
  );
}

/**
 * ⭐ THE DAILY SWEEP. See the module header. A per-claim try/catch around the enqueue — one claim's failure never costs
 * another its texts; the next tick retries it.
 */
export async function runPeerMeshRequestSweep(deps: ClaimPeerMeshRequestDeps, boss: EnqueueBoss): Promise<PeerMeshRequestSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxClaims = Math.max(1, deps.maxRuns ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? DEFAULT_CORRECTION_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: PeerMeshRequestSweepResult = { scannedClaims: 0, enqueued: 0, heldForConfig: 0, parkedForConfig: 0, finalisedStuck: 0, budgetExhausted: false };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm('[jobs] claim-peer-mesh-request-sweep: REFUSED — `pariwarAllowlist` is set while NODE_ENV is production (it is test-only); nothing was swept');
    return empty;
  }
  if (allow !== null && allow.length === 0) {
    alarm('[jobs] claim-peer-mesh-request-sweep: REFUSED — `pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant); nothing was swept');
    return empty;
  }

  // (1) R11 — the global gaps ONCE per run; the per-Pariwar ones memoised (the SAME memo the main loop reads — one run never
  // both parks and enqueues a Pariwar).
  const globalGap = globalConfigGap(deps);
  const gapByPariwar = new Map<string, string | null>();
  // P7 — a Pariwar whose config could ⛔ be READ this run (the locale read failed): ⛔ held, ⛔ parked, ⛔ enqueued; ONE alarm.
  const unreadable = new Set<string>();
  const gapOf = async (pariwarId: string): Promise<string | null | typeof CONFIG_UNREADABLE> => {
    if (globalGap !== null) return globalGap;
    if (unreadable.has(pariwarId)) return CONFIG_UNREADABLE;
    if (!gapByPariwar.has(pariwarId)) {
      try {
        gapByPariwar.set(pariwarId, (await pariwarConfig(deps, pariwarId)).gap);
      } catch (err) {
        if (!(err instanceof PeerRequestLocaleReadError)) throw err;
        unreadable.add(pariwarId);
        alarm(`[jobs] claim-peer-mesh-request-sweep: the config of Pariwar ${pariwarId} could ⛔ be read (the locale read failed) — skipped this run (⛔ held, ⛔ parked)`);
        return CONFIG_UNREADABLE;
      }
    }
    return gapByPariwar.get(pariwarId) ?? null;
  };

  // (2) RN2 — THE PARK, BEFORE the give-up. ⚠ A cross-tenant READ and WRITE on the BYPASSRLS pool, DELIBERATELY — the reasoning is
  // at `listStalledPeerMeshRequestScopes` / `parkHeldPeerMeshRequests`' DELIBERATE blocks.
  let budgetExhausted = false;
  let budgetExhaustedDuringScopeScan = false;
  const held: string[] = [];
  const unheld: string[] = [];
  for (const pariwarId of await claimDomain.listStalledPeerMeshRequestScopes(deps.pool, { now, allow })) {
    if (clockMs() - startedMs > budgetMs) {
      budgetExhausted = true;
      budgetExhaustedDuringScopeScan = true;
      break;
    }
    const gap = await gapOf(pariwarId);
    if (gap === CONFIG_UNREADABLE) continue;
    (gap === null ? unheld : held).push(pariwarId);
  }
  const parked = await claimDomain.parkHeldPeerMeshRequests(deps.pool, { now, allow, held });
  if (parked.length > 0) {
    alarm(
      `[jobs] claim-peer-mesh-request-sweep: ${String(parked.length)} in-flight neighbour text(s) newly PARKED — their Pariwar is held ` +
        `by a config gap; ⛔ given up while held, re-tried once it is fixed (claims: ${sampleIds([...new Set(parked.map((p) => p.claimCaseId as string))])})`,
    );
  }

  // (3) RN3 — THE GIVE-UP, over the UN-held Pariwars only (the DELIBERATE block at `expireExhaustedPeerMeshRequests`).
  const stuck = await claimDomain.expireExhaustedPeerMeshRequests(deps.pool, {
    cutoff: claimDomain.peerMeshRequestReclaimCutoff(now),
    now,
    allow,
    scopes: unheld,
  });
  if (stuck.length > 0) {
    alarm(
      `[jobs] claim-peer-mesh-request-sweep: gave up ${String(stuck.length)} neighbour text(s) still 'attempting' after ` +
        `${String(claimDomain.PEER_MESH_REQUEST_RECLAIM_DAYS)} IST days — recorded 'error' (exhausted:attempting_three_days) ` +
        `(claims: ${sampleIds([...new Set(stuck.map((s) => s.claimCaseId as string))])})`,
    );
  }

  // (4) R16 — the due claims, paged (the DELIBERATE block at `listDuePeerMeshRequestClaims`); ONE child per claim.
  // ⭐ The hard bound counts the claims a child is ENQUEUED for — a HELD claim costs ⛔ child and counts ⛔ (6.27c review F5):
  // the cursor restarts every run and a held claim stays due until its gap closes, so a held prefix that filled the bound
  // would starve every ready claim after it, every day. The time budget still bounds the scan. ⚠ Under a GLOBAL gap every
  // claim is held (⛔ one can be starved), so there the held ones DO count — ⛔ a daily walk of every due claim to the budget.
  let scannedClaims = 0;
  let attempted = 0;
  let enqueued = 0;
  let bounded = false;
  const heldClaims: string[] = [];
  let after: string | null = null;
  sweep: while (!budgetExhausted) {
    const page = await claimDomain.listDuePeerMeshRequestClaims(deps.pool, { now, after, limit, allow });
    for (const due of page.due) {
      if (clockMs() - startedMs > budgetMs) {
        budgetExhausted = true;
        break sweep;
      }
      const gap = await gapOf(due.pariwarId);
      if (gap === CONFIG_UNREADABLE) continue;
      if (gap !== null) {
        if (globalGap !== null && scannedClaims >= maxClaims) {
          bounded = true;
          break sweep;
        }
        scannedClaims += 1;
        heldClaims.push(due.claimCaseId);
        continue;
      }
      if (attempted >= maxClaims) {
        bounded = true;
        break sweep;
      }
      scannedClaims += 1;
      attempted += 1;
      try {
        await enqueuePeerMeshRequestChild(boss, { pariwarId: due.pariwarId, claimCaseId: due.claimCaseId });
        enqueued += 1;
      } catch (err) {
        alarm(`[jobs] claim-peer-mesh-request-sweep: failed to enqueue the neighbour texts for claim ${due.claimCaseId} — ${String(err)}`);
      }
    }
    if (page.scanned < Math.min(limit, claimDomain.PEER_MESH_REQUEST_PAGE_CAP) || page.lastClaimCaseId === null) break;
    after = page.lastClaimCaseId;
  }

  // (5) ONE end-of-run alarm for every claim a config gap held — the count, the gaps seen and the ids.
  if (heldClaims.length > 0) {
    const gaps = [...new Set([globalGap, ...gapByPariwar.values()].filter((g): g is string => g !== null))].sort();
    alarm(
      `[jobs] claim-peer-mesh-request-sweep: ${String(heldClaims.length)} claim(s)' neighbour texts HELD — ${gaps.join(', ')}; ` +
        `⛔ nothing was enqueued for them (an in-flight one is parked, ⛔ given up), and they will be sent once it is fixed ` +
        `(claims: ${sampleIds(heldClaims)})`,
    );
  }
  if (budgetExhausted && budgetExhaustedDuringScopeScan && scannedClaims === 0) {
    alarm(`[jobs] claim-peer-mesh-request-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget scanning stalled scopes (park phase) — the enqueue scan did ⛔ run today`);
  } else if (budgetExhausted) {
    alarm(`[jobs] claim-peer-mesh-request-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ${String(scannedClaims)} claim(s) — the rest were ⛔ NOT swept today`);
  } else if (bounded) {
    alarm(`[jobs] claim-peer-mesh-request-sweep: hit the hard bound of ${String(maxClaims)} claims — the rest were ⛔ NOT swept today`);
  }
  return { scannedClaims, enqueued, heldForConfig: heldClaims.length, parkedForConfig: parked.length, finalisedStuck: stuck.length, budgetExhausted };
}

// ── The CHILD — one claim ──────────────────────────────────────────────────────────────────────────────────────────

/** What each ping came to (ids-free counts — the pg-boss job output). */
export interface PeerMeshRequestChildCounts {
  readonly accepted: number;
  readonly finalOther: number;
  readonly superseded: number;
  readonly noTarget: number;
  readonly replaced: number;
  readonly expired: number;
  readonly skipped: number;
  readonly transient: number;
}

export type PeerMeshRequestChildResult =
  | { readonly status: 'done'; readonly counts: PeerMeshRequestChildCounts }
  | { readonly status: 'deferred_quiet_hours'; readonly startAfter: Date; readonly counts?: PeerMeshRequestChildCounts }
  | { readonly status: 'held_config'; readonly reason: string }
  | { readonly status: 'noop'; readonly reason: string };

type NameRead = { readonly name: string } | { readonly fault: schema.PeerMeshRequestNameReason };

/**
 * R9 — the deceased's name, read ONCE, outside any claiming transaction (the suspicion child's sources — BF13): the mode, the KYC
 * name, the erased sentinel, the mode-resolved form, its length. Throws `ClaimCorrectionTransientError` on a read / decrypt
 * fault (⛔ a ping begun yet ⇒ ⛔ stored).
 */
async function readDeceasedName(
  deps: ClaimPeerMeshRequestDeps,
  pariwarId: ReturnType<typeof ids.pariwarId>,
  deceasedMemberId: ReturnType<typeof ids.memberId>,
  tag: string,
): Promise<NameRead> {
  const alarm = alarmOf(deps);
  let mode: Awaited<ReturnType<typeof kycDomain.resolvePublicNamePresentationMode>>;
  let profile: Awaited<ReturnType<typeof kycDomain.getMemberKycProfile>> | undefined;
  try {
    [mode, profile] = await withPariwarScope(deps.pool, pariwarId, async (db: Db) => [
      await kycDomain.resolvePublicNamePresentationMode(db, pariwarId),
      await kycDomain.getMemberKycProfile(db, pariwarId, deceasedMemberId),
    ] as const);
  } catch {
    alarm(`[jobs] claim-peer-mesh-request: the name read failed for ${tag} — retrying`);
    throw new ClaimCorrectionTransientError(`[jobs] claim-peer-mesh-request: transient name_read_failed for ${tag}`);
  }
  if (!profile || profile.nameCiphertext === null) return { fault: 'name_none' };
  let stored: string;
  try {
    stored = await encryption.decryptKycField(profile.nameCiphertext, pariwarId, deps.encryption);
  } catch {
    alarm(`[jobs] claim-peer-mesh-request: the name decrypt failed for ${tag} — retrying (⛔ ping begun)`);
    throw new ClaimCorrectionTransientError(`[jobs] claim-peer-mesh-request: transient name_decrypt_failed for ${tag}`);
  }
  if (stored === memberDomain.ANONYMIZED_SENTINEL) return { fault: 'name_erased' };
  const name = notifications.resolveMemberFacingDeceasedName(mode, stored);
  if (name === '') return { fault: 'name_unresolvable' };
  if (!fitsDltAlphanumeric(name)) return { fault: 'name_too_long' };
  return { name };
}

/**
 * ⭐ ONE claim's neighbour texts. See the module header. Every ping's outcome is recorded on its row; a transient on one ping
 * never costs the others theirs.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job) — ⛔ when 20:00 IST passed mid-run
 *   (the result is then `deferred_quiet_hours` with the run's `counts`; the 09:00 child re-claims the transient rows)
 */
export async function runPeerMeshRequestChild(
  deps: ClaimPeerMeshRequestDeps,
  boss: EnqueueBoss,
  envelope: JobEnvelope<PeerMeshRequestPayload>,
  jobId: string,
): Promise<PeerMeshRequestChildResult> {
  const alarm = alarmOf(deps);
  // ⭐ The clock is read AGAIN at each begin and at each provider handoff (6.27c review F2 / F3) — the config, the name and the
  // pings before take time: ⛔ a text after 20:00 IST, ⛔ a lease stamped with the run's start (another child could re-claim it).
  const clock = (): Date => deps.now?.() ?? new Date();
  const now = clock();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-peer-mesh-request: missing pariwarId for claim ${p.claimCaseId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const tag = `claim ${p.claimCaseId}`;

  // (1) AC2 — ⛔ never at night: ⛔ ping begun; the child comes back at the next 09:00 IST. Checked again per ping (F2).
  const deferToMorning = async (at: Date, counts?: PeerMeshRequestChildCounts): Promise<PeerMeshRequestChildResult> => {
    // P8 — FLOORED: pg-boss fires `startAfter` on the DB clock; a host a few seconds behind it would see 08:59:5x at 09:00 and
    // re-enqueue for a 09:00 already past for pg-boss — a tight loop until the host clock catches up.
    const next = nextPeerRequestSendWindowStart(at);
    const startAfter = new Date(Math.max(next.getTime(), at.getTime() + PEER_REQUEST_DEFER_FLOOR_MS));
    await enqueuePeerMeshRequestChild(boss, { pariwarId: pid, claimCaseId: p.claimCaseId, startAfter });
    return counts === undefined ? { status: 'deferred_quiet_hours', startAfter } : { status: 'deferred_quiet_hours', startAfter, counts: { ...counts } };
  };
  if (!isInPeerRequestSendWindow(now)) return deferToMorning(now);

  // (2) R11's RACE GUARD — BEFORE any ping is begun (config may have vanished since the sweep / the hook).
  const globalGap = globalConfigGap(deps);
  let pariwarCheck: Awaited<ReturnType<typeof pariwarConfig>>;
  try {
    pariwarCheck = globalGap === null ? await pariwarConfig(deps, pid) : { gap: globalGap };
  } catch (err) {
    if (!(err instanceof PeerRequestLocaleReadError)) throw err;
    // P7 — a DB fault, ⛔ a config gap: pg-boss retries the SAME job (⛔ ping begun).
    alarm(`[jobs] claim-peer-mesh-request: the locale read failed for ${tag} — retrying (⛔ ping begun)`);
    throw new ClaimCorrectionTransientError(`[jobs] claim-peer-mesh-request: transient locale_read_failed for ${tag}`);
  }
  if (pariwarCheck.gap !== null) {
    alarm(`[jobs] claim-peer-mesh-request: the neighbour texts of ${tag} are HELD — ${pariwarCheck.gap}; ⛔ ping begun (the next sweep re-selects it)`);
    return { status: 'held_config', reason: pariwarCheck.gap };
  }
  const { locale } = (pariwarCheck as { config: PariwarSendConfig }).config;
  const origin = resolveAppLinksOrigin(deps.appLinksBaseUrl)!;

  const claimRow = await withPariwarScope(deps.pool, pariwarId, (db: Db) => claimDomain.getClaimCase(db, pariwarId, claimCaseId));
  if (!claimRow) {
    alarm(`[jobs] claim-peer-mesh-request: ${tag} is not found in its Pariwar`);
    return { status: 'noop', reason: 'claim_missing' };
  }

  // (3) the due pings, in order — a replacement the run creates joins the queue. Read BEFORE the name (6.27c review round 2
  // P5): R8's hook enqueues on every no-op SELECT re-run, and a child with nothing due must ⛔ decrypt the deceased's name.
  const queue = await withPariwarScope(deps.pool, pariwarId, (db: Db) =>
    claimDomain.listDuePeerMeshRequestPings(db, { pariwarId, claimCaseId }),
  );
  if (queue.length === 0) return { status: 'noop', reason: 'nothing_due' };

  // (4) R9 — the name, ONCE, before any claiming transaction.
  const nameRead = await readDeceasedName(deps, pariwarId, claimRow.deceasedMemberId, tag);
  const nameFault = 'fault' in nameRead ? nameRead.fault : null;
  const counts = { accepted: 0, finalOther: 0, superseded: 0, noTarget: 0, replaced: 0, expired: 0, skipped: 0, transient: 0 };
  let helplineWarned = false;
  const scoped = <T>(fn: (d: Db) => Promise<T>) => withPariwarScope(deps.pool, pariwarId, fn);

  for (let i = 0; i < queue.length; i += 1) {
    const pingId = queue[i]!;
    const ptag = `ping ${pingId} of ${tag}`;
    // F2 — the window closed during the run ⇒ ⛔ this ping (or any after it) begun; the rest come back at 09:00 IST (a ping
    // left `attempting` by a transient above is re-claimed then, past its lease). F3 — the lease is stamped NOW.
    const beginAt = clock();
    if (!isInPeerRequestSendWindow(beginAt)) return deferToMorning(beginAt, counts);
    const begun = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
      claimDomain.beginPeerMeshRequest(client, { pariwarId, claimCaseId, pingId, jobId, now: beginAt, nameFault }),
    );
    if (begun.kind === 'already_final' || begun.kind === 'held_by_other') {
      counts.skipped += 1;
      continue;
    }
    if (begun.kind === 'superseded') {
      counts.superseded += 1;
      continue;
    }
    if (begun.kind === 'expired') {
      // `-297` §2 — a claiming commit happened, so a text MAY have gone: ALWAYS alarmed (ids + the detail only).
      alarm(`[jobs] claim-peer-mesh-request: ${ptag} — the re-check now fails after an attempt was claimed (a text may have gone); recorded 'error' (${begun.detail})`);
      counts.expired += 1;
      continue;
    }
    if (begun.kind === 'no_target') {
      counts.noTarget += 1;
      // `-298` A — a re-claimed row's prior attempt MAY have sent. A FIRST attempt's peer / name skip is ⛔ alarmed (AC5b).
      if (begun.reclaimed) {
        // ⚠ `attemptCount` is the count of CLAIMED attempts before this re-claim (this one finished the row ⛔ claiming it).
        alarm(`[jobs] claim-peer-mesh-request: ${ptag} finished 'no_target' (${begun.detail}) on a re-claim after ${String(begun.attemptCount)} claimed attempt(s) — a prior attempt may have sent`);
      }
      if (begun.replacementPingId !== null) {
        counts.replaced += 1;
        queue.push(begun.replacementPingId);
      }
      continue;
    }

    // ── After the commit: ⛔ KMS under the lock ──
    const transient = async (detail: string): Promise<void> => {
      const noted = await scoped((d) => claimDomain.notePeerMeshRequestTransient(d, { pariwarId, pingId, jobId, detail }));
      if (!noted) alarm(`[jobs] claim-peer-mesh-request: the row of ${ptag} moved on before its transient note (${detail})`);
      counts.transient += 1;
    };

    // The neighbour's number (BF12): the identity row's ciphertext → plaintext → `normalizeMobile` (the erased sentinel is ⛔ a
    // mobile — ALWAYS normalised, Trap 10). A THROW is a transient; an UNUSABLE value is R6.
    let e164: string | null = null;
    if (begun.mobileCiphertext !== null) {
      let plain: string;
      try {
        plain = await encryption.decryptMobile(begun.mobileCiphertext, deps.encryption);
      } catch {
        await transient(claimDomain.peerMeshRequestDetail({ kind: 'pre_send', fault: 'decrypt_failed:tier1' }));
        continue;
      }
      e164 = encryption.normalizeMobile(plain);
    }
    if (e164 === null) {
      // R6 — a SECOND transaction (claim → ping again): `no_target:no_sendable_number` + the replacement, unless R5.
      const finished = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
        claimDomain.finalisePeerMeshNoSendableNumber(client, { pariwarId, claimCaseId, pingId, jobId }),
      );
      if (!finished.moved) {
        alarm(`[jobs] claim-peer-mesh-request: the row of ${ptag} moved on before its no_target finalise`);
        continue;
      }
      counts.noTarget += 1;
      if (finished.attemptCount > 1) {
        alarm(`[jobs] claim-peer-mesh-request: ${ptag} finished 'no_target' (no_target:no_sendable_number) on attempt ${String(finished.attemptCount)} — a prior attempt was claimed and may have sent`);
      }
      if (finished.replacementPingId !== null) {
        counts.replaced += 1;
        queue.push(finished.replacementPingId);
      }
      continue;
    }
    let hash: string;
    try {
      hash = await claimDomain.correctionNumberHash(e164, pariwarId, deps.encryption);
    } catch {
      await transient(claimDomain.peerMeshRequestDetail({ kind: 'pre_send', fault: 'hash_failed:tier1' }));
      continue;
    }

    // F2 — the window closed between the begin and the handoff (the unsealing / hashing) ⇒ ⛔ sent. The row stays
    // `attempting` under this job, truthfully un-sent; the 09:00 IST child re-claims it past its lease (attempt 2).
    const sendAt = clock();
    if (!isInPeerRequestSendWindow(sendAt)) return deferToMorning(sendAt, counts);
    // P6 — the LEASE lapsed (or is about to — the core's two Secret Manager reads and its 10 s send still follow: the MARGIN)
    // between the begin and the handoff (an untimed unseal / HMAC): another child may re-claim this row and send ⇒ ⛔ sent here. The row is left as it is (⛔ note — the re-claimer owns it now, or the
    // retry re-claims it past the lease); counted as a transient so the SAME job retries.
    if (sendAt.getTime() - beginAt.getTime() >= claimDomain.CORRECTION_SEND_LEASE_MS - PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS) {
      alarm(`[jobs] claim-peer-mesh-request: ${ptag} — its lease lapsed (or nearly) before the handoff; ⛔ sent (left to the re-claim)`);
      counts.transient += 1;
      continue;
    }

    // ── The send — the registered words, the mode-resolved name, the link (R12 origin), the Pariwar's helpline ──
    const member = (nameRead as { name: string }).name;
    const link = buildAppLinkUrl(origin, 'peerRequest', begun.linkCode);
    const result = await sendClaimDltSms(deps, {
      dltTemplateIdConfigKey: PEER_MESH_REQUEST_SMS_TEMPLATES[locale].dltTemplateIdConfigKey,
      pariwarId: pid,
      e164,
      render: (helpline) => renderPeerMeshRequest(locale, { member, link, helpline }),
    });
    // The core's detail is RAW (a gateway `<code>` can be any string): ⛔ stored, alarmed or thrown as is.
    const detail = result.detail === null ? null : claimDomain.peerMeshRequestDetail({ kind: 'send', detail: result.detail });
    if (result.kind === 'transient') {
      await transient(detail!);
      continue;
    }
    // Story 6.34 (`-322` C1): sent as today; ONE warning per child, ⛔ an outcome change.
    if (result.helplineNotCallbackNumber === true && !helplineWarned) {
      helplineWarned = true;
      alarm(helplineNotCallbackNumberWarning(pid, 'peer mesh request'));
    }
    if (result.outcome !== 'accepted' && result.alarm) {
      alarm(`[jobs] claim-peer-mesh-request: ${detail!} for ${ptag} — recorded error (fail-closed)`);
    }
    const moved = await scoped((d) =>
      claimDomain.finalisePeerMeshRequest(d, {
        pariwarId,
        pingId,
        jobId,
        outcome: result.outcome,
        providerMessageId: result.providerMessageId,
        detail,
        recipientNumberHash: hash,
      }),
    );
    if (!moved) alarm(`[jobs] claim-peer-mesh-request: the row of ${ptag} moved on before its finalise (the outcome was ${result.outcome})`);
    if (result.outcome === 'accepted') counts.accepted += 1;
    else counts.finalOther += 1;
    // P1 — a final that is about the CONFIG, the account or the template (⛔ this recipient) would end every remaining ping the
    // same way, using up each once-ever slot: STOP — ⛔ further ping begun this run. ⚠ The sweep's R11 check sees the template id,
    // the helpline, a Secret Manager config fault and the gateway — those are then HELD; it does ⛔ see `auth`,
    // `dlt_template_not_approved` or `config:sms_messaging_unavailable`, so the next child uses ONE more slot (⛔ all of them) —
    // recorded (review round 2 W10). A transient noted earlier in this run is ⛔ retried by pg-boss now — the next sweep re-claims it.
    if (result.outcome === 'error' && isScopeWideSendFault(result.detail)) {
      alarm(`[jobs] claim-peer-mesh-request: the neighbour texts of ${tag} STOPPED after ${detail ?? ''} — ⛔ further ping begun this run; fix it before the next sweep (a config gap the sweep can see is held there; an account / template / messaging fault is ⛔ seen — the next child would use one more slot)`);
      return { status: 'held_config', reason: detail ?? 'config' };
    }
  }

  if (counts.transient > 0) {
    throw new ClaimCorrectionTransientError(`[jobs] claim-peer-mesh-request: ${String(counts.transient)} transient send(s) for ${tag} — retrying`);
  }
  return { status: 'done', counts };
}

// ── Registration ─────────────────────────────────────────────────────────────────────────────────────────────────

/** The daily cron — 10:30 IST (inside the send hours; after the suspicion sweep's 10:00). */
export const PEER_MESH_REQUEST_SWEEP_CRON = '30 10 * * *';

/** Register the two queues, their workers and the daily 10:30 IST sweep. */
export async function registerClaimPeerMeshRequestWorkers(
  boss: QueueClient,
  deps: ClaimPeerMeshRequestDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_REQUEST_SMS);
  await boss.work(QUEUE_NAMES.CLAIM_PEER_MESH_REQUEST_SMS, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(await runPeerMeshRequestChild(deps, boss, job.data as JobEnvelope<PeerMeshRequestPayload>, job.id));
    }
    return { processed: results.length, results };
  });

  // ⚠ The expiry is set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, while `schedule`
  // upserts its options on every boot and pg-boss copies them onto each job it fires.
  await boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_REQUEST_SWEEP, { expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_PEER_MESH_REQUEST_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runPeerMeshRequestSweep(deps, boss);
      console.info('[jobs] claim-peer-mesh-request-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-peer-mesh-request-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_PEER_MESH_REQUEST_SWEEP,
    opts.sweepCron ?? PEER_MESH_REQUEST_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: CORRECTION_SWEEP_EXPIRE_SECONDS },
  );
}
