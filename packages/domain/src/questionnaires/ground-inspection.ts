// The inspector's questionnaire for the family at the ground inspection — v1 (Story 6.32, `2026-10-28-413` IQ1).
// Reviewed CODE until row 6-33 builds the `-304` Q8 chain (as `peer-mesh.ts` is). The WORDS are copy keys in
// `packages/i18n/locales/{en,hi}/claim.json` (`inspector_questions.*` — the inspector asks the FAMILY, so ⛔ the
// neighbours' `peer_request_questions.*` words), resolved on the server in en AND hi.
//
// · v1 carries ONLY the ruled questions: `head_letter` (`-310` CF4 A (3); asked on EVERY full visit — `-330` SW25, so
//   the question tells the inspector ⛔ nothing about the neighbours), then `death_cause` and `death_illness` (`-304`
//   Q3 A / Q4 A — the SAME codes as the neighbours', from `keys.ts`). Every question is OPTIONAL: nothing here gates an
//   inspection or an approval (I1; IQ13 (A) — a missing letter holds ⛔ nothing).
// · `death_cause` / `death_illness` are `health: true` with `counselBasis: 'pending'` until roster Row 42 (a) closes: the
//   SERVED definition is the letter question ALONE. Recording the basis is a reviewed edit HERE that cites counsel's
//   recorded basis (a decision id) + its test — ⛔ never edited to make a test pass (tests inject a registry).
// ⛔ The "has the family filed any other claim?" question (6.28 OP14 (d)) is ⛔ here: it waits for row 6-33's chain (IQ2).
// ⛔ PURE.

import { DEATH_CAUSE_CODES, DEATH_ILLNESS_CODES, DONT_KNOW_CODE, HEAD_LETTER_CODES } from './keys.js';
import type { QuestionnaireDefinition, QuestionOption } from './types.js';

const NS = 'inspector_questions';

function opts(key: string, codes: readonly string[], exclusive: readonly string[] = []): QuestionOption[] {
  return codes.map((code) => ({
    code,
    copyKey: `${NS}.${key}.${code}`,
    ...(exclusive.includes(code) ? { exclusive: true } : {}),
  }));
}

const R304 = '2026-10-10-304';
const R310 = '2026-10-10-310';

/** v1 — LIVE (all Pariwars). Pages: the head's letter; how the member died; which illness. */
export const GROUND_INSPECTION_QUESTIONNAIRE_V1: QuestionnaireDefinition = {
  kind: 'ground_inspection',
  versionId: 'ground_inspection.v1',
  version: 1,
  scope: { kind: 'all' },
  status: 'live',
  approvedBy: [R304, R310],
  pages: [
    {
      questions: [
        {
          key: 'head_letter',
          kind: 'single',
          copyKey: `${NS}.head_letter.question`,
          options: opts('head_letter', HEAD_LETTER_CODES),
          optional: true,
          showIf: null,
          sensitive: false,
          warning: false,
          approvedBy: [R310],
          health: false,
          counselBasis: null,
        },
      ],
    },
    {
      questions: [
        {
          key: 'death_cause',
          kind: 'single',
          copyKey: `${NS}.death_cause.question`,
          options: opts('death_cause', DEATH_CAUSE_CODES),
          optional: true,
          showIf: null,
          sensitive: true,
          warning: false,
          approvedBy: [R304],
          health: true,
          counselBasis: 'pending',
        },
      ],
    },
    {
      questions: [
        {
          key: 'death_illness',
          kind: 'multi',
          copyKey: `${NS}.death_illness.question`,
          options: opts('death_illness', DEATH_ILLNESS_CODES, [DONT_KNOW_CODE]),
          optional: true,
          showIf: { key: 'death_cause', anyOf: ['illness_long', 'illness_sudden'] },
          sensitive: true,
          warning: false,
          approvedBy: [R304],
          health: true,
          counselBasis: 'pending',
        },
      ],
    },
  ],
  closingNoteCopyKey: `${NS}.closing_note`,
  thankYouCopyKey: `${NS}.thank_you`,
};
