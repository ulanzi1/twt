// <CorrectionChasePanel> — ONE queue row's correction chase (Story 6.19b, AC8b, AC16).
//
// ⭐ What the District Admin sees per claim: the SHORT REFERENCE the family's texts quote (D33), WHO MUST ACT (who set
// it, when) and the change form, the run's day count and next reminder, the flags — "cannot remind" and why (D30),
// "the claimant cannot be reminded", "the family has corrected — awaiting your check" (`-269` §2(b)), "who must act:
// not set", "escalated" — a reminder summary PER PERSON by ROLE ("Nominee 1", "Claimant" — ⛔ never a name), and each
// letter's state with its overdue flag, plus the letter form for a person found unreachable.
// ⭐ Semantic accessibility (family 13): every reachable state is ANNOUNCED (`role="status"`), ⛔ not merely styled.
// ⛔ No name, ⛔ no number, ⛔ no address here — the address shows only inside the letter form, on demand.
// ⭐ The letter form follows the PERSON, ⛔ not the headline run's kind: a letter (and its delivery) stays recordable
// after a switch to "staff" (AC5; the surface inventory's "letters stay recordable at any time") — `people` is
// non-empty exactly when a family/direction run exists for the live return. A person is letter-eligible once found
// dead (`found_dead_on`, the server's own predicate) — even after an earlier "reached".
// ⚠ Every control is shown to every queue reader: the page cannot see keys (1)/(7) (district-dimension; the
// session carries only the national grants), so each form maps a 403 to its own "your role cannot" line.

import { useEffect, useState, type ReactElement } from 'react';

import type { ClaimsUnderCorrectionResponse, CorrectionLetterDto } from '@twt/contracts';

import { getCorrectionLetterScreenshot } from '../../api/client.js';
import { CorrectionLetterForm } from './CorrectionLetterForm.js';
import { MustActChangeForm } from './MustActChangeForm.js';
import { correctionChaseEn as t } from './i18n-en.js';
import { formatIst } from './ist.js';

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
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<{ readonly url: string; readonly ttlMs: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // ⭐ The signed URL is TTL-limited — drop the link when it expires rather than offer a dead one.
  useEffect(() => {
    if (link === null) return;
    const id = setTimeout(() => setLink(null), link.ttlMs);
    return () => clearTimeout(id);
  }, [link]);
  // ⭐ FETCH, THEN RENDER A LINK (the `DeathCertificateReviewControl.tsx` precedent) — a `window.open` after an
  // `await` is popup-blocked, and with `noopener` the block cannot even be detected.
  async function loadLink(): Promise<void> {
    if (loading) return;
    setLoading(true);
    setProblem(null);
    try {
      const { url, expires_in_seconds } = await getCorrectionLetterScreenshot(pariwarId, claimCaseId, letter.letter_id);
      let secure = false;
      try {
        secure = new URL(url).protocol === 'https:';
      } catch {
        secure = false;
      }
      if (!secure) {
        setProblem(t.letters.screenshotBadLink);
        return;
      }
      setLink({ url, ttlMs: expires_in_seconds * 1000 });
    } catch {
      setProblem(t.letters.screenshotError);
    } finally {
      setLoading(false);
    }
  }
  return (
    <li className="flex flex-wrap items-center gap-2" data-testid={`letter-${letter.letter_id}`}>
      {/* ⭐ The letter's OWN state is announced — a recorded delivery changes it in place. */}
      <span role="status" data-testid="letter-state">
        #{letter.sequence} · {t.letters.posted} {letter.posted_on} ·{' '}
        {letter.delivered_on === null ? t.letters.notDelivered : `${t.letters.delivered} ${letter.delivered_on}`}
      </span>
      {letter.overdue ? (
        <StatusFlag testId="letter-overdue">{letter.delivered_on === null ? t.letters.overdue : t.letters.deliveredLate}</StatusFlag>
      ) : null}
      {letter.has_screenshot ? (
        link === null ? (
          <button type="button" className="underline" disabled={loading} onClick={() => void loadLink()}>
            {t.letters.screenshotLoad}
          </button>
        ) : (
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="underline" data-testid="letter-screenshot-link">
            {t.letters.screenshotOpen}
          </a>
        )
      ) : null}
      {problem !== null ? <span role="status">{problem}</span> : null}
    </li>
  );
}

export interface CorrectionChasePanelProps {
  readonly pariwarId: string;
  readonly item: Item;
}

export function CorrectionChasePanel({ pariwarId, item }: CorrectionChasePanelProps): ReactElement {
  const c = item.correction_chase;
  return (
    <section className="mt-2 flex flex-col gap-2 border-t pt-2 text-xs" aria-label={`${t.heading} — ${item.short_reference}`}>
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
            {c.must_act_set_by !== null ? ` · ${t.mustAct.setBy} ${c.must_act_set_by}` : ''}
            {c.must_act_set_at !== null ? ` · ${formatIst(c.must_act_set_at)}` : ''}
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
        {/* ⭐ An ENDED run shows when it started and the day it ended — ⛔ never its day count, which kept growing
            past 90 ("day 140 of 90"). */}
        {c.run === null
          ? t.run.none
          : c.run.open
            ? `${t.run[c.run.kind]} · ${t.run.day} ${String(c.run.day_count)} ${t.run.of90}${
                c.run.next_reminder_on !== null ? ` · ${t.run.next} ${c.run.next_reminder_on}` : ''
              }`
            : `${t.run[c.run.kind]} · ${t.run.started} ${c.run.day0} · ${
                c.run.ended_on !== null ? `${t.run.endedOn} ${c.run.ended_on}` : t.run.ended
              }`}
      </p>

      {c.return_decision_id !== null ? <MustActChangeForm pariwarId={pariwarId} claimCaseId={item.claim_case_id} current={c.must_act} /> : null}

      {c.people.length > 0 ? (
        <div>
          <p className="font-medium">{t.people.heading}</p>
          <ul className="mt-1 flex flex-col gap-2">
            {c.people.map((p) => {
              const label = p.role === 'claimant' ? t.people.claimant : `${t.people.nominee} ${String(p.rank ?? '')}`.trim();
              // ⭐ `found_dead_on`, ⛔ not `status` — the server's own predicate; a number found dead AFTER an earlier
              // "reached" is still letter-eligible (and the sweep chases the District Admin for that letter).
              const eligible = p.found_dead_on !== null;
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
                  {/* ⭐ A delivery stays recordable for a letter already posted even when the person is no longer
                      found dead (a new number resets that, `-271` §1) — only a NEW letter needs eligibility. */}
                  {eligible || p.letters.some((l) => l.delivered_on === null) ? (
                    <CorrectionLetterForm
                      pariwarId={pariwarId}
                      claimCaseId={item.claim_case_id}
                      personKey={p.person_key}
                      letters={p.letters}
                      canRecord={eligible}
                    />
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
