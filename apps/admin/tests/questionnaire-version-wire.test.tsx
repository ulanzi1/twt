// Story 6.33 review RV28 (AC5) — "a test asserts each request body": the admin panel's and the helpline's tests mock
// `api.save…` and assert the ARGUMENT, never the JSON the client builds. This drives the REAL client over a stubbed `fetch`:
//   · `saveGroundInspectionAnswer` / `saveHelplinePeerAnswer` put `questionnaireVersionId` in the body when given and leave the
//     key OUT when it is not (an old caller keeps the retryable stale — RVD2);
//   · the panel and the helpline card pass the RENDERED questionnaire's `versionId` all the way to the wire (the mutant "a
//     client NOT sending `questionnaireVersionId`" dies here).

import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { saveGroundInspectionAnswer, saveHelplinePeerAnswer } from '../src/api/client.js';
import { createQueryClient } from '../src/api/hooks.js';
import { QuestionnairePanel } from '../src/modules/ground-inspection/QuestionnairePanel.js';
import { HelplinePeerRequests } from '../src/modules/helpline-claims/HelplinePeerRequests.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const CLAIM = '22222222-2222-4222-8222-222222222222';
const GID = '33333333-3333-4333-8333-333333333333';
const MEMBER = '44444444-4444-4444-8444-444444444444';
const PING = '55555555-5555-4555-8555-555555555555';
const w = (en: string) => ({ en, hi: `hi:${en}` });

type Seen = { readonly url: string; readonly method: string; readonly body: unknown; readonly headers: Record<string, string> };
let seen: Seen[] = [];

/** `routes` maps "METHOD suffix" to the JSON answered; every request is recorded with its parsed body. */
function stubFetch(routes: Record<string, unknown>): void {
  seen = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET';
      seen.push({
        url,
        method,
        body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
        headers: (init?.headers ?? {}) as Record<string, string>,
      });
      const key = Object.keys(routes).find((k) => {
        const [m, suffix] = k.split(' ') as [string, string];
        return m === method && url.split('?')[0]!.endsWith(suffix);
      });
      if (key === undefined) return new Response(JSON.stringify({ error: { code: 'test.unrouted', message: `${method} ${url}` } }), { status: 500 });
      return new Response(JSON.stringify(routes[key]), { status: 200, headers: { 'content-type': 'application/json' } });
    }),
  );
}
const puts = () => seen.filter((s) => s.method === 'PUT');

beforeEach(() => vi.unstubAllGlobals());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('RV28 — the request BODIES the real client builds', () => {
  it('saveGroundInspectionAnswer — `questionnaireVersionId` is in the body when given, and the key is LEFT OUT when it is not', async () => {
    stubFetch({ 'PUT /answers/head_letter': { questionKey: 'head_letter', written: true, supersededDependants: [], questionnaireVersionId: 'ground_inspection.v1' } });
    await saveGroundInspectionAnswer(PARIWAR, CLAIM, GID, 'head_letter', ['collected'], 'ground_inspection.v1');
    await saveGroundInspectionAnswer(PARIWAR, CLAIM, GID, 'head_letter', ['collected']);
    expect(puts()).toHaveLength(2);
    expect(puts()[0]!.body).toEqual({ codes: ['collected'], questionnaireVersionId: 'ground_inspection.v1' });
    expect(puts()[1]!.body).toEqual({ codes: ['collected'] });
    expect(Object.keys(puts()[1]!.body as object)).toEqual(['codes']); // ⛔ `questionnaireVersionId: undefined`, ⛔ null
    expect(puts()[0]!.url).toBe(`/api/v1/p/${PARIWAR}/admin/claims/${CLAIM}/ground-inspection/${GID}/questionnaire/answers/head_letter`);
  });

  it('saveHelplinePeerAnswer — `questionnaireVersionId` is in the body when given, and the key is LEFT OUT when it is not; the Idempotency-Key rides along', async () => {
    stubFetch({ 'PUT /answers/has_died': { answers: [] } });
    await saveHelplinePeerAnswer(PARIWAR, MEMBER, PING, 'has_died', { codes: ['died'] }, 'key-1', 'peer_mesh.v2');
    await saveHelplinePeerAnswer(PARIWAR, MEMBER, PING, 'has_died', { codes: ['died'] }, 'key-2');
    expect(puts()).toHaveLength(2);
    expect(puts()[0]!.body).toEqual({ value: { codes: ['died'] }, questionnaireVersionId: 'peer_mesh.v2' });
    expect(puts()[1]!.body).toEqual({ value: { codes: ['died'] } });
    expect(Object.keys(puts()[1]!.body as object)).toEqual(['value']);
    expect(puts()[0]!.headers['Idempotency-Key']).toBe('key-1');
    expect(puts()[0]!.url).toBe(`/api/v1/p/${PARIWAR}/admin/claims/helpline/members/${MEMBER}/peer-requests/${PING}/answers/has_died`);
  });
});

describe('RV28 — the components send the RENDERED versionId all the way to the wire', () => {
  it('the inspector’s panel: an answer’s PUT body carries the served questionnaire’s versionId', async () => {
    stubFetch({
      'GET /questionnaire': {
        groundInspectionId: GID,
        open: true,
        answers: [],
        questionnaire: {
          versionId: 'ground_inspection.v1007',
          pages: [
            {
              questions: [
                {
                  key: 'head_letter',
                  kind: 'single',
                  words: w('Did you collect a letter?'),
                  options: [
                    { code: 'collected', words: w('Yes — I collected the letter'), exclusive: false },
                    { code: 'not_collected', words: w('No — no letter was collected'), exclusive: false },
                  ],
                  optional: true,
                  showIf: null,
                },
              ],
            },
          ],
          closingNote: w('These answers are only background.'),
          thankYou: w('Answers saved.'),
        },
      },
      'PUT /answers/head_letter': { questionKey: 'head_letter', written: true, supersededDependants: [], questionnaireVersionId: 'ground_inspection.v1007' },
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <QuestionnairePanel pariwarId={PARIWAR} claimCaseId={CLAIM} groundInspectionId={GID} viewerId="inspector-1" isInspector />
      </QueryClientProvider>,
    );
    fireEvent.click(within(await screen.findByTestId('gi-questionnaire-head_letter')).getByLabelText(/Yes — I collected/));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.body).toEqual({ codes: ['collected'], questionnaireVersionId: 'ground_inspection.v1007' });
  });

  it('the helpline card: an answer’s PUT body carries the served questionnaire’s versionId (and an Idempotency-Key)', async () => {
    stubFetch({
      'GET /peer-requests': {
        items: [
          {
            pingId: PING,
            memberName: 'Ram K.',
            questionnaire: {
              versionId: 'peer_mesh.v1007',
              pages: [
                {
                  questions: [
                    {
                      key: 'has_died',
                      kind: 'single',
                      words: w('Has Ram K. died?'),
                      options: [
                        { code: 'died', words: w('Yes, they have died'), exclusive: false },
                        { code: 'not_died', words: w('No, they have not died'), exclusive: false },
                      ],
                      optional: false,
                      showIf: null,
                    },
                  ],
                },
              ],
              closingNote: w('Your answers are saved as you go.'),
              thankYou: w('Thank you.'),
            },
            answers: [],
            submitted: false,
          },
        ],
      },
      'PUT /answers/has_died': { answers: [{ questionKey: 'has_died', value: { codes: ['died'] }, savedAt: '2026-10-30T05:00:00.000Z' }] },
    });
    render(
      <QueryClientProvider client={createQueryClient()}>
        <HelplinePeerRequests pariwarId={PARIWAR} memberId={MEMBER} identityConfirmed onStepUpRequired={() => {}} />
      </QueryClientProvider>,
    );
    await userEvent.click(await screen.findByRole('radio', { name: 'Yes, they have died' }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.body).toEqual({ value: { codes: ['died'] }, questionnaireVersionId: 'peer_mesh.v1007' });
    expect(puts()[0]!.headers['Idempotency-Key']).toEqual(expect.any(String));
  });
});
