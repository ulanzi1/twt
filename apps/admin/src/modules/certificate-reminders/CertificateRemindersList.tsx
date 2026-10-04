// The District Admin's "Certificate reminders" LIST and the ONE-letter form — Story 6.19d (AC4, AC5; `2026-10-03-276`
// CR9–CR11; key (1)).
//
// Each claim: its short reference (⛔ no name), why the family is waiting, the run's day and next reminder — or which
// pause — and the "cannot remind" flag; each person BY POSITION AND ROLE (⛔ no name, ⛔ never a rank), their text state,
// the day-13 escalation's RECORD date (⚠ the Pariwar Admin is ⛔ not notified in v1 — said so), and their letter: owed,
// posted, delivered, overdue. The form reveals the address only behind a FRESH step-up (one audit line per reveal),
// records the posting (date + tracking number) and later the delivery date + ONE screenshot. ⛔ A second letter is refused
// by the server (`-275` Q1 A — one per person per claim, ever).
// ⭐ The success line sits OUTSIDE the form's branch: after the refetch the person shows their letter, and the line is
// still on screen (TanStack awaits `onSettled`'s refetch before `success` — 6.19c's ClosureColumn lesson). The submit is
// disabled while the mutation OR its refetch is pending (the 6.19b double-submit finding).

import type { CertificateRemindersResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useEffect, useId, useState } from 'react';

import * as api from '../../api/client.js';
import { ApiError } from '../../api/client.js';
import { useRecordCertificateLetter, useRecordCertificateLetterDelivery } from '../../api/hooks.js';
import { STEP_UP_REQUIRED_CODE } from '../correction-chase/errors.js';
import { certificateErrorText } from './errors.js';
import { certificateRemindersEn as t } from './i18n-en.js';

type Item = CertificateRemindersResponse['items'][number];
type Person = Item['people'][number];
const l = t.letter;

/** The longest a screenshot link is offered, whatever the server says (a huge value overflows `setTimeout`). */
const SCREENSHOT_LINK_MAX_SECONDS = 60 * 60;
/** Dropped this much BEFORE the signed URL expires — a click in the last seconds would open a dead link. */
const SCREENSHOT_LINK_MARGIN_SECONDS = 5;

/** How long to offer a signed screenshot link, from the server's `expires_in_seconds`; `null` ⇒ ⛔ not usable. */
function screenshotLinkTtlMs(expiresInSeconds: unknown): number | null {
  if (typeof expiresInSeconds !== 'number' || !Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) return null;
  const seconds = Math.min(expiresInSeconds, SCREENSHOT_LINK_MAX_SECONDS) - SCREENSHOT_LINK_MARGIN_SECONDS;
  return seconds > 0 ? seconds * 1000 : null;
}

function personLabel(p: Person): string {
  return p.role === 'claimant' ? (t.role['claimant'] ?? 'claimant') : `${t.role['nominee'] ?? 'nominee'} ${p.position ?? ''}`.trim();
}

function LetterForm({ pariwarId, item, person }: { pariwarId: string; item: Item; person: Person }): ReactElement {
  const record = useRecordCertificateLetter(pariwarId, item.claim_case_id);
  const deliver = useRecordCertificateLetterDelivery(pariwarId, item.claim_case_id);
  const [postedOn, setPostedOn] = useState('');
  const [tracking, setTracking] = useState('');
  const [deliveredOn, setDeliveredOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  const [revealPending, setRevealPending] = useState(false);
  const [postMissing, setPostMissing] = useState(false);
  const [deliverMissing, setDeliverMissing] = useState(false);
  const [screenshotLink, setScreenshotLink] = useState<{ url: string; ttlMs: number } | null>(null);
  const [screenshotProblem, setScreenshotProblem] = useState<string | null>(null);
  // Address-reveal and screenshot-load share the SAME fresh step-up context — one code entry serves whichever
  // action asked for it.
  const [pendingAction, setPendingAction] = useState<'address' | 'screenshot' | null>(null);
  // ⭐ Set when a REPEAT code request succeeds — the only sign the click did anything (code review round 3).
  const [newCodeSent, setNewCodeSent] = useState(false);
  const codeInputId = useId();
  const screenshotCodeInputId = useId();
  const postMissingId = useId();
  const deliverMissingId = useId();
  const testKey = `${item.claim_case_id}-${person.person_key}`;
  const letter = person.letter;

  // ⭐ The signed URL is TTL-limited — drop the link when it expires rather than offer a dead one, and SAY so.
  useEffect(() => {
    if (screenshotLink === null) return;
    const id = setTimeout(() => {
      setScreenshotLink(null);
      setScreenshotProblem(l.screenshotExpired);
    }, screenshotLink.ttlMs);
    return () => clearTimeout(id);
  }, [screenshotLink]);

  /** `true` when a fresh code was requested (the address needs one); `false` when revealed or refused. */
  async function doReveal(): Promise<boolean> {
    setAddressError(null);
    try {
      const r = await api.getCertificateLetterAddress(pariwarId, item.claim_case_id, person.person_key);
      setAddress(r.address);
      setNeedsCode(false);
      setNewCodeSent(false);
      return false;
    } catch (err) {
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        try {
          await api.requestStepUp(api.CERTIFICATE_LETTER_ADDRESS_STEP_UP_CONTEXT);
          setPendingAction('address');
          setNeedsCode(true);
          return true;
        } catch (stepUpErr) {
          setAddressError(certificateErrorText(stepUpErr));
        }
        return false;
      }
      setAddressError(certificateErrorText(err));
      return false;
    }
  }

  async function doLoadScreenshot(letterId: string): Promise<void> {
    setScreenshotProblem(null);
    try {
      const { url, expires_in_seconds } = await api.getCertificateLetterScreenshot(pariwarId, item.claim_case_id, letterId);
      const ttlMs = screenshotLinkTtlMs(expires_in_seconds);
      if (ttlMs === null) {
        setScreenshotProblem(l.screenshotError);
        return;
      }
      setScreenshotLink({ url, ttlMs });
      setNeedsCode(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        try {
          await api.requestStepUp(api.CERTIFICATE_LETTER_ADDRESS_STEP_UP_CONTEXT);
          setPendingAction('screenshot');
          setNeedsCode(true);
        } catch (stepUpErr) {
          setScreenshotProblem(certificateErrorText(stepUpErr, l.screenshotError));
        }
        return;
      }
      setScreenshotProblem(certificateErrorText(err, l.screenshotError));
    }
  }

  async function reveal(): Promise<void> {
    if (revealPending) return;
    setRevealPending(true);
    await doReveal();
    setRevealPending(false);
  }

  /** "Send a new code" — clears the dead code and SAYS when a new one went out. */
  async function requestNewCode(): Promise<void> {
    if (revealPending) return;
    setRevealPending(true);
    setCode('');
    setNewCodeSent(false);
    if (await doReveal()) setNewCodeSent(true);
    setRevealPending(false);
  }

  async function loadScreenshot(): Promise<void> {
    if (revealPending || letter === null) return;
    setRevealPending(true);
    await doLoadScreenshot(letter.letter_id);
    setRevealPending(false);
  }

  async function verifyAndRetry(): Promise<void> {
    if (revealPending) return;
    setRevealPending(true);
    const action = pendingAction;
    try {
      await api.verifyStepUp(code);
      setCode('');
    } catch (err) {
      const text = certificateErrorText(err, action === 'screenshot' ? l.screenshotError : undefined);
      if (action === 'screenshot') setScreenshotProblem(text);
      else setAddressError(text);
      setRevealPending(false);
      return;
    }
    if (action === 'screenshot' && letter !== null) await doLoadScreenshot(letter.letter_id);
    else await doReveal();
    setRevealPending(false);
  }
  return (
    <div className="mt-1 flex flex-col gap-1 text-xs" data-testid={`certificate-letter-${testKey}`}>
      {letter === null ? (
        <>
          <p>{l.owed}</p>
          <p data-testid="certificate-letter-must-say">{l.mustSay}</p>
          <p>{l.onlyOne}</p>
          {address === null && !needsCode ? (
            <button
              type="button"
              className="self-start rounded border px-2 py-0.5"
              disabled={revealPending}
              onClick={() => void reveal()}
              data-testid="certificate-letter-reveal"
            >
              {l.showAddress}
            </button>
          ) : address !== null ? (
            <p data-testid="certificate-letter-address" className="whitespace-pre-line">
              {address}
            </p>
          ) : null}
          {needsCode && pendingAction === 'address' ? (
            // ⚠ The label names the INPUT alone — the buttons sit outside it (round 3: inside, they joined the
            // input's accessible name).
            <div className="flex flex-col">
              <label htmlFor={codeInputId}>{l.code}</label>
              <input
                id={codeInputId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                data-testid="certificate-letter-code"
              />
              <button
                type="button"
                className="self-start rounded border px-2 py-0.5"
                disabled={revealPending}
                onClick={() => void verifyAndRetry()}
                data-testid="certificate-letter-verify"
              >
                {l.verifyCode}
              </button>
              {/* ⭐ Code review round 2 — an expired / used-up code must never dead-end the reveal: this asks for a
                  NEW code (the reveal's own 403 → requestStepUp). */}
              <button
                type="button"
                className="self-start underline"
                disabled={revealPending}
                onClick={() => void requestNewCode()}
                data-testid="certificate-letter-new-code"
              >
                {l.newCode}
              </button>
              {newCodeSent ? (
                <p role="status" data-testid="certificate-letter-new-code-sent">
                  {l.newCodeSent}
                </p>
              ) : null}
            </div>
          ) : null}
          {addressError !== null ? <p role="alert">{addressError}</p> : null}
          <label className="flex flex-col">
            {l.postedOn}
            <input
              type="date"
              value={postedOn}
              onChange={(e) => setPostedOn(e.target.value)}
              aria-describedby={postMissing ? postMissingId : undefined}
              data-testid="certificate-letter-posted-on"
            />
          </label>
          <label className="flex flex-col">
            {l.tracking}
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              aria-describedby={postMissing ? postMissingId : undefined}
              data-testid="certificate-letter-tracking"
            />
          </label>
          {postMissing ? (
            <p role="alert" id={postMissingId}>
              {l.postRequired}
            </p>
          ) : null}
          <button
            type="button"
            className="self-start rounded border px-3 py-1"
            disabled={record.isPending}
            onClick={() => {
              if (postedOn === '' || tracking.trim() === '') return setPostMissing(true);
              setPostMissing(false);
              void record.mutateAsync({ person_key: person.person_key, posted_on: postedOn, tracking_number: tracking }).catch(() => undefined);
            }}
            data-testid="certificate-letter-record"
          >
            {l.record}
          </button>
          {record.isError ? <p role="alert">{certificateErrorText(record.error)}</p> : null}
        </>
      ) : (
        <>
          <p>
            {l.posted} {letter.posted_on}
            {letter.delivered_on !== null ? ` · ${l.delivered} ${letter.delivered_on}` : ''}
          </p>
          {letter.overdue ? (
            <p role="status" data-testid="certificate-letter-overdue">
              {letter.delivered_on === null ? l.overdue : l.deliveredLate}
            </p>
          ) : null}
          {letter.delivered_on === null ? (
            <>
              <label className="flex flex-col">
                {l.deliveredOn}
                <input
                  type="date"
                  value={deliveredOn}
                  onChange={(e) => setDeliveredOn(e.target.value)}
                  aria-describedby={deliverMissing ? deliverMissingId : undefined}
                  data-testid="certificate-letter-delivered-on"
                />
              </label>
              <label className="flex flex-col">
                {l.screenshot}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  aria-describedby={deliverMissing ? deliverMissingId : undefined}
                  data-testid="certificate-letter-file"
                />
              </label>
              {deliverMissing ? (
                <p role="alert" id={deliverMissingId}>
                  {l.deliverRequired}
                </p>
              ) : null}
              <button
                type="button"
                className="self-start rounded border px-3 py-1"
                disabled={deliver.isPending}
                onClick={() => {
                  if (deliveredOn === '' || file === null) return setDeliverMissing(true);
                  setDeliverMissing(false);
                  void deliver.mutateAsync({ letterId: letter.letter_id, deliveredOn, file }).catch(() => undefined);
                }}
                data-testid="certificate-letter-deliver"
              >
                {l.recordDelivery}
              </button>
              {deliver.isError ? <p role="alert">{certificateErrorText(deliver.error)}</p> : null}
            </>
          ) : null}
          {letter.has_screenshot ? (
            screenshotLink === null ? (
              <button
                type="button"
                className="self-start rounded border px-2 py-0.5"
                disabled={revealPending}
                onClick={() => void loadScreenshot()}
                data-testid="certificate-letter-screenshot-load"
              >
                {l.screenshotLoad}
              </button>
            ) : (
              <a
                href={screenshotLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
                data-testid="certificate-letter-screenshot-link"
              >
                {l.screenshotOpen}
              </a>
            )
          ) : null}
          {needsCode && pendingAction === 'screenshot' ? (
            <div className="flex flex-col">
              <label htmlFor={screenshotCodeInputId}>{l.code}</label>
              <input
                id={screenshotCodeInputId}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                data-testid="certificate-letter-screenshot-code"
              />
              <button
                type="button"
                className="self-start rounded border px-2 py-0.5"
                disabled={revealPending}
                onClick={() => void verifyAndRetry()}
                data-testid="certificate-letter-screenshot-verify"
              >
                {l.screenshotLoad}
              </button>
            </div>
          ) : null}
          {screenshotProblem !== null ? <p role="alert">{screenshotProblem}</p> : null}
        </>
      )}
      {/* ⭐ OUTSIDE the branch — still on screen after the refetch moves the person to "posted" / "delivered". */}
      {record.isSuccess ? (
        <p role="status" data-testid="certificate-letter-recorded">
          {l.recorded}
        </p>
      ) : null}
      {deliver.isSuccess ? <p role="status">{l.deliveryRecorded}</p> : null}
    </div>
  );
}

function PersonRow({ pariwarId, item, person }: { pariwarId: string; item: Item; person: Person }): ReactElement {
  const showLetter = person.letter !== null || person.letter_eligible;
  return (
    <li className="rounded border p-2" data-testid={`certificate-person-${item.claim_case_id}-${person.person_key}`}>
      <p className="text-xs">
        <span className="font-medium">{personLabel(person)}</span> · {t.sms[person.sms_state] ?? person.sms_state}
      </p>
      {person.escalation_recorded_on !== null ? (
        <p className="text-xs" data-testid="certificate-escalation-recorded">
          {t.escalation(person.escalation_recorded_on)}
        </p>
      ) : null}
      {showLetter ? <LetterForm pariwarId={pariwarId} item={item} person={person} /> : null}
    </li>
  );
}

export function CertificateRemindersList({ pariwarId, items }: { pariwarId: string; items: CertificateRemindersResponse['items'] }): ReactElement {
  return (
    <ul className="mt-4 space-y-3" data-testid="certificate-reminders">
      {items.map((item) => (
        <li key={item.claim_case_id} className="rounded border p-3 text-sm" data-testid={`certificate-reminders-item-${item.claim_case_id}`}>
          <p>
            <code className="font-mono text-xs">{item.short_reference}</code> · {t.cause[item.cause] ?? item.cause}
          </p>
          {item.run_state === 'paused' && item.pause_reason !== null ? (
            <p className="text-xs" role="status">
              {t.pause[item.pause_reason] ?? item.pause_reason}
            </p>
          ) : item.run_state === 'ended' ? (
            <p className="text-xs">{t.run.ended}</p>
          ) : (
            <p className="text-xs">
              {item.run_day !== null ? `${t.run.day} ${String(item.run_day)}` : ''}
              {/* ⛔ No reminder date beside the cannot-remind notice — the child sends nothing while it stands. */}
              {item.cannot_remind !== null
                ? ''
                : item.next_reminder_on !== null
                  ? ` · ${t.run.nextReminder} ${item.next_reminder_on}`
                  : ` · ${t.run.noMore}`}
            </p>
          )}
          {item.cannot_remind !== null ? (
            <p className="text-xs" role="status" data-testid="certificate-cannot-remind">
              {t.cannotRemind[item.cannot_remind] ?? item.cannot_remind}
            </p>
          ) : null}
          <ul className="mt-2 space-y-2">
            {item.people.map((p) => (
              <PersonRow key={p.person_key} pariwarId={pariwarId} item={item} person={p} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
