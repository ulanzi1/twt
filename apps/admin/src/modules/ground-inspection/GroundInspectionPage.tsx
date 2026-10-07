// `<GroundInspectionPage>` — the ground-inspection admin console (Story 6.7, Task 6; AC1–AC4a).
//
// The English-facing surface for the ground-inspection ASSIGNMENT: schedule a new assignment,
// list a claim's assignments in the operator's district, upload photos, record findings, and
// complete or record a refusal disposition. Chrome copy resolves via the module-local `i18n-en.ts`
// (no @twt/i18n runtime keys → the i18n-parity gate is untouched). The verifier CONSOLE that
// weighs peer-mesh + ground-inspection together is Story 6.10 (Decision D4) — this ships the
// operator affordances + the read that surfaces the signal (present, refused, unavailable, absent).

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/client.js';
import * as api from '../../api/client.js';
import { resolveEn as t } from './i18n-en.js';

// ⚠ The page's OWN copies of the domain tuples (it imports no domain package) — kept in step by hand.
// Story 6.26a (GI12): `certificate_check` — the short visit or office check limited to the original certificate.
const STAGES = ['initial', 'corroboration', 'additional_evidence', 'certificate_check'] as const;
const SITE_TYPES = [
  'family_residence',
  'current_residence',
  'permanent_residence',
  'workplace',
  'school_or_office',
  'incident_location',
  'other',
] as const;
const REFUSAL_REASONS: Record<'photo_refused' | 'evidence_unavailable', readonly string[]> = {
  photo_refused: ['family_refused_photography'],
  evidence_unavailable: [
    'premises_inaccessible',
    'responsible_person_absent',
    'site_no_longer_exists',
    'inspector_safety_risk',
    'other_evidence_unavailable',
    // Story 6.26a (GI4) — the family did not produce the original certificate (the claim then waits).
    'original_certificate_not_produced',
  ],
};
/** Story 6.26a — the server's 409 / 400 codes that get their own words here (the rest show the server's message). */
const WORDED_ERROR_CODES = [
  'original_certificate_required',
  'certificate_changed',
  'no_current_certificate',
  'death_date_required',
  'death_date_in_future',
  'invalid_death_facts',
] as const;

export interface GroundInspectionPageProps {
  pariwarId: string;
}

export function GroundInspectionPage({ pariwarId }: GroundInspectionPageProps): ReactElement {
  const qc = useQueryClient();
  const [claimCaseId, setClaimCaseId] = useState('');
  const [district, setDistrict] = useState('');
  const [block, setBlock] = useState('');
  // The loaded scope (frozen at "Load" so the query key is stable while typing continues).
  // Story 6.17 — EXACTLY ONE of district / block, mirroring the server's `.refine` (D4). The button
  // enforces it client-side purely so the operator sees the rule before the round-trip; the SERVER
  // is the boundary, and it answers 400 either way.
  const [scope, setScope] = useState<{ claimCaseId: string; district?: string; block?: string } | null>(null);
  const exactlyOneLocator = (district.trim() !== '') !== (block.trim() !== '');

  const assignmentsQuery = useQuery({
    queryKey: ['ground-inspection', pariwarId, scope?.claimCaseId, scope?.district, scope?.block],
    queryFn: () =>
      api.listGroundInspection(
        pariwarId,
        scope!.claimCaseId,
        // Send the locator the operator ACTUALLY supplied — never both, never a default.
        scope!.block !== undefined ? { block: scope!.block } : { district: scope!.district! },
      ),
    enabled: scope !== null,
  });

  const invalidate = () =>
    void qc.invalidateQueries({
      queryKey: ['ground-inspection', pariwarId, scope?.claimCaseId, scope?.district, scope?.block],
    });

  return (
    <section className="flex flex-col gap-6" aria-label={t('gi.title')}>
      <header>
        <h1 className="text-xl font-semibold">{t('gi.title')}</h1>
        <p className="text-sm text-gray-600">{t('gi.subtitle')}</p>
      </header>

      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!claimCaseId || !exactlyOneLocator) return;
          setScope(
            block.trim() !== '' ? { claimCaseId, block: block.trim() } : { claimCaseId, district: district.trim() },
          );
        }}
      >
        <label className="flex flex-col text-sm">
          {t('gi.claim.label')}
          <input
            className="rounded border px-2 py-1"
            value={claimCaseId}
            onChange={(e) => setClaimCaseId(e.target.value)}
            aria-label={t('gi.claim.label')}
          />
        </label>
        <label className="flex flex-col text-sm">
          {t('gi.district.label')}
          <input
            className="rounded border px-2 py-1"
            value={district}
            onChange={(e) => setDistrict(e.target.value)}
            aria-label={t('gi.district.label')}
          />
        </label>
        <label className="flex flex-col text-sm">
          {t('gi.block.label')}
          <input
            className="rounded border px-2 py-1"
            value={block}
            onChange={(e) => setBlock(e.target.value)}
            aria-label={t('gi.block.label')}
          />
        </label>
        <button
          className="rounded bg-blue-600 px-3 py-1 text-white"
          type="submit"
          disabled={!claimCaseId || !exactlyOneLocator}
        >
          {t('gi.load')}
        </button>
        {!exactlyOneLocator && (
          <p role="status" className="w-full text-sm text-amber-700">
            {t('gi.locator.exactlyOne')}
          </p>
        )}
      </form>

      {scope && (
        <ScheduleForm
          pariwarId={pariwarId}
          claimCaseId={scope.claimCaseId}
          defaultDistrict={scope.district ?? ''}
          defaultBlock={scope.block ?? ''}
          onScheduled={invalidate}
        />
      )}

      {assignmentsQuery.isLoading && <p role="status">Loading…</p>}
      {assignmentsQuery.data && assignmentsQuery.data.assignments.length === 0 && (
        <p role="status" className="text-sm text-amber-700">
          {t('gi.empty')}
        </p>
      )}
      {assignmentsQuery.data && assignmentsQuery.data.assignments.length > 0 && (
        <ul className="flex flex-col gap-4">
          {assignmentsQuery.data.assignments.map((a) => (
            <AssignmentCard
              key={a.groundInspectionId}
              pariwarId={pariwarId}
              claimCaseId={scope!.claimCaseId}
              assignment={a}
              onMutated={invalidate}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

// ── Schedule form ─────────────────────────────────────────────────────────────

function ScheduleForm(props: {
  pariwarId: string;
  claimCaseId: string;
  defaultDistrict: string;
  /** Story 6.17 — prefilled when the operator loaded by block; '' means district-level. */
  defaultBlock: string;
  onScheduled: () => void;
}): ReactElement {
  const [district, setDistrict] = useState(props.defaultDistrict);
  const [block, setBlock] = useState(props.defaultBlock);
  const [inspectionStage, setStage] = useState<string>(STAGES[0]);
  const [inspectionSiteType, setSiteType] = useState<string>(SITE_TYPES[0]);
  const [inspectorActorId, setInspector] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [locationDetail, setLocation] = useState('');
  const [familyContact, setFamilyContact] = useState('');
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.scheduleGroundInspection(
        props.pariwarId,
        props.claimCaseId,
        {
          district,
          // ⛔ OMITTED, not sent as '' — an empty block would be a validation error, and the whole
          // point of the null path is that a district-level assignment carries no block at all.
          ...(block.trim() !== '' ? { block: block.trim() } : {}),
          inspectionStage,
          inspectionSiteType,
          inspectorActorId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          locationDetail: locationDetail || null,
          familyContact: familyContact || null,
          notes: notes || null,
        },
        globalThis.crypto.randomUUID(),
      ),
    onSuccess: () => props.onScheduled(),
  });

  const otherNeedsLocation = inspectionSiteType === 'other' && !locationDetail;

  return (
    <form
      className="flex flex-col gap-2 rounded border p-4"
      aria-label={t('gi.schedule.heading')}
      onSubmit={(e) => {
        e.preventDefault();
        if (!otherNeedsLocation) mutation.mutate();
      }}
    >
      <h2 className="font-medium">{t('gi.schedule.heading')}</h2>
      <label className="text-sm">
        {t('gi.schedule.district')}
        <input className="ml-2 rounded border px-2 py-1" value={district} onChange={(e) => setDistrict(e.target.value)} />
      </label>
      <label className="text-sm">
        {t('gi.schedule.block')}
        <input className="ml-2 rounded border px-2 py-1" value={block} onChange={(e) => setBlock(e.target.value)} />
      </label>
      <p className="text-xs text-gray-600">{t('gi.block.hint')}</p>
      <label className="text-sm">
        {t('gi.schedule.stage')}
        <select className="ml-2 rounded border px-2 py-1" value={inspectionStage} onChange={(e) => setStage(e.target.value)}>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === 'certificate_check' ? t('gi.stage.certificate_check') : s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        {t('gi.schedule.siteType')}
        <select className="ml-2 rounded border px-2 py-1" value={inspectionSiteType} onChange={(e) => setSiteType(e.target.value)}>
          {SITE_TYPES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm">
        {t('gi.schedule.inspector')}
        <input className="ml-2 rounded border px-2 py-1" value={inspectorActorId} onChange={(e) => setInspector(e.target.value)} />
      </label>
      <label className="text-sm">
        {t('gi.schedule.scheduledAt')}
        <input
          type="datetime-local"
          className="ml-2 rounded border px-2 py-1"
          value={scheduledAt}
          onChange={(e) => setScheduledAt(e.target.value)}
        />
      </label>
      <label className="text-sm">
        {t('gi.schedule.location')}
        <input className="ml-2 rounded border px-2 py-1" value={locationDetail} onChange={(e) => setLocation(e.target.value)} />
      </label>
      <label className="text-sm">
        {t('gi.schedule.familyContact')}
        <input className="ml-2 rounded border px-2 py-1" value={familyContact} onChange={(e) => setFamilyContact(e.target.value)} />
      </label>
      <label className="text-sm">
        {t('gi.schedule.notes')}
        <input className="ml-2 rounded border px-2 py-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </label>
      {otherNeedsLocation && <p className="text-sm text-red-600">{t('gi.schedule.otherRequiresLocation')}</p>}
      <button
        className="self-start rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-50"
        type="submit"
        disabled={mutation.isPending || !inspectorActorId || !scheduledAt || otherNeedsLocation}
      >
        {mutation.isPending ? t('gi.schedule.pending') : t('gi.schedule.submit')}
      </button>
      {mutation.isSuccess && <p role="status" className="text-sm text-green-700">{t('gi.result.scheduled')}</p>}
      {mutation.isError && <p role="alert" className="text-sm text-red-600">{errorText(mutation.error)}</p>}
    </form>
  );
}

// ── Assignment card + inline actions ──────────────────────────────────────────

function AssignmentCard(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  onMutated: () => void;
}): ReactElement {
  const { assignment: a } = props;
  const isActive = a.status === 'scheduled';

  return (
    <li className="flex flex-col gap-2 rounded border p-4">
      <div className="flex flex-wrap gap-4 text-sm">
        <span>
          <strong>{t('gi.card.status')}:</strong> {a.status}
        </span>
        <span>
          <strong>{t('gi.card.inspector')}:</strong> {a.inspectorActorId}
        </span>
        <span>
          <strong>{t('gi.card.stage')}:</strong> {a.inspectionStage}
        </span>
        <span>
          <strong>{t('gi.card.site')}:</strong> {a.inspectionSiteType}
        </span>
        <span>
          <strong>{t('gi.card.district')}:</strong> {a.district}
        </span>
        <span>
          {/* Story 6.17 — surfaced ALWAYS, including its absence: which jurisdiction authorized the
              assignment is exactly what the operator needs to know, and a blank field would read as
              "unknown" rather than "district level". */}
          <strong>{t('gi.card.block')}:</strong> {a.block ?? t('gi.card.blockNone')}
        </span>
        <span>
          <strong>{t('gi.card.photos')}:</strong> {a.photos.length}
        </span>
      </div>
      {/* Story 6.26a (GI4) — the original-certificate photos are labelled apart from the site photos. */}
      {(['original_certificate', 'site'] as const).map((kind) => {
        const photos = a.photos.filter((p) => p.photoKind === kind);
        if (photos.length === 0) return null;
        return (
          <div key={kind} className="flex flex-col gap-1">
            <span className="text-xs font-medium text-gray-700">
              {t(kind === 'original_certificate' ? 'gi.card.photosOriginal' : 'gi.card.photosSite')}
            </span>
            <div className="flex flex-wrap gap-2">
              {photos.map((p) => (
                <img key={p.photoId} src={p.signedUrl} alt={p.caption ?? t(`gi.photo.kind.${kind}`)} className="h-20 w-20 rounded object-cover" />
              ))}
            </div>
          </div>
        );
      })}
      {a.status === 'completed' && a.originalCertificateVerdict !== null && <InspectorRecord assignment={a} />}
      {isActive && (
        <div className="flex flex-wrap items-start gap-4">
          <PhotoUpload {...props} />
          <CompleteAction {...props} photoCount={a.photos.length} />
          <RefuseAction {...props} />
        </div>
      )}
    </li>
  );
}

/** Story 6.26a (GI4 / GI5) — what the inspector recorded about the original certificate and the date of death. */
function InspectorRecord({ assignment: a }: { assignment: api.GroundInspectionAssignmentT }): ReactElement {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
      <dt className="font-medium">{t('gi.card.verdict')}</dt>
      <dd className={a.originalCertificateVerdict === 'does_not_match' ? 'font-semibold text-red-700' : undefined}>
        {t(`gi.card.verdict.${a.originalCertificateVerdict}`)}
      </dd>
      {a.deathDateSource !== null && (
        <>
          <dt className="font-medium">{t(`gi.card.deathDate.${a.deathDateSource}`)}</dt>
          <dd>{a.deathDate ?? '—'}</dd>
        </>
      )}
      {a.deathDateSource === 'family_statement' && (
        <>
          <dt className="font-medium">{t('gi.card.deathTime')}</dt>
          <dd>{a.deathTime ?? t('gi.card.deathTimeUnknown')}</dd>
        </>
      )}
    </dl>
  );
}

function PhotoUpload(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  onMutated: () => void;
}): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  // Story 6.26a (GI4) — a certificate check photographs only the original, so it defaults there.
  const [photoKind, setPhotoKind] = useState<'site' | 'original_certificate'>(
    props.assignment.inspectionStage === 'certificate_check' ? 'original_certificate' : 'site',
  );
  const mutation = useMutation({
    mutationFn: () =>
      api.uploadGroundInspectionPhoto(
        props.pariwarId,
        props.claimCaseId,
        props.assignment.groundInspectionId,
        file!,
        caption || undefined,
        photoKind,
      ),
    onSuccess: () => {
      setFile(null);
      setCaption('');
      props.onMutated();
    },
  });
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm">
        {t('gi.photo.kind')}
        <select
          className="ml-2 rounded border px-2 py-1 text-sm"
          value={photoKind}
          onChange={(e) => setPhotoKind(e.target.value as 'site' | 'original_certificate')}
        >
          <option value="site">{t('gi.photo.kind.site')}</option>
          <option value="original_certificate">{t('gi.photo.kind.original_certificate')}</option>
        </select>
      </label>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label={t('gi.action.uploadPhoto')} />
      <input className="rounded border px-2 py-1 text-sm" placeholder={t('gi.action.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button className="rounded bg-gray-700 px-2 py-1 text-sm text-white disabled:opacity-50" type="button" disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('gi.action.uploadPending') : t('gi.action.uploadPhoto')}
      </button>
      {mutation.isError && <p role="alert" className="text-xs text-red-600">{errorText(mutation.error)}</p>}
    </div>
  );
}

/**
 * Story 6.26a (GI4 / GI5 / GI12) — completing needs the original-certificate record: ≥1 photo of the original, the copy
 * the inspector compared it with (opened here — its token rides the completion), whether it matches, and the date of
 * death: the family's (+ an optional time) on a visit, the one printed on the original on a certificate check. The
 * server re-checks every item; the form only says what is missing before the round-trip.
 */
function CompleteAction(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  photoCount: number;
  onMutated: () => void;
}): ReactElement {
  const isCheck = props.assignment.inspectionStage === 'certificate_check';
  const originals = props.assignment.photos.filter((p) => p.photoKind === 'original_certificate');
  const [verdict, setVerdict] = useState<'matches' | 'does_not_match' | null>(null);
  const [deathDate, setDeathDate] = useState('');
  const [deathTime, setDeathTime] = useState('');
  const clearRecord = (): void => {
    setVerdict(null);
    setDeathDate('');
    setDeathTime('');
  };
  // The token the inspector's verdict / date were recorded against (second code review 2026-10-07).
  const recordedAgainst = useRef<string | undefined>(undefined);
  const certificate = useMutation({
    mutationFn: () => api.getGroundInspectionCertificate(props.pariwarId, props.claimCaseId, props.assignment.groundInspectionId),
    // A second "Compare" (the only way to re-open an expired link) can return a DIFFERENT certificate — the family
    // replaced it. What was recorded was judged against the OLD one ⇒ cleared, ⛔ never submitted under the new token.
    onSuccess: (data) => {
      if (recordedAgainst.current !== undefined && recordedAgainst.current.toLowerCase() !== data.certificateToken.toLowerCase()) {
        clearRecord();
      }
      recordedAgainst.current = data.certificateToken;
    },
  });
  // `2026-10-07-286` H1 — only a photo of the COMPARED certificate's original counts (the server re-checks it).
  const comparedToken = certificate.data?.certificateToken.toLowerCase();
  const originalPhotos = originals.length;
  const originalPhotosForCompared =
    comparedToken === undefined ? originalPhotos : originals.filter((p) => p.certificateToken?.toLowerCase() === comparedToken).length;
  const mutation = useMutation({
    mutationFn: () =>
      api.completeGroundInspection(props.pariwarId, props.claimCaseId, props.assignment.groundInspectionId, {
        originalCertificateVerdict: verdict!,
        comparedCertificateToken: certificate.data!.certificateToken,
        deathDate,
        ...(!isCheck && deathTime !== '' ? { deathTime } : {}),
      }),
    onSuccess: () => props.onMutated(),
    onError: (err) => {
      // The stale compared-certificate token must ⛔ never be resubmitted as-is (review 2026-10-07) — clear it
      // so `ready` goes false, AND clear the verdict/date/time the inspector judged against the OLD certificate
      // (adversarial review 2026-10-07: `certificate.reset()` alone left them resubmittable unchanged against
      // the new one) — the inspector is forced to "Compare" and re-record both from scratch.
      if (err instanceof ApiError && (err.code === 'ground_inspection.certificate_changed' || err.code === 'ground_inspection.no_current_certificate')) {
        certificate.reset();
        recordedAgainst.current = undefined;
        clearRecord();
      }
    },
  });
  const ready = props.photoCount >= 1 && originalPhotosForCompared >= 1 && certificate.data !== undefined && verdict !== null && deathDate !== '';
  const radioName = `verdict-${props.assignment.groundInspectionId}`;
  return (
    <div className="flex flex-col gap-2">
      <button
        className="self-start rounded border px-2 py-1 text-sm disabled:opacity-50"
        type="button"
        disabled={certificate.isPending}
        onClick={() => certificate.mutate()}
      >
        {certificate.isPending ? t('gi.compare.pending') : t('gi.compare.open')}
      </button>
      {certificate.data && (
        <div className="flex flex-col gap-1 text-sm">
          <span>{t('gi.compare.heading')}</span>
          <a className="text-blue-700 underline" href={certificate.data.signedUrl} target="_blank" rel="noreferrer">
            {t('gi.compare.view')}
          </a>
        </div>
      )}
      {certificate.isError && <p role="alert" className="text-xs text-red-600">{errorText(certificate.error)}</p>}
      <fieldset className="flex flex-col gap-1 text-sm" disabled={certificate.data === undefined}>
        <legend>{t('gi.verdict.legend')}</legend>
        <label>
          <input type="radio" name={radioName} checked={verdict === 'matches'} onChange={() => setVerdict('matches')} /> {t('gi.verdict.matches')}
        </label>
        <label>
          <input type="radio" name={radioName} checked={verdict === 'does_not_match'} onChange={() => setVerdict('does_not_match')} />{' '}
          {t('gi.verdict.does_not_match')}
        </label>
      </fieldset>
      {certificate.data === undefined && <p className="text-xs text-amber-700">{t('gi.compare.needed')}</p>}
      <label className="text-sm">
        {t(isCheck ? 'gi.date.printed' : 'gi.date.family')}
        <input type="date" className="ml-2 rounded border px-2 py-1" value={deathDate} onChange={(e) => setDeathDate(e.target.value)} />
      </label>
      {!isCheck && (
        <label className="text-sm">
          {t('gi.time.family')}
          <input type="time" className="ml-2 rounded border px-2 py-1" value={deathTime} onChange={(e) => setDeathTime(e.target.value)} />
        </label>
      )}
      <button className="self-start rounded bg-green-700 px-2 py-1 text-sm text-white disabled:opacity-50" type="button" disabled={mutation.isPending || !ready} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('gi.action.completePending') : t('gi.action.complete')}
      </button>
      {props.photoCount < 1 && <p className="text-xs text-amber-700">{t('gi.action.completeNeedsPhoto')}</p>}
      {props.photoCount >= 1 && originalPhotos < 1 && <p className="text-xs text-amber-700">{t('gi.action.completeNeedsOriginalPhoto')}</p>}
      {originalPhotos >= 1 && originalPhotosForCompared < 1 && (
        <p className="text-xs text-amber-700">{t('gi.action.completeNeedsCurrentOriginalPhoto')}</p>
      )}
      {mutation.isError && <p role="alert" className="text-xs text-red-600">{errorText(mutation.error)}</p>}
    </div>
  );
}

function RefuseAction(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  onMutated: () => void;
}): ReactElement {
  const [disposition, setDisposition] = useState<'photo_refused' | 'evidence_unavailable'>('photo_refused');
  const [refusalReason, setReason] = useState<string>(REFUSAL_REASONS.photo_refused[0]!);
  const [reasonNote, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: () => api.refuseGroundInspection(props.pariwarId, props.claimCaseId, props.assignment.groundInspectionId, { disposition, refusalReason, reasonNote }),
    onSuccess: () => props.onMutated(),
  });
  const reasons = REFUSAL_REASONS[disposition];
  return (
    <div className="flex flex-col gap-1">
      <select
        className="rounded border px-2 py-1 text-sm"
        aria-label={t('gi.refuse.disposition')}
        value={disposition}
        onChange={(e) => {
          const d = e.target.value as 'photo_refused' | 'evidence_unavailable';
          setDisposition(d);
          setReason(REFUSAL_REASONS[d][0]!);
        }}
      >
        <option value="photo_refused">photo_refused</option>
        <option value="evidence_unavailable">evidence_unavailable</option>
      </select>
      <select className="rounded border px-2 py-1 text-sm" aria-label={t('gi.refuse.reason')} value={refusalReason} onChange={(e) => setReason(e.target.value)}>
        {reasons.map((r) => (
          <option key={r} value={r}>
            {r === 'original_certificate_not_produced' ? t('gi.refuse.originalNotProduced') : r}
          </option>
        ))}
      </select>
      <input className="rounded border px-2 py-1 text-sm" placeholder={t('gi.refuse.note')} value={reasonNote} onChange={(e) => setNote(e.target.value)} />
      <button className="rounded bg-red-700 px-2 py-1 text-sm text-white disabled:opacity-50" type="button" disabled={mutation.isPending || !reasonNote} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('gi.action.refusePending') : t('gi.action.refuse')}
      </button>
      {mutation.isError && <p role="alert" className="text-xs text-red-600">{errorText(mutation.error)}</p>}
    </div>
  );
}

function errorText(err: unknown): string {
  if (err instanceof ApiError) {
    // Story 6.26a — the new codes in the page's own words (the rest show the server's message).
    const code = err.code.replace(/^ground_inspection\./, '');
    if ((WORDED_ERROR_CODES as readonly string[]).includes(code)) return t(`gi.error.${code}`);
    return err.message;
  }
  return t('gi.error.generic');
}
