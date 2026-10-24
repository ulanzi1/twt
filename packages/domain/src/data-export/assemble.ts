// Member data-export section-assembly core — Story 3.11 (Task 2; AC2, AC4).
//
// The PURE gathering core behind the DPDPA data-portability ZIP (FR-95). Given a member + an in-scope
// (tenant-isolated) Drizzle client, it reads every section of the member's data and returns a
// `Record<string, unknown>` keyed by the seven member-readable filenames + `manifest.json`. The job
// (apps/jobs/data-export.ts) is thin glue: it opens the scope-tx, calls this, contract-validates each
// section, zips + envelope-encrypts the result. This mirrors the "domain owns the DB/decrypt logic, the
// job is thin runtime" split from member/renewal-scheduler.ts ↔ apps/jobs/member-renewal-lifecycle.ts.
//
// ── The member is the legitimate audience (AC4 / architecture §2.7) ─────────────────────────────────
// Tier-1 PII in `profile.json` is DECRYPTED here — the member is exercising their own data-portability
// right. This is the FIRST domain-side use of `decryptTier1` (all prior decrypts were app-side crypto
// helpers). The decrypted plaintext is returned in-memory only; the caller RE-encrypts the whole ZIP
// for at-rest storage. Each field is decrypted with ITS OWN field-class encryption context (mirroring
// the per-family app-side crypto helpers): kyc / nominee / medical / address key on the member's REAL
// pariwarId; the member MOBILE keys on the fixed MEMBER_IDENTITY_NAMESPACE sentinel (login runs
// pre-scope — see apps/api mobile-index.ts), NOT the real pariwarId.
//
// ── Empty placeholders (AC2 / Dev Notes §"Content scope") ───────────────────────────────────────────
// contribution_history (Epic 8 source) + claim_history (Epic 6 source) have NO source system at Epic 3.
// The epic AC lists all seven files, so all seven are emitted; the two unsourced files carry a
// schema-stable empty placeholder ({ records: [], _status, _wired_by }) so the swap-in for real reads
// when Epics 8/6 land is a one-line change. This is honest completeness, not a lie of omission.
//
// Every read runs under the caller's RLS scope (tenant-isolated). Naming: DB snake_case, TS camelCase.
//
// ── ⚠ DELIBERATELY NOT EXPORTED: the Story 10.10 moderation rationale ────────────────────────────
// `member_moderation_actions.decision_note_ciphertext` is Tier-1 member-related PII, and this
// module's own header calls itself "the authoritative checklist" for the PII surface — so its
// absence here is recorded rather than left to read as an oversight.
// ⚠ NAME CORRECTED at Story 10.21 (Finding 6): this note said `rationale_ciphertext`, which migration
// 0099 RENAMED to `decision_note_ciphertext` (Story 10.20). A stale name in the module that calls
// itself the authoritative PII checklist is exactly the kind of drift that makes the checklist
// un-followable. ⚠ Story 10.20 also added THREE further Tier-1 columns to that table —
// `escalation_inadequacy_ciphertext`, `escalation_proportionality_ciphertext` and
// `immediate_termination_reason_ciphertext` — and every one of them inherits the SAME undecided
// disclosure question stated below. The open question now covers four columns, not one.
//
// The ERASURE half IS wired: `member/anonymize.ts` scrubs the rationale on RTBF, and migration 0092
// grants the column-level UPDATE that makes the scrub possible at all (0091 was SELECT+INSERT-only,
// which made the column structurally un-erasable). That was a defect and it is fixed.
//
// The DISCLOSURE half is a genuinely different question and is NOT decided here: the rationale is
// ADMIN-AUTHORED DELIBERATIVE TEXT about the member, written by a trustee under governance
// authority. Exporting it to the data principal would disclose internal moderation reasoning
// verbatim — plausibly owed under DPDPA's access right, plausibly exempt as deliberative material,
// and consequential either way (it changes what a trustee can safely write in that field). The
// member already learns the moderation OUTCOME and its reason-code LABEL through the status panel
// and the notification, so nothing about their standing is hidden from them today.
// → OPEN QUESTION for PM/legal, recorded per [[feedback_record_unattested_no_backfill]]. Whoever
// answers it should also decide whether `actor_display` rides along, since naming the acting
// trustee to a terminated member is its own decision.
// ⭐ CLOSED BY RULING, 2026-08-14 — Decision `2026-08-14-109` clause 3 (Escalation 3 / consent-sheet
// Row 3). The Trustee Panel ruled option (b): **internal deliberative material is WITHHELD.** The
// decision note, Story 10.20's three further Tier-1 moderation columns
// (`escalation_inadequacy_ciphertext`, `escalation_proportionality_ciphertext`,
// `immediate_termination_reason_ciphertext`) and **`actor_display`** are NOT disclosed to the data
// principal under the DPDPA access right. They are admin-authored deliberative material written under
// governance authority, and the exemption is recorded as such.
// ⚠ The member is NOT left uninformed: they continue to learn the moderation OUTCOME and its
// REASON-CODE LABEL through the status panel and the notification. The exemption covers the
// REASONING, not the FACT.
// ⛔ THEREFORE THIS MODULE'S OMISSION IS NOW CORRECT BY RULING, not merely undecided — the absence
// above is the ratified posture and must not be "fixed" by adding the fields.
// ⚠ Recorded `un-attested`: legal counsel is unengaged, so this arrived on Panel attestation alone
// (the `2026-08-06-080` precedent). *Re-trigger:* the first counsel engagement, at which it should be
// re-presented ([[feedback_record_unattested_no_backfill]]).

import { and, asc, desc, eq, inArray, isNull } from 'drizzle-orm';

import { consentRecords } from '../schema/consent_records.js';
import type { Db } from '../db.js';
import { decryptTier1, parseEnvelope } from '../encryption/envelope.js';
import type { KmsKeyRef, KmsProvider } from '../encryption/kms-provider.js';
import type { MemberId, PariwarId } from '../ids/index.js';
import { auditLogEntries } from '../schema/audit_log_entries.js';
import { eventsLog } from '../schema/events_log.js';
import { memberAddresses } from '../schema/member_addresses.js';
import { memberAttribution } from '../schema/member_attribution.js';
import { memberIdentities } from '../schema/member_identities.js';
import { memberKycProfiles } from '../schema/member_kyc_profiles.js';
import { memberMedicalDisclosures } from '../schema/member_medical_disclosures.js';
import { memberNominees } from '../schema/member_nominees.js';
import { memberNomineeVersions } from '../schema/member_nominee_versions.js';
import { nomineeDeterminationItems, nomineeDeterminations } from '../schema/nominee_determinations.js';
import { memberPostings } from '../schema/member_postings.js';
import { workplaceRequests } from '../schema/workplace_requests.js';
import { workplaces } from '../schema/workplaces.js';
import { resolvePublicNamePresentationMode } from '../kyc/presentation-policy.js';
import { ANONYMIZED_SENTINEL } from '../member/anonymize.js';
import { getKnownPeopleForExport, type KnownPeopleExportRow } from '../member/known-people.js';
import { getNomineeLinksForExport } from '../nominee/member-links.js';
import { resolveMemberFacingDeceasedName } from '../notifications/pool-identity.js';
import { members } from '../schema/members.js';
import { vyawasthaShulkReceipts } from '../schema/vyawastha_shulk_receipts.js';

/** The KMS material the decrypt uses. The caller (the job) threads its `{ kms, kekRef }` here. */
export interface ExportEncryption {
  readonly kms: KmsProvider;
  readonly kekRef: KmsKeyRef;
}

export interface AssembleMemberExportParams {
  readonly exportId: string;
  readonly memberId: MemberId;
  readonly pariwarId: PariwarId;
  /** Clock-injected generation instant (no raw Date.now() — §1.12). */
  readonly now: Date;
}

/** The current export schema version — bumped when a section shape changes. */
export const EXPORT_SCHEMA_VERSION = 1;

/** The seven member-readable filenames + the manifest, in a stable order. */
export const EXPORT_FILENAMES = {
  PROFILE: 'profile.json',
  CONSENT: 'consent_records.json',
  PAYMENT: 'payment_receipts.json',
  EVENT_STREAM: 'event_stream.json',
  AUDIT: 'audit_history.json',
  CONTRIBUTION: 'contribution_history.json',
  CLAIM: 'claim_history.json',
  MANIFEST: 'manifest.json',
} as const;

// Field-class literals — mirror the piiColumn(1, '<class>') annotations on the source schemas (same
// package). Kept as local constants so this module has NO cross-app dependency (apps/api/context.ts
// owns the parallel copies for the request path).
const FIELD_CLASS_KYC = 'member_kyc';
const FIELD_CLASS_NOMINEE = 'member_nominee';
const FIELD_CLASS_MEDICAL = 'member_medical';
const FIELD_CLASS_ADDRESS = 'member_address';
const FIELD_CLASS_MOBILE = 'member_mobile';

// The member mobile blind index + Tier-1 envelope key on this fixed sentinel (login runs pre-scope —
// see apps/api context.ts MEMBER_IDENTITY_NAMESPACE), NOT the member's real pariwarId. Duplicated here
// by value because domain cannot import apps/api.
const MEMBER_IDENTITY_NAMESPACE = '00000000-0000-0000-0000-000000000001';

/**
 * The schema-stable empty placeholder for a not-yet-sourced section (AC2). One well-known factory so the
 * shape is identical everywhere and trivially swappable when Epics 8/6 wire real reads.
 */
export function emptySection(wiredBy: string): {
  records: never[];
  _status: 'no_source_system_at_this_epic';
  _wired_by: string;
} {
  return { records: [], _status: 'no_source_system_at_this_epic', _wired_by: wiredBy };
}

/** Decrypt one Tier-1 envelope string with the given field-class context. */
async function decryptField(
  serialized: string,
  pariwarId: string,
  fieldClass: string,
  enc: ExportEncryption,
): Promise<string> {
  const ct = parseEnvelope(serialized);
  const bytes = await decryptTier1(ct, { pariwarId, fieldClass }, enc.kms, enc.kekRef);
  return Buffer.from(bytes).toString('utf-8');
}

/**
 * Assemble the full seven-file export payload + manifest for a member. Every read is tenant-isolated
 * (the caller has opened the scope-tx as `pariwarId`); Tier-1 PII is decrypted (the member is the
 * legitimate audience). Returns a plain object keyed by the export filenames.
 */
export async function assembleMemberExport(
  client: Db,
  enc: ExportEncryption,
  params: AssembleMemberExportParams,
): Promise<Record<string, unknown>> {
  const { exportId, memberId, pariwarId, now } = params;

  // ── profile.json ────────────────────────────────────────────────────────────────────────────────
  const [memberRow] = await client
    .select()
    .from(members)
    .where(eq(members.memberId, memberId))
    .limit(1);

  const [identityRow] = await client
    .select()
    .from(memberIdentities)
    .where(eq(memberIdentities.memberId, memberId))
    .limit(1);

  const [kycRow] = await client
    .select()
    .from(memberKycProfiles)
    .where(eq(memberKycProfiles.memberId, memberId))
    .limit(1);

  const [addressRow] = await client
    .select()
    .from(memberAddresses)
    .where(eq(memberAddresses.memberId, memberId))
    .orderBy(desc(memberAddresses.createdAt))
    .limit(1);

  const nomineeRows = await client
    .select()
    .from(memberNominees)
    .where(eq(memberNominees.memberId, memberId))
    .orderBy(asc(memberNominees.rank));

  // Story 6.20 (D11) — the declaration HISTORY, with the marks of every LIVE determination on it.
  const versionRows = await client
    .select()
    .from(memberNomineeVersions)
    .where(eq(memberNomineeVersions.memberId, memberId))
    .orderBy(asc(memberNomineeVersions.rank), asc(memberNomineeVersions.versionNo));
  const liveMarks =
    versionRows.length === 0
      ? []
      : await client
          .select({ versionId: nomineeDeterminationItems.versionId, mark: nomineeDeterminationItems.mark })
          .from(nomineeDeterminationItems)
          .innerJoin(
            nomineeDeterminations,
            eq(nomineeDeterminations.determinationId, nomineeDeterminationItems.determinationId),
          )
          .where(
            and(
              inArray(
                nomineeDeterminationItems.versionId,
                versionRows.map((v) => v.versionId),
              ),
              isNull(nomineeDeterminations.supersededAt),
            ),
          );

  const medicalRows = await client
    .select()
    .from(memberMedicalDisclosures)
    .where(eq(memberMedicalDisclosures.memberId, memberId))
    .orderBy(asc(memberMedicalDisclosures.createdAt));

  // Story 6.36a (AC9) — each posting with the workplace it names (its name and kind — Tier 3, the member's own) and its
  // start date; then every *"isn't listed"* request the member made, with the text THEY typed.
  const postingRows = await client
    .select({
      district: memberPostings.district,
      pariwarRef: memberPostings.pariwarRef,
      isRetirement: memberPostings.isRetirement,
      createdAt: memberPostings.createdAt,
      startedOn: memberPostings.startedOn,
      workplaceRequestId: memberPostings.workplaceRequestId,
      workplaceName: workplaces.name,
      workplaceKind: workplaces.kind,
    })
    .from(memberPostings)
    .leftJoin(workplaces, and(eq(workplaces.pariwarId, memberPostings.pariwarId), eq(workplaces.workplaceId, memberPostings.workplaceId)))
    .where(eq(memberPostings.memberId, memberId))
    .orderBy(asc(memberPostings.createdAt), asc(memberPostings.postingId));

  const workplaceRequestRows = await client
    .select()
    .from(workplaceRequests)
    .where(eq(workplaceRequests.memberId, memberId))
    .orderBy(asc(workplaceRequests.createdAt), asc(workplaceRequests.requestId));

  const attributionRows = await client
    .select()
    .from(memberAttribution)
    .where(eq(memberAttribution.memberId, memberId));

  const mobile =
    identityRow !== undefined
      ? await decryptField(
          identityRow.mobileCiphertext,
          MEMBER_IDENTITY_NAMESPACE,
          FIELD_CLASS_MOBILE,
          enc,
        )
      : null;

  const kyc =
    kycRow !== undefined
      ? {
          name: await decryptField(kycRow.nameCiphertext, pariwarId, FIELD_CLASS_KYC, enc),
          dob: await decryptField(kycRow.dobCiphertext, pariwarId, FIELD_CLASS_KYC, enc),
          aadhaarMaskedId: kycRow.aadhaarMaskedId ?? null,
          verificationStrength: kycRow.verificationStrength,
          source: kycRow.source,
          trusteeVerified: kycRow.trusteeVerified,
          photoPresent: kycRow.photoCiphertext !== null,
        }
      : null;

  const address =
    addressRow !== undefined
      ? {
          addressLine: await decryptField(
            addressRow.addressLineCiphertext,
            pariwarId,
            FIELD_CLASS_ADDRESS,
            enc,
          ),
          locale: addressRow.locale,
          recordedAt: addressRow.createdAt.toISOString(),
        }
      : null;

  const nominees = await Promise.all(
    nomineeRows.map(async (n) => ({
      rank: n.rank,
      name: await decryptField(n.nameCiphertext, pariwarId, FIELD_CLASS_NOMINEE, enc),
      relationship: n.relationship,
      mobile: await decryptField(n.mobileCiphertext, pariwarId, FIELD_CLASS_NOMINEE, enc),
      address:
        n.addressCiphertext !== null
          ? await decryptField(n.addressCiphertext, pariwarId, FIELD_CLASS_NOMINEE, enc)
          : null,
      splitPct: n.splitPct,
    })),
  );

  const nomineeHistory = await Promise.all(
    versionRows.map(async (v) => ({
      rank: v.rank,
      versionNo: v.versionNo,
      kind: v.kind,
      source: v.source,
      name: v.nameCiphertext !== null ? await decryptField(v.nameCiphertext, pariwarId, FIELD_CLASS_NOMINEE, enc) : null,
      relationship: v.relationship,
      mobile: v.mobileCiphertext !== null ? await decryptField(v.mobileCiphertext, pariwarId, FIELD_CLASS_NOMINEE, enc) : null,
      address: v.addressCiphertext !== null ? await decryptField(v.addressCiphertext, pariwarId, FIELD_CLASS_NOMINEE, enc) : null,
      splitPct: v.splitPct,
      recordedAt: v.recordedAt.toISOString(),
      effectiveAt: v.effectiveAt.toISOString(),
      determinationMarks: liveMarks.filter((m) => m.versionId === v.versionId).map((m) => m.mark),
    })),
  );

  const medicalDisclosures = await Promise.all(
    medicalRows.map(async (m) => ({
      imaListVersion: m.imaListVersion,
      disclosedConditions: await decryptField(
        m.disclosedConditionsCiphertext,
        pariwarId,
        FIELD_CLASS_MEDICAL,
        enc,
      ),
      additionalContext:
        m.additionalContextCiphertext !== null
          ? await decryptField(m.additionalContextCiphertext, pariwarId, FIELD_CLASS_MEDICAL, enc)
          : null,
      conditionCount: m.conditionCount,
      acknowledgedAt: m.acknowledgedAt.toISOString(),
    })),
  );

  // Story 6.36b (SW17, AC12) — PEOPLE WHO KNOW ME: the people the member NAMED and the members who named THEM, every link,
  // each with ONLY the name the member already saw, in the member-to-member form the app shows (the Pariwar's presentation
  // mode): a named person's once they had ACCEPTED (an `asked` or declined link showed only the name the member saved on
  // their phone — ⛔ kept by the Trust); a namer's always (the request showed it). ⛔ No member id, ⛔ no number.
  const knownPeopleLinks = await getKnownPeopleForExport(client, { pariwarId, memberId });
  // Story 6.36e (NE10) — read here so the presentation mode is resolved for a member whose ONLY other-member names are marks.
  const nomineeLinkRows = await getNomineeLinksForExport(client, { pariwarId, memberId });
  const presentationMode =
    knownPeopleLinks.named.length + knownPeopleLinks.namedBy.length + nomineeLinkRows.marked.length + nomineeLinkRows.namedBy.length === 0
      ? null
      : await resolvePublicNamePresentationMode(client, pariwarId);
  const readSeenName = async (otherId: string): Promise<string | null> => {
    if (presentationMode === null) return null;
    const [other] = await client.select().from(memberKycProfiles).where(eq(memberKycProfiles.memberId, otherId as MemberId)).limit(1);
    if (other === undefined || other.nameCiphertext === null) return null;
    let stored: string;
    try {
      stored = await decryptField(other.nameCiphertext, pariwarId, FIELD_CLASS_KYC, enc);
    } catch {
      return null; // ⛔ another member's unreadable name never fails THIS member's export
    }
    if (stored === ANONYMIZED_SENTINEL) return null;
    const shown = resolveMemberFacingDeceasedName(presentationMode, stored).trim();
    return shown === '' ? null : shown;
  };
  // ONE read per other member: a mark carried through re-saves, or the same person on several lists, names them once.
  const seenNames = new Map<string, Promise<string | null>>();
  const seenName = (otherId: string): Promise<string | null> => {
    let known = seenNames.get(otherId);
    if (known === undefined) {
      known = readSeenName(otherId);
      seenNames.set(otherId, known);
    }
    return known;
  };
  // ⭐ `2026-10-15-333` call 3 — the export says ⛔ more about the OTHER member than the app showed: (a) a link the other
  // member's erasure ended reads `ended` on BOTH lists (⛔ `erased` — the app's row simply vanishes, SW14 (3)); (b) the
  // members-who-named-me list carries ⛔ `foundBy` (it describes the NAMER's phone).
  // ⭐ `2026-10-15-334` call 1 narrows (a)'s "the rest as built" on the members-who-named-me list: there a REMOVAL, an
  // ERASURE and an OPEN request whose namer a claim names (hidden from the list — `-333` call 1) each simply LEAVE the list
  // in the app, so each reads the SAME — `ended`, ⛔ name, ⛔ end date; the member's own facts (asked, answered) stay. ⛔ A
  // missing name or end date marking an erasure or a reported death. The member's OWN ends and an `accepted` link (kept,
  // withdrawable) are untouched.
  const exportLink = async (l: KnownPeopleExportRow, nameSeen: boolean) => ({
    name: nameSeen ? await seenName(l.otherMemberId) : null,
    state: l.state === 'erased' ? ('ended' as const) : l.state,
    askedAt: l.askedAt.toISOString(),
    respondedAt: l.respondedAt?.toISOString() ?? null,
    endedAt: l.endedAt?.toISOString() ?? null,
  });
  // `2026-10-15-335` call 1: a request the member did ⛔ answer whose namer's claim was FILED while it was still open (before
  // `asked_at` + 30 days) was hidden then (`-333` call 1) — it reads `ended` for good, recorded `lapsed` or ⛔; one that
  // had lapsed before any claim stays `lapsed`, like any lapse. ⛔ Decided by the export's date: a day-30 switch from
  // `ended` to `lapsed` told a reported death apart from a removal across two exports (fix-diff review round 3).
  const hiddenWhileOpen = (l: KnownPeopleExportRow) =>
    (l.state === 'asked' || l.state === 'lapsed') && l.respondedAt === null && l.otherClaimFiledWhileOpen;
  const leftMyListNotByMe = (l: KnownPeopleExportRow) => l.state === 'removed' || l.state === 'erased' || hiddenWhileOpen(l);
  // ⚠ ONE row at a time: each name is a `client.select` on the export's ONE scoped client, and concurrent queries on one
  // pg client are deprecated (pg@9 removes them) — `Promise.all` here issued them together (fix-diff review round 2).
  const named = [];
  for (const l of knownPeopleLinks.named) {
    named.push({ ...(await exportLink(l, l.respondedAt !== null && l.state !== 'declined')), foundBy: l.foundBy });
  }
  const namedBy = [];
  for (const l of knownPeopleLinks.namedBy) {
    namedBy.push(
      leftMyListNotByMe(l)
        ? { name: null, state: 'ended' as const, askedAt: l.askedAt.toISOString(), respondedAt: l.respondedAt?.toISOString() ?? null, endedAt: null }
        : await exportLink(l, true),
    );
  }
  const knownPeople = { named, namedBy };

  // ── Story 6.36e (NE10, V25) — the nominee MARKS, each with ONLY the name the member already saw. ⭐ `2026-10-24-399` (extends
  // `-333` call 3(a) and `-334` call 1 to these lists): `getNomineeLinksForExport` has already read an ERASED link as `ended`,
  // marked a name SEEN only where the app showed it (the marked member's once they CONFIRMED; the declarer's only on a `live`
  // mark whose declarer no claim names), and collapsed a mark carried through re-saves to ONE `namedBy` row — so this block
  // only resolves the names it was told the member saw. ⛔ a member id, ⛔ a number. `(rank, versionNo)` joins a mark to
  // `nomineeHistory[]`. ONE row at a time (one scoped client — above).
  const marked = [];
  for (const l of nomineeLinkRows.marked) {
    marked.push({
      rank: l.rank,
      versionNo: l.versionNo,
      state: l.state,
      answer: l.answer,
      askedAt: l.askedAt.toISOString(),
      name: l.nameSeen ? await seenName(l.otherMemberId) : null,
    });
  }
  // `namedBy`: a name rides only on a row the app lists to this member (`nameSeen`); a lapsed member's rows all read `ended`, no
  // name, until they renew (`-399` call 2 — see `shapeNomineeLinkExport`).
  const markedBy = [];
  for (const l of nomineeLinkRows.namedBy) {
    markedBy.push({
      state: l.state,
      answer: l.answer,
      askedAt: l.askedAt.toISOString(),
      name: l.nameSeen ? await seenName(l.otherMemberId) : null,
    });
  }
  const nomineeLinks = { marked, namedBy: markedBy };

  const profile = {
    memberId,
    pariwarId,
    state: memberRow?.state ?? null,
    lockInDaysAtJoin: memberRow?.lockInDaysAtJoin ?? null,
    // Story 6.35 (LS12 (a)) — a choice the Trust keeps about the member is the member's data.
    preferredLanguage: memberRow?.preferredLocale ?? null,
    createdAt: memberRow?.createdAt.toISOString() ?? null,
    identity: mobile !== null ? { mobile } : null,
    kyc,
    address,
    nominees,
    nomineeHistory,
    medicalDisclosures,
    postings: postingRows.map((p) => ({
      district: p.district,
      pariwarRef: p.pariwarRef ?? null,
      isRetirement: p.isRetirement,
      recordedAt: p.createdAt.toISOString(),
      workplace: p.workplaceName !== null && p.workplaceKind !== null ? { name: p.workplaceName, kind: p.workplaceKind } : null,
      notListed: p.workplaceRequestId !== null,
      startedOn: p.startedOn ?? null,
    })),
    workplaceRequests: workplaceRequestRows.map((r) => ({
      district: r.district,
      typedName: r.typedName ?? null,
      typedPlace: r.typedPlace ?? null,
      startedOn: r.startedOn,
      state: r.state,
      recordedAt: r.createdAt.toISOString(),
      resolvedAt: r.resolvedAt?.toISOString() ?? null,
    })),
    attribution: attributionRows.map((a) => ({
      attributionSource: a.attributionSource,
      capturedAt: a.capturedAt.toISOString(),
    })),
    knownPeople,
    nomineeLinks,
  };

  // ── consent_records.json ── full history (grants + revocations); no cap — this is a data-export,
  // not a paginated API response. Query directly to bypass listConsents' 200-row ceiling (Story 1.14
  // pagination cap applies to API surfaces, not portability exports — AC2 requires "all" records).
  const consentRows = await client
    .select()
    .from(consentRecords)
    .where(and(eq(consentRecords.pariwarId, pariwarId), eq(consentRecords.subjectId, memberId)))
    .orderBy(desc(consentRecords.grantedAt));
  const consentRecordsSection = {
    records: consentRows.map((c) => ({
      consentId: c.consentId,
      consentType: c.consentType,
      grantedAt: c.grantedAt.toISOString(),
      revokedAt: c.revokedAt?.toISOString() ?? null,
      revocationReason: c.revocationReason ?? null,
      consentArtifactRef: c.consentArtifactRef ?? null,
    })),
  };

  // ── payment_receipts.json ── Vyawastha Shulk receipts (Story 3.6b; contribution payments = Epic 8) ─
  const receiptRows = await client
    .select()
    .from(vyawasthaShulkReceipts)
    .where(eq(vyawasthaShulkReceipts.memberId, memberId))
    .orderBy(asc(vyawasthaShulkReceipts.paidAt));
  const paymentReceiptsSection = {
    records: receiptRows.map((r) => ({
      receiptId: r.receiptId,
      tr: r.tr,
      utr: r.utr,
      amountInr: r.amountInr,
      paymentMethod: r.paymentMethod,
      paidAt: r.paidAt.toISOString(),
      validThrough: r.validThrough.toISOString(),
    })),
  };

  // ── event_stream.json ── the member's full events_log stream, ordered by event_version (canonical) ─
  const eventRows = await listMemberEvents(client, memberId);
  const eventStreamSection = {
    records: eventRows.map((e) => ({
      eventId: e.eventId,
      eventType: e.eventType,
      eventVersion: e.eventVersion,
      occurredAt: e.occurredAt.toISOString(),
      actorId: e.actorId ?? null,
      payload: e.payload,
    })),
  };

  // ── audit_history.json ── audit lines where this member is the actor (Story 1.10) ──────────────────
  const auditRows = await client
    .select()
    .from(auditLogEntries)
    .where(and(eq(auditLogEntries.actorId, memberId), eq(auditLogEntries.pariwarId, pariwarId)))
    .orderBy(asc(auditLogEntries.seq));
  const auditHistorySection = {
    records: auditRows.map((a) => ({
      auditId: a.auditId,
      action: a.action,
      resourceLocator: a.resourceLocator,
      responseStatus: a.responseStatus,
      recordedAt: a.recordedAt.toISOString(),
      actorRole: a.actorRole ?? null,
    })),
  };

  // ── manifest.json ──────────────────────────────────────────────────────────────────────────────────
  const manifest = {
    exportId,
    memberId,
    pariwarId,
    generatedAt: now.toISOString(),
    schemaVersion: EXPORT_SCHEMA_VERSION,
    files: [
      EXPORT_FILENAMES.PROFILE,
      EXPORT_FILENAMES.CONSENT,
      EXPORT_FILENAMES.PAYMENT,
      EXPORT_FILENAMES.EVENT_STREAM,
      EXPORT_FILENAMES.AUDIT,
      EXPORT_FILENAMES.CONTRIBUTION,
      EXPORT_FILENAMES.CLAIM,
    ],
  };

  return {
    [EXPORT_FILENAMES.PROFILE]: profile,
    [EXPORT_FILENAMES.CONSENT]: consentRecordsSection,
    [EXPORT_FILENAMES.PAYMENT]: paymentReceiptsSection,
    [EXPORT_FILENAMES.EVENT_STREAM]: eventStreamSection,
    [EXPORT_FILENAMES.AUDIT]: auditHistorySection,
    // Schema-stable EMPTY placeholders — real reads wire in when Epics 8/6 land (Dev Notes §Content scope).
    [EXPORT_FILENAMES.CONTRIBUTION]: emptySection('Epic 8'),
    [EXPORT_FILENAMES.CLAIM]: emptySection('Epic 6'),
    [EXPORT_FILENAMES.MANIFEST]: manifest,
  };
}

/**
 * The member's full raw `events_log` history, ordered by `event_version` (the canonical record — the
 * deterministic order, NOT `occurred_at` which can tie; mirrors getMemberStateAt's replay-order
 * discipline). Reads the table directly (domain owns it; cannot import @twt/events — the cycle).
 * Tenant scope is enforced by RLS (the caller set `app.pariwar_id`); the query filters by `stream_id`
 * (= member_id), which is globally unique.
 */
export async function listMemberEvents(
  client: Db,
  memberId: MemberId,
): Promise<(typeof eventsLog.$inferSelect)[]> {
  return client
    .select()
    .from(eventsLog)
    .where(eq(eventsLog.streamId, memberId))
    .orderBy(asc(eventsLog.eventVersion));
}
