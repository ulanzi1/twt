// The CLOSURE LETTER queue item and form — Story 6.19c (`-274` 2, AC6, AC8c; key (1)).
//
// For each closed claim, each person owed a closure letter (their number is known not to work, so the closure notice
// could not go by text): the form states the letter's TWO required points, reveals the address only behind a fresh
// step-up (one audit line per reveal), records the posting (date + tracking number) and — later — the delivery date
// and ONE screenshot; the 14-day overdue flag is the server's. ⛔ A second letter for a person is refused by the server.
// The step-up flow is 6.19b's (`elevate`, then retry the read).

import type { ClosureLettersOwedResponse } from '@twt/contracts';
import type { ReactElement } from 'react';
import { useState } from 'react';

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

  async function reveal(): Promise<void> {
    setAddressError(null);
    try {
      const r = await api.getClosureLetterAddress(pariwarId, item.claim_case_id, person.person_key);
      setAddress(r.address);
      setNeedsCode(false);
    } catch (err) {
      if (err instanceof ApiError && err.code === STEP_UP_REQUIRED_CODE) {
        await api.requestStepUp(api.CLOSURE_LETTER_ADDRESS_STEP_UP_CONTEXT).catch(() => undefined);
        setNeedsCode(true);
        return;
      }
      setAddressError(closureErrorText(err));
    }
  }

  async function verifyAndReveal(): Promise<void> {
    try {
      await api.verifyStepUp(code);
      setCode('');
      await reveal();
    } catch (err) {
      setAddressError(closureErrorText(err));
    }
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
            <button type="button" className="self-start rounded border px-2 py-0.5 text-xs" onClick={() => void reveal()} data-testid="closure-letter-reveal">
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
              <button type="button" className="self-start rounded border px-2 py-0.5" onClick={() => void verifyAndReveal()}>
                {l.showAddress}
              </button>
            </label>
          ) : null}
          {addressError !== null ? <p role="alert">{addressError}</p> : null}
          <label className="flex flex-col text-xs">
            {l.postedOn}
            <input type="date" value={postedOn} onChange={(e) => setPostedOn(e.target.value)} data-testid="closure-letter-posted-on" />
          </label>
          <label className="flex flex-col text-xs">
            {l.tracking}
            <input value={tracking} onChange={(e) => setTracking(e.target.value)} data-testid="closure-letter-tracking" />
          </label>
          <button
            type="button"
            className="self-start rounded border px-3 py-1"
            disabled={record.isPending || postedOn === '' || tracking.trim() === ''}
            onClick={() =>
              void record.mutateAsync({ person_key: person.person_key, posted_on: postedOn, tracking_number: tracking }).catch(() => undefined)
            }
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
                <input type="date" value={deliveredOn} onChange={(e) => setDeliveredOn(e.target.value)} data-testid="closure-letter-delivered-on" />
              </label>
              <label className="flex flex-col">
                {l.screenshot}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} data-testid="closure-letter-file" />
              </label>
              <button
                type="button"
                className="self-start rounded border px-3 py-1"
                disabled={deliver.isPending || deliveredOn === '' || file === null}
                onClick={() =>
                  void deliver.mutateAsync({ letterId: person.letter!.letter_id, deliveredOn, file: file! }).catch(() => undefined)
                }
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
