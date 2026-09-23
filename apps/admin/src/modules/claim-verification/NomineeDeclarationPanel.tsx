// The nominee declaration HISTORY panel — Story 6.20 (AC3, AC4, AC7, AC8; D10, D12).
//
// Three parts, one claim:
//   1. the TIMELINE — every version of every rank, each with BOTH `recorded_at` and `effective_at` and
//      how it was made (the member, or an approved correction). Names and numbers appear only when the
//      District Admin asks (the audited snapshots read, D10);
//   2. the DETERMINATION form — the certificate date, a mark per version, a REQUIRED note;
//   3. the NOMINEE CORRECTIONS — each request's target BESIDE its proposal, and the approval controls.
//
// ⛔⛔ INVARIANT 1 / INVARIANT 6 — THIS COMPONENT DECIDES NOTHING AND COMPARES NOTHING.
//   · The form PRE-SELECTS NOTHING: every version starts unmarked, and "Record" stays disabled until the
//     District Admin has marked every one. ⛔ No version is highlighted, labelled "after death",
//     sorted by suspicion or pre-marked from the date — the server VALIDATES the marks against the date
//     and refuses an inconsistent set; it ⛔ never fills one in, and neither does this screen.
//   · A correction's target and proposal are shown side by side, relationship beside relationship.
//     ⛔ No diff, no "looks different" hint — two human approvals are the only defence (T15).
// ⭐ PURE, the `<NomineeNameCheckPanel>` shape: every input arrives as a prop; the parent owns the
// queries and mutations, so the tests drive it without a network.
// ⭐ FRESH STATE per claim and per token change (6.18's stale-carry-over finding): the marks, the date
// and the note RESET whenever the version set or the live determination changes.
// ⭐ a11y (family 13): every state is announced (`role="status"`), status is ⛔ never colour alone (every
// badge carries its words), and each labelled group is a real `fieldset` / labelled region.

import { useEffect, useState } from 'react';

import type {
  NomineeCorrectionListResponse,
  NomineeCorrectionRaiseRequest,
  NomineeDeclarationSnapshotsResponse,
  NomineeDeclarationTimelineResponse,
} from '@twt/contracts';
import { NOMINEE_RELATIONSHIP_CODES } from '@twt/contracts';

import { verifierConsoleEn } from './i18n-en.js';

const t = verifierConsoleEn.nomineeDeclaration;
type Mark = 'stands' | 'discarded';

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
  onShowDetails: () => void;
  onDetermine: (input: NomineeDeterminationSubmit) => Promise<void>;
  determining?: boolean;
  determineError?: string | null;
  corrections?: NomineeCorrectionListResponse | undefined;
  onDecide: (correctionId: string, step: 'district' | 'pariwar', outcome: 'approve' | 'decline', note: string) => Promise<void>;
  deciding?: boolean;
  decideError?: string | null;
  onRaise: (body: NomineeCorrectionRaiseRequest) => Promise<void>;
  raising?: boolean;
  raiseError?: string | null;
}

function fmt(iso: string): string {
  // ⚠ IST, spelled out — the cutoff is the IST start of the certificate day (D6), and a UTC timestamp
  // on this screen would put a 00:30 IST change on the previous day.
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
}

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

  const snapshotById = new Map((props.snapshots?.snapshots ?? []).map((s) => [s.version_id, s]));
  const allMarked = timeline.versions.length > 0 && timeline.versions.every((v) => marks[v.version_id] !== undefined);
  const ready = /^\d{4}-\d{2}-\d{2}$/.test(certificateDate) && allMarked && note.trim().length > 0;

  async function submit(): Promise<void> {
    if (!ready || !timeline) {
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
        <p className="text-xs" data-testid="nominee-declaration-last">
          {t.lastDetermination}: {timeline.live_determination.decided_by_display} ({fmt(timeline.live_determination.decided_at)})
        </p>
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
                <td>{fmt(v.recorded_at)}</td>
                <td>{fmt(v.effective_at)}</td>
                <td>{t.source[v.source]}</td>
                <td>{v.kind === 'vacated' ? t.kindVacated : v.relationship}</td>
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
                  {timeline.determination_recordable ? (
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

      {props.snapshots ? null : (
        <p className="text-xs">
          <button type="button" className="underline" data-testid="nominee-show-details" onClick={props.onShowDetails}>
            {props.snapshotsLoading ? t.detailsLoading : t.showDetails}
          </button>{' '}
          {t.detailsAudited}
        </p>
      )}

      {/* ── 2. The determination — a sticky decision strip; the note is mandatory BEFORE submit ── */}
      {timeline.determination_recordable ? (
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
          <button
            type="button"
            className="self-start rounded bg-accent px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            disabled={!ready || props.determining}
            aria-disabled={!ready || props.determining}
            data-testid="nominee-determination-submit"
            onClick={() => void submit()}
          >
            {t.determine.submit}
          </button>
        </div>
      ) : (
        <p role="status" className="text-sm" data-testid="nominee-determination-closed">
          {t.determine.notRecordable}
        </p>
      )}

      {/* ── 3. Nominee corrections ── */}
      <NomineeCorrections
        corrections={props.corrections}
        onDecide={props.onDecide}
        deciding={props.deciding}
        decideError={props.decideError}
        onRaise={props.onRaise}
        raising={props.raising}
        raiseError={props.raiseError}
        resetKey={fingerprint}
      />
    </section>
  );
}

/** The corrections list + its decision controls — also used alone on the Pariwar Admin's queue page. */
export function NomineeCorrections(props: {
  corrections?: NomineeCorrectionListResponse | undefined;
  onDecide: NomineeDeclarationPanelProps['onDecide'];
  deciding?: boolean | undefined;
  decideError?: string | null | undefined;
  onRaise: NomineeDeclarationPanelProps['onRaise'];
  raising?: boolean | undefined;
  raiseError?: string | null | undefined;
  resetKey: string;
}): React.ReactElement {
  const c = t.corrections;
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteMissing, setNoteMissing] = useState<string | null>(null);
  useEffect(() => {
    setNotes({});
    setNoteMissing(null);
  }, [props.resetKey]);

  async function decide(id: string, step: 'district' | 'pariwar', outcome: 'approve' | 'decline'): Promise<void> {
    const n = (notes[id] ?? '').trim();
    if (!n) {
      setNoteMissing(id);
      return;
    }
    setNoteMissing(null);
    await props.onDecide(id, step, outcome, n);
  }

  const list = props.corrections?.corrections ?? [];
  return (
    <section aria-label={c.heading} data-testid="nominee-corrections" className="flex flex-col gap-3 border-t pt-3">
      <h4 className="font-semibold">{c.heading}</h4>
      <p className="text-sm">{c.intro}</p>
      {list.length === 0 ? (
        <p role="status" data-testid="nominee-corrections-none">
          {c.none}
        </p>
      ) : null}
      {list.map((x) => {
        const step: 'district' | 'pariwar' | null = x.step === 'da_pending' ? 'district' : x.step === 'pa_pending' ? 'pariwar' : null;
        return (
          <article key={x.correction_id} className="rounded border p-2 text-sm" data-testid={`nominee-correction-${x.correction_id}`}>
            {/* ⭐ Status in WORDS (⛔ never colour alone), and announced. */}
            <p role="status" className="font-medium">
              {c.step[x.step]} · {c.raisedVia[x.raised_via]}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs uppercase">{c.target}</p>
                <ReadableValue value={x.target.name} />
                <p>
                  {c.relationship}: {x.target.relationship ?? '—'}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase">{c.proposed}</p>
                <ReadableValue value={x.proposed.name} />
                <p>
                  {c.relationship}: {x.proposed.relationship}
                </p>
              </div>
            </div>
            <p>
              {c.raiseNote}: <ReadableValue value={x.raise_note} />
            </p>
            {x.district_admin ? (
              <p className="text-xs">
                {c.decidedBy}: {x.district_admin.actor_display} ({fmt(x.district_admin.decided_at)})
              </p>
            ) : null}
            {x.pariwar_admin ? (
              <p className="text-xs">
                {c.decidedBy}: {x.pariwar_admin.actor_display} ({fmt(x.pariwar_admin.decided_at)})
              </p>
            ) : null}
            {step ? (
              <div className="mt-2 flex flex-col gap-1">
                <label className="flex flex-col">
                  {c.note}
                  <textarea
                    value={notes[x.correction_id] ?? ''}
                    onChange={(e) => setNotes((p) => ({ ...p, [x.correction_id]: e.target.value }))}
                    data-testid={`nominee-correction-note-${x.correction_id}`}
                  />
                </label>
                {noteMissing === x.correction_id ? <p role="alert">{c.noteRequired}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={props.deciding}
                    data-testid={`nominee-correction-approve-${x.correction_id}`}
                    onClick={() => void decide(x.correction_id, step, 'approve')}
                  >
                    {c.approve}
                  </button>
                  <button
                    type="button"
                    disabled={props.deciding}
                    data-testid={`nominee-correction-decline-${x.correction_id}`}
                    onClick={() => void decide(x.correction_id, step, 'decline')}
                  >
                    {c.decline}
                  </button>
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
      {props.decideError ? (
        <p role="alert" data-testid="nominee-correction-error">
          {props.decideError}
        </p>
      ) : null}
      <RaiseCorrection onRaise={props.onRaise} raising={props.raising} raiseError={props.raiseError} resetKey={props.resetKey} />
    </section>
  );
}

/** The helpline operator raises on the family's behalf (CC2). `other` is ⛔ not offered (`-237` cl.2). */
function RaiseCorrection(props: {
  onRaise: NomineeDeclarationPanelProps['onRaise'];
  raising?: boolean | undefined;
  raiseError?: string | null | undefined;
  resetKey: string;
}): React.ReactElement {
  const r = t.corrections.raise;
  const [rank, setRank] = useState<1 | 2>(1);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [incomplete, setIncomplete] = useState(false);
  useEffect(() => {
    setName('');
    setRelationship('');
    setMobile('');
    setAddress('');
    setNote('');
    setIncomplete(false);
  }, [props.resetKey]);

  async function submit(): Promise<void> {
    if (!name.trim() || !relationship || !mobile.trim() || !note.trim()) {
      setIncomplete(true);
      return;
    }
    setIncomplete(false);
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
        <select value={rank} onChange={(e) => setRank(Number(e.target.value) as 1 | 2)}>
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
              {code.replace(/_/g, ' ')}
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
        <input value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>
      <label className="flex flex-col text-sm">
        {r.note}
        <textarea value={note} onChange={(e) => setNote(e.target.value)} data-testid="raise-note" />
      </label>
      {incomplete ? <p role="alert">{r.incomplete}</p> : null}
      {props.raiseError ? <p role="alert">{props.raiseError}</p> : null}
      <button type="button" disabled={props.raising} data-testid="raise-submit" onClick={() => void submit()}>
        {r.submit}
      </button>
    </fieldset>
  );
}
