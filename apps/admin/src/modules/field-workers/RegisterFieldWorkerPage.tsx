// Register a field worker — Story 13.1a (AC11 (a); AD12; review R5). Name, mobile and a district (the recorded list, or an exact
// typed district when the list is truncated — `-447` item 5).
//
// THE IDEMPOTENCY KEY IS PER SUBMISSION ATTEMPT (AD12; 13.1 TR15 — the store replays the FIRST result for a key whatever the new
// body says): `attemptKey(ref, body)` mints it at SUBMIT, keeps it while the submitted body is byte-equal (a retry after a network
// error, a 5xx or a 409 in-progress re-sends the SAME key), replaces it when the body changes, and is cleared on success and by
// "Register another". ⛔ Minted on open or render. A SYNCHRONOUS in-flight ref stops a double click.
// The page calls `api.registerFieldWorker` ITSELF (⛔ `useMutation`): TanStack's MutationCache would keep the submitted name and
// mobile after the page is left (review R5). The typed values live in component state only and go with the page.

import { FieldWorkerPreviousEndingsDetails, type RegisterFieldWorkerResponse } from '@twt/contracts';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import * as api from '../../api/client.js';
import { attemptKey, type AttemptKey } from '../../api/hooks.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { fieldWorkerGuidance, formatIstDate, reasonLabel, stateLabel, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function RegisterFieldWorkerPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  // Updated synchronously on edits: a response for another number cannot acknowledge this one (13.1f R1).
  const mobileRef = useRef('');
  const [district, setDistrict] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [done, setDone] = useState<RegisterFieldWorkerResponse | null>(null);
  /**
   * Story 13.1f (AD11; `-454` Q3 A, information only — "the officer still decides") — the ENDED records the server said hold this number,
   * once shown. The next submit carries `previous_endings_seen: true` (and `link_to` when the officer chose a record — AD12); editing the
   * mobile forgets them (the list was about the old number).
   */
  const [previous, setPrevious] = useState<FieldWorkerPreviousEndingsDetails['previous_endings'] | null>(null);
  const [linkTo, setLinkTo] = useState<string | null>(null);
  const keyRef = useRef<AttemptKey | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  /** The "not registered yet" line (R2D-3) — focused when the earlier records arrive, so a screen reader hears it and a sighted officer sees where to look. */
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const nameId = useId();
  const mobileId = useId();
  const errorId = useId();
  const linkGroup = useId();
  useSignInRedirect(problem?.signIn === true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (done !== null) doneRef.current?.focus();
  }, [done]);
  // The first press registered NOBODY and showed the earlier records (AD11): say so, in a live region, and put focus on it. ⛔ The page heading
  // (the old target) — a screen reader heard only "Register a field worker" and never learned a list had appeared, so a second press, which
  // registers, passed the disclosure without it being perceived (code review round 2, chunk D: R2D-3; family 13 (d)).
  useEffect(() => {
    if (previous !== null) noticeRef.current?.focus();
  }, [previous]);

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (inFlight.current) return;
    if (name.trim() === '') return setProblem({ text: t('fw.register.nameRequired'), field: 'name' });
    if (mobile.trim() === '') return setProblem({ text: t('fw.register.mobileRequired'), field: 'mobile' });
    if (district === null) return setProblem({ text: t('fw.register.chooseDistrict'), field: 'district' });
    // The district is sent BYTE FOR BYTE (I11); the name and mobile as typed — the server normalises and judges them (422).
    const body = {
      name,
      mobile,
      district,
      ...(previous !== null ? { previous_endings_seen: true as const } : {}),
      ...(previous !== null && linkTo !== null ? { link_to: linkTo } : {}),
    };
    const key = attemptKey(keyRef, body);
    inFlight.current = true;
    setSubmitting(true);
    setProblem(null);
    api.registerFieldWorker(pariwarId, body, key).then(
      (r) => {
        keyRef.current = null;
        inFlight.current = false;
        if (!mounted.current) return;
        setSubmitting(false);
        setDone(r);
      },
      (err: unknown) => {
        inFlight.current = false;
        if (!mounted.current) return;
        setSubmitting(false);
        // The shown number: ⛔ an error — the list, and a second submit (a NEW key: the body changes — TR9).
        if (err instanceof api.ApiError && err.code === 'field_worker.number_previously_ended') {
          if (body.mobile !== mobileRef.current) {
            keyRef.current = null;
            return;
          }
          const details = FieldWorkerPreviousEndingsDetails.safeParse(err.details);
          if (details.success) {
            keyRef.current = null;
            setPrevious(details.data.previous_endings);
            setLinkTo(null);
            // Focus goes to the "not registered yet" line once it is rendered (the `previous` effect above), ⛔ the page heading.
            return;
          }
        }
        // Review R3-2 — the same rule for every refusal ABOUT the number (it is taken, invalid, or the link chosen for it is not a record of it):
        // one about number A must not be shown on the field that now holds B. Any other refusal (no access, the network) is still said.
        const g = fieldWorkerGuidance(err, 'register');
        if (body.mobile !== mobileRef.current && (g.field === 'mobile' || (err instanceof api.ApiError && err.code === 'field_worker.link_invalid'))) {
          keyRef.current = null;
          return;
        }
        setProblem(g);
        headingRef.current?.focus();
      },
    );
  };

  const registerAnother = (): void => {
    mobileRef.current = '';
    keyRef.current = null;
    setName('');
    setMobile('');
    setDistrict(null);
    setProblem(null);
    setDone(null);
    setPrevious(null);
    setLinkTo(null);
    headingRef.current?.focus();
  };

  const invalid = (field: 'name' | 'mobile' | 'district') => problem?.field === field;

  return (
    <section className="flex max-w-2xl flex-col gap-4 p-4" data-testid="fw-register-page">
      <h1 ref={headingRef} tabIndex={-1} className="text-xl font-semibold outline-none">
        {t('fw.register.title')}
      </h1>
      <FieldWorkerNav pariwarId={pariwarId} current="register" />
      <p className="text-sm">{t('fw.register.intro')}</p>

      {done !== null ? (
        <div className="flex flex-col gap-2 rounded border bg-status-ok-bg p-3" data-testid="fw-register-done">
          <h2 ref={doneRef} tabIndex={-1} className="font-semibold text-status-ok-fg outline-none">
            {t('fw.register.done')}
          </h2>
          <p className="text-sm" data-testid="fw-register-done-id">{t('fw.register.doneId', { id: done.field_worker_id })}</p>
          <p className="text-sm">
            {done.district} · {stateLabel(done.current_state)}
          </p>
          <button type="button" className="self-start rounded border px-3 py-1 text-sm" onClick={registerAnother} data-testid="fw-register-another">
            {t('fw.register.another')}
          </button>
        </div>
      ) : (
        <form className="flex flex-col gap-3" onSubmit={submit} noValidate data-testid="fw-register-form">
          {/* Mounted EMPTY, so the line arrives into a live region (it is heard): the earlier records were SHOWN and nobody is registered yet. */}
          <div role="status" data-testid="fw-register-status">
            {previous !== null && (
              <p ref={noticeRef} tabIndex={-1} className="rounded border p-2 text-sm font-medium outline-none" data-testid="fw-register-previous-notice">
                {previous.length === 1 ? t('fw.register.previous.noticeOne') : t('fw.register.previous.noticeMany', { count: previous.length })}
              </p>
            )}
          </div>
          {problem !== null && problem.noAccess !== true && (
            <p id={errorId} role="alert" className="text-sm text-status-fail-fg" data-testid="fw-register-error">
              {problem.text}
            </p>
          )}
          {problem?.noAccess === true && (
            <p role="alert" className="text-sm text-status-fail-fg" data-testid="fw-register-no-access">
              {problem.text}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor={nameId} className="text-sm font-medium">
              {t('fw.register.name')}
            </label>
            <input
              id={nameId}
              className="rounded border px-2 py-1"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={invalid('name') || undefined}
              aria-describedby={invalid('name') ? errorId : undefined}
              autoComplete="off"
              data-testid="fw-register-name"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={mobileId} className="text-sm font-medium">
              {t('fw.register.mobile')}
            </label>
            <input
              id={mobileId}
              className="rounded border px-2 py-1"
              value={mobile}
              inputMode="tel"
              onChange={(e) => {
                mobileRef.current = e.target.value;
                setMobile(e.target.value);
                setPrevious(null);
                setLinkTo(null);
              }}
              aria-invalid={invalid('mobile') || undefined}
              aria-describedby={invalid('mobile') ? errorId : undefined}
              autoComplete="off"
              data-testid="fw-register-mobile"
            />
          </div>
          <DistrictPicker
            pariwarId={pariwarId}
            value={district}
            onChange={setDistrict}
            invalid={invalid('district')}
            {...(invalid('district') ? { describedBy: errorId } : {})}
            testId="fw-register-district"
          />
          {previous !== null && (
            <fieldset className="flex flex-col gap-1 rounded border p-2 text-sm" data-testid="fw-register-previous">
              <legend className="font-medium">{t('fw.register.previous.title')}</legend>
              {/* ONE choice among the records and "do not link" (R2D-14): a radio group, so ticking one unticks another in the open and a screen
                  reader hears "one of". The default is no link — the first press must never link by itself. */}
              {previous.map((p) => (
                <label key={p.field_worker_id} className="flex items-start gap-2">
                  <input
                    type="radio"
                    name={linkGroup}
                    checked={linkTo === p.field_worker_id}
                    onChange={() => setLinkTo(p.field_worker_id)}
                    data-testid={`fw-register-link-${p.field_worker_id}`}
                  />
                  <span>
                    {t('fw.register.previous.line', { date: formatIstDate(p.ended_on), reason: reasonLabel(p.reason_code) })} {t('fw.register.previous.link')}
                  </span>
                </label>
              ))}
              <label className="flex items-start gap-2">
                <input type="radio" name={linkGroup} checked={linkTo === null} onChange={() => setLinkTo(null)} data-testid="fw-register-link-none" />
                <span>{t('fw.register.previous.noLink')}</span>
              </label>
            </fieldset>
          )}
          <button type="submit" className="self-start rounded bg-black px-3 py-1 text-sm text-white" disabled={submitting} data-testid="fw-register-submit">
            {submitting ? t('fw.register.submitting') : t('fw.register.submit')}
          </button>
          {submitting && <p role="status" className="sr-only">{t('fw.register.submitting')}</p>}
        </form>
      )}
    </section>
  );
}
