// Drizzle row → transport DTO mapper — Story 2.6 (Task 6). Date → ISO-8601 at the
// wire boundary; domain TS brands + Zod contract brands are name-aligned (not
// symbol-identical), so a cast at the boundary is the established convention (the
// `toClauseVersionResponse` precedent). The flat `pinnedToClauseVersionIds` array
// is folded in from the junction table (`listPinnedClauses`) — the link table is
// invisible on the wire.

import type { TcVersionResponse } from '@twt/contracts';
import type { ids, schema } from '@twt/domain';

type TcVersionRow = schema.TcVersionRow;
type ClauseVersionId = ReturnType<typeof ids.clauseVersionId>;

/** Map a terms_and_conditions_versions row (+ its pinned clause versions) → the wire DTO. */
export function toTcVersionResponse(
  row: TcVersionRow,
  pinnedClauseVersionIds: readonly ClauseVersionId[],
): TcVersionResponse {
  return {
    tcVersionId: row.tcVersionId as unknown as TcVersionResponse['tcVersionId'],
    pariwarId: row.pariwarId as unknown as TcVersionResponse['pariwarId'],
    version: row.version,
    bodyMarkdown: row.bodyMarkdown,
    bodyHtmlRendered: row.bodyHtmlRendered,
    effectiveFrom: row.effectiveFrom.toISOString(),
    effectiveUntil: row.effectiveUntil ? row.effectiveUntil.toISOString() : null,
    legalReviewStatus: row.legalReviewStatus,
    legalReviewerActorId: row.legalReviewerActorId,
    authoredByActor: row.authoredByActor,
    authoredAt: row.authoredAt.toISOString(),
    auditId: row.auditId,
    pinnedToClauseVersionIds:
      pinnedClauseVersionIds as unknown as TcVersionResponse['pinnedToClauseVersionIds'],
  };
}
