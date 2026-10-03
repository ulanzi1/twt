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
import { useId, useState } from 'react';

import * as api from '../../api/client.js';
import { ApiError } from '../../api/client.js';
import { useRecordCertificateLetter, useRecordCertificateLetterDelivery } from '../../api/hooks.js';
import { STEP_UP_REQUIRED_CODE } from '../correction-chase/errors.js';
import { certificateErrorText } from './errors.js';
import { certificateRemindersEn as t } from './i18n-en.js';

type Item = CertificateRemindersResponse['items'][number];
type Person = Item['people'][number];
const l = t.letter;

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
  const postMissingId = useId();
  const deliverMissingId = useId();
  const testKey = `${item.claim_case_id}-${person.person_key}`;

  async function doReveal(): Promise<void> {
    setAddressError(null);
    try {
      const r = await api.getCertificateLetterAddress(pariwarId, item.claim_case_id, person.person_key);
      setAddress(r.address);
      setNeedsCode(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        try {
          await api.requestStepUp(api.CERTIFICATE_LETTER_ADDRESS_STEP_UP_CONTEXT);
          setNeedsCode(true);
        } catch (stepUpErr) {
          setAddressError(certificateErrorText(stepUpErr));
        }
        return;
      }
      setAddressError(certificateErrorText(err));
    }
  }

  async function reveal(): Promise<void> {
    if (revealPending) return;
    setRevealPending(true);
    await doReveal();
    setRevealPending(false);
  }

  async function verifyAndReveal(): Promise<void> {
    if (revealPending) return;
    setRevealPending(true);
    try {
      await api.verifyStepUp(code);
      setCode('');
    } catch (err) {
      setAddressError(certificateErrorText(err));
      setRevealPending(false);
      return;
    }
    await doReveal();
    setRevealPending(false);
  }

  const letter = person.letter;
  return (
    <div className="mt-1 flex flex-col gap-1 text-xs" data-testid={`certificate-letter-${testKey}`}>
      {letter === null ? (
        <>
          <p>{l.owed}</p>
          <p data-testid="certificate-letter-must-say">{l.mustSay}</p>
          <p>{l.onlyOne}</p>
          {address === null ? (
            <button
              type="button"
              className="self-start rounded border px-2 py-0.5"
              disabled={revealPending}
              onClick={() => void reveal()}
              data-testid="certificate-letter-reveal"
            >
              {l.showAddress}
            </button>
          ) : (
            <p data-testid="certificate-letter-address" className="whitespace-pre-line">
              {address}
            </p>
          )}
          {needsCode ? (
            <label className="flex flex-col">
              {l.code}
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" data-testid="certificate-letter-code" />
              <button type="button" className="self-start rounded border px-2 py-0.5" disabled={revealPending} onClick={() => void verifyAndReveal()}>
                {l.showAddress}
              </button>
            </label>
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
              {l.overdue}
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
              {item.next_reminder_on !== null ? ` · ${t.run.nextReminder} ${item.next_reminder_on}` : ` · ${t.run.noMore}`}
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
