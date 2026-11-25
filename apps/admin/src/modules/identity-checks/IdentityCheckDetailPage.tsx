// Story 3.13 (DL8, DL9, DL12, DL6a) — ONE member's identity check: the typed-in name, date of birth and photo (decrypted by the
// server, ONE audited view), the masked mobile + the "Show mobile number" press, the posting, the history, and the two acts —
// "Confirm identity" / "Could not confirm". A claim filed for the member's death shows the banner and ⛔ the forms (DL5); a
// member who needs no check shows the not-eligible line and ⛔ the forms (DL4). The server re-checks both on every write.

import { useNavigate, useParams } from '@tanstack/react-router';
import type { IdentityCheckDetailResponse, IdentityCheckRecordRequest } from '@twt/contracts';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { type AttemptKey, attemptKey, useSession } from '../../api/hooks.js';
import { identityCheckPath } from '../../routes/login-next.js';
import { formatIstDate } from './format.js';
import { useIdentityCheckDetail, useRecordIdentityCheck } from './hooks.js';
import { fill, identityCheckEn } from './i18n-en.js';
import { RevealMobile } from './RevealMobile.js';

const t = identityCheckEn;

export function IdentityCheckDetailRoute(): ReactElement {
  const session = useSession();
  const navigate = useNavigate();
  const { pariwarId, memberId } = useParams({ from: '/p/$pariwarId/identity-checks/$memberId' });
  useEffect(() => {
    if (session.isError) void navigate({ to: '/login', search: { next: identityCheckPath(pariwarId, memberId) } });
  }, [session.isError, navigate, pariwarId, memberId]);
  if (session.isLoading) return <p role="status">Checking your session…</p>;
  if (session.isError) return <p role="status">Redirecting to sign in…</p>;
  return <IdentityCheckDetailView pariwarId={pariwarId} memberId={memberId} />;
}

/** What the last write's refusal means on screen (by CODE — the API's message is ⛔ shown). */
type WriteRefusal = 'not_eligible' | 'death_reported' | 'other' | null;

export function IdentityCheckDetailView({ pariwarId, memberId }: { pariwarId: string; memberId: string }): ReactElement {
  const navigate = useNavigate();
  const detail = useIdentityCheckDetail(pariwarId, memberId);
  const status = detail.error instanceof ApiError ? detail.error.status : null;
  const [refusal, setRefusal] = useState<WriteRefusal>(null);
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login', search: { next: identityCheckPath(pariwarId, memberId) } });
  }, [status, navigate, pariwarId, memberId]);

  const back = (
    <button
      type="button"
      className="text-sm underline"
      data-testid="identity-check-back"
      onClick={() => void navigate({ to: '/p/$pariwarId/identity-checks', params: { pariwarId } })}
    >
      {t.detail.back}
    </button>
  );

  if (detail.isLoading) {
    return (
      <main className="mx-auto max-w-3xl p-4">
        <p role="status" data-testid="identity-check-loading">
          {t.detail.loading}
        </p>
      </main>
    );
  }
  if (detail.isError || !detail.data) {
    const line = status === 403 ? t.detail.forbidden : status === 404 ? t.detail.notFound : t.detail.loadError;
    return (
      <main className="mx-auto max-w-3xl p-4">
        {back}
        <p role="alert" className="mt-4 text-sm" data-testid="identity-check-load-error">
          {line}
        </p>
      </main>
    );
  }

  const d = detail.data;
  const deathReported = d.death_reported || refusal === 'death_reported';
  const notEligible = !deathReported && (!d.eligible || refusal === 'not_eligible');

  return (
    <main className="mx-auto max-w-3xl p-4">
      {back}
      <h1 className="mt-2 text-lg font-semibold">
        {t.title} · {t.queue.member} {d.short_member_id}
      </h1>
      <p className="mt-2 text-sm" data-testid="identity-check-lead">
        {t.detail.lead}
      </p>

      {deathReported ? (
        <p role="alert" className="mt-3 rounded border border-amber-400 bg-amber-50 p-2 text-sm" data-testid="identity-check-death-banner">
          {t.detail.deathBanner}
        </p>
      ) : notEligible ? (
        <p role="status" className="mt-3 text-sm" data-testid="identity-check-not-eligible">
          {t.detail.notEligible}
        </p>
      ) : null}

      <IdentityFacts d={d} pariwarId={pariwarId} showReveal={!deathReported && !notEligible} />
      <History d={d} />

      {!deathReported && !notEligible ? (
        <RecordForms pariwarId={pariwarId} memberId={memberId} onRefused={setRefusal} />
      ) : null}
    </main>
  );
}

function IdentityFacts({ d, pariwarId, showReveal }: { d: IdentityCheckDetailResponse; pariwarId: string; showReveal: boolean }): ReactElement {
  return (
    <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm" data-testid="identity-check-facts">
      <dt className="font-medium">{t.detail.name}</dt>
      <dd data-testid="identity-check-name">{d.identity?.name ?? '—'}</dd>
      <dt className="font-medium">{t.detail.dateOfBirth}</dt>
      <dd data-testid="identity-check-dob">{d.identity?.date_of_birth ?? '—'}</dd>
      <dt className="font-medium">{t.detail.photo}</dt>
      <dd>
        {d.identity?.photo ? (
          <img src={d.identity.photo} alt={t.detail.photo} className="h-32 w-auto rounded border" data-testid="identity-check-photo" />
        ) : (
          t.detail.noPhoto
        )}
      </dd>
      <dt className="font-medium">{t.detail.mobile}</dt>
      <dd>
        <span data-testid="identity-check-masked-mobile">{d.masked_mobile ?? '—'}</span>
        {showReveal ? <RevealMobile pariwarId={pariwarId} memberId={d.member_id} /> : null}
      </dd>
      <dt className="font-medium">{t.detail.joinedOn}</dt>
      <dd>{formatIstDate(d.signed_up_at)}</dd>
      <dt className="font-medium">{t.detail.posting}</dt>
      <dd>{d.posting ? [d.posting.district, d.posting.workplace_name].filter(Boolean).join(' · ') : t.detail.noPosting}</dd>
    </dl>
  );
}

function History({ d }: { d: IdentityCheckDetailResponse }): ReactElement {
  return (
    <section className="mt-4" aria-labelledby="identity-check-history-heading">
      <h2 id="identity-check-history-heading" className="text-sm font-semibold">
        {t.detail.history}
      </h2>
      {d.history.length === 0 ? (
        <p className="text-sm" data-testid="identity-check-no-history">
          {t.detail.noHistory}
        </p>
      ) : (
        <ul className="mt-1 flex flex-col gap-1 text-sm" data-testid="identity-check-history">
          {d.history.map((h) => (
            <li key={h.validation_id} data-testid={`identity-check-history-${h.validation_id}`}>
              {h.outcome === 'confirmed'
                ? fill(t.history.confirmed, { name: h.decided_by_display, date: formatIstDate(h.decided_at) })
                : fill(t.history.notConfirmed, {
                    date: formatIstDate(h.decided_at),
                    reason: t.reasons[h.not_confirmed_reason ?? ''] ?? '—',
                  })}
              {h.live && h.note ? (
                <span className="block text-xs text-slate-600" data-testid="identity-check-live-note">
                  {t.detail.note}: {h.note}
                </span>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const EVIDENCE = Object.keys(t.form.evidenceKinds);
const DOCUMENTS = Object.keys(t.form.documentKinds);
const REASONS = Object.keys(t.reasons);
/** DL9 — the reasons judged FROM a document (both kinds asked), and the one with ⛔ meeting (neither asked). */
const WITH_DOCUMENT = new Set(['details_do_not_match', 'photo_does_not_match']);

function RecordForms({
  pariwarId,
  memberId,
  onRefused,
}: {
  pariwarId: string;
  memberId: string;
  onRefused: (r: WriteRefusal) => void;
}): ReactElement {
  const record = useRecordIdentityCheck(pariwarId, memberId);
  const keyRef = useRef<AttemptKey | null>(null);
  // Each form keeps its OWN fields — a note typed into one ⛔ appears in the other.
  const [cEvidence, setCEvidence] = useState('');
  const [cDocument, setCDocument] = useState('');
  const [cNote, setCNote] = useState('');
  const [evidence, setEvidence] = useState('');
  const [document, setDocument] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  const [saveError, setSaveError] = useState(false);

  const asksEvidence = reason !== 'member_not_reached';
  const asksDocument = WITH_DOCUMENT.has(reason);

  const send = (body: IdentityCheckRecordRequest): void => {
    setSaveError(false);
    record.mutate(
      { body, idempotencyKey: attemptKey(keyRef, body) },
      {
        onSuccess: () => {
          keyRef.current = null;
          setCEvidence('');
          setCDocument('');
          setCNote('');
          setEvidence('');
          setDocument('');
          setReason('');
          setNote('');
          onRefused(null);
        },
        onError: (err) => {
          const code = err instanceof ApiError ? err.code : '';
          if (code === 'identity_validation.not_eligible') onRefused('not_eligible');
          else if (code === 'identity_validation.death_reported') onRefused('death_reported');
          else setSaveError(true);
        },
      },
    );
  };

  const confirm = (e: FormEvent): void => {
    e.preventDefault();
    if (!cEvidence || !cDocument) return;
    send({
      outcome: 'confirmed',
      evidence_kind: cEvidence as never,
      document_kind: cDocument as never,
      ...(cNote.trim() !== '' ? { note: cNote.trim() } : {}),
    });
  };

  const couldNotConfirm = (e: FormEvent): void => {
    e.preventDefault();
    if (note.trim() === '') {
      setNoteMissing(true);
      return;
    }
    setNoteMissing(false);
    if (!reason || (asksEvidence && !evidence) || (asksDocument && !document)) return;
    send({
      outcome: 'not_confirmed',
      not_confirmed_reason: reason as never,
      evidence_kind: asksEvidence ? (evidence as never) : null,
      document_kind: asksDocument ? (document as never) : null,
      note: note.trim(),
    });
  };

  const select = (id: string, label: string, value: string, set: (v: string) => void, options: string[], labels: Record<string, string>) => (
    <label className="flex flex-col text-sm" htmlFor={id}>
      {label}
      <select id={id} data-testid={id} className="mt-1 rounded border p-1" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">{t.form.choose}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {labels[o]}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <section className="mt-6 flex flex-col gap-6" data-testid="identity-check-forms">
      <form onSubmit={confirm} className="flex flex-col gap-2 rounded border p-3" data-testid="identity-check-confirm-form">
        {select('confirm-evidence', t.form.evidenceKind, cEvidence, setCEvidence, EVIDENCE, t.form.evidenceKinds)}
        {select('confirm-document', t.form.documentKind, cDocument, setCDocument, DOCUMENTS, t.form.documentKinds)}
        <label className="flex flex-col text-sm" htmlFor="confirm-note">
          {t.form.noteOptional}
          <textarea id="confirm-note" data-testid="confirm-note" className="mt-1 rounded border p-1" maxLength={1000} value={cNote} onChange={(e) => setCNote(e.target.value)} />
        </label>
        <button type="submit" className="self-start rounded border px-3 py-1" data-testid="identity-check-confirm" disabled={record.isPending}>
          {record.isPending ? t.form.saving : t.form.confirm}
        </button>
      </form>

      <form onSubmit={couldNotConfirm} className="flex flex-col gap-2 rounded border p-3" data-testid="identity-check-not-confirmed-form">
        {select('not-confirmed-reason', t.form.reason, reason, setReason, REASONS, t.reasons)}
        {asksEvidence ? select('not-confirmed-evidence', t.form.evidenceKind, evidence, setEvidence, EVIDENCE, t.form.evidenceKinds) : null}
        {asksDocument ? select('not-confirmed-document', t.form.documentKind, document, setDocument, DOCUMENTS, t.form.documentKinds) : null}
        <label className="flex flex-col text-sm" htmlFor="not-confirmed-note">
          {t.form.note}
          <textarea
            id="not-confirmed-note"
            data-testid="not-confirmed-note"
            className="mt-1 rounded border p-1"
            maxLength={1000}
            aria-invalid={noteMissing}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
        {noteMissing ? (
          <p role="alert" className="text-xs" data-testid="identity-check-note-required">
            {t.form.noteRequired}
          </p>
        ) : null}
        <button type="submit" className="self-start rounded border px-3 py-1" data-testid="identity-check-could-not-confirm" disabled={record.isPending}>
          {record.isPending ? t.form.saving : t.form.couldNotConfirm}
        </button>
      </form>

      {saveError ? (
        <p role="alert" className="text-sm" data-testid="identity-check-save-error">
          {t.form.saveError}
        </p>
      ) : null}
    </section>
  );
}
