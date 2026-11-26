// Story 3.13 (DL8, DL9, DL12, DL6a) — ONE member's identity check: the typed-in name, date of birth and photo (decrypted by the
// server, ONE audited view), the masked mobile + the "Show mobile number" press, the posting, the history, and the two acts —
// "Confirm identity" / "Could not confirm". A claim filed for the member's death shows the banner and ⛔ the forms (DL5); a
// member who needs no check shows the not-eligible line and ⛔ the forms (DL4). The server re-checks both on every write.
// The typed-in identity arrives ONLY while a check is awaited (`-504` item 1) — for anyone else the three identity rows are ⛔
// shown at all (⛔ a dash, ⛔ "No photo on record" for a photo that is merely withheld), and nor is the Mobile row without a
// masked number. After a save the page says so ("Identity confirmed." / "Saved.") in a live region that is ALWAYS mounted, and
// moves focus to it — a confirmation makes the member ineligible, so the forms (and the button that was pressed) go away AT
// ONCE, before the refetch answers. A refetch that fails keeps the page on its data and says so; it never swaps the page away —
// EXCEPT a 403 / 404, which means the viewer may no longer see this member: the data leaves the SCREEN (R3-P4; the query keeps it
// until the page unmounts — `gcTime: 0`, and the console has ⛔ persister). A 403 / 404 on a save or a number press re-reads the
// page, so that branch is reached (R4-P3), and focus moves to its no-access / not-found line (R5-P2). A REFUSED SAVE moves focus
// to the banner / not-needed line, which sits in an always-mounted region (R3-P5). A REFUSED NUMBER PRESS hides the identity and
// the forms at once WITHOUT choosing a line — the press answers the generic code for a death claim too (`-504` item 4), so the
// re-read's data picks the banner or the not-needed line (R5-P5); focus moves to that region when the press goes. Every control
// a render takes away hands focus to the page's own target, ⛔ `<body>`, and focus staff have moved elsewhere is ⛔ touched
// (`useFocusRescue`, R5-P1 / R5-P2). An awaited check whose name or date of birth is missing shows
// the load error and ⛔ the forms (`-504` item 1, R3-P7). The load error has a "Try again" button (`-505`): ONE re-read per press,
// `aria-disabled` while it runs (⛔ `disabled`, which drops the focus it holds), the error view kept on screen meanwhile (⛔ a
// "Loading…" swap that unmounts the pressed button), and focus to the page heading when the re-read lands (R4-P4) — only if
// focus is still on the button or lost (R5-P3: ⛔ out of a form field staff moved into meanwhile).

import { useNavigate, useParams } from '@tanstack/react-router';
import type { IdentityCheckDetailResponse, IdentityCheckRecordRequest } from '@twt/contracts';
import type { FormEvent, ReactElement } from 'react';
import { useEffect, useRef, useState } from 'react';

import { ApiError } from '../../api/client.js';
import { type AttemptKey, attemptKey, useSession } from '../../api/hooks.js';
import { identityCheckPath } from '../../routes/login-next.js';
import { useFocusRescue } from './focus-rescue.js';
import { formatDateOfBirth, formatIstDate } from './format.js';
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
  // `key` — what one member's page remembers (a saved line, a refusal) is ⛔ carried to another member's.
  return <IdentityCheckDetailView key={memberId} pariwarId={pariwarId} memberId={memberId} />;
}

/** A value staff could not compare against an ID: absent, not a string, or blank. */
const blank = (v: unknown): boolean => typeof v !== 'string' || v.trim() === '';

/**
 * An AWAITED check (eligible, no death claim) whose typed-in name or date of birth is missing (`-504` item 1: ⛔ a blank beside a
 * live Confirm). The server answers 503 for it; this is the screen's backstop, written to hold whatever the contract allows.
 */
function identityMissing(d: IdentityCheckDetailResponse): boolean {
  if (!d.eligible || d.death_reported) return false;
  return d.identity === null || blank(d.identity.name) || blank(d.identity.date_of_birth);
}

/** What the last write's refusal means on screen (by CODE — the API's message is ⛔ shown). */
type WriteRefusal = 'not_eligible' | 'death_reported' | null;
/** The outcome of the last SAVED write (the page-level acknowledgement), or `null` before one / after the next attempt starts. */
type SavedOutcome = IdentityCheckRecordRequest['outcome'] | null;

export function IdentityCheckDetailView({ pariwarId, memberId }: { pariwarId: string; memberId: string }): ReactElement {
  const navigate = useNavigate();
  const detail = useIdentityCheckDetail(pariwarId, memberId);
  const status = detail.error instanceof ApiError ? detail.error.status : null;
  const [refusal, setRefusal] = useState<WriteRefusal>(null);
  const [saved, setSaved] = useState<SavedOutcome>(null);
  const savedRef = useRef<HTMLDivElement>(null);
  const standingRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const lostLineRef = useRef<HTMLParagraphElement>(null);
  const retryRef = useRef<HTMLButtonElement>(null);
  // A focused control taken away by a render ⇒ the no-access / not-found line, else the standing region, else the heading (R5-P2).
  const rescue = useFocusRescue(rootRef, () => lostLineRef.current ?? standingRef.current ?? headingRef.current);
  // A number press was REFUSED (R5-P5): the identity and the forms go at once, and the re-read's data says why.
  const [pressRefused, setPressRefused] = useState(false);
  // A "Try again" re-read in flight (the error view stays while it runs), and whether the one that landed should take the focus.
  const [retrying, setRetrying] = useState(false);
  const [focusHeading, setFocusHeading] = useState(false);
  const signIn = (): void => void navigate({ to: '/login', search: { next: identityCheckPath(pariwarId, memberId) } });
  useEffect(() => {
    if (status === 401) void navigate({ to: '/login', search: { next: identityCheckPath(pariwarId, memberId) } });
  }, [status, navigate, pariwarId, memberId]);
  // A refusal is the server's word at ONE moment (a death claim filed, a check no longer awaited). When the detail is read AGAIN
  // and says the member is awaiting a check with no death claim standing (a claim released as innocent), the refusal is stale:
  // ⛔ the banner and the hidden forms until a reload.
  const awaitingNow = detail.data !== undefined && detail.data.eligible && !detail.data.death_reported;
  useEffect(() => {
    if (!awaitingNow) return;
    setRefusal(null);
    setPressRefused(false);
  }, [awaitingNow, detail.dataUpdatedAt]);
  // After a save the focus moves to the acknowledgement: on a confirmation the button that was pressed is gone with the forms,
  // and focus would otherwise fall to the page.
  useEffect(() => {
    if (saved !== null) savedRef.current?.focus();
  }, [saved]);
  // After a REFUSAL the forms (and the pressed button) go: focus moves to what the page now says — the banner or the not-needed
  // line, in a region that is ALWAYS mounted (R3-P5; ⛔ focus falling to the page, ⛔ a line inserted already populated).
  useEffect(() => {
    if (refusal !== null) standingRef.current?.focus();
  }, [refusal]);
  useEffect(() => {
    if (!focusHeading) return;
    headingRef.current?.focus();
    setFocusHeading(false);
  }, [focusHeading]);
  // One re-read per press of "Try again" (the read is AUDITED, one fetch one view — ⛔ a retry loop). `aria-disabled` + a guard,
  // ⛔ `disabled` (R4-P4).
  // The guard is a REF: two presses in the same moment both see the state of the last render (⛔ a second, cancelling re-read).
  const retryInFlight = useRef(false);
  const retryOff = retrying || detail.isFetching;
  const onRetry = (): void => {
    if (retryOff || retryInFlight.current) return;
    retryInFlight.current = true;
    setRetrying(true);
    void detail
      .refetch()
      .then((r) => {
        // The heading takes focus only if it is still on this button or lost — ⛔ out of a field staff moved into (R5-P3).
        if (!r.isError && (document.activeElement === retryRef.current || rescue.isAdrift())) setFocusHeading(true);
      })
      .finally(() => {
        // ⛔ A guard left set by a re-read that rejected (R5-P6).
        retryInFlight.current = false;
        setRetrying(false);
      });
  };
  const retry = (
    <button
      ref={retryRef}
      type="button"
      className={`mt-2 rounded border px-3 py-1 text-sm${retryOff ? ' cursor-not-allowed opacity-50' : ''}`}
      data-testid="identity-check-retry"
      aria-disabled={retryOff}
      onClick={onRetry}
    >
      {t.detail.retry}
    </button>
  );

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

  // ⛔ The "Loading…" view during a "Try again" re-read: a page with no data goes back to pending (TanStack v5), and the swap would
  // unmount the pressed button (R4-P4) — the error view below stays instead.
  if (detail.isLoading && !retrying) {
    return (
      <main ref={rootRef} className="mx-auto max-w-3xl p-4">
        <p role="status" data-testid="identity-check-loading">
          {t.detail.loading}
        </p>
      </main>
    );
  }
  // The BARE error state is for a page that never had its data. A refetch that fails while the data is there (a save went through
  // and the re-read answers 503) keeps the page on that data and says so (below) — but a 403 / 404 on it means the viewer may NO
  // LONGER see this member (a grant revoked, the posting moved districts): the identity, the number, the press and the forms go
  // with the data (R3-P4). An awaited check whose typed-in name or date of birth is missing is ALSO the load error, ⛔ a page with
  // a blank beside a live Confirm (`-504` item 1; the server answers 503 for it — this is the screen's own backstop, R3-P7).
  const lost = status === 403 || status === 404;
  if (!detail.data || lost || identityMissing(detail.data)) {
    const line = status === 403 ? t.detail.forbidden : status === 404 ? t.detail.notFound : t.detail.loadError;
    return (
      <main ref={rootRef} className="mx-auto max-w-3xl p-4">
        {back}
        <p
          ref={lost ? lostLineRef : undefined}
          role="alert"
          tabIndex={lost ? -1 : undefined}
          className="mt-4 text-sm outline-none"
          data-testid="identity-check-load-error"
        >
          {line}
        </p>
        {lost ? null : retry}
      </main>
    );
  }

  const d = detail.data;
  // A CONFIRMATION that went through ends the check AT ONCE: the member is not awaiting one, whatever the stale data still says.
  const confirmedNow = saved === 'confirmed';
  const deathReported = d.death_reported || refusal === 'death_reported';
  const notEligible = !deathReported && (!d.eligible || refusal === 'not_eligible' || confirmedNow);
  // ... but "does not need an identity check" would mislead right after staff confirmed; the history says who confirmed and when.
  const showNotEligibleLine = notEligible && !confirmedNow;
  const awaiting = !deathReported && !notEligible && !pressRefused;

  return (
    <main ref={rootRef} className="mx-auto max-w-3xl p-4">
      {back}
      {detail.isError ? (
        <div className="mt-2">
          <p role="alert" className="text-sm" data-testid="identity-check-refresh-error">
            {t.detail.loadError}
          </p>
          {retry}
        </div>
      ) : null}
      <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-lg font-semibold outline-none" data-testid="identity-check-heading">
        {t.title} · {t.queue.member} {d.short_member_id}
      </h1>
      {/* The lead says "This member typed in their identity details…" — true only of a member whose check is awaited (R3-P6). */}
      {awaiting ? (
        <p className="mt-2 text-sm" data-testid="identity-check-lead">
          {t.detail.lead}
        </p>
      ) : null}

      {/* ALWAYS mounted, focusable: a refusal moves focus here (R3-P5). The not-needed line goes INTO an always-mounted status region. */}
      <div ref={standingRef} tabIndex={-1} className="outline-none" data-testid="identity-check-standing">
        {deathReported ? (
          <p role="alert" className="mt-3 rounded border border-amber-400 bg-amber-50 p-2 text-sm" data-testid="identity-check-death-banner">
            {t.detail.deathBanner}
          </p>
        ) : null}
        <div role="status" data-testid="identity-check-not-eligible-region">
          {!deathReported && showNotEligibleLine ? (
            <p className="mt-3 text-sm" data-testid="identity-check-not-eligible">
              {t.detail.notEligible}
            </p>
          ) : null}
        </div>
      </div>

      <IdentityFacts d={d} pariwarId={pariwarId} awaiting={awaiting} onSignedOut={signIn} onPressRefused={() => setPressRefused(true)} />
      <History d={d} />

      {/* ALWAYS mounted (a live region inserted already populated is often ignored); the text is what arrives. `tabIndex` so a save can focus it. */}
      <div ref={savedRef} role="status" tabIndex={-1} className="mt-4 text-sm font-medium outline-none" data-testid="identity-check-saved-region">
        {saved !== null ? <p data-testid="identity-check-saved">{saved === 'confirmed' ? t.form.savedConfirmed : t.form.savedNotConfirmed}</p> : null}
      </div>
      {awaiting ? <RecordForms pariwarId={pariwarId} memberId={memberId} onRefused={setRefusal} onSaved={setSaved} onSignedOut={signIn} /> : null}
    </main>
  );
}

/**
 * `awaiting` — a check is awaited RIGHT NOW (no death claim, not already confirmed). Only then are the typed-in identity, the masked
 * number and the "Show mobile number" press on screen: the server sends them only for such a member (`identity` / `masked_mobile`
 * `null` for anyone else), and the page must not keep showing what a save or a refusal has just ended.
 */
function IdentityFacts({
  d,
  pariwarId,
  awaiting,
  onSignedOut,
  onPressRefused,
}: {
  d: IdentityCheckDetailResponse;
  pariwarId: string;
  awaiting: boolean;
  onSignedOut: () => void;
  /** The number press was refused because the member no longer awaits a check: the page says so and takes the focus (R4-P1). */
  onPressRefused: () => void;
}): ReactElement {
  // `lock-in` / `pending-valid` in the queue's words; every other state in the words `-505` item 4 approved.
  const stateLabel = t.queue.stateLabels[d.state] ?? t.detail.stateLabels[d.state];
  return (
    <dl className="mt-4 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm" data-testid="identity-check-facts">
      {awaiting && d.identity !== null ? (
        <>
          <dt className="font-medium">{t.detail.name}</dt>
          <dd data-testid="identity-check-name">{d.identity.name}</dd>
          <dt className="font-medium">{t.detail.dateOfBirth}</dt>
          <dd data-testid="identity-check-dob">{formatDateOfBirth(String(d.identity.date_of_birth))}</dd>
          <dt className="font-medium">{t.detail.photo}</dt>
          <dd>
            {d.identity.photo ? (
              <img src={d.identity.photo} alt={t.detail.photo} className="h-32 w-auto rounded border" data-testid="identity-check-photo" />
            ) : (
              t.detail.noPhoto
            )}
          </dd>
        </>
      ) : null}
      {awaiting && d.masked_mobile !== null ? (
        <>
          <dt className="font-medium">{t.detail.mobile}</dt>
          <dd>
            <span data-testid="identity-check-masked-mobile">{d.masked_mobile}</span>
            <RevealMobile pariwarId={pariwarId} memberId={d.member_id} onSignedOut={onSignedOut} onRefused={onPressRefused} />
          </dd>
        </>
      ) : null}
      <dt className="font-medium">{t.detail.joinedOn}</dt>
      <dd>
        {formatIstDate(d.signed_up_at)}
        {/* The state in approved words — a state with no label at all shows ⛔ its internal name. */}
        {stateLabel !== undefined ? (
          <>
            {' · '}
            <span data-testid="identity-check-state">{stateLabel}</span>
          </>
        ) : null}
      </dd>
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
                ? fill(t.history.confirmed, {
                    name: h.decided_by_display,
                    date: formatIstDate(h.decided_at),
                    // A confirmation always carries both kinds (0218's CHECK); a dash, ⛔ invented words, if one ever did not.
                    how: t.form.evidenceKinds[h.evidence_kind ?? ''] ?? '—',
                    document: t.form.documentKinds[h.document_kind ?? ''] ?? '—',
                  })
                : fill(t.history.notConfirmed, {
                    name: h.decided_by_display,
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
  onSaved,
  onSignedOut,
}: {
  pariwarId: string;
  memberId: string;
  onRefused: (r: WriteRefusal) => void;
  onSaved: (outcome: SavedOutcome) => void;
  onSignedOut: () => void;
}): ReactElement {
  // The page hears the outcome — a save, or the server's refusal — from the HOOK, in the step that starts the refresh (not from the
  // per-call callbacks below, which run later and ⛔ at all once these forms have unmounted).
  const record = useRecordIdentityCheck(pariwarId, memberId, { onSaved, onRefused });
  const keyRef = useRef<AttemptKey | null>(null);
  // Each form keeps its OWN fields — a note typed into one ⛔ appears in the other.
  const [cEvidence, setCEvidence] = useState('');
  const [cDocument, setCDocument] = useState('');
  const [cNote, setCNote] = useState('');
  const [evidence, setEvidence] = useState('');
  const [documentKind, setDocumentKind] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [noteMissing, setNoteMissing] = useState(false);
  // A failed save: `'display_name'` — the account has no display name, so a retry can NEVER work (`-505` item 3); `'retry'` — any
  // other failure that is not a standing refusal (the page shows those itself).
  const [saveError, setSaveError] = useState<'retry' | 'display_name' | null>(null);
  // The ids of the required selects left empty (`aria-invalid`) — set by the browser's own `invalid` event and by the submit guards.
  const [emptyIds, setEmptyIds] = useState<ReadonlySet<string>>(() => new Set());

  const asksEvidence = reason !== 'member_not_reached';
  const asksDocument = WITH_DOCUMENT.has(reason);

  const send = (body: IdentityCheckRecordRequest): void => {
    setSaveError(null);
    onSaved(null);
    record.mutate(
      { body, idempotencyKey: attemptKey(keyRef, body) },
      {
        onSuccess: () => {
          keyRef.current = null;
          setCEvidence('');
          setCDocument('');
          setCNote('');
          setEvidence('');
          setDocumentKind('');
          setReason('');
          setNote('');
        },
        onError: (err) => {
          if (err instanceof ApiError && err.status === 401) onSignedOut();
          else if (err instanceof ApiError && err.status === 409 && err.code === 'admin.display_name_missing') setSaveError('display_name');
          else setSaveError('retry');
        },
      },
    );
  };

  /**
   * The submit guard for a form's required selects. The browser's own required-field handling normally stops an empty select
   * before this runs (and says why, in its own words); this is the backstop — every empty one is marked `aria-invalid` and the
   * FIRST gets focus. ⛔ New words. Returns true when something is empty.
   */
  /**
   * Choosing another reason changes which kinds are asked. A select that goes away takes its `aria-invalid` mark with it —
   * ⛔ a kind asked again later coming back already marked wrong.
   */
  const changeReason = (next: string): void => {
    setReason(next);
    const kept = new Set<string>(['not-confirmed-reason']);
    if (next !== 'member_not_reached') kept.add('not-confirmed-evidence');
    if (WITH_DOCUMENT.has(next)) kept.add('not-confirmed-document');
    setEmptyIds((prev) => {
      const marks = [...prev].filter((id) => !id.startsWith('not-confirmed-') || kept.has(id));
      return marks.length === prev.size ? prev : new Set(marks);
    });
  };

  const refuseEmpty = (form: HTMLFormElement, required: ReadonlyArray<readonly [string, string]>): boolean => {
    const empty = required.filter(([, value]) => value === '').map(([id]) => id);
    if (empty.length === 0) return false;
    setEmptyIds((prev) => new Set([...prev, ...empty]));
    form.querySelector<HTMLElement>(`#${empty[0]!}`)?.focus();
    return true;
  };

  const confirm = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    if (refuseEmpty(e.currentTarget, [['confirm-evidence', cEvidence], ['confirm-document', cDocument]])) return;
    send({
      outcome: 'confirmed',
      evidence_kind: cEvidence as never,
      document_kind: cDocument as never,
      ...(cNote.trim() !== '' ? { note: cNote.trim() } : {}),
    });
  };

  const couldNotConfirm = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    const missingNote = note.trim() === '';
    setNoteMissing(missingNote);
    const missingChoice = refuseEmpty(e.currentTarget, [
      ['not-confirmed-reason', reason],
      ...(asksEvidence ? ([['not-confirmed-evidence', evidence]] as const) : []),
      ...(asksDocument ? ([['not-confirmed-document', documentKind]] as const) : []),
    ]);
    // Only the note missing: focus goes to it (`refuseEmpty` focuses an empty SELECT, ⛔ the note).
    if (missingNote && !missingChoice) e.currentTarget.querySelector<HTMLElement>('#not-confirmed-note')?.focus();
    if (missingNote || missingChoice) return;
    send({
      outcome: 'not_confirmed',
      not_confirmed_reason: reason as never,
      evidence_kind: asksEvidence ? (evidence as never) : null,
      document_kind: asksDocument ? (documentKind as never) : null,
      note: note.trim(),
    });
  };

  const select = (id: string, label: string, value: string, set: (v: string) => void, options: string[], labels: Record<string, string>) => (
    <label className="flex flex-col text-sm" htmlFor={id}>
      {label}
      <select
        id={id}
        data-testid={id}
        className="mt-1 rounded border p-1"
        required
        aria-invalid={emptyIds.has(id) ? true : undefined}
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setEmptyIds((prev) => (prev.has(id) ? new Set([...prev].filter((x) => x !== id)) : prev));
        }}
        onInvalid={() => setEmptyIds((prev) => (prev.has(id) ? prev : new Set([...prev, id])))}
      >
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
        {select('not-confirmed-reason', t.form.reason, reason, changeReason, REASONS, t.reasons)}
        {asksEvidence ? select('not-confirmed-evidence', t.form.evidenceKind, evidence, setEvidence, EVIDENCE, t.form.evidenceKinds) : null}
        {asksDocument ? select('not-confirmed-document', t.form.documentKind, documentKind, setDocumentKind, DOCUMENTS, t.form.documentKinds) : null}
        <label className="flex flex-col text-sm" htmlFor="not-confirmed-note">
          {t.form.note}
          <textarea
            id="not-confirmed-note"
            data-testid="not-confirmed-note"
            className="mt-1 rounded border p-1"
            maxLength={1000}
            aria-invalid={noteMissing ? true : undefined}
            aria-describedby={noteMissing ? 'not-confirmed-note-required' : undefined}
            value={note}
            onChange={(e) => {
              setNote(e.target.value);
              // The error goes as soon as there IS a note — ⛔ kept until the next submit (R3-P9).
              if (e.target.value.trim() !== '') setNoteMissing(false);
            }}
          />
        </label>
        {noteMissing ? (
          <p role="alert" id="not-confirmed-note-required" className="text-xs" data-testid="identity-check-note-required">
            {t.form.noteRequired}
          </p>
        ) : null}
        <button type="submit" className="self-start rounded border px-3 py-1" data-testid="identity-check-could-not-confirm" disabled={record.isPending}>
          {record.isPending ? t.form.saving : t.form.couldNotConfirm}
        </button>
      </form>

      {saveError === 'retry' ? (
        <p role="alert" className="text-sm" data-testid="identity-check-save-error">
          {t.form.saveError}
        </p>
      ) : null}
      {saveError === 'display_name' ? (
        <p role="alert" className="text-sm" data-testid="identity-check-display-name-missing">
          {t.form.displayNameMissing}
        </p>
      ) : null}
    </section>
  );
}
