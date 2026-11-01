// Story 12.2 code review round 1 (RP18, RP23, RP27, RP35) — the partner picker. The fetchers are mocked (the real ApiError
// kept); the real hooks and copy run. Covers: registering a partner selects it; the registration's Idempotency-Key is kept
// across an UNCHANGED retry and replaced by an EDIT (a partner is immutable, so a replayed first result would keep the
// misspelling for good); a registration still in flight when the picker is left, or cancelled, never selects anything; a
// failed partner list offers Try again.

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithClient } from './_helpers.js';

const PARIWAR = '11111111-1111-4111-8111-111111111111';
const EXISTING = '0f8fad5b-d9cb-469f-a165-70867728950e';
const CREATED = '7c9e6679-7425-40de-944b-e07fc1f90ae7';

const listModulePartners = vi.fn();
const createModulePartner = vi.fn();
vi.mock('../src/api/client.js', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    listModulePartners: (p: string) => listModulePartners(p),
    createModulePartner: (p: string, b: unknown, k: string) => createModulePartner(p, b, k),
  };
});

const { PartnerPicker } = await import('../src/modules/marketplace/PartnerPicker.js');
const { resolveEn: t } = await import('../src/modules/marketplace/i18n-en.js');
const { ApiError } = await import('../src/api/client.js');

const created = { partner_id: CREATED, display_name_en: 'LIC', display_name_hi: 'एलआईसी', created_at: '2026-11-01T00:00:00.000Z' };

beforeEach(() => {
  listModulePartners.mockReset();
  createModulePartner.mockReset();
  listModulePartners.mockResolvedValue({
    items: [{ partner_id: EXISTING, display_name_en: 'HDFC', display_name_hi: 'एचडीएफसी', created_at: '2026-11-01T00:00:00.000Z' }],
  });
});

async function openForm(onChange = vi.fn()) {
  const view = renderWithClient(<PartnerPicker pariwarId={PARIWAR} value={null} onChange={onChange} />);
  fireEvent.click(await screen.findByTestId('partner-new'));
  fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: 'LIC' } });
  fireEvent.change(screen.getByTestId('partner-name-hi'), { target: { value: 'एलआईसी' } });
  return { onChange, view };
}
const settle = (): Promise<void> => new Promise((r) => setTimeout(r, 30));

describe('PartnerPicker', () => {
  it('registering a partner sends both names with a key, selects the new partner and closes the form', { timeout: 20_000 }, async () => {
    createModulePartner.mockResolvedValue(created);
    const { onChange } = await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(CREATED));
    expect(createModulePartner).toHaveBeenCalledWith(PARIWAR, { display_name_en: 'LIC', display_name_hi: 'एलआईसी' }, expect.any(String));
    expect(screen.queryByTestId('partner-form')).toBeNull();
  });

  it('DN3: pasted names are cleaned before they are sent (no-break space, doubled space, non-NFC)', { timeout: 20_000 }, async () => {
    const cp = (n: number): string => String.fromCodePoint(n);
    createModulePartner.mockResolvedValue(created);
    const { onChange } = await openForm();
    fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: `LIC${cp(0x00a0)}Housing  Cafe${cp(0x0301)}` } });
    fireEvent.change(screen.getByTestId('partner-name-hi'), { target: { value: `एलआईसी${cp(0x202f)}हाउसिंग` } });
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(CREATED));
    expect(createModulePartner).toHaveBeenCalledWith(
      PARIWAR,
      { display_name_en: `LIC Housing Caf${cp(0x00e9)}`, display_name_hi: 'एलआईसी हाउसिंग' },
      expect.any(String),
    );
  });

  it('DN5: a name made only of characters the cleaning removes keeps Register disabled', { timeout: 20_000 }, async () => {
    await openForm();
    fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: String.fromCodePoint(0x200b, 0x00ad) } });
    expect(screen.getByTestId('partner-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: 'LIC' } });
    fireEvent.change(screen.getByTestId('partner-name-hi'), { target: { value: String.fromCodePoint(0x2060, 0xfeff) } });
    expect(screen.getByTestId('partner-save')).toBeDisabled();
    fireEvent.change(screen.getByTestId('partner-name-hi'), { target: { value: 'एलआईसी' } });
    expect(screen.getByTestId('partner-save')).toBeEnabled();
  });

  it('RP18: unchanged names keep the Idempotency-Key across a failed attempt; an EDITED name mints a new one', { timeout: 20_000 }, async () => {
    createModulePartner
      .mockRejectedValueOnce(new ApiError(502, 'internal.error', 'down'))
      .mockRejectedValueOnce(new ApiError(502, 'internal.error', 'down'))
      .mockResolvedValueOnce(created);
    const { onChange } = await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    await screen.findByTestId('partner-error');
    await waitFor(() => expect(screen.getByTestId('partner-save')).toBeEnabled());
    fireEvent.click(screen.getByTestId('partner-save')); // the same names: a genuine retry
    await waitFor(() => expect(createModulePartner).toHaveBeenCalledTimes(2));
    expect(createModulePartner.mock.calls[1]![2]).toBe(createModulePartner.mock.calls[0]![2]);

    await waitFor(() => expect(screen.getByTestId('partner-save')).toBeEnabled());
    fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: 'LIC India' } }); // a correction
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(CREATED));
    expect(createModulePartner.mock.calls[2]![2]).not.toBe(createModulePartner.mock.calls[0]![2]);
    expect(createModulePartner.mock.calls[2]![1]).toEqual({ display_name_en: 'LIC India', display_name_hi: 'एलआईसी' });
  });

  it('a name refusal is shown as its own sentence', { timeout: 20_000 }, async () => {
    createModulePartner.mockRejectedValue(new ApiError(409, 'module_partner.name_taken', 'taken'));
    await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    expect(await screen.findByTestId('partner-error')).toHaveTextContent(t('module.partner.nameTaken'));
  });

  // Patch-diff review (round 2): the fixed copy ("each needs letters…") does not describe a joiner or a doubled space, so
  // the server's own reason is shown, naming the field; the fixed copy stays the fallback.
  it('a 422 name refusal shows the server’s reason for the named field; without an issue, the fixed copy', { timeout: 20_000 }, async () => {
    const reason = 'must not contain an invisible joining character (it is usually copied in with pasted text)';
    createModulePartner.mockRejectedValue(
      new ApiError(422, 'module_partner.name_invalid', 'invalid', { issues: [{ path: ['display_name_en'], message: reason }] }),
    );
    await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    const error = await screen.findByTestId('partner-error');
    expect(error).toHaveTextContent(t('module.partner.nameEn'));
    expect(error).toHaveTextContent(reason);
    expect(error).not.toHaveTextContent(t('module.partner.nameInvalid'));

    createModulePartner.mockRejectedValue(new ApiError(422, 'module_partner.name_invalid', 'invalid', {}));
    fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: 'LIC2' } });
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(screen.getByTestId('partner-error')).toHaveTextContent(t('module.partner.nameInvalid')));
  });

  it('RP27: a registration still in flight when the picker is LEFT never selects anything', { timeout: 20_000 }, async () => {
    let resolveCreate: (v: unknown) => void = () => undefined;
    createModulePartner.mockReturnValue(new Promise((r) => { resolveCreate = r; }));
    const { onChange, view } = await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(createModulePartner).toHaveBeenCalledTimes(1));
    view.unmount(); // the admin chose another partner and pressed Next
    resolveCreate(created);
    await settle();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('a registration still in flight when Cancel is pressed never selects anything (TR5)', { timeout: 20_000 }, async () => {
    let resolveCreate: (v: unknown) => void = () => undefined;
    createModulePartner.mockReturnValue(new Promise((r) => { resolveCreate = r; }));
    const { onChange } = await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(createModulePartner).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByTestId('partner-cancel'));
    expect(screen.queryByTestId('partner-form')).toBeNull();
    resolveCreate(created);
    await settle();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('RP23: a failed partner list shows Try again, and the partners appear once it succeeds', { timeout: 20_000 }, async () => {
    let resolveRetry: (v: unknown) => void = () => undefined;
    listModulePartners.mockReset();
    listModulePartners.mockRejectedValueOnce(new Error('boom')).mockReturnValueOnce(new Promise((r) => { resolveRetry = r; }));
    renderWithClient(<PartnerPicker pariwarId={PARIWAR} value={null} onChange={vi.fn()} />);
    expect(await screen.findByRole('alert')).toHaveTextContent(t('module.partner.loadError'));
    fireEvent.click(screen.getByTestId('partner-retry'));
    // While the retry runs v5 has already cleared the error, yet the button must stay mounted (disabled) rather than unmount
    // under keyboard focus (PU3).
    await waitFor(() => expect(screen.getByTestId('partner-retry')).toBeDisabled());
    expect(screen.queryByRole('alert')).toBeNull();
    resolveRetry({ items: [{ partner_id: EXISTING, display_name_en: 'HDFC', display_name_hi: 'एचडीएफसी', created_at: '2026-11-01T00:00:00.000Z' }] });
    expect(await screen.findByRole('option', { name: 'HDFC / एचडीएफसी' })).toBeInTheDocument();
    expect(screen.queryByTestId('partner-retry')).toBeNull(); // gone once it has succeeded
  });
});

describe('PartnerPicker — code review round 2 (chunk C)', () => {
  it('RC3: after a registration focus goes to the select (showing the new partner); after Cancel, to "Register a new partner"', { timeout: 20_000 }, async () => {
    createModulePartner.mockResolvedValue(created);
    const { onChange } = await openForm();
    listModulePartners.mockResolvedValue({ items: [created] }); // the refreshed list holds the new partner
    screen.getByTestId('partner-save').focus();
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(CREATED));
    expect(screen.getByTestId('partner-select')).toHaveFocus();

    fireEvent.click(screen.getByTestId('partner-new'));
    screen.getByTestId('partner-cancel').focus();
    fireEvent.click(screen.getByTestId('partner-cancel'));
    expect(screen.getByTestId('partner-new')).toHaveFocus();
  });

  it('RC4: a registration still in flight never replaces a partner the admin has since picked from the list', { timeout: 20_000 }, async () => {
    let resolveCreate: (v: unknown) => void = () => undefined;
    createModulePartner.mockReturnValue(new Promise((r) => { resolveCreate = r; }));
    const { onChange } = await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(createModulePartner).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('partner-select'), { target: { value: EXISTING } });
    expect(onChange).toHaveBeenLastCalledWith(EXISTING);
    resolveCreate(created);
    await settle();
    expect(onChange).not.toHaveBeenCalledWith(CREATED);
  });

  it('RC5: a chosen id the list does not show is shown as such, never as "Choose a partner"', { timeout: 20_000 }, async () => {
    renderWithClient(<PartnerPicker pariwarId={PARIWAR} value={CREATED} onChange={vi.fn()} />);
    await screen.findByRole('option', { name: 'HDFC / एचडीएफसी' });
    expect(screen.getByTestId('partner-select')).toHaveDisplayValue(t('module.partner.notListed'));
    expect(screen.getByTestId('partner-select')).toHaveValue(CREATED);
  });

  it('RC9: "already registered — choose it from the list" re-reads the list', { timeout: 20_000 }, async () => {
    createModulePartner.mockRejectedValue(new ApiError(409, 'module_partner.name_taken', 'taken'));
    await openForm();
    await waitFor(() => expect(listModulePartners).toHaveBeenCalledTimes(1));
    listModulePartners.mockResolvedValue({ items: [created] });
    fireEvent.click(screen.getByTestId('partner-save'));
    expect(await screen.findByTestId('partner-error')).toHaveTextContent(t('module.partner.nameTaken'));
    await waitFor(() => expect(listModulePartners).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('option', { name: 'LIC / एलआईसी' })).toBeInTheDocument();
  });

  it('RC14: once the list has loaded, a later refresh does not bring back "Loading…" and a disabled Try again', { timeout: 20_000 }, async () => {
    listModulePartners.mockReset();
    listModulePartners
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce({ items: [{ partner_id: EXISTING, display_name_en: 'HDFC', display_name_hi: 'एचडीएफसी', created_at: '2026-11-01T00:00:00.000Z' }] })
      .mockReturnValue(new Promise(() => undefined)); // the later refresh hangs
    createModulePartner.mockResolvedValue(created);
    const onChange = vi.fn();
    renderWithClient(<PartnerPicker pariwarId={PARIWAR} value={null} onChange={onChange} />);
    fireEvent.click(await screen.findByTestId('partner-retry'));
    await screen.findByRole('option', { name: 'HDFC / एचडीएफसी' });
    // A registration refreshes the list (the refresh hangs).
    fireEvent.click(screen.getByTestId('partner-new'));
    fireEvent.change(screen.getByTestId('partner-name-en'), { target: { value: 'LIC' } });
    fireEvent.change(screen.getByTestId('partner-name-hi'), { target: { value: 'एलआईसी' } });
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(listModulePartners).toHaveBeenCalledTimes(3));
    expect(screen.queryByTestId('partner-retry')).toBeNull();
    expect(screen.queryByText(t('module.loading'))).toBeNull();
  });
});

describe('PartnerPicker — patch-diff review of round 2 (PT)', () => {
  it('PT1: a FAILED refresh over a loaded list shows no load error and no Try again — the select keeps working', { timeout: 20_000 }, async () => {
    createModulePartner.mockResolvedValue(created);
    const { onChange } = await openForm();
    await screen.findByRole('option', { name: 'HDFC / एचडीएफसी' });
    listModulePartners.mockRejectedValue(new Error('boom')); // the refresh after registering fails
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(CREATED));
    await waitFor(() => expect(listModulePartners).toHaveBeenCalledTimes(2));
    await settle();
    expect(screen.queryByText(t('module.partner.loadError'))).toBeNull();
    expect(screen.queryByTestId('partner-retry')).toBeNull();
    expect(screen.getByRole('option', { name: 'HDFC / एचडीएफसी' })).toBeInTheDocument();
  });

  it('PT2: a registration that finishes after the admin moved focus out of the picker does not take it back', { timeout: 20_000 }, async () => {
    let resolveCreate: (v: unknown) => void = () => undefined;
    createModulePartner.mockReturnValue(new Promise((r) => { resolveCreate = r; }));
    const elsewhere = document.createElement('input');
    document.body.appendChild(elsewhere);
    try {
      const { onChange } = await openForm();
      fireEvent.click(screen.getByTestId('partner-save'));
      await waitFor(() => expect(createModulePartner).toHaveBeenCalledTimes(1));
      elsewhere.focus(); // e.g. the offer-name field below the picker
      resolveCreate(created);
      await waitFor(() => expect(onChange).toHaveBeenCalledWith(CREATED));
      expect(elsewhere).toHaveFocus();
    } finally {
      elsewhere.remove();
    }
  });

  it('PT12: picking from the list while a registration is in flight closes the form and clears it; the late result selects nothing', { timeout: 20_000 }, async () => {
    let resolveCreate: (v: unknown) => void = () => undefined;
    createModulePartner.mockReturnValue(new Promise((r) => { resolveCreate = r; }));
    const { onChange } = await openForm();
    fireEvent.click(screen.getByTestId('partner-save'));
    await waitFor(() => expect(createModulePartner).toHaveBeenCalledTimes(1));
    fireEvent.change(screen.getByTestId('partner-select'), { target: { value: EXISTING } });
    expect(screen.queryByTestId('partner-form')).toBeNull();
    resolveCreate(created);
    await settle();
    expect(onChange).not.toHaveBeenCalledWith(CREATED);
    fireEvent.click(screen.getByTestId('partner-new'));
    expect(screen.getByTestId('partner-name-en')).toHaveValue('');
    expect(screen.getByTestId('partner-name-hi')).toHaveValue('');
  });
});
