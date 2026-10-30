// Story 6.33 (Task 7; AC9) — the questionnaires page: the version in force and R8's "failed validation / out of date,
// serving …" line; the history (the out-of-scope line — QE11); the read-only render (English, Hindi beneath, badges, change
// markers); approve with BOTH ticks (QE9 / QE10) and return with a note; the Super Admin's make-live (This Pariwar / All —
// the Pariwars keeping their own version listed; the QE10 counsel warning VERBATIM per kind; the base-moved acknowledgement);
// the step-up flow on a 403 that re-runs the act; the editor's C12 guidance; direct with a reason and both ticks; a 422's
// problems said.
//
// Code review (2026-10-30) patches RV5 / RV13 / RV14 / RV15 / RV16 / RV17 / RV18 / RV19 / RV21 / RV29 are the second block
// (`describe('code review patches …')`): the direct path's base-moved acknowledgement, the keeping-own list that gates the
// confirm, the acknowledgement that cannot go stale, per-call outcomes, Revert for a skipped own version, the direct path's
// counsel warning for a ruled health question, the CURRENT ruled questions locked, a paused query, the editor details, and the
// live regions / names.
//
// Round 2 of the review (`describe('review round 2 …')`, last): RP7 the proposal names the ruled questions the screen LOCKS (the
// newest Panel version's), RP12 the base-moved tick dies with its warning, RP13 the every-Pariwar confirm rests on a FRESH list
// that can be asked for again, RP14 an act starts from a clean slate.

import { onlineManager } from '@tanstack/react-query';
import { act, cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { QuestionnaireVersionDetailResponse, QuestionnaireVersionListResponse } from '@twt/contracts';
import { ApiError } from '../src/api/client.js';
import { renderWithClient } from './_helpers.js';

const PARIWAR = '22222222-2222-4222-8222-222222222222';
const h = vi.hoisted(() => ({ grants: [] as string[] }));

vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getSession: async () => ({ userId: '11111111-1111-4111-8111-111111111111', nationalGrants: h.grants }),
    getQuestionnaireVersions: vi.fn(),
    getGlobalQuestionnaireVersions: vi.fn(),
    getQuestionnaireVersionDetail: vi.fn(),
    getGlobalQuestionnaireVersion: vi.fn(),
    getPariwarsKeepingOwnQuestionnaire: vi.fn(),
    proposeQuestionnaireVersion: vi.fn(),
    approveQuestionnaireVersion: vi.fn(),
    returnQuestionnaireVersion: vi.fn(),
    withdrawQuestionnaireVersion: vi.fn(),
    makeQuestionnaireVersionLive: vi.fn(),
    directQuestionnaireVersion: vi.fn(),
    revertQuestionnairePariwar: vi.fn(),
    requestStepUp: vi.fn(async () => ({ sent: true })),
    verifyStepUp: vi.fn(async () => ({ verified: true })),
  };
});

const api = vi.mocked(await import('../src/api/client.js'));
const { QuestionnaireVersionsPage } = await import('../src/modules/questionnaire-versions/index.js');
const { questionnaireVersionsEn: t } = await import('../src/modules/questionnaire-versions/i18n-en.js');

const W = (en: string, hi: string) => ({ en, hi });
const summary = (over: Partial<QuestionnaireVersionListResponse['versions'][number]> = {}): QuestionnaireVersionListResponse['versions'][number] => ({
  versionId: 'peer_mesh.v1000',
  kind: 'peer_mesh',
  version: 1000,
  stage: 'proposed',
  baseVersionId: 'peer_mesh.v4',
  ruledBaseCodeVersionId: 'peer_mesh.v4',
  originPariwarId: PARIWAR,
  direct: false,
  reason: null,
  authoredByDisplay: 'Asha',
  authoredByMe: true,
  authoredAt: '2026-10-30T05:00:00.000Z',
  outOfDate: false,
  valid: true,
  steps: [{ step: 'proposed', targetPariwarId: null, actorDisplay: 'Asha', note: null, at: '2026-10-30T05:00:00.000Z', hindiReviewed: null, classificationAttested: null }],
  historyElsewhere: false,
  ...over,
});
const LIST = (over: Partial<QuestionnaireVersionListResponse> = {}): QuestionnaireVersionListResponse => ({
  inForce: [
    { kind: 'peer_mesh', versionId: 'peer_mesh.v4', source: 'code', skipped: [] },
    { kind: 'ground_inspection', versionId: 'ground_inspection.v1', source: 'code', skipped: [] },
  ],
  versions: [summary()],
  ...over,
});
const question = (over: Partial<QuestionnaireVersionDetailResponse['questions'] & object>[number] | object = {}) => ({
  key: 'water_source',
  kind: 'single' as const,
  ruled: false,
  words: W('Where did {member} get water?', '{member} पानी कहाँ से लाते थे?'),
  options: [
    { code: 'well', words: W('A well', 'कुआँ'), exclusive: false },
    { code: 'tap', words: W('A tap', 'नल'), exclusive: false },
  ],
  optional: true,
  showIf: null,
  health: false,
  counselPending: false,
  sensitive: true,
  change: 'new' as const,
  ...over,
});
const DETAIL = (over: Partial<QuestionnaireVersionDetailResponse> = {}): QuestionnaireVersionDetailResponse => ({
  ...summary(),
  questions: [
    question({ key: 'has_died', ruled: true, sensitive: false, change: 'unchanged', words: W('Has {member} died?', 'क्या {member} का निधन हो गया है?') }),
    question(),
  ],
  pages: [['has_died'], ['water_source']],
  closingNote: W('Closing', 'समापन'),
  removedKeys: ['old_q'],
  warnings: [],
  problems: [],
  ...over,
});

beforeEach(() => {
  h.grants = [];
  vi.clearAllMocks();
  api.getQuestionnaireVersions.mockResolvedValue(LIST());
  api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST());
  api.getQuestionnaireVersionDetail.mockResolvedValue(DETAIL());
  api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL());
  api.getPariwarsKeepingOwnQuestionnaire.mockResolvedValue({ pariwars: [{ pariwarId: 'x', name: 'Jaipur Pariwar', versionId: 'peer_mesh.v1001' }] });
  // (`clearAllMocks` leaves a once-queue behind: a leg that fails half-way must ⛔ poison the next one)
  api.revertQuestionnairePariwar.mockReset();
  for (const fn of [api.approveQuestionnaireVersion, api.returnQuestionnaireVersion, api.makeQuestionnaireVersionLive, api.directQuestionnaireVersion, api.proposeQuestionnaireVersion]) {
    fn.mockReset();
    fn.mockResolvedValue({ versionId: 'peer_mesh.v1000', warnings: [] });
  }
});
afterEach(cleanup);

const render = () => renderWithClient(<QuestionnaireVersionsPage pariwarId={PARIWAR} />);
async function open(): Promise<HTMLElement> {
  render();
  const row = await screen.findByTestId('qv-version-peer_mesh.v1000');
  await userEvent.click(within(row).getByRole('button', { name: t.viewVersion('peer_mesh.v1000') }));
  return screen.findByTestId('qv-detail');
}

describe('<QuestionnaireVersionsPage> (AC9)', () => {
  it('the version in force per kind; R8 — a skipped version is SAID ("failed validation / out of date, serving …")', async () => {
    api.getQuestionnaireVersions.mockResolvedValue(
      LIST({ inForce: [{ kind: 'peer_mesh', versionId: 'peer_mesh.v4', source: 'code', skipped: [{ versionId: 'peer_mesh.v1003', level: 'own', reason: 'stale' }] }, { kind: 'ground_inspection', versionId: 'ground_inspection.v1', source: 'code', skipped: [] }] }),
    );
    render();
    expect(await screen.findByTestId('qv-in-force-peer_mesh')).toHaveTextContent('peer_mesh.v4');
    expect(screen.getByTestId('qv-skipped-peer_mesh.v1003')).toHaveTextContent('In force: peer_mesh.v1003 — out of date, serving peer_mesh.v4.');
    expect(api.getGlobalQuestionnaireVersions).not.toHaveBeenCalled();
  });

  it('QE11 — a version proposed elsewhere reads "Proposed and approved in another Pariwar"', async () => {
    api.getQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'published', historyElsewhere: true, authoredByMe: false })] }));
    render();
    expect(await screen.findByTestId('qv-history-elsewhere')).toHaveTextContent('Proposed and approved in another Pariwar');
  });

  it('the render: English line, Hindi beneath (lang="hi"), the badges, the change markers and a removed question', async () => {
    const d = await open();
    const q = within(d).getByTestId('qv-question-water_source');
    expect(q).toHaveTextContent('Where did {member} get water?');
    expect(within(q).getByText('{member} पानी कहाँ से लाते थे?').closest('[lang="hi"]')).not.toBeNull();
    expect(q).toHaveTextContent('Added by staff');
    expect(q).toHaveTextContent('Answers encrypted');
    expect(within(d).getByTestId('qv-change-water_source')).toHaveTextContent('New');
    expect(within(d).getByTestId('qv-question-has_died')).toHaveTextContent('Ruled (locked)');
    expect(within(d).getByTestId('qv-removed-old_q')).toHaveTextContent('Removed');
  });

  it('QE9 / QE10 — approve sends BOTH ticks as ticked; return needs a note', async () => {
    const d = await open();
    const box = within(d).getByTestId('qv-approve');
    await userEvent.click(within(box).getByLabelText(t.hindiTick));
    await userEvent.click(within(box).getByRole('button', { name: t.approve }));
    await waitFor(() => expect(api.approveQuestionnaireVersion).toHaveBeenCalledWith(PARIWAR, 'peer_mesh.v1000', { hindiReviewed: true, classificationAttested: false }, expect.any(String)));
    expect(within(box).getByRole('button', { name: t.returnIt })).toBeDisabled();
    fireEvent.change(within(box).getByLabelText(t.returnNote), { target: { value: 'Please reword' } });
    await userEvent.click(within(box).getByRole('button', { name: t.returnIt }));
    await waitFor(() => expect(api.returnQuestionnaireVersion).toHaveBeenCalledWith(PARIWAR, 'peer_mesh.v1000', 'Please reword', expect.any(String)));
  });

  it('the Super Admin reads the GLOBAL list; make live for ALL lists the Pariwars keeping their own version; the counsel warning VERBATIM per kind', async () => {
    h.grants = ['questionnaire.publish'];
    const pending = question({ key: 'diet', health: true, counselPending: true });
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' })] }));
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved', questions: [pending] }));
    const d = await open();
    expect(api.getGlobalQuestionnaireVersions).toHaveBeenCalledWith(PARIWAR);
    const box = within(d).getByTestId('qv-make-live');
    expect(within(box).getByTestId('qv-counsel-warning')).toHaveTextContent(
      "This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded, the neighbours in this Pariwar will not be texted and the question will not be shown.",
    );
    await userEvent.click(within(box).getByLabelText(t.scopeAll));
    expect(await within(box).findByTestId('qv-keeping-own')).toHaveTextContent('1 Pariwar keeps its own version: Jaipur Pariwar');
    expect(within(box).getByTestId('qv-counsel-warning')).toHaveTextContent('the neighbours in every Pariwar will not be texted');
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenCalledWith('peer_mesh.v1000', { targetPariwarId: null, acknowledgeBaseMoved: false }, expect.any(String)));
  });

  it("the ground_inspection counsel warning is ITS OWN words (⛔ texts — the question is not shown at the visit)", () => {
    expect(t.counselWarning('ground_inspection', 'this')).toBe(
      "This version has a health question that counsel has not yet cleared. Until counsel's basis is recorded, the question will not be shown at the visit in this Pariwar.",
    );
    expect(t.counselWarning('ground_inspection', 'every')).toMatch(/at the visit in every Pariwar\.$/);
  });

  it('QE7 (e) — base moved: the acknowledgement appears, and the retry carries it', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    api.makeQuestionnaireVersionLive.mockRejectedValueOnce(new ApiError(409, 'questionnaire.base_moved', 'moved'));
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    expect(await within(box).findByTestId('qv-base-moved')).toHaveTextContent(t.baseMoved);
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeDisabled();
    await userEvent.click(within(box).getByLabelText(t.baseMovedAck));
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenLastCalledWith('peer_mesh.v1000', { targetPariwarId: PARIWAR, acknowledgeBaseMoved: true }, expect.any(String)));
  });

  it('a 403 auth.step_up_required opens the step-up; after verify the act is RE-RUN', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    api.makeQuestionnaireVersionLive.mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'step up'));
    const d = await open();
    await userEvent.click(within(within(d).getByTestId('qv-make-live')).getByRole('button', { name: t.makeLive }));
    const step = await screen.findByTestId('qv-step-up');
    await userEvent.click(within(step).getByRole('button', { name: t.stepUpSend }));
    await waitFor(() => expect(api.requestStepUp).toHaveBeenCalledWith('questionnaire_publish'));
    fireEvent.change(await within(step).findByLabelText(t.stepUpCode), { target: { value: '123456' } });
    await userEvent.click(within(step).getByRole('button', { name: t.stepUpVerify }));
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByTestId('qv-step-up')).toBeNull());
  });

  it('the editor: the C12 guidance; the Panel questions locked; propose sends the ruled ones BY KEY and each staff question on its own page; a 422 says its problems', async () => {
    api.getQuestionnaireVersionDetail.mockResolvedValue(DETAIL({ versionId: 'peer_mesh.v4', stage: 'code', questions: [question({ key: 'has_died', ruled: true, change: null })], pages: [['has_died']] }));
    api.proposeQuestionnaireVersion.mockRejectedValueOnce(new ApiError(422, 'questionnaire.definition_invalid', 'no', { problems: ["question 'x': C1 — a reserved key"] }));
    render();
    const pm = await screen.findByTestId('qv-kind-peer_mesh');
    await userEvent.click(within(pm).getByRole('button', { name: t.newVersion }));
    const ed = await screen.findByTestId('qv-editor');
    expect(within(ed).getByTestId('qv-guidance')).toHaveTextContent('never about the person answering');
    expect(within(ed).getByTestId('qv-question-has_died')).toHaveTextContent('Ruled (locked)');
    await userEvent.click(within(ed).getByRole('button', { name: t.addQuestion }));
    const q = within(ed).getByTestId('qv-edit-0');
    fireEvent.change(within(q).getByLabelText(t.key), { target: { value: 'water_source' } });
    fireEvent.change(within(q).getByLabelText(t.questionEn), { target: { value: 'Where did {member} get water?' } });
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    await waitFor(() => expect(api.proposeQuestionnaireVersion).toHaveBeenCalled());
    const body = api.proposeQuestionnaireVersion.mock.calls[0]![1];
    expect(body).toMatchObject({ kind: 'peer_mesh', baseVersionId: 'peer_mesh.v4' });
    expect(body.pages[0]).toEqual({ questions: [{ ruled: true, key: 'has_died' }] });
    expect(body.pages[1]!.questions[0]).toMatchObject({ key: 'water_source', text: { en: 'Where did {member} get water?', hi: '' } });
    expect(await screen.findByTestId('qv-error')).toHaveTextContent("question 'x': C1 — a reserved key");
  });

  it("the Super Admin's direct path: a REQUIRED reason and both ticks, for This Pariwar", async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ versionId: 'peer_mesh.v4', stage: 'code', questions: [question({ key: 'has_died', ruled: true, change: null })], pages: [['has_died']] }));
    render();
    const pm = await screen.findByTestId('qv-kind-peer_mesh');
    await userEvent.click(within(pm).getByRole('button', { name: t.newVersion }));
    const direct = await screen.findByTestId('qv-direct');
    expect(within(direct).getByRole('button', { name: t.makeLiveDirect })).toBeDisabled();
    fireEvent.change(within(direct).getByLabelText(t.directReason), { target: { value: 'Adding the other-claim question' } });
    await userEvent.click(within(direct).getByLabelText(t.hindiTick));
    await userEvent.click(within(direct).getByLabelText(t.classificationTick));
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    await waitFor(() =>
      expect(api.directQuestionnaireVersion).toHaveBeenCalledWith(
        expect.objectContaining({ kind: 'peer_mesh', targetPariwarId: PARIWAR, reason: 'Adding the other-claim question', hindiReviewed: true, classificationAttested: true }),
        expect.any(String),
      ),
    );
  });
});

// ── Code review (2026-10-30) ─────────────────────────────────────────────────────────────────────────────────────────────

const GI_IN_FORCE = { kind: 'ground_inspection' as const, versionId: 'ground_inspection.v1', source: 'code' as const, skipped: [] };
const BASE_MOVED = () => new ApiError(409, 'questionnaire.base_moved', 'moved');
const ruledQ = (over: object = {}) => question({ key: 'has_died', ruled: true, sensitive: false, change: null, ...over });
/** The Panel's version 4 as the editor's base: one ruled question. */
const codeDetail = (over: Partial<QuestionnaireVersionDetailResponse> = {}) =>
  DETAIL({ versionId: 'peer_mesh.v4', stage: 'code', questions: [ruledQ()], pages: [['has_died']], ...over });
async function openEditor(): Promise<HTMLElement> {
  render();
  const pm = await screen.findByTestId('qv-kind-peer_mesh');
  await userEvent.click(within(pm).getByRole('button', { name: t.newVersion }));
  return screen.findByTestId('qv-editor');
}

describe('code review patches — the direct path, the acknowledgement, the confirm', () => {
  afterEach(() => onlineManager.setOnline(true));

  it('RV5 / QE7 (b) — the direct path asks for the base-moved acknowledgement INSIDE its own block, and the retry sends acknowledgeBaseMoved', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(codeDetail());
    api.directQuestionnaireVersion.mockRejectedValueOnce(BASE_MOVED());
    await openEditor();
    const direct = screen.getByTestId('qv-direct');
    expect(within(direct).queryByTestId('qv-direct-base-moved')).toBeNull();
    fireEvent.change(within(direct).getByLabelText(t.directReason), { target: { value: 'Adding the other-claim question' } });
    await userEvent.click(within(direct).getByLabelText(t.hindiTick));
    await userEvent.click(within(direct).getByLabelText(t.classificationTick));
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    expect(await within(direct).findByTestId('qv-direct-base-moved')).toHaveTextContent(t.baseMoved);
    expect(api.directQuestionnaireVersion.mock.calls[0]![0]).toMatchObject({ acknowledgeBaseMoved: false });
    // nothing is said by the page's error line — the acknowledgement IS the message — and the button waits for the tick
    expect(screen.queryByTestId('qv-error')).toBeNull();
    expect(within(direct).getByRole('button', { name: t.makeLiveDirect })).toBeDisabled();
    await userEvent.click(within(direct).getByLabelText(t.baseMovedAck));
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    await waitFor(() => expect(api.directQuestionnaireVersion).toHaveBeenCalledTimes(2));
    expect(api.directQuestionnaireVersion.mock.calls[1]![0]).toMatchObject({ kind: 'peer_mesh', targetPariwarId: PARIWAR, acknowledgeBaseMoved: true });
  });

  it("RV5 — the editor's base-moved does ⛔ appear in a version panel open beside it", async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' })] }));
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) => (id === 'peer_mesh.v4' ? codeDetail() : DETAIL({ stage: 'approved' })));
    api.directQuestionnaireVersion.mockRejectedValueOnce(BASE_MOVED());
    const panel = await open();
    const pm = screen.getByTestId('qv-kind-peer_mesh');
    await userEvent.click(within(pm).getByRole('button', { name: t.newVersion }));
    const direct = await screen.findByTestId('qv-direct');
    fireEvent.change(within(direct).getByLabelText(t.directReason), { target: { value: 'Because' } });
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    expect(await within(direct).findByTestId('qv-direct-base-moved')).toBeInTheDocument();
    expect(within(within(panel).getByTestId('qv-make-live')).queryByTestId('qv-base-moved')).toBeNull();
  });

  it('RV14 — a stale tick is ⛔ sent: a scope change unticks, a success resets, and another version / the editor opening clears the warning', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(
      LIST({ versions: [summary({ stage: 'approved' }), summary({ versionId: 'peer_mesh.v1001', version: 1001, stage: 'approved' })] }),
    );
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) => DETAIL({ versionId: id, stage: 'approved' }));
    api.makeQuestionnaireVersionLive
      .mockRejectedValueOnce(BASE_MOVED()) // 1 — the warning
      .mockResolvedValueOnce({ versionId: 'peer_mesh.v1000', warnings: [] }) // 2 — the acknowledged one
      .mockRejectedValueOnce(BASE_MOVED()) // 3 — a LATER make-live in the same panel
      .mockRejectedValueOnce(BASE_MOVED()); // 4 — on the other version
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    const makeLive = () => within(box).getByRole('button', { name: t.makeLive });
    await userEvent.click(makeLive());
    await within(box).findByTestId('qv-base-moved');
    // the tick belongs to the scope it was given for
    await userEvent.click(within(box).getByLabelText(t.baseMovedAck));
    expect(within(box).getByLabelText(t.baseMovedAck)).toBeChecked();
    await userEvent.click(within(box).getByLabelText(t.scopeAll));
    expect(within(box).getByLabelText(t.baseMovedAck)).not.toBeChecked();
    await userEvent.click(within(box).getByLabelText(t.scopeThis));
    expect(within(box).getByLabelText(t.baseMovedAck)).not.toBeChecked();
    await userEvent.click(within(box).getByLabelText(t.baseMovedAck));
    await userEvent.click(makeLive());
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenCalledTimes(2));
    expect(api.makeQuestionnaireVersionLive.mock.calls[1]![1]).toEqual({ targetPariwarId: PARIWAR, acknowledgeBaseMoved: true });
    await waitFor(() => expect(within(box).queryByTestId('qv-base-moved')).toBeNull());
    // a second make-live in the SAME panel: the old tick is gone — never `true` for a warning that was not shown for it
    await userEvent.click(makeLive());
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenCalledTimes(3));
    expect(api.makeQuestionnaireVersionLive.mock.calls[2]![1]).toEqual({ targetPariwarId: PARIWAR, acknowledgeBaseMoved: false });
    await within(box).findByTestId('qv-base-moved');
    // another version: the warning is about the OLD one
    await userEvent.click(within(screen.getByTestId('qv-version-peer_mesh.v1001')).getByRole('button', { name: t.viewVersion('peer_mesh.v1001') }));
    await waitFor(() => expect(screen.getByTestId('qv-detail')).toHaveTextContent('peer_mesh.v1001'));
    expect(screen.queryByTestId('qv-base-moved')).toBeNull();
    // the editor opening clears a warning too
    await userEvent.click(within(screen.getByTestId('qv-make-live')).getByRole('button', { name: t.makeLive }));
    await screen.findByTestId('qv-base-moved');
    await userEvent.click(within(screen.getByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion }));
    await screen.findByTestId('qv-editor');
    expect(screen.queryByTestId('qv-base-moved')).toBeNull();
  });

  it('RV14 — a tick given for a warning that has since been CLEARED (the editor opened) is ⛔ sent with the next make-live', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) => (id === 'peer_mesh.v4' ? codeDetail() : DETAIL({ stage: 'approved' })));
    api.makeQuestionnaireVersionLive.mockRejectedValueOnce(BASE_MOVED()).mockResolvedValueOnce({ versionId: 'peer_mesh.v1000', warnings: [] });
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' })] }));
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    await userEvent.click(await within(box).findByLabelText(t.baseMovedAck));
    expect(within(box).getByLabelText(t.baseMovedAck)).toBeChecked();
    await userEvent.click(within(screen.getByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion })); // clears the warning
    await waitFor(() => expect(within(box).queryByTestId('qv-base-moved')).toBeNull());
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenCalledTimes(2));
    expect(api.makeQuestionnaireVersionLive.mock.calls[1]![1]).toEqual({ targetPariwarId: PARIWAR, acknowledgeBaseMoved: false });
  });

  it('RV15 — Revert is disabled while an act is pending; two quick clicks each keep their OWN outcome (the first one’s step-up prompt is ⛔ dropped)', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ inForce: [{ kind: 'peer_mesh', versionId: 'peer_mesh.v1003', source: 'own', skipped: [] }, GI_IN_FORCE] }));
    api.revertQuestionnairePariwar.mockReset();
    api.revertQuestionnairePariwar
      .mockRejectedValueOnce(new ApiError(403, 'auth.step_up_required', 'step up'))
      .mockResolvedValueOnce({ versionId: 'peer_mesh.v4', warnings: [] });
    render();
    const revert = await screen.findByTestId('qv-revert-peer_mesh');
    // both clicks land before React re-renders (one batch) — the button is still enabled for the second
    act(() => {
      revert.click();
      revert.click();
    });
    await waitFor(() => expect(api.revertQuestionnairePariwar).toHaveBeenCalledTimes(2));
    expect(await screen.findByTestId('qv-step-up')).toBeInTheDocument(); // the FIRST call's outcome
    expect(await screen.findByTestId('qv-saved')).toBeInTheDocument(); // the SECOND call's
  });

  it('RV15 — while a revert is in flight its button is disabled', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ inForce: [{ kind: 'peer_mesh', versionId: 'peer_mesh.v1003', source: 'own', skipped: [] }, GI_IN_FORCE] }));
    api.revertQuestionnairePariwar.mockReset();
    api.revertQuestionnairePariwar.mockImplementationOnce(() => new Promise(() => {}));
    render();
    await userEvent.click(await screen.findByTestId('qv-revert-peer_mesh'));
    await waitFor(() => expect(screen.getByTestId('qv-revert-peer_mesh')).toBeDisabled());
  });

  it('RV16 / QE7 (d) — Revert is offered for a SKIPPED own version too; never for a skipped all-Pariwar one, nor when nothing is own (the code version in force, nothing skipped)', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(
      LIST({
        inForce: [
          { kind: 'peer_mesh', versionId: 'peer_mesh.v4', source: 'code', skipped: [{ versionId: 'peer_mesh.v1003', level: 'own', reason: 'stale' }] },
          { kind: 'ground_inspection', versionId: 'ground_inspection.v1', source: 'code', skipped: [{ versionId: 'ground_inspection.v1004', level: 'all', reason: 'invalid' }] },
        ],
      }),
    );
    api.revertQuestionnairePariwar.mockResolvedValue({ versionId: 'peer_mesh.v4', warnings: [] });
    render();
    const revert = await screen.findByTestId('qv-revert-peer_mesh');
    expect(screen.queryByTestId('qv-revert-ground_inspection')).toBeNull();
    await userEvent.click(revert);
    await waitFor(() => expect(api.revertQuestionnairePariwar).toHaveBeenCalledWith({ kind: 'peer_mesh', targetPariwarId: PARIWAR }, expect.any(String)));
    // … and NONE: the Panel's version in force (`source: 'code'`) with nothing skipped has no Revert for either kind (RP19)
    cleanup();
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST());
    render();
    await screen.findByTestId('qv-in-force-peer_mesh');
    expect(screen.queryByTestId('qv-revert-peer_mesh')).toBeNull();
    expect(screen.queryByTestId('qv-revert-ground_inspection')).toBeNull();
  });

  it('RV17 / QE10 — the direct path warns for a RULED health question whose counsel basis is pending (no staff health question needed)', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(
      codeDetail({ questions: [ruledQ({ key: 'death_cause', health: true, counselPending: true })], pages: [['death_cause']] }),
    );
    await openEditor();
    const direct = screen.getByTestId('qv-direct');
    expect(within(direct).getByTestId('qv-direct-counsel-warning')).toHaveTextContent('the neighbours in this Pariwar will not be texted');
    await userEvent.click(within(direct).getByLabelText(t.scopeAll));
    expect(within(direct).getByTestId('qv-direct-counsel-warning')).toHaveTextContent('the neighbours in every Pariwar will not be texted');
  });

  it('RV17 — and ⛔ when nothing is pending (a ruled question that is not health; a health one whose basis is recorded)', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(
      codeDetail({ questions: [ruledQ(), ruledQ({ key: 'death_cause', health: true, counselPending: false })], pages: [['has_died', 'death_cause']] }),
    );
    await openEditor();
    expect(within(screen.getByTestId('qv-direct')).queryByTestId('qv-direct-counsel-warning')).toBeNull();
  });

  it("RV18 / QE5 — the editor shows the CURRENT ruled questions (the newest Panel version's), ⛔ the old words of its base", async () => {
    const oldWords = W('Has {member} passed away (old wording)?', 'पुराना');
    const newWords = W('Has {member} died (the Panel’s current wording)?', 'नया');
    api.getQuestionnaireVersions.mockResolvedValue(
      LIST({
        inForce: [{ kind: 'peer_mesh', versionId: 'peer_mesh.v1000', source: 'all', skipped: [] }, GI_IN_FORCE],
        versions: [
          summary({ versionId: 'peer_mesh.v5', version: 5, stage: 'code', baseVersionId: null, originPariwarId: null }),
          summary({ versionId: 'peer_mesh.v4', version: 4, stage: 'code', baseVersionId: null, originPariwarId: null }),
          summary({ outOfDate: true }),
        ],
      }),
    );
    api.getQuestionnaireVersionDetail.mockImplementation(async (_p, id) =>
      id === 'peer_mesh.v5'
        ? codeDetail({ versionId: 'peer_mesh.v5', questions: [ruledQ({ words: newWords })] })
        : DETAIL({ versionId: id, stage: 'proposed', outOfDate: true, questions: [ruledQ({ words: oldWords }), question()], pages: [['has_died'], ['water_source']] }),
    );
    api.proposeQuestionnaireVersion.mockResolvedValue({ versionId: 'peer_mesh.v1001', warnings: [] });
    render();
    const pm = await screen.findByTestId('qv-kind-peer_mesh');
    await userEvent.click(within(pm).getByRole('button', { name: t.newVersion }));
    const ed = await screen.findByTestId('qv-editor');
    await waitFor(() => expect(within(ed).getByTestId('qv-question-has_died')).toHaveTextContent('the Panel’s current wording'));
    expect(ed).not.toHaveTextContent('old wording');
    // the staff question of the BASE is still the editable one, and the ruled one still goes by key
    expect(within(ed).getByTestId('qv-edit-0')).toBeInTheDocument();
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    await waitFor(() => expect(api.proposeQuestionnaireVersion).toHaveBeenCalled());
    expect(api.proposeQuestionnaireVersion.mock.calls[0]![1].pages[0]).toEqual({ questions: [{ ruled: true, key: 'has_died' }] });
  });

  it('RV18 — when the current ruled questions cannot be read the base’s are shown, and it is SAID', async () => {
    api.getQuestionnaireVersions.mockResolvedValue(
      LIST({
        inForce: [{ kind: 'peer_mesh', versionId: 'peer_mesh.v1000', source: 'all', skipped: [] }, GI_IN_FORCE],
        versions: [summary({ versionId: 'peer_mesh.v4', version: 4, stage: 'code', baseVersionId: null, originPariwarId: null }), summary()],
      }),
    );
    api.getQuestionnaireVersionDetail.mockImplementation(async (_p, id) => {
      if (id === 'peer_mesh.v4') throw new ApiError(500, 'internal', 'boom');
      return DETAIL({ versionId: id, questions: [ruledQ({ words: W('Base words', 'आधार') })], pages: [['has_died']] });
    });
    const ed = await openEditor();
    expect(await within(ed).findByTestId('qv-ruled-unavailable')).toHaveTextContent(t.ruledUnavailable);
    expect(within(ed).getByTestId('qv-question-has_died')).toHaveTextContent('Base words');
  });

  it('RV19 — an offline (paused) list says it is loading, ⛔ crashes; it renders when the network is back', async () => {
    onlineManager.setOnline(false);
    render();
    expect(await screen.findByRole('status')).toHaveTextContent(t.loading);
    expect(screen.queryByTestId('questionnaire-versions-page')).toBeNull();
    act(() => onlineManager.setOnline(true));
    expect(await screen.findByTestId('qv-in-force-peer_mesh')).toBeInTheDocument();
  });

  it('RV19 — a version whose detail is paused (offline) says it is loading — ⛔ an error alert', async () => {
    render();
    const row = await screen.findByTestId('qv-version-peer_mesh.v1000');
    onlineManager.setOnline(false);
    await userEvent.click(within(row).getByRole('button', { name: t.viewVersion('peer_mesh.v1000') }));
    expect(await screen.findByText(t.loading)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    act(() => onlineManager.setOnline(true));
    expect(await screen.findByTestId('qv-detail')).toBeInTheDocument();
  });

  it('RV13 / QE7 (a) — make live for EVERY Pariwar waits for the keeping-own list: loading is said, the list is said, the plural reads right', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    let release!: (v: Awaited<ReturnType<typeof api.getPariwarsKeepingOwnQuestionnaire>>) => void;
    api.getPariwarsKeepingOwnQuestionnaire.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeEnabled(); // this Pariwar: nothing to list
    await userEvent.click(within(box).getByLabelText(t.scopeAll));
    expect(within(box).getByTestId('qv-keeping-own-loading')).toHaveTextContent(t.keepingLoading);
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeDisabled();
    await act(async () => release({ pariwars: [{ pariwarId: 'x', name: 'Jaipur', versionId: 'peer_mesh.v1001' }, { pariwarId: 'y-id', name: null, versionId: 'peer_mesh.v1002' }] }));
    const list = await within(box).findByTestId('qv-keeping-own');
    expect(list).toHaveTextContent('2 Pariwars keep their own version: Jaipur, y-id');
    expect(list).toHaveAttribute('role', 'status');
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeEnabled();
    expect(t.keepingOwn(0, '')).toBe('No Pariwar keeps its own version.');
    expect(t.keepingOwn(1, 'A')).toBe('1 Pariwar keeps its own version: A');
  });

  it('RV13 — a list that FAILED is said (an alert) and the every-Pariwar confirm stays disabled', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    api.getPariwarsKeepingOwnQuestionnaire.mockRejectedValue(new ApiError(500, 'internal', 'boom'));
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByLabelText(t.scopeAll));
    expect(await within(box).findByTestId('qv-keeping-own-error')).toHaveTextContent(t.keepingError);
    expect(within(box).getByTestId('qv-keeping-own-error')).toHaveAttribute('role', 'alert');
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeDisabled();
    await userEvent.click(within(box).getByLabelText(t.scopeThis));
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeEnabled();
  });
});

describe('code review patches — the editor’s details, history, and names (RV21 / RV29)', () => {
  it('RV21 — a question changed AWAY from "several choices" loses its "stands alone" flags (the validator would refuse them and the editor could not clear them)', async () => {
    const multi = question({
      key: 'diet',
      kind: 'multi',
      change: null,
      options: [
        { code: 'veg', words: W('Vegetarian', 'शाकाहारी'), exclusive: false },
        { code: 'none', words: W('None of these', 'कोई नहीं'), exclusive: true },
      ],
    });
    api.getQuestionnaireVersionDetail.mockResolvedValue(codeDetail({ questions: [ruledQ(), multi], pages: [['has_died'], ['diet']] }));
    api.proposeQuestionnaireVersion.mockResolvedValue({ versionId: 'peer_mesh.v1001', warnings: [] });
    const ed = await (async () => {
      render();
      await userEvent.click(within(await screen.findByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion }));
      return screen.findByTestId('qv-editor');
    })();
    const q = within(ed).getByTestId('qv-edit-0');
    expect(within(q).getByLabelText(t.standsAloneFor(1, 2))).toBeChecked();
    fireEvent.change(within(q).getByRole('combobox'), { target: { value: 'single' } });
    expect(within(q).queryByLabelText(t.standsAloneFor(1, 2))).toBeNull();
    // … and back to "several choices" brings the checkbox back, UNTICKED (the flag went with the kind)
    fireEvent.change(within(q).getByRole('combobox'), { target: { value: 'multi' } });
    expect(within(q).getByLabelText(t.standsAloneFor(1, 2))).not.toBeChecked();
    fireEvent.change(within(q).getByRole('combobox'), { target: { value: 'yes_no' } });
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    await waitFor(() => expect(api.proposeQuestionnaireVersion).toHaveBeenCalled());
    const options = (api.proposeQuestionnaireVersion.mock.calls[0]![1].pages[1]!.questions[0] as { options: object[] }).options;
    expect(options).toHaveLength(2);
    for (const o of options) expect(Object.keys(o).sort()).toEqual(['code', 'text']);
  });

  it('RV21 — the showIf "codes" input keeps a typed comma, so a second code can be TYPED', async () => {
    const dependent = question({ key: 'water_detail', change: null, showIf: { key: 'water_source', anyOf: ['well'] } });
    api.getQuestionnaireVersionDetail.mockResolvedValue(codeDetail({ questions: [ruledQ(), dependent], pages: [['has_died'], ['water_detail']] }));
    api.proposeQuestionnaireVersion.mockResolvedValue({ versionId: 'peer_mesh.v1001', warnings: [] });
    render();
    await userEvent.click(within(await screen.findByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion }));
    const ed = await screen.findByTestId('qv-editor');
    const codes = within(within(ed).getByTestId('qv-edit-0')).getByLabelText(t.showAfterCodes);
    expect(codes).toHaveValue('well');
    await userEvent.type(codes, ',');
    expect(codes).toHaveValue('well,');
    await userEvent.type(codes, 'tap');
    expect(codes).toHaveValue('well,tap');
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    await waitFor(() => expect(api.proposeQuestionnaireVersion).toHaveBeenCalled());
    expect(api.proposeQuestionnaireVersion.mock.calls[0]![1].pages[1]!.questions[0]).toMatchObject({ showIf: { key: 'water_source', anyOf: ['well', 'tap'] } });
  });

  it('RV21 — a 400 request.validation NAMES the failing field(s)', async () => {
    api.getQuestionnaireVersionDetail.mockResolvedValue(codeDetail());
    api.proposeQuestionnaireVersion.mockRejectedValueOnce(
      new ApiError(400, 'request.validation', 'Request failed schema validation', {
        issues: [
          { keyword: 'too_small', instancePath: '/pages/1/questions/0/text/en', message: 'String must contain at least 1 character(s)' },
          { keyword: 'invalid_type', instancePath: '/baseVersionId', message: 'Required' },
        ],
      }),
    );
    render();
    await userEvent.click(within(await screen.findByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion }));
    const ed = await screen.findByTestId('qv-editor');
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    const err = await screen.findByTestId('qv-error');
    expect(err).toHaveTextContent(t.errors['request.validation']!);
    expect(err).toHaveTextContent('pages › 1 › questions › 0 › text › en — String must contain at least 1 character(s)');
    expect(err).toHaveTextContent('baseVersionId — Required');
  });

  it('RV21 — history says "for this Pariwar" for this page’s Pariwar (another one keeps its id)', async () => {
    const other = '99999999-9999-4999-8999-999999999999';
    const at = '2026-10-30T06:00:00.000Z';
    api.getQuestionnaireVersions.mockResolvedValue(
      LIST({
        versions: [
          summary({
            stage: 'published',
            steps: [
              { step: 'made_live', targetPariwarId: PARIWAR, actorDisplay: 'Su', note: null, at, hindiReviewed: null, classificationAttested: null },
              { step: 'made_live', targetPariwarId: other, actorDisplay: 'Su', note: null, at, hindiReviewed: null, classificationAttested: null },
              { step: 'made_live', targetPariwarId: null, actorDisplay: 'Su', note: null, at, hindiReviewed: null, classificationAttested: null },
            ],
          }),
        ],
      }),
    );
    render();
    const history = await screen.findByTestId('qv-history-peer_mesh.v1000');
    expect(history).toHaveTextContent('Made live — Su');
    expect(history).toHaveTextContent('for this Pariwar');
    expect(history).toHaveTextContent(`for Pariwar ${other}`);
    expect(history).toHaveTextContent('for every Pariwar');
  });

  it('RV29 — the act’s confirmation and the C9 warnings are said in ONE live region; the detail’s warnings and the keeping-own list are live regions', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved', warnings: ['A detail warning'] }));
    api.makeQuestionnaireVersionLive.mockResolvedValue({ versionId: 'peer_mesh.v1000', warnings: ['Ruled question reworded'] });
    const d = await open();
    expect(within(d).getByTestId('qv-detail-warnings')).toHaveAttribute('role', 'status');
    const live = screen.getByTestId('qv-status');
    expect(live).toHaveAttribute('role', 'status');
    expect(live).toBeEmptyDOMElement(); // present BEFORE anything is said (so the reader hears what arrives)
    await userEvent.click(within(within(d).getByTestId('qv-make-live')).getByRole('button', { name: t.makeLive }));
    expect(await within(live).findByTestId('qv-saved')).toHaveTextContent(t.saved);
    expect(within(live).getByTestId('qv-warnings')).toHaveTextContent('Ruled question reworded');
  });

  it('RV29 — both scope groups and every question group are NAMED (a legend); each View button and each option input has its own name', async () => {
    h.grants = ['questionnaire.publish'];
    const two = question({
      key: 'diet',
      kind: 'multi',
      change: null,
      options: [
        { code: 'a', words: W('A', 'ए'), exclusive: false },
        { code: 'b', words: W('B', 'बी'), exclusive: false },
      ],
    });
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' }), summary({ versionId: 'peer_mesh.v1001', version: 1001, stage: 'approved' })] }));
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) => (id === 'peer_mesh.v4' ? codeDetail({ questions: [ruledQ(), two], pages: [['has_died'], ['diet']] }) : DETAIL({ versionId: id, stage: 'approved' })));
    render();
    const views = (await screen.findAllByRole('button', { name: /^View peer_mesh\.v/ })).map((b) => b.getAttribute('aria-label'));
    expect(views).toEqual(['View peer_mesh.v1000', 'View peer_mesh.v1001']);
    expect(screen.queryAllByRole('button', { name: t.view })).toHaveLength(0); // ⛔ two buttons that read the same
    await userEvent.click(screen.getByRole('button', { name: t.viewVersion('peer_mesh.v1000') }));
    const panel = await screen.findByTestId('qv-detail');
    expect(within(panel).getByRole('group', { name: t.scopeLegend })).toBeInTheDocument();
    await userEvent.click(within(screen.getByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion }));
    const ed = await screen.findByTestId('qv-editor');
    expect(within(ed).getByRole('group', { name: t.directScopeLegend })).toBeInTheDocument();
    expect(within(ed).getByRole('group', { name: t.questionLegend(1, 'diet') })).toBeInTheDocument();
    await userEvent.click(within(ed).getByRole('button', { name: t.addQuestion }));
    expect(within(ed).getByRole('group', { name: t.questionLegend(2, '') })).toBeInTheDocument();
    const names = [...within(ed).getByTestId('qv-edit-0').querySelectorAll('input[aria-label]')].map((i) => i.getAttribute('aria-label'));
    expect(names.length).toBe(2 * 3 + 2); // two options × (code, English, Hindi) + two "stands alone"
    expect(new Set(names).size).toBe(names.length);
  });
});

// ── Round 2 of the code review (2026-10-30) ──────────────────────────────────────────────────────────────────────────────

describe('review round 2 — RP7 / RP12 / RP13 / RP14', () => {
  afterEach(() => onlineManager.setOnline(true));
  const NEWEST_CODE = 'peer_mesh.v5';
  /** peer_mesh.v1000 is the version in force and the editor's BASE; the newest Panel version is v5. */
  const twoVersions = () =>
    LIST({
      inForce: [{ kind: 'peer_mesh', versionId: 'peer_mesh.v1000', source: 'all', skipped: [] }, GI_IN_FORCE],
      versions: [
        summary({ versionId: NEWEST_CODE, version: 5, stage: 'code', baseVersionId: null, originPariwarId: null }),
        summary({ versionId: 'peer_mesh.v4', version: 4, stage: 'code', baseVersionId: null, originPariwarId: null }),
        summary({ stage: 'approved' }),
      ],
    });
  const ruledPage = (...keys: string[]) => ({ questions: keys.map((key) => ({ ruled: true as const, key })) });

  // RP7 — the base and the newest Panel version DIFFER in a ruled key; the request names the Panel version's, as the screen locks.
  it.each([
    {
      change: 'a ruled key ADDED by the Panel',
      baseRuled: ['has_died'],
      basePages: [['has_died'], ['water_source']],
      codeRuled: ['has_died', 'death_cause'],
      codePages: [['has_died', 'death_cause']],
      expected: [ruledPage('has_died', 'death_cause')],
    },
    {
      change: 'a ruled key REMOVED by the Panel',
      baseRuled: ['has_died', 'death_cause'],
      basePages: [['has_died', 'death_cause'], ['water_source']],
      codeRuled: ['has_died'],
      codePages: [['has_died']],
      expected: [ruledPage('has_died')],
    },
    {
      change: 'the ruled keys REGROUPED by the Panel',
      baseRuled: ['has_died', 'death_cause'],
      basePages: [['has_died', 'death_cause'], ['water_source']],
      codeRuled: ['has_died', 'death_cause'],
      codePages: [['has_died'], ['death_cause']],
      expected: [ruledPage('has_died'), ruledPage('death_cause')],
    },
  ])('RP7 / QE5 — $change: the proposal names the NEWEST Panel version’s ruled keys and layout, ⛔ the base’s', async ({ baseRuled, basePages, codeRuled, codePages, expected }) => {
    api.getQuestionnaireVersions.mockResolvedValue(twoVersions());
    api.getQuestionnaireVersionDetail.mockImplementation(async (_p, id) =>
      id === NEWEST_CODE
        ? DETAIL({ versionId: id, stage: 'code', questions: codeRuled.map((key) => ruledQ({ key })), pages: codePages })
        : DETAIL({ versionId: id, stage: 'approved', questions: [...baseRuled.map((key) => ruledQ({ key })), question()], pages: basePages }),
    );
    api.proposeQuestionnaireVersion.mockResolvedValue({ versionId: 'peer_mesh.v1001', warnings: [] });
    const ed = await openEditor();
    // what the screen locks IS the Panel version's …
    expect(within(ed).getAllByTestId(/^qv-question-/).map((el) => el.getAttribute('data-testid'))).toEqual(codeRuled.map((k) => `qv-question-${k}`));
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    await waitFor(() => expect(api.proposeQuestionnaireVersion).toHaveBeenCalled());
    const body = api.proposeQuestionnaireVersion.mock.calls[0]![1];
    expect(body.baseVersionId).toBe('peer_mesh.v1000');
    // … and so is what the request names (the staff question of the BASE follows, on its own page)
    expect(body.pages.slice(0, -1)).toEqual(expected);
    expect(body.pages.at(-1)!.questions).toHaveLength(1);
    expect(body.pages.at(-1)!.questions[0]).toMatchObject({ key: 'water_source' });
  });

  it('RP7 — the direct path names the same ruled keys (the Panel version’s)', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(twoVersions());
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) =>
      id === NEWEST_CODE
        ? DETAIL({ versionId: id, stage: 'code', questions: [ruledQ(), ruledQ({ key: 'death_cause' })], pages: [['has_died', 'death_cause']] })
        : DETAIL({ versionId: id, stage: 'approved', questions: [ruledQ(), question()], pages: [['has_died'], ['water_source']] }),
    );
    const ed = await openEditor();
    const direct = within(ed).getByTestId('qv-direct');
    fireEvent.change(within(direct).getByLabelText(t.directReason), { target: { value: 'Because' } });
    await userEvent.click(within(direct).getByLabelText(t.hindiTick));
    await userEvent.click(within(direct).getByLabelText(t.classificationTick));
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    await waitFor(() => expect(api.directQuestionnaireVersion).toHaveBeenCalled());
    expect(api.directQuestionnaireVersion.mock.calls[0]![0].pages.slice(0, -1)).toEqual([ruledPage('has_died', 'death_cause')]);
  });

  it('RP7 — when the newest Panel version cannot be read, the ruled keys come from the BASE — the same fallback as the display', async () => {
    api.getQuestionnaireVersions.mockResolvedValue(twoVersions());
    api.getQuestionnaireVersionDetail.mockImplementation(async (_p, id) => {
      if (id === NEWEST_CODE) throw new ApiError(500, 'internal', 'boom');
      return DETAIL({ versionId: id, stage: 'approved', questions: [ruledQ(), ruledQ({ key: 'death_cause' }), question()], pages: [['has_died', 'death_cause'], ['water_source']] });
    });
    api.proposeQuestionnaireVersion.mockResolvedValue({ versionId: 'peer_mesh.v1001', warnings: [] });
    const ed = await openEditor();
    expect(await within(ed).findByTestId('qv-ruled-unavailable')).toBeInTheDocument();
    expect(within(ed).getAllByTestId(/^qv-question-/).map((el) => el.getAttribute('data-testid'))).toEqual(['qv-question-has_died', 'qv-question-death_cause']);
    await userEvent.click(within(ed).getByRole('button', { name: t.propose }));
    await waitFor(() => expect(api.proposeQuestionnaireVersion).toHaveBeenCalled());
    expect(api.proposeQuestionnaireVersion.mock.calls[0]![1].pages[0]).toEqual(ruledPage('has_died', 'death_cause'));
  });

  // RP12 — the tick belongs to the warning it was given for.
  it('RP12 — a tick given for a warning that has CLEARED is ⛔ there when a LATER base_moved raises the box: UNTICKED, and Make live waits for a tick', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' })] }));
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) => (id === 'peer_mesh.v4' ? codeDetail() : DETAIL({ stage: 'approved' })));
    api.makeQuestionnaireVersionLive.mockRejectedValueOnce(BASE_MOVED()).mockRejectedValueOnce(BASE_MOVED());
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    await userEvent.click(await within(box).findByLabelText(t.baseMovedAck));
    expect(within(box).getByLabelText(t.baseMovedAck)).toBeChecked();
    // the warning is CLEARED (the editor opens) — the same panel stays mounted …
    await userEvent.click(within(screen.getByTestId('qv-kind-peer_mesh')).getByRole('button', { name: t.newVersion }));
    await waitFor(() => expect(within(box).queryByTestId('qv-base-moved')).toBeNull());
    // … and the server raises base_moved AGAIN
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    const again = await within(box).findByLabelText(t.baseMovedAck);
    expect(again).not.toBeChecked();
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeDisabled();
    await userEvent.click(again);
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeEnabled();
  });

  it('RP12 — the same for the editor’s direct path: the tick dies with its warning (another version viewed), and the re-raised box is UNTICKED', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' })] }));
    api.getGlobalQuestionnaireVersion.mockImplementation(async (id) => (id === 'peer_mesh.v4' ? codeDetail() : DETAIL({ stage: 'approved' })));
    api.directQuestionnaireVersion.mockRejectedValueOnce(BASE_MOVED()).mockRejectedValueOnce(BASE_MOVED());
    await openEditor();
    const direct = screen.getByTestId('qv-direct');
    fireEvent.change(within(direct).getByLabelText(t.directReason), { target: { value: 'Because' } });
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    await userEvent.click(await within(direct).findByLabelText(t.baseMovedAck));
    expect(within(direct).getByLabelText(t.baseMovedAck)).toBeChecked();
    // viewing a version clears the warning; the EDITOR stays open (and mounted)
    await userEvent.click(within(screen.getByTestId('qv-version-peer_mesh.v1000')).getByRole('button', { name: t.viewVersion('peer_mesh.v1000') }));
    await waitFor(() => expect(within(direct).queryByTestId('qv-direct-base-moved')).toBeNull());
    await userEvent.click(within(direct).getByRole('button', { name: t.makeLiveDirect }));
    const again = await within(direct).findByLabelText(t.baseMovedAck);
    expect(again).not.toBeChecked();
    expect(within(direct).getByRole('button', { name: t.makeLiveDirect })).toBeDisabled();
    expect(api.directQuestionnaireVersion.mock.calls[1]![0]).toMatchObject({ acknowledgeBaseMoved: false });
  });

  // RP13 — the confirm for EVERY Pariwar rests on a list that is fresh, and a failed list can be asked for again.
  it('RP13 — a STALE cached list (an act just invalidated it, the re-read is in flight) does ⛔ unlock the every-Pariwar confirm', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    api.getPariwarsKeepingOwnQuestionnaire
      .mockResolvedValueOnce({ pariwars: [{ pariwarId: 'x', name: 'Jaipur Pariwar', versionId: 'peer_mesh.v1001' }] })
      .mockImplementationOnce(() => new Promise(() => {})); // the re-read after the act never answers
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByLabelText(t.scopeAll));
    expect(await within(box).findByTestId('qv-keeping-own')).toHaveTextContent('Jaipur Pariwar');
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeEnabled();
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    await waitFor(() => expect(api.makeQuestionnaireVersionLive).toHaveBeenCalledTimes(1));
    // the success invalidated the page's reads: the cached list is being read again — it is ⛔ the list the confirm may rest on
    await waitFor(() => expect(api.getPariwarsKeepingOwnQuestionnaire).toHaveBeenCalledTimes(2));
    await within(box).findByTestId('qv-keeping-own-loading');
    expect(within(box).queryByTestId('qv-keeping-own')).toBeNull();
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeDisabled();
  });

  it('RP13 — a list that FAILED has a visible “Try again” in the alert, which reads it again; the confirm unlocks with the new list', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    api.getPariwarsKeepingOwnQuestionnaire.mockRejectedValueOnce(new ApiError(500, 'internal', 'boom'));
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByLabelText(t.scopeAll));
    expect(await within(box).findByTestId('qv-keeping-own-error')).toHaveTextContent(t.keepingError);
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeDisabled();
    await userEvent.click(within(box).getByRole('button', { name: t.keepingRetry }));
    expect(await within(box).findByTestId('qv-keeping-own')).toHaveTextContent('1 Pariwar keeps its own version: Jaipur Pariwar');
    expect(api.getPariwarsKeepingOwnQuestionnaire).toHaveBeenCalledTimes(2);
    expect(within(box).queryByTestId('qv-keeping-own-error')).toBeNull();
    expect(within(box).queryByRole('button', { name: t.keepingRetry })).toBeNull();
    expect(within(box).getByRole('button', { name: t.makeLive })).toBeEnabled();
  });

  // RP14 — a new act starts from a clean slate.
  it('RP14 — act 1 returned warnings and “Saved”; act 2 FAILS: act 1’s warnings and “Saved” are ⛔ on screen beside the failure', async () => {
    h.grants = ['questionnaire.publish'];
    api.getGlobalQuestionnaireVersions.mockResolvedValue(LIST({ versions: [summary({ stage: 'approved' })] }));
    api.getGlobalQuestionnaireVersion.mockResolvedValue(DETAIL({ stage: 'approved' }));
    api.makeQuestionnaireVersionLive
      .mockResolvedValueOnce({ versionId: 'peer_mesh.v1000', warnings: ['Ruled question reworded'] })
      .mockRejectedValueOnce(new ApiError(500, 'internal', 'boom'));
    const d = await open();
    const box = within(d).getByTestId('qv-make-live');
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    expect(await screen.findByTestId('qv-saved')).toBeInTheDocument();
    expect(screen.getByTestId('qv-warnings')).toHaveTextContent('Ruled question reworded');
    await userEvent.click(within(box).getByRole('button', { name: t.makeLive }));
    expect(await screen.findByTestId('qv-error')).toHaveTextContent(t.genericError);
    expect(screen.queryByTestId('qv-saved')).toBeNull();
    expect(screen.queryByTestId('qv-warnings')).toBeNull();
  });
});
