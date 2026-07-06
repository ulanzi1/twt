// TanStack Query hooks over the typed client (Story 1.11b, DD-7).
//
// Server state lives in Query (§4.3). The integrity reads are CACHE-DISABLED
// (§4.5 "verifier-console reads cache-disabled" — a strong-consistency surface):
// staleTime/gcTime 0 + refetchOnMount 'always', and NO IndexedDB persister. Run-now
// + acknowledge are pessimistic/server-confirmed mutations (§4.2) that invalidate
// the history so the banner + table re-derive from fresh server state.

import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AddPariwarRequest, MemberSearchRequest } from '@twt/contracts';

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
