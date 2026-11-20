// Story 13.1f (AC9, AC10, AC12; AD11, AD12; code review round 2, chunk D: R2D-3, R2D-14) — the register page's SHOWN NUMBER and LINK, as an
// officer perceives them. The first press of "Register" on a number that belongs to ended records REGISTERS NOBODY and shows them; a second
// press registers. So the page must say, where it is heard, that the worker is not registered yet (family 13 (d)), and the choice of which
// earlier record to link — at most ONE — must read as one choice. RTL with the API client mocked (the server's rules are the API specs').

import { QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  Outlet: () => null,
  useNavigate: () => vi.fn(),
  useParams: () => ({}),
  useRouter: () => ({ invalidate: vi.fn() }),
}));

const registerFieldWorker = vi.fn();
const getFieldWorkerDistricts = vi.fn();
const listFieldWorkerNotices = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    registerFieldWorker: (...a: unknown[]) => registerFieldWorker(...a),
    getFieldWorkerDistricts: (...a: unknown[]) => getFieldWorkerDistricts(...a),
    listFieldWorkerNotices: (...a: unknown[]) => listFieldWorkerNotices(...a),
  };
});

const { RegisterFieldWorkerPage } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const W = '00000000-0000-4000-8000-000000000001';
const A = '00000000-0000-4000-8000-000000000009';
const B = '00000000-0000-4000-8000-000000000008';
const ended = (id: string, on: string) => ({ field_worker_id: id, ended_on: on, reason_code: 'left_voluntarily' });
const created = { field_worker_id: W, district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' };

beforeEach(() => {
  for (const fn of [registerFieldWorker, getFieldWorkerDistricts, listFieldWorkerNotices]) fn.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
  listFieldWorkerNotices.mockResolvedValue({ items: [], next_cursor: null });
});

async function fillAndSubmit() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <RegisterFieldWorkerPage pariwarId={P} />
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar' } });
  fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500010' } });
  await screen.findByRole('option', { name: 'Patna' });
  const d = screen.getByTestId('fw-register-district') as HTMLSelectElement;
  fireEvent.change(d, { target: { value: [...d.options].find((o) => o.textContent === 'Patna')!.value } });
  fireEvent.click(screen.getByTestId('fw-register-submit'));
}

describe('R2D-3 — the first press shows the earlier records AND says nobody is registered yet', () => {
  it('a live region mounted EMPTY gets the line "not registered yet", focus goes to it (not the page heading), and nothing was registered', async () => {
    registerFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.number_previously_ended', 'ended', { previous_endings: [ended(A, '2026-10-01')] }));
    render(
      <QueryClientProvider client={createQueryClient()}>
        <RegisterFieldWorkerPage pariwarId={P} />
      </QueryClientProvider>,
    );
    // The region exists, empty, BEFORE the line arrives: a line that arrives into an existing live region is heard; one mounted with its
    // region is not reliably announced.
    const region = screen.getByTestId('fw-register-status');
    expect(region).toHaveAttribute('role', 'status');
    expect(region).toBeEmptyDOMElement();
    fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar' } });
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500010' } });
    await screen.findByRole('option', { name: 'Patna' });
    const d = screen.getByTestId('fw-register-district') as HTMLSelectElement;
    fireEvent.change(d, { target: { value: [...d.options].find((o) => o.textContent === 'Patna')!.value } });
    fireEvent.click(screen.getByTestId('fw-register-submit'));

    const notice = await within(region).findByTestId('fw-register-previous-notice');
    expect(screen.getByTestId('fw-register-status')).toBe(region); // the SAME node: the line arrived into the region that was already there
    expect(notice).toHaveTextContent(t('fw.register.previous.noticeOne'));
    expect(notice.textContent).toMatch(/not registered yet/);
    expect(document.activeElement).toBe(notice);
    expect(screen.getByTestId('fw-register-previous')).toBeInTheDocument();
    expect(registerFieldWorker).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('fw-register-done')).toBeNull();
  });

  it('several earlier records: the line counts them; editing the mobile (the list was about the old number) takes the line away; a second press registers', async () => {
    registerFieldWorker.mockRejectedValueOnce(
      new ApiError(409, 'field_worker.number_previously_ended', 'ended', { previous_endings: [ended(A, '2026-10-01'), ended(B, '2026-09-01')] }),
    );
    registerFieldWorker.mockResolvedValueOnce(created);
    await fillAndSubmit();
    expect(await screen.findByTestId('fw-register-previous-notice')).toHaveTextContent(t('fw.register.previous.noticeMany', { count: 2 }));
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876500011' } });
    expect(screen.queryByTestId('fw-register-previous-notice')).toBeNull();
    expect(screen.queryByTestId('fw-register-previous')).toBeNull();
    // CONTROL — the same page does register, on the press AFTER the earlier records were shown.
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await waitFor(() => expect(registerFieldWorker).toHaveBeenCalledTimes(2));
  });
});

describe('R2D-14 — the link is ONE choice among the earlier records and "do not link"', () => {
  async function showTwo() {
    registerFieldWorker.mockRejectedValueOnce(
      new ApiError(409, 'field_worker.number_previously_ended', 'ended', { previous_endings: [ended(A, '2026-10-01'), ended(B, '2026-09-01')] }),
    );
    registerFieldWorker.mockResolvedValue(created);
    await fillAndSubmit();
    await screen.findByTestId('fw-register-previous');
  }

  it('radios in one group: "do not link" is the default, choosing a record unchooses the other in the open, and the first press never links by itself', async () => {
    await showTwo();
    const a = screen.getByTestId(`fw-register-link-${A}`) as HTMLInputElement;
    const b = screen.getByTestId(`fw-register-link-${B}`) as HTMLInputElement;
    const none = screen.getByTestId('fw-register-link-none') as HTMLInputElement;
    for (const r of [a, b, none]) expect(r.type).toBe('radio');
    expect(new Set([a.name, b.name, none.name]).size).toBe(1);
    expect(a.name).not.toBe('');
    expect([a.checked, b.checked, none.checked]).toEqual([false, false, true]);
    fireEvent.click(a);
    expect([a.checked, b.checked, none.checked]).toEqual([true, false, false]);
    fireEvent.click(b);
    expect([a.checked, b.checked, none.checked]).toEqual([false, true, false]); // choosing B UNCHOOSES A — one choice
    fireEvent.click(none);
    expect([a.checked, b.checked, none.checked]).toEqual([false, false, true]);
  });

  it('what is sent follows the choice: the chosen record as `link_to`; "do not link" sends the acknowledgment and NO link', async () => {
    await showTwo();
    fireEvent.click(screen.getByTestId(`fw-register-link-${B}`));
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await screen.findByTestId('fw-register-done');
    expect(registerFieldWorker.mock.calls[1]![1]).toEqual({ name: 'Ramesh Kumar', mobile: '9876500010', district: 'Patna', previous_endings_seen: true, link_to: B });
  });

  it('"do not link" after choosing a record sends no `link_to`', async () => {
    await showTwo();
    fireEvent.click(screen.getByTestId(`fw-register-link-${A}`));
    fireEvent.click(screen.getByTestId('fw-register-link-none'));
    fireEvent.click(screen.getByTestId('fw-register-submit'));
    await screen.findByTestId('fw-register-done');
    expect(registerFieldWorker.mock.calls[1]![1]).toEqual({ name: 'Ramesh Kumar', mobile: '9876500010', district: 'Patna', previous_endings_seen: true });
  });
});
