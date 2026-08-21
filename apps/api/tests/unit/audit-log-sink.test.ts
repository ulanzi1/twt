// Unit tests for the Story 1.10 audit-sink mappings (Task 7.1 / 7.2, AC-7).
//
// The bug-prone surface is the AuthAuditEvent / KMS-op → AuditEntryInput mapping
// (the apps/api integration suite uses the CapturingAuditSink, so it never
// exercises the real hash-chain sink). These pure mappers must produce input the
// @twt/domain writeAuditEntry Zod boundary accepts, and the sink must NEVER throw
// into the request path.

import type pg from 'pg';
import { describe, expect, it } from 'vitest';

import type { AuthAuditEvent } from '../../src/audit/audit-sink.js';
import {
  authEventToAuditInput,
  createAuditLogSink,
  createKmsAuditHook,
  kmsEventToAuditInput,
} from '../../src/audit/audit-log-sink.js';

const NIL_UUID = '00000000-0000-0000-0000-000000000000';
const A_UUID = '11111111-1111-1111-1111-111111111111';
const ACTOR = '22222222-2222-2222-2222-222222222222';
const HEX64 = /^[0-9a-f]{64}$/;
const DOTTED_ACTION = /^[a-z0-9_]+(\.[a-z0-9_]+)+$/;

function evt(over: Partial<AuthAuditEvent> = {}): AuthAuditEvent {
  return {
    type: 'login.success',
    actorId: ACTOR,
    at: new Date('2026-06-12T00:00:00.000Z'),
    ...over,
  };
}

/** A pg.Pool that always fails to connect — for fire-and-forget never-throws tests. */
const failingPool = {
  connect: async (): Promise<never> => {
    throw new Error('no db (unit test)');
  },
} as unknown as pg.Pool;

describe('authEventToAuditInput', () => {
  it('maps action = event.type and passes the writeAuditEntry contract shape', () => {
    const input = authEventToAuditInput(evt());
    expect(input.action).toBe('login.success');
    expect(input.action).toMatch(DOTTED_ACTION);
    expect(input.requestPayloadHash).toMatch(HEX64);
    expect(input.responseStatus).toBe(200);
    expect(input.actorId).toBe(ACTOR);
    expect(input.resourceLocator.length).toBeGreaterThan(0);
  });

  it('null pariwarId falls back to the nil sentinel; set pariwarId is preserved', () => {
    expect(authEventToAuditInput(evt({ pariwarId: null })).pariwarId).toBe(NIL_UUID);
    expect(authEventToAuditInput(evt({ pariwarId: A_UUID })).pariwarId).toBe(A_UUID);
  });

  it('maps response status by outcome (success/denied/lockout/failure)', () => {
    expect(authEventToAuditInput(evt({ type: 'login.success' })).responseStatus).toBe(200);
    expect(authEventToAuditInput(evt({ type: 'authz.denied' })).responseStatus).toBe(403);
    expect(authEventToAuditInput(evt({ type: 'login.lockout' })).responseStatus).toBe(429);
    expect(authEventToAuditInput(evt({ type: 'login.failure' })).responseStatus).toBe(401);
    expect(authEventToAuditInput(evt({ type: 'passkey.auth.failure' })).responseStatus).toBe(401);
  });

  it('every AuthAuditEventType maps to a dotted action the writer accepts', () => {
    const types: AuthAuditEvent['type'][] = [
      'login.success', 'login.failure', 'login.lockout', 'login.logout',
      'passkey.enroll', 'passkey.auth', 'passkey.auth.failure',
      'recovery_code.consume', 'recovery_code.failure',
      'password_reset.request', 'password_reset.consume',
      'step_up.send', 'step_up.consume', 'step_up.failure',
      'scope.change', 'authz.denied',
    ];
    for (const type of types) {
      expect(authEventToAuditInput(evt({ type })).action).toMatch(DOTTED_ACTION);
    }
  });

  it('hashes the context (never stores it) and threads traceId', () => {
    const input = authEventToAuditInput(evt({ traceId: 'trace-xyz', context: { otp_hash: 'abc' } }));
    expect(input.traceId).toBe('trace-xyz');
    expect(input.requestPayloadHash).toMatch(HEX64);
  });
});

describe('kmsEventToAuditInput', () => {
  const kekRef = { resourceName: 'fake:admin-kek' };
  const ctx = { pariwarId: A_UUID, fieldClass: 'admin_email', rowKey: 'r1' };

  it('maps op → snake_case dotted kms.* action (writer-acceptable)', () => {
    expect(kmsEventToAuditInput('encryptDek', kekRef, ctx).action).toBe('kms.encrypt_dek');
    expect(kmsEventToAuditInput('decryptDek', kekRef, ctx).action).toBe('kms.decrypt_dek');
    expect(kmsEventToAuditInput('computeHmac', kekRef, ctx).action).toBe('kms.compute_hmac');
    expect(kmsEventToAuditInput('encryptDek', kekRef, ctx).action).toMatch(DOTTED_ACTION);
  });

  it('is a system actor (null), hashes context, encodes the key+field locator', () => {
    const input = kmsEventToAuditInput('decryptDek', kekRef, ctx);
    expect(input.actorId).toBeNull();
    expect(input.pariwarId).toBe(A_UUID);
    expect(input.requestPayloadHash).toMatch(HEX64);
    expect(input.responseStatus).toBe(200);
    expect(input.resourceLocator).toContain('fake:admin-kek');
    expect(input.resourceLocator).toContain('admin_email');
  });

  it('omits rowKey segment when absent — no stray /undefined or /null in locator', () => {
    const ctxNoRowKey = { pariwarId: A_UUID, fieldClass: 'admin_email' };
    const input = kmsEventToAuditInput('computeHmac', kekRef, ctxNoRowKey);
    expect(input.resourceLocator).toBe('kms:fake:admin-kek/admin_email');
    expect(input.resourceLocator).not.toContain('undefined');
    expect(input.resourceLocator).not.toContain('null');
  });
});

describe('createAuditLogSink / createKmsAuditHook (never throw into the request path)', () => {
  it('sink.emit does not throw even when the write fails', () => {
    const sink = createAuditLogSink(failingPool);
    expect(() => sink.emit(evt())).not.toThrow();
  });

  it('sink.emit does not throw when the context is not canonical-JSON-representable', () => {
    const sink = createAuditLogSink(failingPool);
    // A Date nested in context throws inside canonicalJsonStringify (recursive Date guard);
    // hashContext catches it and falls back to sha256Hex('{}') so the audit line is still
    // attempted (and then fails at the DB write, which the .catch handler absorbs).
    expect(() => sink.emit(evt({ context: { when: new Date() } }))).not.toThrow();
  });

  it('kms hook does not throw even when the write fails', () => {
    const hook = createKmsAuditHook(failingPool);
    expect(() => hook('computeHmac', { resourceName: 'fake:hmac' }, { pariwarId: A_UUID, fieldClass: 'admin_email' })).not.toThrow();
  });
});

// ═════════════════════════════════════════════════════════════════════════════════════════════
// ⭐ THE `resourceLocator` OVERRIDE AND ITS SHAPE GUARD — Story 11a.3, second review round.
// ═════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ WHY THIS BLOCK EXISTS. The override + `RESOURCE_LOCATOR_PATTERN` were added in the FIRST review
// round to close a finding that read *"`resourceLocator` enforced only by a comment"* — and shipped
// with ⛔ ZERO tests, so the replacement enforcement was itself enforced only by reading the code.
// Deleting the regex, or widening it to accept `/` or uppercase, broke nothing.
//
// ⭐ This is a deliberate widening of a documented PII-poisoning defence (W6-CR1.6): the locator
// column is one of the two fields that survive an abuse line (Trap 8), and it is now caller-settable.
// The guard is what keeps a name, an email, a phone number or a free-text payload out of it.
describe('authEventToAuditInput — the resourceLocator override (Story 11a.3)', () => {
  it('DEFAULTS to the actor locator when no override is given', () => {
    expect(authEventToAuditInput(evt()).resourceLocator).toBe(`user:${ACTOR}`);
    expect(authEventToAuditInput(evt({ actorId: null })).resourceLocator).toBe('user:anonymous');
  });

  it('HONOURS a well-shaped override', () => {
    const locator = 'directory:high_volume_lookups:p3:l25';
    expect(authEventToAuditInput(evt({ resourceLocator: locator })).resourceLocator).toBe(locator);
  });

  it('⛔ REJECTS anything shaped like PII, falling back to the safe default', () => {
    // ⛔ Each is a DIFFERENT arrival route for the failure this guard exists to prevent.
    const hostile = [
      'Rajesh Kumar Sharma', // a human name — spaces and capitals
      'rajesh@example.com', // an email — `@`
      '+91 98765 43210', // a phone number — `+` and spaces
      'note: member said his wife called', // free text
      'UPPERCASE:locator', // capitals alone are enough
      'directory:rule:p1/l25', // a slash is not in the allowlist
      '', // empty
      ':leading-colon', // must start alphanumeric
      `x${'y'.repeat(200)}`, // over the length ceiling
    ];
    for (const bad of hostile) {
      expect(authEventToAuditInput(evt({ resourceLocator: bad })).resourceLocator).toBe(
        `user:${ACTOR}`,
      );
    }
  });

  it('⛔ NEGATIVE CONTROL — the guard is not simply rejecting everything', () => {
    // ⚠ Without this, a guard hard-coded to `return false` would pass every assertion above.
    for (const good of ['directory:deep_crawl:p1:l25', 'a', 'user:anonymous', 'x.y-z_1:2']) {
      expect(authEventToAuditInput(evt({ resourceLocator: good })).resourceLocator).toBe(good);
    }
  });

  it('⛔ existing emitters are BYTE-IDENTICAL — the widening changed nothing for them', () => {
    // The override is opt-in; an event that does not set it must produce exactly what it did before.
    const before = authEventToAuditInput(evt({ type: 'rate_limit.exceeded', actorId: null }));
    expect(before.resourceLocator).toBe('user:anonymous');
    expect(before.responseStatus).toBe(429);
  });
});
