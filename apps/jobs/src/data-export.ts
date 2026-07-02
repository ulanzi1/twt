// Member data-export build + hygiene-vacuum workers — Story 3.11 (Task 4; AC1/AC2/AC4/AC5).
//
// The FIRST cross-app job that mutates member-scoped tenant data from `apps/jobs` under a rehydrated
// pariwar scope, AND the FIRST `apps/jobs` consumer of KMS (this app had ZERO crypto before). Two
// workers:
//   · DATA_EXPORT_BUILD  — enqueued by the API on a member request. Assembles the seven-file
//     human-readable ZIP off the request path (via the domain `assembleMemberExport` core, which
//     DECRYPTS Tier-1 PII — the member is the legitimate audience), contract-validates each section,
//     zips (jszip → Buffer), ENVELOPE-ENCRYPTS the whole ZIP, and flips the row → `ready` in one
//     scope-tx. On any failure: the row → `failed` (NON-PII code); never a phantom `ready`.
//   · DATA_EXPORT_VACUUM — the PII-hygiene cron (mirror IDEMPOTENCY_VACUUM): zeroes
//     `artifact_ciphertext` for consumed/expired rows + flips past-window rows → `expired`.
//
// ── Thin runtime (mirror member-renewal-lifecycle.ts) ───────────────────────────────────────────────
// The DB-read + decrypt logic lives in @twt/domain (`assembleMemberExport`); this file is glue: it
// rehydrates the envelope, opens the scope-tx, zips + encrypts, writes the row + audit line.
//
// ── ALS does not cross pg-boss (@twt/queue §context-propagation) ────────────────────────────────────
// The API enqueues a JobEnvelope carrying `{ requestId, pariwarId, actorId, traceId }`. ALS is NOT
// rehydrated as a global here (apps/jobs cannot import apps/api's request-context ALS); the envelope
// fields are threaded EXPLICITLY into the scope-tx (pariwarId → RLS) + the audit line (actorId/traceId)
// — the same explicit-threading discipline the renewal tick uses.

import crypto from 'node:crypto';

import * as contracts from '@twt/contracts';
import { audit, dataExport, encryption, ids, schema, withPariwarScope } from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import { and, eq, isNotNull, isNull, lte, ne, or } from 'drizzle-orm';
import JSZip from 'jszip';
import type pg from 'pg';

/** 24h in milliseconds — the one-time download window (hours, so plain ms is leap-safe; 3.10 P1). */
const DOWNLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Field-class for the data-export artifact Tier-1 envelope. Duplicated BY VALUE from
 * apps/api/src/context.ts:MEMBER_DATA_EXPORT_FIELD_CLASS (apps cannot depend on apps) — the download
 * handler decrypts with the same literal. Matches the `piiColumn(1, 'data_export')` schema annotation.
 */
const MEMBER_DATA_EXPORT_FIELD_CLASS = 'data_export';

/** Default vacuum cadence (IST) — operations policy, overridable via env (like IDEMPOTENCY_VACUUM_CRON). */
export const DEFAULT_DATA_EXPORT_VACUUM_CRON = '15 * * * *'; // hourly, offset 15m from the idempotency vacuum
export const DATA_EXPORT_VACUUM_TZ = 'Asia/Kolkata';

export interface DataExportBuildDeps {
  /** The domain-table pool. Jobs connect as twt_app (RLS-enforced); the vacuum enumerates tenants via
   *  pariwar_passport (USING true SELECT) + issues per-tenant withPariwarScope updates. */
  readonly pool: pg.Pool;
  /** KMS provider (the FIRST apps/jobs KMS consumer). */
  readonly kms: encryption.KmsProvider;
  /** The KEK the artifact envelope wraps its DEK with — MUST match the api download handler's KEK. */
  readonly kekRef: encryption.KmsKeyRef;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** The build job's payload (wrapped in a JobEnvelope by the API producer). */
export interface DataExportBuildPayload {
  readonly exportId: string;
}

/** The section-shape validators, keyed by filename — the job validates the assembled output before zipping. */
const SECTION_SCHEMAS: Record<string, { parse: (v: unknown) => unknown }> = {
  'profile.json': contracts.ProfileSection,
  'consent_records.json': contracts.ConsentRecordsSection,
  'payment_receipts.json': contracts.PaymentReceiptsSection,
  'event_stream.json': contracts.EventStreamSection,
  'audit_history.json': contracts.AuditHistorySection,
  'contribution_history.json': contracts.ContributionHistorySection,
  'claim_history.json': contracts.ClaimHistorySection,
  'manifest.json': contracts.ManifestSection,
};

/** SHA-256 hex of a NON-PII context object — the audit `requestPayloadHash` (never the payload). */
function contextHash(context: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

/**
 * The build worker body: assemble → validate → zip → envelope-encrypt → flip row `ready` + audit.
 * Testable in isolation (drive it with a controlled `now`, a fixture pool, a fake KMS). On any failure
 * the row is flipped to `failed` (NON-PII code) in a SEPARATE scope-tx so there is never a phantom
 * `ready`; the worker does NOT re-throw (a permanent `failed` is correct — the member can re-request).
 */
export async function runDataExportBuild(
  deps: DataExportBuildDeps,
  envelope: JobEnvelope<DataExportBuildPayload>,
): Promise<{ status: 'ready' | 'failed'; exportId: string }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const { pariwarId, actorId, traceId } = envelope;
  const exportId = envelope.payload.exportId;

  if (!pariwarId) {
    // Cannot scope a DB update without pariwarId — twt_app is RLS-enforced and requires app.pariwar_id.
    // The enqueueing handler always sets pariwarId from the authenticated session so this path is an
    // invariant violation. Row stays pending (tracked: deferred-work.md CR-C-W7).
    alarm(`[jobs] data-export-build: missing pariwarId in envelope for export ${exportId}`);
    return { status: 'failed', exportId };
  }
  const brandedExportId = ids.dataExportId(exportId);
  // Captured from the DB row read so the failure path and audit hash use the authoritative memberId.
  let resolvedMemberId: (typeof schema.dataExports.$inferSelect)['memberId'] | undefined;
  // Set when the row is not pending (terminal state) — skips PII processing and audit on pg-boss retries.
  let skipBuild = false;

  try {
    let artifactBytes = 0;
    await withPariwarScope(deps.pool, pariwarId, async (client) => {
      const [row] = await client
        .select()
        .from(schema.dataExports)
        .where(eq(schema.dataExports.exportId, brandedExportId))
        .limit(1);
      if (!row) {
        throw new Error(`data_exports row ${exportId} not found in scope`);
      }
      resolvedMemberId = row.memberId;

      // Bail early if not pending — a pg-boss retry on a terminal-state row must not re-decrypt PII
      // or write a false 'generated' audit (the status guard on the success UPDATE prevents clobbering
      // the row, but not the audit). Return cleanly so the scope-tx commits the empty transaction.
      if (row.status !== 'pending') {
        alarm(`[jobs] data-export-build: export ${exportId} status=${row.status}, skipping (not pending)`);
        skipBuild = true;
        return;
      }

      const sections = await dataExport.assembleMemberExport(
        client,
        { kms: deps.kms, kekRef: deps.kekRef },
        { exportId, memberId: row.memberId, pariwarId: row.pariwarId, now },
      );

      // Contract-validate each section BEFORE zipping (catch drift — a shape change fails the build).
      for (const [name, section] of Object.entries(sections)) {
        const schemaFor = SECTION_SCHEMAS[name];
        if (!schemaFor) throw new Error(`no section schema registered for ${name}`);
        schemaFor.parse(section);
      }

      // Build the ZIP (human-readable — pretty-printed JSON per file).
      const zip = new JSZip();
      for (const [name, section] of Object.entries(sections)) {
        zip.file(name, JSON.stringify(section, null, 2));
      }
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      artifactBytes = zipBuffer.length;

      // Envelope-encrypt the WHOLE ZIP — the plaintext never sits at rest. serializeEnvelope is
      // MANDATORY: storing the raw Tier1Ciphertext object would write `[object Object]`.
      const ct = await encryption.encryptTier1(
        zipBuffer,
        { pariwarId: row.pariwarId, fieldClass: MEMBER_DATA_EXPORT_FIELD_CLASS },
        deps.kms,
        deps.kekRef,
      );
      const serialized = encryption.serializeEnvelope(ct);

      const expiresAt = new Date(now.getTime() + DOWNLOAD_WINDOW_MS);
      await client
        .update(schema.dataExports)
        .set({
          status: 'ready',
          artifactCiphertext: serialized,
          artifactBytes,
          readyAt: now,
          expiresAt,
        })
        .where(
          and(
            eq(schema.dataExports.exportId, brandedExportId),
            eq(schema.dataExports.status, 'pending'),
          ),
        );
    });

    if (skipBuild) {
      return { status: 'failed', exportId };
    }

    // Audit AFTER the row flip succeeds. NON-PII context only (R1) — export_id, member_id, byte size,
    // status. The audit pool bypasses RLS (service login) so it reads the true global chain tail.
    await audit.writeAuditEntry(deps.pool, {
      pariwarId,
      actorId: actorId ?? null,
      actorRole: 'member',
      action: 'member_data_export.generated',
      resourceLocator: `data_export:${exportId}`,
      requestPayloadHash: contextHash({
        export_id: exportId,
        member_id: resolvedMemberId ?? actorId,
        status: 'ready',
        artifact_bytes: artifactBytes,
      }),
      responseStatus: 200,
      traceId: traceId ?? null,
    });

    console.info(
      '[jobs] data-export-build',
      JSON.stringify({ exportId, status: 'ready', artifactBytes }),
    );
    return { status: 'ready', exportId };
  } catch (err) {
    const e = err as Error & { code?: string };
    alarm(
      `[jobs] data-export-build: FAILED export ${exportId} — ${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
    );
    // Flip to `failed` in a SEPARATE scope-tx (the build tx rolled back). NON-PII bounded code only.
    // Delegates to markExportFailed (which guards AND status='pending') when memberId was captured;
    // falls back to exportId + status guard only when the error occurred before the row select.
    // Both paths protect against clobbering a ready or consumed row on a pg-boss retry.
    await withPariwarScope(deps.pool, pariwarId, async (client) => {
      if (resolvedMemberId !== undefined) {
        await dataExport.markExportFailed(client, brandedExportId, resolvedMemberId, 'assemble_error');
      } else {
        await client
          .update(schema.dataExports)
          .set({ status: 'failed', failedReason: 'assemble_error' })
          .where(
            and(
              eq(schema.dataExports.exportId, brandedExportId),
              eq(schema.dataExports.status, 'pending'),
            ),
          );
      }
    }).catch((markErr: unknown) => {
      const me = markErr as Error;
      alarm(`[jobs] data-export-build: could not mark ${exportId} failed — ${me?.message ?? String(markErr)}`);
    });
    return { status: 'failed', exportId };
  }
}

/**
 * The hygiene vacuum (AC5): zero `artifact_ciphertext` for consumed/expired rows (drop the PII payload,
 * keep the metadata row for audit) + flip past-window unconsumed rows → `expired`. Cross-tenant — the
 * jobs process connects as `twt_app` (RLS-enforced), so unscoped pool queries against `data_exports`
 * would touch zero rows under FORCE ROW LEVEL SECURITY. Instead: enumerate tenants via `pariwar_passport`
 * (its SELECT policy is USING(true) — cross-tenant readable without a scope context), then process each
 * tenant inside a `withPariwarScope` so the data_exports UPDATEs are properly RLS-gated.
 */
export async function runDataExportVacuum(
  deps: Pick<DataExportBuildDeps, 'pool' | 'now'>,
): Promise<{ expired: number; zeroed: number }> {
  const now = deps.now ? deps.now() : new Date();

  // Enumerate all tenants — pariwar_passport SELECT is USING(true), so no app.pariwar_id needed.
  const { rows: pariwarRows } = await deps.pool.query<{ pariwar_id: string }>(
    'SELECT pariwar_id FROM pariwar_passport',
  );

  let expired = 0;
  let zeroed = 0;

  for (const { pariwar_id: scopePariwarId } of pariwarRows) {
    await withPariwarScope(deps.pool, scopePariwarId, async (client) => {
      // Flip past-window, unconsumed, not-yet-expired rows → `expired` (status hygiene).
      const expiredRows = await client
        .update(schema.dataExports)
        .set({ status: 'expired' })
        .where(
          and(
            isNotNull(schema.dataExports.expiresAt),
            lte(schema.dataExports.expiresAt, now),
            isNull(schema.dataExports.consumedAt),
            ne(schema.dataExports.status, 'expired'),
          ),
        )
        .returning({ exportId: schema.dataExports.exportId });
      expired += expiredRows.length;

      // Zero the artifact for consumed OR past-window rows still holding ciphertext (PII sweep).
      const zeroedRows = await client
        .update(schema.dataExports)
        .set({ artifactCiphertext: null })
        .where(
          and(
            isNotNull(schema.dataExports.artifactCiphertext),
            or(
              isNotNull(schema.dataExports.consumedAt),
              and(
                isNotNull(schema.dataExports.expiresAt),
                lte(schema.dataExports.expiresAt, now),
              ),
            ),
          ),
        )
        .returning({ exportId: schema.dataExports.exportId });
      zeroed += zeroedRows.length;
    });
  }

  return { expired, zeroed };
}

/**
 * Register the build worker + the vacuum cron. Mirrors registerMemberRenewalLifecycleCron
 * (createQueue → work → schedule for the cron; IST; env-overridable cadence).
 */
export async function registerDataExportWorkers(
  boss: QueueClient,
  deps: DataExportBuildDeps,
  opts: { vacuumCron?: string; vacuumTz?: string } = {},
): Promise<void> {
  const vacuumCron = opts.vacuumCron ?? DEFAULT_DATA_EXPORT_VACUUM_CRON;
  const vacuumTz = opts.vacuumTz ?? DATA_EXPORT_VACUUM_TZ;

  // Build queue + worker (Class B — request-triggered). v12: handler receives an ARRAY of jobs.
  await boss.createQueue(QUEUE_NAMES.DATA_EXPORT_BUILD);
  await boss.work(QUEUE_NAMES.DATA_EXPORT_BUILD, async (jobs: Job[]) => {
    const results: { status: string; exportId: string }[] = [];
    for (const job of jobs) {
      const envelope = job.data as JobEnvelope<DataExportBuildPayload>;
      results.push(await runDataExportBuild(deps, envelope));
    }
    return { processed: results.length, results };
  });

  // Vacuum queue + worker + cron (Class C — background hygiene).
  await boss.createQueue(QUEUE_NAMES.DATA_EXPORT_VACUUM);
  await boss.work(QUEUE_NAMES.DATA_EXPORT_VACUUM, async (jobs: Job[]) => {
    const result = await runDataExportVacuum(deps);
    console.info('[jobs] data-export-vacuum', JSON.stringify({ jobs: jobs.length, ...result }));
    return result;
  });
  await boss.schedule(QUEUE_NAMES.DATA_EXPORT_VACUUM, vacuumCron, {}, { tz: vacuumTz });
}
