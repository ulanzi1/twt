// The helpline operator's bank-details section — Story 6.18 (AC6, AC7).
//
// `2026-09-19-226` cl.1: *"Mismatch is not allowed in general. It's the duty of helpline_operator to
// make sure name doesn't mismatch."* cl.7: *"Bank Account Information is mandatory for claim
// filing"* — BOTH accounts.
//
// ⭐ THIS IS WHAT MAKES cl.1 DISCHARGEABLE. The API has existed since Story 6.8; until now the
// helpline console had no bank-entry UI at all, so the operator carrying the duty had no way to see
// the declared nominee beside the name they were typing. The section appears AFTER the intake,
// because the route is keyed on a claim that must exist first.
//
// ⛔⛔ TRAP 1 STILL HOLDS HERE. The names are shown side by side and the operator decides. This
// component renders ⛔ no comparison, ⛔ no match hint and ⛔ no warning — and it must not, even
// though the operator is the one accountable: cl.5 rules the SYSTEM never acts on a mismatch, and a
// "these look different" hint at filing would be the system acting.

import { useState } from 'react';

import { ENGLISH_NAME_REGEX, NAME_DIFFERENCE_NOTE_MAX_CHARS } from '@twt/contracts';
import type { NomineeNameCheckResponse, RecordNomineeBankHelplineRequest } from '@twt/contracts';

import { resolveEn } from './i18n-en.js';

interface AccountFields {
  holder: string;
  number: string;
  ifsc: string;
  note: string;
}

const EMPTY: AccountFields = { holder: '', number: '', ifsc: '', note: '' };
const IFSC_RE = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_RE = /^\d{9,18}$/;

export interface BankDetailsCardProps {
  /** `null` until the intake is filed — the route is keyed on the claim. */
  claimCaseId: string | null;
  /** `true` once both accounts are recorded (the page's completion condition — AC6/AC7). */
  recorded: boolean;
  onSubmit: (body: RecordNomineeBankHelplineRequest) => Promise<void>;
  pending?: boolean;
  error?: string | null;
  /** The AC2 read, fetched after recording so the operator can discharge cl.1. */
  names?: NomineeNameCheckResponse | undefined;
  namesLoading?: boolean;
}

export function BankDetailsCard(props: BankDetailsCardProps): React.ReactElement | null {
  const { claimCaseId, recorded, onSubmit, pending, error, names, namesLoading } = props;
  const [accounts, setAccounts] = useState<[AccountFields, AccountFields]>([{ ...EMPTY }, { ...EMPTY }]);
  const [validationError, setValidationError] = useState<string | null>(null);

  if (claimCaseId === null) return null;

  const patch = (i: 0 | 1, p: Partial<AccountFields>): void =>
    setAccounts((prev) => {
      const next: [AccountFields, AccountFields] = [{ ...prev[0] }, { ...prev[1] }];
      next[i] = { ...next[i], ...p };
      return next;
    });

  const submit = async (): Promise<void> => {
    setValidationError(null);
    for (const a of accounts) {
      if (a.holder.trim() === '' || a.number.trim() === '' || a.ifsc.trim() === '') {
        setValidationError(resolveEn('helpline.bank.incomplete'));
        return;
      }
      // Story 6.18 (AC12) — the boundary refuses a non-Latin holder name, so the console refuses it
      // first. ⛔ Never a silent server-only 400 for an operator on a call with a grieving family.
      if (!ENGLISH_NAME_REGEX.test(a.holder.trim())) {
        setValidationError(resolveEn('helpline.bank.englishRequired'));
        return;
      }
      if (!ACCOUNT_RE.test(a.number.trim())) {
        setValidationError(resolveEn('helpline.bank.accountInvalid'));
        return;
      }
      if (!IFSC_RE.test(a.ifsc.trim().toUpperCase())) {
        setValidationError(resolveEn('helpline.bank.ifscInvalid'));
        return;
      }
    }
    if (accounts[0].number.trim() === accounts[1].number.trim()) {
      // The two accounts exist so one can be used if the other fails; the same number twice defeats
      // that entirely, and the contract refuses it anyway.
      setValidationError(resolveEn('helpline.bank.duplicate'));
      return;
    }
    const body: RecordNomineeBankHelplineRequest = {
      accounts: accounts.map((a) => {
        const note = a.note.trim();
        return {
          accountHolderName: a.holder.trim(),
          accountNumber: a.number.trim(),
          ifsc: a.ifsc.trim().toUpperCase(),
          ...(note !== '' ? { nameDifferenceNote: note } : {}),
        };
      }) as RecordNomineeBankHelplineRequest['accounts'],
    };
    try {
      await onSubmit(body);
    } catch {
      /* the caller's mutation hook owns `error` */
    }
  };

  const accountBlock = (i: 0 | 1, labelKey: string): React.ReactElement => {
    const a = accounts[i];
    return (
      <fieldset key={labelKey} className="rounded border p-3" data-testid={`helpline-bank-account-${i + 1}`}>
        <legend className="px-1 text-sm font-semibold">{resolveEn(labelKey)}</legend>
        <label className="flex flex-col text-xs">
          <span className="opacity-70">{resolveEn('helpline.bank.holder')}</span>
          <input
            className="rounded border px-2 py-1 text-sm"
            data-testid={`helpline-bank-holder-${i + 1}`}
            value={a.holder}
            disabled={pending}
            onChange={(e) => patch(i, { holder: e.target.value })}
          />
        </label>
        <label className="mt-2 flex flex-col text-xs">
          <span className="opacity-70">{resolveEn('helpline.bank.number')}</span>
          <input
            className="rounded border px-2 py-1 text-sm"
            data-testid={`helpline-bank-number-${i + 1}`}
            inputMode="numeric"
            value={a.number}
            disabled={pending}
            onChange={(e) => patch(i, { number: e.target.value.replace(/[^0-9]/g, '') })}
          />
        </label>
        <label className="mt-2 flex flex-col text-xs">
          <span className="opacity-70">{resolveEn('helpline.bank.ifsc')}</span>
          <input
            className="rounded border px-2 py-1 text-sm uppercase"
            data-testid={`helpline-bank-ifsc-${i + 1}`}
            maxLength={11}
            value={a.ifsc}
            disabled={pending}
            onChange={(e) => patch(i, { ifsc: e.target.value.toUpperCase() })}
          />
        </label>
        {/* ⭐ cl.2 — the operator's OPTIONAL note to the District Admin. It is what lets a genuine
            clerical difference be submitted rather than argued about on the call. */}
        <label className="mt-2 flex flex-col text-xs">
          <span className="opacity-70">{resolveEn('helpline.bank.note')}</span>
          <input
            className="rounded border px-2 py-1 text-sm"
            data-testid={`helpline-bank-note-${i + 1}`}
            maxLength={NAME_DIFFERENCE_NOTE_MAX_CHARS}
            value={a.note}
            disabled={pending}
            onChange={(e) => patch(i, { note: e.target.value })}
          />
        </label>
      </fieldset>
    );
  };

  return (
    <section className="flex flex-col gap-3" data-testid="helpline-bank-section" aria-label={resolveEn('helpline.bank.heading')}>
      <div>
        <h2 className="text-lg font-semibold">{resolveEn('helpline.bank.heading')}</h2>
        {/* ⭐ The duty, stated to the person who carries it — cl.1 names the helpline operator. */}
        <p className="mt-1 max-w-2xl text-sm opacity-70">{resolveEn('helpline.bank.duty')}</p>
      </div>

      {recorded ? (
        <div data-testid="helpline-bank-recorded">
          <p className="text-sm">{resolveEn('helpline.bank.recorded')}</p>

          {/* ── cl.1's whole point: the two names, side by side, AFTER submission ── */}
          {namesLoading ? (
            <p className="text-sm opacity-70">{resolveEn('helpline.bank.namesLoading')}</p>
          ) : names ? (
            <div className="mt-2 grid grid-cols-2 gap-4" data-testid="helpline-bank-names">
              <div>
                <h3 className="text-xs font-semibold uppercase opacity-70">
                  {resolveEn('helpline.bank.namesOnAccounts')}
                </h3>
                <ul>
                  {names.accounts.map((acc) => (
                    <li key={acc.account_rank} data-testid={`helpline-name-account-${acc.account_rank}`}>
                      #{acc.account_rank}:{' '}
                      {acc.holder_name.state === 'readable'
                        ? acc.holder_name.value
                        : resolveEn('helpline.bank.unreadable')}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase opacity-70">
                  {resolveEn('helpline.bank.namesDeclared')}
                </h3>
                {names.declared_nominees.length === 0 ? (
                  <p data-testid="helpline-no-nominees">{resolveEn('helpline.bank.noNominees')}</p>
                ) : (
                  <ul>
                    {names.declared_nominees.map((n) => (
                      <li key={n.rank} data-testid={`helpline-name-nominee-${n.rank}`}>
                        #{n.rank} ({n.relationship}):{' '}
                        {n.nominee_name.state === 'readable'
                          ? n.nominee_name.value
                          : n.nominee_name.state === 'anonymized'
                            ? resolveEn('helpline.bank.anonymized')
                            : resolveEn('helpline.bank.unreadable')}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {accountBlock(0, 'helpline.bank.primary')}
            {accountBlock(1, 'helpline.bank.secondary')}
          </div>
          <button
            type="button"
            data-testid="helpline-bank-submit"
            className="self-start rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={pending}
            onClick={() => void submit()}
          >
            {resolveEn('helpline.bank.submit')}
          </button>
        </>
      )}

      {validationError !== null ? (
        <p role="alert" data-testid="helpline-bank-validation-error" className="text-xs text-status-fail-fg">
          {validationError}
        </p>
      ) : null}
      {error != null && error !== '' ? (
        <p role="alert" data-testid="helpline-bank-error" className="text-xs text-status-fail-fg">
          {error}
        </p>
      ) : null}
    </section>
  );
}
