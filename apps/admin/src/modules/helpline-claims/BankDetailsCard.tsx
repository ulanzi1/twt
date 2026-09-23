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

import { useEffect, useState } from 'react';

// Story 6.18 (AC12) — the SHARED English-script predicate from `@twt/contracts`.
// ⚠⚠ `isEnglishScriptName(x)`, ⛔ NOT `ENGLISH_NAME_REGEX.test(x.trim())` (code review 2026-09-20).
// Three clients each hand-rolled that call. It gives the same answer today, but only by coincidence
// of the current implementation: the moment the schema gains a rule the bare regex does not carry,
// a name the SERVER accepts starts being refused in the app (or worse, the reverse). One predicate,
// used by the schema and by every form, is the only way the two cannot drift.
import {
  NAME_DIFFERENCE_NOTE_MAX_CHARS,
  NOMINEE_BANK_ACCOUNT_NUMBER_REGEX,
  NOMINEE_BANK_IFSC_REGEX,
  isEnglishScriptName,
} from '@twt/contracts';
import type { NomineeNameCheckResponse, RecordNomineeBankHelplineRequest } from '@twt/contracts';

import { resolveEn } from './i18n-en.js';

interface AccountFields {
  holder: string;
  number: string;
  ifsc: string;
  note: string;
}

const EMPTY: AccountFields = { holder: '', number: '', ifsc: '', note: '' };
// ⭐ THE SHARED WIRE CONSTANTS, ⛔ not hand-copies (code review 2026-09-22). Both regexes used to
// be re-declared here. `NOMINEE_BANK_IFSC_REGEX` was already exported from contracts and this file
// duplicated it anyway; the account-number one was module-private there and is now exported too.
// ⚠ A copied validation rule DRIFTS: the day the boundary widens or narrows the range, this console
// starts refusing numbers the server accepts, or accepting numbers it will reject after the
// operator has typed everything.
const IFSC_RE = NOMINEE_BANK_IFSC_REGEX;
const ACCOUNT_RE = NOMINEE_BANK_ACCOUNT_NUMBER_REGEX;

export interface BankDetailsCardProps {
  /** `null` until a claim is in hand — the card is keyed on the claim. */
  claimCaseId: string | null;
  /**
   * `true` when TWO accounts are already on file for this claim.
   *
   * ⚠⚠ IT MUST BE DERIVED FROM A SERVER READ, ⛔ never from "did I just submit?" (code review
   * 2026-09-20). It used to be a page-level boolean set once after a successful POST and never
   * reset, so filing claim A then claim B showed B *"Both accounts are saved"* — with A's typed
   * values still in the card's state — and fired the audited Tier-1 names read against a claim that
   * had no accounts at all. cl.7's duty was silently skipped for B. It was also lost on reload.
   */
  recorded: boolean;
  onSubmit: (body: RecordNomineeBankHelplineRequest) => Promise<void>;
  pending?: boolean;
  /**
   * Blocks ONLY the Save button (code review 2026-09-23) — the page sets it while a step-up is
   * owed, so a second write cannot race the elevation. ⛔ It is NOT `pending`: that locks every
   * input and Cancel too, which left the operator unable to fix a typo or back out of a correction
   * while waiting for the OTP.
   */
  submitBlocked?: boolean;
  error?: string | null;
  /** The AC2 read, fetched after recording so the operator can discharge cl.1. */
  names?: NomineeNameCheckResponse | undefined;
  namesLoading?: boolean;
  /**
   * The names read FAILED. ⚠ A 403 (including the null-district hole), a 409 or a 5xx used to
   * render NOTHING under *"Both accounts are saved. Check the two names below."* — so the operator
   * who carries `-226` cl.1's duty was told nothing at all and could reasonably assume there was
   * nothing to check.
   */
  namesError?: string | null;
  /**
   * The claim is UNDER CORRECTION (AC5) — the District Admin recorded `does_not_match`, or the
   * Pariwar Admin returned it. The operator is the one `-227` cl.11 asks to type the corrected
   * details, so the card must SAY so and let them back in.
   */
  correctionNeeded?: boolean;
}

export function BankDetailsCard(props: BankDetailsCardProps): React.ReactElement | null {
  const {
    claimCaseId,
    recorded,
    onSubmit,
    pending,
    submitBlocked = false,
    error,
    names,
    namesLoading,
    namesError,
    correctionNeeded = false,
  } = props;
  const [accounts, setAccounts] = useState<[AccountFields, AccountFields]>([{ ...EMPTY }, { ...EMPTY }]);
  const [validationError, setValidationError] = useState<string | null>(null);
  /**
   * ⭐⭐ THE WAY BACK IN (code review 2026-09-20). Once `recorded` was true the form was REPLACED
   * by a read-only names view with ⛔ no path back to it. So the operator who opened this card,
   * read the two names and found a mismatch — `-226` cl.1's duty, the entire reason the names are
   * shown here — could not fix it. Nor could they correct a claim the District Admin had sent back
   * (`-227` cl.11 names the helpline operator as the one who types the corrected details), nor
   * complete a legacy claim filed before cl.7 made both accounts mandatory.
   */
  const [editing, setEditing] = useState(false);
  /**
   * The mandatory justification when writing over accounts already on file. The server requires it
   * on every tier-2 / under-correction write and 409s without it; the card used to never send it,
   * so a correction was impossible over HTTP even once the form was reachable.
   */
  const [correctionReason, setCorrectionReason] = useState('');

  // ⚠ A change of claim resets EVERYTHING typed. The card is reused across filings, and account
  // numbers left over from another family's claim are the worst possible default.
  useEffect(() => {
    setAccounts([{ ...EMPTY }, { ...EMPTY }]);
    setValidationError(null);
    setEditing(false);
    setCorrectionReason('');
  }, [claimCaseId]);

  if (claimCaseId === null) return null;

  // Show the form when nothing is on file yet, or when the operator has deliberately re-entered it.
  const showForm = !recorded || editing;
  const isCorrection = recorded;

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
      if (!isEnglishScriptName(a.holder)) {
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
    // ⭐ A WRITE OVER ACCOUNTS ALREADY ON FILE IS A CORRECTION, and the server REQUIRES a reason
    // for one (409 without it). The card never sent one, so every correction was impossible over
    // HTTP even where the window allowed it.
    if (isCorrection && correctionReason.trim() === '') {
      setValidationError(resolveEn('helpline.bank.correctionReasonRequired'));
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
      ...(isCorrection ? { correctionReason: correctionReason.trim() } : {}),
    };
    try {
      await onSubmit(body);
      // A successful write closes the re-entry; the parent's refetch flips `recorded`/`names`.
      setEditing(false);
      setCorrectionReason('');
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

      {/* ⭐ AC5 — the claim is UNDER CORRECTION, and this operator is the one `-227` cl.11 asks to
          type the corrected details. The card never read this flag, so the person with the duty was
          not told. ⛔ "correct", ⛔ never "rejected": the claim is open and has not been refused. */}
      {correctionNeeded ? (
        <p
          role="status"
          data-testid="helpline-bank-correction-needed"
          className="rounded bg-status-warn-bg px-2 py-1 text-sm text-status-warn-fg"
        >
          {resolveEn('helpline.bank.correctionNeeded')}
        </p>
      ) : null}

      {recorded ? (
        <div data-testid="helpline-bank-recorded" role="status">
          <p className="text-sm">{resolveEn('helpline.bank.recorded')}</p>

          {/* ── cl.1's whole point: the two names, side by side, AFTER submission ── */}
          {namesLoading ? (
            <p className="text-sm opacity-70" role="status">
              {resolveEn('helpline.bank.namesLoading')}
            </p>
          ) : namesError != null && namesError !== '' ? (
            // ⚠ SAY SO. Rendering nothing here told the operator who carries cl.1's duty that there
            // was nothing to check — the most dangerous possible silence on this surface.
            <p role="alert" data-testid="helpline-bank-names-error" className="text-sm text-status-fail-fg">
              {namesError}
            </p>
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

          {/* ⭐ THE WAY BACK IN. Reading the two names and finding they differ is exactly what
              `-226` cl.1 puts on this operator; without this button the only thing they could do
              about it was nothing. */}
          {!editing ? (
            <button
              type="button"
              data-testid="helpline-bank-edit"
              className="mt-3 self-start rounded border px-3 py-1 text-sm"
              disabled={pending}
              onClick={() => setEditing(true)}
            >
              {resolveEn('helpline.bank.correct')}
            </button>
          ) : null}
        </div>
      ) : null}

      {showForm ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {accountBlock(0, 'helpline.bank.primary')}
            {accountBlock(1, 'helpline.bank.secondary')}
          </div>

          {/* The mandatory, audited justification for writing over accounts already on file. */}
          {isCorrection ? (
            <label className="flex flex-col text-xs">
              <span className="opacity-70">{resolveEn('helpline.bank.correctionReason')}</span>
              <input
                className="rounded border px-2 py-1 text-sm"
                data-testid="helpline-bank-correction-reason"
                value={correctionReason}
                disabled={pending}
                onChange={(e) => setCorrectionReason(e.target.value)}
              />
            </label>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              data-testid="helpline-bank-submit"
              className="self-start rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
              disabled={pending || submitBlocked}
              onClick={() => void submit()}
            >
              {resolveEn(isCorrection ? 'helpline.bank.submitCorrection' : 'helpline.bank.submit')}
            </button>
            {editing ? (
              <button
                type="button"
                data-testid="helpline-bank-cancel-edit"
                className="self-start rounded border px-3 py-1 text-sm"
                disabled={pending}
                onClick={() => {
                  setEditing(false);
                  setValidationError(null);
                }}
              >
                {resolveEn('helpline.bank.cancelCorrection')}
              </button>
            ) : null}
          </div>
        </>
      ) : null}

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
