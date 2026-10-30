// Story 6.33 — shared builders for a CHAIN (database) version: a valid chain question and a definition on a ruled base,
// stamped with its own `chain:<id>` (QE4). Pure — used by the engine tests and the live-DB specs.

import { randomUUID } from 'node:crypto';

import type { QuestionDefinition, QuestionnaireDefinition } from '../../src/questionnaires/index.js';

export function chainQuestion(chainId: string, over: Partial<QuestionDefinition> = {}): QuestionDefinition {
  return {
    key: 'water_source',
    kind: 'single',
    text: { en: 'Where did {member} get water?', hi: '{member} पानी कहाँ से लाते थे?' },
    options: [
      { code: 'well', text: { en: 'A well', hi: 'कुआँ' } },
      { code: 'tap', text: { en: 'A tap', hi: 'नल' } },
    ],
    optional: true,
    showIf: null,
    sensitive: true,
    warning: false,
    approvedBy: [`chain:${chainId}`],
    health: false,
    counselBasis: null,
    ...over,
  };
}

/** A database version on `ruledBase`: its pages + one page per chain question, numbered `version`. */
export function chainDefinition(
  ruledBase: QuestionnaireDefinition,
  version: number,
  chainId: string = randomUUID(),
  extra: (id: string) => readonly QuestionDefinition[] = (id) => [chainQuestion(id)],
): { id: string; def: QuestionnaireDefinition } {
  return {
    id: chainId,
    def: {
      ...ruledBase,
      versionId: `${ruledBase.kind}.v${version}`,
      version,
      scope: { kind: 'all' },
      status: 'live',
      approvedBy: [...ruledBase.approvedBy, `chain:${chainId}`],
      pages: [...ruledBase.pages, ...extra(chainId).map((q) => ({ questions: [q] }))],
    },
  };
}
