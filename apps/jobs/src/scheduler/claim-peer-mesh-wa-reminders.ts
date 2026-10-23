// THE NEIGHBOURS' WHATSAPP REMINDER — the hourly SWEEP and the per-claim CHILD — Story 6.31 (Task 5; AC2, AC3, AC5, AC7–AC11; WR2–WR14;
// `2026-10-10-303` Q1 A *"plus one WhatsApp reminder after two days (48 hours), with the same words, to those of the five who have ⛔
// not answered and have chosen WhatsApp messages from the Trust"*; `-305` §2 item 4; `-310` CF1 A; `-311` PM2 / PM7 (g) / Trap 17;
// `2026-10-19-365`). The SHAPE of 6.27c's `claim-peer-mesh-requests.ts`, ADAPTED: a CHILD per CLAIM, a hold per PARIWAR.
// 📌 2026-10-23 (Story 6.35, Decision 2026-10-23-387 LS9 / LS10 (b′); `2026-10-23-385` PQ1 A): each reminder goes in its RECIPIENT's
// language, read again at its begin (WR14); a chooser whose language's template is unusable while the Pariwar default's is usable
// gets the Pariwar's (`pariwar_fallback`); a reminder with ⛔ usable template at all WAITS (⛔ row); BOTH unusable holds the Pariwar.
// ⭐ I2 — ONE Meta template sent DIRECTLY through the ONE WhatsApp client cache: ⛔ the alert path (whose WhatsApp→SMS step would send
// a SECOND text — `-311` PM2), ⛔ an SMS, ⛔ an alert. A failed WhatsApp send ends the reminder; ⛔ nothing falls back. The deps type
// carries ⛔ SMS client at all.
//
// ── The child (one claim) ───────────────────────────────────────────────────────────────────────────────────────────────
//   (1) QUIET HOURS — outside 09:00–20:00 IST ⇒ ⛔ begin; re-enqueued at the next 09:00 IST (re-checked at each begin and AT THE MARKER);
//   (2) THE RACE GUARD (WR9 / WR13) — the Pariwar's config again, OUTSIDE any lock (T15): the app-link base, the LIVE questionnaire
//       (⛔ question awaiting counsel), the language, the WhatsApp config (switch OFF ⇒ `noop`; incomplete ⇒ HOLD), the access token
//       (`resolveChannelSecret` — any throw HOLDS), the client (`messagingFor` — a config throw HOLDS), the template name for the
//       language (WR7 — unset / unreadable ⇒ HOLD), the helpline ⇒ `held_config` + ONE ids-only alarm, ⛔ row written;
//       📌 6.35: BOTH locales' names are read — the Pariwar holds only when its default's key is unreadable or both are unusable;
//   (3) the due pings — ⛔ any ⇒ `noop` (⛔ name decrypted for nothing);
//   (4) the deceased's FULL member-facing name, ONCE (WR13 — ⛔ SMS fit check; a fault is claim-wide ⇒ `no_target:name_*`);
//   (5) per due ping: the CLAIMING transaction (`beginPeerMeshWaReminder` — claim → ping → reminder) → COMMIT → (⛔ KMS under a lock)
//       the number → `normalizeMobile` → its keyed hash → the quiet-hours re-check → THE IN-FLIGHT MARKER (its own committed CAS;
//       ⛔ marker ⇒ ⛔ send) → the send (`timeoutMs`) → the bounded finalise, or `classifyDirectWaSendFailure`:
//         may_have_sent ⇒ `error` (⛔ resent — Meta has ⛔ idempotency key); transient ⇒ the note, the SAME job retries; scope ⇒ PARK
//         the row and END the loop; unknown scope ⇒ PARK the row and CONTINUE; recipient ⇒ `rejected_recipient`.
//       A decrypt / hash THROW is a transient (⛔ a finished `no_target`); an unusable number is `no_target:no_sendable_number`.
// ── The sweep, hourly 09:20–19:20 IST (inside the send hours) ─────────────────────────────────────────────────────────────
//   (0) the role guard (`canReadAcrossPariwars` — false ⇒ ONE alarm, the tick ends; ⛔ "nothing due") → (1) the LAPSED in-flight
//   rows finished `may_have_sent:lease_lapsed` → (2) the LATE rows (`+ 72 h`) `skipped_late` → (3) the paged due pings, the config
//   per Pariwar ONCE (a held Pariwar: ⛔ enqueued, one alarm), ONE child per claim.
// ⛔ NOTHING here writes an event, a claim state, a ping column or a selection outcome (I8). ⛔ No name, number, link code or link in
// a payload, a log line, an alarm or a `detail` — ids only (I7, T11).

import { buildAppLinkUrl } from '@twt/contracts';
import { TEMPLATE_NAME_FORM, classifyDirectWaSendFailure, type WhatsappAppCache, type WhatsappMessagingHandle } from '@twt/channels';
import {
  channelConfig,
  claim as claimDomain,
  encryption,
  ids,
  questionnaires,
  smsDelivery,
  withPariwarScope,
  type Db,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import type pg from 'pg';

import { claimCorrectionHelplineConfigKey } from './claim-correction-sms-templates.js';
import {
  CHILD_RETRY_DELAY_SECONDS,
  CHILD_RETRY_LIMIT,
  CLAIM_CORRECTION_TZ,
  CORRECTION_SWEEP_RETRY,
  DEFAULT_CORRECTION_SWEEP_MAX_RUNS,
  DEFAULT_CORRECTION_SWEEP_RUN_LIMIT,
  ClaimCorrectionTransientError,
} from './claim-correction-reminders.js';
import { CORRECTION_SEND_TIMEOUT_MS } from './claim-dlt-sms-send.js';
import {
  PEER_REQUEST_DEFER_FLOOR_MS,
  PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS,
  isInPeerRequestSendWindow,
  nextPeerRequestSendWindowStart,
  readMemberFacingDeceasedName,
} from './claim-peer-mesh-requests.js';
import { PEER_MESH_WA_REMINDER_LANGUAGE, PEER_MESH_WA_REMINDER_LOCALES, type PeerMeshWaReminderLocale } from './peer-mesh-wa-templates.js';

/** 📌 Story 6.35 — a config's template states as the begin takes them: the name, or `null` (unusable). */
export function peerMeshWaReminderTemplateNames(
  config: Pick<PeerMeshWaReminderSendConfig, 'templates'>,
): Record<PeerMeshWaReminderLocale, string | null> {
  const out = {} as Record<PeerMeshWaReminderLocale, string | null>;
  for (const l of PEER_MESH_WA_REMINDER_LOCALES) {
    const t = config.templates[l];
    out[l] = 'name' in t ? t.name : null;
  }
  return out;
}
import { resolveAppLinksOrigin } from './staff-email-config.js';
import { waTemplateConfigKey } from './wa-template-config-key.js';

/**
 * The reminder's deps — ⭐ I2: ⛔ SMS client of any kind (a type-level absence, pinned by `expectTypeOf`). The ONE WhatsApp client
 * cache (WR9), the fail-loud secret resolver (`resolveChannelSecret`), the config resolver (`resolveSmsDltConfig` — `null` = not
 * provisioned, a THROW = an outage), the app-link base.
 */
export interface ClaimPeerMeshWaReminderDeps {
  /** The BYPASSRLS service pool — the cross-tenant scans and the `withPariwarScope` pool. */
  readonly pool: pg.Pool;
  /** Tier-1 decrypt + the number hash (the jobs KMS deps). */
  readonly encryption: encryption.FieldCryptoDeps;
  /** THE one per-process WhatsApp client cache (`buildContributionProviderResolver` — WR9). */
  readonly whatsappAppCache: WhatsappAppCache;
  /** Secret NAME → value, FAIL-LOUD (`resolveChannelSecret`): any throw HOLDS the Pariwar (`config:wa_secret_unresolved`). */
  readonly resolveSecret: (secretName: string) => Promise<string>;
  /** Config NAME → value, `null` = "not provisioned"; THROWS on an outage (`resolveSmsDltConfig`). */
  readonly resolveConfig: (configKey: string) => Promise<string | null>;
  /** `APP_LINKS_BASE_URL`, read at boot and VALIDATED every run. */
  readonly appLinksBaseUrl: string | undefined;
  /** ⚠ TESTS ONLY — the questionnaire registry the live version is resolved from (default: the shipped one). */
  readonly questionnaireRegistry?: readonly questionnaires.QuestionnaireDefinition[];
  readonly now?: () => Date;
  readonly onAlarm?: (message: string) => void;
  /** The due-ping scan's PAGE size. */
  readonly runLimit?: number;
  /** The HARD bound on claims one tick enqueues — hitting it is ALARMED. */
  readonly maxRuns?: number;
  /** The tick's wall-clock budget (default `PEER_MESH_WA_REMINDER_SWEEP_BUDGET_MS`) — running out is ALARMED. */
  readonly sweepBudgetMs?: number;
  /** A MONOTONIC millisecond clock for the budget (default `performance.now`). */
  readonly elapsedClockMs?: () => number;
  /** The WhatsApp send's bound (default `CORRECTION_SEND_TIMEOUT_MS`, 10 s — WR10's inequality). */
  readonly sendTimeoutMs?: number;
  /** ⚠ TESTS ONLY — restrict every cross-tenant statement to these Pariwars (an EMPTY list, or ANY list in production, is REFUSED). */
  readonly pariwarAllowlist?: readonly string[];
}

/** The child's payload — ids ONLY (and the instant the sweep found the claim due). */
export interface PeerMeshWaReminderPayload {
  readonly claimCaseId: string;
  /**
   * ISO DB-clock instant of the sweep page that listed the claim due (`DuePeerMeshWaReminderPage.asOf`) — a quiet-hours deferral
   * carries it unchanged. Bounds the child's list past `+ 72 h` (round-2 P1 — a sibling ping already past its window then was never
   * due). Absent or unreadable ⇒ the child's own clock (⛔ a payload this code enqueues).
   */
  readonly dueAsOf?: string;
}

// ── WR12 — the run limits, sized for an HOURLY cron (6.25's sub-interval constants — ⛔ 6.27c's daily 45 min / 90 min) ─────────

/** The hourly cron — 09:20 … 19:20 IST (inside the send hours; a daily sweep would delay a 48-hour reminder up to a day). */
export const PEER_MESH_WA_REMINDER_SWEEP_CRON = '20 9-19 * * *';
/** The tick's wall-clock budget — a tick ends well inside the hour. */
export const PEER_MESH_WA_REMINDER_SWEEP_BUDGET_MS = 10 * 60 * 1000;
/** The sweep job's expiry (> the budget, < the hour — a slow tick ⛔ overlaps the next). */
export const PEER_MESH_WA_REMINDER_SWEEP_EXPIRE_SECONDS = 14 * 60;
/**
 * The CHILD's explicit expiry (⛔ pg-boss's 900 s default — deferred-work's 6.27c item): above its worst case (≤ 20 pings, each a
 * 10 s send + the bounded finalise). A re-run under the SAME job id is harmless — the begin's in-flight test (WR2).
 */
export const PEER_MESH_WA_REMINDER_CHILD_EXPIRE_SECONDS = 45 * 60;

function alarmOf(deps: Pick<ClaimPeerMeshWaReminderDeps, 'onAlarm'>): (m: string) => void {
  return deps.onAlarm ?? ((m: string): void => console.warn(m));
}

const ALARM_SAMPLE_IDS = 5;
function sampleIds(list: readonly string[]): string {
  const shown = list.slice(0, ALARM_SAMPLE_IDS).join(', ');
  return list.length > ALARM_SAMPLE_IDS ? `${shown} (+${String(list.length - ALARM_SAMPLE_IDS)} more)` : shown;
}

// ── The config (the sweep's per-Pariwar check, and the child's race guard) ───────────────────────────────────────────────────

/** What a ready Pariwar sends with. ⛔ Logged (the client holds the token). */
export interface PeerMeshWaReminderSendConfig {
  /**
   * 📌 Story 6.35 (LS9, LS10 (b′)) — ⛔ recipient language here: the begin resolves it per reminder. The Pariwar's default (the
   * fallback, and the both-unusable gap) and BOTH locales' template states — a name, or the gap that makes it unusable (unset /
   * invalid / the OTHER locale's key unreadable — BigDev 2026-10-23 *"Treat it as unset"*), kept apart for the alarm's state code.
   */
  readonly pariwarDefaultLocale: PeerMeshWaReminderLocale;
  readonly templates: Readonly<Record<PeerMeshWaReminderLocale, { readonly name: string } | { readonly gap: string }>>;
  readonly helpline: string;
  readonly origin: string;
  readonly client: WhatsappMessagingHandle;
}

/** The Pariwar's language could ⛔ be read (a DB fault) — ⛔ a gap: the child retries, the sweep skips the Pariwar this tick. */
export class PeerMeshWaReminderLocaleReadError extends Error {
  readonly sqlState: string;
  constructor(cause: unknown) {
    const sqlState = claimDomain.peerMeshSqlStateOf(cause) ?? 'unknown';
    super(`[jobs] claim-peer-mesh-wa-reminder: the Pariwar locale read failed (${sqlState})`);
    this.name = 'PeerMeshWaReminderLocaleReadError';
    this.sqlState = sqlState;
  }
}

/**
 * The 0171 form of a Meta template NAME. Story 5.13 (WC4) — MOVED unchanged to `@twt/channels` (with `waTemplateConfigKey`); this
 * re-export keeps the claim-contact step and its tests byte-unchanged.
 */
export { TEMPLATE_NAME_FORM };

/**
 * ⭐ WR9 / WR13 — the Pariwar's config, in the order the cheap checks come first. Returns `switch_off` (⛔ offered, ⛔ alarm), a gap
 * (an ALARM code — ⛔ stored), or the send config. Every Secret Manager / KMS read happens HERE, outside any row lock (T15).
 * @throws PeerMeshWaReminderLocaleReadError  the locale read failed — a transient, ⛔ a gap
 */
export async function peerMeshWaReminderConfig(
  deps: ClaimPeerMeshWaReminderDeps,
  pariwarId: string,
): Promise<{ readonly state: 'switch_off' } | { readonly state: 'gap'; readonly gap: string } | { readonly state: 'ready'; readonly config: PeerMeshWaReminderSendConfig }> {
  const pid = ids.pariwarId(pariwarId);
  const wa = await withPariwarScope(deps.pool, pid, (db: Db) => channelConfig.getWaConfig(db, pid));
  if (wa === null || !wa.enabled) return { state: 'switch_off' };
  const gap = (g: string) => ({ state: 'gap' as const, gap: g });
  const origin = resolveAppLinksOrigin(deps.appLinksBaseUrl);
  if (origin === null) return gap('config:app_links_base_url_invalid');
  // The reminder carries the same link to the same questions — a Pariwar whose text would HOLD holds its reminder too.
  const live = questionnaires.resolveLiveVersion('peer_mesh', pariwarId, deps.questionnaireRegistry);
  if (live === null) return gap('config:questionnaire_unavailable');
  if (questionnaires.pendingCounselBasisKeys(live).length > 0) return gap('config:counsel_basis_pending');
  let locale: PeerMeshWaReminderLocale;
  try {
    locale = await withPariwarScope(deps.pool, pid, (db: Db) => claimDomain.resolvePariwarDefaultLocale(db, pid));
  } catch (err) {
    if (err instanceof claimDomain.PeerRequestLocaleMissingError) return gap('config:locale_unavailable');
    throw new PeerMeshWaReminderLocaleReadError(err);
  }
  const phoneNumberId = wa.phoneNumberId?.trim() ?? '';
  const secretName = wa.accessTokenSecretName?.trim() ?? '';
  if (phoneNumberId === '' || secretName === '') return gap('config:wa_config_incomplete');
  // WR7 — the approved template's NAME per language. 📌 Story 6.35 (LS10 (b′)): BOTH are read. A THROW (an outage, or the dotted
  // name's INVALID_ARGUMENT) on the DEFAULT's key holds the tick as before; on the OTHER's key that locale is merely unusable.
  // "Meta refuses" is ⛔ a value — the name stays UNSET (Row 35 (b)), the same state.
  const templates: Partial<Record<PeerMeshWaReminderLocale, { readonly name: string } | { readonly gap: string }>> = {};
  for (const l of PEER_MESH_WA_REMINDER_LOCALES) {
    let name: string | null;
    try {
      name = (await deps.resolveConfig(waTemplateConfigKey('peer_mesh.reminder', l, pariwarId)))?.trim() ?? null;
    } catch {
      if (l === locale) return gap('config:wa_template_unreadable');
      templates[l] = { gap: 'config:wa_template_unreadable' };
      continue;
    }
    if (name === null || name === '') templates[l] = { gap: `config:wa_template_missing:${l}` };
    else if (!TEMPLATE_NAME_FORM.test(name)) templates[l] = { gap: `config:wa_template_invalid:${l}` };
    else templates[l] = { name };
  }
  const ready = templates as Record<PeerMeshWaReminderLocale, { readonly name: string } | { readonly gap: string }>;
  // BOTH unusable ⇒ HELD with the DEFAULT locale's gap (the alarm text as before).
  const own = ready[locale];
  if (PEER_MESH_WA_REMINDER_LOCALES.every((l) => 'gap' in ready[l]) && 'gap' in own) return gap(own.gap);
  let helpline: string | null;
  try {
    helpline = (await deps.resolveConfig(claimCorrectionHelplineConfigKey(pariwarId)))?.trim() ?? null;
  } catch {
    return gap('config:helpline_unreadable');
  }
  if (helpline === null || helpline === '') return gap('config:helpline_number_missing');
  // WR9 — the token (fail-loud: any throw HOLDS), then the ONE cache's client (a config throw HOLDS — `assertClientConfig`).
  let accessToken: string;
  try {
    accessToken = await deps.resolveSecret(secretName);
  } catch {
    return gap('config:wa_secret_unresolved');
  }
  let client: WhatsappMessagingHandle;
  try {
    client = deps.whatsappAppCache.messagingFor(pariwarId, { phoneNumberId, accessToken, graphApiVersion: wa.graphApiVersion });
  } catch {
    return gap('config:wa_config_incomplete');
  }
  return { state: 'ready', config: { pariwarDefaultLocale: locale, templates: ready, helpline, origin, client } };
}

// ── The SWEEP ──────────────────────────────────────────────────────────────────────────────────────────────────────

/** A due-ping keyset position (R4). */
export interface PeerMeshWaReminderCursor {
  readonly claimCaseId: string;
  readonly pingId: string;
}

export interface PeerMeshWaReminderSweepResult {
  readonly scannedPings: number;
  readonly enqueued: number;
  /** Claims held by a config gap — ⛔ enqueued, ⛔ row written. */
  readonly heldForConfig: number;
  /** 📌 Story 6.35 (LS10 (b′)) — due pings WAITING (⛔ usable template for their language at all) — ⛔ enqueued for them. */
  readonly waitingForTemplate: number;
  /** 📌 Story 6.35 (`-385`) — due pings whose reminder will go in the Pariwar's language (a chooser's template unusable). */
  readonly fallbackToPariwar: number;
  readonly finishedLapsed: number;
  readonly markedLate: number;
  readonly budgetExhausted: boolean;
  /** `true` ⇒ the role guard refused the tick (an RLS-bound role — roster Row 26). */
  readonly refused: boolean;
  /**
   * ⭐ R4 — where a BOUNDED tick (the budget, or `maxRuns`) stopped scanning — `null` once a tick drains the whole due set.
   * Pass it back in as the NEXT call's `resumeCursor` so that tick continues from here instead of restarting at the keyset's
   * head: a claim that is PERSISTENTLY due (repeatedly parked, still due every tick) would otherwise occupy the bound's front
   * seat forever and starve every claim after it, tick after tick. Over several ticks the cursor marches through the ring and
   * resets to `null` once it is fully drained, so an unsaturated sweep behaves exactly as before.
   */
  readonly resumeCursor: PeerMeshWaReminderCursor | null;
}

type EnqueueBoss = Pick<QueueClient, 'send'>;

/** ONE child per claim — ids only; `singletonKey` is a LABEL (the claim lock + the per-ping CAS are the dedup). */
export async function enqueuePeerMeshWaReminderChild(
  boss: EnqueueBoss,
  input: { readonly pariwarId: string; readonly claimCaseId: string; readonly dueAsOf: string; readonly startAfter?: Date },
): Promise<void> {
  await boss.send(
    QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SEND,
    {
      pariwarId: input.pariwarId,
      requestId: `claim.peer_mesh_wa_reminder:${input.claimCaseId}`,
      actorId: null,
      traceId: `claim.peer_mesh_wa_reminder:${input.claimCaseId}`,
      payload: { claimCaseId: input.claimCaseId, dueAsOf: input.dueAsOf },
    } satisfies JobEnvelope<PeerMeshWaReminderPayload>,
    {
      singletonKey: input.claimCaseId,
      retryLimit: CHILD_RETRY_LIMIT,
      retryDelay: CHILD_RETRY_DELAY_SECONDS,
      retryBackoff: true,
      expireInSeconds: PEER_MESH_WA_REMINDER_CHILD_EXPIRE_SECONDS,
      ...(input.startAfter !== undefined ? { startAfter: input.startAfter } : {}),
    },
  );
}

/** The sweep's marker for a Pariwar whose config could ⛔ be read this tick — ⛔ a gap string. */
const CONFIG_UNREADABLE: unique symbol = Symbol('peer-mesh-wa-reminder-config-unreadable');

/** ⭐ THE HOURLY SWEEP. See the module header. A per-claim try/catch around the enqueue — one claim never costs another its reminders. */
export async function runPeerMeshWaReminderSweep(
  deps: ClaimPeerMeshWaReminderDeps,
  boss: EnqueueBoss,
  resumeCursor: PeerMeshWaReminderCursor | null = null,
): Promise<PeerMeshWaReminderSweepResult> {
  const alarm = alarmOf(deps);
  const now = deps.now?.() ?? new Date();
  const limit = Math.max(1, deps.runLimit ?? DEFAULT_CORRECTION_SWEEP_RUN_LIMIT);
  const maxClaims = Math.max(1, deps.maxRuns ?? DEFAULT_CORRECTION_SWEEP_MAX_RUNS);
  const clockMs = deps.elapsedClockMs ?? ((): number => performance.now());
  const startedMs = clockMs();
  const budgetMs = Math.max(0, deps.sweepBudgetMs ?? PEER_MESH_WA_REMINDER_SWEEP_BUDGET_MS);
  const allow: string[] | null = deps.pariwarAllowlist ? [...deps.pariwarAllowlist] : null;
  const empty: PeerMeshWaReminderSweepResult = {
    scannedPings: 0,
    enqueued: 0,
    heldForConfig: 0,
    waitingForTemplate: 0,
    fallbackToPariwar: 0,
    finishedLapsed: 0,
    markedLate: 0,
    budgetExhausted: false,
    refused: false,
    resumeCursor: null,
  };
  if (allow !== null && process.env['NODE_ENV'] === 'production') {
    alarm('[jobs] claim-peer-mesh-wa-reminder-sweep: REFUSED — `pariwarAllowlist` is set while NODE_ENV is production (it is test-only); nothing was swept');
    return { ...empty, refused: true };
  }
  if (allow !== null && allow.length === 0) {
    alarm('[jobs] claim-peer-mesh-wa-reminder-sweep: REFUSED — `pariwarAllowlist` is EMPTY (it would sweep ⛔ no tenant); nothing was swept');
    return { ...empty, refused: true };
  }
  // (0) F21 — an RLS-bound role would see ⛔ row and report "nothing due": refuse, loudly (roster Row 26).
  if (!(await smsDelivery.canReadAcrossPariwars(deps.pool))) {
    alarm('[jobs] claim-peer-mesh-wa-reminder-sweep: REFUSED — the jobs role cannot read across Pariwars (⛔ superuser, ⛔ BYPASSRLS; roster Row 26) — ⛔ reminder was swept');
    return { ...empty, refused: true };
  }

  let budgetExhausted = false;

  // (1) WR10 — the LAPSED in-flight rows FIRST (regardless of the switch, the window and the bound — ⛔ such row is stranded).
  // R3 — bounded `SKIP LOCKED` batches, checking the tick's remaining budget between them (a single locked row ⛔ stalls the scan).
  const lapsed: { reminderId: string; claimCaseId: string }[] = [];
  for (;;) {
    if (clockMs() - startedMs > budgetMs) {
      budgetExhausted = true;
      break;
    }
    const batch = await claimDomain.finishLapsedInFlightPeerMeshWaReminders(deps.pool, { now, allow });
    lapsed.push(...batch);
    if (batch.length < claimDomain.PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH) break;
  }
  if (lapsed.length > 0) {
    alarm(
      `[jobs] claim-peer-mesh-wa-reminder-sweep: ${String(lapsed.length)} WhatsApp reminder(s) died mid-send (the lease lapsed after the send began) — ` +
        `recorded 'error' (may_have_sent:lease_lapsed); a reminder MAY have reached the neighbour, ⛔ resent (claims: ${sampleIds([...new Set(lapsed.map((l) => l.claimCaseId as string))])})`,
    );
  }
  // (2) WR5 — the LATE rows (regardless of the switch, a config hold and the window). ⛔ A row is created. R3 — the same bounded,
  // `SKIP LOCKED` batch shape.
  const late: { reminderId: string; claimCaseId: string }[] = [];
  if (!budgetExhausted) {
    for (;;) {
      if (clockMs() - startedMs > budgetMs) {
        budgetExhausted = true;
        break;
      }
      const batch = await claimDomain.markLatePeerMeshWaReminders(deps.pool, { allow });
      late.push(...batch);
      if (batch.length < claimDomain.PEER_MESH_WA_REMINDER_MAINTENANCE_BATCH) break;
    }
  }
  if (late.length > 0) {
    alarm(
      `[jobs] claim-peer-mesh-wa-reminder-sweep: ${String(late.length)} WhatsApp reminder(s) still un-sent 72 hours after the text — recorded 'skipped_late' ` +
        `(⛔ sent; a hold or an outage outlasted the reminder's window) (claims: ${sampleIds([...new Set(late.map((l) => l.claimCaseId as string))])})`,
    );
  }

  // (3) the due pings, paged; the config per Pariwar ONCE (memoised); ONE child per claim.
  const gapByPariwar = new Map<string, string | null | typeof CONFIG_UNREADABLE>();
  // 📌 Story 6.35 — a READY Pariwar's template states and default (the per-ping wait / fallback rule reads them; ⛔ only the gap).
  const readyByPariwar = new Map<string, PeerMeshWaReminderSendConfig>();
  const gapOf = async (pariwarId: string): Promise<string | null | typeof CONFIG_UNREADABLE> => {
    if (!gapByPariwar.has(pariwarId)) {
      try {
        const c = await peerMeshWaReminderConfig(deps, pariwarId);
        if (c.state === 'ready') readyByPariwar.set(pariwarId, c.config);
        // A switch turned OFF since the list was read: ⛔ offered (⛔ alarm) — the list's own join already excludes it.
        gapByPariwar.set(pariwarId, c.state === 'gap' ? c.gap : c.state === 'switch_off' ? 'switch_off' : null);
      } catch (err) {
        gapByPariwar.set(pariwarId, CONFIG_UNREADABLE);
        alarm(
          `[jobs] claim-peer-mesh-wa-reminder-sweep: the config of Pariwar ${pariwarId} could ⛔ be read (${err instanceof PeerMeshWaReminderLocaleReadError ? `the locale read failed, ${err.sqlState}` : 'a read failed'}) — ⛔ enqueued this tick`,
        );
      }
    }
    return gapByPariwar.get(pariwarId)!;
  };
  let bounded = false;
  let scannedPings = 0;
  let enqueued = 0;
  const seenClaims = new Set<string>();
  // R6 — HELD claims grouped by their OWN Pariwar (AC9 / WR12: ONE actionable alarm per held Pariwar per tick, ⛔ one merged
  // alarm naming neither tenant).
  const heldByPariwar = new Map<string, { claims: Set<string>; gaps: Set<string> }>();
  // 📌 Story 6.35 (LS10 (b′)) — per Pariwar and locale: pings WAITING (with the state code) and pings FALLING BACK (ids-free counts).
  const languageByPariwar = new Map<string, { waiting: Map<string, number>; fallback: Map<string, number> }>();
  const bump = (m: Map<string, number>, k: string): void => void m.set(k, (m.get(k) ?? 0) + 1);
  // R4 — resume AT the last tick's bounded stop, not the keyset's head; `resumeAt` trails the loop by one processed item so a
  // re-enter with it as `after` starts exactly AT the item the previous tick stopped on.
  let after: PeerMeshWaReminderCursor | null = resumeCursor;
  let resumeAt: PeerMeshWaReminderCursor | null = after;
  if (!budgetExhausted) {
    sweep: for (;;) {
      const page = await claimDomain.listDuePeerMeshWaReminderPings(deps.pool, { now, after, limit, allow });
      for (const due of page.due) {
        if (clockMs() - startedMs > budgetMs) {
          budgetExhausted = true;
          break sweep;
        }
        scannedPings += 1;
        const dueCursor: PeerMeshWaReminderCursor = { claimCaseId: due.claimCaseId, pingId: due.pingId };
        // 📌 Story 6.35 (LS10 (b′)) — per PING, BEFORE the `seenClaims` short-circuit: a reminder with ⛔ usable template at all
        // WAITS — ⛔ enqueued for it, and ⛔ marking its claim seen (a sendable SIBLING ping of the same claim must still go); a
        // chooser whose language's template is unusable falls back to the Pariwar's (`-385`) and is sendable. The child's begin
        // re-checks both under the lock. A ping with ⛔ passport (`null` locales) reaches the config's hold below.
        if (due.effectiveLocale !== null) await gapOf(due.pariwarId); // memoised — fills `readyByPariwar` for a ready Pariwar
        const ready = readyByPariwar.get(due.pariwarId);
        if (ready !== undefined && due.effectiveLocale !== null && due.pariwarDefaultLocale !== null) {
          const counts = languageByPariwar.get(due.pariwarId) ?? { waiting: new Map<string, number>(), fallback: new Map<string, number>() };
          languageByPariwar.set(due.pariwarId, counts);
          const choice = claimDomain.choosePeerMeshWaReminderTemplate({
            effective: due.effectiveLocale,
            source: due.localeSource,
            pariwarDefaultLocale: due.pariwarDefaultLocale,
            templates: peerMeshWaReminderTemplateNames(ready),
          });
          if (choice === null) {
            const own = ready.templates[due.effectiveLocale];
            bump(counts.waiting, `${due.effectiveLocale} — ${'gap' in own ? own.gap : 'usable'}`);
            resumeAt = dueCursor;
            continue;
          }
          if (choice.localeSource === 'pariwar_fallback') {
            const own = ready.templates[due.effectiveLocale];
            bump(counts.fallback, `${due.effectiveLocale} — ${'gap' in own ? own.gap : 'usable'} — sent in ${choice.locale}`);
          }
        }
        if (seenClaims.has(due.claimCaseId)) {
          resumeAt = dueCursor;
          continue;
        }
        const gap = await gapOf(due.pariwarId);
        if (gap === CONFIG_UNREADABLE || gap === 'switch_off') {
          resumeAt = dueCursor;
          continue;
        }
        if (gap !== null) {
          seenClaims.add(due.claimCaseId);
          const held = heldByPariwar.get(due.pariwarId) ?? { claims: new Set<string>(), gaps: new Set<string>() };
          held.claims.add(due.claimCaseId);
          held.gaps.add(gap);
          heldByPariwar.set(due.pariwarId, held);
          resumeAt = dueCursor;
          continue;
        }
        if (enqueued >= maxClaims) {
          bounded = true;
          break sweep; // `resumeAt` is still the PREVIOUS item — the next tick re-includes `due` as its first result.
        }
        seenClaims.add(due.claimCaseId);
        try {
          await enqueuePeerMeshWaReminderChild(boss, { pariwarId: due.pariwarId, claimCaseId: due.claimCaseId, dueAsOf: (page.asOf ?? now).toISOString() });
          enqueued += 1;
        } catch (err) {
          alarm(`[jobs] claim-peer-mesh-wa-reminder-sweep: failed to enqueue the WhatsApp reminders for claim ${due.claimCaseId} — ${err instanceof Error ? err.name : 'error'}`);
        }
        resumeAt = dueCursor;
      }
      if (page.scanned < Math.min(limit, claimDomain.PEER_MESH_WA_REMINDER_PAGE_CAP) || page.last === null) {
        resumeAt = null; // the ring drained with room to spare — the next tick starts fresh at the head again.
        break;
      }
      after = page.last;
    }
  }

  let heldForConfig = 0;
  for (const [pariwarId, held] of heldByPariwar) {
    heldForConfig += held.claims.size;
    alarm(
      `[jobs] claim-peer-mesh-wa-reminder-sweep: Pariwar ${pariwarId} — ${String(held.claims.size)} claim(s)' WhatsApp reminders HELD — ` +
        `${[...held.gaps].sort().join(', ')}; ⛔ enqueued, ⛔ row written — they go once it is fixed, while still inside 72 hours of the ` +
        `text (claims: ${sampleIds([...held.claims])})`,
    );
  }
  // 📌 Story 6.35 (LS10 (b′)) — ONE alarm per Pariwar for the reminders WAITING (⛔ usable template at all) and those going in the
  // Pariwar's language (`-385`): each locale, its state code, the count of pings — ids only.
  let waitingForTemplate = 0;
  let fallbackToPariwar = 0;
  for (const [pariwarId, c] of languageByPariwar) {
    const w = [...c.waiting].sort(([a], [b]) => a.localeCompare(b));
    const f = [...c.fallback].sort(([a], [b]) => a.localeCompare(b));
    waitingForTemplate += w.reduce((n, [, k]) => n + k, 0);
    fallbackToPariwar += f.reduce((n, [, k]) => n + k, 0);
    if (w.length === 0 && f.length === 0) continue;
    const parts = [
      ...w.map(([k, n]) => `${k} — ${String(n)} waiting`),
      ...f.map(([k, n]) => `${k} — ${String(n)} in the Pariwar's language`),
    ];
    alarm(
      `[jobs] claim-peer-mesh-wa-reminder-sweep: Pariwar ${pariwarId} — WhatsApp reminders whose language's template is unusable (${parts.join('; ')}); ` +
        `a waiting one goes once it is fixed, while still inside 72 hours of the text`,
    );
  }
  if (budgetExhausted) {
    alarm(`[jobs] claim-peer-mesh-wa-reminder-sweep: ran out of its ${String(Math.round(budgetMs / 60_000))}-minute budget after ${String(scannedPings)} ping(s) — the rest wait for the next tick`);
  } else if (bounded) {
    alarm(`[jobs] claim-peer-mesh-wa-reminder-sweep: hit the hard bound of ${String(maxClaims)} claims — the rest wait for the next tick`);
  }
  return {
    scannedPings,
    enqueued,
    heldForConfig,
    waitingForTemplate,
    fallbackToPariwar,
    finishedLapsed: lapsed.length,
    markedLate: late.length,
    budgetExhausted,
    refused: false,
    resumeCursor: budgetExhausted || bounded ? resumeAt : null,
  };
}

// ── The CHILD — one claim ──────────────────────────────────────────────────────────────────────────────────────────

/** What each ping came to (ids-free counts — the pg-boss job output). */
export interface PeerMeshWaReminderChildCounts {
  readonly accepted: number;
  readonly mayHaveSent: number;
  readonly rejectedRecipient: number;
  readonly parked: number;
  readonly skipped: number;
  readonly noTarget: number;
  readonly passed: number;
  readonly transient: number;
  /** 📌 Story 6.35 (LS10 (b′)) — reminders WAITING (⛔ usable template for the recipient's language at all — ⛔ write). */
  readonly waiting: number;
  /** 📌 Story 6.35 (`-385`) — reminders sent in the Pariwar's language because the chosen one's template was unusable. */
  readonly fallback: number;
}

export type PeerMeshWaReminderChildResult =
  | { readonly status: 'done'; readonly counts: PeerMeshWaReminderChildCounts }
  | { readonly status: 'deferred_quiet_hours'; readonly startAfter: Date; readonly counts?: PeerMeshWaReminderChildCounts }
  | { readonly status: 'held_config'; readonly reason: string }
  /** A scope-wide refusal parked the current row and ENDED the loop (WR10 rule 4). */
  | { readonly status: 'stopped_scope'; readonly reason: string; readonly counts: PeerMeshWaReminderChildCounts }
  | { readonly status: 'noop'; readonly reason: string };

/**
 * ⭐ ONE claim's WhatsApp reminders. See the module header. Every ping's outcome is recorded on its OWN reminder row; a transient on one
 * ping never costs the others theirs.
 * @throws ClaimCorrectionTransientError  a transient failure (pg-boss retries the SAME job) — ⛔ when 20:00 IST passed mid-run
 * @throws Error  a finalise that failed after Meta ACCEPTED the reminder (after ONE alarm carrying the ids and the wamid — the only
 *   record of it; the lapsed-row finisher later records `may_have_sent:lease_lapsed`)
 */
export async function runPeerMeshWaReminderChild(
  deps: ClaimPeerMeshWaReminderDeps,
  boss: EnqueueBoss,
  envelope: JobEnvelope<PeerMeshWaReminderPayload>,
  jobId: string,
): Promise<PeerMeshWaReminderChildResult> {
  const alarm = alarmOf(deps);
  const clock = (): Date => deps.now?.() ?? new Date();
  const now = clock();
  const p = envelope.payload;
  const pid = envelope.pariwarId;
  if (pid === null || pid === '') {
    alarm(`[jobs] claim-peer-mesh-wa-reminder: missing pariwarId for claim ${p.claimCaseId}`);
    return { status: 'noop', reason: 'missing_pariwar' };
  }
  const pariwarId = ids.pariwarId(pid);
  const claimCaseId = ids.claimId(p.claimCaseId);
  const tag = `claim ${p.claimCaseId}`;
  const ptagOf = (pingId: string): string => `ping ${pingId} of ${tag} (Pariwar ${pid})`;
  // Round-2 P1 — when the sweep found the claim due (a deferral keeps it); an absent / unreadable value ⇒ this child's clock.
  const parsedDueAsOf = p.dueAsOf === undefined ? Number.NaN : Date.parse(p.dueAsOf);
  const dueAsOf = Number.isFinite(parsedDueAsOf) ? new Date(parsedDueAsOf) : now;

  // (1) ⛔ never at night — the child comes back at the next 09:00 IST (6.27c's floored deferral).
  const deferToMorning = async (at: Date, counts?: PeerMeshWaReminderChildCounts): Promise<PeerMeshWaReminderChildResult> => {
    const next = nextPeerRequestSendWindowStart(at);
    const startAfter = new Date(Math.max(next.getTime(), at.getTime() + PEER_REQUEST_DEFER_FLOOR_MS));
    await enqueuePeerMeshWaReminderChild(boss, { pariwarId: pid, claimCaseId: p.claimCaseId, dueAsOf: dueAsOf.toISOString(), startAfter });
    return counts === undefined ? { status: 'deferred_quiet_hours', startAfter } : { status: 'deferred_quiet_hours', startAfter, counts: { ...counts } };
  };
  if (!isInPeerRequestSendWindow(now)) return deferToMorning(now);

  // (2) THE RACE GUARD — BEFORE any begin (config may have vanished since the sweep).
  let guard: Awaited<ReturnType<typeof peerMeshWaReminderConfig>>;
  try {
    guard = await peerMeshWaReminderConfig(deps, pid);
  } catch (err) {
    if (!(err instanceof PeerMeshWaReminderLocaleReadError)) throw err;
    alarm(`[jobs] claim-peer-mesh-wa-reminder: the locale read failed for ${tag} (${err.sqlState}) — retrying (⛔ reminder begun)`);
    throw new ClaimCorrectionTransientError(`[jobs] claim-peer-mesh-wa-reminder: transient locale_read_failed for ${tag}`);
  }
  if (guard.state === 'switch_off') return { status: 'noop', reason: 'switch_off' };
  if (guard.state === 'gap') {
    alarm(`[jobs] claim-peer-mesh-wa-reminder: the WhatsApp reminders of ${tag} are HELD — ${guard.gap}; ⛔ reminder begun (the next sweep re-selects it)`);
    return { status: 'held_config', reason: guard.gap };
  }
  const config = guard.config;

  const scoped = <T>(fn: (d: Db) => Promise<T>) => withPariwarScope(deps.pool, pariwarId, fn);
  const claimRow = await scoped((db) => claimDomain.getClaimCase(db, pariwarId, claimCaseId));
  if (!claimRow) {
    alarm(`[jobs] claim-peer-mesh-wa-reminder: ${tag} is not found in its Pariwar`);
    return { status: 'noop', reason: 'claim_missing' };
  }

  // (3) the due pings — read BEFORE the name (⛔ decrypted for nothing).
  const queue = await scoped((db) => claimDomain.listClaimDuePeerMeshWaReminderPings(db, { pariwarId, claimCaseId, now, dueAsOf }));
  if (queue.length === 0) return { status: 'noop', reason: 'nothing_due' };

  // (4) WR13 — the FULL member-facing name, ONCE (⛔ SMS fit check — §0 edge (ii)).
  const nameRead = await readMemberFacingDeceasedName(deps, pariwarId, claimRow.deceasedMemberId, tag, 'claim-peer-mesh-wa-reminder');
  const nameFault = 'fault' in nameRead ? nameRead.fault : null;
  const memberName = 'fault' in nameRead ? null : nameRead.name;
  const counts = { accepted: 0, mayHaveSent: 0, rejectedRecipient: 0, parked: 0, skipped: 0, noTarget: 0, passed: 0, transient: 0, waiting: 0, fallback: 0 };
  const templateNames = peerMeshWaReminderTemplateNames(config);
  const sendTimeoutMs = deps.sendTimeoutMs ?? CORRECTION_SEND_TIMEOUT_MS;

  for (const pingId of queue) {
    const ptag = ptagOf(pingId);
    const beginAt = clock();
    if (!isInPeerRequestSendWindow(beginAt)) return deferToMorning(beginAt, counts);
    const begun = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
      claimDomain.beginPeerMeshWaReminder(client, {
        pariwarId,
        claimCaseId,
        pingId,
        jobId,
        now: beginAt,
        nameFault,
        templates: templateNames,
      }),
    );
    if (begun.kind === 'waiting_template') {
      // 📌 Story 6.35 (LS10 (b′)) — counted EXPLICITLY (the catch-all below would file it under `passed`); ⛔ write.
      counts.waiting += 1;
      continue;
    }
    if (begun.kind === 'skipped') {
      counts.skipped += 1;
      continue;
    }
    if (begun.kind === 'no_target') {
      counts.noTarget += 1;
      continue;
    }
    if (begun.kind !== 'begun') {
      // already_final / held_by_other / in_flight / not_due / switch_off — ⛔ write by this child.
      counts.passed += 1;
      continue;
    }
    const row = { pariwarId, reminderId: begun.reminderId, jobId };
    if (begun.localeSource === 'pariwar_fallback') counts.fallback += 1;
    // A `begun` row means the begin found ⛔ name fault (WR13); a regression must ⛔ reach Meta with `undefined` — refused HERE,
    // BEFORE the marker, so the row stays re-claimable (⛔ a false "may have sent").
    if (memberName === null) throw new Error(`[jobs] claim-peer-mesh-wa-reminder: ${ptag} was begun without a member-facing name`);

    // ── After the commit: ⛔ KMS under a lock ──
    // Round-2 P2 — `phase` is CAS'd on the marker (a same-job-id twin's pre-send fault can ⛔ clear a live send's marker).
    const transient = async (detail: string, phase: 'pre_send' | 'post_send'): Promise<void> => {
      const noted = await scoped((d) => claimDomain.notePeerMeshWaReminderTransient(d, { ...row, detail, phase }));
      if (!noted) alarm(`[jobs] claim-peer-mesh-wa-reminder: the row of ${ptag} moved on before its transient note (${detail})`);
      counts.transient += 1;
    };

    // The neighbour's CURRENT number: ciphertext → plaintext → `normalizeMobile` (`+91XXXXXXXXXX`). A THROW is a transient.
    let e164: string | null = null;
    if (begun.mobileCiphertext !== null) {
      let plain: string;
      try {
        plain = await encryption.decryptMobile(begun.mobileCiphertext, deps.encryption);
      } catch {
        await transient(claimDomain.peerMeshWaReminderDetail({ kind: 'pre_send', fault: 'decrypt_failed:tier1' }), 'pre_send');
        continue;
      }
      e164 = encryption.normalizeMobile(plain);
    }
    if (e164 === null) {
      const finished = await scoped((d) => claimDomain.finishPeerMeshWaReminderNoSendableNumber(d, row));
      if (!finished) alarm(`[jobs] claim-peer-mesh-wa-reminder: the row of ${ptag} moved on before its no_target finalise`);
      counts.noTarget += 1;
      continue;
    }
    let hash: string;
    try {
      hash = await claimDomain.correctionNumberHash(e164, pariwarId, deps.encryption);
    } catch {
      await transient(claimDomain.peerMeshWaReminderDetail({ kind: 'pre_send', fault: 'hash_failed:tier1' }), 'pre_send');
      continue;
    }

    // WR10 — the quiet hours AGAIN at the marker (a begin at 19:59 must ⛔ send at 20:01): ⛔ marker; the 09:00 child re-claims the
    // row past its lease.
    const markAt = clock();
    if (!isInPeerRequestSendWindow(markAt)) return deferToMorning(markAt, counts);
    // ⭐ THE IN-FLIGHT MARKER — its own committed CAS; ⛔ marker ⇒ ⛔ send. Round-2 P3 — the lease clock is read INSIDE the scope
    // (after the pooled-connection wait), and the statement is bounded. Round-2 P4 — `late` (the domain's OWN `+ 72 h` recheck
    // finalised `skipped_late`) is a FINISHED row (⛔ retry); `lost` (this job's lease margin passed, another job holds the row, or it
    // moved on) is a transient.
    const marked = await scoped((d) =>
      claimDomain.markPeerMeshWaReminderInFlight(d, { ...row, leaseMarginMs: PEER_REQUEST_HANDOFF_LEASE_MARGIN_MS, now: clock() }),
    );
    if (marked === 'late') {
      counts.skipped += 1;
      continue;
    }
    if (marked === 'lost') {
      alarm(`[jobs] claim-peer-mesh-wa-reminder: ${ptag} — the lease lapsed before the send; ⛔ sent (a retry re-judges the row)`);
      counts.transient += 1;
      continue;
    }
    // ⭐ R2 — the marker's OWN commit is a pooled-connection wait + an UPDATE + a COMMIT: `markAt` was sampled BEFORE it, so a
    // slow handoff can itself cross 20:00 IST between the sample and the marker actually landing. Recheck the clock AFTER the
    // marker is known committed, and if quiet hours arrived, RELEASE it (⛔ a send; ⛔ a transient — Meta was never called) and
    // defer the whole claim to the next morning, where a fresh begin / marker re-judges everything.
    const afterMarkAt = clock();
    if (!isInPeerRequestSendWindow(afterMarkAt)) {
      const released = await scoped((d) => claimDomain.releasePeerMeshWaReminderInFlight(d, row));
      if (!released) alarm(`[jobs] claim-peer-mesh-wa-reminder: ${ptag} — moved on before its marker could be released for the night`);
      return deferToMorning(afterMarkAt, counts);
    }

    // ── The send — the ruled words' three values (WR13), the template for the language (WR7), its registered code (WR6) ──
    const member = memberName;
    const link = buildAppLinkUrl(config.origin, 'peerRequest', begun.linkCode);
    let wamid: string | null = null;
    let failure: unknown = null;
    try {
      wamid = await config.client.send(
        {
          to: e164.replace(/^\+/, ''),
          // 📌 Story 6.35 (LS9) — the template and language THIS begin recorded (the recipient's, or the Pariwar's — `-385`).
          templateName: begun.templateName,
          languageCode: PEER_MESH_WA_REMINDER_LANGUAGE[begun.locale],
          bodyParams: [member, link, config.helpline],
        },
        { timeoutMs: sendTimeoutMs },
      );
    } catch (err) {
      failure = err;
    }

    if (wamid !== null) {
      let moved: boolean;
      try {
        moved = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
          claimDomain.finalisePeerMeshWaReminder(client, { ...row, outcome: 'accepted', providerMessageId: wamid, recipientNumberHash: hash }),
        );
      } catch (err) {
        // WR10 — pg-boss calls `fail()` only on a throw and logs ⛔ thing: this alarm is the ONLY record of the wamid.
        alarm(
          `[jobs] claim-peer-mesh-wa-reminder: ${ptag} — Meta ACCEPTED the reminder (wamid ${wamid}) but its finalise FAILED ` +
            `(${claimDomain.peerMeshSqlStateOf(err) ?? 'no sqlstate'}); the row will be recorded may_have_sent:lease_lapsed`,
        );
        throw err;
      }
      if (!moved) alarm(`[jobs] claim-peer-mesh-wa-reminder: the row of ${ptag} moved on before its finalise (Meta accepted it, wamid ${wamid})`);
      counts.accepted += 1;
      continue;
    }

    const outcome = classifyDirectWaSendFailure(failure);
    if (outcome.kind === 'may_have_sent') {
      const detail = claimDomain.peerMeshWaReminderDetail({ kind: 'may_have_sent', how: outcome.token });
      const moved = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
        claimDomain.finalisePeerMeshWaReminder(client, { ...row, outcome: 'error', detail, recipientNumberHash: hash }),
      );
      alarm(`[jobs] claim-peer-mesh-wa-reminder: ${ptag} — ${detail}: the reminder MAY have reached the neighbour; recorded 'error', ⛔ resent${moved ? '' : ' (the row had moved on)'}`);
      counts.mayHaveSent += 1;
      continue;
    }
    if (outcome.kind === 'transient') {
      await transient(claimDomain.peerMeshWaReminderDetail({ kind: 'transient', note: outcome.token }), 'post_send');
      continue;
    }
    if (outcome.kind === 'recipient') {
      const moved = await withPariwarScope(deps.pool, pariwarId, (_db: Db, client: pg.PoolClient) =>
        claimDomain.finalisePeerMeshWaReminder(client, { ...row, outcome: 'rejected_recipient', recipientNumberHash: hash }),
      );
      if (!moved) alarm(`[jobs] claim-peer-mesh-wa-reminder: the row of ${ptag} moved on before its finalise (rejected_recipient)`);
      counts.rejectedRecipient += 1;
      continue;
    }
    // A refusal about the scope (rule 4) or of unknown scope (rule 6) — PARKED, ⛔ finished (the once-ever reminder is ⛔ spent on what
    // may be the account's fault); the sweep lists it again, subject to the 72-hour bound.
    const detail = claimDomain.peerMeshWaReminderDetail({ kind: 'park', scope: outcome.kind === 'scope' ? 'scope' : 'held', token: outcome.token });
    const parked = await scoped((d) => claimDomain.parkPeerMeshWaReminder(d, { ...row, detail }));
    if (!parked) alarm(`[jobs] claim-peer-mesh-wa-reminder: the row of ${ptag} moved on before its park (${detail})`);
    counts.parked += 1;
    if (outcome.kind === 'scope') {
      alarm(
        `[jobs] claim-peer-mesh-wa-reminder: the WhatsApp reminders of ${tag} in Pariwar ${pid} STOPPED — Meta refused the send for a reason about the Pariwar's ` +
          `account, number or template (${detail}); the reminder is parked (⛔ finished) and re-tried by the next sweep while still inside 72 hours`,
      );
      return { status: 'stopped_scope', reason: detail, counts };
    }
    alarm(`[jobs] claim-peer-mesh-wa-reminder: ${ptag} — Meta refused the send (${detail}, scope unknown); the reminder is parked (⛔ finished) and the claim's other neighbours go on`);
  }

  if (counts.transient > 0) {
    throw new ClaimCorrectionTransientError(`[jobs] claim-peer-mesh-wa-reminder: ${String(counts.transient)} transient send(s) for ${tag} — retrying`);
  }
  return { status: 'done', counts };
}

// ── Registration ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Register the two queues, their workers and the hourly 09:20–19:20 IST sweep (WR12). */
export async function registerClaimPeerMeshWaReminderWorkers(
  boss: QueueClient,
  deps: ClaimPeerMeshWaReminderDeps,
  opts: { readonly sweepCron?: string; readonly tz?: string } = {},
): Promise<void> {
  await boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SEND, { expireInSeconds: PEER_MESH_WA_REMINDER_CHILD_EXPIRE_SECONDS });
  await boss.work(QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SEND, async (jobs: Job[]) => {
    const results = [];
    for (const job of jobs) {
      results.push(await runPeerMeshWaReminderChild(deps, boss, job.data as JobEnvelope<PeerMeshWaReminderPayload>, job.id));
    }
    return { processed: results.length, results };
  });

  // ⚠ The expiry is set TWICE on purpose (6.19b's lesson): `createQueue` keeps an existing queue's default, while `schedule` upserts
  // its options on every boot and pg-boss copies them onto each job it fires.
  await boss.createQueue(QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SWEEP, { expireInSeconds: PEER_MESH_WA_REMINDER_SWEEP_EXPIRE_SECONDS });
  // R4 — the resume cursor a BOUNDED tick hands back, threaded into the NEXT tick via this closure (this registration runs
  // ONCE at boot; a restart loses it — ⛔ a correctness property, a fairness one).
  let resumeCursor: PeerMeshWaReminderCursor | null = null;
  await boss.work(QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SWEEP, async (jobs: Job[]) => {
    try {
      const swept = await runPeerMeshWaReminderSweep(deps, boss, resumeCursor);
      resumeCursor = swept.resumeCursor;
      console.info('[jobs] claim-peer-mesh-wa-reminder-sweep tick', JSON.stringify({ jobs: jobs.length, ...swept }));
      return swept;
    } catch (err) {
      console.error('[jobs] claim-peer-mesh-wa-reminder-sweep tick failed', err);
      throw err;
    }
  });
  await boss.schedule(
    QUEUE_NAMES.CLAIM_PEER_MESH_WA_REMINDER_SWEEP,
    opts.sweepCron ?? PEER_MESH_WA_REMINDER_SWEEP_CRON,
    {},
    { tz: opts.tz ?? CLAIM_CORRECTION_TZ, ...CORRECTION_SWEEP_RETRY, expireInSeconds: PEER_MESH_WA_REMINDER_SWEEP_EXPIRE_SECONDS },
  );
}
