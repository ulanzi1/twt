// The QUESTIONNAIRE CHAIN's handlers — Story 6.33 (`2026-10-10-304` Q7 / Q8; `2026-10-30-421` QE6 / QE7 / QE11 / QE16 /
// QE17; the route table in `routes.ts`).
//
// · TENANT (the Pariwar's scope transaction): list, detail, propose, approve, return, withdraw.
// · GLOBAL (`deps.serviceDb`, `requireGlobalPermission('questionnaire.publish')`; step-up on every act): list, detail,
//   pariwars-keeping-own, make-live (one Pariwar or ALL), direct, revert.
// ⭐ QE17's composed order for EVERY write (copied from `claims.peer-request.handlers.ts` `helplineSave`): `releaseHookTx` →
// `idempotencyStore.claim` → the write's transaction → `audit.withCompensatingAudit` (the INTENT line first, the mutation on
// that transaction, a compensating line on failure) → COMMIT → `recordResult(response)` → `release` if anything failed. A
// REPLAY returns the RECORDED response (propose / direct create a version whose id a replay could ⛔ re-derive — the
// feature-flags shape). ⚠ A commit failure after `mutate` returned is ⛔ compensated — the house's known gap.
// Audit actions `admin_questionnaire.{proposed,approved,returned,withdrawn,made_live,pariwar_reverted}` (free strings);
// `ADMIN_GLOBAL_NAMESPACE` on the global path; ⛔ `events_log` (a config surface — G12). Attribution = `getDisplayName`.
// ⛔ Question text in an audit line, a log or an error: ids and counts only.

import { createHash } from 'node:crypto';

import type {
  QuestionnaireApproveRequest,
  QuestionnaireDirectRequest,
  QuestionnaireDraftPage,
  QuestionnaireInForce,
  QuestionnaireMakeLiveRequest,
  QuestionnairePariwarsKeepingOwnResponse,
  QuestionnaireProposeRequest,
  QuestionnaireQuestionView,
  QuestionnaireReturnRequest,
  QuestionnaireRevertRequest,
  QuestionnaireStepResponse,
  QuestionnaireStepView,
  QuestionnaireVersionDetailResponse,
  QuestionnaireVersionListResponse,
  QuestionnaireVersionSummary,
} from '@twt/contracts';
import { audit, canonicalJsonStringify, idempotency, questionnaireVersions, questionnaires, schema, type Db } from '@twt/domain';
import { inArray } from 'drizzle-orm';
import type { FastifyRequest } from 'fastify';

import { ADMIN_GLOBAL_NAMESPACE, type AppDeps } from '../../context.js';
import { AdminDisplayNameMissingError, ApiError, BadRequestError, ConflictError, NotFoundError, UnauthorizedError } from '../../http-errors.js';
import { getDisplayName } from '../auth/admin/admin-auth.repo.js';
import { questionnaireWordsFor } from '../claims/questionnaire-words.js';
import { closeScopeTx, openScopeTx } from '../multi-tenant/scope-tx.js';

/** QE6 (A) — the three keys (catalog 56). */
export const QUESTIONNAIRE_PROPOSE_KEY = 'questionnaire.propose';
export const QUESTIONNAIRE_APPROVE_KEY = 'questionnaire.approve';
export const QUESTIONNAIRE_PUBLISH_KEY = 'questionnaire.publish';
/** QE7 (f) — ONE step-up context for make-live, direct and revert (one elevation covers all three for its window — stated). */
export const QUESTIONNAIRE_PUBLISH_STEP_UP_CONTEXT = 'questionnaire_publish';

const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const KINDS = questionnaires.QUESTIONNAIRE_KINDS;

type Kind = (typeof KINDS)[number];
type Actor = { readonly actor: string; readonly actorDisplay: string };

/** A chain refusal / a validator refusal → the stable transport error. ⛔ Question text in a message. */
function mapChainError(err: unknown): never {
  if (err instanceof questionnaireVersions.QuestionnaireChainError) {
    throw new ApiError(err.status, err.code, 'The questionnaire step was refused', Object.keys(err.details).length > 0 ? err.details : undefined);
  }
  if (err instanceof questionnaires.QuestionnaireDefinitionInvalidError) {
    throw new ApiError(422, err.code, 'This version of the questions is not allowed', { problems: err.problems });
  }
  throw err;
}

function payloadHash(shape: Record<string, unknown>): string {
  return createHash('sha256').update(canonicalJsonStringify(shape), 'utf8').digest('hex');
}

/**
 * The draft pages → the engine's pages. A RULED question is put in by key from the newest code version (the domain writer
 * replaces it again — QE5); a STAFF question takes the server's fixed flags: optional, stored encrypted, ⛔ a warning,
 * counsel's basis PENDING if it is about health (QE8 / QE10). The domain stamps `chain:<id>` and validates.
 */
export function draftToPages(kind: Kind, pages: readonly QuestionnaireDraftPage[]): questionnaires.QuestionnairePage[] {
  const base = new Map(questionnaires.questionsOf(questionnaires.newestCodeVersion(kind)).map((q) => [q.key, q] as const));
  return pages.map((p) => ({
    questions: p.questions.map((q): questionnaires.QuestionDefinition => {
      if ('ruled' in q) {
        const ruled = base.get(q.key);
        if (ruled === undefined) {
          throw new ApiError(422, 'questionnaire.definition_invalid', 'This version of the questions is not allowed', {
            problems: [`question '${q.key}' is not a question the Panel ruled for ${kind}`],
          });
        }
        return ruled;
      }
      return {
        key: q.key,
        kind: q.kind,
        text: q.text,
        options: q.options.map((o) => ({ code: o.code, text: o.text, ...(o.exclusive === true ? { exclusive: true } : {}) })),
        optional: true,
        showIf: q.showIf,
        sensitive: true,
        warning: false,
        approvedBy: [],
        health: q.health,
        counselBasis: q.health ? 'pending' : null,
      };
    }),
  }));
}

function stepView(s: questionnaireVersions.QuestionnaireStepRow): QuestionnaireStepView {
  return {
    step: s.step,
    targetPariwarId: s.targetPariwarId,
    actorDisplay: s.actorDisplay,
    note: s.note,
    at: s.at.toISOString(),
    hindiReviewed: s.hindiReviewed,
    classificationAttested: s.classificationAttested,
  };
}

/**
 * The steps `viewer` is SHOWN: the Super Admin every one; a Pariwar those scoped to it or to all (QE11). ⚠ The STAGE is
 * derived from every step the handle can READ — the steps policy lets the ORIGIN read a `made_live` for ANOTHER Pariwar
 * (review RV2), and a version live elsewhere is no longer withdrawable — but only these are DISPLAYED.
 */
function shownSteps(
  steps: readonly questionnaireVersions.QuestionnaireStepRow[],
  viewer: { readonly pariwarId: string | null },
): readonly questionnaireVersions.QuestionnaireStepRow[] {
  return viewer.pariwarId === null ? steps : steps.filter((s) => s.scopePariwarId === null || s.scopePariwarId === viewer.pariwarId);
}

/** A version's summary as `viewer` sees it (`pariwarId: null` = the Super Admin's global view). */
function summaryOf(
  row: questionnaireVersions.QuestionnaireVersionRow,
  steps: readonly questionnaireVersions.QuestionnaireStepRow[],
  viewer: { readonly actorId: string; readonly pariwarId: string | null },
): QuestionnaireVersionSummary {
  const stage = questionnaires.versionStage(steps.map((s) => ({ step: s.step, seq: Number(s.seq) }))) ?? 'proposed';
  const shown = shownSteps(steps, viewer);
  return {
    versionId: row.versionId,
    kind: row.kind,
    version: row.version,
    stage,
    baseVersionId: row.baseVersionId,
    ruledBaseCodeVersionId: row.ruledBaseCodeVersionId,
    originPariwarId: row.originPariwarId,
    direct: row.direct,
    reason: row.reason,
    authoredByDisplay: row.authoredByDisplay,
    authoredByMe: row.authoredByActor === viewer.actorId,
    authoredAt: row.authoredAt.toISOString(),
    outOfDate: row.ruledBaseCodeVersionId !== questionnaires.newestCodeVersion(row.kind).versionId,
    valid: questionnaireVersions.parseVersionRow(row).ok,
    steps: shown.map(stepView),
    // QE11 — a version whose proposal this Pariwar cannot see (made live here or for all from elsewhere).
    historyElsewhere: viewer.pariwarId !== null && !shown.some((s) => s.step === 'proposed'),
  };
}

/** A CODE version as a summary (stage `code` — the Panel's reviewed versions, the editor's starting point). */
function codeSummary(def: questionnaires.QuestionnaireDefinition): QuestionnaireVersionSummary {
  return {
    versionId: def.versionId,
    kind: def.kind,
    version: def.version,
    stage: 'code',
    baseVersionId: null,
    ruledBaseCodeVersionId: null,
    originPariwarId: null,
    direct: false,
    reason: null,
    authoredByDisplay: null,
    authoredByMe: false,
    authoredAt: null,
    outOfDate: false,
    valid: true,
    steps: [],
    historyElsewhere: false,
  };
}

/** QE16 — each question's view: the words with `{member}` LEFT IN PLACE (staff see the placeholder), its badges and its
 *  change against the base (by key). Through THE ONE word function (QE4). */
function questionViews(
  def: questionnaires.QuestionnaireDefinition,
  base: questionnaires.QuestionnaireDefinition | null,
): { questions: QuestionnaireQuestionView[]; pages: string[][]; removedKeys: string[]; closingNote: { en: string; hi: string } } {
  const words = questionnaireWordsFor('{member}');
  const ruled = new Set(questionnaires.ruledQuestionKeysFor(def.kind));
  const markers = base === null ? null : questionnaires.changeMarkers(base, def);
  return {
    questions: questionnaires.questionsOf(def).map((q) => ({
      key: q.key,
      kind: q.kind,
      ruled: ruled.has(q.key),
      words: words.both(q),
      options: q.options.map((o) => ({ code: o.code, words: words.both(o), exclusive: o.exclusive === true })),
      optional: q.optional,
      showIf: q.showIf === null ? null : { key: q.showIf.key, anyOf: [...q.showIf.anyOf] },
      health: q.health,
      counselPending: q.counselBasis === 'pending',
      sensitive: q.sensitive,
      change: markers?.markers.get(q.key) ?? null,
    })),
    pages: def.pages.map((p) => p.questions.map((q) => q.key)),
    removedKeys: [...(markers?.removed ?? [])],
    closingNote: words.both({ copyKey: def.closingNoteCopyKey }),
  };
}

export function createQuestionnaireVersionHandlers(deps: AppDeps) {
  const idempotencyStore = idempotency.createKeyedStore(deps.pool);

  function tenantCtx(request: FastifyRequest): { pariwarId: string; actorId: string; tx: Db } {
    const scopeTx = request.scopeTx;
    const actorId = request.requestContext.actorId;
    if (!scopeTx || !actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return { pariwarId: scopeTx.pariwarId, actorId, tx: scopeTx.tx };
  }

  function actorOf(request: FastifyRequest): string {
    const actorId = request.requestContext.actorId;
    if (!actorId) throw new UnauthorizedError('Authentication required', 'auth.session_required');
    return actorId;
  }

  function requireIdempotencyKey(request: FastifyRequest): string {
    const raw = request.headers['idempotency-key'];
    const key = typeof raw === 'string' ? raw.trim() : '';
    if (key === '' || key.length > 200) throw new BadRequestError('An Idempotency-Key header is required', 'questionnaire.idempotency_key_required');
    return key;
  }

  /** The scope-resolution hook's READ transaction ends BEFORE the write opens its own (`helplineSave`'s V1). */
  async function releaseHookTx(request: FastifyRequest): Promise<void> {
    const hookTx = request.scopeTx;
    if (!hookTx?.scopeSet) return;
    hookTx.scopeSet = false;
    await closeScopeTx(hookTx, true).catch(() => undefined);
    // Detached, so nothing later in this request can reach a client that is back in the pool (`helplineSave`, fifth-pass review W9).
    request.scopeTx = undefined;
  }

  async function displayOf(actorId: string): Promise<string> {
    const display = await getDisplayName(deps.pool, actorId);
    if (display === null) throw new AdminDisplayNameMissingError(actorId);
    return display;
  }

  /** QE17 — claim the key; a replay returns the RECORDED response; a claim with ⛔ result yet is 409 in progress. */
  async function withIdempotency<T>(idemKey: string, run: () => Promise<T>): Promise<T> {
    const outcome = await idempotencyStore.claim(idemKey, IDEMPOTENCY_TTL_SECONDS);
    if (outcome === 'already_claimed') {
      const stored = await idempotencyStore.getResult(idemKey);
      if (stored !== null) return stored as T;
      throw new ConflictError('A request with this Idempotency-Key is already in progress — please wait and retry', 'questionnaire.idempotency_in_progress');
    }
    let settled = false;
    try {
      const out = await run();
      // Review RV4 — `return` / `withdraw` resolve `void`: `recordResult(key, undefined)` stores JSON null, which `getResult` reads
      // back as "no result yet", so a replay would answer 409 "in progress" until the TTL. The house shape records `{ done: true }`.
      await idempotencyStore.recordResult(idemKey, (out ?? { done: true }) as unknown as Record<string, unknown>);
      settled = true;
      return out;
    } finally {
      if (!settled) await idempotencyStore.release(idemKey).catch(() => undefined);
    }
  }

  /** A TENANT write: its own scope transaction, the audit around the mutation, COMMIT, then the recorded result. */
  async function tenantWrite<T>(
    request: FastifyRequest,
    act: 'proposed' | 'approved' | 'returned' | 'withdrawn',
    target: string,
    hashShape: Record<string, unknown>,
    run: (db: Db, actor: Actor, pariwarId: string) => Promise<T>,
  ): Promise<T> {
    const { pariwarId, actorId } = tenantCtx(request);
    const key = requireIdempotencyKey(request);
    const actorDisplay = await displayOf(actorId);
    await releaseHookTx(request);
    return withIdempotency(`questionnaire.${act}:${pariwarId}:${actorId}:${target}:${key}`, async () => {
      const scopeTx = await openScopeTx(deps, pariwarId);
      let ok = false;
      try {
        const out = await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId,
            actorId,
            actorRole: null,
            action: `admin_questionnaire.${act}`,
            resourceLocator: `questionnaire:${target}`,
            requestPayloadHash: payloadHash(hashShape),
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: () => run(scopeTx.tx, { actor: actorId, actorDisplay }, pariwarId),
        });
        ok = true;
        return out;
      } catch (err) {
        return mapChainError(err);
      } finally {
        await closeScopeTx(scopeTx, ok);
      }
    });
  }

  /** A GLOBAL write (the Super Admin): `deps.serviceDb`'s own transaction, committed inside the audited mutation. */
  async function globalWrite<T>(
    request: FastifyRequest,
    act: 'made_live' | 'pariwar_reverted' | 'direct',
    target: string,
    hashShape: Record<string, unknown>,
    run: (db: Db, actor: Actor) => Promise<T>,
  ): Promise<T> {
    const actorId = actorOf(request);
    const key = requireIdempotencyKey(request);
    const actorDisplay = await displayOf(actorId);
    return withIdempotency(`questionnaire.${act}:global:${actorId}:${target}:${key}`, async () => {
      try {
        return await audit.withCompensatingAudit(deps.servicePool, {
          auditIntent: {
            pariwarId: ADMIN_GLOBAL_NAMESPACE,
            actorId,
            actorRole: null,
            action: act === 'direct' ? 'admin_questionnaire.made_live' : `admin_questionnaire.${act}`,
            resourceLocator: `questionnaire:${target}`,
            requestPayloadHash: payloadHash({ act, ...hashShape }),
            traceId: request.requestContext.traceId ?? null,
          },
          mutate: () => deps.serviceDb.transaction((tx) => run(tx as unknown as Db, { actor: actorId, actorDisplay })),
        });
      } catch (err) {
        return mapChainError(err);
      }
    });
  }

  /** In force for `pariwarId` (null = the ALL level), both kinds — and what R2 passed over (R8). */
  async function inForce(db: Db, pariwarId: string | null): Promise<QuestionnaireInForce[]> {
    const out: QuestionnaireInForce[] = [];
    for (const kind of KINDS) {
      const live = await questionnaireVersions.resolveLiveQuestionnaire(db, kind, pariwarId);
      out.push({ kind, versionId: live.def?.versionId ?? null, source: live.source, skipped: live.skipped.map((s) => ({ ...s })) });
    }
    return out;
  }

  async function list(db: Db, viewer: { actorId: string; pariwarId: string | null }, inForceFor: string | null): Promise<QuestionnaireVersionListResponse> {
    const rows = await questionnaireVersions.listVersionRows(db, { pariwarId: viewer.pariwarId });
    const steps = await questionnaireVersions.readStepsFor(db, rows.map((r) => r.versionId));
    const byVersion = new Map<string, questionnaireVersions.QuestionnaireStepRow[]>();
    for (const s of steps) byVersion.set(s.versionId, [...(byVersion.get(s.versionId) ?? []), s]);
    return {
      inForce: await inForce(db, inForceFor),
      versions: [
        ...rows.map((r) => summaryOf(r, byVersion.get(r.versionId) ?? [], viewer)),
        ...[...questionnaires.QUESTIONNAIRE_REGISTRY].sort((a, b) => b.version - a.version).map(codeSummary),
      ],
    };
  }

  /** The detail; a TENANT reader gets 404 ⇔ the version is ⛔ its own AND ⛔ step of it is scoped here or to all (AC8). */
  async function detail(db: Db, versionId: string, viewer: { actorId: string; pariwarId: string | null }): Promise<QuestionnaireVersionDetailResponse> {
    const code = questionnaires.QUESTIONNAIRE_REGISTRY.find((d) => d.versionId === versionId);
    if (code !== undefined) {
      const views = questionViews(code, null);
      return { ...codeSummary(code), ...views, warnings: questionnaires.questionnaireDefinitionWarnings(code), problems: [] };
    }
    const row = await questionnaireVersions.readVersionRow(db, versionId);
    if (row === null) throw new NotFoundError('No such questionnaire version', 'questionnaire.not_found');
    const steps = await questionnaireVersions.readVersionSteps(db, versionId);
    if (viewer.pariwarId !== null && row.originPariwarId !== viewer.pariwarId && shownSteps(steps, viewer).length === 0) {
      throw new NotFoundError('No such questionnaire version', 'questionnaire.not_found');
    }
    const summary = summaryOf(row, steps, viewer);
    const parsed = questionnaireVersions.parseVersionRow(row);
    // Review RV3 — the change markers / removed keys are computed against the base ONLY when the viewer may SEE that base
    // (a code version, its own, or one live here / for all): ⛔ another Pariwar's open proposal, whose question keys they show.
    const baseIsCode = questionnaires.QUESTIONNAIRE_REGISTRY.some((d) => d.versionId === row.baseVersionId);
    const baseVisible =
      viewer.pariwarId === null || baseIsCode || (await questionnaireVersions.versionVisibleTo(db, viewer.pariwarId, row.baseVersionId));
    const base = baseVisible ? await questionnaireVersions.getQuestionnaireDefinition(db, row.baseVersionId) : null;
    if (parsed.def === null) {
      return { ...summary, questions: null, pages: null, closingNote: null, removedKeys: [], warnings: [], problems: parsed.ok ? [] : [...parsed.problems] };
    }
    return {
      ...summary,
      ...questionViews(parsed.def, base),
      warnings: questionnaires.questionnaireDefinitionWarnings(parsed.def),
      problems: parsed.ok ? [] : [...parsed.problems],
    };
  }

  return {
    // ── TENANT ──────────────────────────────────────────────────────────────────────────────────────────────────────
    async list(request: FastifyRequest): Promise<QuestionnaireVersionListResponse> {
      const { pariwarId, actorId, tx } = tenantCtx(request);
      return list(tx, { actorId, pariwarId }, pariwarId);
    },

    async detail(request: FastifyRequest): Promise<QuestionnaireVersionDetailResponse> {
      const { pariwarId, actorId, tx } = tenantCtx(request);
      const { versionId } = request.params as { versionId: string };
      return detail(tx, versionId, { actorId, pariwarId });
    },

    async propose(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const body = request.body as QuestionnaireProposeRequest;
      const pages = draftToPages(body.kind, body.pages);
      const out = await tenantWrite(request, 'proposed', body.kind, { kind: body.kind, base: body.baseVersionId ?? null }, (db, actor, pariwarId) =>
        questionnaireVersions.proposeVersion(db, {
          ...actor,
          pariwarId,
          kind: body.kind,
          ...(body.baseVersionId !== undefined ? { baseVersionId: body.baseVersionId } : {}),
          pages,
        }),
      );
      return { versionId: out.versionId, warnings: [...out.warnings] };
    },

    async approve(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const { versionId } = request.params as { versionId: string };
      const body = request.body as QuestionnaireApproveRequest;
      const out = await tenantWrite(request, 'approved', versionId, { versionId }, (db, actor, pariwarId) =>
        questionnaireVersions.approveVersion(db, { ...actor, pariwarId, versionId, ...body }),
      );
      return { versionId, warnings: [...out.warnings] };
    },

    async return(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const { versionId } = request.params as { versionId: string };
      const body = request.body as QuestionnaireReturnRequest;
      await tenantWrite(request, 'returned', versionId, { versionId }, (db, actor, pariwarId) =>
        questionnaireVersions.returnVersion(db, { ...actor, pariwarId, versionId, note: body.note }),
      );
      return { versionId, warnings: [] };
    },

    async withdraw(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const { versionId } = request.params as { versionId: string };
      await tenantWrite(request, 'withdrawn', versionId, { versionId }, (db, actor, pariwarId) =>
        questionnaireVersions.withdrawVersion(db, { ...actor, pariwarId, versionId }),
      );
      return { versionId, warnings: [] };
    },

    // ── GLOBAL (the Super Admin) ────────────────────────────────────────────────────────────────────────────────────
    async globalList(request: FastifyRequest): Promise<QuestionnaireVersionListResponse> {
      const actorId = actorOf(request);
      const { pariwarId } = request.query as { pariwarId?: string };
      return list(deps.serviceDb as unknown as Db, { actorId, pariwarId: null }, pariwarId ?? null);
    },

    async globalDetail(request: FastifyRequest): Promise<QuestionnaireVersionDetailResponse> {
      const actorId = actorOf(request);
      const { versionId } = request.params as { versionId: string };
      return detail(deps.serviceDb as unknown as Db, versionId, { actorId, pariwarId: null });
    },

    async pariwarsKeepingOwn(request: FastifyRequest): Promise<QuestionnairePariwarsKeepingOwnResponse> {
      actorOf(request);
      const { kind } = request.query as { kind: Kind };
      const db = deps.serviceDb as unknown as Db;
      const own = await questionnaireVersions.pariwarsKeepingOwn(db, kind);
      const ids = own.map((o) => o.pariwarId);
      const names =
        ids.length === 0
          ? []
          : await db
              .select({ pariwarId: schema.pariwarPassport.pariwarId, name: schema.pariwarPassport.displayNameEn })
              .from(schema.pariwarPassport)
              .where(inArray(schema.pariwarPassport.pariwarId, ids as never[]));
      const nameOf = new Map(names.map((n) => [n.pariwarId as string, n.name] as const));
      return { pariwars: own.map((o) => ({ pariwarId: o.pariwarId, name: nameOf.get(o.pariwarId) ?? null, versionId: o.versionId })) };
    },

    async makeLive(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const { versionId } = request.params as { versionId: string };
      const body = request.body as QuestionnaireMakeLiveRequest;
      const out = await globalWrite(request, 'made_live', versionId, { versionId, target: body.targetPariwarId }, (db, actor) =>
        questionnaireVersions.makeVersionLive(db, {
          ...actor,
          versionId,
          targetPariwarId: body.targetPariwarId,
          acknowledgeBaseMoved: body.acknowledgeBaseMoved === true,
        }),
      );
      return { versionId, warnings: [...out.warnings] };
    },

    async direct(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const body = request.body as QuestionnaireDirectRequest;
      const pages = draftToPages(body.kind, body.pages);
      const out = await globalWrite(request, 'direct', body.kind, { kind: body.kind, target: body.targetPariwarId, base: body.baseVersionId ?? null }, (db, actor) =>
        questionnaireVersions.directVersion(db, {
          ...actor,
          kind: body.kind,
          targetPariwarId: body.targetPariwarId,
          ...(body.baseVersionId !== undefined ? { baseVersionId: body.baseVersionId } : {}),
          pages,
          reason: body.reason,
          hindiReviewed: body.hindiReviewed,
          classificationAttested: body.classificationAttested,
          acknowledgeBaseMoved: body.acknowledgeBaseMoved === true,
        }),
      );
      return { versionId: out.versionId, warnings: [...out.warnings] };
    },

    async revert(request: FastifyRequest): Promise<QuestionnaireStepResponse> {
      const body = request.body as QuestionnaireRevertRequest;
      const out = await globalWrite(request, 'pariwar_reverted', `${body.kind}:${body.targetPariwarId}`, { ...body }, (db, actor) =>
        questionnaireVersions.revertPariwar(db, { ...actor, kind: body.kind, targetPariwarId: body.targetPariwarId }),
      );
      return { versionId: out.endedVersionId, warnings: [] };
    },
  };
}
