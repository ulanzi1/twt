// The helpline's take-down of a family memorial at the nominee's request — Story 11b.4a (Task 9.2; AC11, AC14;
// `2026-10-27-412` MP6–MP8, MP12, MP14; `-395` item 3 / `-411` item 1 — only the nominee who sent it).
//
// Two screens:
//   · the LIST — find the memorial by the deceased member's REGISTERED MOBILE (the existing member search — MP12), then that
//     member's drives with a memorial on the page; and the OPEN requests, oldest first, with "overdue" (AC10);
//   · the DRIVE — the words as the page shows them, the photo, the nominee to CALL BACK (MP7), the smaller-fix script BEFORE
//     the take-down button (AC11, `-393` M4), the record-request form, and the outcome buttons. A take-down needs a fresh
//     step-up (`memorial_takedown`): a 403 `auth.step_up_required` is the SIGNAL to elevate, then retry.
// Authorization is SERVER-SIDE (`memorial.takedown`); a 403 renders this page's own "no access". ⛔ No take-down affordance
// exists anywhere else in the console.

import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import {
  newIdempotencyKey,
  useDecideMemorialTakedown,
  useMemberMemorialTakedownDrives,
  useMemberSearch,
  useMemorialTakedownDrive,
  useOpenMemorialTakedownRequests,
  useRecordMemorialTakedownRequest,
  useRequestMemorialTakedownStepUp,
  useVerifyStepUp,
} from '../../api/hooks.js';
import { openRequestOf, operatorScript, requestStatus, toLocalInput } from './derive.js';
import { errorSentence, recordErrorSentence, resolveEn as t } from './i18n-en.js';

function isNoAccess(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

function codeOf(err: unknown): string | undefined {
  return err instanceof ApiError ? err.code : undefined;
}

function NoAccess(): ReactElement {
  return (
    <p role="status" data-testid="takedown-no-access">
      {t('takedown.noAccess')}
    </p>
  );
}

// ── The LIST ─────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function MemorialTakedownListPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const open = useOpenMemorialTakedownRequests(pariwarId);
  const search = useMemberSearch(pariwarId);
  const [mobile, setMobile] = useState('');
  const [memberId, setMemberId] = useState<string | null>(null);
  const drives = useMemberMemorialTakedownDrives(pariwarId, memberId);

  if (isNoAccess(open.error) || isNoAccess(drives.error)) return <NoAccess />;

  return (
    <section aria-label={t('takedown.title')} data-testid="takedown-list" className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-bold">{t('takedown.title')}</h1>
        <p className="text-sm opacity-70">{t('takedown.subtitle')}</p>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setMemberId(null);
          if (mobile.trim() !== '') search.mutate({ by: 'mobile', value: mobile.trim() });
        }}
      >
        <label className="block">
          {t('takedown.lookup.label')}
          <input
            className="ml-2 rounded border p-1"
            inputMode="tel"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            data-testid="takedown-lookup-mobile"
          />
        </label>
        <button type="submit" className="mt-2 rounded border px-3 py-1" disabled={search.isPending}>
          {t('takedown.lookup.submit')}
        </button>
      </form>
      {search.isError && <p role="alert">{t('takedown.lookup.error')}</p>}
      {search.data && search.data.results.length === 0 && <p role="status">{t('takedown.lookup.none')}</p>}
      {search.data && search.data.results.length > 0 && (
        <ul data-testid="takedown-lookup-results">
          {search.data.results.map((m) => (
            <li key={m.memberId}>
              <button type="button" className="underline" onClick={() => setMemberId(m.memberId)}>
                {m.name ?? m.memberId} {m.maskedMobile !== null && <span className="opacity-70">({m.maskedMobile})</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {memberId !== null && drives.isLoading && <p role="status">{t('takedown.lookup.drivesLoading')}</p>}
      {memberId !== null && drives.isError && <p role="alert">{t('takedown.lookup.drivesError')}</p>}
      {memberId !== null && drives.data && (
        <section aria-label={t('takedown.lookup.drives')}>
          <h2 className="font-bold">{t('takedown.lookup.drives')}</h2>
          {drives.data.drives.length === 0 ? (
            <p role="status">{t('takedown.lookup.noDrives')}</p>
          ) : (
            <ul data-testid="takedown-member-drives">
              {drives.data.drives.map((d) => (
                <li key={d.poolId}>
                  <Link to="/p/$pariwarId/memorial-takedowns/$poolId" params={{ pariwarId, poolId: d.poolId }} className="underline">
                    {d.poolCanonicalIdentifier}
                  </Link>
                  {d.hasOpenRequest && <span className="ml-2 opacity-70">{t('takedown.lookup.openRequest')}</span>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section aria-label={t('takedown.open.title')}>
        <h2 className="font-bold">{t('takedown.open.title')}</h2>
        {open.isLoading && <p role="status">{t('takedown.open.loading')}</p>}
        {open.isError && <p role="alert">{t('takedown.open.error')}</p>}
        {open.data && open.data.requests.length === 0 && <p role="status">{t('takedown.open.empty')}</p>}
        {open.data && open.data.requests.length > 0 && (
          <table className="w-full text-sm" data-testid="takedown-open-table">
            <caption className="sr-only">{t('takedown.open.title')}</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">{t('takedown.open.drive')}</th>
                <th scope="col" className="text-left">{t('takedown.open.firstContact')}</th>
                <th scope="col" className="text-left">{t('takedown.open.due')}</th>
                <th scope="col" className="text-left">{t('takedown.open.status')}</th>
              </tr>
            </thead>
            <tbody>
              {open.data.requests.map((r) => (
                <tr key={r.requestId} data-testid={`takedown-open-${r.requestId}`}>
                  <td>
                    <Link to="/p/$pariwarId/memorial-takedowns/$poolId" params={{ pariwarId, poolId: r.poolId }} className="underline">
                      {r.poolCanonicalIdentifier}
                    </Link>
                  </td>
                  <td>{new Date(r.firstContactAt).toLocaleString('en-IN')}</td>
                  <td>{new Date(r.dueAt).toLocaleString('en-IN')}</td>
                  <td>{r.overdue && <strong>{t('takedown.open.overdue')}</strong>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </section>
  );
}

// ── The DRIVE ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export function MemorialTakedownDrivePage({ pariwarId, poolId }: { pariwarId: string; poolId: string }): ReactElement {
  const drive = useMemorialTakedownDrive(pariwarId, poolId);
  const record = useRecordMemorialTakedownRequest(pariwarId, poolId);
  const decide = useDecideMemorialTakedown(pariwarId, poolId);
  const stepUp = useRequestMemorialTakedownStepUp();
  const verify = useVerifyStepUp();
  // The call-back attestation is a claim about ONE nominee and ONE shown version (`-395` item 3): it records WHAT was ticked for, so
  // a refetch that swaps either leaves the box unticked instead of carrying the old call over to a person who was never called.
  const [calledBackFor, setCalledBackFor] = useState<string | null>(null);
  const [firstContact, setFirstContact] = useState(() => toLocalInput(new Date()));
  const [confirming, setConfirming] = useState(false);
  const [otp, setOtp] = useState('');
  // ONE Idempotency-Key per user-initiated attempt — a retry of the SAME attempt (after a step-up) reuses it.
  const recordKey = useRef(newIdempotencyKey());
  const decideKey = useRef<{ outcome: string; key: string } | null>(null);

  // ⭐ The form's per-attempt state — the tick, the first-contact time and the Idempotency-Key — belongs to ONE scope: the shown
  // version, the number to call, and how many requests the drive holds (review RS1). When the scope changes it starts over. Without
  // this a tick came back after a swap and swap-back; the form returned PRE-TICKED once an open request had been decided; a record
  // whose answer was lost (it had committed) left its key behind, so the NEXT call-back went out under it and the server replayed the
  // stored 201 of the OLD request for up to 24 h; and the 7-day clock's start survived a change of nominee.
  const requestCount = drive.data?.requests.length ?? null;
  const formScope = drive.data
    ? `${drive.data.shown?.submissionId ?? ''}|${drive.data.nomineeToCallBack?.mobile ?? ''}|${drive.data.requests.length}`
    : null;
  useEffect(() => {
    if (formScope === null) return;
    setCalledBackFor(null);
    setFirstContact(toLocalInput(new Date()));
    recordKey.current = newIdempotencyKey();
  }, [formScope]);
  // A record's REFUSAL is cleared when the drive's requests change (an open request appeared or was decided), not when the version
  // changes: after a `shown_changed` the operator must still read why the form changed, and "Request recorded." must outlive the refetch.
  useEffect(() => {
    if (record.isError) record.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fires on a change of the request count only; `record.reset` is stable
  }, [requestCount]);

  if (drive.isLoading) return <p role="status">{t('takedown.drive.loading')}</p>;
  if (isNoAccess(drive.error)) return <NoAccess />;
  if (codeOf(drive.error) === 'memorial_takedown.not_found') return <p role="status">{t('takedown.drive.notFound')}</p>;
  if (!drive.data) return <p role="alert">{t('takedown.drive.error')}</p>;
  const d = drive.data;
  const open = openRequestOf(d);
  const script = operatorScript(d);

  const decideWith = (outcome: 'taken_down' | 'kept' | 'superseded') => {
    if (open === null) return;
    // A new attempt starts clean (review RS2): a step-up left unverified must not announce "Code sent" or keep its code and its error
    // for the NEXT prompt and "Request recorded." must not stand beside this decision; the confirm step is disarmed when the decision lands.
    stepUp.reset();
    verify.reset();
    setOtp('');
    record.reset();
    if (decideKey.current === null || decideKey.current.outcome !== outcome) decideKey.current = { outcome, key: newIdempotencyKey() };
    decide.mutate(
      { requestId: open.requestId, body: { outcome }, idempotencyKey: decideKey.current.key },
      { onSuccess: () => setConfirming(false) },
    );
  };
  const decideCode = codeOf(decide.error);
  const needsStepUp = decideCode === 'auth.step_up_required';
  // ⛔ No number on screen ⇒ no attestation that it was called (`-395` item 3): the record form needs the nominee's mobile READ.
  const mobileToCallBack = d.nomineeToCallBack?.mobile ?? null;
  // The version this operator is looking at: the record carries it, and the server refuses (409) if another is shown by then.
  const shownSubmissionId = d.shown?.submissionId ?? null;
  const attestationKey = shownSubmissionId !== null && mobileToCallBack !== null ? `${shownSubmissionId}|${mobileToCallBack}` : null;
  const calledBack = attestationKey !== null && calledBackFor === attestationKey;
  // ONE persistent live region, ⛔ inside no conditional section: the decide section unmounts once the refetch shows the request
  // decided, and a status inside it would go with it. Latest act first; `stepUp.isSuccess` only counts while the prompt shows.
  const status = decide.isSuccess
    ? t('takedown.decided')
    : needsStepUp && stepUp.isSuccess
      ? t('takedown.stepUp.sent')
      : record.isSuccess
        ? t('takedown.record.recorded')
        : '';

  return (
    <section aria-label={t('takedown.title')} data-testid="takedown-drive" className="flex flex-col gap-5">
      <header>
        <p>
          <Link to="/p/$pariwarId/memorial-takedowns" params={{ pariwarId }} className="text-sm underline">
            ← {t('takedown.title')}
          </Link>
        </p>
        <h1 className="text-xl font-bold">{d.poolCanonicalIdentifier}</h1>
      </header>

      <p role="status" data-testid="takedown-status" className={status === '' ? 'sr-only' : undefined}>
        {status}
      </p>
      {/* A failed REFRESH keeps the page (review RS3): the old drive stays, and the operator is told it may be out of date. */}
      {drive.isError && <p role="alert" data-testid="takedown-refresh-error">{t('takedown.drive.error')}</p>}

      {d.shown === null ? (
        <p role="status">{t('takedown.drive.notOnPage')}</p>
      ) : (
        <section aria-label={t('takedown.drive.onPage')} data-testid="takedown-shown">
          <h2 className="font-bold">{t('takedown.drive.onPage')}</h2>
          {d.shown.words === null ? (
            <p>{t('takedown.drive.wordsUnavailable')}</p>
          ) : (
            d.shown.words.map((p, i) => (
              <p key={i} dir="auto" style={{ whiteSpace: 'pre-wrap' }}>
                {p}
              </p>
            ))
          )}
          {d.shown.photoUrl !== null && (
            <figure className="mt-2">
              <img src={d.shown.photoUrl} alt={d.shown.altText ?? ''} style={{ maxWidth: '16rem' }} />
              <figcaption className="sr-only">{t('takedown.drive.photo')}</figcaption>
            </figure>
          )}
        </section>
      )}

      {d.nomineeToCallBack !== null && (
        <section aria-label={t('takedown.callBack.title')} data-testid="takedown-call-back" className="rounded border p-3">
          <h2 className="font-bold">{t('takedown.callBack.title')}</h2>
          <p>
            {d.nomineeToCallBack.name ?? t('takedown.callBack.unreadable')} —{' '}
            <strong>{d.nomineeToCallBack.mobile ?? t('takedown.callBack.unreadable')}</strong>
          </p>
          <p className="text-sm opacity-70">{t('takedown.callBack.body')}</p>
        </section>
      )}

      {/* ⭐ AC11 — the smaller-fix script, BEFORE any take-down control (`-393` M4; MP8 (b)). */}
      {script.length > 0 && (
        <section aria-label={t('takedown.script.title')} data-testid="takedown-script" className="rounded border p-3">
          {script.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      )}

      {d.shown !== null && open === null && mobileToCallBack === null && (
        <section aria-label={t('takedown.record.title')} data-testid="takedown-record-unavailable">
          <h2 className="font-bold">{t('takedown.record.title')}</h2>
          <p>{t('takedown.callBack.unreadable')}</p>
          {/* The passive refetch is off (it would re-read and re-audit on every focus), so the way back is the operator's own click. */}
          {d.nomineeToCallBack !== null && (
            <button type="button" className="rounded border px-3 py-1" disabled={drive.isFetching} onClick={() => void drive.refetch()}>
              {t('takedown.record.retry')}
            </button>
          )}
        </section>
      )}

      {shownSubmissionId !== null && open === null && mobileToCallBack !== null && (
        <form
          data-testid="takedown-record"
          onSubmit={(e) => {
            e.preventDefault();
            if (!calledBack) return;
            decide.reset(); // the last decision's "Recorded." must not stand while this record is pending or fails
            record.mutate(
              {
                body: { calledBack: true, firstContactAt: new Date(firstContact).toISOString(), shownSubmissionId },
                idempotencyKey: recordKey.current,
              },
              {
                onSuccess: () => {
                  recordKey.current = newIdempotencyKey();
                  setCalledBackFor(null);
                  setFirstContact(toLocalInput(new Date()));
                },
              },
            );
          }}
        >
          <h2 className="font-bold">{t('takedown.record.title')}</h2>
          <label className="block">
            <input type="checkbox" checked={calledBack} onChange={(e) => setCalledBackFor(e.target.checked ? attestationKey : null)} required />{' '}
            {t('takedown.record.calledBack')}
          </label>
          <label className="mt-2 block">
            {t('takedown.record.firstContact')}
            <input
              type="datetime-local"
              className="ml-2 rounded border p-1"
              value={firstContact}
              onChange={(e) => setFirstContact(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="mt-2 rounded border px-3 py-1" disabled={!calledBack || record.isPending}>
            {t('takedown.record.submit')}
          </button>
          {record.isError && <p role="alert">{recordErrorSentence(codeOf(record.error))}</p>}
        </form>
      )}

      {open !== null && (
        <section aria-label={t('takedown.decide.title')} data-testid="takedown-decide">
          {d.shown !== null && !confirming && (
            <button type="button" className="rounded border px-3 py-1" data-testid="takedown-take-down" onClick={() => setConfirming(true)}>
              {t('takedown.action.takeDown')}
            </button>
          )}
          {confirming && (
            <div role="group" aria-label={t('takedown.action.confirmTakeDown')} data-testid="takedown-confirm">
              <p>{t('takedown.confirm.latency')}</p>
              <button type="button" className="rounded border px-3 py-1" disabled={decide.isPending} onClick={() => decideWith('taken_down')}>
                {t('takedown.action.confirmTakeDown')}
              </button>{' '}
              <button type="button" onClick={() => setConfirming(false)}>
                {t('takedown.action.cancel')}
              </button>
            </div>
          )}
          <p className="mt-2">
            <button type="button" className="underline" disabled={decide.isPending} onClick={() => decideWith('kept')}>
              {t('takedown.action.kept')}
            </button>{' '}
            <button type="button" className="underline" disabled={decide.isPending} onClick={() => decideWith('superseded')}>
              {t('takedown.action.superseded')}
            </button>
          </p>
          {needsStepUp && (
            <div role="alert" data-testid="takedown-step-up">
              <p>
                {t('takedown.stepUp.needed')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    verify.reset();
                    stepUp.mutate();
                  }}
                >
                  {t('takedown.stepUp.send')}
                </button>
              </p>
              <label>
                {t('takedown.stepUp.code')} <input value={otp} onChange={(e) => setOtp(e.target.value)} inputMode="numeric" />
              </label>{' '}
              <button
                type="button"
                disabled={otp.trim() === '' || verify.isPending}
                onClick={() => verify.mutate(otp.trim(), { onSuccess: () => decideWith('taken_down') })}
              >
                {t('takedown.stepUp.verify')}
              </button>
            </div>
          )}
          {needsStepUp && stepUp.isError && <p role="alert">{t('takedown.stepUp.sendError')}</p>}
          {needsStepUp && verify.isError && <p role="alert">{t('takedown.stepUp.verifyError')}</p>}
          {decide.isError && !needsStepUp && <p role="alert">{errorSentence(decideCode)}</p>}
        </section>
      )}

      <section aria-label={t('takedown.requests.title')}>
        <h2 className="font-bold">{t('takedown.requests.title')}</h2>
        <ul data-testid="takedown-requests">
          {d.requests.map((r) => (
            <li key={r.requestId} data-testid={`takedown-request-${r.requestId}`}>
              {new Date(r.firstContactAt).toLocaleString('en-IN')} — {requestStatus(r)}
              <span className="block text-sm opacity-70">
                {t('takedown.requests.received')} {new Date(r.receivedAt).toLocaleString('en-IN')} · {t('takedown.open.due')}{' '}
                {new Date(r.dueAt).toLocaleString('en-IN')}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
