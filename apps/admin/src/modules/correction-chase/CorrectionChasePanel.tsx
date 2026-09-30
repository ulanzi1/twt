// <CorrectionChasePanel> — ONE queue row's correction chase (Story 6.19b, AC8b, AC16).
//
// ⭐ What the District Admin sees per claim: the SHORT REFERENCE the family's texts quote (D33), WHO MUST ACT (who set
// it, when) and the change form, the run's day count and next reminder, the flags — "cannot remind" and why (D30),
// "the claimant cannot be reminded", "the family has corrected — awaiting your check" (`-269` §2(b)), "who must act:
// not set", "escalated" — a reminder summary PER PERSON by ROLE ("Nominee 1", "Claimant" — ⛔ never a name), and each
// letter's state with its overdue flag, plus the letter form for a person found unreachable.
// ⭐ Semantic accessibility (family 13): every reachable state is ANNOUNCED (`role="status"`), ⛔ not merely styled.
// ⛔ No name, ⛔ no number, ⛔ no address here — the address shows only inside the letter form, on demand.

import { useState, type ReactElement } from 'react';

import type { ClaimsUnderCorrectionResponse, CorrectionLetterDto } from '@twt/contracts';

import { getCorrectionLetterScreenshot } from '../../api/client.js';
import { CorrectionLetterForm } from './CorrectionLetterForm.js';
import { MustActChangeForm } from './MustActChangeForm.js';
import { correctionChaseEn as t } from './i18n-en.js';

type Item = ClaimsUnderCorrectionResponse['items'][number];

function StatusFlag({ testId, children }: { readonly testId: string; readonly children: string }): ReactElement {
  return (
    <span role="status" data-testid={testId} className="rounded bg-status-warn-bg px-1.5 py-0.5 text-xs text-status-warn-fg">
      {children}
    </span>
  );
}

function LetterLine({
  pariwarId,
  claimCaseId,
  letter,
}: {
  readonly pariwarId: string;
  readonly claimCaseId: string;
  readonly letter: CorrectionLetterDto;
}): ReactElement {
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState(false);
  async function openScreenshot(): Promise<void> {
    setOpening(true);
    setOpenError(false);
    try {
      const { url } = await getCorrectionLetterScreenshot(pariwarId, claimCaseId, letter.letter_id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setOpenError(true);
    } finally {
      setOpening(false);
    }
  }
  return (
    <li className="flex flex-wrap items-center gap-2" data-testid={`letter-${letter.letter_id}`}>
      <span>
        #{letter.sequence} · {t.letters.posted} {letter.posted_on} ·{' '}
        {letter.delivered_on === null ? t.letters.notDelivered : `${t.letters.delivered} ${letter.delivered_on}`}
      </span>
      {letter.overdue ? (
        <StatusFlag testId="letter-overdue">{letter.delivered_on === null ? t.letters.overdue : t.letters.deliveredLate}</StatusFlag>
      ) : null}
      {letter.has_screenshot ? (
        <button type="button" className="underline" disabled={opening} onClick={() => void openScreenshot()}>
          {t.letters.screenshot}
        </button>
      ) : null}
      {openError ? <span role="status">{t.letters.screenshotError}</span> : null}
    </li>
  );
}

export interface CorrectionChasePanelProps {
  readonly pariwarId: string;
  readonly item: Item;
}

export function CorrectionChasePanel({ pariwarId, item }: CorrectionChasePanelProps): ReactElement {
  const c = item.correction_chase;
  const familyRun = c.run !== null && (c.run.kind === 'family' || c.run.kind === 'direction');
  return (
    <section className="mt-2 flex flex-col gap-2 border-t pt-2 text-xs" aria-label={`${t.mustAct.heading} — ${item.short_reference}`}>
      <p>
        <span className="opacity-70">{t.reference}: </span>
        <code className="font-mono" data-testid="queue-short-reference" title={t.referenceHelp}>
          {item.short_reference}
        </code>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {c.return_decision_id !== null && c.must_act === null ? <StatusFlag testId="flag-must-act-not-set">{t.mustAct.notSet}</StatusFlag> : null}
        {c.must_act !== null ? (
          <span role="status" data-testid="queue-must-act" className="rounded bg-black/5 px-1.5 py-0.5">
            {c.must_act === 'family' ? t.mustAct.family : t.mustAct.staff}
            {c.must_act_set_by !== null ? ` · ${t.mustAct.setBy} ${c.must_act_set_by} · ${c.must_act_set_at ?? ''}` : ''}
          </span>
        ) : null}
        {c.cannot_remind !== null ? (
          <StatusFlag testId="flag-cannot-remind">{`${t.flags.cannotRemind} — ${t.flags.reasons[c.cannot_remind]}`}</StatusFlag>
        ) : null}
        {c.claimant_unresolved ? <StatusFlag testId="flag-claimant-unresolved">{t.flags.claimantUnresolved}</StatusFlag> : null}
        {c.awaiting_check ? <StatusFlag testId="flag-awaiting-check">{t.flags.awaitingCheck}</StatusFlag> : null}
        {c.escalated ? <StatusFlag testId="flag-escalated">{t.flags.escalated}</StatusFlag> : null}
      </div>

      <p data-testid="queue-run" role="status">
        {c.run === null
          ? t.run.none
          : `${t.run[c.run.kind]} · ${t.run.day} ${String(c.run.day_count)} ${t.run.of90}${
              c.run.open ? (c.run.next_reminder_on !== null ? ` · ${t.run.next} ${c.run.next_reminder_on}` : '') : ` · ${t.run.ended}`
            }`}
      </p>

      {c.return_decision_id !== null ? <MustActChangeForm pariwarId={pariwarId} claimCaseId={item.claim_case_id} current={c.must_act} /> : null}

      {c.people.length > 0 ? (
        <div>
          <p className="font-medium">{t.people.heading}</p>
          <ul className="mt-1 flex flex-col gap-2">
            {c.people.map((p) => {
              const label = p.role === 'claimant' ? t.people.claimant : `${t.people.nominee} ${String(p.rank ?? '')}`.trim();
              const eligible = p.status === 'dead' || p.status === 'unreachable';
              return (
                <li key={p.person_key} className="rounded border p-2" data-testid={`person-${p.person_key}`}>
                  <span className="font-medium">{label}</span>{' '}
                  <span role="status" data-testid="person-status">
                    {t.people.status[p.status]}
                    {p.found_dead_on !== null ? ` ${t.people.since} ${p.found_dead_on}` : ''}
                  </span>
                  <span className="opacity-70"> · {String(p.reminders_accepted)} {t.people.reminders}</span>
                  {p.letters.length > 0 ? (
                    <ul className="mt-1">
                      {p.letters.map((l) => (
                        <LetterLine key={l.letter_id} pariwarId={pariwarId} claimCaseId={item.claim_case_id} letter={l} />
                      ))}
                    </ul>
                  ) : (
                    eligible && <p className="mt-1 opacity-70">{t.letters.none}</p>
                  )}
                  {eligible && familyRun ? (
                    <CorrectionLetterForm pariwarId={pariwarId} claimCaseId={item.claim_case_id} personKey={p.person_key} letters={p.letters} />
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
