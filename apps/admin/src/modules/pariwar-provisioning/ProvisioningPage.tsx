// The "Provisioning" page (Story 1.15 — the [SURFACE], AC-4).
//
// Assembles EXACTLY the three controls AC-4 permits and nothing more:
//   (a) Add-Pariwar form        → useAddPariwar (POST /provisioning/pariwars)
//   (b) Trigger Dokploy build   → useTriggerDeploy (POST .../:id/deploy), per row
//   (c) provisioning-status view → useProvisionedPariwars (GET /provisioning/pariwars)
//
// NO Epic-10 controls (feature flags, bulk ops, news/blog, helpdesk, reports,
// moderation). Server state is TanStack Query; the add + trigger mutations
// invalidate the status list so it re-derives from fresh server state.

import type { AddPariwarRequest } from '@twt/contracts';
import type { ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useAddPariwar, useProvisionedPariwars, useTriggerDeploy } from '../../api/hooks.js';
import { AddPariwarForm } from './AddPariwarForm.js';
import { ProvisioningStatusTable } from './ProvisioningStatusTable.js';

function messageOf(err: unknown): string | undefined {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return undefined;
}

export function ProvisioningPage(): ReactElement {
  const listQuery = useProvisionedPariwars();
  const addPariwar = useAddPariwar();
  const triggerDeploy = useTriggerDeploy();

  const onAdd = (payload: AddPariwarRequest): void => {
    addPariwar.mutate(payload);
  };
  const onTrigger = (pariwarId: string): void => {
    triggerDeploy.mutate(pariwarId);
  };

  return (
    <div className="flex flex-col gap-8">
      <header>
        <h1 className="text-xl font-bold">Provisioning</h1>
        <p className="mt-1 text-sm opacity-70">
          Onboard a new Pariwar: provision its passport, then trigger a Dokploy build to serve it
          under its <code>/p/&lt;id&gt;/</code> path-scope.
        </p>
      </header>

      <section aria-label="Add Pariwar" className="rounded border p-4">
        <AddPariwarForm onSubmit={onAdd} pending={addPariwar.isPending} submitError={messageOf(addPariwar.error)} />
      </section>

      <section aria-label="Provisioned Pariwars" className="rounded border p-4">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide opacity-70">Provisioned Pariwars</h2>
        {listQuery.isLoading && <p role="status">Loading provisioned Pariwars…</p>}
        {listQuery.isError && (
          <p role="alert" className="text-status-fail-fg">
            Could not load the provisioning status: {messageOf(listQuery.error)}
          </p>
        )}
        {triggerDeploy.isError && (
          <p role="alert" className="mb-2 text-sm text-status-fail-fg">
            Deploy trigger failed: {messageOf(triggerDeploy.error)}
          </p>
        )}
        {listQuery.data && (
          <ProvisioningStatusTable
            items={listQuery.data}
            onTriggerDeploy={onTrigger}
            deployPendingId={triggerDeploy.isPending ? (triggerDeploy.variables as string | undefined) : undefined}
          />
        )}
      </section>
    </div>
  );
}
