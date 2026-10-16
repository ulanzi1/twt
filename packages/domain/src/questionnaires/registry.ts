// The VERSION REGISTRY and the SERVED definition — Story 6.27a PM23 (a) / (c). ⛔ PURE.
//
// · `resolveLiveVersion(kind, pariwarId)` — the Pariwar's own LIVE version, else the all-Pariwar one (a reply pins it at
//   its FIRST save; a newer version applies to new replies only).
// · `servedDefinition(def)` — the definition a person is SHOWN: every question whose `counselBasis` is `'pending'` is
//   skipped (and any question whose `showIf` parent is skipped). ⚠ 6.27c's sweep and child HOLD while
//   `pendingCounselBasisKeys(live)` is non-empty, so the skip ⛔ never reaches a texted neighbour.
// Every registered definition is VALIDATED at module load — a broken version fails the boot, ⛔ never a member.

import {
  PEER_MESH_QUESTIONNAIRE_V1,
  PEER_MESH_QUESTIONNAIRE_V2,
  PEER_MESH_QUESTIONNAIRE_V3,
  PEER_MESH_QUESTIONNAIRE_V4,
} from './peer-mesh.js';
import type { QuestionDefinition, QuestionnaireDefinition, QuestionnaireKind } from './types.js';
import { assertValidQuestionnaireDefinition } from './validator.js';

/** Every registered version (historical ones included — an old reply stays tied to its version). */
export const QUESTIONNAIRE_REGISTRY: readonly QuestionnaireDefinition[] = [
  PEER_MESH_QUESTIONNAIRE_V1,
  PEER_MESH_QUESTIONNAIRE_V2,
  PEER_MESH_QUESTIONNAIRE_V3,
  PEER_MESH_QUESTIONNAIRE_V4,
];

for (const def of QUESTIONNAIRE_REGISTRY) assertValidQuestionnaireDefinition(def);
{
  const ids = QUESTIONNAIRE_REGISTRY.map((d) => d.versionId);
  if (new Set(ids).size !== ids.length) throw new Error('[questionnaires] duplicate versionId in the registry');
}

/** The registered version `versionId`, or `null`. */
export function getQuestionnaireVersion(
  versionId: string,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): QuestionnaireDefinition | null {
  return registry.find((d) => d.versionId === versionId) ?? null;
}

/**
 * The LIVE version of `kind` for `pariwarId` — the Pariwar's own, else the all-Pariwar one; `null` when ⛔ none (e.g.
 * `ground_inspection` until row 6-32). Two live versions at the same level is a registry defect (throws).
 */
export function resolveLiveVersion(
  kind: QuestionnaireKind,
  pariwarId: string,
  registry: readonly QuestionnaireDefinition[] = QUESTIONNAIRE_REGISTRY,
): QuestionnaireDefinition | null {
  const live = registry.filter((d) => d.kind === kind && d.status === 'live');
  const own = live.filter((d) => d.scope.kind === 'pariwar' && d.scope.pariwarId === pariwarId);
  const all = live.filter((d) => d.scope.kind === 'all');
  for (const level of [own, all]) {
    if (level.length > 1) throw new Error(`[questionnaires] more than one live ${kind} version at one level`);
    if (level.length === 1) return level[0]!;
  }
  return null;
}

/** Every question of `def`, in page order. */
export function questionsOf(def: QuestionnaireDefinition): QuestionDefinition[] {
  return def.pages.flatMap((p) => p.questions);
}

/** The keys of `def` whose `counselBasis` is `'pending'` — 6.27c's config gap (AC2b). */
export function pendingCounselBasisKeys(def: QuestionnaireDefinition): string[] {
  return questionsOf(def)
    .filter((q) => q.counselBasis === 'pending')
    .map((q) => q.key);
}

/** The definition as SHOWN: `'pending'` questions (and their dependants) skipped; empty pages dropped. */
export function servedDefinition(def: QuestionnaireDefinition): QuestionnaireDefinition {
  const skipped = new Set<string>();
  for (const q of questionsOf(def)) {
    if (q.counselBasis === 'pending' || (q.showIf !== null && skipped.has(q.showIf.key))) skipped.add(q.key);
  }
  return {
    ...def,
    pages: def.pages
      .map((p) => ({ questions: p.questions.filter((q) => !skipped.has(q.key)) }))
      .filter((p) => p.questions.length > 0),
  };
}
