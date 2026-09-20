// The nominee NAME CHECK panel — Story 6.18 (AC2, AC3, AC5, AC6, AC8).
//
// `2026-09-19-226` cl.3: *"Mismatch is reviewed by District Admin."* cl.5: *"System shouldn't act
// for name mismatch at any time, but display/highlight…"* and *"District Admin cannot proceed
// unless reason for name mismatch is selected."*
//
// ⛔⛔ TRAP 1 — THIS COMPONENT RENDERS NO COMPARISON. It shows two INDEPENDENT lists side by side:
// the holder name on each bank account, and the nominees the member declared. It does ⛔ NOT pair
// them, ⛔ not sort one by resemblance to the other, ⛔ not colour a "likely match", and ⛔ not show
// a score, a diff or a "looks different" hint. A person reads both columns and decides. Any future
// "helpful" highlight here would reverse a ratified ruling by way of a UI edit.
//
// ⭐ PURE COMPONENT, the `<VerificationDecisionStrip>` shape: every input arrives as a prop and the
// parent owns the mutation. That is what lets the tests drive it without a network.

import { useState } from 'react';

import type {
  NomineeNameClericalReason,
  NomineeNameCheckEntry,
  NomineeNameCheckResponse,
  NomineeNameCheckVerdict,
} from '@twt/contracts';

import { verifierConsoleEn as t } from './i18n-en.js';

export interface NomineeNameCheckSubmit {
  nominee_declaration_token: string;
  accounts: NomineeNameCheckEntry[];
}

export interface NomineeNameCheckPanelProps {
  /** The AC2 read. `undefined` while loading. */
  data?: NomineeNameCheckResponse | undefined;
  loading?: boolean;
  /** An error from the read or the write, already rendered as a message. */
  error?: string | null;
  /** `true` when the viewer holds `claim.check_nominee_name` — the District Admin alone (AC1). */
  canCheck: boolean;
  onSubmit: (input: NomineeNameCheckSubmit) => Promise<void>;
  processing?: boolean;
}

const VERDICTS: NomineeNameCheckVerdict[] = ['matches', 'clerical_difference', 'does_not_match'];
const REASONS: NomineeNameClericalReason[] = ['initial', 'married_name', 'bank_shortened_name'];

/** Render one Tier-1 name union. ⭐ The three states are NEVER collapsed into a blank. */
function NameValue({
  value,
}: {
  value:
    | { state: 'readable'; value: string }
    | { state: 'unreadable' }
    | { state: 'anonymized' };
}): React.ReactElement {
  if (value.state === 'readable') return <span className="font-medium">{value.value}</span>;
  if (value.state === 'anonymized') {
    // ⭐ A person who exercised erasure. NOT a missing name and NOT a failure — saying "unavailable"
    // here would misreport a deliberate, lawful act as a technical fault.
    return <span className="italic text-slate-500">{t.nameCheck.anonymized}</span>;
  }
  return <span className="italic text-amber-700">{t.nameCheck.unreadable}</span>;
}

export function NomineeNameCheckPanel(props: NomineeNameCheckPanelProps): React.ReactElement {
  const { data, loading, error, canCheck, onSubmit, processing } = props;
  const [verdicts, setVerdicts] = useState<Record<number, NomineeNameCheckVerdict | ''>>({});
  const [reasons, setReasons] = useState<Record<number, NomineeNameClericalReason | ''>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  if (loading) return <section aria-label={t.nameCheck.heading} data-testid="name-check-loading">{t.nameCheck.loading}</section>;
  if (!data) {
    return (
      <section aria-label={t.nameCheck.heading} data-testid="name-check-error">
        <p role="alert">{error ?? t.nameCheck.loadError}</p>
      </section>
    );
  }

  // ⭐ AC6 — said EXPLICITLY, never implied by an empty panel. `-226` cl.7 makes both accounts
  // mandatory, and a claim filed before that ruling WAITS for them — it is ⛔ never refused for it,
  // so the copy says "needed", not "missing"/"rejected".
  const accountsMissing = !data.accounts_complete;
  const noNominees = data.declared_nominees.length === 0;

  const submit = async (): Promise<void> => {
    setValidationError(null);
    const entries: NomineeNameCheckEntry[] = [];
    for (const account of data.accounts) {
      const verdict = verdicts[account.account_rank];
      if (!verdict) {
        setValidationError(t.nameCheck.verdictRequired);
        return;
      }
      // ⭐ cl.5 — *"District Admin cannot proceed unless reason for name mismatch is selected."*
      // Enforced HERE as well as at the boundary and in the domain, because the operator must be
      // told what is missing before they submit, not after.
      if (verdict === 'clerical_difference' && !reasons[account.account_rank]) {
        setValidationError(t.nameCheck.reasonRequired);
        return;
      }
      entries.push({
        account_rank: account.account_rank,
        account_updated_at: account.account_updated_at,
        verdict,
        ...(verdict === 'clerical_difference'
          ? { clerical_reason: reasons[account.account_rank] as NomineeNameClericalReason }
          : {}),
      });
    }
    try {
      await onSubmit({ nominee_declaration_token: data.nominee_declaration_token, accounts: entries });
    } catch {
      /* the caller's mutation hook owns `error` */
    }
  };

  return (
    <section aria-label={t.nameCheck.heading} data-testid="name-check-panel" className="space-y-4">
      <h3 className="font-semibold">{t.nameCheck.heading}</h3>
      <p className="text-sm text-slate-600">{t.nameCheck.intro}</p>

      {/* ⭐ AC11 — the Pariwar Admin RETURNED this claim. Shown FIRST, because it is the instruction
          the District Admin came here to act on (`-227` cl.10: contact the claimant, get it
          corrected, re-check). ⛔ The copy says "returned", never "denied" or "rejected". */}
      {data.correction_return !== null ? (
        <div data-testid="name-check-returned" className="rounded border border-amber-300 bg-amber-50 p-3">
          <p className="font-medium text-amber-900">{t.nameCheck.returnedHeading}</p>
          <p className="text-sm text-amber-900">
            <span className="text-xs uppercase">{t.nameCheck.returnedBy}: </span>
            {data.correction_return.returned_by_actor_display || '—'} · {data.correction_return.returned_at}
          </p>
          <p className="mt-1 text-sm" data-testid="name-check-return-note">
            <span className="text-xs uppercase text-slate-600">{t.nameCheck.returnNote}: </span>
            <NameValue value={data.correction_return.note} />
          </p>
          <p className="mt-2 text-sm" data-testid="name-check-resubmitted">
            {data.correction_return.resubmitted
              ? t.nameCheck.resubmitted
              : t.nameCheck.awaitingCorrection}
          </p>
        </div>
      ) : null}

      {accountsMissing ? (
        <p role="alert" data-testid="name-check-bank-missing" className="text-amber-800">
          {t.nameCheck.bankDetailsMissing}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-6">
        {/* ── Column A: the bank accounts ── */}
        <div data-testid="name-check-accounts">
          <h4 className="text-sm font-semibold">{t.nameCheck.accountsHeading}</h4>
          {data.accounts.length === 0 ? (
            <p className="text-sm text-slate-500">{t.nameCheck.noAccounts}</p>
          ) : (
            <ul className="space-y-3">
              {data.accounts.map((a) => (
                <li key={a.account_rank} data-testid={`name-check-account-${a.account_rank}`}>
                  <div className="text-xs uppercase text-slate-500">
                    {t.nameCheck.accountLabel} #{a.account_rank}
                  </div>
                  <NameValue value={a.holder_name} />
                  {a.name_difference_note !== null ? (
                    <p
                      className="mt-1 text-sm text-slate-700"
                      data-testid={`name-check-note-${a.account_rank}`}
                    >
                      <span className="text-xs uppercase text-slate-500">{t.nameCheck.filerNote}: </span>
                      <NameValue value={a.name_difference_note} />
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Column B: the declared nominees ── */}
        <div data-testid="name-check-nominees">
          <h4 className="text-sm font-semibold">{t.nameCheck.nomineesHeading}</h4>
          {noNominees ? (
            // ⭐ AC2 — "the member declared nobody" is a FACT the District Admin needs stated, not an
            // empty box they might read as a loading failure.
            <p className="text-sm text-slate-700" data-testid="name-check-no-nominees">
              {t.nameCheck.noNominees}
            </p>
          ) : (
            <ul className="space-y-3">
              {data.declared_nominees.map((n) => (
                <li key={n.rank} data-testid={`name-check-nominee-${n.rank}`}>
                  <div className="text-xs uppercase text-slate-500">
                    {t.nameCheck.nomineeLabel} #{n.rank} · {n.relationship} · {n.split_pct}%
                  </div>
                  <NameValue value={n.nominee_name} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* ⭐ Two PLAIN dates, side by side, with ⛔ no highlight and ⛔ no derived warning (AC2/AC10).
          The filer can rewrite the declared nominee after the death, so both names can come from the
          same hand. Showing the dates lets a District Admin SEE that; the story deliberately does
          ⛔ not fix it, and the hazard stays recorded and open. */}
      <dl className="flex gap-6 text-sm" data-testid="name-check-dates">
        <div>
          <dt className="text-xs uppercase text-slate-500">{t.nameCheck.declaredAt}</dt>
          <dd>{data.nominee_declared_at ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">{t.nameCheck.filedAt}</dt>
          <dd>{data.claim_filed_at}</dd>
        </div>
      </dl>

      {/* ── The recorded check ── */}
      {data.current_check !== null ? (
        <p data-testid="name-check-current" className="text-sm">
          {t.nameCheck.recordedBy} {data.current_check.checked_by_actor_display || '—'} ·{' '}
          {data.current_check.checked_at}
          {data.current_check.accounts.some((a) => a.verdict === 'clerical_difference') ? (
            // ⭐ AC8 — the highlight. It comes from the District Admin's RECORDED judgement, ⛔ never
            // from a computer comparison, and it carries only the reason CODE — never a name.
            <span data-testid="name-check-difference-flag" className="ml-2 rounded bg-amber-100 px-2 py-0.5">
              {t.nameCheck.approvedWithDifference}:{' '}
              {data.current_check.accounts
                .filter((a) => a.clerical_reason !== null)
                .map((a) => t.nameCheck.reasons[a.clerical_reason as NomineeNameClericalReason])
                .join(', ')}
            </span>
          ) : null}
        </p>
      ) : (
        // ⛔ A check is NEVER inferred or back-filled — a claim decided before this shipped says so
        // rather than being credited with a judgement nobody made.
        <p data-testid="name-check-none" className="text-sm text-slate-600">
          {t.nameCheck.notYetChecked}
        </p>
      )}

      {/* ── The verdict control (District Admin only) ── */}
      {canCheck && data.accounts.length > 0 ? (
        <div data-testid="name-check-form" className="space-y-3 border-t pt-3">
          {data.accounts.map((a) => (
            <div key={a.account_rank} className="flex items-center gap-3">
              <span className="text-sm">
                {t.nameCheck.accountLabel} #{a.account_rank}
              </span>
              <select
                data-testid={`name-check-verdict-${a.account_rank}`}
                aria-label={`${t.nameCheck.verdictLabel} #${a.account_rank}`}
                value={verdicts[a.account_rank] ?? ''}
                disabled={processing}
                onChange={(e) => {
                  const v = e.target.value as NomineeNameCheckVerdict | '';
                  setVerdicts((prev) => ({ ...prev, [a.account_rank]: v }));
                  // Clear a stale reason when the verdict leaves `clerical_difference` — the
                  // boundary FORBIDS a reason on any other verdict, so leaving one would 400.
                  if (v !== 'clerical_difference') {
                    setReasons((prev) => ({ ...prev, [a.account_rank]: '' }));
                  }
                }}
              >
                <option value="">{t.nameCheck.verdictPlaceholder}</option>
                {VERDICTS.map((v) => (
                  <option key={v} value={v}>
                    {t.nameCheck.verdicts[v]}
                  </option>
                ))}
              </select>
              {verdicts[a.account_rank] === 'clerical_difference' ? (
                <select
                  data-testid={`name-check-reason-${a.account_rank}`}
                  aria-label={`${t.nameCheck.reasonLabel} #${a.account_rank}`}
                  value={reasons[a.account_rank] ?? ''}
                  disabled={processing}
                  onChange={(e) =>
                    setReasons((prev) => ({
                      ...prev,
                      [a.account_rank]: e.target.value as NomineeNameClericalReason | '',
                    }))
                  }
                >
                  <option value="">{t.nameCheck.reasonPlaceholder}</option>
                  {REASONS.map((r) => (
                    <option key={r} value={r}>
                      {t.nameCheck.reasons[r]}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          ))}

          {/* ⭐ AC5 — a `does_not_match` verdict SENDS THE CLAIM BACK. The copy says that plainly,
              because an operator must not believe they are denying the claim: cl.6 rules it is
              ⛔ never a denial. */}
          {Object.values(verdicts).some((v) => v === 'does_not_match') ? (
            <p data-testid="name-check-sent-back-hint" className="text-sm text-amber-800">
              {t.nameCheck.sentBackHint}
            </p>
          ) : null}

          <button
            type="button"
            data-testid="name-check-submit"
            className="rounded bg-slate-800 px-3 py-1 text-sm text-white disabled:opacity-50"
            disabled={processing || accountsMissing}
            onClick={() => void submit()}
          >
            {t.nameCheck.submit}
          </button>
        </div>
      ) : null}

      {validationError !== null ? (
        <p role="alert" data-testid="name-check-validation-error">
          {validationError}
        </p>
      ) : null}
      {error != null && error !== '' ? (
        <p role="alert" data-testid="name-check-submit-error">
          {error}
        </p>
      ) : null}
    </section>
  );
}
