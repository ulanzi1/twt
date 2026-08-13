// `<GroundInspectionPage>` — the ground-inspection admin console (Story 6.7, Task 6; AC1–AC4a).
//
// The English-facing surface for the ground-inspection ASSIGNMENT: schedule a new assignment,
// list a claim's assignments in the operator's district, upload photos, record findings, and
// complete or record a refusal disposition. Chrome copy resolves via the module-local `i18n-en.ts`
// (no @twt/i18n runtime keys → the i18n-parity gate is untouched). The verifier CONSOLE that
// weighs peer-mesh + ground-inspection together is Story 6.10 (Decision D4) — this ships the
// operator affordances + the read that surfaces the signal (present, refused, unavailable, absent).

import type { ReactElement } from 'react';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/client.js';
import * as api from '../../api/client.js';
import { resolveEn as t } from './i18n-en.js';

const STAGES = ['initial', 'corroboration', 'additional_evidence'] as const;
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
  ],
};

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
              {s}
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
      {a.photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {a.photos.map((p) => (
            <img key={p.photoId} src={p.signedUrl} alt={p.caption ?? 'inspection photo'} className="h-20 w-20 rounded object-cover" />
          ))}
        </div>
      )}
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

function PhotoUpload(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  onMutated: () => void;
}): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      api.uploadGroundInspectionPhoto(props.pariwarId, props.claimCaseId, props.assignment.groundInspectionId, file!, caption || undefined),
    onSuccess: () => {
      setFile(null);
      setCaption('');
      props.onMutated();
    },
  });
  return (
    <div className="flex flex-col gap-1">
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label={t('gi.action.uploadPhoto')} />
      <input className="rounded border px-2 py-1 text-sm" placeholder={t('gi.action.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button className="rounded bg-gray-700 px-2 py-1 text-sm text-white disabled:opacity-50" type="button" disabled={!file || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('gi.action.uploadPending') : t('gi.action.uploadPhoto')}
      </button>
      {mutation.isError && <p role="alert" className="text-xs text-red-600">{errorText(mutation.error)}</p>}
    </div>
  );
}

function CompleteAction(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  photoCount: number;
  onMutated: () => void;
}): ReactElement {
  const mutation = useMutation({
    mutationFn: () => api.completeGroundInspection(props.pariwarId, props.claimCaseId, props.assignment.groundInspectionId),
    onSuccess: () => props.onMutated(),
  });
  return (
    <div className="flex flex-col gap-1">
      <button className="rounded bg-green-700 px-2 py-1 text-sm text-white disabled:opacity-50" type="button" disabled={mutation.isPending || props.photoCount < 1} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('gi.action.completePending') : t('gi.action.complete')}
      </button>
      {props.photoCount < 1 && <p className="text-xs text-amber-700">{t('gi.action.completeNeedsPhoto')}</p>}
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
            {r}
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
  if (err instanceof ApiError) return err.message;
  return t('gi.error.generic');
}
