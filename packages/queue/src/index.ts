// @twt/queue — the ONE pg-boss client construction + the cross-cutting job
// contract every queue consumer reuses (Story 1.12, DD-3).
//
// AR-5 wants a single Postgres-backed queue reused by every consumer (cycle spawn,
// reconciliation matcher, channel dispatcher, integrity-check, mirror push) instead
// of each surface re-inventing background-work plumbing. This package is that
// land-once shape:
//   - `createQueueClient` — the only sanctioned way to construct pg-boss, with the
//     `pgboss` schema isolation (§5.11), Cloud-SQL SSL posture, and error discipline
//     baked in once.
//   - `stopQueueClient` — the graceful drain helper (SIGTERM path).
//   - `JobEnvelope` — the ALS metadata contract carried across the queue boundary
//     (§context-propagation: ALS does NOT cross pg-boss; payloads carry the envelope
//     and worker handlers rehydrate ALS from it at job entry).
//   - `QUEUE_NAMES` — the queue-name registry (constants), so names are declared
//     once and never stringly-typed at call sites.
//
// This package has NO dependency on @twt/domain — it is a pure pg-boss wrapper +
// shared types. Consumers (apps/jobs, apps/api) import @twt/queue and @twt/domain
// independently (apps cannot depend on apps; this is the shared seam between them).

import { PgBoss } from 'pg-boss';

// Re-export the pg-boss types consumers need so worker/enqueue code imports the job
// contract from ONE place (@twt/queue) rather than reaching into pg-boss directly.
export type {
  Job,
  WorkHandler,
  WorkOptions,
  SendOptions,
  ScheduleOptions,
  StopOptions,
} from 'pg-boss';

/** The configured queue client type — a constructed pg-boss instance. */
export type QueueClient = PgBoss;

// ── Queue-name registry (DD-3) ────────────────────────────────────────────────
// One constant per queue. Downstream stories ADD entries here; they never inline a
// queue-name string literal at a `work()` / `send()` / `schedule()` call site.
export const QUEUE_NAMES = {
  /**
   * TTL cleanup vacuum for the idempotency_keys table (Story 1.12, AC-5). The
   * first pg-boss cron consumer — proves the cron + worker-registration substrate
   * end-to-end. Job class C (background) per architecture §1.4.
   */
  IDEMPOTENCY_VACUUM: 'idempotency.vacuum',
  /**
   * Daily DigiLocker issuer-certificate refresh (Story 3.3b, AC5.2 / ADR-0026 Category-5).
   * Invokes `kyc.refreshDigiLockerCerts()`, bumping `digilocker_public_certs.fetched_at` so
   * the two-window staleness budget means something. NOT fail-closed on a refresh failure
   * (§2.8): the last-good cert is trusted within budget. Job class C (background).
   */
  DIGILOCKER_CERT_REFRESH: 'digilocker.cert_refresh',
  /**
   * Daily renewal-lifecycle tick (Story 3.8, AC1/AC3). The FIRST emitter of the member grace
   * transitions (member.valid_through_reached / grace_entered / grace_expired) over an INDEXED candidate
   * scan, + the source of the renewal-reminder nudges. System actor (SIE; actorId=null). Job class C.
   */
  MEMBER_RENEWAL_LIFECYCLE: 'member.renewal_lifecycle',
  /**
   * Reserved renewal-reminder nudge queue (Story 3.8, AC1 / Decision 5; FR-23). The renewal-lifecycle
   * tick publishes RenewalReminderNudge intents here at +30/60/75/89 past valid_through; a no-op/log
   * sink consumes them until Epic 5 (Story 5-1 central dispatcher) lands its channel-delivery worker.
   * Idempotent per cycle via the send-time singletonKey ({member}-{cycle}-{offset}). Job class C.
   */
  RENEWAL_REMINDER: 'member.renewal_reminder',
  /**
   * Member data-export ZIP build (Story 3.11, FR-95 / AC1). The FIRST request-path producer: the API
   * enqueues this when a member requests a data export; the apps/jobs worker assembles the seven-file
   * human-readable ZIP off the request path + stores it envelope-encrypted at rest. Job class B
   * (priority) per architecture §1.4 ("Data export (FR-95): pg-boss job (Class B priority)").
   */
  DATA_EXPORT_BUILD: 'member.data_export.build',
  /**
   * Member data-export TTL/consume hygiene vacuum (Story 3.11, AC5). Zeroes `artifact_ciphertext` for
   * consumed/expired exports (PII hygiene — the artifact holds the member's full decrypted PII set) and
   * flips past-window rows → `expired`. Mirrors IDEMPOTENCY_VACUUM. Job class C (background).
   */
  DATA_EXPORT_VACUUM: 'member.data_export.vacuum',
  /**
   * FR-12A validity-cache GC sweep (Story 4.8, Task 4). DELETEs `member_validity_cache` rows older than a
   * small multiple of the 60s TTL — storage hygiene ONLY (an expired row is already unservable via the
   * read-path TTL guard; amendment epoch bumps + member-state changes orphan rows no read will address).
   * Mirrors IDEMPOTENCY_VACUUM (a single idempotent DELETE on the BYPASSRLS service pool). Job class C.
   */
  VALIDITY_CACHE_GC: 'validity_cache.gc',
  /**
   * Push device-token stale/invalid cleanup (Story 5.2, AC5). DELETEs `member_device_tokens` rows that
   * are `stale` past 7d or `invalid` past 30d (provisional operational defaults — not policy-derived).
   * Storage hygiene: reclaims dead Tier-1 ciphertext for tokens the app-open rebuild superseded or a
   * Firebase not-registered error killed. Mirrors IDEMPOTENCY_VACUUM (a single idempotent DELETE on the
   * BYPASSRLS service pool). Job class C (background).
   */
  DEVICE_TOKEN_CLEANUP: 'member.device_token.cleanup',
  /**
   * WhatsApp inbound-webhook processing + opt-in expiry sweep (Story 5.4, Task 5). A scheduled drain of the
   * `wa_inbound_webhook_events` §3.11 queue table: per persisted event it matches an inbound message to a
   * PENDING opt-in (→ ACTIVE + consent + 24h window), handles STOP (→ REVOKED) / Meta block (→
   * BLOCKED_BY_META), and consumes 5.3's mapMetaStatus + upsertWaSendStatus for status callbacks; plus a
   * stale-PENDING / past-window sweep (→ EXPIRED_24H_WINDOW). Best-effort, cross-tenant on the BYPASSRLS
   * service pool. Job class C (background).
   */
  WA_WEBHOOK_PROCESSOR: 'wa.webhook_processor',
  /**
   * Telegram inbound-update processing + opt-in stale-PENDING sweep (Story 5.5, Task 7). A scheduled drain of
   * the `telegram_inbound_webhook_events` §3.11 queue table: per persisted update it matches a bot `/start
   * <code>` to a PENDING opt-in (→ ACTIVE + consent, capturing chat_id), handles `/stop` (→ REVOKED) and a
   * `my_chat_member` block (→ BLOCKED); plus a stale-PENDING sweep (→ EXPIRED — NO past-window sweep, Telegram
   * has no window). Best-effort, cross-tenant on the BYPASSRLS service pool. Job class C (background).
   */
  TELEGRAM_WEBHOOK_PROCESSOR: 'telegram.webhook_processor',
  /**
   * Death-certificate OCR + parity evaluation (Story 6.5, Task 4). The API upload endpoint
   * enqueues this after storing the document bytes in object storage (send-only producer);
   * the apps/jobs worker fetches the bytes by key, runs the `OcrProvider`, evaluates parity
   * against the deceased member's KYC record, upserts the `claim_documents` metadata row, and
   * advances the claim `intake_converged → documents_pending` via `claim.documents_received`.
   * Idempotent (one doc row per (claim, document_type); the append is skipped once the claim
   * is already `documents_pending`). A provider/parse failure is non-blocking (→ `ambiguous` +
   * verifier review; AR-61). Job class B (request-triggered) per architecture §1.4.
   */
  CLAIM_OCR_PARITY: 'claim.ocr_parity',
} as const;

/** Union of the registered queue names. */
export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

// ── Job envelope (architecture §context-propagation L3895-3898) ────────────────
// ALS (the request-scoped `{ requestId, pariwarId, actorId, traceId }`) does NOT
// cross the pg-boss boundary. Every job payload is wrapped in this envelope at
// enqueue time; the worker rehydrates ALS from `envelope` fields at job entry so
// downstream logging/auditing/tenant-scoping behave exactly as in the request path.
export interface JobEnvelope<TPayload = unknown> {
  /** Correlation id of the originating request (or the cron run that enqueued). */
  requestId: string;
  /** Tenant scope, or null for GLOBAL/system jobs (e.g. the TTL vacuum). */
  pariwarId: string | null;
  /** Acting principal, or null for system-triggered jobs. */
  actorId: string | null;
  /** Distributed-trace id, propagated end-to-end. */
  traceId: string;
  /** The job-specific payload. */
  payload: TPayload;
}

/** Options for {@link createQueueClient}. */
export interface CreateQueueClientOptions {
  /** Postgres schema for the queue objects. Default `'pgboss'` (§5.11 isolation). */
  schema?: string;
  /** pg-boss internal pool max. Default 10 (per-workspace sizing is ops policy). */
  max?: number;
  /**
   * SSL config. Default `{ rejectUnauthorized: false }` — same reasoning as
   * `createDb` in @twt/domain: the Cloud SQL Auth Proxy runs on loopback and
   * handles mutual-TLS itself, so there is no server cert to verify on the socket.
   * Pass `true` for a direct private-IP connection that should verify certs.
   */
  ssl?: boolean | Record<string, unknown>;
  /** `application_name` for the pg connection. Default `'twt-jobs'`. */
  applicationName?: string;
  /**
   * Handler for pg-boss internal `error` events (pool / worker failures). Default
   * logs `code` + `message` only (pg error objects can carry query text). Attaching
   * a handler is REQUIRED — an unhandled EventEmitter 'error' crashes the process.
   */
  onError?: (err: Error) => void;
}

/**
 * Construct the canonical pg-boss client. Wraps `new PgBoss(...)` with the
 * `pgboss`-schema isolation, the Cloud-SQL SSL posture, and the mandatory error
 * handler — the construction discipline lives here once (DD-3). pg-boss manages its
 * OWN connection pool from the connection string; do NOT hand it a `createDb` pool.
 *
 * The returned client is NOT started — the caller invokes `boss.start()` (which
 * creates the `pgboss` schema on first run) after registering its queues/workers.
 */
export function createQueueClient(
  connectionString: string,
  options: CreateQueueClientOptions = {},
): QueueClient {
  if (!connectionString) {
    throw new Error('[queue] connectionString must not be empty');
  }

  const boss = new PgBoss({
    connectionString,
    schema: options.schema ?? 'pgboss',
    max: options.max ?? 10,
    ssl: options.ssl ?? { rejectUnauthorized: false },
    application_name: options.applicationName ?? 'twt-jobs',
  });

  const onError =
    options.onError ??
    ((err: Error) => {
      const code = (err as Error & { code?: string }).code;
      console.error('[queue] pg-boss error:', code ?? 'NO_CODE', err.message);
    });
  boss.on('error', onError);

  return boss;
}

/** Options for {@link stopQueueClient}. */
export interface StopQueueClientOptions {
  /** Grace period (ms) to wait for in-flight jobs before forcing shutdown. Default 30s. */
  timeoutMs?: number;
}

/**
 * Graceful drain helper for the SIGTERM path: `boss.stop({ graceful: true, … })`
 * waits for in-flight jobs to finish (up to `timeoutMs`) before resolving. Use this
 * instead of calling `boss.stop()` ad-hoc so the drain posture is consistent across
 * consumers.
 */
export async function stopQueueClient(
  boss: QueueClient,
  options: StopQueueClientOptions = {},
): Promise<void> {
  await boss.stop({ graceful: true, timeout: options.timeoutMs ?? 30_000 });
}
