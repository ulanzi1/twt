// Integration-test harness for apps/api (Task 8.0).
//
// `createTestApp(overrides?)` builds the Fastify app via the real `buildServer`
// factory bound to test deps: a fake KMS (deterministic keys), a capturing audit
// sink + step-up delivery (so tests assert emitted events), a real pg pool when
// DATABASE_URL is set (else a never-connecting dummy pool for DB-less smoke), and
// an injectable clock. All HTTP assertions use `app.inject(...)` — never supertest
// (Fastify's native injection needs no port, Task 8).
//
// DB-touching specs guard with `describe.skipIf(!hasDatabase)` so the suite passes
// without Docker; the live-DB CI job sets DATABASE_URL (Story 1.6 substrate).

import type {
  BankStatementStorage,
  ClaimDocumentStorage,
  ContributionNotePdfRenderer,
  HelpdeskAttachmentStorage,
  SelfVerifyScreenshotStorage,
  StatementScanner,
} from '@twt/contracts';
import { createDb } from '@twt/domain';
import {
  type BankIfscLookup,
  createFakeContributionNotePdfRenderer,
  createInMemoryBankIfscLookup,
  createInMemoryBankStatementStorage,
  createInMemoryClaimDocumentStorage,
  createInMemoryHelpdeskAttachmentStorage,
  createInMemorySelfVerifyScreenshotStorage,
  createNoOpStatementScanner,
  type FakeContributionNotePdfRenderer,
  type InMemoryBankIfscLookup,
  type InMemoryBankStatementStorage,
  type InMemoryClaimDocumentStorage,
  type InMemoryHelpdeskAttachmentStorage,
  type InMemorySelfVerifyScreenshotStorage,
} from '@twt/platform-adapters';
import type pg from 'pg';

import type { JobEnvelope } from '@twt/queue';
import {
  createCapturingHelpdeskReplyNotifier,
  type CapturingHelpdeskReplyNotifier,
  type HelpdeskReplyNotifier,
} from '@twt/jobs';

import type { AuthAuditEvent, AuthAuditSink } from '../../src/audit/audit-sink.js';
import { loadConfig, type ApiConfig } from '../../src/config.js';
import type {
  AppDeps,
  ClaimOcrParityEnqueuer,
  ClaimOcrParityJobPayload,
  DataExportEnqueuer,
  ReportExportEnqueuer,
  NewsPublishEnqueuer,
  PoolSpawnTriggerEnqueuer,
} from '../../src/context.js';
import type { PoolSpawnTriggerPayload } from '@twt/contracts';
import { buildEncryptionDeps } from '../../src/deps.js';
import { generateEphemeralMemberJwtKeys } from '../../src/modules/auth/member/jwt-keys.js';
import type {
  StepUpDeliveryResult,
  StepUpOtpDelivery,
  StepUpOtpDeliveryPort,
} from '../../src/modules/auth/shared/step-up-delivery.js';
import { noopTurnstileVerifier, type TurnstileVerifier } from '../../src/modules/auth/shared/turnstile.js';
import { createSimpleWebAuthnProvider, type WebAuthnProvider } from '../../src/modules/auth/shared/webauthn.js';
import { createFakeDeployTrigger, type DeployTrigger } from '../../src/modules/pariwar-provisioning/deploy-trigger.js';
import {
  createKycProviderRegistry,
  fixtureKycProvider,
  type KycProviderRegistry,
} from '../../src/modules/kyc/index.js';
import type {
  NiyamavaliAmendedEvent,
  NiyamavaliAmendedHook,
} from '../../src/modules/rules/notification-hook.js';
import type {
  PoolFixedAmountChangedEvent,
  PoolFixedAmountChangedHook,
} from '../../src/modules/pool-fixed-amount/notification-hook.js';
import type { ToneReviewAuditEvent, ToneReviewAuditSink } from '../../src/modules/tone-review/index.js';
import { buildServer } from '../../src/server.js';

export const DATABASE_URL = process.env['DATABASE_URL'];
export const hasDatabase = Boolean(DATABASE_URL);

const TEST_PEPPER = 'test-argon2-pepper-value-do-not-use-in-prod';

/** Test env — small Argon2id params keep crypto fast in CI (overridden vs OWASP baseline). */
const TEST_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'test',
  SESSION_SECRET: 'test-session-secret-at-least-32-characters-long',
  WEBAUTHN_RP_ID: 'localhost',
  WEBAUTHN_EXPECTED_ORIGIN: 'http://localhost:3001',
  ARGON2_PEPPER_SECRET_NAME: 'test-pepper',
  ARGON2_PEPPER: TEST_PEPPER,
  ARGON2_MEMORY_COST: '8192',
  ARGON2_TIME_COST: '2',
  ARGON2_PARALLELISM: '1',
  // High rate-limit ceilings — the per-IP limit otherwise accumulates across the
  // many inject() calls in a test file (all from 127.0.0.1) and trips 429s. The
  // dedicated rate-limit.spec.ts overrides these LOCALLY to a low ceiling to force
  // the trip; do NOT lower them here (it would break every other suite).
  RATE_LIMIT_MAX: '100000',
  LOGIN_RATE_MAX: '100000',
  STEP_UP_RATE_MAX: '100000',
  READ_RATE_MAX: '100000',
  SEARCH_RATE_MAX: '100000',
  WRITE_RATE_MAX: '100000',
};

export function testConfig(extra: NodeJS.ProcessEnv = {}): ApiConfig {
  return loadConfig({ ...TEST_ENV, ...extra });
}

/** An audit sink that records every emitted event for assertions. */
export class CapturingAuditSink implements AuthAuditSink {
  public readonly events: AuthAuditEvent[] = [];
  public emit(event: AuthAuditEvent): void {
    this.events.push(event);
  }
  public ofType(type: string): AuthAuditEvent[] {
    return this.events.filter((e) => e.type === type);
  }
}

/** A tone-review audit sink that records every emitted event for assertions (Story 2.2). */
export class CapturingToneReviewAuditSink implements ToneReviewAuditSink {
  public readonly events: ToneReviewAuditEvent[] = [];
  public emit(event: ToneReviewAuditEvent): void {
    this.events.push(event);
  }
  public ofType(type: string): ToneReviewAuditEvent[] {
    return this.events.filter((e) => e.type === type);
  }
}

/** A member-notification hook that records every fired event (Story 2.4, AC3). */
export class CapturingNiyamavaliHook {
  public readonly events: NiyamavaliAmendedEvent[] = [];
  public readonly hook: NiyamavaliAmendedHook = (event) => {
    this.events.push(event);
  };
  public get last(): NiyamavaliAmendedEvent | undefined {
    return this.events.at(-1);
  }
}

/** A fixed-amount-changed notification hook that records every fired event (Story 7.5). */
export class CapturingPoolFixedAmountHook {
  public readonly events: PoolFixedAmountChangedEvent[] = [];
  public readonly hook: PoolFixedAmountChangedHook = (event) => {
    this.events.push(event);
  };
  public get last(): PoolFixedAmountChangedEvent | undefined {
    return this.events.at(-1);
  }
}

/** A step-up delivery that records every code so tests can complete the flow. */
export class CapturingStepUpDelivery implements StepUpOtpDeliveryPort {
  public readonly deliveries: StepUpOtpDelivery[] = [];
  public async deliver(delivery: StepUpOtpDelivery): Promise<StepUpDeliveryResult> {
    this.deliveries.push(delivery);
    // Mirror the reveal/log stub's result shape (Story 5.9, Task 3).
    return { channel: 'log', status: 'stub' };
  }
  public get last(): StepUpOtpDelivery | undefined {
    return this.deliveries.at(-1);
  }
}

/**
 * A capturing data-export queue (Story 3.11). Records every enqueued build envelope so the API
 * integration test can assert the request path enqueued the job (spy the send-only client) WITHOUT a
 * live pg-boss. `close` is a no-op. Throw-on-enqueue can be simulated by setting `failNext = true`.
 */
export class CapturingDataExportQueue implements DataExportEnqueuer {
  public readonly enqueued: JobEnvelope<{ exportId: string }>[] = [];
  public failNext = false;
  public async enqueueBuild(envelope: JobEnvelope<{ exportId: string }>): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('simulated enqueue failure');
    }
    this.enqueued.push(envelope);
  }
  public get last(): JobEnvelope<{ exportId: string }> | undefined {
    return this.enqueued.at(-1);
  }
}

/**
 * A capturing report-export queue (Story 10.7). Records every enqueued build envelope so the reports
 * request spec can assert the request path enqueued the job WITHOUT a live pg-boss. Throw-on-enqueue via
 * `failNext = true` exercises the compensating-write (mark `failed` + 503) path. `close` is a no-op.
 */
export class CapturingReportExportQueue implements ReportExportEnqueuer {
  public readonly enqueued: JobEnvelope<{ reportExportId: string }>[] = [];
  public failNext = false;
  public async enqueueBuild(envelope: JobEnvelope<{ reportExportId: string }>): Promise<void> {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('simulated enqueue failure');
    }
    this.enqueued.push(envelope);
  }
  public get last(): JobEnvelope<{ reportExportId: string }> | undefined {
    return this.enqueued.at(-1);
  }
}

/**
 * A capturing claim OCR + parity queue (Story 6.5). Records every enqueued envelope so the upload
 * spec can assert the request path enqueued the job — and, critically, that a REJECTED upload
 * (409 lifecycle guard) enqueues NOTHING. `close` is a no-op.
 */
export class CapturingClaimOcrParityQueue implements ClaimOcrParityEnqueuer {
  public readonly enqueued: JobEnvelope<ClaimOcrParityJobPayload>[] = [];
  public async enqueue(envelope: JobEnvelope<ClaimOcrParityJobPayload>): Promise<void> {
    this.enqueued.push(envelope);
  }
  public get last(): JobEnvelope<ClaimOcrParityJobPayload> | undefined {
    return this.enqueued.at(-1);
  }
}

/**
 * A capturing pool-spawn parent-job queue (Story 7.3). Records every fired trigger payload so the
 * cycle-freeze commit spec can assert the CYCLE_SPAWN_PARENT job was enqueued post-commit (and NOT on
 * a rejected commit). `close` is a no-op.
 */
export class CapturingPoolSpawnQueue implements PoolSpawnTriggerEnqueuer {
  public readonly enqueued: PoolSpawnTriggerPayload[] = [];
  public async enqueue(payload: PoolSpawnTriggerPayload): Promise<void> {
    this.enqueued.push(payload);
  }
  public get last(): PoolSpawnTriggerPayload | undefined {
    return this.enqueued.at(-1);
  }
}

/**
 * A capturing News/Blog publish-job queue (Story 10.5). Records every enqueued publish trigger so the
 * news E2E spec can assert `schedule` enqueued a DELAYED job and `publish` enqueued an immediate one.
 */
export class CapturingNewsPublishQueue implements NewsPublishEnqueuer {
  public readonly enqueued: Array<{ postId: string; pariwarId: string; mode: 'immediate' | 'scheduled'; at?: Date }> = [];
  public async enqueuePublish(input: {
    readonly postId: string;
    readonly pariwarId: string;
    readonly mode: 'immediate' | 'scheduled';
    readonly at?: Date;
    readonly requestId: string;
    readonly actorId: string | null;
    readonly traceId: string;
  }): Promise<void> {
    this.enqueued.push({ postId: input.postId, pariwarId: input.pariwarId, mode: input.mode, ...(input.at ? { at: input.at } : {}) });
  }
  public get last(): { postId: string; mode: 'immediate' | 'scheduled'; at?: Date } | undefined {
    return this.enqueued.at(-1);
  }
}

export interface TestDepsOverrides {
  auditSink?: AuthAuditSink;
  toneReviewAuditSink?: ToneReviewAuditSink;
  stepUpDelivery?: StepUpOtpDeliveryPort;
  adminStepUpDelivery?: StepUpOtpDeliveryPort;
  turnstile?: TurnstileVerifier;
  webauthn?: WebAuthnProvider;
  deployTrigger?: DeployTrigger;
  niyamavaliAmendedHook?: NiyamavaliAmendedHook;
  poolFixedAmountChangedHook?: PoolFixedAmountChangedHook;
  helpdeskReplyNotifier?: HelpdeskReplyNotifier;
  kycProviders?: KycProviderRegistry;
  dataExportQueue?: DataExportEnqueuer;
  reportExportQueue?: ReportExportEnqueuer;
  claimDocumentStorage?: ClaimDocumentStorage;
  bankStatementStorage?: BankStatementStorage;
  selfVerifyScreenshotStorage?: SelfVerifyScreenshotStorage;
  helpdeskAttachmentStorage?: HelpdeskAttachmentStorage;
  statementScanner?: StatementScanner;
  contributionNotePdfRenderer?: ContributionNotePdfRenderer;
  claimOcrParityQueue?: ClaimOcrParityEnqueuer;
  poolSpawnQueue?: PoolSpawnTriggerEnqueuer;
  newsPublishQueue?: NewsPublishEnqueuer;
  bankIfscLookup?: BankIfscLookup;
  resolveChannelSecret?: (secretName: string) => Promise<string>;
  clock?: () => Date;
  env?: NodeJS.ProcessEnv;
}

export interface TestDeps {
  deps: AppDeps;
  pool: pg.Pool;
  auditSink: CapturingAuditSink;
  toneReviewAuditSink: CapturingToneReviewAuditSink;
  stepUpDelivery: CapturingStepUpDelivery;
  adminStepUpDelivery: CapturingStepUpDelivery;
  niyamavaliHook: CapturingNiyamavaliHook;
  poolFixedAmountHook: CapturingPoolFixedAmountHook;
  helpdeskReplyNotifier: CapturingHelpdeskReplyNotifier;
  dataExportQueue: CapturingDataExportQueue;
  reportExportQueue: CapturingReportExportQueue;
  claimDocumentStorage: InMemoryClaimDocumentStorage;
  bankStatementStorage: InMemoryBankStatementStorage;
  selfVerifyScreenshotStorage: InMemorySelfVerifyScreenshotStorage;
  helpdeskAttachmentStorage: InMemoryHelpdeskAttachmentStorage;
  statementScanner: StatementScanner;
  contributionNotePdfRenderer: FakeContributionNotePdfRenderer;
  claimOcrParityQueue: CapturingClaimOcrParityQueue;
  poolSpawnQueue: CapturingPoolSpawnQueue;
  newsPublishQueue: CapturingNewsPublishQueue;
  bankIfscLookup: InMemoryBankIfscLookup;
}

const FALLBACK_URL = 'postgresql://twt_test:twt_test@127.0.0.1:1/twt_unused';

export function buildTestDeps(overrides: TestDepsOverrides = {}): TestDeps {
  const config = testConfig(overrides.env);
  // Single pool (§1.1) — createDb attaches the idle-client error handler.
  const { db, pool } = createDb(DATABASE_URL ?? FALLBACK_URL, {
    ssl: false,
    connectionTimeoutMillis: 5000,
  });

  const auditSink = (overrides.auditSink as CapturingAuditSink) ?? new CapturingAuditSink();
  const toneReviewAuditSink =
    (overrides.toneReviewAuditSink as CapturingToneReviewAuditSink) ??
    new CapturingToneReviewAuditSink();
  const stepUpDelivery =
    (overrides.stepUpDelivery as CapturingStepUpDelivery) ?? new CapturingStepUpDelivery();
  // Story 5.9: admin OTP delivery is a SEPARATE always-stub key (admin OTP-over-SMS deferred). A capturing
  // fake by default so the admin step-up spec asserts against it.
  const adminStepUpDelivery =
    (overrides.adminStepUpDelivery as CapturingStepUpDelivery) ?? new CapturingStepUpDelivery();
  const niyamavaliHook = new CapturingNiyamavaliHook();
  const poolFixedAmountHook = new CapturingPoolFixedAmountHook();
  const helpdeskReplyNotifier = createCapturingHelpdeskReplyNotifier();
  const dataExportQueue =
    (overrides.dataExportQueue as CapturingDataExportQueue) ?? new CapturingDataExportQueue();
  const reportExportQueue =
    (overrides.reportExportQueue as CapturingReportExportQueue) ?? new CapturingReportExportQueue();
  const claimDocumentStorage =
    (overrides.claimDocumentStorage as InMemoryClaimDocumentStorage) ??
    createInMemoryClaimDocumentStorage();
  const bankStatementStorage =
    (overrides.bankStatementStorage as InMemoryBankStatementStorage) ??
    createInMemoryBankStatementStorage();
  const selfVerifyScreenshotStorage =
    (overrides.selfVerifyScreenshotStorage as InMemorySelfVerifyScreenshotStorage) ??
    createInMemorySelfVerifyScreenshotStorage();
  const helpdeskAttachmentStorage =
    (overrides.helpdeskAttachmentStorage as InMemoryHelpdeskAttachmentStorage) ??
    createInMemoryHelpdeskAttachmentStorage();
  const statementScanner = overrides.statementScanner ?? createNoOpStatementScanner();
  const claimOcrParityQueue =
    (overrides.claimOcrParityQueue as CapturingClaimOcrParityQueue) ??
    new CapturingClaimOcrParityQueue();
  const poolSpawnQueue =
    (overrides.poolSpawnQueue as CapturingPoolSpawnQueue) ?? new CapturingPoolSpawnQueue();
  const newsPublishQueue =
    (overrides.newsPublishQueue as CapturingNewsPublishQueue) ?? new CapturingNewsPublishQueue();
  const bankIfscLookup =
    (overrides.bankIfscLookup as InMemoryBankIfscLookup) ?? createInMemoryBankIfscLookup();
  // Contribution-Note renderer (Story 8.7) — the deterministic FAKE, never the real engine: an
  // integration suite must not launch a browser. The real-engine assertions (Devanagari embed +
  // structure tree) live in the single, clearly-marked platform-adapters render suite.
  const contributionNotePdfRenderer =
    (overrides.contributionNotePdfRenderer as FakeContributionNotePdfRenderer) ??
    createFakeContributionNotePdfRenderer();

  // Build fake-KMS encryption deps with the test pepper (KMS_TEST_MODE defaults to fake).
  const enc = buildEncryptionDeps(TEST_PEPPER);

  const deps: AppDeps = {
    config,
    db,
    pool,
    // Tests use the CapturingAuditSink (not the real hash-chain sink), so the
    // service pool is never exercised; reuse the single test pool (§1.1).
    servicePool: pool,
    // serviceDb = the same superuser-bound handle (bypasses RLS) for pre-scope reads.
    serviceDb: db,
    encryption: enc,
    pepper: Buffer.from(TEST_PEPPER, 'utf-8'),
    auditSink,
    toneReviewAuditSink,
    stepUpDelivery,
    adminStepUpDelivery,
    // Member-JWT keypair (Story 3.2) — a fresh ephemeral ES256 pair per test app.
    memberJwt: generateEphemeralMemberJwtKeys(),
    turnstile: overrides.turnstile ?? noopTurnstileVerifier,
    webauthn:
      overrides.webauthn ??
      createSimpleWebAuthnProvider({
        rpId: config.webauthn.rpId,
        rpName: config.webauthn.rpName,
        expectedOrigin: config.webauthn.expectedOrigin,
      }),
    // Deploy seam (Story 1.15) — the in-memory fake by default; a spec may pass its
    // own to assert deploy-trigger interactions.
    deployTrigger: overrides.deployTrigger ?? createFakeDeployTrigger(),
    // Member-notification hook (Story 2.4) — capturing fake by default so the publish
    // spec can assert it fired with the right payload (AC3).
    niyamavaliAmendedHook: overrides.niyamavaliAmendedHook ?? niyamavaliHook.hook,
    // Fixed-amount-changed notification hook (Story 7.5) — capturing fake by default so a spec can
    // assert the seam fired with the right coordinates + cadence (standard=queued / emergency=immediate).
    poolFixedAmountChangedHook: overrides.poolFixedAmountChangedHook ?? poolFixedAmountHook.hook,
    // Helpdesk reply notifier (Story 10.4) — a capturing fake by default so a spec can assert the
    // helpdesk_reply emit fired (fixture-level) on a staff reply/resolve.
    helpdeskReplyNotifier: overrides.helpdeskReplyNotifier ?? helpdeskReplyNotifier.notifier,
    // KYC provider registry (Story 3.3a) — the fixture provider by default (the
    // config-absent seam); a spec may override to assert DigiLocker-provider wiring.
    kycProviders:
      overrides.kycProviders ??
      createKycProviderRegistry({
        activeProviderKey: 'fixture',
        builders: { fixture: () => fixtureKycProvider },
      }),
    // Data-export queue producer (Story 3.11) — a capturing fake by default so the request spec can
    // assert the build job was enqueued without a live pg-boss.
    dataExportQueue,
    // Report-export queue producer (Story 10.7) — capturing fake so the reports request spec asserts the
    // REPORT_EXPORT_BUILD job was enqueued (and the compensating-write path on a simulated failure).
    reportExportQueue,
    // Claim-document object store (Story 6.5) — in-memory fake so the upload spec can assert the
    // bytes were `put` (and that a rejected upload never reaches storage).
    claimDocumentStorage,
    // Bank-statement object store + virus-scan seam (Story 9.3) — in-memory store so the reconciliation
    // upload spec asserts the raw bytes were `put`; no-op scanner by default (a spec overrides it with a
    // rejecting scanner to exercise the quarantine path).
    bankStatementStorage,
    // Self-verify screenshot object store (Story 9.7) — in-memory store so the self-verify upload spec
    // asserts the screenshot bytes were `put` (and that a rejected/no-mismatch upload never reaches storage).
    selfVerifyScreenshotStorage,
    // Helpdesk-attachment object store (Story 10.2) — in-memory store so the member ticket-filing spec
    // asserts the uploaded bytes were `put` (and that a rejected upload never reaches storage).
    helpdeskAttachmentStorage,
    statementScanner,
    contributionNotePdfRenderer,
    // Claim OCR + parity queue (Story 6.5) — capturing fake so the upload spec asserts the job was
    // enqueued on a 202, and NOT enqueued on a 409 lifecycle-guard rejection.
    claimOcrParityQueue,
    // Pool-spawn parent-job queue (Story 7.3) — capturing fake so the cycle-freeze commit spec asserts
    // the CYCLE_SPAWN_PARENT job was enqueued post-commit (and not on a rejected commit).
    poolSpawnQueue,
    // News/Blog publish-job queue (Story 10.5) — capturing fake so the news E2E spec asserts `schedule`
    // enqueued a DELAYED job and `publish` an immediate one (the worker owns the actual fan-out).
    newsPublishQueue,
    // IFSC bank-lookup port (Story 6.8) — in-memory stub so the nominee-bank spec resolves fixture
    // IFSCs and asserts a dignified rejection on an unknown one. A spec may seed extra branches.
    bankIfscLookup,
    // Channel secret resolver (Story 5.4) — a deterministic fake by default so the webhook signature
    // round-trip is testable without Secret Manager: a NAME resolves to `test-secret::<name>`. A spec that
    // signs a webhook computes its HMAC over this same value.
    resolveChannelSecret:
      overrides.resolveChannelSecret ?? (async (name: string): Promise<string> => `test-secret::${name}`),
    clock: overrides.clock ?? ((): Date => new Date()),
  };
  return {
    deps,
    pool,
    auditSink,
    toneReviewAuditSink,
    stepUpDelivery,
    adminStepUpDelivery,
    niyamavaliHook,
    poolFixedAmountHook,
    helpdeskReplyNotifier,
    dataExportQueue,
    reportExportQueue,
    claimDocumentStorage,
    bankStatementStorage,
    selfVerifyScreenshotStorage,
    helpdeskAttachmentStorage,
    statementScanner,
    contributionNotePdfRenderer,
    claimOcrParityQueue,
    poolSpawnQueue,
    newsPublishQueue,
    bankIfscLookup,
  };
}

export interface TestApp extends TestDeps {
  app: Awaited<ReturnType<typeof buildServer>>;
}

export async function createTestApp(overrides: TestDepsOverrides = {}): Promise<TestApp> {
  const td = buildTestDeps(overrides);
  const app = await buildServer(td.deps);
  return { ...td, app };
}

export async function teardown(t: TestApp): Promise<void> {
  await t.app.close();
  await t.pool.end().catch(() => undefined);
}

export const TEST_ORIGIN = 'http://localhost:3001';

export interface InjectResult {
  statusCode: number;
  json<T = unknown>(): T;
  body: string;
}

/** A cookie-threading HTTP client over fastify.inject (no supertest). */
export function makeClient(app: TestApp['app']): {
  inject(opts: {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    url: string;
    payload?: object | string;
    headers?: Record<string, string>;
  }): Promise<InjectResult>;
} {
  const jar: Record<string, string> = {};
  return {
    async inject(opts): Promise<InjectResult> {
      const cookieHeader = Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
      const res = await app.inject({
        method: opts.method,
        url: opts.url,
        payload: opts.payload,
        headers: {
          origin: TEST_ORIGIN,
          ...(cookieHeader ? { cookie: cookieHeader } : {}),
          ...opts.headers,
        },
      });
      for (const c of res.cookies) jar[c.name] = c.value;
      return { statusCode: res.statusCode, json: <T,>() => res.json<T>(), body: res.body };
    },
  };
}
