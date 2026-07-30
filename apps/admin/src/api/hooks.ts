// TanStack Query hooks over the typed client (Story 1.11b, DD-7).
//
// Server state lives in Query (§4.3). The integrity reads are CACHE-DISABLED
// (§4.5 "verifier-console reads cache-disabled" — a strong-consistency surface):
// staleTime/gcTime 0 + refetchOnMount 'always', and NO IndexedDB persister. Run-now
// + acknowledge are pessimistic/server-confirmed mutations (§4.2) that invalidate
// the history so the banner + table re-derive from fresh server state.

import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AddPariwarRequest,
  ConvergenceMergeRequest,
  ConvergenceOverrideRequest,
  CreateTicketRequest,
  HelplineClaimIntakeRequest,
  HelplineOperatorEventRequest,
  MemberSearchRequest,
} from '@twt/contracts';

import * as api from './client.js';

export const sessionKey = ['session'] as const;
export const integrityChecksKey = ['integrity-checks'] as const;
export const provisionedPariwarsKey = ['provisioned-pariwars'] as const;

/** A QueryClient with the cache-disabled defaults this surface requires (§4.5). */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: 0, refetchOnMount: 'always' },
      mutations: { retry: false },
    },
  });
}

/** The current session + global-scope grants (DD-6). Drives the nav + route gate. */
export function useSession() {
  return useQuery({ queryKey: sessionKey, queryFn: api.getSession });
}

/** Recent integrity-check history (default 30, newest-first) + acknowledgements. */
export function useIntegrityChecks() {
  return useQuery({ queryKey: integrityChecksKey, queryFn: () => api.listIntegrityChecks(30) });
}

/** Run an on-demand verification, then refresh the history (AC-3). */
export function useRunVerification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.runVerification,
    onSuccess: () => qc.invalidateQueries({ queryKey: integrityChecksKey }),
  });
}

/** Acknowledge a failed check + ticket ref, then refresh so the banner clears (AC-5). */
export function useAcknowledge() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { checkId: string; ticketRef: string }) =>
      api.acknowledgeCheck(vars.checkId, vars.ticketRef),
    onSuccess: () => qc.invalidateQueries({ queryKey: integrityChecksKey }),
  });
}

/** True iff the session carries the `audit.verify` grant at global scope (AC-1). */
export function hasAuditVerify(grants: readonly string[] | undefined): boolean {
  return grants?.includes('audit.verify') ?? false;
}

// ── Multi-Pariwar provisioning surface (Story 1.15) ───────────────────────────

/** The provisioning-status view: provisioned Pariwars + latest deploy status. */
export function useProvisionedPariwars() {
  return useQuery({
    queryKey: provisionedPariwarsKey,
    queryFn: () => api.listProvisionedPariwars(100),
  });
}

/** Provision a new Pariwar, then refresh the status list. */
export function useAddPariwar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: AddPariwarRequest) => api.addPariwar(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: provisionedPariwarsKey }),
  });
}

/** Trigger a Dokploy build for a Pariwar, then refresh the status list. */
export function useTriggerDeploy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pariwarId: string) => api.triggerDeploy(pariwarId),
    onSuccess: () => qc.invalidateQueries({ queryKey: provisionedPariwarsKey }),
  });
}

/** True iff the session carries the `pariwar.provision` grant at global scope (AC-4). */
export function hasPariwarProvision(grants: readonly string[] | undefined): boolean {
  return grants?.includes('pariwar.provision') ?? false;
}

// ── Niyamavali amendment-workflow surface (Story 2.4) ─────────────────────────
// Authoring is NOT a strong-consistency surface like audit-integrity, so these use
// the default cache (the createQueryClient defaults already set staleTime 0 here;
// the lists invalidate on every mutation so the UI re-derives from server state).

export const niyamavaliClausesKey = (pariwarId: string) =>
  ['niyamavali-clauses', pariwarId] as const;
export const niyamavaliDraftsKey = (pariwarId: string) => ['niyamavali-drafts', pariwarId] as const;
export const niyamavaliDiffKey = (pariwarId: string, draftId: string) =>
  ['niyamavali-diff', pariwarId, draftId] as const;

/** The clause registry (latest version per clause). */
export function useNiyamavaliClauses(pariwarId: string) {
  return useQuery({
    queryKey: niyamavaliClausesKey(pariwarId),
    queryFn: () => api.listClauses(pariwarId),
  });
}

/** Clause drafts (optionally a single lifecycle state). */
export function useNiyamavaliDrafts(pariwarId: string, status?: string) {
  return useQuery({
    queryKey: [...niyamavaliDraftsKey(pariwarId), status ?? 'all'],
    queryFn: () => api.listDrafts(pariwarId, status),
  });
}

/** The structured + rendered diff preview for a draft (AC1c). */
export function useDraftDiff(pariwarId: string, draftId: string | null) {
  return useQuery({
    queryKey: niyamavaliDiffKey(pariwarId, draftId ?? ''),
    queryFn: () => api.getDraftDiff(pariwarId, draftId as string),
    enabled: Boolean(draftId),
  });
}

/** Invalidate the clause + draft lists after a workflow mutation. */
function useInvalidateNiyamavali(pariwarId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: niyamavaliClausesKey(pariwarId) });
    void qc.invalidateQueries({ queryKey: niyamavaliDraftsKey(pariwarId) });
  };
}

/** Create a draft (create | amend), then refresh the lists. */
export function useCreateDraft(pariwarId: string) {
  const invalidate = useInvalidateNiyamavali(pariwarId);
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createDraft>[1]) => api.createDraft(pariwarId, body),
    onSuccess: invalidate,
  });
}

/** Edit a draft, then refresh the lists and diff preview. */
export function useUpdateDraft(pariwarId: string) {
  const invalidate = useInvalidateNiyamavali(pariwarId);
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { draftId: string; patch: Parameters<typeof api.updateDraft>[2] }) =>
      api.updateDraft(pariwarId, vars.draftId, vars.patch),
    onSuccess: (_draft, vars) => {
      invalidate();
      void qc.invalidateQueries({ queryKey: niyamavaliDiffKey(pariwarId, vars.draftId) });
    },
  });
}

/** Submit a draft for review, then refresh. */
export function useSubmitForReview(pariwarId: string) {
  const invalidate = useInvalidateNiyamavali(pariwarId);
  return useMutation({
    mutationFn: (draftId: string) => api.submitForReview(pariwarId, draftId),
    onSuccess: invalidate,
  });
}

/** Record a non-author sign-off, then refresh. */
export function useSignoffDraft(pariwarId: string) {
  const invalidate = useInvalidateNiyamavali(pariwarId);
  return useMutation({
    mutationFn: (draftId: string) => api.signoffDraft(pariwarId, draftId),
    onSuccess: invalidate,
  });
}

/** Publish a draft (tone-review-gated), then refresh. */
export function usePublishDraft(pariwarId: string) {
  const invalidate = useInvalidateNiyamavali(pariwarId);
  return useMutation({
    mutationFn: (draftId: string) => api.publishDraft(pariwarId, draftId),
    onSuccess: invalidate,
  });
}

// ── Member-status surface (Story 4.7) ─────────────────────────────────────────
// The member search is a POST (server blind-indexes a raw mobile), modelled as a
// mutation whose result the page holds. The per-member validity read is a query,
// enabled only once a member is selected. This is a support/dispute read surface,
// NOT the member self-service cached path — the createQueryClient staleTime:0
// defaults (fresh-on-mount) are the right freshness class here.

export const memberValidityKey = (pariwarId: string, memberId: string) =>
  ['member-validity', pariwarId, memberId] as const;

/** The AR-65 compound-read-model member search (exact-match). */
export function useMemberSearch(pariwarId: string) {
  return useMutation({
    mutationFn: (body: MemberSearchRequest) => api.searchMembers(pariwarId, body),
  });
}

/** A selected member's FR-12A validity payload (enabled only once a member is chosen). */
export function useMemberValidity(pariwarId: string, memberId: string | null) {
  return useQuery({
    queryKey: memberValidityKey(pariwarId, memberId ?? ''),
    queryFn: () => api.getMemberValidity(pariwarId, memberId as string),
    enabled: Boolean(memberId),
  });
}

// ── Helpline claim-filing surface (Story 6.3) ─────────────────────────────────
// The operator intake is a POST (freeze-firing), modelled as a mutation whose result the page
// holds. The step-up request/verify are mutations too. This is the support/dispute freshness
// class (the createQueryClient staleTime:0 defaults are right). `claim.file` is a PER-PARIWAR
// grant (absent from the session's nationalGrants, like member.view_validity), so — like the
// member-search surface — the client gate is only "is there a live session"; the REAL boundary
// is the server permission hook. `hasClaimFile` is an advisory helper for surfaces that DO hold
// the per-Pariwar grant set (e.g. scope-resolved views); it is NOT used to gate a national nav.

/** The helpline claim intake mutation. On `created:false` the page surfaces "claim already
 * exists" rather than an error (a cross-channel convergence hit, not a failure). */
export function useHelplineClaimIntake(pariwarId: string) {
  return useMutation({
    mutationFn: (body: HelplineClaimIntakeRequest) => api.initiateHelplineClaim(pariwarId, body),
  });
}

/** Request a step-up OTP for a named action context (the console drives 'claim_file'). */
export function useRequestStepUp() {
  return useMutation({ mutationFn: (actionContext: string) => api.requestStepUp(actionContext) });
}

/** Verify a step-up OTP → the session gains the fresh elevated context the intake route needs. */
export function useVerifyStepUp() {
  return useMutation({ mutationFn: (otp: string) => api.verifyStepUp(otp) });
}

/** Record a non-freezing operator-action audit line (read-back confirm / escalation — Review
 * Finding, AC4/AC5). Fire-and-forget from the page: the audit trail is best-effort and must
 * never block the operator's workflow. */
export function useHelplineOperatorEvent(pariwarId: string) {
  return useMutation({
    mutationFn: (body: HelplineOperatorEventRequest) => api.recordHelplineOperatorEvent(pariwarId, body),
  });
}

/** True iff the (per-Pariwar) grant set carries `claim.file` — advisory only (AC1/AC6). */
export function hasClaimFile(grants: readonly string[] | undefined): boolean {
  return grants?.includes('claim.file') ?? false;
}

// ── ICP convergence-resolution surface (Story 6.4) ────────────────────────────
// The <ConvergenceDecisionStrip> feed + the merge/override mutations. The pending list is a
// support-freshness query (staleTime:0 default); both mutations invalidate it so a resolved
// attempt drops off the strip. `claim.file` is a per-Pariwar grant — the client only gates on a
// live session; the server permission hook is the real boundary.

const convergencePendingKey = (pariwarId: string): readonly unknown[] => [
  'convergence-pending',
  pariwarId,
];

/** GET the pending cross-channel attempts + their candidate claims (the strip feed). */
export function useConvergencePending(pariwarId: string) {
  return useQuery({
    queryKey: convergencePendingKey(pariwarId),
    queryFn: () => api.listPendingConvergence(pariwarId),
  });
}

/** Confirm convergence (merge). Invalidates the pending list on success (the attempt is resolved). */
export function useConfirmConvergenceMerge(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConvergenceMergeRequest) => api.confirmConvergenceMerge(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: convergencePendingKey(pariwarId) }),
  });
}

/** Override (treat as separate → mint a distinct claim). Invalidates the pending list on success. */
export function useOverrideConvergence(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ConvergenceOverrideRequest) => api.overrideConvergence(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: convergencePendingKey(pariwarId) }),
  });
}

// ── Channel-config surface (Story 5.3) ────────────────────────────────────────
// The trustee WhatsApp Business config singleton + per-category template mapping.
// Not a strong-consistency surface — the default cache; each mutation invalidates
// its query so the form re-derives from fresh server state.

export const waConfigKey = (pariwarId: string) => ['wa-config', pariwarId] as const;
export const waTemplatesKey = (pariwarId: string) => ['wa-templates', pariwarId] as const;

/** The WA config singleton (zero-config defaults when unprovisioned). */
export function useWaConfig(pariwarId: string) {
  return useQuery({ queryKey: waConfigKey(pariwarId), queryFn: () => api.getWaConfig(pariwarId) });
}

/** Upsert the WA config, then refresh the config query. */
export function usePutWaConfig(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.putWaConfig>[1]) => api.putWaConfig(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: waConfigKey(pariwarId) }),
  });
}

/** The per-category UTILITY template mapping. */
export function useWaTemplates(pariwarId: string) {
  return useQuery({ queryKey: waTemplatesKey(pariwarId), queryFn: () => api.getWaTemplates(pariwarId) });
}

/** Upsert one category's template mapping, then refresh the template list. */
export function usePutWaTemplate(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.putWaTemplate>[1]) => api.putWaTemplate(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: waTemplatesKey(pariwarId) }),
  });
}

// ── Degraded-mode surface (Story 5.8) — the trustee declare/revoke/read-active AR-20 bridge surface. ──
// Not a strong-consistency surface — the default cache; each mutation invalidates the active query so the
// banner re-derives from fresh server state.

export const degradedModeActiveKey = (pariwarId: string) => ['degraded-mode-active', pariwarId] as const;

/** The currently-active degraded-mode declaration (or null). */
export function useActiveDegradedMode(pariwarId: string) {
  return useQuery({
    queryKey: degradedModeActiveKey(pariwarId),
    queryFn: () => api.getActiveDegradedMode(pariwarId),
  });
}

/** Declare degraded mode, then refresh the active query. */
export function useDeclareDegradedMode(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.declareDegradedMode>[1]) =>
      api.declareDegradedMode(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: degradedModeActiveKey(pariwarId) }),
  });
}

/** Revoke a declaration, then refresh the active query (banner clears). */
export function useRevokeDegradedMode(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeDegradedMode(pariwarId, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: degradedModeActiveKey(pariwarId) }),
  });
}

// ── Verifier-console surface (Story 6.10) — the READ-ONLY bounded compound signals view. ──
// A ₹50L-stakes strong-consistency read: cache-disabled by the createQueryClient defaults (staleTime/
// gcTime 0, refetchOnMount 'always', no IndexedDB persister — §4.5, D7). The query key carries the
// effective `pariwarId` + `claimCaseId` (AC3/D8) so a scope switch (or a different claim) never serves
// another scope's packet from client cache — cache-key isolation matches the server's cache-disabled
// behavior. `claim.verify` is a per-Pariwar district grant, so the client only gates on a live session.

export const verifierConsoleKey = (pariwarId: string, claimCaseId: string) =>
  ['verifier-console', pariwarId, claimCaseId] as const;

/** The bounded compound verifier-console packet for one claim (enabled once both ids are known). */
export function useVerifierConsole(pariwarId: string, claimCaseId: string | null) {
  return useQuery({
    queryKey: verifierConsoleKey(pariwarId, claimCaseId ?? ''),
    queryFn: () => api.getVerifierConsole(pariwarId, claimCaseId as string),
    enabled: Boolean(claimCaseId),
  });
}

// ── Verifier adjudication WRITE surface (Story 6.11) — the FIRST verifier WRITE. ──
// On success both mutations invalidate the console packet key so (e)/(f) + the audit trail refetch with
// the just-written decision (fresh present/empty; the new AuditTrailEntry).

/** POST an approve / deny / escalate decision; refetches the console packet on success. */
export function usePostVerifierDecision(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.postVerifierDecision>[2]) =>
      api.postVerifierDecision(pariwarId, claimCaseId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: verifierConsoleKey(pariwarId, claimCaseId) }),
  });
}

/** POST a same-outcome revision (step-up-gated server-side); refetches the console packet on success. */
export function useReviseVerifierDecision(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.reviseVerifierDecision>[2]) =>
      api.reviseVerifierDecision(pariwarId, claimCaseId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: verifierConsoleKey(pariwarId, claimCaseId) }),
  });
}

/** POST a record/revise concealment-linkage assessment (Story 6.15); refetches the console packet on
 *  success so the concealment tri-state + the flagged banner re-render with the new signal. */
export function usePostConcealmentAssessment(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.postConcealmentAssessment>[2]) =>
      api.postConcealmentAssessment(pariwarId, claimCaseId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: verifierConsoleKey(pariwarId, claimCaseId) }),
  });
}

// ── State-Trustee cycle-freeze surface (Story 6.13) — the FIRST state_trustee-facing surface. ──
// The two-bucket pending list + per-claim decision + the step-up-gated bulk commit. On any write the
// pending list is invalidated so the buckets re-read the just-changed state.

export const cycleFreezePendingKey = (pariwarId: string) => ['cycle-freeze-pending', pariwarId] as const;

/** The two-bucket pending list (ready-to-freeze + escalated) for a Pariwar. */
export function useCycleFreezePending(pariwarId: string) {
  return useQuery({
    queryKey: cycleFreezePendingKey(pariwarId),
    queryFn: () => api.getCycleFreezePending(pariwarId),
  });
}

/** POST a per-claim decision (approve/deny/route/resolve); refetches the pending list on success. */
export function usePostCycleFreezeDecision(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.postCycleFreezeDecision>[1]) =>
      api.postCycleFreezeDecision(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: cycleFreezePendingKey(pariwarId) }),
  });
}

/** POST the step-up-gated bulk commit; refetches the pending list on success. */
export function useCommitCycleFreeze(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.commitCycleFreeze>[1]) => api.commitCycleFreeze(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: cycleFreezePendingKey(pariwarId) }),
  });
}

// ── R9 special-case voting surface (Story 6.14) — the R9 panel that consumes 6.13's routed_to_r9 claims. ──
// The queue + per-claim panel + open/vote/finalize/cancel + votes-by-trustee. On any write the queue + the
// touched panel are invalidated so they re-read the just-changed state.

export const r9QueueKey = (pariwarId: string) => ['r9-queue', pariwarId] as const;
export const r9PanelKey = (pariwarId: string, claimCaseId: string) => ['r9-panel', pariwarId, claimCaseId] as const;
export const r9VotesByTrusteeKey = (pariwarId: string, actorId: string, sinceDays?: number) =>
  ['r9-votes-by-trustee', pariwarId, actorId, sinceDays ?? 180] as const;

/** The R9 voting queue for a Pariwar. */
export function useR9Queue(pariwarId: string) {
  return useQuery({ queryKey: r9QueueKey(pariwarId), queryFn: () => api.getR9Queue(pariwarId) });
}

/** The per-claim panel model (enabled only when a claim is selected). */
export function useR9Panel(pariwarId: string, claimCaseId: string | null) {
  return useQuery({
    queryKey: r9PanelKey(pariwarId, claimCaseId ?? ''),
    queryFn: () => api.getR9Panel(pariwarId, claimCaseId as string),
    enabled: claimCaseId !== null,
  });
}

/** Refetches the queue + the touched panel + EVERY votes-by-trustee transcript for this Pariwar (a partial
 *  key match — `sinceDays`/`actorId` vary per lookup, so an exact key would miss the transcript a vote/
 *  finalize/cancel just affected). Called on BOTH success AND error (a 409 conflict means the server-side
 *  state moved even though this specific mutation lost — the panel/tally/vote list must refetch the
 *  authoritative session rather than leave stale pre-mutation state on screen next to the error). */
function invalidateR9(qc: ReturnType<typeof useQueryClient>, pariwarId: string, claimCaseId: string): void {
  void qc.invalidateQueries({ queryKey: r9QueueKey(pariwarId) });
  void qc.invalidateQueries({ queryKey: r9PanelKey(pariwarId, claimCaseId) });
  void qc.invalidateQueries({ queryKey: ['r9-votes-by-trustee', pariwarId] });
}

/** POST open a session; refetches the queue + panel on success OR a conflict (e.g. session-already-exists). */
export function useOpenR9Session(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.openR9Session>[2]) => api.openR9Session(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateR9(qc, pariwarId, claimCaseId),
    onError: () => invalidateR9(qc, pariwarId, claimCaseId),
  });
}

/** POST cast/revise a vote; refetches the panel on success OR a conflict (e.g. a concurrent revise/finalize). */
export function useCastR9Vote(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.castR9Vote>[2]) => api.castR9Vote(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateR9(qc, pariwarId, claimCaseId),
    onError: () => invalidateR9(qc, pariwarId, claimCaseId),
  });
}

/** POST finalize the outcome (step-up-gated); refetches the queue + panel on success OR a conflict (e.g.
 *  quorum no longer met, or a racing finalize already won). */
export function useFinalizeR9(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.finalizeR9(pariwarId, claimCaseId),
    onSuccess: () => invalidateR9(qc, pariwarId, claimCaseId),
    onError: () => invalidateR9(qc, pariwarId, claimCaseId),
  });
}

/** POST cancel/correct a session; refetches the queue + panel on success OR a conflict (e.g. already
 *  finalized/superseded). */
export function useCancelR9Session(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.cancelR9Session>[2]) => api.cancelR9Session(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateR9(qc, pariwarId, claimCaseId),
    onError: () => invalidateR9(qc, pariwarId, claimCaseId),
  });
}

/** The votes-by-trustee transcript (enabled only when an actor id is entered). */
export function useR9VotesByTrustee(pariwarId: string, actorId: string | null, sinceDays?: number) {
  return useQuery({
    queryKey: r9VotesByTrusteeKey(pariwarId, actorId ?? '', sinceDays),
    queryFn: () => api.getR9VotesByTrustee(pariwarId, actorId as string, sinceDays),
    enabled: actorId !== null && actorId !== '',
  });
}

// ── Story 6.16 — the internal 3-stage appeal surface hooks. ──

export const appealCaseKey = (pariwarId: string, claimCaseId: string) => ['appeal-case', pariwarId, claimCaseId] as const;
export const appealDecisionsByReviewerKey = (pariwarId: string, reviewerActorId: string) =>
  ['appeal-decisions-by-reviewer', pariwarId, reviewerActorId] as const;

/** The per-claim admin appeal case model (enabled only when a claim is selected). */
export function useAppealCase(pariwarId: string, claimCaseId: string | null) {
  return useQuery({
    queryKey: appealCaseKey(pariwarId, claimCaseId ?? ''),
    queryFn: () => api.getAppealCase(pariwarId, claimCaseId as string),
    enabled: claimCaseId !== null && claimCaseId !== '',
  });
}

/** Refetch the touched case model on BOTH success AND error (a 409 means server state moved). */
function invalidateAppeal(qc: ReturnType<typeof useQueryClient>, pariwarId: string, claimCaseId: string): void {
  void qc.invalidateQueries({ queryKey: appealCaseKey(pariwarId, claimCaseId) });
}

export function useReviewAppealStage1(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.reviewAppealStage1>[2]) => api.reviewAppealStage1(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateAppeal(qc, pariwarId, claimCaseId),
    onError: () => invalidateAppeal(qc, pariwarId, claimCaseId),
  });
}

export function useOpenAppealPanel(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.openAppealPanel>[2]) => api.openAppealPanel(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateAppeal(qc, pariwarId, claimCaseId),
    onError: () => invalidateAppeal(qc, pariwarId, claimCaseId),
  });
}

export function useCastAppealVote(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.castAppealVote>[2]) => api.castAppealVote(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateAppeal(qc, pariwarId, claimCaseId),
    onError: () => invalidateAppeal(qc, pariwarId, claimCaseId),
  });
}

export function useFinalizeAppealPanel(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.finalizeAppealPanel>[2]) => api.finalizeAppealPanel(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateAppeal(qc, pariwarId, claimCaseId),
    onError: () => invalidateAppeal(qc, pariwarId, claimCaseId),
  });
}

export function useCancelAppealPanel(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.cancelAppealPanel>[2]) => api.cancelAppealPanel(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateAppeal(qc, pariwarId, claimCaseId),
    onError: () => invalidateAppeal(qc, pariwarId, claimCaseId),
  });
}

export function useDecideAppealStage3(pariwarId: string, claimCaseId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.decideAppealStage3>[2]) => api.decideAppealStage3(pariwarId, claimCaseId, body),
    onSuccess: () => invalidateAppeal(qc, pariwarId, claimCaseId),
    onError: () => invalidateAppeal(qc, pariwarId, claimCaseId),
  });
}

/** The decisions-by-reviewer audit transcript (enabled only when a reviewer id is entered). */
export function useAppealDecisionsByReviewer(
  pariwarId: string,
  reviewerActorId: string | null,
  opts?: { stage?: '1' | '2' | '3'; sinceDays?: number },
) {
  return useQuery({
    queryKey: [...appealDecisionsByReviewerKey(pariwarId, reviewerActorId ?? ''), opts?.stage ?? 'all', opts?.sinceDays ?? 180],
    queryFn: () => api.getAppealDecisionsByReviewer(pariwarId, reviewerActorId as string, opts),
    enabled: reviewerActorId !== null && reviewerActorId !== '',
  });
}

// ── Telegram config surface (Story 5.5) — the per-Pariwar Telegram Bot config singleton. ──

export const telegramConfigKey = (pariwarId: string) => ['telegram-config', pariwarId] as const;

/** The Telegram config singleton (zero-config defaults when unprovisioned). */
export function useTelegramConfig(pariwarId: string) {
  return useQuery({ queryKey: telegramConfigKey(pariwarId), queryFn: () => api.getTelegramConfig(pariwarId) });
}

/** Upsert the Telegram config, then refresh the config query. */
export function usePutTelegramConfig(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.putTelegramConfig>[1]) => api.putTelegramConfig(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: telegramConfigKey(pariwarId) }),
  });
}

// ── Story 7.5 — the fixed-amount schedule surface (FR-15) ──
// The standard (12-month-notice) + emergency (step-up-gated) fixed-amount write paths + the schedule/
// effective-amount read view. Both keys are per-Pariwar grants (server permission hook is the real gate).

export const fixedAmountViewKey = (pariwarId: string) => ['pool-fixed-amount', pariwarId] as const;

/** The current fixed-amount schedule + the amount effective now (+ embedded emergency records). */
export function useFixedAmountView(pariwarId: string) {
  return useQuery({
    queryKey: fixedAmountViewKey(pariwarId),
    queryFn: () => api.getFixedAmountView(pariwarId),
  });
}

/** POST a STANDARD (12-month-notice) change; refetches the schedule on success. */
export function useScheduleFixedAmountChange(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.scheduleFixedAmountChange>[1]) =>
      api.scheduleFixedAmountChange(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAmountViewKey(pariwarId) }),
  });
}

/** POST an EMERGENCY override (step-up-gated); refetches the schedule on success. */
export function useApplyFixedAmountEmergency(pariwarId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.applyFixedAmountEmergency>[1]) =>
      api.applyFixedAmountEmergency(pariwarId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: fixedAmountViewKey(pariwarId) }),
  });
}

// ── Reconciliation review-queue hooks (Story 9.8) — cache-disabled reads + step-up-gated actions ──

export const reconciliationQueueKey = (pariwarId: string) => ['reconciliation-queue', pariwarId] as const;
export const reconciliationCaseKey = (pariwarId: string, caseKey: string) =>
  ['reconciliation-case', pariwarId, caseKey] as const;

/** The deadline-ordered open-case queue (cache-disabled — a strong-consistency adjudication surface). */
export function useReconciliationQueue(pariwarId: string, limit?: number) {
  return useQuery({
    queryKey: reconciliationQueueKey(pariwarId),
    queryFn: () => api.getReconciliationQueue(pariwarId, limit),
    enabled: pariwarId.length > 0,
  });
}

/** One case's full review context (cache-disabled). */
export function useReconciliationCase(pariwarId: string, caseKey: string | null) {
  return useQuery({
    queryKey: reconciliationCaseKey(pariwarId, caseKey ?? ''),
    queryFn: () => {
      if (caseKey === null) throw new Error('useReconciliationCase queryFn invoked with a null caseKey');
      return api.getReconciliationCase(pariwarId, caseKey);
    },
    enabled: pariwarId.length > 0 && caseKey !== null && caseKey.length > 0,
  });
}

/** The four step-up-gated actions — each invalidates the queue + the case on success. */
export function useReconciliationActions(pariwarId: string) {
  const qc = useQueryClient();
  const invalidate = (caseKey: string) => {
    void qc.invalidateQueries({ queryKey: reconciliationQueueKey(pariwarId) });
    void qc.invalidateQueries({ queryKey: reconciliationCaseKey(pariwarId, caseKey) });
  };
  return {
    confirm: useMutation({
      mutationFn: (v: { caseKey: string; body: import('@twt/contracts').ReconciliationConfirmRequest }) =>
        api.reconciliationConfirm(pariwarId, v.caseKey, v.body),
      onSuccess: (_r, v) => invalidate(v.caseKey),
    }),
    reject: useMutation({
      mutationFn: (v: { caseKey: string; body: import('@twt/contracts').ReconciliationRejectRequest }) =>
        api.reconciliationReject(pariwarId, v.caseKey, v.body),
      onSuccess: (_r, v) => invalidate(v.caseKey),
    }),
    recover: useMutation({
      mutationFn: (v: { caseKey: string; body: import('@twt/contracts').ReconciliationRecoverRequest }) =>
        api.reconciliationRecover(pariwarId, v.caseKey, v.body),
      onSuccess: (_r, v) => invalidate(v.caseKey),
    }),
    reverse: useMutation({
      mutationFn: (v: { caseKey: string; body: import('@twt/contracts').ReconciliationReverseRequest }) =>
        api.reconciliationReverse(pariwarId, v.caseKey, v.body),
      onSuccess: (_r, v) => invalidate(v.caseKey),
    }),
  };
}

// ── Helpdesk operator call-to-ticket surface (Story 10.3) ─────────────────────
// The operator files a helpdesk ticket on a caller's behalf via the EXISTING 10.1 create route (now
// permission-gated). The create is a POST modelled as a mutation whose result (ticket_id + routing
// target + SLA) the page holds for the "filed" confirmation (the useHelplineClaimIntake precedent).
// `helpdesk.create` is a per-Pariwar grant, so the client gate is only "is there a live session"; the
// REAL boundary is the server permission hook. NO step-up (helpdesk create isn't freeze-firing).

/** The in-force routing-policy category set for the operator picker (registry-driven, AC5). */
export function useHelpdeskCategories(pariwarId: string) {
  return useQuery({
    queryKey: ['helpdesk-categories', pariwarId] as const,
    queryFn: () => api.getHelpdeskCategories(pariwarId),
  });
}

/** The operator call-to-ticket create mutation. On success the page surfaces the routed ticket
 *  (ticket_id + routing target + SLA) in the "filed" confirmation panel. */
export function useCreateHelplineTicket(pariwarId: string) {
  return useMutation({
    mutationFn: (body: Omit<CreateTicketRequest, 'created_via'> & { created_via: 'helpline_call' }) =>
      api.createHelplineTicket(pariwarId, body),
  });
}

// ── Helpdesk responder console (Story 10.4) — queue + detail + transitions ─────────────────────────

/** The paginated responder queue (scope-respecting; derived SLA + severity). Refetched on filter change. */
export function useHelpdeskQueue(pariwarId: string, filters: api.HelpdeskQueueFilters = {}) {
  return useQuery({
    queryKey: ['helpdesk-queue', pariwarId, filters] as const,
    queryFn: () => api.getHelpdeskQueue(pariwarId, filters),
  });
}

/** One ticket's admin detail (row + thread + SLA/severity + cross-links). */
export function useHelpdeskTicket(pariwarId: string, ticketId: string) {
  return useQuery({
    queryKey: ['helpdesk-ticket', pariwarId, ticketId] as const,
    queryFn: () => api.getHelpdeskTicket(pariwarId, ticketId),
  });
}

/** The three responder transition mutations. Each returns the updated detail; the caller invalidates
 *  the ticket + queue queries so the console re-renders the new state + thread. */
export function useHelpdeskTransitions(pariwarId: string, ticketId: string) {
  const qc = useQueryClient();
  const onSettled = (): void => {
    void qc.invalidateQueries({ queryKey: ['helpdesk-ticket', pariwarId, ticketId] });
    void qc.invalidateQueries({ queryKey: ['helpdesk-queue', pariwarId] });
  };
  const pickUp = useMutation({ mutationFn: () => api.pickUpHelpdeskTicket(pariwarId, ticketId), onSettled });
  const reply = useMutation({ mutationFn: (message: string) => api.replyHelpdeskTicket(pariwarId, ticketId, message), onSettled });
  const resolve = useMutation({ mutationFn: (message: string) => api.resolveHelpdeskTicket(pariwarId, ticketId, message), onSettled });
  return { pickUp, reply, resolve };
}

// ── News/Blog admin authoring hooks (Story 10.5) ──────────────────────────────
export const newsPostsKey = (pariwarId: string) => ['news-posts', pariwarId] as const;
export const newsPostKey = (pariwarId: string, postId: string) => ['news-post', pariwarId, postId] as const;

/** GET the Pariwar's posts, optionally filtered by status. */
export function useNewsPosts(pariwarId: string, status?: string) {
  return useQuery({
    queryKey: [...newsPostsKey(pariwarId), status ?? 'all'],
    queryFn: () => api.listNewsPosts(pariwarId, status),
  });
}

/** GET a single post (the editor loads the exact content). */
export function useNewsPost(pariwarId: string, postId: string | null) {
  return useQuery({
    queryKey: newsPostKey(pariwarId, postId ?? 'none'),
    queryFn: () => api.getNewsPost(pariwarId, postId!),
    enabled: postId != null,
  });
}

function useInvalidateNews(pariwarId: string) {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: newsPostsKey(pariwarId) });
  };
}

/** Create a draft, then refresh the list. */
export function useCreateNewsDraft(pariwarId: string) {
  const invalidate = useInvalidateNews(pariwarId);
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createNewsDraft>[1]) => api.createNewsDraft(pariwarId, body),
    onSuccess: invalidate,
  });
}

/** Edit a draft (draft-only). */
export function useUpdateNewsDraft(pariwarId: string) {
  const invalidate = useInvalidateNews(pariwarId);
  return useMutation({
    mutationFn: (args: { postId: string; patch: Parameters<typeof api.updateNewsDraft>[2] }) =>
      api.updateNewsDraft(pariwarId, args.postId, args.patch),
    onSuccess: invalidate,
  });
}

/** Submit for review (reviewer_id ≠ author). */
export function useSubmitNewsPost(pariwarId: string) {
  const invalidate = useInvalidateNews(pariwarId);
  return useMutation({
    mutationFn: (args: { postId: string; reviewerId: string }) => api.submitNewsPost(pariwarId, args.postId, args.reviewerId),
    onSuccess: invalidate,
  });
}

/** Approve (records the non-author tone-review sign-off). */
export function useApproveNewsPost(pariwarId: string) {
  const invalidate = useInvalidateNews(pariwarId);
  return useMutation({
    mutationFn: (postId: string) => api.approveNewsPost(pariwarId, postId),
    onSuccess: invalidate,
  });
}

/** Schedule an approved post. */
export function useScheduleNewsPost(pariwarId: string) {
  const invalidate = useInvalidateNews(pariwarId);
  return useMutation({
    mutationFn: (args: { postId: string; scheduledPublishAt: string }) =>
      api.scheduleNewsPost(pariwarId, args.postId, args.scheduledPublishAt),
    onSuccess: invalidate,
  });
}

/** Publish an approved post immediately. */
export function usePublishNewsPost(pariwarId: string) {
  const invalidate = useInvalidateNews(pariwarId);
  return useMutation({
    mutationFn: (postId: string) => api.publishNewsPost(pariwarId, postId),
    onSuccess: invalidate,
  });
}
