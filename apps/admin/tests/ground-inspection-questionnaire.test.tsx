// Story 6.32 (Task 7 / 8.1; AC7, AC8, AC10, IQ8 (A), TR12, TR13) — the inspector's questions for the family, and the staff
// view of the family's account. The api client is mocked; the real Query cache and the real `PeerAnswerEditor` run.
//   · the panel: ⛔ panel on a 404 (IQ12); the English line with the Hindi line beneath; a single → radio, a multi →
//     checkboxes with "the family does not know" exclusive; each answer saved on change (PUT, the codes only);
//     `Saved` / `Saving…` / `Not saved — retrying`; a NETWORK failure retried in memory and at once on `online`; the
//     leave warning while unsaved; a 422 waits for "Try saving again";
//   · the page: the panel BEFORE the completion on a scheduled full visit, ⛔ on a certificate check;
//   · TR12 — every compared key has a discrepancy line; ③ says the family's answer in English words;
//   · TR13 — ⛔ browser storage anywhere in the module; I1 — the completion's readiness reads ⛔ of the questionnaire;
//   · AC8 / AC10 — the staff view: the head's letter ALWAYS said (collected / not collected / not recorded), the cause's
//     labels, "background only"; on `empty` too.

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { GroundInspectionFamilyAccountVisit } from '@twt/contracts';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as api from '../src/api/client.js';
import { PeerMeshSectionView } from '../src/modules/claim-verification/PeerMeshView.js';
import { DISCREPANCY_LINE, GroundInspectionPage } from '../src/modules/ground-inspection/GroundInspectionPage.js';
import { QuestionnairePanel } from '../src/modules/ground-inspection/QuestionnairePanel.js';
import { renderWithClient } from './_helpers.js';

vi.mock('../src/api/client.js', async () => {
  const actual = await vi.importActual<typeof import('../src/api/client.js')>('../src/api/client.js');
  return {
    ...actual,
    listGroundInspection: vi.fn(),
    getGroundInspectionQuestionnaire: vi.fn(),
    saveGroundInspectionAnswer: vi.fn(),
  };
});

const PARIWAR = '11111111-1111-1111-1111-111111111111';
const CLAIM = '22222222-2222-2222-2222-222222222222';
const GID = '33333333-3333-3333-3333-333333333333';

const w = (en: string, hi: string) => ({ en, hi });
const opt = (code: string, en: string, exclusive = false) => ({ code, words: w(en, `${en} (hi)`), exclusive });
/** A served definition with counsel's basis RECORDED (the shipped v1 serves the letter alone). */
const QUESTIONNAIRE: api.GroundInspectionQuestionnaireT = {
  groundInspectionId: GID,
  open: true,
  answers: [],
  questionnaire: {
    versionId: 'ground_inspection.v1',
    pages: [
      { questions: [{ key: 'head_letter', kind: 'single', words: w('Did you collect a letter?', 'क्या आपने पत्र लिया?'), options: [opt('collected', 'Yes — I collected the letter'), opt('not_collected', 'No — no letter was collected')], optional: true, showIf: null }] },
      { questions: [{ key: 'death_cause', kind: 'single', words: w('How did Ram die?', 'राम का निधन कैसे हुआ?'), options: [opt('illness_long', 'Illness over a long time'), opt('accident', 'Accident')], optional: true, showIf: null }] },
      {
        questions: [
          {
            key: 'death_illness',
            kind: 'multi',
            words: w('Does the family know which illness?', 'क्या परिवार जानता है?'),
            options: [opt('cancer', 'Cancer'), opt('tb', 'TB'), opt('dont_know', 'The family does not know', true)],
            optional: true,
            showIf: { key: 'death_cause', anyOf: ['illness_long'] },
          },
        ],
      },
    ],
    closingNote: w('These answers are only background.', 'ये उत्तर केवल पृष्ठभूमि हैं।'),
    thankYou: w('Answers saved.', 'उत्तर सहेज लिए गए।'),
  },
};
const ok = (questionKey: string, supersededDependants: string[] = []): api.GroundInspectionSaveAnswerT => ({
  questionKey,
  written: true,
  supersededDependants,
  questionnaireVersionId: 'ground_inspection.v1',
});

function renderPanel() {
  return renderWithClient(<QuestionnairePanel pariwarId={PARIWAR} claimCaseId={CLAIM} groundInspectionId={GID} />);
}

describe('<QuestionnairePanel> (AC7; IQ8 (A))', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('⛔ panel when the server has ⛔ questionnaire (404 — IQ12)', async () => {
    vi.mocked(api.getGroundInspectionQuestionnaire).mockRejectedValue(new api.ApiError(404, 'ground_inspection.questionnaire_unavailable', 'none'));
    const { container } = renderPanel();
    await waitFor(() => expect(api.getGroundInspectionQuestionnaire).toHaveBeenCalled());
    await waitFor(() => expect(container).toBeEmptyDOMElement());
  });

  it('the English line, the Hindi line beneath it (lang="hi"), the options; the "optional" note; the closing note in both', async () => {
    vi.mocked(api.getGroundInspectionQuestionnaire).mockResolvedValue(QUESTIONNAIRE);
    renderPanel();
    const letter = await screen.findByTestId('gi-questionnaire-head_letter');
    expect(within(letter).getByText('Did you collect a letter?')).toBeInTheDocument();
    expect(screen.getByTestId('gi-questionnaire-head_letter-hi')).toHaveAttribute('lang', 'hi');
    expect(screen.getByTestId('gi-questionnaire-head_letter-hi')).toHaveTextContent('क्या आपने पत्र लिया?');
    expect(within(letter).getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByTestId('gi-questionnaire-optional')).toHaveTextContent(/optional/);
    expect(screen.getByText(/These answers are only background/)).toBeInTheDocument();
    // the illness is shown ONLY after an illness cause (showIf)
    expect(screen.queryByTestId('gi-questionnaire-death_illness')).toBeNull();
  });

  it('saves on change (the codes only), shows `Saving…` then `Saved`; an illness cause shows the illness; "does not know" stands alone', async () => {
    vi.mocked(api.getGroundInspectionQuestionnaire).mockResolvedValue(QUESTIONNAIRE);
    let release!: () => void;
    vi.mocked(api.saveGroundInspectionAnswer).mockImplementationOnce(
      (_p, _c, _g, key) => new Promise((resolve) => { release = () => resolve(ok(key)); }),
    );
    vi.mocked(api.saveGroundInspectionAnswer).mockImplementation(async (_p, _c, _g, key) => ok(key));
    renderPanel();
    const cause = await screen.findByTestId('gi-questionnaire-death_cause');
    fireEvent.click(within(cause).getByLabelText(/Illness over a long time/));
    expect(await screen.findByTestId('gi-questionnaire-death_cause-state')).toHaveTextContent('Saving…');
    expect(screen.getByTestId('gi-questionnaire-unsaved')).toBeInTheDocument();
    await act(async () => release());
    await waitFor(() => expect(screen.getByTestId('gi-questionnaire-death_cause-state')).toHaveTextContent('Saved'));
    expect(api.saveGroundInspectionAnswer).toHaveBeenCalledWith(PARIWAR, CLAIM, GID, 'death_cause', ['illness_long']);
    const illness = await screen.findByTestId('gi-questionnaire-death_illness');
    fireEvent.click(within(illness).getByLabelText(/^Cancer/));
    await waitFor(() => expect(api.saveGroundInspectionAnswer).toHaveBeenLastCalledWith(PARIWAR, CLAIM, GID, 'death_illness', ['cancer']));
    fireEvent.click(within(illness).getByLabelText(/^TB/));
    await waitFor(() => expect(api.saveGroundInspectionAnswer).toHaveBeenLastCalledWith(PARIWAR, CLAIM, GID, 'death_illness', ['cancer', 'tb']));
    fireEvent.click(within(illness).getByLabelText(/The family does not know/));
    await waitFor(() => expect(api.saveGroundInspectionAnswer).toHaveBeenLastCalledWith(PARIWAR, CLAIM, GID, 'death_illness', ['dont_know']));
    fireEvent.click(within(illness).getByLabelText(/^TB/));
    await waitFor(() => expect(api.saveGroundInspectionAnswer).toHaveBeenLastCalledWith(PARIWAR, CLAIM, GID, 'death_illness', ['tb']));
  });

  it('⭐ IQ8 (A) — a NETWORK failure is `Not saved — retrying`, retried IN MEMORY, and sent again at once on `online`; the leave warning while unsaved', async () => {
    vi.mocked(api.getGroundInspectionQuestionnaire).mockResolvedValue(QUESTIONNAIRE);
    vi.mocked(api.saveGroundInspectionAnswer).mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.mocked(api.saveGroundInspectionAnswer).mockImplementation(async (_p, _c, _g, key) => ok(key));
    renderPanel();
    const letter = await screen.findByTestId('gi-questionnaire-head_letter');
    fireEvent.click(within(letter).getByLabelText(/Yes — I collected/));
    await waitFor(() => expect(screen.getByTestId('gi-questionnaire-head_letter-state')).toHaveTextContent('Not saved — retrying'));
    // the tab is warned while the answer is unsaved
    const leave = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(leave);
    expect(leave.defaultPrevented).toBe(true);
    // the network comes back ⇒ the retry goes out NOW — well inside the 1 s first backoff (⛔ wait for it)
    expect(api.saveGroundInspectionAnswer).toHaveBeenCalledTimes(1);
    await act(async () => window.dispatchEvent(new Event('online')));
    await waitFor(() => expect(api.saveGroundInspectionAnswer).toHaveBeenCalledTimes(2), { timeout: 300 });
    await waitFor(() => expect(screen.getByTestId('gi-questionnaire-head_letter-state')).toHaveTextContent('Saved'));
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('a 422 is ⛔ retried by itself — the error is said and "Try saving again" sends it again', async () => {
    vi.mocked(api.getGroundInspectionQuestionnaire).mockResolvedValue(QUESTIONNAIRE);
    vi.mocked(api.saveGroundInspectionAnswer).mockRejectedValueOnce(new api.ApiError(422, 'questionnaire.answer_invalid', 'no', { reason: 'invalid_value' }));
    vi.mocked(api.saveGroundInspectionAnswer).mockImplementation(async (_p, _c, _g, key) => ok(key));
    renderPanel();
    const letter = await screen.findByTestId('gi-questionnaire-head_letter');
    fireEvent.click(within(letter).getByLabelText(/No — no letter/));
    expect(await within(letter).findByRole('alert')).toHaveTextContent('This answer cannot be saved.');
    expect(api.saveGroundInspectionAnswer).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
    await waitFor(() => expect(screen.getByTestId('gi-questionnaire-head_letter-state')).toHaveTextContent('Saved'));
  });

  it('the saved answers come back on load', async () => {
    vi.mocked(api.getGroundInspectionQuestionnaire).mockResolvedValue({ ...QUESTIONNAIRE, answers: [{ questionKey: 'head_letter', value: { kind: 'codes', codes: ['not_collected'] } }] });
    renderPanel();
    const letter = await screen.findByTestId('gi-questionnaire-head_letter');
    expect(within(letter).getByLabelText(/No — no letter/)).toBeChecked();
    expect(screen.getByTestId('gi-questionnaire-head_letter-state')).toHaveTextContent('Saved');
  });
});

describe('the page mounts the panel (AC7)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());
  const assignment = (over: Partial<api.GroundInspectionAssignmentT> = {}): api.GroundInspectionAssignmentT => ({
    groundInspectionId: GID,
    district: 'Patna',
    block: null,
    inspectionStage: 'initial',
    inspectionSiteType: 'family_residence',
    inspectorActorId: 'inspector-1',
    scheduledAt: '2026-07-10T12:00:00.000Z',
    status: 'scheduled',
    refusalReason: null,
    supersedesGroundInspectionId: null,
    completedAt: null,
    structuredFindings: null,
    locationDetail: null,
    familyContact: null,
    notes: null,
    notesWithheld: null,
    photos: [],
    originalCertificateVerdict: null,
    comparedCertificateToken: null,
    deathDateSource: null,
    deathDate: null,
    deathTime: null,
    ...over,
  });
  async function load() {
    fireEvent.change(screen.getByLabelText('Claim case id'), { target: { value: CLAIM } });
    fireEvent.change(screen.getByLabelText('District (your jurisdiction)'), { target: { value: 'Patna' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load assignments' }));
  }
  it('BEFORE the completion on a scheduled full visit', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [assignment()] });
    vi.mocked(api.getGroundInspectionQuestionnaire).mockResolvedValue(QUESTIONNAIRE);
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await load();
    const panel = await screen.findByTestId('gi-questionnaire');
    const complete = screen.getByRole('button', { name: /Complete/ });
    expect(panel.compareDocumentPosition(complete) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it('⛔ on a certificate check (⛔ request at all)', async () => {
    vi.mocked(api.listGroundInspection).mockResolvedValue({ assignments: [assignment({ inspectionStage: 'certificate_check' })] });
    renderWithClient(<GroundInspectionPage pariwarId={PARIWAR} />);
    await load();
    await screen.findByRole('button', { name: /Complete/ });
    expect(screen.queryByTestId('gi-questionnaire')).toBeNull();
    expect(api.getGroundInspectionQuestionnaire).not.toHaveBeenCalled();
  });
});

describe('TR12 — the discrepancy lines are a TABLE over every compared key', () => {
  const shown = (over: Partial<Extract<api.InspectionDiscrepancyT, { state: 'shown' }>> = {}) => ({
    state: 'shown' as const,
    questionKeys: [...api.INSPECTION_DISCREPANCY_KEYS],
    familyDeathDate: { status: 'shown' as const, date: '2026-06-15' },
    familyAnswers: {
      death_cause: { status: 'shown' as const, codes: ['accident'], labels: ['Accident (road, drowning, electric shock, snake bite, fire, other)'] },
      death_illness: { status: 'unavailable' as const },
    },
    ...over,
  });
  it('every compared key has its OWN line (⛔ the date sentence for a cause)', () => {
    expect(Object.keys(DISCREPANCY_LINE).sort()).toEqual([...api.INSPECTION_DISCREPANCY_KEYS].sort());
    const lines = api.INSPECTION_DISCREPANCY_KEYS.map((k) => DISCREPANCY_LINE[k](shown()));
    expect(new Set(lines).size).toBe(lines.length);
    expect(DISCREPANCY_LINE.death_date(shown())).toBe("The family said: 2026-06-15. A neighbour's answer differs.");
    expect(DISCREPANCY_LINE.death_cause(shown())).toBe("The family said: Accident (road, drowning, electric shock, snake bite, fire, other). A neighbour's answer differs.");
    expect(DISCREPANCY_LINE.death_illness(shown())).toBe("The family said: —. A neighbour's answer differs.");
    expect(DISCREPANCY_LINE.death_cause(shown())).not.toContain('2026-06-15');
  });
});

describe('source pins (TR13, I1)', () => {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.resolve(here, '../src/modules/ground-inspection');
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  it('TR13 — ⛔ localStorage / sessionStorage / IndexedDB anywhere in the inspector\'s module', () => {
    const files = readdirSync(dir).filter((f) => /\.tsx?$/.test(f));
    expect(files).toContain('QuestionnairePanel.tsx');
    for (const f of files) {
      const code = strip(readFileSync(path.join(dir, f), 'utf8'));
      for (const re of [/localStorage/, /sessionStorage/, /indexedDB/i, /persistQueryClient|createSyncStoragePersister/]) {
        expect(re.test(code), `${f} reached for ${String(re)}`).toBe(false);
      }
    }
    // ⭐ TEETH — the scan fires on a specimen
    expect(/localStorage/.test(strip('window.localStorage.setItem("a", "b");'))).toBe(true);
  });
  it('I1 — the completion\'s readiness reads ⛔ of the questionnaire', () => {
    const page = strip(readFileSync(path.join(dir, 'GroundInspectionPage.tsx'), 'utf8'));
    const start = page.indexOf('function CompleteAction(');
    const body = page.slice(start, page.indexOf('\nfunction ', start + 1));
    expect(start).toBeGreaterThan(0);
    for (const re of [/questionnaire/i, /Questionnaire/, /head_letter/, /death_cause/]) expect(re.test(body), String(re)).toBe(false);
  });
});

describe('AC8 / AC10 — the staff view of the family\'s account', () => {
  afterEach(() => cleanup());
  const visit = (answers: GroundInspectionFamilyAccountVisit['answers']): GroundInspectionFamilyAccountVisit => ({
    groundInspectionId: GID,
    completedAt: '2026-10-12T05:00:00.000Z',
    answers,
  });
  it('on an `empty` section (⛔ selection): the letter said, the cause\'s labels, "background only"', () => {
    render(
      <PeerMeshSectionView
        section={{
          status: 'empty',
          familyAccount: [
            visit([
              { questionKey: 'head_letter', question: 'Did you collect a letter?', value: { kind: 'codes', codes: ['not_collected'], labels: ['No — no letter was collected'] }, savedAt: 'x' },
              { questionKey: 'death_cause', question: 'How did Ram die?', value: { kind: 'codes', codes: ['old_age'], labels: ['Old age'] }, savedAt: 'x' },
            ]),
          ],
        }}
      />,
    );
    expect(screen.getByTestId('section-state-empty')).toBeInTheDocument();
    const fam = screen.getByTestId('family-account');
    expect(within(fam).getByTestId('family-account-letter')).toHaveTextContent('Not collected');
    expect(within(fam).getByTestId('family-account-death_cause')).toHaveTextContent('How did Ram die?Old age');
    expect(fam).toHaveTextContent('Background only — never a reason to hold, flag or refuse the claim.');
  });
  it('the letter is said even when ⛔ recorded ("Not recorded"); an undecryptable answer "could not be shown"; `collected`', () => {
    const { unmount } = render(
      <PeerMeshSectionView
        section={{ status: 'empty', familyAccount: [visit([{ questionKey: 'death_cause', question: 'How did Ram die?', value: { kind: 'unavailable' }, savedAt: 'x' }])] }}
      />,
    );
    expect(screen.getByTestId('family-account-letter')).toHaveTextContent('Not recorded');
    expect(screen.getByTestId('family-account-death_cause')).toHaveTextContent('This answer could not be shown');
    unmount();
    render(
      <PeerMeshSectionView
        section={{ status: 'empty', familyAccount: [visit([{ questionKey: 'head_letter', question: 'q', value: { kind: 'codes', codes: ['collected'], labels: ['Yes'] }, savedAt: 'x' }])] }}
      />,
    );
    expect(screen.getByTestId('family-account-letter')).toHaveTextContent('Collected');
  });
  it('⛔ block at all when the family account is empty; ⛔ on `unavailable`', () => {
    const { unmount } = render(<PeerMeshSectionView section={{ status: 'empty', familyAccount: [] }} />);
    expect(screen.queryByTestId('family-account')).toBeNull();
    unmount();
    render(<PeerMeshSectionView section={{ status: 'unavailable' }} />);
    expect(screen.queryByTestId('family-account')).toBeNull();
  });
});
