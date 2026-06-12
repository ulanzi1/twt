// `writeAuditEntry` — the tamper-evident audit-log writer primitive (Story 1.10
// Task 6, AC-1/AC-6/AC-8). Single GLOBAL hash chain, serialized by a transaction-
// level advisory lock, written under the BYPASSRLS service role (DD-2/DD-3).
//
// ⚠ This is the ONLY sanctioned path that appends to audit_log_entries. Producers
// (the AuthAuditSink, KmsProvider.auditHook, runAsCrossTenant) call it; they do
// NOT INSERT directly. It takes the SERVICE pool (not the app pool): in
// production that pool's login carries BYPASSRLS so the tail read sees the true
// GLOBAL chain across all tenants; in dev/CI it falls back to the superuser pool
// (DD-3). Tenants never reach this code (twt_app has no INSERT grant).
//
// ── Serialization (DD-2, closes W8-CR1.6) ─────────────────────────────────────
// pg_advisory_xact_lock(AUDIT_CHAIN_LOCK_KEY) is held for the writer transaction,
// so the read-tail → compute-hash → insert sequence is atomic against other
// writers WITHOUT a shared sentinel row (no hot-row contention). prev_audit_hash
// therefore always references the true current tail. The lock auto-releases on
// COMMIT/ROLLBACK.
//
// ⚠ Commits its own transaction (like runAsCrossTenant / withPariwarScope) — it
// CANNOT be rolled back by setupLiveDb's per-test ROLLBACK. Integration tests
// that call it assert against a captured baseline / `>= N`, never `=== N`.
//
// ── Audit-poisoning defense (W6-CR1.6) ────────────────────────────────────────
// `input` is validated by a `.strict()` Zod schema at the boundary BEFORE any DB
// work: bounded lengths, dotted `resource.action`, and `requestPayloadHash`
// constrained to a SHA-256 hex digest (structurally rejects a caller that
// accidentally passes a raw request payload — the PII-leak / poisoning vector).
//
// ── No double-write to events_log (Task 6.3 / D3-1.3 resolution) ──────────────
// An audit line is NOT also written as an events_log row. audit_log_entries is
// the canonical, separately-retained, 6h-mirrored store (§1.5; D7-1.3). Keeping
// them distinct avoids divergent retention + double the write cost. D3-1.3's
// `audit.*` event-type registry leg is resolved by this decision (no entries).

import { randomUUID } from 'node:crypto';

import { desc } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import type pg from 'pg';
import { z } from 'zod';

import type { Db } from '../db.js';
import type { PariwarId } from '../ids/index.js';
import * as schema from '../schema/index.js';
import {
  auditLogEntries,
  type AuditLogEntryRow,
} from '../schema/audit_log_entries.js';
import {
  GENESIS_PREV_HASH,
  computeAuditHash,
  type AuditChainContent,
} from './hash-chain.js';

/**
 * The fixed 64-bit key for the GLOBAL audit-chain advisory lock. Arbitrary but
 * STABLE — it must never change (two writers using different keys would not
 * mutually exclude and could race the tail). Chosen distinct from pg-boss's
 * keyspace (Story 1.12). Within JS safe-integer range so it passes cleanly as an
 * int8 bind parameter.
 */
export const AUDIT_CHAIN_LOCK_KEY = 4_710_010_110;

/**
 * The producer-supplied audit fields. `auditId`, `seq`, `recordedAt`,
 * `prevAuditHash`, and `auditHash` are NOT here — the writer owns them (auditId
 * generated; seq DB-assigned; recordedAt from the DB clock; the two hashes
 * derived). Never put secret material in any field — `requestPayloadHash` is a
 * digest, never the payload.
 */
export interface AuditEntryInput {
  /** Tenant scope; CROSS_TENANT_SENTINEL_UUID for cross-tenant audit rows. */
  pariwarId: string;
  /** Actor UUID, or null for system / SIE actions. */
  actorId: string | null;
  /** The actor's role at action time (human actors), or null. */
  actorRole: string | null;
  /** Dotted resource.action, e.g. `claim.approve`, `kms.decrypt`, `auth.login`. */
  action: string;
  /** What the action targeted (resource id / URI / addressable locator). */
  resourceLocator: string;
  /** SHA-256 hex of the request payload — NEVER the payload itself. */
  requestPayloadHash: string;
  /** HTTP-equivalent response status (100–599). */
  responseStatus: number;
  /** Correlation/trace id, or null/omitted. */
  traceId?: string | null;
}

const auditEntryInputSchema = z
  .object({
    pariwarId: z.string().uuid(),
    actorId: z.string().uuid().nullable(),
    actorRole: z.string().min(1).max(128).nullable(),
    action: z
      .string()
      .min(1)
      .max(128)
      .regex(
        /^[a-z0-9_]+(\.[a-z0-9_]+)+$/,
        'action must be a dotted lowercase resource.action',
      ),
    resourceLocator: z.string().min(1).max(1024),
    requestPayloadHash: z
      .string()
      .regex(/^[0-9a-f]{64}$/i, 'requestPayloadHash must be a SHA-256 hex digest'),
    responseStatus: z.number().int().min(100).max(599),
    traceId: z.string().max(256).nullable().optional(),
  })
  .strict();

/**
 * Append one tamper-evident audit line to the global hash chain and return the
 * inserted row (seq + recordedAt + auditHash populated). Throws on validation
 * failure or DB error — the non-throwing-into-the-request-path guarantee is the
 * CALLER's responsibility (the AuthAuditSink wraps this in try/catch).
 */
export async function writeAuditEntry(
  servicePool: pg.Pool,
  input: AuditEntryInput,
): Promise<AuditLogEntryRow> {
  const validated = auditEntryInputSchema.parse(input);

  const client = await servicePool.connect();
  try {
    await client.query('BEGIN');
    // Serialize all writers on the single global chain (DD-2 / W8-CR1.6).
    await client.query('SELECT pg_advisory_xact_lock($1)', [AUDIT_CHAIN_LOCK_KEY]);

    const db = drizzle(client, { schema }) as unknown as Db;

    // Read the true global tail (service role / BYPASSRLS — across all tenants).
    const tail = await db
      .select({ auditHash: auditLogEntries.auditHash })
      .from(auditLogEntries)
      .orderBy(desc(auditLogEntries.seq))
      .limit(1);
    const prevAuditHash = tail[0]?.auditHash ?? null; // NULL column for genesis
    const prevFeed = prevAuditHash ?? GENESIS_PREV_HASH;

    // Database-authoritative recordedAt (§1.11), fixed for this transaction, and
    // known BEFORE the INSERT so it can participate in the hash. The ms-precision
    // JS Date round-trips byte-stably through timestamptz, so the verifier
    // recomputes the identical ISO string.
    const nowRes = await client.query<{ now: Date }>('SELECT now() AS now');
    const recordedAt = nowRes.rows[0]!.now;

    const auditId = randomUUID();
    const content: AuditChainContent = {
      auditId,
      pariwarId: validated.pariwarId,
      actorId: validated.actorId,
      actorRole: validated.actorRole,
      action: validated.action,
      resourceLocator: validated.resourceLocator,
      requestPayloadHash: validated.requestPayloadHash,
      responseStatus: validated.responseStatus,
      recordedAt,
      traceId: validated.traceId ?? null,
    };
    const auditHash = computeAuditHash(prevFeed, content);

    const [row] = await db
      .insert(auditLogEntries)
      .values({
        auditId,
        pariwarId: validated.pariwarId as PariwarId,
        actorId: validated.actorId,
        actorRole: validated.actorRole,
        action: validated.action,
        resourceLocator: validated.resourceLocator,
        requestPayloadHash: validated.requestPayloadHash,
        responseStatus: validated.responseStatus,
        prevAuditHash,
        auditHash,
        recordedAt,
        traceId: validated.traceId ?? null,
        // `seq` omitted — GENERATED ALWAYS AS IDENTITY assigns it.
      })
      .returning();

    if (!row) {
      throw new Error('writeAuditEntry: INSERT returning produced no row');
    }
    await client.query('COMMIT');
    return row;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}
