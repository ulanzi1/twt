// Drizzle row → transport DTO mappers — Story 2.4. Date → ISO-8601 at the wire
// boundary; the domain TS brands + the Zod contract brands are name-aligned (not
// symbol-identical), so a cast at the boundary is the established convention (the
// `toPassportResponse` precedent — the response schema re-parses + re-brands at
// serialization).

import type {
  ClauseDraftResponse,
  ClauseVersionResponse,
  NiyamavaliAmendmentResponse,
} from '@twt/contracts';
import type { schema } from '@twt/domain';

type ClauseVersionRow = schema.ClauseVersionRow;
type ClauseDraftRow = schema.ClauseDraftRow;
type NiyamavaliAmendmentRow = schema.NiyamavaliAmendmentRow;

/** Map a clause_versions row → the wire DTO. */
export function toClauseVersionResponse(row: ClauseVersionRow): ClauseVersionResponse {
  return {
    clauseVersionId: row.clauseVersionId as unknown as ClauseVersionResponse['clauseVersionId'],
    clauseId: row.clauseId as unknown as ClauseVersionResponse['clauseId'],
    pariwarId: row.pariwarId as unknown as ClauseVersionResponse['pariwarId'],
    version: row.version,
    effectiveDate: row.effectiveDate.toISOString(),
    payload: row.payload,
    benefitMechanism: row.benefitMechanism,
    predecessorClauseIds:
      row.predecessorClauseIds as unknown as ClauseVersionResponse['predecessorClauseIds'],
    supersededByVersion:
      row.supersededByVersion as unknown as ClauseVersionResponse['supersededByVersion'],
    deprecatedAt: row.deprecatedAt ? row.deprecatedAt.toISOString() : null,
    authoredByActor: row.authoredByActor,
    authoredAt: row.authoredAt.toISOString(),
    auditId: row.auditId,
  };
}

/** Map a clause_drafts row → the wire DTO. */
export function toClauseDraftResponse(row: ClauseDraftRow): ClauseDraftResponse {
  return {
    draftId: row.draftId as unknown as ClauseDraftResponse['draftId'],
    pariwarId: row.pariwarId as unknown as ClauseDraftResponse['pariwarId'],
    clauseId: row.clauseId as unknown as ClauseDraftResponse['clauseId'],
    operation: row.operation,
    payload: row.payload,
    effectiveDate: row.effectiveDate.toISOString(),
    benefitMechanism: row.benefitMechanism,
    affectedMemberScope:
      row.affectedMemberScope as unknown as ClauseDraftResponse['affectedMemberScope'],
    status: row.status,
    authoredByActor: row.authoredByActor,
    toneReviewedBy: row.toneReviewedBy,
    toneReviewedAt: row.toneReviewedAt ? row.toneReviewedAt.toISOString() : null,
    toneReviewContentHash: row.toneReviewContentHash,
    publishedClauseVersionId:
      row.publishedClauseVersionId as unknown as ClauseDraftResponse['publishedClauseVersionId'],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    auditId: row.auditId,
  };
}

/** Map a niyamavali_amendments row → the wire DTO. */
export function toAmendmentResponse(row: NiyamavaliAmendmentRow): NiyamavaliAmendmentResponse {
  return {
    amendmentId: row.amendmentId,
    pariwarId: row.pariwarId as unknown as NiyamavaliAmendmentResponse['pariwarId'],
    fromClauseVersionId:
      row.fromClauseVersionId as unknown as NiyamavaliAmendmentResponse['fromClauseVersionId'],
    toClauseVersionId:
      row.toClauseVersionId as unknown as NiyamavaliAmendmentResponse['toClauseVersionId'],
    diffDocument: row.diffDocument,
    affectedMemberScope:
      row.affectedMemberScope as unknown as NiyamavaliAmendmentResponse['affectedMemberScope'],
    createdAt: row.createdAt.toISOString(),
    auditId: row.auditId,
  };
}
