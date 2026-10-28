// Story 6.32 (AC4, AC10, AC12; I1, I2) — the questionnaire's source-level fences, each with TEETH (a positive control that
// proves the scan can fire — [[feedback_gate_scope_semantic_coverage]]: a green fence proves nothing without one).
//   · I1 — NOTHING GATES: the approval gate (`ground-inspection-approval.ts`), the warnings (`approval-warnings.ts`) and the
//     completion's required list read ⛔ the family's answers (⛔ table, ⛔ module, ⛔ question key);
//   · I2 — the questionnaire's modules read ⛔ neighbour data: the questions are identical whatever the neighbours said;
//   · AC10 — this story reads ⛔ column of `claim_peer_mesh_selections` (the letter is asked on EVERY full visit — SW25).

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const read = (rel: string) => readFileSync(path.join(repo, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** The completion function's body, from its signature to the next top-level export. */
function completionBody(): string {
  const src = stripComments(read('packages/domain/src/claim/ground-inspection-persist.ts'));
  const start = src.indexOf('export async function completeGroundInspection(');
  const end = src.indexOf('\nexport ', start + 1);
  expect(start).toBeGreaterThan(0);
  return src.slice(start, end);
}

const FAMILY_ANSWERS = [/claim_ground_inspection_answers/, /claimGroundInspectionAnswers/, /claim_ground_inspection_questionnaires/, /ground-inspection-questionnaire/, /head_letter/, /readClaimFamilyAccount/];

describe('I1 — the questionnaire gates ⛔ nothing', () => {
  it('the approval gate and the warnings module read ⛔ the family\'s answers', () => {
    for (const f of ['packages/domain/src/claim/ground-inspection-approval.ts', 'packages/domain/src/claim/approval-warnings.ts']) {
      const code = stripComments(read(f));
      for (const re of FAMILY_ANSWERS) expect(re.test(code), `${f} reached for ${String(re)}`).toBe(false);
    }
  });
  it('the completion\'s required list reads ⛔ an answer — ONLY the comparison\'s code indexes (③ / ④)', () => {
    const body = completionBody();
    for (const re of FAMILY_ANSWERS) expect(re.test(body), `completeGroundInspection reached for ${String(re)}`).toBe(false);
    // the ONE family read inside it is the comparison's indexes-only helper
    expect(body).toContain('readFamilyCodeIndexes');
  });
  it('⭐ TEETH — the same scan FIRES on the module that reads the answers by design', () => {
    const code = stripComments(read('packages/domain/src/claim/ground-inspection-questionnaire.ts'));
    expect(FAMILY_ANSWERS.some((re) => re.test(code))).toBe(true);
  });
});

const NEIGHBOUR_DATA = [/claim_peer_mesh/, /claimPeerMesh/, /peer-mesh-reply/, /peer-mesh-read/, /PeerMesh(Selection|Ping|Reply)/];
const QUESTIONNAIRE_MODULES = ['packages/domain/src/claim/ground-inspection-questionnaire.ts', 'packages/domain/src/questionnaires/ground-inspection.ts'];

describe('I2 — the inspector learns ⛔ nothing about the neighbours before completing (CF2)', () => {
  it('the questionnaire\'s modules read ⛔ neighbour data', () => {
    for (const f of QUESTIONNAIRE_MODULES) {
      const code = stripComments(read(f));
      for (const re of NEIGHBOUR_DATA) expect(re.test(code), `${f} reached for ${String(re)}`).toBe(false);
    }
  });
  it('the GET / PUT handlers call ⛔ neighbour read (the served definition is the version\'s, ⛔ a function of the neighbours)', () => {
    const src = stripComments(read('apps/api/src/modules/claims/claims.ground-inspection.handlers.ts'));
    for (const name of ['async questionnaire(', 'async saveQuestionnaireAnswer(']) {
      const start = src.indexOf(name);
      expect(start, name).toBeGreaterThan(0);
      const body = src.slice(start, src.indexOf('\n    async ', start + name.length));
      for (const re of [/readPeerAnswersForClaim/, /getPeerMesh/, /claimPeerMesh/, /peerMesh/i]) {
        expect(re.test(body), `${name} reached for ${String(re)}`).toBe(false);
      }
    }
  });
  it('⭐ TEETH — the scan FIRES on the neighbours\' writer', () => {
    expect(NEIGHBOUR_DATA.some((re) => re.test(stripComments(read('packages/domain/src/claim/peer-mesh-reply.ts'))))).toBe(true);
  });
});

describe('AC10 — the letter is asked on EVERY full visit: ⛔ selection column is read', () => {
  const SELECTION = [/claim_peer_mesh_selections/, /claimPeerMeshSelections/, /deceasedWorkplaceId/, /deceased_workplace_id/, /deceasedPreviousWorkplaceId/];
  it('⛔ module this story added reads `claim_peer_mesh_selections`', () => {
    for (const f of [...QUESTIONNAIRE_MODULES, 'packages/domain/src/claim/answer-code-index.ts']) {
      const code = stripComments(read(f));
      for (const re of SELECTION) expect(re.test(code), `${f} reached for ${String(re)}`).toBe(false);
    }
  });
  it('⭐ TEETH — the scan FIRES on the selection\'s own schema', () => {
    expect(SELECTION.some((re) => re.test(read('packages/domain/src/schema/claim_peer_mesh_selections.ts')))).toBe(true);
  });
});
