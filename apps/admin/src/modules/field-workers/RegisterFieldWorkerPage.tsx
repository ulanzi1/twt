// Register a field worker — Story 13.1a (AC11 (a); AD12; review R5). Name, mobile and a district (the recorded list, or an exact
// typed district when the list is truncated — `-447` item 5).
//
// THE IDEMPOTENCY KEY IS PER SUBMISSION ATTEMPT (AD12; 13.1 TR15 — the store replays the FIRST result for a key whatever the new
// body says): `attemptKey(ref, body)` mints it at SUBMIT, keeps it while the submitted body is byte-equal (a retry after a network
// error, a 5xx or a 409 in-progress re-sends the SAME key), replaces it when the body changes, and is cleared on success and by
// "Register another". ⛔ Minted on open or render. A SYNCHRONOUS in-flight ref stops a double click.
// The page calls `api.registerFieldWorker` ITSELF (⛔ `useMutation`): TanStack's MutationCache would keep the submitted name and
// mobile after the page is left (review R5). The typed values live in component state only and go with the page.

import type { RegisterFieldWorkerResponse } from '@twt/contracts';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';

import * as api from '../../api/client.js';
import { attemptKey, type AttemptKey } from '../../api/hooks.js';
import { DistrictPicker } from './DistrictPicker.js';
import { FieldWorkerNav } from './FieldWorkerNav.js';
import { fieldWorkerGuidance, stateLabel, type Guidance } from './derive.js';
import { resolveEn as t } from './i18n-en.js';
import { useSignInRedirect } from './sign-in.js';

export function RegisterFieldWorkerPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [district, setDistrict] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<Guidance | null>(null);
  const [done, setDone] = useState<RegisterFieldWorkerResponse | null>(null);
  const keyRef = useRef<AttemptKey | null>(null);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const nameId = useId();
  const mobileId = useId();
  const errorId = useId();
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

  const submit = (e: FormEvent): void => {
    e.preventDefault();
    if (inFlight.current) return;
    if (name.trim() === '') return setProblem({ text: t('fw.register.nameRequired'), field: 'name' });
    if (mobile.trim() === '') return setProblem({ text: t('fw.register.mobileRequired'), field: 'mobile' });
    if (district === null) return setProblem({ text: t('fw.register.chooseDistrict'), field: 'district' });
    // The district is sent BYTE FOR BYTE (I11); the name and mobile as typed — the server normalises and judges them (422).
    const body = { name, mobile, district };
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
        setProblem(fieldWorkerGuidance(err, 'register'));
        headingRef.current?.focus();
      },
    );
  };

  const registerAnother = (): void => {
    keyRef.current = null;
    setName('');
    setMobile('');
    setDistrict(null);
    setProblem(null);
    setDone(null);
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
              onChange={(e) => setMobile(e.target.value)}
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
          <button type="submit" className="self-start rounded bg-black px-3 py-1 text-sm text-white" disabled={submitting} data-testid="fw-register-submit">
            {submitting ? t('fw.register.submitting') : t('fw.register.submit')}
          </button>
          {submitting && <p role="status" className="sr-only">{t('fw.register.submitting')}</p>}
        </form>
      )}
    </section>
  );
}
