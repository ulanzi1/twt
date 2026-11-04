// Story 13.1a (Task 9.3; AC11 (a); AD12; review R5, R9) — the register page against a mocked client (the real `ApiError`):
//   · the Idempotency-Key is per SUBMISSION ATTEMPT — never minted on mount; an unchanged body re-sends the SAME key; an edited
//     body mints a new one; success clears it; a double click sends ONCE;
//   · every registration code maps to its guidance, a field error to its field (`aria-invalid` + `aria-describedby`); 403 ⇒ the
//     no-access line; 401 ⇒ sign in; a 201 shows the returned id and "awaiting approval", and "Register another" starts afresh;
//   · a truncated district list offers an exact typed district, sent byte for byte (R9);
//   · leaving the page keeps NO submitted name or mobile in TanStack's caches (R5).

import { QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const navigate = vi.fn();
vi.mock('@tanstack/react-router', () => ({
  Link: (p: { children: ReactNode; to: string; 'data-testid'?: string }) => (
    <a href={p.to} data-testid={p['data-testid']}>
      {p.children}
    </a>
  ),
  useNavigate: () => navigate,
}));

const registerFieldWorker = vi.fn();
const getFieldWorkerDistricts = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    registerFieldWorker: (p: string, b: unknown, k: string) => registerFieldWorker(p, b, k),
    getFieldWorkerDistricts: (p: string) => getFieldWorkerDistricts(p),
  };
});

const { RegisterFieldWorkerPage } = await import('../src/modules/field-workers/index.js');
const { resolveEn: t } = await import('../src/modules/field-workers/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');
const { createQueryClient } = await import('../src/api/hooks.js');

const P = '11111111-1111-4111-8111-111111111111';
const ID = '6ba7b810-9dad-41d1-80b4-00c04fd430c8';
const created = { field_worker_id: ID, district: 'Patna', current_state: 'pending_kyc', kyc_status: 'pending' };

function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void; reject: (e: unknown) => void } {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function renderPage() {
  const qc = createQueryClient();
  const view = render(
    <QueryClientProvider client={qc}>
      <RegisterFieldWorkerPage pariwarId={P} />
    </QueryClientProvider>,
  );
  return { qc, ...view };
}

async function fill(name = 'Ramesh Kumar', mobile = '9876543210', district = 'Patna'): Promise<void> {
  fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: name } });
  fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: mobile } });
  await screen.findByRole('option', { name: district });
  const select = screen.getByTestId('fw-register-district') as HTMLSelectElement;
  const option = [...select.options].find((o) => o.textContent === district)!;
  fireEvent.change(select, { target: { value: option.value } });
}
const submit = (): void => {
  fireEvent.click(screen.getByTestId('fw-register-submit'));
};

beforeEach(() => {
  registerFieldWorker.mockReset();
  getFieldWorkerDistricts.mockReset();
  navigate.mockReset();
  getFieldWorkerDistricts.mockResolvedValue({ districts: ['Gaya', 'Patna'], districts_truncated: false });
});

describe('the Idempotency-Key — per submission attempt (AD12)', () => {
  it('never minted on mount or render; an unchanged body re-sends the SAME key after a failure; an EDITED body mints a new one; success clears it', async () => {
    renderPage();
    await fill();
    expect(registerFieldWorker).not.toHaveBeenCalled();
    registerFieldWorker.mockRejectedValueOnce(new ApiError(503, 'http.503', 'down'));
    submit();
    await screen.findByTestId('fw-register-error');
    registerFieldWorker.mockRejectedValueOnce(new ApiError(409, 'field_worker.idempotency_in_progress', 'busy'));
    submit();
    await waitFor(() => expect(registerFieldWorker).toHaveBeenCalledTimes(2));
    const [k1, k2] = registerFieldWorker.mock.calls.map((c) => c[2] as string);
    expect(k2).toBe(k1);
    // An edit ⇒ a new key.
    fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar Singh' } });
    registerFieldWorker.mockResolvedValueOnce(created);
    submit();
    await screen.findByTestId('fw-register-done');
    const k3 = registerFieldWorker.mock.calls[2]![2] as string;
    expect(k3).not.toBe(k1);
    expect(registerFieldWorker.mock.calls[2]![1]).toEqual({ name: 'Ramesh Kumar Singh', mobile: '9876543210', district: 'Patna' });
    // After success + "Register another", the SAME body gets a fresh key.
    fireEvent.click(screen.getByTestId('fw-register-another'));
    await fill('Ramesh Kumar Singh');
    registerFieldWorker.mockResolvedValueOnce(created);
    submit();
    await screen.findByTestId('fw-register-done');
    expect(registerFieldWorker.mock.calls[3]![2]).not.toBe(k3);
  });

  it('a double click sends ONCE (the synchronous in-flight guard)', async () => {
    renderPage();
    await fill();
    const d = deferred<typeof created>();
    registerFieldWorker.mockReturnValueOnce(d.promise);
    submit();
    submit();
    fireEvent.submit(screen.getByTestId('fw-register-form'));
    expect(registerFieldWorker).toHaveBeenCalledTimes(1);
    await act(async () => d.resolve(created));
    await screen.findByTestId('fw-register-done');
  });
});

describe('the outcomes (AC11 (a))', () => {
  it('a 201 shows the returned field_worker_id and "registered, awaiting approval"; the heading takes focus', async () => {
    renderPage();
    await fill();
    registerFieldWorker.mockResolvedValueOnce(created);
    submit();
    await screen.findByTestId('fw-register-done');
    expect(screen.getByTestId('fw-register-done-id').textContent).toBe(t('fw.register.doneId', { id: ID }));
    expect(screen.getByText(t('fw.register.done'))).toBe(document.activeElement);
  });

  it.each([
    ['field_worker.name_invalid', 422, 'fw-register-name', 'fw.err.nameInvalid'],
    ['field_worker.mobile_invalid', 422, 'fw-register-mobile', 'fw.err.mobileInvalid'],
    ['field_worker.mobile_already_registered', 409, 'fw-register-mobile', 'fw.err.mobileTaken'],
    ['field_worker.district_unknown', 422, 'fw-register-district', 'fw.err.districtUnknown'],
  ])('%s ⇒ its words, on ITS field (aria-invalid + aria-describedby)', async (code, status, field, key) => {
    renderPage();
    await fill();
    registerFieldWorker.mockRejectedValueOnce(new ApiError(status, code, 'server words'));
    submit();
    const error = await screen.findByTestId('fw-register-error');
    expect(error.textContent).toBe(t(key));
    const input = screen.getByTestId(field);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  it.each([
    ['field_worker.idempotency_key_required', 400, 'fw.err.keyRequired'],
    ['field_worker.idempotency_in_progress', 409, 'fw.err.inProgress'],
    ['field_worker.code_allocation_exhausted', 503, 'fw.err.codesExhausted'],
  ])('%s ⇒ its words', async (code, status, key) => {
    renderPage();
    await fill();
    registerFieldWorker.mockRejectedValueOnce(new ApiError(status, code, 'server words'));
    submit();
    expect((await screen.findByTestId('fw-register-error')).textContent).toBe(t(key));
  });

  it('403 ⇒ the no-access line; 401 ⇒ to sign in', async () => {
    renderPage();
    await fill();
    registerFieldWorker.mockRejectedValueOnce(new ApiError(403, 'auth.forbidden', 'no'));
    submit();
    expect((await screen.findByTestId('fw-register-no-access')).textContent).toBe(t('fw.noAccess'));
    registerFieldWorker.mockRejectedValueOnce(new ApiError(401, 'auth.session_required', 'no'));
    submit();
    await waitFor(() => expect(navigate).toHaveBeenCalledWith({ to: '/login' }));
  });

  it('a missing field is caught before any request', async () => {
    renderPage();
    submit();
    expect((await screen.findByTestId('fw-register-error')).textContent).toBe(t('fw.register.nameRequired'));
    expect(registerFieldWorker).not.toHaveBeenCalled();
  });
});

describe('R9 — a truncated district list offers an exact typed district', () => {
  it('the warning shows, a typed district (spaces and case kept) is sent byte for byte', async () => {
    getFieldWorkerDistricts.mockResolvedValue({ districts: ['D000', 'D001'], districts_truncated: true });
    renderPage();
    fireEvent.change(screen.getByTestId('fw-register-name'), { target: { value: 'Ramesh Kumar' } });
    fireEvent.change(screen.getByTestId('fw-register-mobile'), { target: { value: '9876543210' } });
    await screen.findByTestId('fw-register-district-truncated');
    fireEvent.change(screen.getByTestId('fw-register-district-typed'), { target: { value: 'D204 East ' } });
    registerFieldWorker.mockResolvedValueOnce({ ...created, district: 'D204 East ' });
    submit();
    await screen.findByTestId('fw-register-done');
    expect(registerFieldWorker.mock.calls[0]![1]).toMatchObject({ district: 'D204 East ' });
  });
});

describe('R5 — nothing typed outlives the page in the caches', () => {
  it('after a registration and leaving the page, neither the MutationCache nor the QueryCache holds the name or the mobile', async () => {
    const { qc, unmount } = renderPage();
    await fill('Uniquename Testworker', '9876511111');
    registerFieldWorker.mockResolvedValueOnce(created);
    submit();
    await screen.findByTestId('fw-register-done');
    unmount();
    const dump = JSON.stringify([qc.getMutationCache().getAll().map((m) => m.state), qc.getQueryCache().getAll().map((q) => q.state.data)]);
    expect(qc.getMutationCache().getAll()).toHaveLength(0);
    expect(dump).not.toContain('Uniquename');
    expect(dump).not.toContain('9876511111');
  });
});
