// Provisioning-status view (Story 1.15, AC-4 control (c)) + the per-row
// "Trigger Dokploy build" action (AC-4 control (b)). Pure presentational — the page
// wires the data + the trigger mutation. Deliberately minimal: NO Epic-10 controls.

import type { ProvisioningStatusList } from '@twt/contracts';
import type { ReactElement } from 'react';

export interface ProvisioningStatusTableProps {
  items: ProvisioningStatusList;
  onTriggerDeploy: (pariwarId: string) => void;
  deployPendingId?: string;
}

export function ProvisioningStatusTable({
  items,
  onTriggerDeploy,
  deployPendingId,
}: ProvisioningStatusTableProps): ReactElement {
  if (items.length === 0) {
    return <p className="text-sm opacity-70" data-testid="provisioning-empty">No Pariwars provisioned yet.</p>;
  }

  return (
    <table className="w-full border-collapse text-sm" data-testid="provisioning-status-table">
      <thead>
        <tr className="border-b text-left">
          <th className="py-2 pr-3">Pariwar</th>
          <th className="py-2 pr-3">Path scope</th>
          <th className="py-2 pr-3">Locale</th>
          <th className="py-2 pr-3">Latest deploy</th>
          <th className="py-2 pr-3">Action</th>
        </tr>
      </thead>
      <tbody>
        {items.map((item) => {
          const pid = item.passport.pariwarId;
          const pending = deployPendingId === pid;
          return (
            <tr key={pid} className="border-b align-top" data-testid={`provisioning-row-${pid}`}>
              <td className="py-2 pr-3">
                <div className="font-medium">{item.passport.displayNameEn}</div>
                <div className="font-mono text-xs opacity-60 break-all">{pid}</div>
              </td>
              <td className="py-2 pr-3 font-mono text-xs break-all">{item.pathScope}</td>
              <td className="py-2 pr-3">{item.passport.localeDefault}</td>
              <td className="py-2 pr-3">
                {item.latestDeploy ? (
                  <span data-testid={`deploy-status-${pid}`}>{item.latestDeploy.status}</span>
                ) : (
                  <span className="opacity-60">—</span>
                )}
              </td>
              <td className="py-2 pr-3">
                <button
                  type="button"
                  onClick={() => onTriggerDeploy(pid)}
                  disabled={pending}
                  aria-busy={pending}
                  className="rounded border px-3 py-1 disabled:opacity-60"
                  data-testid={`trigger-build-${pid}`}
                >
                  {pending ? 'Triggering…' : 'Trigger Dokploy build'}
                </button>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
