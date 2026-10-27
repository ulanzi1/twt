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
import { useRef, useState, type ReactElement } from 'react';

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
import { errorSentence, resolveEn as t } from './i18n-en.js';

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
        {open.data && open.data.requests.length === 0 && <p role="status">{t('takedown.open.empty')}</p>}
        {open.data && open.data.requests.length > 0 && (
          <table className="w-full text-sm" data-testid="takedown-open-table">
            <caption className="sr-only">{t('takedown.open.title')}</caption>
            <thead>
              <tr>
                <th scope="col" className="text-left">Drive</th>
                <th scope="col" className="text-left">{t('takedown.open.firstContact')}</th>
                <th scope="col" className="text-left">{t('takedown.open.due')}</th>
                <th scope="col" className="text-left" />
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
  const [calledBack, setCalledBack] = useState(false);
  const [firstContact, setFirstContact] = useState(() => toLocalInput(new Date()));
  const [confirming, setConfirming] = useState(false);
  const [otp, setOtp] = useState('');
  // ONE Idempotency-Key per user-initiated attempt — a retry of the SAME attempt (after a step-up) reuses it.
  const recordKey = useRef(newIdempotencyKey());
  const decideKey = useRef<{ outcome: string; key: string } | null>(null);

  if (drive.isLoading) return <p role="status">{t('takedown.drive.loading')}</p>;
  if (isNoAccess(drive.error)) return <NoAccess />;
  if (codeOf(drive.error) === 'memorial_takedown.not_found') return <p role="status">{t('takedown.drive.notFound')}</p>;
  if (drive.isError || !drive.data) return <p role="alert">{t('takedown.drive.error')}</p>;
  const d = drive.data;
  const open = openRequestOf(d);
  const script = operatorScript(d);

  const decideWith = (outcome: 'taken_down' | 'kept' | 'superseded') => {
    if (open === null) return;
    if (decideKey.current === null || decideKey.current.outcome !== outcome) decideKey.current = { outcome, key: newIdempotencyKey() };
    decide.mutate({ requestId: open.requestId, body: { outcome }, idempotencyKey: decideKey.current.key });
  };
  const decideCode = codeOf(decide.error);
  const needsStepUp = decideCode === 'auth.step_up_required';

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
        <section aria-label="Before you take it down" data-testid="takedown-script" className="rounded border p-3">
          {script.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </section>
      )}

      {d.shown !== null && open === null && (
        <form
          data-testid="takedown-record"
          onSubmit={(e) => {
            e.preventDefault();
            if (!calledBack) return;
            record.mutate(
              { body: { calledBack: true, firstContactAt: new Date(firstContact).toISOString() }, idempotencyKey: recordKey.current },
              { onSuccess: () => (recordKey.current = newIdempotencyKey()) },
            );
          }}
        >
          <h2 className="font-bold">{t('takedown.record.title')}</h2>
          <label className="block">
            <input type="checkbox" checked={calledBack} onChange={(e) => setCalledBack(e.target.checked)} required />{' '}
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
          {record.isError && <p role="alert">{errorSentence(codeOf(record.error))}</p>}
        </form>
      )}

      {open !== null && (
        <section aria-label="Decide the request" data-testid="takedown-decide">
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
                <button type="button" onClick={() => stepUp.mutate()}>
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
          {decide.isError && !needsStepUp && <p role="alert">{errorSentence(decideCode)}</p>}
          {decide.data && <p role="status">{t('takedown.decided')}</p>}
        </section>
      )}

      <section aria-label={t('takedown.requests.title')}>
        <h2 className="font-bold">{t('takedown.requests.title')}</h2>
        <ul data-testid="takedown-requests">
          {d.requests.map((r) => (
            <li key={r.requestId} data-testid={`takedown-request-${r.requestId}`}>
              {new Date(r.firstContactAt).toLocaleString('en-IN')} — {requestStatus(r)}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
