// The nominee declaration HISTORY panel — Story 6.20 (AC3, AC4, AC7, AC8; D10, D12, D17).
//
// Three parts, one claim:
//   1. the TIMELINE — every version of every rank, each with BOTH `recorded_at` and `effective_at` and
//      how it was made (the member, or an approved correction). Names and numbers appear only when the
//      District Admin asks (the audited snapshots read, D10). Earlier claims' determinations for the same
//      death are shown READ-ONLY beside it (D17 — ⛔ never copied into the marks);
//   2. the DETERMINATION form — the certificate date, a mark per version, a REQUIRED note;
//   3. the NOMINEE CORRECTIONS — each request's target BESIDE its proposal, and the approval controls for
//      the ONE step this surface offers (`decideStep`).
//
// ⛔⛔ INVARIANT 1 / INVARIANT 6 — THIS COMPONENT DECIDES NOTHING AND COMPARES NOTHING.
//   · The form PRE-SELECTS NOTHING: every version starts unmarked. ⛔ No version is highlighted, labelled
//     "after death", sorted by suspicion or pre-marked from the date — the server VALIDATES the marks
//     against the date and refuses an inconsistent set; it ⛔ never fills one in, and neither does this.
//   · A correction's target and proposal are shown side by side, relationship beside relationship.
//     ⛔ No diff, no "looks different" hint — two human approvals are the only defence (T15).
// ⭐ PURE, the `<NomineeNameCheckPanel>` shape: every input arrives as a prop; the parent owns the
// queries and mutations, so the tests drive it without a network.
// ⭐ FRESH STATE per claim and per token change (6.18's stale-carry-over finding): the marks, the date
// and the note RESET whenever the version set or the live determination changes.
// ⭐ CONTROLS FOLLOW THE SURFACE AND THE VIEWER, ⛔ not the correction's step. Each surface offers the one
// step its audience holds — the console the District Admin's (`decideStep: 'district'`), the Pariwar Admin's
// queue step 2 (`'pariwar'`) — and ⛔ no surface but the helpline's renders the raise form. The admin session
// carries only national grants, so WITHIN the console the server says what this viewer may do
// (`timeline.viewer`, code review 2026-09-24b): a verifier reads the history but is ⛔ not offered the
// determination form or step 1. The server's key check stays the boundary; a 403 is mapped to words.
// ⭐ a11y (family 13): status is ⛔ never colour alone; ONE live region per part announces its outcome
// (⛔ not one per correction card, which re-announced every card on each refetch); every repeated control
// carries an accessible name naming WHICH request it acts on.

import { useEffect, useState } from 'react';

import type {
  NomineeCorrectionListResponse,
  NomineeCorrectionRaiseRequest,
  NomineeDeclarationSnapshotsResponse,
  NomineeDeclarationTimelineResponse,
} from '@twt/contracts';
import { MobileNumber, NOMINEE_RELATIONSHIP_CODES, isEnglishScriptName } from '@twt/contracts';

import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.nomineeDeclaration;
type Mark = 'stands' | 'discarded';

/** The ratified English label for a relationship code — ⛔ never the raw code (AC12). */
export function nomineeRelationshipLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return t.relationshipLabels[code] ?? code;
}

export interface NomineeDeterminationSubmit {
  certificate_date: string;
  marks: { version_id: string; mark: Mark }[];
  note: string;
  watermark: NomineeDeclarationTimelineResponse['watermark'];
  expected_live_determination_id: string | null;
}

export interface NomineeDeclarationPanelProps {
  timeline?: NomineeDeclarationTimelineResponse | undefined;
  loading?: boolean;
  error?: string | null;
  /** Present only once the District Admin asked for the names (the audited read). */
  snapshots?: NomineeDeclarationSnapshotsResponse | undefined;
  snapshotsLoading?: boolean;
  snapshotsError?: string | null;
  /** The District Admin asked to see names and numbers (the reveal was clicked for THIS claim). */
  detailsRequested?: boolean;
  onShowDetails: () => void;
  onDetermine: (input: NomineeDeterminationSubmit) => Promise<void>;
  determining?: boolean;
  determineError?: string | null;
  /** The last determination write succeeded (announced). */
  determined?: boolean;
  corrections?: NomineeCorrectionListResponse | undefined;
  correctionsLoading?: boolean;
  correctionsError?: string | null;
  /** Resolves `true` when the decision was recorded — the typed note is cleared ONLY then. */
  onDecide: (correctionId: string, step: 'district' | 'pariwar', outcome: 'approve' | 'decline', note: string) => Promise<boolean>;
  deciding?: boolean;
  decideError?: string | null;
  /** The last decision that SUCCEEDED, announced by its outcome (family 13(d)); `null` when none. */
  decidedOutcome?: 'approve' | 'decline' | null;
  /** Re-fetch a failed corrections read (the reveal button is gone by then). */
  onRetryCorrections?: () => void;
  /** The ONE approval step this surface offers (the console: the District Admin's). */
  decideStep: 'district' | 'pariwar';
}

function fmt(iso: string): string {
  // ⚠ IST, spelled out — the cutoff is the IST start of the certificate day (D6), and a UTC timestamp
  // on this screen would put a 00:30 IST change on the previous day.
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

/** An instant in IST — shared with the Pariwar Admin's pages (the refusal list). */
export const formatIst = fmt;

type Readable = { state: 'readable'; value: string } | { state: 'unreadable' } | { state: 'anonymized' } | null | undefined;

function ReadableValue({ value }: { value: Readable }): React.ReactElement | null {
  if (!value) return null;
  if (value.state === 'readable') return <span className="font-medium">{value.value}</span>;
  if (value.state === 'anonymized') return <span className="italic text-slate-500">{t.anonymized}</span>;
  return <span className="italic text-amber-700">{t.unreadable}</span>;
}

export function NomineeDeclarationPanel(props: NomineeDeclarationPanelProps): React.ReactElement {
  const { timeline, loading, error } = props;
  const [certificateDate, setCertificateDate] = useState('');
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);

  // ⭐ Reset on ANY change to what the District Admin is judging (the watermark + the live determination).
  const fingerprint = timeline
    ? [
        timeline.claim_case_id,
        timeline.watermark.rank1,
        timeline.watermark.rank2,
        timeline.live_determination?.determination_id ?? '-',
        timeline.versions.map((v) => v.version_id).join(','),
      ].join('|')
    : '';
  useEffect(() => {
    setCertificateDate('');
    setMarks({});
    setNote('');
    setIncomplete(false);
  }, [fingerprint]);

  if (loading) {
    return (
      <section aria-label={t.heading} role="status" data-testid="nominee-declaration-loading">
        {t.loading}
      </section>
    );
  }
  if (!timeline) {
    return (
      <section aria-label={t.heading} role="status" data-testid="nominee-declaration-error">
        {error ?? t.loadError}
      </section>
    );
  }

  // ⭐ D10 — decrypted details render only when THIS claim's reveal was pressed AND they arrived (code review
  // 2026-09-24b: gating on the data alone would show names a parent pre-fetched without a click).
  const revealed = props.detailsRequested === true && props.snapshots !== undefined;
  const snapshotById = new Map((revealed ? props.snapshots!.snapshots : []).map((s) => [s.version_id, s]));
  // ⭐ The reveal button stays until EVERY version has its details: a version added after the details were
  // opened (an applied correction, possibly by another user) is otherwise unreachable.
  const missingSnapshot = timeline.versions.some((v) => !snapshotById.has(v.version_id));
  const canDetermine = timeline.determination_recordable && timeline.viewer.can_determine;
  const allMarked = timeline.versions.length > 0 && timeline.versions.every((v) => marks[v.version_id] !== undefined);
  const ready = /^\d{4}-\d{2}-\d{2}$/.test(certificateDate) && allMarked && note.trim().length > 0;
  // ⭐ Only when it is the SAME determination the header names (a refetch can leave the two out of step).
  const decryptedLast = revealed ? props.snapshots!.live_determination : null;
  const lastDecrypted =
    decryptedLast && timeline.live_determination && decryptedLast.determination_id === timeline.live_determination.determination_id
      ? decryptedLast
      : null;

  async function submit(): Promise<void> {
    if (!ready || !timeline) {
      // ⭐ Reachable (code review 2026-09-24): the button is ⛔ not `disabled` while the form is
      // incomplete — a disabled button leaves the tab order and never says why.
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    await props.onDetermine({
      certificate_date: certificateDate,
      marks: timeline.versions.map((v) => ({ version_id: v.version_id, mark: marks[v.version_id]! })),
      note: note.trim(),
      watermark: timeline.watermark,
      expected_live_determination_id: timeline.live_determination?.determination_id ?? null,
    });
  }

  return (
    <section aria-label={t.heading} data-testid="nominee-declaration-panel" className="flex flex-col gap-4">
      <h3 className="font-semibold">{t.heading}</h3>
      <p className="text-sm">{t.intro}</p>
      <p role="status" data-testid="nominee-declaration-status" className="text-sm font-medium">
        {t.status[timeline.declaration_status]}
      </p>
      {timeline.live_determination ? (
        <div className="text-xs" data-testid="nominee-declaration-last">
          <p>
            {t.lastDetermination}: {timeline.live_determination.decided_by_display} ({fmt(timeline.live_determination.decided_at)})
          </p>
          {/* ⭐ The date and note the live determination used — Tier-1, so shown only once revealed (D10). */}
          {lastDecrypted ? (
            <p data-testid="nominee-declaration-last-details">
              {t.lastCertificateDate}: <ReadableValue value={lastDecrypted.certificate_date} /> · {t.lastNote}:{' '}
              <ReadableValue value={lastDecrypted.note} />
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── 1. The timeline ── */}
      <table className="text-sm" data-testid="nominee-timeline">
        <thead>
          <tr>
            <th scope="col">{t.columns.rank}</th>
            <th scope="col">{t.columns.version}</th>
            <th scope="col">{t.columns.recordedAt}</th>
            <th scope="col">{t.columns.effectiveAt}</th>
            <th scope="col">{t.columns.source}</th>
            <th scope="col">{t.columns.relationship}</th>
            <th scope="col">{t.columns.details}</th>
            <th scope="col">{t.determine.markLegend}</th>
          </tr>
        </thead>
        <tbody>
          {timeline.versions.map((v) => {
            const snap = snapshotById.get(v.version_id);
            const liveMark = timeline.live_determination?.marks.find((m) => m.version_id === v.version_id)?.mark;
            return (
              <tr key={v.version_id} data-testid={`nominee-version-${v.version_id}`}>
                <td>{t.rankLabel[v.rank]}</td>
                <td>v{v.version_no}</td>
                <td data-testid={`nominee-version-recorded-${v.version_id}`}>{fmt(v.recorded_at)}</td>
                <td data-testid={`nominee-version-effective-${v.version_id}`}>{fmt(v.effective_at)}</td>
                <td>{t.source[v.source]}</td>
                <td>{v.kind === 'vacated' ? t.kindVacated : nomineeRelationshipLabel(v.relationship)}</td>
                <td>
                  {snap ? (
                    <span className="flex flex-col">
                      <ReadableValue value={snap.name} />
                      <ReadableValue value={snap.mobile} />
                      <ReadableValue value={snap.address} />
                    </span>
                  ) : null}
                </td>
                <td>
                  {liveMark ? <span className="mr-2 text-xs">({t.determine[liveMark]})</span> : null}
                  {canDetermine ? (
                    <fieldset className="inline-flex gap-2" aria-label={`${t.determine.markLegend} v${v.version_no}`}>
                      {(['stands', 'discarded'] as const).map((m) => (
                        <label key={m} className="inline-flex items-center gap-1">
                          <input
                            type="radio"
                            name={`mark-${v.version_id}`}
                            value={m}
                            // ⛔ NOTHING is checked until the District Admin checks it (invariant 1).
                            checked={marks[v.version_id] === m}
                            onChange={() => setMarks((prev) => ({ ...prev, [v.version_id]: m }))}
                            data-testid={`mark-${v.version_id}-${m}`}
                          />
                          {t.determine[m]}
                        </label>
                      ))}
                    </fieldset>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {!revealed || missingSnapshot ? (
        <div className="text-xs">
          {revealed && missingSnapshot ? <p data-testid="nominee-details-missing">{t.detailsMissing}</p> : null}
          <button
            type="button"
            className="underline disabled:opacity-50"
            data-testid="nominee-show-details"
            disabled={props.snapshotsLoading}
            aria-disabled={props.snapshotsLoading}
            onClick={props.onShowDetails}
          >
            {props.snapshotsLoading ? t.detailsLoading : t.showDetails}
          </button>{' '}
          {t.detailsAudited}
          {props.snapshotsError ? (
            <p role="alert" data-testid="nominee-details-error">
              {props.snapshotsError}
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── D17 — earlier claims' determinations for the same death, READ-ONLY ── */}
      {timeline.earlier_determinations.length > 0 ? (
        <section aria-label={t.earlier.heading} data-testid="nominee-earlier-determinations" className="border-t pt-3 text-sm">
          <h4 className="font-semibold">{t.earlier.heading}</h4>
          <p className="text-xs">{t.earlier.intro}</p>
          <ul>
            {timeline.earlier_determinations.map((e) => {
              const stands = e.marks.filter((m) => m.mark === 'stands').length;
              return (
                <li key={e.determination_id} data-testid={`nominee-earlier-${e.claim_case_id}`}>
                  {t.earlier.claim} {e.claim_case_id} — {t.earlier.decidedBy} {e.decided_by_display} ({fmt(e.decided_at)}):{' '}
                  {stands} {t.earlier.stands}, {e.marks.length - stands} {t.earlier.discarded}
                  <ul className="ml-4 text-xs">
                    {e.marks.map((m) => {
                      const v = timeline.versions.find((x) => x.version_id === m.version_id);
                      return (
                        <li key={m.version_id}>
                          {v ? `${t.rankLabel[v.rank]} v${v.version_no}` : m.version_id}: {t.determine[m.mark]}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {/* ── 2. The determination — a sticky decision strip; the note is mandatory BEFORE submit ── */}
      {canDetermine ? (
        <div className="sticky bottom-0 flex flex-col gap-2 border-t bg-white p-3" data-testid="nominee-determination-strip">
          <h4 className="font-semibold">{t.determine.heading}</h4>
          <label className="flex flex-col text-sm">
            {t.determine.certificateDate}
            <input
              type="date"
              value={certificateDate}
              onChange={(e) => setCertificateDate(e.target.value)}
              data-testid="nominee-certificate-date"
              aria-describedby="nominee-certificate-date-help"
            />
          </label>
          <p id="nominee-certificate-date-help" className="text-xs">
            {t.determine.certificateDateHelp}
          </p>
          <label className="flex flex-col text-sm">
            {t.determine.note}
            <textarea value={note} onChange={(e) => setNote(e.target.value)} data-testid="nominee-determination-note" />
          </label>
          <p className="text-xs">{t.determine.noteHelp}</p>
          {incomplete ? (
            <p role="alert" data-testid="nominee-determination-incomplete">
              {t.determine.incomplete}
            </p>
          ) : null}
          {props.determineError ? (
            <p role="alert" data-testid="nominee-determination-error">
              {props.determineError}
            </p>
          ) : null}
          <p role="status" data-testid="nominee-determination-recorded" className="text-sm">
            {props.determined && !props.determineError ? t.determine.recorded : ''}
          </p>
          {!ready ? (
            <p id="nominee-determination-hint" className="text-xs">
              {t.determine.incompleteHint}
            </p>
          ) : null}
          <button
            type="button"
            className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-50 aria-disabled:opacity-50"
            // ⭐ `aria-disabled` (still focusable, still explains itself) while incomplete; truly
            // `disabled` only while a write is in flight (a double submit).
            disabled={props.determining}
            aria-disabled={!ready || Boolean(props.determining)}
            aria-describedby={!ready ? 'nominee-determination-hint' : undefined}
            data-testid="nominee-determination-submit"
            onClick={() => void submit()}
          >
            {t.determine.submit}
          </button>
        </div>
      ) : timeline.determination_recordable ? (
        <p className="text-sm" data-testid="nominee-determination-not-permitted">
          {t.determine.notPermitted}
        </p>
      ) : (
        <p role="status" className="text-sm" data-testid="nominee-determination-closed">
          {t.determine.notRecordable}
        </p>
      )}

      {/* ── 3. Nominee corrections — their names and numbers load only with the reveal (D10) ── */}
      <NomineeCorrections
        corrections={props.corrections}
        loading={props.correctionsLoading}
        error={props.correctionsError}
        gated={!props.detailsRequested}
        onReveal={props.onShowDetails}
        decideStep={props.decideStep}
        canDecide={props.decideStep === 'district' ? timeline.viewer.can_decide_district : true}
        pendingCount={timeline.pending_corrections}
        onRetry={props.onRetryCorrections}
        onDecide={props.onDecide}
        deciding={props.deciding}
        decideError={props.decideError}
        decidedOutcome={props.decidedOutcome ?? null}
        // ⭐ The CLAIM, ⛔ not the fingerprint (adversarial review 2026-09-24b): notes are keyed per request, and a
        // refetch after a refusal (a new version, a redetermination) wiped the note the refusal had just kept.
        resetKey={timeline.claim_case_id}
      />
    </section>
  );
}

/** The corrections list + the controls for ONE step — also used alone on the Pariwar Admin's queue page. */
export function NomineeCorrections(props: {
  corrections?: NomineeCorrectionListResponse | undefined;
  loading?: boolean | undefined;
  error?: string | null | undefined;
  /** The list decrypts names and numbers — while gated it is ⛔ not fetched and shows the reveal instead. */
  gated?: boolean | undefined;
  onReveal?: (() => void) | undefined;
  decideStep: 'district' | 'pariwar';
  /** May THIS viewer decide the step (server-judged; default true — the Pariwar Admin's own page). */
  canDecide?: boolean | undefined;
  /** Metadata-only counts, shown before the reveal (D10). */
  pendingCount?: { da_pending: number; pa_pending: number } | undefined;
  onRetry?: (() => void) | undefined;
  onDecide: NomineeDeclarationPanelProps['onDecide'];
  deciding?: boolean | undefined;
  decideError?: string | null | undefined;
  decidedOutcome?: 'approve' | 'decline' | null | undefined;
  /** `false` where the page announces the outcome itself (the Pariwar Admin's queue) — ⛔ never twice. */
  announceDecided?: boolean | undefined;
  resetKey: string;
}): React.ReactElement {
  const c = t.corrections;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteMissing, setNoteMissing] = useState<string | null>(null);
  useEffect(() => {
    setNotes({});
    setNoteMissing(null);
  }, [props.resetKey]);

  async function decide(id: string, outcome: 'approve' | 'decline'): Promise<void> {
    const n = (notes[id] ?? '').trim();
    if (!n) {
      setNoteMissing(id);
      return;
    }
    setNoteMissing(null);
    const ok = await props.onDecide(id, props.decideStep, outcome, n);
    // ⭐ The note is the decider's own — ⛔ never carried into the next step's textarea. Cleared ONLY on
    // success (code review 2026-09-24b): a refused decision kept the error and lost the required note.
    if (ok) setNotes((prev) => ({ ...prev, [id]: '' }));
  }

  const pendingStep = props.decideStep === 'district' ? 'da_pending' : 'pa_pending';
  const list = props.corrections?.corrections ?? [];
  let body: React.ReactNode;
  if (props.gated) {
    body = (
      <p className="text-sm" data-testid="nominee-corrections-gated">
        {props.pendingCount ? (
          <span className="block font-medium" data-testid="nominee-corrections-pending-count">
            {c.pendingCount(props.pendingCount.da_pending, props.pendingCount.pa_pending)}
          </span>
        ) : null}
        {c.gated}{' '}
        {props.onReveal ? (
          <button type="button" className="underline" data-testid="nominee-corrections-reveal" onClick={props.onReveal}>
            {c.showGated}
          </button>
        ) : null}
      </p>
    );
  } else if (props.loading) {
    body = (
      <p role="status" data-testid="nominee-corrections-loading">
        {c.loading}
      </p>
    );
  } else if (props.error) {
    // ⭐ A failed read is ⛔ never shown as "none requested" — that would hide a request waiting for you.
    body = (
      <div role="alert" data-testid="nominee-corrections-error">
        <p>{props.error}</p>
        {props.onRetry ? (
          <button type="button" className="underline" data-testid="nominee-corrections-retry" onClick={props.onRetry}>
            {c.retry}
          </button>
        ) : null}
      </div>
    );
  } else if (list.length === 0) {
    body = <p data-testid="nominee-corrections-none">{c.none}</p>;
  } else {
    body = list.map((x) => {
      const atStep = x.step === pendingStep;
      const actionable = atStep && props.canDecide !== false;
      const who = c.forRequest(t.rankLabel[x.rank]!.toLowerCase(), fmt(x.raised_at));
      const noteId = `nominee-correction-note-help-${x.correction_id}`;
      return (
        <article
          key={x.correction_id}
          className="rounded border p-2 text-sm"
          data-testid={`nominee-correction-${x.correction_id}`}
          aria-label={who}
        >
          {/* ⭐ Status in WORDS (⛔ never colour alone). Announced by the section's ONE live region. */}
          <p className="font-medium">
            {c.step[x.step]} · {c.raisedVia[x.raised_via]}
            {x.declined_at_step ? ` · ${c.declinedAt[x.declined_at_step]}` : ''}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-xs uppercase">{c.target}</p>
              <ReadableValue value={x.target.name} />
              <p>
                {c.relationship}: {nomineeRelationshipLabel(x.target.relationship)}
              </p>
              {x.target.mobile ? (
                <p>
                  {c.mobile}: <ReadableValue value={x.target.mobile} />
                </p>
              ) : null}
              {x.target.address ? (
                <p>
                  {c.address}: <ReadableValue value={x.target.address} />
                </p>
              ) : null}
            </div>
            <div>
              <p className="text-xs uppercase">{c.proposed}</p>
              <ReadableValue value={x.proposed.name} />
              <p>
                {c.relationship}: {nomineeRelationshipLabel(x.proposed.relationship)}
              </p>
              <p>
                {c.mobile}: <ReadableValue value={x.proposed.mobile} />
              </p>
              {x.proposed.address ? (
                <p>
                  {c.address}: <ReadableValue value={x.proposed.address} />
                </p>
              ) : null}
            </div>
          </div>
          <p>
            {c.raiseNote}: <ReadableValue value={x.raise_note} />
          </p>
          {x.district_admin ? (
            <p className="text-xs">
              {c.decidedBy}: {x.district_admin.actor_display} ({fmt(x.district_admin.decided_at)}) — {c.daNote}:{' '}
              <ReadableValue value={x.district_admin.note} />
            </p>
          ) : null}
          {x.pariwar_admin ? (
            <p className="text-xs">
              {c.decidedBy}: {x.pariwar_admin.actor_display} ({fmt(x.pariwar_admin.decided_at)}) — {c.paNote}:{' '}
              <ReadableValue value={x.pariwar_admin.note} />
            </p>
          ) : null}
          {actionable ? (
            // ⭐ UX-DR54 — the decision strip: sticky, the note mandatory BEFORE either button acts.
            <div className="sticky bottom-0 mt-2 flex flex-col gap-1 border-t bg-white p-2" data-testid={`nominee-correction-strip-${x.correction_id}`}>
              <label className="flex flex-col">
                {`${c.note} — ${who}`}
                <textarea
                  value={notes[x.correction_id] ?? ''}
                  onChange={(e) => setNotes((p) => ({ ...p, [x.correction_id]: e.target.value }))}
                  aria-describedby={noteMissing === x.correction_id ? noteId : undefined}
                  data-testid={`nominee-correction-note-${x.correction_id}`}
                />
              </label>
              {noteMissing === x.correction_id ? (
                <p role="alert" id={noteId}>
                  {c.noteRequired}
                </p>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={props.deciding}
                  aria-label={`${c.approve} — ${who}`}
                  data-testid={`nominee-correction-approve-${x.correction_id}`}
                  onClick={() => void decide(x.correction_id, 'approve')}
                >
                  {c.approve}
                </button>
                <button
                  type="button"
                  disabled={props.deciding}
                  aria-label={`${c.decline} — ${who}`}
                  data-testid={`nominee-correction-decline-${x.correction_id}`}
                  onClick={() => void decide(x.correction_id, 'decline')}
                >
                  {c.decline}
                </button>
              </div>
            </div>
          ) : atStep ? (
            <p className="mt-2 text-xs" data-testid={`nominee-correction-not-permitted-${x.correction_id}`}>
              {c.decideNotPermitted}
            </p>
          ) : null}
        </article>
      );
    });
  }

  return (
    <section aria-label={c.heading} data-testid="nominee-corrections" className="flex flex-col gap-3 border-t pt-3">
      <h4 className="font-semibold">{c.heading}</h4>
      <p className="text-sm">{c.intro}</p>
      {body}
      {props.decideError ? (
        <p role="alert" data-testid="nominee-correction-error">
          {props.decideError}
        </p>
      ) : null}
      {/* ⭐ ONE live region for the section's outcome (family 13(d)). */}
      {props.announceDecided === false ? null : (
        <p role="status" data-testid="nominee-correction-decided" className="text-sm">
          {props.decidedOutcome && !props.decideError
            ? props.decidedOutcome === 'approve'
              ? c.decidedApproved
              : c.decidedDeclined
            : ''}
        </p>
      )}
    </section>
  );
}

/**
 * The helpline operator raises a correction on the family's behalf (CC2) — mounted ONLY where its viewer
 * holds `claim.raise_nominee_correction` (the helpline page). `other` is ⛔ not offered (`-237` cl.2 for the
 * target; for the proposal an ENGINEERING READING of it, ⛔ not a ratified rule — BigDev 2026-09-24).
 * ⭐ After a SUCCESSFUL send the form clears and says so (`raised`); on a failure it keeps what was typed.
 */
export function NomineeCorrectionRaiseForm(props: {
  onRaise: (body: NomineeCorrectionRaiseRequest) => Promise<void>;
  raising?: boolean | undefined;
  raiseError?: string | null | undefined;
  /** Bumped by the parent after each SUCCESSFUL send — clears the form and announces the send. */
  sentCount: number;
  resetKey: string;
  disabled?: boolean | undefined;
  /** Why Send is unavailable while `disabled` — stated, ⛔ never a silent disabled button (13(c)). */
  disabledReason?: string | undefined;
}): React.ReactElement {
  const r = t.corrections.raise;
  const [rank, setRank] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  const [invalid, setInvalid] = useState<string | null>(null);
  useEffect(() => {
    setInvalid(null);
    setRank(1);
    setName('');
    setRelationship('');
    setMobile('');
    setAddress('');
    setNote('');
    setIncomplete(false);
  }, [props.resetKey, props.sentCount]);

  async function submit(): Promise<void> {
    if (!name.trim() || !relationship || !mobile.trim() || !note.trim()) {
      setInvalid(null);
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
    // The contract's own rules, checked here too so a slip is named, ⛔ not a generic 400 (code review 2026-09-24b)
    // — on the TRIMMED values, the ones actually sent.
    if (!isEnglishScriptName(name.trim())) {
      setInvalid(r.nameEnglish);
      return;
    }
    if (!MobileNumber.safeParse(mobile.trim()).success) {
      setInvalid(r.mobileInvalid);
      return;
    }
    setInvalid(null);
    await props.onRaise({
      rank,
      proposed: {
        name: name.trim(),
        relationship: relationship as NomineeCorrectionRaiseRequest['proposed']['relationship'],
        mobile: mobile.trim(),
        ...(address.trim() ? { address: address.trim() } : {}),
      },
      note: note.trim(),
    });
  }

  return (
    <fieldset className="flex flex-col gap-2 border-t pt-3" data-testid="nominee-correction-raise" aria-label={r.heading}>
      <legend className="font-semibold">{r.heading}</legend>
      <label className="flex flex-col text-sm">
        {r.rank}
        <select value={rank} onChange={(e) => setRank(Number(e.target.value) as 1 | 2)} data-testid="raise-rank">
          <option value={1}>{t.rankLabel[1]}</option>
          <option value={2}>{t.rankLabel[2]}</option>
        </select>
      </label>
      <label className="flex flex-col text-sm">
        {r.name}
        <input value={name} onChange={(e) => setName(e.target.value)} data-testid="raise-name" />
      </label>
      <label className="flex flex-col text-sm">
        {r.relationshipLabel}
        <select value={relationship} onChange={(e) => setRelationship(e.target.value)} data-testid="raise-relationship">
          <option value="">—</option>
          {NOMINEE_RELATIONSHIP_CODES.filter((code) => code !== 'other').map((code) => (
            <option key={code} value={code}>
              {nomineeRelationshipLabel(code)}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col text-sm">
        {r.mobile}
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} data-testid="raise-mobile" />
      </label>
      <label className="flex flex-col text-sm">
        {r.address}
        <input value={address} onChange={(e) => setAddress(e.target.value)} data-testid="raise-address" />
      </label>
      <label className="flex flex-col text-sm">
        {r.note}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} data-testid="raise-note" />
      </label>
      {incomplete ? <p role="alert">{r.incomplete}</p> : null}
      {invalid ? (
        <p role="alert" data-testid="raise-invalid">
          {invalid}
        </p>
      ) : null}
      {props.raiseError ? (
        <p role="alert" data-testid="raise-error">
          {props.raiseError}
        </p>
      ) : null}
      <p role="status" data-testid="raise-sent" className="text-sm">
        {props.sentCount > 0 && !props.raiseError ? r.sent : ''}
      </p>
      {props.disabled && props.disabledReason ? (
        <p id="raise-submit-reason" className="text-xs" data-testid="raise-submit-reason">
          {props.disabledReason}
        </p>
      ) : null}
      <button
        type="button"
        disabled={props.raising || props.disabled}
        aria-describedby={props.disabled && props.disabledReason ? 'raise-submit-reason' : undefined}
        data-testid="raise-submit"
        onClick={() => void submit()}
      >
        {r.submit}
      </button>
    </fieldset>
  );
}
