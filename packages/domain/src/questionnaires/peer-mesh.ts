// The neighbours' questionnaire — v1, v2 and v3 (Story 6.27a PM23 (b); v3 Story 6.27b). Reviewed CODE until row 6-33 builds the `-304` Q7
// chain. The WORDS are copy keys in `packages/i18n/locales/{en,hi}/claim.json` (`peer_request_questions.*`), resolved on
// the server — so a new version needs ⛔ no app release.
//
// · v1 — page 1 only (`has_died`; `death_date` after "Yes") + the closing note. `-262` FQ8 E / `-263` FQ10 / `-303`.
//   HISTORICAL: registered so a reply tied to it stays readable, ⛔ never live, ⛔ never returned by `resolveLiveVersion`,
//   and EXEMPT from the seven-key rule (CF3 (a)).
// · v2 — `2026-10-10-304`, EXACTLY as ruled. ⭐ HISTORICAL since Story 6.27b (`-329` decision 1): registered so a
//   reply started on it keeps v2 and its words, ⛔ never live. Its call-back question asks *"May the District Admin phone
//   you about this?"* (`callbackAudience: 'district_admin'`) — a *"Yes"* to it shows the number to the District Admin's
//   side ONLY (Q1 C in full). `death_cause` (whole question: its answers include illnesses) and `death_illness` are
//   `health: true` with `counselBasis: 'pending'` until roster Row 27 (f) closes: the SERVED definition skips them, and
//   6.27c's sweep and child HOLD while either is pending (6.27c AC2b), so ⛔ no texted neighbour ever sees a ruled
//   question skipped. Recording the basis is a reviewed edit HERE that cites counsel's recorded basis (a decision id) +
//   its test.
// · v3 — Story 6.27b, `2026-10-13-328` decision 2 read with `-329` decisions 1–3 — LIVE for every Pariwar. v2 with ONE
//   change: `callback_consent` asks *"May the Admin phone you about this?"* (the District Admin and the Pariwar Admin)
//   under a NEW copy key (`…callback_consent.question_admin` — ⛔ never an in-place edit of v2's words) with
//   `callbackAudience: 'admin'`. Every other question keeps v2's provenance and `counselBasis`, so 6.27c AC2b's health
//   hold applies to v3 unchanged. ⚠ RECORDED: a reply pins whatever is LIVE at its first save — a client that loaded
//   before a version flip shows the old words but pins the new (unreachable at 6.27b's deploy: ⛔ no production reply
//   exists before 6.27c sends; accepted for later flips).
// ⛔ PURE.

import type { QuestionDefinition, QuestionnaireDefinition, QuestionOption } from './types.js';

const NS = 'peer_request_questions';

function opts(key: string, codes: readonly string[], exclusive: readonly string[] = []): QuestionOption[] {
  return codes.map((code) => ({
    code,
    copyKey: `${NS}.${key}.${code}`,
    ...(exclusive.includes(code) ? { exclusive: true } : {}),
  }));
}

const FQ10 = '2026-09-28-263';
const FQ8E = '2026-09-28-262';
const Q1 = '2026-10-10-303';
const R304 = '2026-10-10-304';
const R328 = '2026-10-13-328';

const HAS_DIED: QuestionDefinition = {
  key: 'has_died',
  kind: 'single',
  copyKey: `${NS}.has_died.question`,
  options: opts('has_died', ['died', 'not_died', 'not_sure', 'did_not_know']),
  optional: false,
  showIf: null,
  sensitive: false,
  warning: true,
  approvedBy: [FQ10],
  health: false,
  counselBasis: null,
};

const DEATH_DATE: QuestionDefinition = {
  key: 'death_date',
  kind: 'date',
  copyKey: `${NS}.death_date.question`,
  options: opts('death_date', ['unknown']),
  optional: true,
  showIf: { key: 'has_died', anyOf: ['died'] },
  sensitive: true,
  warning: true,
  approvedBy: [FQ8E],
  health: false,
  counselBasis: null,
};

/** v1 — historical (`-262` FQ8 E, `-263` FQ10, `-303`). */
export const PEER_MESH_QUESTIONNAIRE_V1: QuestionnaireDefinition = {
  kind: 'peer_mesh',
  versionId: 'peer_mesh.v1',
  version: 1,
  scope: { kind: 'all' },
  status: 'historical',
  approvedBy: [FQ8E, FQ10, Q1],
  pages: [{ questions: [HAS_DIED, DEATH_DATE] }],
  closingNoteCopyKey: `${NS}.closing_note`,
  thankYouCopyKey: `${NS}.thank_you`,
};

/** v2 — `2026-10-10-304`, exactly as ruled; HISTORICAL since Story 6.27b (`-329` decision 1 — v3 is live). */
export const PEER_MESH_QUESTIONNAIRE_V2: QuestionnaireDefinition = {
  kind: 'peer_mesh',
  versionId: 'peer_mesh.v2',
  version: 2,
  scope: { kind: 'all' },
  status: 'historical',
  approvedBy: [FQ8E, FQ10, R304],
  pages: [
    { questions: [HAS_DIED, DEATH_DATE] },
    {
      questions: [
        {
          key: 'how_known',
          kind: 'single',
          copyKey: `${NS}.how_known.question`,
          options: opts('how_known', ['last_rites_or_visit', 'family_told', 'heard_from_others', 'other']),
          optional: true,
          showIf: null,
          sensitive: false,
          warning: false,
          approvedBy: [R304],
          health: false,
          counselBasis: null,
        },
        {
          key: 'relationship',
          kind: 'single',
          copyKey: `${NS}.relationship.question`,
          options: opts('relationship', ['relative', 'neighbour', 'school_colleague', 'other']),
          optional: true,
          showIf: null,
          sensitive: false,
          warning: false,
          approvedBy: [R304],
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
          options: opts('death_cause', [
            'illness_long',
            'illness_sudden',
            'old_age',
            'accident',
            'suicide',
            'killed',
            'other',
            'dont_know',
          ]),
          optional: true,
          showIf: { key: 'has_died', anyOf: ['died'] },
          sensitive: true,
          warning: false,
          approvedBy: [R304],
          health: true,
          counselBasis: 'pending',
        },
        {
          key: 'death_illness',
          kind: 'multi',
          copyKey: `${NS}.death_illness.question`,
          options: opts(
            'death_illness',
            ['cancer', 'heart_disease', 'diabetes', 'kidney_disease', 'liver_disease', 'tb', 'stroke_paralysis', 'lung_disease', 'other', 'dont_know'],
            ['dont_know'],
          ),
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
    {
      questions: [
        {
          key: 'callback_consent',
          kind: 'yes_no',
          copyKey: `${NS}.callback_consent.question`,
          options: opts('callback_consent', ['yes', 'no']),
          optional: true,
          showIf: null,
          sensitive: false,
          warning: false,
          approvedBy: [R304],
          health: false,
          counselBasis: null,
          callbackAudience: 'district_admin',
        },
      ],
    },
  ],
  closingNoteCopyKey: `${NS}.closing_note`,
  thankYouCopyKey: `${NS}.thank_you`,
};

/**
 * v3 — Story 6.27b (`2026-10-13-328` decision 2 read with `-329` decisions 1–3); LIVE (all Pariwars). v2's pages with
 * ONE change: the call-back question names "the Admin" (a NEW copy key) and its audience is `admin`.
 */
export const PEER_MESH_QUESTIONNAIRE_V3: QuestionnaireDefinition = {
  ...PEER_MESH_QUESTIONNAIRE_V2,
  versionId: 'peer_mesh.v3',
  version: 3,
  scope: { kind: 'all' },
  status: 'live',
  approvedBy: [FQ8E, FQ10, R304, R328],
  pages: PEER_MESH_QUESTIONNAIRE_V2.pages.map((page) => ({
    questions: page.questions.map((q) =>
      q.key === 'callback_consent'
        ? { ...q, copyKey: `${NS}.callback_consent.question_admin`, approvedBy: [R304, R328], callbackAudience: 'admin' as const }
        : q,
    ),
  })),
};
