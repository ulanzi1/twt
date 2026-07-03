// Audit-on-compute — Story 4.1 (Task 7; AC3.2).
//
// Every COMPUTE (cache-miss) is audit-logged via the Story 1.10 global hash-chain
// writer with the full provenance. A cache-HIT is a REPLAY of an already-audited
// compute — it is NOT re-audited (the global writer is serialized by an advisory lock;
// auditing every read would serialize all reads). This is the audit-on-compute design
// (recommended in Task 7; confirmed proceeding without split-out per BigDev's stated
// preference in the story).
//
// `requestPayloadHash` MUST be a SHA-256 hex DIGEST of the canonical inputs summary —
// NEVER the payload/inputs themselves (audit-poisoning guard, write.ts:23-27,104-106).
// `action` is dotted lowercase (`rule.evaluate`).

import { audit, canonicalJsonStringify, type CanonicalJsonValue, type ids } from '@twt/domain';
import type pg from 'pg';

import { sha256Hex } from './hash.js';

/** The acting principal for the audit line (member self / trustee / SIE=null). */
export interface AuditActor {
  id: string | null;
  role: string | null;
}

export interface AuditComputeInput {
  pariwarId: ids.PariwarId;
  memberId: ids.MemberId;
  /** The PII-FREE provenance inputs summary — hashed to the request-payload digest. */
  inputsSummary: CanonicalJsonValue;
  actor?: AuditActor;
  traceId?: string | null;
  responseStatus?: number;
}

/**
 * Write ONE `rule.evaluate` audit line for a compute. Takes the BYPASSRLS service pool
 * (the audit chain is global). `resourceLocator` addresses the member; the request
 * digest is over the canonical inputs summary only. Throws on writer/validation error —
 * the caller decides whether an audit failure fails the evaluation (it does here: an
 * unaudited compute is not allowed to be returned as if audited).
 */
export async function auditCompute(
  servicePool: pg.Pool,
  input: AuditComputeInput,
): Promise<void> {
  await audit.writeAuditEntry(servicePool, {
    pariwarId: input.pariwarId,
    actorId: input.actor?.id ?? null,
    actorRole: input.actor?.role ?? null,
    action: 'rule.evaluate',
    resourceLocator: `member/${input.memberId}`,
    requestPayloadHash: sha256Hex(canonicalJsonStringify(input.inputsSummary)),
    responseStatus: input.responseStatus ?? 200,
    traceId: input.traceId ?? null,
  });
}
