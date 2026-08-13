// Reports-&-exports library build + hygiene-vacuum workers — Story 10.7 (Task 5; AC2/AC3/AC4/AC5).
//
// The ADMIN analog of data-export.ts (Story 3.11). Two workers:
//   · REPORT_EXPORT_BUILD  — enqueued by the API on an admin's report request. Assembles the report OFF
//     the request path SCOPE-RESPECTINGLY (re-loads the actor's grants under scope, re-resolves their
//     scope, and `assembleReport` re-authorizes fail-closed + pushes the scope into the SQL) and
//     PII-MASKED (Tier-1 is NEVER decrypted into a v1 report — the worker only envelope-encrypts the
//     FINISHED artifact, like 3.11 encrypts the finished ZIP), serializes (CSV via the reused `toCsv` /
//     canonical JSON), and flips the row → `ready` in one scope-tx. On any failure the row → `failed`.
//   · REPORT_EXPORT_VACUUM — the hygiene cron: zeroes `artifact_ciphertext` for consumed/expired rows +
//     flips past-window rows → `expired`.
//
// ── The scope-respecting build re-validates RBAC at BUILD time (no persisted scope column) ──────────
// The report_exports row carries NO resolved-scope column. The worker re-loads the actor's grants from
// role_grants and re-resolves their scope, so a grant REVOKED between request and build fails the build
// closed (assembleReport's checkPermission denies). This is column-free + more correct than freezing a
// scope snapshot. The tenant isolation is the templates' EXPLICIT `pariwar_id` predicate (the worker
// runs on the BYPASSRLS service pool — RLS is only a backstop here; see the template headers).
//
// ── ALS does not cross pg-boss (@twt/queue §context-propagation) ────────────────────────────────────
// The API enqueues a JobEnvelope carrying `{ requestId, pariwarId, actorId, traceId }`. The envelope
// fields are threaded EXPLICITLY into the scope-tx (pariwarId → the query predicate) + the grant re-load
// (actorId) + the audit line (actorId/traceId) — the 3.11 explicit-threading discipline.

import crypto from 'node:crypto';

import {
  AuthorizationDeniedError,
  audit,
  encryption,
  geoTree,
  ids,
  rbac,
  reports,
  schema,
  withPariwarScope,
} from '@twt/domain';
import { QUEUE_NAMES, type Job, type JobEnvelope, type QueueClient } from '@twt/queue';
import { and, eq, isNotNull, isNull, lte, ne, or, sql } from 'drizzle-orm';
import type pg from 'pg';

/** 24h in milliseconds — the one-time download window (hours, so plain ms is leap-safe). */
const DOWNLOAD_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * How long a `pending` row may sit unbuilt before the vacuum gives up on it (review finding: the
 * request handler's INSERT-then-enqueue is non-atomic, so a crash between committing the `pending` row
 * and calling `enqueueBuild` — or an enqueue whose compensating `markReportExportFailed` ALSO fails —
 * can orphan a row forever; the partial-unique idempotency index then blocks that
 * `(pariwar_id, actor, report_type, params)` tuple from ever being re-requested). One hour comfortably
 * exceeds the Class-B build SLA.
 */
const STALE_PENDING_TIMEOUT_MS = 60 * 60 * 1000;

/**
 * Field-class for the report-export artifact Tier-1 envelope. Matches the `piiColumn(1, 'report_export')`
 * schema annotation + the api download handler's decrypt field-class (duplicated by value — apps cannot
 * depend on apps).
 */
const REPORT_EXPORT_FIELD_CLASS = 'report_export';

/** Default vacuum cadence (IST) — operations policy, overridable via env (mirror DATA_EXPORT_VACUUM). */
export const DEFAULT_REPORT_EXPORT_VACUUM_CRON = '25 * * * *'; // hourly, offset from the other vacuums
export const REPORT_EXPORT_VACUUM_TZ = 'Asia/Kolkata';

export interface ReportExportBuildDeps {
  /** The domain-table pool (BYPASSRLS service login — the withPariwarScope pool + the vacuum scan). */
  readonly pool: pg.Pool;
  /** KMS provider (the artifact envelope). */
  readonly kms: encryption.KmsProvider;
  /** The KEK the artifact envelope wraps its DEK with — MUST match the api download handler's KEK. */
  readonly kekRef: encryption.KmsKeyRef;
  /** The report-template registry. Defaults to the v1 seed set. */
  readonly registry?: reports.ReportRegistry;
  /** Injectable clock (deterministic tests). */
  readonly now?: () => Date;
  /** Failure alarm sink — a console stub by default. */
  readonly onAlarm?: (message: string) => void;
}

/** The build job's payload (wrapped in a JobEnvelope by the API producer). */
export interface ReportExportBuildPayload {
  readonly reportExportId: string;
}

/** SHA-256 hex of a NON-PII context object — the audit `requestPayloadHash` (never the payload). */
function contextHash(context: Record<string, unknown>): string {
  return crypto.createHash('sha256').update(JSON.stringify(context)).digest('hex');
}

/** Load an actor's effective grants (all tenants; resolveActorReportScope filters by pariwarId). */
async function loadActorGrants(
  client: Parameters<Parameters<typeof withPariwarScope>[2]>[0],
  actorId: string,
): Promise<rbac.EffectiveGrant[]> {
  const res = await client.execute<{
    pariwar_id: string;
    role: string;
    scope_dimension: rbac.ScopeDimension;
    scope_value: string | null;
  }>(sql`SELECT pariwar_id, role, scope_dimension, scope_value FROM role_grants WHERE user_id = ${actorId}`);
  return res.rows.map((r) => ({
    pariwarId: r.pariwar_id,
    role: r.role,
    scopeDimension: r.scope_dimension,
    scopeValue: r.scope_value,
  }));
}

/**
 * The build worker body: re-authorize + assemble scope-respectingly → serialize → envelope-encrypt →
 * flip row `ready` + audit. On any failure the row is flipped to `failed` (NON-PII code) in a SEPARATE
 * scope-tx so there is never a phantom `ready`; the worker does NOT re-throw (a permanent `failed` is
 * correct — the admin can re-request).
 */
export async function runReportExportBuild(
  deps: ReportExportBuildDeps,
  envelope: JobEnvelope<ReportExportBuildPayload>,
): Promise<{ status: 'ready' | 'failed' | 'skipped'; reportExportId: string }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const registry = deps.registry ?? reports.createDefaultReportRegistry();
  const { pariwarId, actorId, traceId } = envelope;
  const reportExportId = envelope.payload.reportExportId;

  if (!pariwarId || !actorId) {
    // Cannot scope + re-authorize without both — the enqueueing handler always sets them from the
    // authenticated admin session, so this path is an invariant violation. Row stays pending.
    alarm(`[jobs] report-export-build: missing pariwarId/actorId in envelope for ${reportExportId}`);
    return { status: 'failed', reportExportId };
  }
  const brandedId = ids.reportExportId(reportExportId);
  let skipBuild = false;
  let flipped = false;
  let auditAction = 'report.generated';
  let auditReportType = 'unknown';
  let auditRowCount = 0;
  let auditArtifactBytes = 0;
  let auditActorRole: string | null = null;

  try {
    await withPariwarScope(deps.pool, pariwarId, async (client) => {
      const [row] = await client
        .select()
        .from(schema.reportExports)
        .where(eq(schema.reportExports.reportExportId, brandedId))
        .limit(1);
      if (!row) throw new Error(`report_exports row ${reportExportId} not found in scope`);

      // Bail early if not pending — a pg-boss retry on a terminal-state row must not re-assemble or
      // write a false 'generated' audit (the status guard on the success UPDATE protects the row).
      if (row.status !== 'pending') {
        alarm(`[jobs] report-export-build: ${reportExportId} status=${row.status}, skipping (not pending)`);
        skipBuild = true;
        return;
      }
      auditReportType = row.reportType;

      const template = registry.get(row.reportType);
      if (!template) throw new reports.UnknownReportTypeError(row.reportType);
      auditAction = template.auditAction;

      // Re-load grants + re-resolve scope AT BUILD TIME (a revoked grant fails closed below).
      const grants = await loadActorGrants(client, actorId);
      const resolvedScope = reports.resolveActorReportScope(grants, template.permissionKey, pariwarId);
      if (!resolvedScope) {
        // The actor no longer holds the template's key at any scope — fail closed.
        throw new AuthorizationDeniedError({
          actorId,
          permissionKey: template.permissionKey,
          requiredScope: template.scopeDimension,
          targetLocator: { dimension: template.scopeDimension, value: null },
        });
      }
      // ⭐ Story 10.28 (D4) — the resolved scope carries N nodes, so the match is set MEMBERSHIP and
      // the FIRST hit is recorded. ⚠ [Review fix] `resolveActorReportScope` sorting `values` does NOT
      // order `grants` — `role_grants` is loaded with no `ORDER BY`, so Postgres row order is
      // unspecified. Sort `grants` locally (same key as D1(ii): `scopeValue`, then `role` as a full
      // tiebreak) so "first hit" is actually deterministic, not merely labelled so.
      // ⛔ `global` carries the EMPTY set and its grants carry a null `scopeValue`, so the empty set
      // matches the null-valued grant exactly as the pre-10.28 equality did.
      // ⚠ RESIDUAL, RECORDED NOT SOLVED: different roles at different nodes ⇒ ONE role recorded.
      // Not a regression (today's code is ambiguous with LESS determinism); `deferred-work.md`, no
      // successor. ⛔ No audit column, no array field, no second audit line.
      auditActorRole =
        [...grants]
          .sort((a, b) =>
            (a.scopeValue ?? '') === (b.scopeValue ?? '')
              ? a.role.localeCompare(b.role)
              : (a.scopeValue ?? '').localeCompare(b.scopeValue ?? ''),
          )
          .find((g) => {
            if (g.scopeDimension !== resolvedScope.dimension) return false;
            return resolvedScope.values.length > 0
              ? g.scopeValue != null && resolvedScope.values.includes(g.scopeValue)
              : g.scopeValue == null;
          })?.role ?? null;

      // ⭐ SITE 10 (Story 1.18, AC3) — WIRED. The geo tree is re-loaded HERE, at build time, on the
      // same scoped client and in the same breath as the grants above.
      //
      // ⚠ THE INTENDED CONSEQUENCE, STATED RATHER THAN DISCOVERED LATER: if the tree changes
      // between the request and the build, the build re-resolves against the NEWER tree. That is
      // deliberate and matches the revoked-grant posture two lines up — this whole block exists
      // because build-time authorization is re-validated from current state, not frozen at request
      // time. So an edge REMOVED after the request narrows what the export covers, and an edge
      // ADDED widens it, exactly as a revoked or added grant does. Freezing the tree into the
      // pending row would be a different (and un-asked-for) as-of-request model, and would also
      // reintroduce the resolved-scope columns this design deliberately removed.
      const buildTimeTree = await geoTree.loadGeoTree(client, ids.pariwarId(pariwarId), now);
      const geoResolver = buildTimeTree ? geoTree.createGeoTreeResolver(buildTimeTree) : undefined;

      // assembleReport re-authorizes fail-closed + runs the scope-narrowed query (Decisions 3/6).
      const result = await reports.assembleReport(
        registry,
        row.reportType,
        { actorId, grants, pariwarId, resolvedScope, geoResolver },
        client,
      );

      // Serialize (CSV via the reused toCsv / canonical JSON) then envelope-encrypt the FINISHED bytes
      // (v1 masks — no per-field member decrypt; the artifact is Tier-1-wrapped at rest all the same).
      const format = row.format === 'json' ? 'json' : 'csv';
      const bytes = reports.serializeReport(template, result.rows, format);
      const artifactBytes = Buffer.byteLength(bytes, 'utf8');
      const ct = await encryption.encryptTier1(
        Buffer.from(bytes, 'utf8'),
        { pariwarId, fieldClass: REPORT_EXPORT_FIELD_CLASS },
        deps.kms,
        deps.kekRef,
      );
      const serialized = encryption.serializeEnvelope(ct);

      auditRowCount = result.rowCount;
      auditArtifactBytes = artifactBytes;

      const expiresAt = new Date(now.getTime() + DOWNLOAD_WINDOW_MS);
      const flippedRows = await client
        .update(schema.reportExports)
        .set({
          status: 'ready',
          artifactCiphertext: serialized,
          artifactBytes,
          rowCount: result.rowCount,
          readyAt: now,
          expiresAt,
        })
        .where(
          and(
            eq(schema.reportExports.reportExportId, brandedId),
            eq(schema.reportExports.status, 'pending'),
          ),
        )
        .returning({ reportExportId: schema.reportExports.reportExportId });
      // The `status='pending'` guard can match 0 rows if a concurrent actor moved the row off `pending`
      // AFTER our initial SELECT saw it pending — the vacuum's stale-pending sweep (a build exceeding
      // STALE_PENDING_TIMEOUT_MS), or an overlapping pg-boss redelivery that already flipped it `ready`.
      // We must NOT then write a `report.generated` audit / report `ready` for a row we did not flip.
      flipped = flippedRows.length === 1;
    });

    // A pg-boss retry landing on an already-terminal row is a healthy no-op, NOT a failure — report it
    // as its own status so job-result/observability output never confuses "skipped duplicate delivery"
    // with "the build actually failed" (review finding).
    if (skipBuild) return { status: 'skipped', reportExportId };

    // A concurrent actor moved the row off `pending` between our SELECT and our UPDATE (vacuum stale-sweep
    // or overlapping redelivery) — the guarded UPDATE matched 0 rows, so this delivery did NOT produce the
    // `ready` row. Do NOT write the FR-47 `report.generated` audit line for a generation we did not
    // persist (review finding — the unchecked rowcount previously wrote a false audit + returned `ready`,
    // and duplicated the audit line on concurrent redelivery). Report a healthy no-op.
    if (!flipped) {
      alarm(
        `[jobs] report-export-build: ${reportExportId} was moved off 'pending' concurrently after assembly — no 'ready' audit written, treating as skipped`,
      );
      return { status: 'skipped', reportExportId };
    }

    // Audit AFTER the row flip, ISOLATED from the outer catch (review finding): the row is genuinely
    // `ready` at this point, so an audit-write failure must never be reported as a build failure (which
    // would misroute into `markReportExportFailed` — a no-op on an already-`ready` row — while silently
    // dropping the FR-47 mandatory audit line behind a misleading `{status:'failed'}`).
    try {
      await audit.writeAuditEntry(deps.pool, {
        pariwarId,
        actorId,
        actorRole: auditActorRole,
        action: auditAction,
        resourceLocator: `report_export:${reportExportId}`,
        requestPayloadHash: contextHash({
          report_export_id: reportExportId,
          report_type: auditReportType,
          row_count: auditRowCount,
          artifact_bytes: auditArtifactBytes,
          status: 'ready',
        }),
        responseStatus: 200,
        traceId: traceId ?? null,
      });
    } catch (auditErr: unknown) {
      const ae = auditErr as Error;
      alarm(
        `[jobs] report-export-build: audit write failed for READY export ${reportExportId} — ${ae?.message ?? String(auditErr)}`,
      );
    }

    console.info(
      '[jobs] report-export-build',
      JSON.stringify({ reportExportId, status: 'ready', rowCount: auditRowCount, artifactBytes: auditArtifactBytes }),
    );
    return { status: 'ready', reportExportId };
  } catch (err) {
    const e = err as Error & { code?: string };
    alarm(
      `[jobs] report-export-build: FAILED ${reportExportId} — ${e?.code ?? 'NO_CODE'} ${e?.message ?? String(err)}`,
    );
    // Flip to `failed` in a SEPARATE scope-tx (the build tx rolled back). NON-PII bounded code only;
    // status='pending' guard protects a ready/consumed row on a pg-boss retry.
    await withPariwarScope(deps.pool, pariwarId, async (client) => {
      await reports.markReportExportFailed(client, brandedId, actorId, 'assemble_error');
    }).catch((markErr: unknown) => {
      const me = markErr as Error;
      alarm(`[jobs] report-export-build: could not mark ${reportExportId} failed — ${me?.message ?? String(markErr)}`);
    });
    return { status: 'failed', reportExportId };
  }
}

/**
 * The hygiene vacuum (AC5): zero `artifact_ciphertext` for consumed/expired rows + flip past-window
 * unconsumed rows → `expired`. Cross-tenant — enumerate tenants via `pariwar_passport` (USING(true)
 * SELECT), then process each inside a `withPariwarScope`. Mirrors runDataExportVacuum.
 */
export async function runReportExportVacuum(
  deps: Pick<ReportExportBuildDeps, 'pool' | 'now' | 'onAlarm'>,
): Promise<{ expired: number; zeroed: number; stalePending: number }> {
  const alarm = deps.onAlarm ?? ((m: string): void => console.warn(m));
  const now = deps.now ? deps.now() : new Date();
  const stalePendingCutoff = new Date(now.getTime() - STALE_PENDING_TIMEOUT_MS);

  const { rows: pariwarRows } = await deps.pool.query<{ pariwar_id: string }>(
    'SELECT pariwar_id FROM pariwar_passport',
  );

  let expired = 0;
  let zeroed = 0;
  let stalePending = 0;

  for (const { pariwar_id: scopePariwarId } of pariwarRows) {
    // Isolated per tenant (review finding): one tenant's failure must not abort the sweep for every
    // tenant processed after it.
    try {
      await withPariwarScope(deps.pool, scopePariwarId, async (client) => {
        const expiredRows = await client
          .update(schema.reportExports)
          .set({ status: 'expired' })
          .where(
            and(
              isNotNull(schema.reportExports.expiresAt),
              lte(schema.reportExports.expiresAt, now),
              isNull(schema.reportExports.consumedAt),
              ne(schema.reportExports.status, 'expired'),
            ),
          )
          .returning({ reportExportId: schema.reportExports.reportExportId });
        expired += expiredRows.length;

        const zeroedRows = await client
          .update(schema.reportExports)
          .set({ artifactCiphertext: null })
          .where(
            and(
              isNotNull(schema.reportExports.artifactCiphertext),
              or(
                isNotNull(schema.reportExports.consumedAt),
                and(
                  isNotNull(schema.reportExports.expiresAt),
                  lte(schema.reportExports.expiresAt, now),
                ),
              ),
            ),
          )
          .returning({ reportExportId: schema.reportExports.reportExportId });
        zeroed += zeroedRows.length;

        // A `pending` row past the stale-timeout never got built (an orphaned INSERT-then-enqueue, or an
        // enqueue failure whose compensating `markReportExportFailed` also failed). Flip it to `failed`
        // so the partial-unique idempotency index frees up and the actor can re-request (review finding).
        const staleRows = await client
          .update(schema.reportExports)
          .set({ status: 'failed', failedReason: 'stale_pending_timeout' })
          .where(
            and(
              eq(schema.reportExports.status, 'pending'),
              lte(schema.reportExports.requestedAt, stalePendingCutoff),
            ),
          )
          .returning({ reportExportId: schema.reportExports.reportExportId });
        stalePending += staleRows.length;
      });
    } catch (err: unknown) {
      const e = err as Error;
      alarm(
        `[jobs] report-export-vacuum: tenant ${scopePariwarId} failed — ${e?.message ?? String(err)}`,
      );
    }
  }

  return { expired, zeroed, stalePending };
}

/**
 * Register the build worker + the vacuum cron. Mirrors registerDataExportWorkers (createQueue → work →
 * schedule for the cron; IST; env-overridable cadence).
 */
export async function registerReportExportWorkers(
  boss: QueueClient,
  deps: ReportExportBuildDeps,
  opts: { vacuumCron?: string; vacuumTz?: string } = {},
): Promise<void> {
  const vacuumCron = opts.vacuumCron ?? DEFAULT_REPORT_EXPORT_VACUUM_CRON;
  const vacuumTz = opts.vacuumTz ?? REPORT_EXPORT_VACUUM_TZ;
  // Build the registry ONCE per worker registration (shared across jobs).
  const registry = deps.registry ?? reports.createDefaultReportRegistry();
  const buildDeps: ReportExportBuildDeps = { ...deps, registry };

  await boss.createQueue(QUEUE_NAMES.REPORT_EXPORT_BUILD);
  await boss.work(QUEUE_NAMES.REPORT_EXPORT_BUILD, async (jobs: Job[]) => {
    const results: { status: string; reportExportId: string }[] = [];
    for (const job of jobs) {
      const env = job.data as JobEnvelope<ReportExportBuildPayload>;
      results.push(await runReportExportBuild(buildDeps, env));
    }
    return { processed: results.length, results };
  });

  await boss.createQueue(QUEUE_NAMES.REPORT_EXPORT_VACUUM);
  await boss.work(QUEUE_NAMES.REPORT_EXPORT_VACUUM, async (jobs: Job[]) => {
    const result = await runReportExportVacuum(deps);
    console.info('[jobs] report-export-vacuum', JSON.stringify({ jobs: jobs.length, ...result }));
    return result;
  });
  await boss.schedule(QUEUE_NAMES.REPORT_EXPORT_VACUUM, vacuumCron, {}, { tz: vacuumTz });
}
