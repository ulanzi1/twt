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

import { and, asc, desc, eq } from 'drizzle-orm';

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
import { memberPostings } from '../schema/member_postings.js';
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

  const medicalRows = await client
    .select()
    .from(memberMedicalDisclosures)
    .where(eq(memberMedicalDisclosures.memberId, memberId))
    .orderBy(asc(memberMedicalDisclosures.createdAt));

  const postingRows = await client
    .select()
    .from(memberPostings)
    .where(eq(memberPostings.memberId, memberId))
    .orderBy(asc(memberPostings.createdAt));

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

  const profile = {
    memberId,
    pariwarId,
    state: memberRow?.state ?? null,
    lockInDaysAtJoin: memberRow?.lockInDaysAtJoin ?? null,
    createdAt: memberRow?.createdAt.toISOString() ?? null,
    identity: mobile !== null ? { mobile } : null,
    kyc,
    address,
    nominees,
    medicalDisclosures,
    postings: postingRows.map((p) => ({
      district: p.district,
      pariwarRef: p.pariwarRef ?? null,
      isRetirement: p.isRetirement,
      recordedAt: p.createdAt.toISOString(),
    })),
    attribution: attributionRows.map((a) => ({
      attributionSource: a.attributionSource,
      capturedAt: a.capturedAt.toISOString(),
    })),
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
