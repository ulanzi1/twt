// Story 6.27a second-pass review S24 / S27 (b) — the console's and the questionnaire's WIRE shapes, held in lockstep with
// the domain through the REAL mappers (⛔ a copy in a test — a copied mapping drifts with nobody noticing).
//   · S24: the console's send-status / window-outcome enums equal the domain tuples — a value 6.27c adds to the ping
//     column must fail HERE, ⛔ in production as a serialization error of the whole console packet;
//   · S27 (b): `toWireQuestionnaire` (the handler's own mapper) parses under the contract for every registered version.

import { PEER_MESH_SEND_STATUSES, PEER_MESH_WINDOW_OUTCOMES, PeerRequestQuestionnaire } from '@twt/contracts';
import { questionnaires, schema } from '@twt/domain';
import { describe, expect, it } from 'vitest';

import { toWireQuestionnaire } from '../../src/modules/claims/peer-request-core.js';

describe('Story 6.27a — contracts ↔ domain lockstep through the real mappers', () => {
  it("S24: the console's send statuses = 'not_sent' + the domain's PEER_MESH_SEND_OUTCOMES; the window outcomes = PEER_MESH_OUTCOMES", () => {
    expect(new Set(PEER_MESH_SEND_STATUSES)).toEqual(new Set(['not_sent', ...schema.PEER_MESH_SEND_OUTCOMES]));
    expect(new Set(PEER_MESH_WINDOW_OUTCOMES)).toEqual(new Set(schema.PEER_MESH_OUTCOMES));
  });

  it('S27 (b): the handler\'s toWireQuestionnaire output parses for EVERY registered version — exclusive and showIf included', () => {
    for (const def of questionnaires.QUESTIONNAIRE_REGISTRY) {
      const wire = toWireQuestionnaire(def, 'Ram K.');
      const parsed = PeerRequestQuestionnaire.safeParse(wire);
      expect(parsed.success, `${def.versionId}: ${JSON.stringify(parsed.error?.issues ?? [])}`).toBe(true);
      const served = questionnaires.questionsOf(questionnaires.servedDefinition(def));
      const onWire = wire.pages.flatMap((p) => p.questions);
      expect(onWire.map((q) => q.key)).toEqual(served.map((q) => q.key));
      for (const q of served) {
        const w = onWire.find((x) => x.key === q.key)!;
        expect(w.showIf).toEqual(q.showIf === null ? null : { key: q.showIf.key, anyOf: [...q.showIf.anyOf] });
        expect(w.options.map((o) => o.exclusive)).toEqual(q.options.map((o) => o.exclusive === true));
      }
    }
  });
});
