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

import { createDb } from '@twt/domain';
import type pg from 'pg';

import type { AuthAuditEvent, AuthAuditSink } from '../../src/audit/audit-sink.js';
import { loadConfig, type ApiConfig } from '../../src/config.js';
import type { AppDeps } from '../../src/context.js';
import { buildEncryptionDeps } from '../../src/deps.js';
import type { StepUpOtpDelivery, StepUpOtpDeliveryPort } from '../../src/modules/auth/shared/step-up-delivery.js';
import { noopTurnstileVerifier, type TurnstileVerifier } from '../../src/modules/auth/shared/turnstile.js';
import { createSimpleWebAuthnProvider, type WebAuthnProvider } from '../../src/modules/auth/shared/webauthn.js';
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
  // many inject() calls in a test file (all from 127.0.0.1) and trips 429s.
  RATE_LIMIT_MAX: '100000',
  LOGIN_RATE_MAX: '100000',
  STEP_UP_RATE_MAX: '100000',
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

/** A step-up delivery that records every code so tests can complete the flow. */
export class CapturingStepUpDelivery implements StepUpOtpDeliveryPort {
  public readonly deliveries: StepUpOtpDelivery[] = [];
  public async deliver(delivery: StepUpOtpDelivery): Promise<void> {
    this.deliveries.push(delivery);
  }
  public get last(): StepUpOtpDelivery | undefined {
    return this.deliveries.at(-1);
  }
}

export interface TestDepsOverrides {
  auditSink?: AuthAuditSink;
  stepUpDelivery?: StepUpOtpDeliveryPort;
  turnstile?: TurnstileVerifier;
  webauthn?: WebAuthnProvider;
  clock?: () => Date;
  env?: NodeJS.ProcessEnv;
}

export interface TestDeps {
  deps: AppDeps;
  pool: pg.Pool;
  auditSink: CapturingAuditSink;
  stepUpDelivery: CapturingStepUpDelivery;
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
  const stepUpDelivery =
    (overrides.stepUpDelivery as CapturingStepUpDelivery) ?? new CapturingStepUpDelivery();

  // Build fake-KMS encryption deps with the test pepper (KMS_TEST_MODE defaults to fake).
  const enc = buildEncryptionDeps(TEST_PEPPER);

  const deps: AppDeps = {
    config,
    db,
    pool,
    // Tests use the CapturingAuditSink (not the real hash-chain sink), so the
    // service pool is never exercised; reuse the single test pool (§1.1).
    servicePool: pool,
    encryption: enc,
    pepper: Buffer.from(TEST_PEPPER, 'utf-8'),
    auditSink,
    stepUpDelivery,
    turnstile: overrides.turnstile ?? noopTurnstileVerifier,
    webauthn:
      overrides.webauthn ??
      createSimpleWebAuthnProvider({
        rpId: config.webauthn.rpId,
        rpName: config.webauthn.rpName,
        expectedOrigin: config.webauthn.expectedOrigin,
      }),
    clock: overrides.clock ?? ((): Date => new Date()),
  };
  return { deps, pool, auditSink, stepUpDelivery };
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
    method: 'GET' | 'POST';
    url: string;
    payload?: object;
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
