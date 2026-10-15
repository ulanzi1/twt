// Tier-2 blind index primitive per architecture §2.7 line 1509-1514 + 1526-1529.
//
// HMAC-SHA-256 with field-class namespacing: HMAC(key, "<field-class>:" || value).
// Per-Pariwar context-binding is enforced by the KmsProvider implementation
// (fake-kms-provider prepends "pariwar:<id>|" to the input; cloud-kms-provider
// does the same before MacSign). Substantive per-Pariwar separate KMS HMAC
// keys vs context-binding-on-single-key is Story 1.6 territory (D9-1.5);
// Story 1.5 substrate defaults to context-binding (Option B).

import type { KmsKeyRef, KmsProvider } from './kms-provider.js';

function assertBlindIndexInput(fieldClass: string, context: { pariwarId: string }): void {
  if (fieldClass.length === 0) {
    throw new Error('blindIndex: fieldClass must be non-empty');
  }
  if (fieldClass.includes(':')) {
    throw new Error('blindIndex: fieldClass must not contain ":" (used as namespace separator)');
  }
  if (context.pariwarId.includes('|')) {
    throw new Error('blindIndex: pariwarId must not contain "|" (used as per-Pariwar HMAC separator)');
  }
}

export async function blindIndex(
  fieldClass: string,
  plaintext: string,
  context: { pariwarId: string },
  kms: KmsProvider,
  hmacKeyRef: KmsKeyRef,
): Promise<string> {
  assertBlindIndexInput(fieldClass, context);
  if (plaintext.length === 0) {
    throw new Error('blindIndex: plaintext must be non-empty');
  }
  const input = Buffer.from(`${fieldClass}:${plaintext}`, 'utf-8');
  const mac = await kms.computeHmac(hmacKeyRef, input, context);
  kms.auditHook?.('computeHmac', hmacKeyRef, {
    pariwarId: context.pariwarId,
    fieldClass,
  });
  return Buffer.from(mac).toString('hex');
}

// ── The BATCH path (Story 6.36b; 6.36a SW12 / SF9) ─────────────────────────────────────────────────────────────────────
// Contact matching HMACs up to 1,000 numbers in one request. `blindIndex` audits EVERY call, and the API's hook writes each
// line under the deployment-wide audit-chain lock on the pool login uses — 1,000 serialised writes would stall login. So
// the batch path computes each HMAC exactly as `blindIndex` does, at most `BATCH_HMAC_MAX_IN_FLIGHT` in flight per PROCESS
// (one limiter shared by every batch — login shares the KMS key), and writes ONE audit line for the request carrying
// `{ count, purpose }`. ⚠ This departs from Story 1.5's D10-1.5 (*"an audit-log entry on every … operation"*) for this
// path only — an engineering rule, ⛔ not a ruling — recorded in `2026-10-14-330` (SW12). Run it OUTSIDE any transaction.

/** At most this many batch HMACs in flight per process (6.36a SW12). */
export const BATCH_HMAC_MAX_IN_FLIGHT = 8;

export interface ConcurrencyLimiter {
  run<T>(task: () => Promise<T>): Promise<T>;
}

/**
 * A FIFO limiter: at most `max` tasks run at once; a settled task (either way) frees its slot. ⭐ A freed slot passes
 * STRAIGHT to the oldest waiter (`active` unchanged) — decrementing first let a caller arriving before that waiter
 * resumed take the same slot, two tasks in one (review 2026-10-15 R1).
 */
export function createConcurrencyLimiter(max: number): ConcurrencyLimiter {
  if (!Number.isInteger(max) || max < 1) throw new Error('createConcurrencyLimiter: max must be a positive integer');
  let active = 0;
  const waiting: (() => void)[] = [];
  const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
  };
  return {
    async run<T>(task: () => Promise<T>): Promise<T> {
      if (active < max) active += 1;
      else await new Promise<void>((resolve) => waiting.push(resolve)); // woken HOLDING the released slot
      try {
        return await task();
      } finally {
        release();
      }
    },
  };
}

/** The process-wide limiter every batch shares. */
const PROCESS_BATCH_HMAC_LIMITER = createConcurrencyLimiter(BATCH_HMAC_MAX_IN_FLIGHT);

/** What the batch's ONE audit line records: the CALLER's Pariwar and the purpose (a plain key — it rides the row key). */
export interface BatchHmacAudit {
  readonly pariwarId: string;
  readonly purpose: string;
}

const AUDIT_PURPOSE = /^[a-z][a-z0-9_]{0,63}$/;

/**
 * `blindIndex` over many values — the same HMAC input per value, in order — with bounded KMS concurrency and ONE audit
 * line (`computeHmac`, `{ pariwarId: audit.pariwarId, fieldClass, count, purpose }`) once EVERY value has succeeded. An
 * empty batch calls ⛔ nothing. ⛔ Never call it inside a transaction or under a lock.
 */
export async function blindIndexMany(
  fieldClass: string,
  plaintexts: readonly string[],
  context: { pariwarId: string },
  kms: KmsProvider,
  hmacKeyRef: KmsKeyRef,
  audit: BatchHmacAudit,
  limiter: ConcurrencyLimiter = PROCESS_BATCH_HMAC_LIMITER,
): Promise<string[]> {
  assertBlindIndexInput(fieldClass, context);
  if (!AUDIT_PURPOSE.test(audit.purpose)) {
    throw new Error('blindIndexMany: audit purpose must be a plain lower-case key');
  }
  if (plaintexts.some((p) => p.length === 0)) {
    throw new Error('blindIndex: plaintext must be non-empty');
  }
  if (plaintexts.length === 0) return [];
  const out = await Promise.all(
    plaintexts.map((plaintext) =>
      limiter.run(async () => {
        const mac = await kms.computeHmac(hmacKeyRef, Buffer.from(`${fieldClass}:${plaintext}`, 'utf-8'), context);
        return Buffer.from(mac).toString('hex');
      }),
    ),
  );
  kms.auditHook?.('computeHmac', hmacKeyRef, {
    pariwarId: audit.pariwarId,
    fieldClass,
    count: plaintexts.length,
    purpose: audit.purpose,
  });
  return out;
}
