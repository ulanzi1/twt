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

import type { ClaimDocumentStorage } from '@twt/contracts';
import { createDb } from '@twt/domain';
import {
  type BankIfscLookup,
  createInMemoryBankIfscLookup,
  createInMemoryClaimDocumentStorage,
  type InMemoryBankIfscLookup,
  type InMemoryClaimDocumentStorage,
} from '@twt/platform-adapters';
import type pg from 'pg';

import type { JobEnvelope } from '@twt/queue';

import type { AuthAuditEvent, AuthAuditSink } from '../../src/audit/audit-sink.js';
import { loadConfig, type ApiConfig } from '../../src/config.js';
import type {
  AppDeps,
  ClaimOcrParityEnqueuer,
  ClaimOcrParityJobPayload,
  DataExportEnqueuer,
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

export interface TestDepsOverrides {
  auditSink?: AuthAuditSink;
  toneReviewAuditSink?: ToneReviewAuditSink;
  stepUpDelivery?: StepUpOtpDeliveryPort;
  adminStepUpDelivery?: StepUpOtpDeliveryPort;
  turnstile?: TurnstileVerifier;
  webauthn?: WebAuthnProvider;
  deployTrigger?: DeployTrigger;
  niyamavaliAmendedHook?: NiyamavaliAmendedHook;
  kycProviders?: KycProviderRegistry;
  dataExportQueue?: DataExportEnqueuer;
  claimDocumentStorage?: ClaimDocumentStorage;
  claimOcrParityQueue?: ClaimOcrParityEnqueuer;
  poolSpawnQueue?: PoolSpawnTriggerEnqueuer;
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
  dataExportQueue: CapturingDataExportQueue;
  claimDocumentStorage: InMemoryClaimDocumentStorage;
  claimOcrParityQueue: CapturingClaimOcrParityQueue;
  poolSpawnQueue: CapturingPoolSpawnQueue;
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
  const dataExportQueue =
    (overrides.dataExportQueue as CapturingDataExportQueue) ?? new CapturingDataExportQueue();
  const claimDocumentStorage =
    (overrides.claimDocumentStorage as InMemoryClaimDocumentStorage) ??
    createInMemoryClaimDocumentStorage();
  const claimOcrParityQueue =
    (overrides.claimOcrParityQueue as CapturingClaimOcrParityQueue) ??
    new CapturingClaimOcrParityQueue();
  const poolSpawnQueue =
    (overrides.poolSpawnQueue as CapturingPoolSpawnQueue) ?? new CapturingPoolSpawnQueue();
  const bankIfscLookup =
    (overrides.bankIfscLookup as InMemoryBankIfscLookup) ?? createInMemoryBankIfscLookup();

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
    // Claim-document object store (Story 6.5) — in-memory fake so the upload spec can assert the
    // bytes were `put` (and that a rejected upload never reaches storage).
    claimDocumentStorage,
    // Claim OCR + parity queue (Story 6.5) — capturing fake so the upload spec asserts the job was
    // enqueued on a 202, and NOT enqueued on a 409 lifecycle-guard rejection.
    claimOcrParityQueue,
    // Pool-spawn parent-job queue (Story 7.3) — capturing fake so the cycle-freeze commit spec asserts
    // the CYCLE_SPAWN_PARENT job was enqueued post-commit (and not on a rejected commit).
    poolSpawnQueue,
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
    dataExportQueue,
    claimDocumentStorage,
    claimOcrParityQueue,
    poolSpawnQueue,
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
