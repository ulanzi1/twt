// <CorrectionChasePanel> — ONE queue row's correction chase (Story 6.19b, AC8b, AC16).
//
// ⭐ What the District Admin sees per claim: the SHORT REFERENCE the family's texts quote (D33), WHO MUST ACT (who set
// it, when) and the change form, the run's day count and next reminder, the flags — "cannot remind" and why (D30),
// "the claimant cannot be reminded", "the family has corrected — awaiting your check" (`-269` §2(b)), "who must act:
// not set", "escalated" — a reminder summary PER PERSON by ROLE ("Nominee 1", "Claimant" — ⛔ never a name), and each
// letter's state with its overdue flag, plus the letter form for a person found unreachable. ⭐ A nominee WITHOUT a rank
// (D30, when the declaration is not effective) is "Nominee A", "Nominee B" — an ordinal by person-key order, ⛔ two
// indistinguishable "Nominee" rows (fifth-pass review 2026-10-01).
// ⭐ Semantic accessibility (family 13): every reachable state is ANNOUNCED (`role="status"`), ⛔ not merely styled.
// ⛔ No name, ⛔ no number, ⛔ no address here — the address shows only inside the letter form, on demand.
// ⭐ The letter form follows the PERSON, ⛔ not the headline run's kind: a letter (and its delivery) stays recordable
// after a switch to "staff" (AC5; the surface inventory's "letters stay recordable at any time") — `people` is
// non-empty exactly when a family/direction run exists for the live return (under D30 too). A person is letter-eligible once found
// dead (`found_dead_on`, the server's own predicate) — even after an earlier "reached".
// ⭐ Under D30 (`cannot_remind`) the people and their letters STAY listed — a posted letter's delivery is still
// recordable — but a NEW letter is ⛔ offered only while the family can be contacted (`cannot_remind === null`).
// ⚠ Every control is shown to every queue reader: the page cannot see keys (1)/(7) (district-dimension; the
// session carries only the national grants), so every control maps an error through ONE classifier (`errors.ts`).

import { useEffect, useRef, useState, type ReactElement } from 'react';

import type { ClaimsUnderCorrectionResponse, CorrectionLetterDto } from '@twt/contracts';

import { ApiError, getCorrectionLetterScreenshot } from '../../api/client.js';
import { CorrectionLetterForm } from './CorrectionLetterForm.js';
import { MustActChangeForm } from './MustActChangeForm.js';
import { correctionLetterRefusalText } from './errors.js';
import { correctionChaseEn as t } from './i18n-en.js';
import { formatIst } from './ist.js';

/** The longest a screenshot link is offered, whatever the server says (a huge value overflows `setTimeout`). */
const SCREENSHOT_LINK_MAX_SECONDS = 60 * 60;
/** Dropped this much BEFORE the signed URL expires — a click in the last seconds would open a dead link. */
const SCREENSHOT_LINK_MARGIN_SECONDS = 5;

/** How long to offer a signed screenshot link, from the server's `expires_in_seconds`; `null` ⇒ ⛔ not usable. */
export function screenshotLinkTtlMs(expiresInSeconds: unknown): number | null {
  if (typeof expiresInSeconds !== 'number' || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) return null;
  const seconds = Math.min(expiresInSeconds, SCREENSHOT_LINK_MAX_SECONDS) - SCREENSHOT_LINK_MARGIN_SECONDS;
  return seconds > 0 ? seconds * 1000 : null;
}

type Item = ClaimsUnderCorrectionResponse['items'][number];
type Person = Item['correction_chase']['people'][number];

/**
 * Each person's label by ROLE, ⛔ never a name: "Claimant"; "Nominee <rank>" when the rank is known; else an ordinal
 * among the RANKLESS nominees by person-key order ("Nominee A", "Nominee B") — stable across refetches, and two rows
 * ⛔ never read the same.
 */
export function personLabels(people: readonly Person[]): ReadonlyMap<string, string> {
  const rankless = people
    .filter((p) => p.role === 'nominee' && p.rank === null)
    .map((p) => p.person_key)
    .sort();
  const labels = new Map<string, string>();
  for (const p of people) {
    if (p.role === 'claimant') {
      labels.set(p.person_key, t.people.claimant);
    } else if (p.rank !== null) {
      labels.set(p.person_key, `${t.people.nominee} ${String(p.rank)}`);
    } else {
      const i = rankless.indexOf(p.person_key);
      labels.set(p.person_key, `${t.people.nominee} ${i < 26 ? String.fromCharCode(65 + i) : String(i + 1)}`);
    }
  }
  return labels;
}

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
  // ⭐ The in-flight GUARD is a ref — two clicks in one tick both read the render-time `false`.
  const loadingRef = useRef(false);
  const [link, setLink] = useState<{ readonly url: string; readonly ttlMs: number } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  // ⭐ The button and the link SWAP — focus follows to the replacement, ⛔ never dropped to <body>.
  const focusNext = useRef<'button' | 'link' | null>(null);
  useEffect(() => {
    const target = focusNext.current;
    if (target === null) return;
    focusNext.current = null;
    (target === 'link' ? linkRef.current : buttonRef.current)?.focus();
  });
  // ⭐ The signed URL is TTL-limited — drop the link when it expires rather than offer a dead one, and SAY so (the
  // link silently turning back into the button read as a click that did nothing).
  useEffect(() => {
    if (link === null) return;
    const id = setTimeout(() => {
      if (document.activeElement === linkRef.current) focusNext.current = 'button';
      setLink(null);
      setProblem(t.letters.screenshotExpired);
    }, link.ttlMs);
    return () => clearTimeout(id);
  }, [link]);
  // ⭐ FETCH, THEN RENDER A LINK (the `DeathCertificateReviewControl.tsx` precedent) — a `window.open` after an
  // `await` is popup-blocked, and with `noopener` the block cannot even be detected.
  async function loadLink(): Promise<void> {
    if (loadingRef.current) return;
    loadingRef.current = true;
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
      const ttlMs = screenshotLinkTtlMs(expires_in_seconds);
      if (!secure || ttlMs === null) {
        setProblem(!secure ? t.letters.screenshotBadLink : t.letters.screenshotError);
        return;
      }
      setLink({ url, ttlMs });
      focusNext.current = 'link';
    } catch (err) {
      // ⭐ Through the ONE classifier — a 403 / 401 / 429 each read as what they are (⛔ "Try again", a retry that can
      // never succeed); a 404 is "no screenshot on record".
      setProblem(
        err instanceof ApiError && err.status === 404
          ? t.letters.screenshotNotFound
          : correctionLetterRefusalText(err, t.letters.screenshotError),
      );
    } finally {
      loadingRef.current = false;
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
          <button ref={buttonRef} type="button" className="underline" disabled={loading} onClick={() => void loadLink()}>
            {t.letters.screenshotLoad}
          </button>
        ) : (
          <a
            ref={linkRef}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
            data-testid="letter-screenshot-link"
          >
            {t.letters.screenshotOpen}
          </a>
        )
      ) : null}
      {/* ⭐ PERSISTENT, its text changes — a live region that mounts already holding its text is ⛔ not announced. */}
      <span role="status" data-testid="letter-screenshot-status">
        {problem ?? ''}
      </span>
    </li>
  );
}

export interface CorrectionChasePanelProps {
  readonly pariwarId: string;
  readonly item: Item;
}

export function CorrectionChasePanel({ pariwarId, item }: CorrectionChasePanelProps): ReactElement {
  const c = item.correction_chase;
  const labels = personLabels(c.people);
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
        {/* ⭐ An OPEN run past its 90 days says so — ⛔ never "day 95 of 90". */}
        {c.run === null
          ? t.run.none
          : c.run.open
            ? `${t.run[c.run.kind]} · ${
                c.run.day_count > 90 ? t.run.pastDay90 : `${t.run.day} ${String(c.run.day_count)} ${t.run.of90}`
              }${c.run.next_reminder_on !== null ? ` · ${t.run.next} ${c.run.next_reminder_on}` : ''}`
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
              const label = labels.get(p.person_key) ?? t.people.nominee;
              // ⭐ `found_dead_on`, ⛔ not `status` — the server's own predicate; a number found dead AFTER an earlier
              // "reached" is still letter-eligible (and the sweep chases the District Admin for that letter).
              const eligible = p.found_dead_on !== null;
              // ⭐ D30 (J6) — a NEW letter needs the family to be contactable; a posted one's delivery never does.
              const canRecordNew = eligible && c.cannot_remind === null;
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
                      found dead (a new number resets that, `-271` §1) — only a NEW letter needs eligibility. ⭐ The
                      form stays mounted while the person has ANY letter — it holds the delivery's confirmation,
                      which must outlive the refetch that marks the letter delivered. */}
                  {canRecordNew || p.letters.length > 0 ? (
                    <CorrectionLetterForm
                      pariwarId={pariwarId}
                      claimCaseId={item.claim_case_id}
                      personKey={p.person_key}
                      letters={p.letters}
                      familyRunDay0={c.run !== null && c.run.kind !== 'staff' ? c.run.day0 : null}
                      canRecord={canRecordNew}
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
