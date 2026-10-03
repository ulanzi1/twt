// The CLOSURE LETTER queue item and form — Story 6.19c (`-274` 2, AC6, AC8c; key (1)).
//
// For each closed claim, each person owed a closure letter (their number is known not to work, so the closure notice
// could not go by text): the form states the letter's TWO required points, reveals the address only behind a fresh
// step-up (one audit line per reveal), records the posting (date + tracking number) and — later — the delivery date
// and ONE screenshot; the 14-day overdue flag is the server's. ⛔ A second letter for a person is refused by the server.
// The step-up flow is 6.19b's (`elevate`, then retry the read).

import type { ClosureLettersOwedResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useId, useState } from 'react';

import * as api from '../../api/client.js';
import { ApiError } from '../../api/client.js';
import { useRecordClosureLetter, useRecordClosureLetterDelivery } from '../../api/hooks.js';
import { STEP_UP_REQUIRED_CODE } from '../correction-chase/errors.js';
import { closureErrorText } from './errors.js';
import { correctionClosureEn as t } from './i18n-en.js';

const l = t.letters;
type Item = ClosureLettersOwedResponse['items'][number];
type Person = Item['people'][number];

function PersonLetter({ pariwarId, item, person }: { pariwarId: string; item: Item; person: Person }): ReactElement {
  const record = useRecordClosureLetter(pariwarId, item.claim_case_id);
  const deliver = useRecordClosureLetterDelivery(pariwarId, item.claim_case_id);
  const [postedOn, setPostedOn] = useState('');
  const [tracking, setTracking] = useState('');
  const [deliveredOn, setDeliveredOn] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [needsCode, setNeedsCode] = useState(false);
  const [code, setCode] = useState('');
  // Code review patch (2026-10-02): an explicit in-flight guard — `reveal`/`verifyAndReveal` are plain async
  // functions (not a `useMutation`), so there was no `isPending`-equivalent to disable the buttons with; a
  // double-click fired duplicate step-up requests / audit lines, against the module's own "one audit line per
  // reveal" comment.
  const [revealPending, setRevealPending] = useState(false);
  const [postMissing, setPostMissing] = useState(false);
  const [deliverMissing, setDeliverMissing] = useState(false);
  const postMissingId = useId();
  const deliverMissingId = useId();

  // Code review patch (2026-10-03, adversarial re-check): the actual GET + step-up-request logic is factored
  // OUT of the `revealPending` guard. An adversarial pass flagged the original shape — `verifyAndReveal` setting
  // `revealPending` false then immediately calling the ALSO-guarded `reveal()` — as a plausible stale-closure
  // no-op (a React state setter doesn't mutate the already-captured closure variable, only schedules the next
  // render, so a naive reading suggests `reveal()`'s own guard could see itself as still-tripped). Verified by
  // test (temporarily reintroducing that exact shape): it was NOT actually broken — within one render, BOTH the
  // outer and the nested guard read the SAME frozen `revealPending` value, so if the outer guard let the call
  // through, the inner one necessarily does too. Kept this factoring anyway: it removes the confusing
  // false-then-true flip entirely, and a new regression test now exercises this flow end-to-end (verify → the
  // address is actually shown), which nothing did before.
  async function doReveal(): Promise<void> {
    setAddressError(null);
    try {
      const r = await api.getClosureLetterAddress(pariwarId, item.claim_case_id, person.person_key);
      setAddress(r.address);
      setNeedsCode(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        // Code review patch (2026-10-02): `needsCode(true)` now fires ONLY if the step-up request itself
        // succeeded — previously it fired unconditionally, showing a code-entry form for a code that may never
        // have been sent.
        try {
          await api.requestStepUp(api.CLOSURE_LETTER_ADDRESS_STEP_UP_CONTEXT);
          setNeedsCode(true);
        } catch (stepUpErr) {
          setAddressError(closureErrorText(stepUpErr));
        }
        return;
      }
      setAddressError(closureErrorText(err));
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
      setAddressError(closureErrorText(err));
      setRevealPending(false);
      return;
    }
    await doReveal();
    setRevealPending(false);
  }

  return (
    <li className="rounded border p-2" data-testid={`closure-letter-${item.claim_case_id}-${person.person_key}`}>
      <p className="text-xs">{person.person_key.startsWith('nominee:') ? t.role.nominee : t.role.claimant}</p>
      {person.letter === null ? (
        <div className="flex flex-col gap-1">
          <p className="text-xs">{l.notYetPosted}</p>
          <p className="text-xs" data-testid="closure-letter-must-say">
            {l.mustSay}
          </p>
          {address === null ? (
            <button
              type="button"
              className="self-start rounded border px-2 py-0.5 text-xs"
              disabled={revealPending}
              onClick={() => void reveal()}
              data-testid="closure-letter-reveal"
            >
              {l.showAddress}
            </button>
          ) : (
            <p data-testid="closure-letter-address" className="whitespace-pre-line text-xs">
              {address}
            </p>
          )}
          {needsCode ? (
            <label className="flex flex-col text-xs">
              {l.code}
              <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" data-testid="closure-letter-code" />
              <button type="button" className="self-start rounded border px-2 py-0.5" disabled={revealPending} onClick={() => void verifyAndReveal()}>
                {l.showAddress}
              </button>
            </label>
          ) : null}
          {addressError !== null ? <p role="alert">{addressError}</p> : null}
          <label className="flex flex-col text-xs">
            {l.postedOn}
            <input
              type="date"
              value={postedOn}
              onChange={(e) => setPostedOn(e.target.value)}
              aria-describedby={postMissing ? postMissingId : undefined}
              data-testid="closure-letter-posted-on"
            />
          </label>
          <label className="flex flex-col text-xs">
            {l.tracking}
            <input
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              aria-describedby={postMissing ? postMissingId : undefined}
              data-testid="closure-letter-tracking"
            />
          </label>
          {/* Code review patch (2026-10-02): the button is ⛔ no longer silently disabled on missing fields — it
              is clickable, and a missing field is SAID (`role="alert"`), matching this story's own stated design
              rule (`ClosureColumn.tsx`'s header comment: "a missing note is SAID, ⛔ a silently disabled button"). */}
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
            data-testid="closure-letter-record"
          >
            {l.record}
          </button>
          {record.isSuccess ? <p role="status">{l.recorded}</p> : null}
          {record.isError ? <p role="alert">{closureErrorText(record.error)}</p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-1 text-xs">
          <p>
            {l.posted} {person.letter.posted_on}
            {person.letter.delivered_on !== null ? ` · ${l.delivered} ${person.letter.delivered_on}` : ''}
          </p>
          {person.letter.overdue ? (
            <p role="status" data-testid="closure-letter-overdue">
              {l.overdue}
            </p>
          ) : null}
          {person.letter.delivered_on === null ? (
            <>
              <label className="flex flex-col">
                {l.deliveredOn}
                <input
                  type="date"
                  value={deliveredOn}
                  onChange={(e) => setDeliveredOn(e.target.value)}
                  aria-describedby={deliverMissing ? deliverMissingId : undefined}
                  data-testid="closure-letter-delivered-on"
                />
              </label>
              <label className="flex flex-col">
                {l.screenshot}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  aria-describedby={deliverMissing ? deliverMissingId : undefined}
                  data-testid="closure-letter-file"
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
                  void deliver.mutateAsync({ letterId: person.letter!.letter_id, deliveredOn, file }).catch(() => undefined);
                }}
                data-testid="closure-letter-deliver"
              >
                {l.recordDelivery}
              </button>
              {deliver.isSuccess ? <p role="status">{l.deliveryRecorded}</p> : null}
              {deliver.isError ? <p role="alert">{closureErrorText(deliver.error)}</p> : null}
            </>
          ) : null}
        </div>
      )}
    </li>
  );
}

export function ClosureLettersOwedList({ pariwarId, items }: { pariwarId: string; items: ClosureLettersOwedResponse['items'] }): ReactElement {
  return (
    <ul className="mt-4 space-y-3" data-testid="closure-letters">
      {items.map((item) => (
        <li key={item.claim_case_id} className="rounded border p-3 text-sm" data-testid={`closure-letters-item-${item.claim_case_id}`}>
          <p>
            <code className="font-mono text-xs">{item.short_reference}</code> · {l.closedOn} {item.closed_on} · {item.days_since_closure} {l.days}
          </p>
          <ul className="mt-2 space-y-2">
            {item.people.map((p) => (
              <PersonLetter key={p.person_key} pariwarId={pariwarId} item={item} person={p} />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}
