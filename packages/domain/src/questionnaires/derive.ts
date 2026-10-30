// The CHAIN's pure helpers — Story 6.33 (`2026-10-10-304` Q7 / Q8; `2026-10-30-421` QE2 / QE5 / QE12). ⛔ PURE: the
// database reader and writer (`questionnaire-versions/`) call these on rows they read.
//
// · `versionStage(steps)` — a version's place in the chain, DERIVED from its steps ordered by `seq` (⛔ `at`: three steps
//   written in ONE transaction share `now()`; ⛔ a status column — QE2).
// · `canTakeStep(stage, step)` — the AC8 state machine.
// · `liveCandidates(steps, pariwarId)` — QE12 R2's two levels: the Pariwar's OWN version, else the all-Pariwar one.
// · `newestCodeVersion(kind)` — QE5's ONE definition of the ruled base; `replaceRuledQuestions` — the server's
//   replacement of the submitted ruled questions; `overlayCounselBasis` — QE12 R3.
// · `changeMarkers(base, next)` — the editor's per-question marker (QE16), by key.

import { CHAIN_RECORD_RE, ruledQuestionKeysFor } from './keys.js';
import { QUESTIONNAIRE_REGISTRY, questionsOf } from './registry.js';
import type { QuestionDefinition, QuestionnaireDefinition, QuestionnaireKind } from './types.js';
import { canonicalJson, lockedView } from './validator.js';

/** The chain's steps (migration 0192's enum). */
export const CHAIN_STEPS = ['proposed', 'approved', 'returned', 'withdrawn', 'made_live', 'pariwar_reverted'] as const;
export type ChainStep = (typeof CHAIN_STEPS)[number];

/** `published` = made live for at least one target (it may be made live again — for another target, or after a revert). */
export type VersionStage = 'proposed' | 'approved' | 'returned' | 'withdrawn' | 'published';

export interface OrderedStep {
  readonly step: ChainStep;
  readonly seq: number;
}

const bySeq = <T extends { readonly seq: number }>(steps: readonly T[]): T[] => [...steps].sort((a, b) => a.seq - b.seq);

/** The stage of ONE version from ITS steps (by `seq`); `null` before its `proposed` step. */
export function versionStage(steps: readonly OrderedStep[]): VersionStage | null {
  let stage: VersionStage | null = null;
  for (const { step } of bySeq(steps)) {
    if (step === 'proposed') stage = 'proposed';
    else if (step === 'approved' || step === 'returned' || step === 'withdrawn') stage = step;
    else if (step === 'made_live') stage = 'published';
    // `pariwar_reverted` ends a TARGET's own version — ⛔ the version's stage.
  }
  return stage;
}

/**
 * AC8 — `proposed` → `approved` | `returned` | `withdrawn`; `approved` → `made_live` | `withdrawn`; `made_live` repeats;
 * `returned` / `withdrawn` are terminal (a revision is a NEW version based on this one). `pariwar_reverted` is ⛔ a
 * version step (the writer checks the TARGET's own version in force).
 */
export function canTakeStep(stage: VersionStage | null, step: ChainStep): boolean {
  switch (step) {
    case 'proposed':
      return stage === null;
    case 'approved':
    case 'returned':
      return stage === 'proposed';
    case 'withdrawn':
      return stage === 'proposed' || stage === 'approved';
    case 'made_live':
      return stage === 'approved' || stage === 'published';
    case 'pariwar_reverted':
      return false;
  }
}

export interface LiveStep {
  readonly versionId: string;
  readonly step: ChainStep;
  readonly targetPariwarId: string | null;
  readonly seq: number;
}

/**
 * QE12 R2 — for ONE kind's steps: `own` = the version of the newest (by `seq`) `made_live` for `pariwarId`, PROVIDED no
 * `pariwar_reverted` of THAT PARIWAR has a greater `seq` (keyed on the Pariwar — a revert ends whatever own version is in
 * force); `all` = the newest `made_live` for all Pariwars. The reader skips a candidate that fails validation or is on a
 * stale ruled base (the next level is used); the revert route reads `own` RAW (a skipped own version is still revertable).
 */
export function liveCandidates(steps: readonly LiveStep[], pariwarId: string): { own: string | null; all: string | null } {
  let own: LiveStep | null = null;
  let revert: LiveStep | null = null;
  let all: LiveStep | null = null;
  for (const s of steps) {
    if (s.step === 'made_live' && s.targetPariwarId === pariwarId && (own === null || s.seq > own.seq)) own = s;
    if (s.step === 'pariwar_reverted' && s.targetPariwarId === pariwarId && (revert === null || s.seq > revert.seq)) revert = s;
    if (s.step === 'made_live' && s.targetPariwarId === null && (all === null || s.seq > all.seq)) all = s;
  }
  return {
    own: own !== null && (revert === null || revert.seq < own.seq) ? own.versionId : null,
    all: all?.versionId ?? null,
  };
}

/**
 * QE5's ONE definition of the ruled base: the highest-`version` CODE definition of `kind` with `scope.kind === 'all'`
 * (⛔ code per-Pariwar version exists — a story that adds one states its place in R2).
 */
export function newestCodeVersion(kind: QuestionnaireKind, registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY): QuestionnaireDefinition {
  const newest = findNewestCodeVersion(kind, registry);
  if (newest === null) throw new Error(`[questionnaires] no code version of ${kind}`);
  return newest;
}

/** `newestCodeVersion`, or `null` when the registry holds ⛔ code version of `kind` (an injected TEST registry). */
export function findNewestCodeVersion(
  kind: QuestionnaireKind,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): QuestionnaireDefinition | null {
  return registry
    .filter((d) => d.kind === kind && d.scope.kind === 'all')
    .reduce<QuestionnaireDefinition | null>((a, d) => (a === null || d.version > a.version ? d : a), null);
}

/**
 * QE5 (A) — the server REPLACES every submitted ruled question (by key) and the closing / thank-you copy keys with the
 * ruled base's, before validating: the client's copy is ⛔ trusted, and a "with modification" of a version on an older
 * ruled base is re-based by the same replacement. A ruled question the submission LACKS stays missing (CF3 (a) refuses).
 */
export function replaceRuledQuestions(def: QuestionnaireDefinition, ruledBase: QuestionnaireDefinition): QuestionnaireDefinition {
  const ruled = new Set(ruledQuestionKeysFor(ruledBase.kind));
  const base = new Map(questionsOf(ruledBase).map((q) => [q.key, q] as const));
  return {
    ...def,
    pages: def.pages.map((p) => ({ questions: p.questions.map((q) => (ruled.has(q.key) && base.has(q.key) ? base.get(q.key)! : q)) })),
    closingNoteCopyKey: ruledBase.closingNoteCopyKey,
    thankYouCopyKey: ruledBase.thankYouCopyKey,
  };
}

/**
 * QE12 R3 — the ruled HEALTH questions' `counselBasis` is read from the NEWEST code version of the kind, so recording
 * counsel's basis by an in-place reviewed code edit reaches every database version in force exactly as it reaches the
 * code version. Chain questions keep their own (QE10).
 */
export function overlayCounselBasis(def: QuestionnaireDefinition, newestCode: QuestionnaireDefinition): QuestionnaireDefinition {
  const code = new Map(questionsOf(newestCode).map((q) => [q.key, q] as const));
  const ruled = new Set(ruledQuestionKeysFor(def.kind));
  const overlay = (q: QuestionDefinition): QuestionDefinition => {
    const c = code.get(q.key);
    return ruled.has(q.key) && c !== undefined && c.health === true && q.health === true ? { ...q, counselBasis: c.counselBasis } : q;
  };
  return { ...def, pages: def.pages.map((p) => ({ questions: p.questions.map(overlay) })) };
}

export type ChangeMarker = 'new' | 'changed' | 'unchanged';

/** A question as the marker compares it: the lock's view, less a CHAIN question's own record — every version re-stamps its
 *  chain questions `['chain:<its own id>']`, so an untouched staff question would otherwise never compare equal (review RT1). */
function markerView(q: QuestionDefinition): unknown {
  const view = lockedView(q) as Record<string, unknown>;
  const ownRecord = q.approvedBy.length === 1 && CHAIN_RECORD_RE.test(q.approvedBy[0] ?? '');
  return ownRecord ? Object.fromEntries(Object.entries(view).filter(([k]) => k !== 'approvedBy')) : view;
}

/** QE16 — each question of `next` against `base` by key; `removed` = the base's keys `next` dropped (in base order). */
export function changeMarkers(
  base: QuestionnaireDefinition | null,
  next: QuestionnaireDefinition,
): { markers: ReadonlyMap<string, ChangeMarker>; removed: readonly string[] } {
  const before = new Map((base === null ? [] : questionsOf(base)).map((q) => [q.key, q] as const));
  const markers = new Map<string, ChangeMarker>();
  for (const q of questionsOf(next)) {
    const b = before.get(q.key);
    markers.set(q.key, b === undefined ? 'new' : canonicalJson(markerView(b)) === canonicalJson(markerView(q)) ? 'unchanged' : 'changed');
  }
  return { markers, removed: [...before.keys()].filter((k) => !markers.has(k)) };
}
