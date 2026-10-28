// `<GroundInspectionPage>` — the ground-inspection admin console (Story 6.7, Task 6; AC1–AC4a).
//
// The English-facing surface for the ground-inspection ASSIGNMENT: schedule a new assignment,
// list a claim's assignments in the operator's district, upload photos, record findings, and
// complete or record a refusal disposition. Chrome copy resolves via the module-local `i18n-en.ts`
// (no @twt/i18n runtime keys → the i18n-parity gate is untouched). The verifier CONSOLE that
// weighs peer-mesh + ground-inspection together is Story 6.10 (Decision D4) — this ships the
// operator affordances + the read that surfaces the signal (present, refused, unavailable, absent).

import type { ReactElement } from 'react';
import { useEffect, useId, useRef, useState } from 'react';
import { type QueryObserverResult, type UseMutationResult, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '../../api/client.js';
import * as api from '../../api/client.js';
import { useSession } from '../../api/hooks.js';
import { WithheldNote, withheldNoteWords } from '../claim-verification/WithheldNote.js';
import { resolveEn as t } from './i18n-en.js';
import { QuestionnairePanel } from './QuestionnairePanel.js';

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
/**
 * ⭐ Story 6.27d (AC6) — the note write's refusals, worded ONLY inside the note box (code review round 2, R2-2):
 * `ground_inspection.not_allowed` is the MODULE-WIDE window code (schedule, compare, photo, complete, refuse), so a
 * note-specific sentence on the page-wide list would mis-word every other action's refusal.
 */
const NOTE_WORDED_ERROR_CODES = ['not_allowed', 'own_ground_visit_pending', 'discrepancy_note_exists'] as const;
/**
 * ⭐ Story 6.27d code review round 3 (R3-10) — a note must carry a VISIBLE character (the server's rule, the same
 * predicate): whitespace, the default-ignorable code points (U+200B, U+2060, U+FEFF, the variation selectors, the Hangul
 * fillers …) and the Braille blank would fill the once-only slot with nothing. (Fix-diff review: `\p{Cf}` missed the
 * variation selectors and the grapheme joiner, and refused a few visible signs — Unicode's own ignorable set replaces it.)
 */
const HAS_VISIBLE_CHAR = /[^\p{White_Space}\p{Default_Ignorable_Code_Point}\u2800]/u;

/** Each opening belongs to one viewer; the card alone bridges its completion response into the panel. */
const DISCREPANCY_ROOT = 'ground-inspection-discrepancy';
const DISCREPANCY_QUERY_DEFAULTS = {
  staleTime: Infinity, gcTime: 0, refetchOnMount: false, refetchOnWindowFocus: false, refetchOnReconnect: false, retry: false,
} as const;

/**
 * The domain's `normalizeActorId` rule (trim the six ASCII whitespace characters, then lower-case), as a LOCAL helper —
 * the admin is a browser bundle and ⛔ imports `@twt/domain`. A convenience only (which cards fetch on their own): the
 * server's identity guard is the boundary.
 */
const ACTOR_ID_TRIM = /^[ \t\n\v\f\r]+|[ \t\n\v\f\r]+$/g;
const normalizeActorId = (id: string): string => id.replace(ACTOR_ID_TRIM, '').toLowerCase();

export interface GroundInspectionPageProps {
  pariwarId: string;
}

export function GroundInspectionPage({ pariwarId }: GroundInspectionPageProps): ReactElement {
  const qc = useQueryClient();
  const session = useSession();
  // ⭐ Story 6.27d code review round 2 (R2-13) — the viewer is known only once the session was fetched SUCCESSFULLY after
  // this page mounted: a sign-out only INVALIDATES the session, so the cache can still name the PREVIOUS actor while the
  // refetch runs (or after it FAILS — `isFetchedAfterMount` counts an error too), and that actor's own card would fetch the
  // discrepancy on their behalf. LATCHED: a later background refetch that fails keeps the known viewer; a successful one
  // naming ANOTHER actor replaces it. (`useSession` refetches on every mount — the client's `refetchOnMount: 'always'`.)
  const fetchedViewer = session.isFetchedAfterMount && session.isSuccess && session.data?.userId ? normalizeActorId(session.data.userId) : null;
  // `epoch` changes ONLY when one KNOWN viewer gives way to another — the cards are re-keyed on it (CR1: an actor change
  // forgets every card's state), ⛔ on the first moment the viewer becomes known (that would remount every card once per
  // page mount, dropping an in-progress completion and a just-seeded result).
  const [viewer, setViewer] = useState<{ readonly id: string | null; readonly epoch: number }>({ id: null, epoch: 0 });
  useEffect(() => {
    if (fetchedViewer === null) return;
    setViewer((v) => (v.id === fetchedViewer ? v : { id: fetchedViewer, epoch: v.id === null ? v.epoch : v.epoch + 1 }));
  }, [fetchedViewer]);
  const viewerId = viewer.id;
  // (Round 3, R3-13 — a FAILED session fetch never renders this page: `GroundInspectionRoute` sends it to sign-in. The
  // viewer is unknown here only while the mount's session fetch is in flight.)
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
      {/* ⭐ Story 6.28 (OP14 (d)) — the other claims of this death (by reference; ⛔ name, ⛔ date). Information only. */}
      {assignmentsQuery.data?.otherClaimsForDeath && assignmentsQuery.data.otherClaimsForDeath.count > 0 && (
        <section aria-label="Other claims for this death" data-testid="gi-other-claims" className="flex flex-col gap-1 rounded border p-3 text-sm">
          <p>{t('gi.otherClaims.count').replace('{n}', String(assignmentsQuery.data.otherClaimsForDeath.count))}</p>
          <ul className="list-disc pl-5">
            {assignmentsQuery.data.otherClaimsForDeath.claims.map((c) => (
              <li key={c.reference} data-testid={`gi-other-claim-${c.reference}`}>
                {t('gi.otherClaims.claim').replace('{ref}', c.reference).replace('{stage}', t(`gi.otherClaims.stage.${c.stage}`))}
              </li>
            ))}
          </ul>
          {assignmentsQuery.data.otherClaimsForDeath.count > assignmentsQuery.data.otherClaimsForDeath.claims.length && (
            <p data-testid="gi-other-claims-more">
              {t('gi.otherClaims.more').replace('{n}', String(assignmentsQuery.data.otherClaimsForDeath.count - assignmentsQuery.data.otherClaimsForDeath.claims.length))}
            </p>
          )}
          {assignmentsQuery.data.otherClaimsForDeath.visitedElsewhere && (
            <p data-testid="gi-visited-elsewhere">{t('gi.otherClaims.visitedElsewhere')}</p>
          )}
          {assignmentsQuery.data.otherClaimsForDeath.alreadyVisited && (
            <p className="font-medium text-amber-800" data-testid="gi-already-visited">
              {t('gi.otherClaims.alreadyVisited')}
            </p>
          )}
        </section>
      )}
      {assignmentsQuery.data && assignmentsQuery.data.assignments.length === 0 && (
        <p role="status" className="text-sm text-amber-700">
          {t('gi.empty')}
        </p>
      )}
      {assignmentsQuery.data && assignmentsQuery.data.assignments.length > 0 && (
        <ul className="flex flex-col gap-4">
          {assignmentsQuery.data.assignments.map((a) => (
            <AssignmentCard
              key={`${viewer.epoch}:${pariwarId}:${scope!.claimCaseId}:${scope!.district}:${scope!.block}:${a.groundInspectionId}`}
              viewerId={viewerId}
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

/** The inspector's "Compare" read — ONE per assignment card, shared by the photo upload (an original's photo is
 *  recorded against the certificate compared, `2026-10-07-287` J1) and the completion (which echoes the same token). */
type CertificateCompare = UseMutationResult<Awaited<ReturnType<typeof api.getGroundInspectionCertificate>>, Error, void>;

/** A 409 that means the compared certificate is no longer the claim's current one — the Compare must be re-run. */
function isStaleCompare(err: unknown): boolean {
  return err instanceof ApiError && (err.code === 'ground_inspection.certificate_changed' || err.code === 'ground_inspection.no_current_certificate');
}

function AssignmentCard(props: {
  viewerId: string | null;
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  onMutated: () => void;
}): ReactElement {
  const { assignment: a } = props;
  // This card survives scheduled → completed, but is replaced on viewer/tenant/claim/locator changes.
  const [seed, setSeed] = useState<api.InspectionDiscrepancyReadT>();
  const isActive = a.status === 'scheduled';
  const certificate: CertificateCompare = useMutation({
    mutationFn: () => api.getGroundInspectionCertificate(props.pariwarId, props.claimCaseId, a.groundInspectionId),
  });

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
                <img
                  key={p.photoId}
                  src={p.signedUrl}
                  // Story 6.27b code review round 2 (X2) — a WITHHELD caption is said (⛔ never silently the generic alt).
                  alt={
                    p.captionWithheld != null
                      ? `${t(`gi.photo.kind.${kind}`)} — ${withheldNoteWords(p.captionWithheld)}`
                      : (p.caption ?? t(`gi.photo.kind.${kind}`))
                  }
                  className="h-20 w-20 rounded object-cover"
                />
              ))}
            </div>
          </div>
        );
      })}
      {a.status === 'completed' && a.originalCertificateVerdict !== null && <InspectorRecord assignment={a} />}
      {/* ⭐ Story 6.27d — ONLY a completed FULL visit (keyed on the family's account, ⛔ the stage — R1); ⛔ a scheduled card. */}
      {a.status === 'completed' && a.deathDateSource === 'family_statement' && (
        <DiscrepancyPanel
          viewerId={props.viewerId}
          seed={seed}
          pariwarId={props.pariwarId}
          claimCaseId={props.claimCaseId}
          assignment={a}
        />
      )}
      {/* ⭐ Story 6.32 (AC7) — the family's questions, BEFORE the completion; ⛔ on a certificate check (it asks the family
          nothing); ⛔ panel at all when the server has ⛔ questionnaire (404 — IQ12). ⛔ It gates the completion (I1). */}
      {isActive && a.inspectionStage !== 'certificate_check' && (
        <QuestionnairePanel pariwarId={props.pariwarId} claimCaseId={props.claimCaseId} groundInspectionId={a.groundInspectionId} />
      )}
      {isActive && (
        <div className="flex flex-wrap items-start gap-4">
          <PhotoUpload {...props} certificate={certificate} />
          {/* The seed is THIS card's own completion response, so it is kept even before the viewer is known (R2-11) —
              the card is replaced, and the seed forgotten, when the viewer changes. */}
          <CompleteAction {...props} certificate={certificate} photoCount={a.photos.length} onCompleted={(discrepancy) => setSeed({ discrepancy, notes: [] })} />
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
  certificate: CertificateCompare;
  onMutated: () => void;
}): ReactElement {
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');
  // Bumped to remount the (uncontrolled) file input — the only way to clear the browser's chosen file.
  const [fileInputKey, setFileInputKey] = useState(0);
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
        photoKind === 'original_certificate' ? props.certificate.data?.certificateToken : undefined,
      ),
    onSuccess: () => {
      setFile(null);
      setCaption('');
      props.onMutated();
    },
    // The compared certificate was replaced (or removed) since "Compare" — re-run it, AND drop the chosen image (narrow
    // review 2026-10-07): it is a photo of the OLD certificate's original, and kept selected it would be stamped with
    // the new one on the very next click — the exact case `-287` J1 closes. The inspector re-compares AND re-photographs.
    onError: (err) => {
      if (isStaleCompare(err)) {
        props.certificate.reset();
        setFile(null);
        setCaption('');
        setFileInputKey((k) => k + 1);
      }
    },
  });
  // ⭐ `2026-10-07-287` J1 — a photo of the original is recorded against the certificate the inspector COMPARED.
  const needsCompare = photoKind === 'original_certificate' && props.certificate.data === undefined;
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
      <input key={fileInputKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} aria-label={t('gi.action.uploadPhoto')} />
      <input className="rounded border px-2 py-1 text-sm" placeholder={t('gi.action.caption')} value={caption} onChange={(e) => setCaption(e.target.value)} />
      <button className="rounded bg-gray-700 px-2 py-1 text-sm text-white disabled:opacity-50" type="button" disabled={!file || needsCompare || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending ? t('gi.action.uploadPending') : t('gi.action.uploadPhoto')}
      </button>
      {needsCompare && <p className="text-xs text-amber-700">{t('gi.photo.compareFirst')}</p>}
      {mutation.isError && (
        <p role="alert" className="text-xs text-red-600">
          {mutation.error instanceof ApiError && mutation.error.code === 'ground_inspection.certificate_changed'
            ? t('gi.photo.certificateChanged')
            : errorText(mutation.error)}
        </p>
      )}
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
  certificate: CertificateCompare;
  photoCount: number;
  onCompleted: (discrepancy: api.InspectionDiscrepancyReadT['discrepancy']) => void;
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
  const certificate = props.certificate;
  // A second "Compare" (the only way to re-open an expired link) can return a DIFFERENT certificate — the family
  // replaced it. What was recorded was judged against the OLD one ⇒ cleared, ⛔ never submitted under the new token.
  const shownToken = certificate.data?.certificateToken;
  useEffect(() => {
    if (shownToken === undefined) return;
    if (recordedAgainst.current !== undefined && recordedAgainst.current.toLowerCase() !== shownToken.toLowerCase()) {
      setVerdict(null);
      setDeathDate('');
      setDeathTime('');
    }
    recordedAgainst.current = shownToken;
  }, [shownToken]);
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
    // Story 6.27d code review round 2 (R2-13) — the response carries the discrepancy result: ⛔ kept in the
    // MutationCache once this action unmounts (the card holds the seed it needs). ⭐ Round 3 (R3-6): a SHORT positive
    // `gcTime`, ⛔ 0 — query-core re-arms an unobserved PENDING mutation's GC timer each time it fires, so 0 spins a 0 ms
    // timer until the request settles; 1 s still drops the entry about a second after it settles.
    gcTime: 1000,
    onSuccess: (data) => {
      // The card retains this actor's seed before the refetched list unmounts this action.
      if (data.discrepancy !== null) props.onCompleted(data.discrepancy);
      props.onMutated();
    },
    onError: (err) => {
      // The stale compared-certificate token must ⛔ never be resubmitted as-is (review 2026-10-07) — clear it
      // so `ready` goes false, AND clear the verdict/date/time the inspector judged against the OLD certificate
      // (adversarial review 2026-10-07: `certificate.reset()` alone left them resubmittable unchanged against
      // the new one) — the inspector is forced to "Compare" and re-record both from scratch.
      if (isStaleCompare(err)) {
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
      {certificate.data !== undefined && originalPhotos >= 1 && originalPhotosForCompared < 1 && (
        <p className="text-xs text-amber-700">{t('gi.action.completeNeedsComparedOriginalPhoto')}</p>
      )}
      {mutation.isError && <p role="alert" className="text-xs text-red-600">{errorText(mutation.error)}</p>}
    </div>
  );
}

/**
 * ⭐ Story 6.27d (AC2, AC4 – AC6; R3, R4, R4a) — the result of a completed FULL visit, as the inspector sees it: the
 * withheld shape (`<WithheldNote>`), "no difference" (ruled copy), or the differences — ONE line per question (ruled
 * copy; ⛔ a neighbour's value, ⛔ who, ⛔ how many) with ONE note box each. A result SEEDED by this card's own completion
 * is served from the cache without a fetch; it FETCHES on its own only when the session IS the assigned inspector; every
 * other viewer gets an on-demand "Show the result" (the page ⛔ cannot tell an override holder — a non-holder's click is
 * the server's 403, one audited denial per click, ⛔ an automatic fetch per card), disabled until the viewer is known
 * (R2-11). ⛔ Never inside the "Other claims for this death" section (6.27a Trap 5).
 */
function DiscrepancyPanel(props: {
  pariwarId: string;
  claimCaseId: string;
  assignment: api.GroundInspectionAssignmentT;
  viewerId: string | null;
  seed: api.InspectionDiscrepancyReadT | undefined;
}): ReactElement {
  const qc = useQueryClient();
  const { pariwarId, claimCaseId, viewerId } = props;
  const gid = props.assignment.groundInspectionId;
  // Story 6.27d code review round 2 (R2-3) — one id per opening (a remount gets a new one); ⛔ `crypto.randomUUID`,
  // which is secure-context-gated (`api/hooks.ts` `newIdempotencyKey`) and would throw in render over plain HTTP.
  const readId = useId();
  // ⭐ Round 3 (R3-2) — ⛔ `viewerId` in the key: the opening's `readId` and the cards' re-key on a viewer CHANGE
  // (`viewer.epoch`) isolate actors; the viewer becoming KNOWN must ⛔ move this opening to a fresh key (that dropped a
  // retried result or a saved note and fell back to the seed, with ⛔ fetch).
  const key = [DISCREPANCY_ROOT, pariwarId, claimCaseId, gid, readId] as const;
  const [requested, setRequested] = useState(false);
  const isInspector = viewerId !== null && viewerId === normalizeActorId(props.assignment.inspectorActorId);
  const enabled = props.seed !== undefined || (viewerId !== null && (isInspector || requested));
  const query = useQuery({
    queryKey: key,
    queryFn: () => api.getInspectionDiscrepancy(pariwarId, claimCaseId, gid),
    enabled,
    initialData: props.seed,
    ...DISCREPANCY_QUERY_DEFAULTS,
  });
  useEffect(() => () => {
    qc.removeQueries({ queryKey: [DISCREPANCY_ROOT, pariwarId, claimCaseId, gid, readId], exact: true });
  }, [qc, pariwarId, claimCaseId, gid, readId]);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const result = query.data?.discrepancy;
  const words = !enabled ? '' : result === undefined
    ? (query.isError ? '' : t('gi.discrepancy.loading'))
    : result.state === 'withheld' ? withheldNoteWords(result.reason)
    : t(result.questionKeys.length === 0 ? 'gi.discrepancy.none' : 'gi.discrepancy.found');
  // ⭐ Story 6.27d code review round 2 (R2-4, family 13(d)) — a "Try again" announces its loading and then its result
  // AGAIN, even when the result is unchanged (an unchanged region says nothing); a failure re-inserts its alert (keyed
  // on the failure). A note save's refresh is ⛔ a retry — the box announces its own result.
  const [retrying, setRetrying] = useState(false);
  // ⭐ Round 3 (R3-9) — a retry that FAILS says ⛔ the old result again as if fresh (the alert says it failed); the result
  // is announced again only after a SUCCESSFUL read.
  const [retryFailed, setRetryFailed] = useState(false);
  // Reset when the RESULT changes (⛔ on every cache write — a note save's install would re-announce the whole screen).
  useEffect(() => setRetryFailed(false), [words]);
  // ⭐ Round 3 fix-diff review (R3-3) — a counter of SUCCESSFUL re-reads of this opening (a cache write is ⛔ a read): a note
  // box keeps its confirmed note until a re-read that landed AFTER its save succeeds without it.
  const [reads, setReads] = useState(0);
  const reread = (): Promise<QueryObserverResult<api.InspectionDiscrepancyReadT>> =>
    query.refetch().then((r) => {
      if (mounted.current && !r.isError) setReads((n) => n + 1);
      return r;
    });
  const retry = (): void => {
    setRetrying(true);
    void reread().then((r) => {
      if (!mounted.current) return;
      setRetrying(false);
      setRetryFailed(r.isError);
    });
  };
  const announced = retrying ? t('gi.discrepancy.loading') : retryFailed ? '' : words;
  const [announcement, setAnnouncement] = useState('');
  useEffect(() => setAnnouncement(announced), [announced]);
  const saved = (note: api.InspectionDiscrepancyNoteT): void => {
    qc.setQueryData<api.InspectionDiscrepancyReadT>(key, (old) => old?.discrepancy.state === 'shown'
      ? { ...old, notes: [...old.notes.filter((n) => n.questionKey !== note.questionKey), note] }
      : old);
  };
  // ⭐ Round 3 (R3-4) — the server said this reader is HIDDEN: the withheld shape replaces the cached result AT ONCE
  // (uniform withholding), and only then the re-read — so a failed re-read never leaves the result on screen.
  const hidden = (): void => {
    qc.setQueryData<api.InspectionDiscrepancyReadT>(key, { discrepancy: { state: 'withheld', reason: 'own_visit' }, notes: [] });
    void reread();
  };

  let body: ReactElement;
  if (!enabled) {
    body = (
      <button
        className="self-start rounded border px-2 py-1 text-sm disabled:opacity-50"
        type="button"
        disabled={viewerId === null}
        onClick={() => setRequested(true)}
      >
        {t('gi.discrepancy.show')}
      </button>
    );
  } else if (query.data === undefined) {
    body = query.isError ? (
      <p key={query.errorUpdateCount} role="alert" className="text-sm text-red-600">
        {errorText(query.error)}
      </p>
    ) : (
      <p className="text-sm">
        {t('gi.discrepancy.loading')}
      </p>
    );
  } else if (query.data.discrepancy.state === 'withheld') {
    body = <WithheldNote reason={query.data.discrepancy.reason} testId="gi-discrepancy-withheld" />;
  } else if (query.data.discrepancy.questionKeys.length === 0) {
    body = <p data-testid="gi-discrepancy-none">{t('gi.discrepancy.none')}</p>;
  } else {
    const d = query.data.discrepancy;
    const notes = query.data.notes;
    body = (
      <div className="flex flex-col gap-2" data-testid="gi-discrepancy-found">
        <p>{t('gi.discrepancy.found')}</p>
        <ul className="flex flex-col gap-3">
          {d.questionKeys.map((k) => (
            <li key={k} className="flex flex-col gap-1" data-testid={`gi-discrepancy-${k}`}>
              <span>{DISCREPANCY_LINE[k](d)}</span>
              <DiscrepancyNoteBox
                pariwarId={props.pariwarId}
                claimCaseId={props.claimCaseId}
                groundInspectionId={gid}
                questionKey={k}
                existing={notes.find((n) => n.questionKey === k) ?? null}
                viewerId={viewerId}
                onSaved={saved}
                onChanged={reread}
                onHidden={hidden}
                reads={reads}
              />
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <section aria-label={t('gi.discrepancy.region')} className="flex flex-col gap-2 rounded border p-3 text-sm" data-testid="gi-discrepancy">
      <p role="status" aria-live="polite" className="sr-only" data-testid="gi-discrepancy-announcement">{announcement}</p>
      {query.isError && query.data !== undefined && (
        <p key={query.errorUpdateCount} role="alert">{t('gi.discrepancy.refreshFailed')}</p>
      )}
      {body}
      {enabled && (query.isError || result?.state === 'withheld') && (
        <button type="button" className="self-start rounded border px-2 py-1" disabled={query.isFetching} onClick={retry}>
          {t('gi.discrepancy.retry')}
        </button>
      )}
    </section>
  );
}

type ShownDiscrepancy = Extract<api.InspectionDiscrepancyT, { state: 'shown' }>;

/** ③ / ④ — the family's answer in the option's English words (`—` when it could ⛔ be shown). */
function familyAnswerLine(key: 'death_cause' | 'death_illness', d: ShownDiscrepancy): string {
  const a = d.familyAnswers?.[key];
  return t(`gi.discrepancy.${key}`).replace('{familyAnswer}', a?.status === 'shown' ? a.labels.join(', ') : '—');
}

/**
 * ⭐ Story 6.32 (AC7, TR12) — the per-key line as a TABLE over EVERY compared key (⛔ a ternary, which rendered the date's
 * sentence for any key that was ⛔ `has_died`). A test pins one entry per `INSPECTION_DISCREPANCY_KEYS` key.
 */
export const DISCREPANCY_LINE: Readonly<Record<api.InspectionDiscrepancyKeyT, (d: ShownDiscrepancy) => string>> = {
  has_died: () => t('gi.discrepancy.has_died'),
  death_date: (d) =>
    t('gi.discrepancy.death_date').replace('{familyDeathDate}', d.familyDeathDate?.status === 'shown' ? d.familyDeathDate.date : '—'),
  death_cause: (d) => familyAnswerLine('death_cause', d),
  death_illness: (d) => familyAnswerLine('death_illness', d),
};

/** ONE note box per differing question: read-only once recorded (with its author when ⛔ the viewer's own — R4a). */
function DiscrepancyNoteBox(props: {
  pariwarId: string;
  claimCaseId: string;
  groundInspectionId: string;
  questionKey: api.InspectionDiscrepancyKeyT;
  existing: api.InspectionDiscrepancyNoteT | null;
  viewerId: string | null;
  onSaved: (note: api.InspectionDiscrepancyNoteT) => void;
  /** Re-reads the panel's opening; resolves with the read's outcome (R3-3). */
  onChanged: () => Promise<QueryObserverResult<api.InspectionDiscrepancyReadT>>;
  /** R3-4 — the server said this reader is hidden: the panel withholds at once, then re-reads. */
  onHidden: () => void;
  /** R3-3 — how many re-reads of the opening have SUCCEEDED (the panel's counter). */
  reads: number;
}): ReactElement {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [announcement, setAnnouncement] = useState('');
  // ⭐ Story 6.27d code review round 2 (R2-4) — the note THIS box just recorded, rendered read-only at once (⛔ an empty
  // editable box between the save and the panel's cache notification); the panel's own copy wins once it arrives.
  const [confirmed, setConfirmed] = useState<api.InspectionDiscrepancyNoteT | null>(null);
  // R2-4 — set by a 409 `discrepancy_note_exists`: the re-read's note is announced WITH its author when it arrives.
  const awaitingExisting = useRef(false);
  // ⭐ Round 3 (R3-5) — the LATEST `existing` (a save's callbacks close over the render that started it).
  const existingRef = useRef(props.existing);
  existingRef.current = props.existing;
  // ⭐ Round 3 (R3-3) — a 201 that a re-read landing AFTER it does ⛔ confirm (it succeeded without this note): the note was ⛔
  // recorded after all (the deferred CR7 — a swallowed COMMIT answered 201); the box returns to editable and says so.
  // Checked on EVERY successful re-read after the save (⛔ only the first — it may have failed and kept the note, CR3);
  // the reason is cleared once a note for this key arrives.
  const [unconfirmed, setUnconfirmed] = useState(false);
  const [pending, setPending] = useState<{ readonly submitted: string; readonly after: number } | null>(null);
  const readsRef = useRef(props.reads);
  readsRef.current = props.reads;
  useEffect(() => {
    if (props.existing !== null) setUnconfirmed(false);
    if (pending === null || props.reads <= pending.after) return;
    if (props.existing === null) {
      setConfirmed(null);
      setText(pending.submitted);
      setUnconfirmed(true);
    }
    setPending(null);
  }, [props.reads, props.existing, pending]);
  // R2-12 — a save that settles after the box is gone (sign-out, scope change, re-key) touches ⛔ nothing.
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  // Per-call `mutateAsync().then` — a mutation's own callbacks fire for the LATEST call only, and each box saves its own.
  const mutation = useMutation({
    mutationFn: (note: string) =>
      api.recordInspectionDiscrepancyNote(props.pariwarId, props.claimCaseId, props.groundInspectionId, { questionKey: props.questionKey, note }),
    // R2-13 — the variables are the family's re-told account (Tier-1): ⛔ kept in the MutationCache after unmount.
    // ⭐ Round 3 (R3-6) — 1 s, ⛔ 0 (a pending, unobserved mutation re-arms its GC timer each time it fires).
    gcTime: 1000,
  });
  // R4a — "Recorded" ONLY for the viewer's OWN note; every other note — and every note while the viewer is unknown — names
  // its author (round 3 fix-diff review: a neutral "Recorded" passed a supervisor's note off as the viewer's). Read through a
  // ref: a 409's announcement runs in the callback of the render that STARTED the save.
  const viewerRef = useRef(props.viewerId);
  viewerRef.current = props.viewerId;
  const authorWords = (n: api.InspectionDiscrepancyNoteT): string => {
    const viewer = viewerRef.current;
    const own = viewer !== null && normalizeActorId(viewer) === normalizeActorId(n.authorActorId);
    return own ? t('gi.discrepancy.recorded') : t('gi.discrepancy.recordedBy').replace('{author}', n.authorDisplay);
  };
  useEffect(() => {
    if (!awaitingExisting.current || props.existing === null) return;
    awaitingExisting.current = false;
    setAnnouncement(authorWords(props.existing)); // announce once per arriving note (`authorWords` reads the viewer by ref)
  }, [props.existing]);
  const save = (): void => {
    setSaving(true);
    setError(null);
    setUnconfirmed(false);
    const submitted = text;
    mutation.mutateAsync(submitted).then(
      (written) => {
        if (!mounted.current) return;
        const note = { ...written, note: submitted };
        setConfirmed(note);
        props.onSaved(note);
        setSaving(false);
        setText('');
        setAnnouncement(t('gi.discrepancy.saved'));
        // R3-3 — confirmed only by a SUCCESSFUL re-read after this point (a failed one keeps the note — CR3).
        setPending({ submitted, after: readsRef.current });
        void props.onChanged();
      },
      (err: unknown) => {
        if (!mounted.current) return;
        setSaving(false);
        setError(err);
        if (err instanceof ApiError && err.code === 'ground_inspection.discrepancy_note_exists') {
          // The box was filled meanwhile (by an override holder, or another tab) — SHOW whose it is: at once when that
          // note is already on screen (R3-5 — an unchanged `existing` re-renders nothing), else after the re-read.
          if (existingRef.current !== null) {
            setAnnouncement(authorWords(existingRef.current));
          } else {
            awaitingExisting.current = true;
            void props.onChanged();
          }
        } else if (err instanceof ApiError && err.code === 'ground_inspection.own_ground_visit_pending') {
          // R2-12 / R3-4 — the reader has become HIDDEN: the panel withholds at once, then re-reads.
          props.onHidden();
        }
      },
    );
  };
  const shown = props.existing ?? confirmed;
  return (
    <div className="flex flex-col gap-1">
      {/* R2-4 — ONE polite region at a fixed position, ⛔ inside the editable / read-only switch (a region inserted
          with its words already in it is not announced). */}
      <p role="status" aria-live="polite" className="sr-only" data-testid={`gi-discrepancy-note-status-${props.questionKey}`}>
        {announcement}
      </p>
      {shown !== null ? (
        <div className="flex flex-col gap-1 rounded bg-gray-50 p-2" data-testid={`gi-discrepancy-note-${props.questionKey}`}>
          <span className="text-xs font-medium text-gray-700">{authorWords(shown)}</span>
          <span>{typeof shown.note === 'string' ? shown.note : t('gi.discrepancy.noteUnavailable')}</span>
        </div>
      ) : (
        <>
          <label className="flex flex-col text-sm">
            {t('gi.discrepancy.noteLabel')}
            <textarea className="rounded border px-2 py-1" value={text} onChange={(e) => setText(e.target.value)} rows={2} />
          </label>
          <button
            className="self-start rounded bg-blue-600 px-2 py-1 text-sm text-white disabled:opacity-50"
            type="button"
            disabled={saving || !HAS_VISIBLE_CHAR.test(text)}
            onClick={save}
          >
            {saving ? t('gi.discrepancy.saving') : t('gi.discrepancy.save')}
          </button>
        </>
      )}
      {/* R3-3 — a 201 the re-read did ⛔ confirm: the text is back in the box, to record again. */}
      {unconfirmed && (
        <p role="alert" className="text-xs text-red-600">
          {t('gi.discrepancy.notConfirmed')}
        </p>
      )}
      {/* Outside the switch too: a 409 `discrepancy_note_exists` keeps saying why the box became read-only. */}
      {error !== null && (
        <p role="alert" className="text-xs text-red-600">
          {noteErrorText(error)}
        </p>
      )}
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

/** Story 6.27d (R2-2) — the note box's words: its three refusals, else the page's. */
function noteErrorText(err: unknown): string {
  if (err instanceof ApiError) {
    const code = err.code.replace(/^ground_inspection\./, '');
    if ((NOTE_WORDED_ERROR_CODES as readonly string[]).includes(code)) return t(`gi.discrepancy.error.${code}`);
  }
  return errorText(err);
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
