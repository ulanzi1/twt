// Real audit sinks — Story 1.10 (Task 7.1 + 7.2, AC-7). The FR-47 tamper-evident
// hash-chain backends for the seams Story 1.8/1.9 left injectable:
//   - createAuditLogSink  → the AuthAuditSink (D2-1.9). Also carries the rbac
//     `onAuthorizationDenied` (D2-1.8) + `scope.change` (§2.5) emissions, which
//     already route through `deps.auditSink.emit`, so swapping this sink in
//     `createDeps` lights them up WITHOUT touching auth/rbac/middleware code.
//   - createKmsAuditHook  → KmsProvider.auditHook (D10-1.5): every KEK
//     wrap/unwrap + blind-index HMAC emits an audit line.
//
// Both map their event onto a @twt/domain `AuditEntryInput` and call
// `writeAuditEntry(servicePool, …)` — the advisory-lock global-chain writer.
//
// ⚠ NEVER throw into the request path. `writeAuditEntry` runs on the SERVICE pool
// (separate from the request's app-pool transaction) as fire-and-forget: the
// mapping is wrapped in try/catch and the async write's rejection is caught and
// structured-logged. (Durability note: the audit write is not awaited within the
// request lifecycle because the seam signatures are synchronous `void`; a future
// enhancement could thread an await through the request hooks. The off-site 6h
// mirror + the append-only chain remain the integrity backstop.)
//
// ⚠ NO secret material reaches these sinks by contract (AuthAuditEvent carries
// otp_hash never the code; EncryptionContext carries field-class/row-key never
// the plaintext/DEK). `requestPayloadHash` is the SHA-256 of the canonical-JSON
// of that non-secret context — never a raw payload.

import { createHash } from 'node:crypto';

import { audit, canonicalJsonStringify } from '@twt/domain';
import type pg from 'pg';

import type { AuthAuditEvent, AuthAuditSink } from './audit-sink.js';

const { writeAuditEntry } = audit;
type AuditEntryInput = audit.AuditEntryInput;

/** The nil-UUID sentinel for global / no-specific-tenant audit rows. */
const GLOBAL_AUDIT_PARIWAR = '00000000-0000-0000-0000-000000000000';

function sha256Hex(s: string): string {
  return createHash('sha256').update(s, 'utf8').digest('hex');
}

/**
 * SHA-256 of the canonical-JSON of a non-secret context object.
 * Falls back to sha256Hex('{}') if the context is non-canonicalizable (e.g. contains
 * a Date, Symbol, or BigInt), so the audit line is still written with a known-safe
 * hash rather than being silently dropped.
 */
function hashContext(context: unknown): string {
  try {
    return sha256Hex(canonicalJsonStringify(context ?? {}));
  } catch (err) {
    console.error(
      '[audit-log-sink] context not canonicalizable, using {} hash fallback',
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
    );
    return sha256Hex('{}');
  }
}

/** HTTP-equivalent status for an auth event type. */
function statusForAuthEvent(type: AuthAuditEvent['type']): number {
  if (type === 'authz.denied') return 403;
  if (type === 'login.lockout') return 429;
  if (type.endsWith('.failure')) return 401;
  return 200;
}

/** Map an AuthAuditEvent onto the canonical audit-row input. */
export function authEventToAuditInput(event: AuthAuditEvent): AuditEntryInput {
  return {
    // Admin auth is GLOBAL (pre-scope) — null pariwar maps to the nil sentinel.
    pariwarId: event.pariwarId ?? GLOBAL_AUDIT_PARIWAR,
    actorId: event.actorId,
    actorRole: (() => {
      const v = event.context?.['actorRole'];
      // Guard: empty string fails the writer's min(1) and > 128 chars fails max(128).
      // Both would cause writeAuditEntry to throw and drop the audit line silently.
      if (typeof v !== 'string' || v.length === 0 || v.length > 128) return null;
      return v;
    })(),
    action: event.type, // already a dotted lowercase resource.action
    resourceLocator: `user:${event.actorId ?? 'anonymous'}`,
    requestPayloadHash: hashContext(event.context),
    responseStatus: statusForAuthEvent(event.type),
    traceId: event.traceId ?? null,
  };
}

/**
 * The real AuthAuditSink (Story 1.10). Persists every privileged auth event as a
 * tamper-evident audit line. Never throws into the request path.
 */
export function createAuditLogSink(servicePool: pg.Pool): AuthAuditSink {
  return {
    emit(event: AuthAuditEvent): void {
      try {
        const input = authEventToAuditInput(event);
        void writeAuditEntry(servicePool, input).catch((err: unknown) => {
          console.error(
            '[audit-log-sink] failed to persist auth audit line',
            JSON.stringify({ type: event.type, error: errMessage(err) }),
          );
        });
      } catch (err) {
        // Mapping failure (e.g., a non-canonicalizable context) must not break
        // the request — log and drop.
        console.error(
          '[audit-log-sink] failed to map auth audit event',
          JSON.stringify({ type: event.type, error: errMessage(err) }),
        );
      }
    },
  };
}

type KmsOp = 'encryptDek' | 'decryptDek' | 'computeHmac';
type KmsKeyRef = import('@twt/domain').encryption.KmsKeyRef;
type EncryptionContext = import('@twt/domain').encryption.EncryptionContext;

const KMS_OP_ACTION: Record<KmsOp, string> = {
  encryptDek: 'kms.encrypt_dek',
  decryptDek: 'kms.decrypt_dek',
  computeHmac: 'kms.compute_hmac',
};

/** Map a KMS operation onto the canonical audit-row input (system actor). */
export function kmsEventToAuditInput(
  op: KmsOp,
  kekRef: KmsKeyRef,
  ctx: EncryptionContext,
): AuditEntryInput {
  // Throw early on over-length locators (consistent with runAsCrossTenant P5 invariant):
  // silent truncation would corrupt the hash-chain record of which key was used.
  const resourceLocator = `kms:${kekRef.resourceName}/${ctx.fieldClass}${
    ctx.rowKey ? `/${ctx.rowKey}` : ''
  }`;
  if (resourceLocator.length > 1024) {
    throw new Error(
      `kmsEventToAuditInput: resourceLocator would be ${resourceLocator.length} chars (max 1024) — shorten kekRef.resourceName or ctx.rowKey`,
    );
  }
  return {
    pariwarId: ctx.pariwarId,
    actorId: null, // system-level crypto op
    actorRole: null,
    action: KMS_OP_ACTION[op],
    resourceLocator,
    requestPayloadHash: hashContext({
      op,
      fieldClass: ctx.fieldClass,
      rowKey: ctx.rowKey ?? null,
    }),
    responseStatus: 200, // hook fires only on the success path
    traceId: null,
  };
}

/**
 * Populate KmsProvider.auditHook (D10-1.5). Every KEK wrap/unwrap + blind-index
 * HMAC emits a system-actor audit line. Optional/injected — unit tests of
 * envelope/blind-index construct providers without it, so they stay sink-free.
 * Returns a synchronous, never-throwing hook (fire-and-forget on the service pool).
 */
export function createKmsAuditHook(
  servicePool: pg.Pool,
): NonNullable<import('@twt/domain').encryption.KmsProvider['auditHook']> {
  return (op, kekRef, ctx): void => {
    try {
      const input = kmsEventToAuditInput(op, kekRef, ctx);
      void writeAuditEntry(servicePool, input).catch((err: unknown) => {
        console.error(
          '[kms-audit-hook] failed to persist kms audit line',
          JSON.stringify({ op, error: errMessage(err) }),
        );
      });
    } catch (err) {
      console.error(
        '[kms-audit-hook] failed to map kms audit event',
        JSON.stringify({ op, error: errMessage(err) }),
      );
    }
  };
}

function errMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
