// The Super Admin's WORKPLACE LIST page — Story 6.36c (Task 5; AC2, AC8; `-330` SW9 A, `-342` call 4).
//
// The list with its filters (district, kind, status, a name search — every filter applied by the SERVER), an ADD form (an
// office, or a school the import missed), and per STAFF row: rename, delist / list again. An IMPORTED row is read-only and
// labelled by its source — the next import corrects it (RV3). ⛔ No delete control: there is ⛔ no such route.
// The server's key check (`workplace.manage`, super_admin ONLY) is the boundary; a step-up-required 403 holds the write and
// runs it after the code verifies (the `ApprovalWarningReasonsPage` pattern).

import { WORKPLACE_MANAGE_STEP_UP_CONTEXT, type AdminWorkplaceAddRequest, type AdminWorkplaceWire } from '@twt/contracts';
import { useEffect, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useAddAdminWorkplace, useAdminWorkplaces, useRenameAdminWorkplace, useSetAdminWorkplaceListed } from '../../api/hooks.js';
import { errorText } from './error-text.js';
import { workplacesEn as t } from './i18n-en.js';
import { needsStepUp, StepUpPanel, type PendingWrite } from './StepUpPanel.js';

/** The control that currently owns the held step-up retry (fix: a DIFFERENT control's edit must not clear it). */
type WorkplaceControl = 'add' | 'rename' | 'toggle';

interface Filters {
  district: string;
  kind: '' | 'school' | 'office';
  status: 'listed' | 'delisted';
  q: string;
}

function AddForm({ processing, onSubmit, onEdit }: { processing: boolean; onSubmit: (body: AdminWorkplaceAddRequest) => void; onEdit: () => void }): ReactElement {
  const [kind, setKind] = useState<'office' | 'school'>('office');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [blockCode, setBlockCode] = useState('');
  const [udise, setUdise] = useState('');
  const [missing, setMissing] = useState(false);
  const field = (label: string, value: string, set: (v: string) => void, testId: string) => (
    <label className="flex flex-col text-xs">
      {label}
      <input
        className="rounded border px-2 py-1 text-sm"
        value={value}
        onChange={(e) => {
          set(e.target.value);
          setMissing(false);
          onEdit();
        }}
        data-testid={testId}
      />
    </label>
  );
  return (
    <form
      className="flex flex-col gap-2 rounded border p-3"
      data-testid="workplace-add-form"
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim() === '' || district.trim() === '') return setMissing(true);
        onSubmit({
          kind,
          name: name.trim(),
          district: district.trim(),
          ...(village.trim() !== '' ? { villageName: village.trim() } : {}),
          ...(blockCode.trim() !== '' ? { blockCode: blockCode.trim() } : {}),
          ...(kind === 'school' && udise.trim() !== '' ? { udiseSchoolCode: udise.trim() } : {}),
        });
      }}
    >
      <h3 className="text-sm font-semibold">{t.addHeading}</h3>
      <label className="flex flex-col text-xs">
        {t.addFields.kind}
        <select className="rounded border px-2 py-1 text-sm" value={kind} onChange={(e) => setKind(e.target.value as 'office' | 'school')} data-testid="workplace-add-kind">
          <option value="office">{t.kind.office}</option>
          <option value="school">{t.kind.school}</option>
        </select>
      </label>
      {field(t.addFields.name, name, setName, 'workplace-add-name')}
      {field(t.addFields.district, district, setDistrict, 'workplace-add-district')}
      {field(t.addFields.village, village, setVillage, 'workplace-add-village')}
      {field(t.addFields.blockCode, blockCode, setBlockCode, 'workplace-add-block')}
      {kind === 'school' ? field(t.addFields.udise, udise, setUdise, 'workplace-add-udise') : null}
      {missing ? (
        <p role="alert" className="text-xs text-status-fail-fg">
          {t.required}
        </p>
      ) : null}
      <button type="submit" className="w-fit rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50" disabled={processing} data-testid="workplace-add-submit">
        {processing ? t.saving : t.addSubmit}
      </button>
    </form>
  );
}

function Row({
  w,
  onRename,
  onToggle,
  busy,
}: {
  w: AdminWorkplaceWire;
  onRename: (name: string) => void;
  onToggle: () => void;
  busy: boolean;
}): ReactElement {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(w.name);
  // A background refetch (e.g. after another admin's write) brings a NEW `w.name` — sync the local field from it, but
  // ONLY while the row is not mid-edit, or a refetch landing while the admin is typing would stomp their in-progress
  // rename (code review).
  useEffect(() => {
    if (!renaming) setName(w.name);
  }, [w.name, renaming]);
  const staff = w.source === 'staff';
  return (
    <tr data-testid={`workplace-row-${w.workplaceId}`} className="border-t align-top">
      <td className="p-2">
        {renaming ? (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() === '') return;
              onRename(name.trim());
              setRenaming(false);
            }}
          >
            <input className="rounded border px-2 py-1 text-sm" value={name} onChange={(e) => setName(e.target.value)} aria-label={t.columns.name} data-testid={`workplace-rename-input-${w.workplaceId}`} />
            <button type="submit" className="text-xs underline" disabled={busy}>
              {t.renameSave}
            </button>
            <button type="button" className="text-xs underline" onClick={() => setRenaming(false)}>
              {t.cancel}
            </button>
          </form>
        ) : (
          w.name
        )}
      </td>
      <td className="p-2">{t.kind[w.kind]}</td>
      <td className="p-2">{w.district}</td>
      <td className="p-2">{t.source[w.source]}</td>
      <td className="p-2">{t.status[w.status]}</td>
      <td className="p-2">
        {staff ? (
          <div className="flex gap-2">
            {!renaming ? (
              <button type="button" className="text-xs underline" onClick={() => setRenaming(true)} data-testid={`workplace-rename-${w.workplaceId}`}>
                {t.rename}
              </button>
            ) : null}
            <button type="button" className="text-xs underline" disabled={busy} onClick={onToggle} data-testid={`workplace-toggle-${w.workplaceId}`}>
              {w.status === 'listed' ? t.delist : t.relist}
            </button>
          </div>
        ) : (
          <span className="text-xs opacity-70" data-testid={`workplace-readonly-${w.workplaceId}`}>
            {t.importNote}
          </span>
        )}
      </td>
    </tr>
  );
}

export function WorkplacesPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const [filters, setFilters] = useState<Filters>({ district: '', kind: '', status: 'listed', q: '' });
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const list = useAdminWorkplaces(pariwarId, {
    status: filters.status,
    ...(filters.district.trim() !== '' ? { district: filters.district.trim() } : {}),
    ...(filters.kind !== '' ? { kind: filters.kind } : {}),
    ...(filters.q.trim() !== '' ? { q: filters.q.trim() } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  });
  const add = useAddAdminWorkplace(pariwarId);
  const rename = useRenameAdminWorkplace(pariwarId);
  const toggle = useSetAdminWorkplaceListed(pariwarId);
  const [pending, setPending] = useState<PendingWrite<WorkplaceControl>>(null);
  const [addFormKey, setAddFormKey] = useState(0);

  const resetAll = (): void => {
    add.reset();
    rename.reset();
    toggle.reset();
  };
  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]): void => {
    setFilters((f) => ({ ...f, [k]: v }));
    setCursor(undefined);
    // A previous write's "Saved."/error banner must not survive under a freshly filtered list (code review).
    resetAll();
  };
  const hold = (owner: WorkplaceControl, retry: () => void) => (err: unknown) => {
    if (needsStepUp(err)) setPending({ owner, retry });
  };
  const runAdd = (body: AdminWorkplaceAddRequest): void => {
    resetAll();
    add.mutate(body, { onSuccess: () => setAddFormKey((k) => k + 1), onError: hold('add', () => runAdd(body)) });
  };
  const runRename = (workplaceId: string, name: string): void => {
    resetAll();
    rename.mutate({ workplaceId, name }, { onError: hold('rename', () => runRename(workplaceId, name)) });
  };
  // `action` is CAPTURED at the moment the toggle was originally triggered (the call site below), not re-derived
  // from the row's status here — a retry must re-send the ORIGINALLY intended direction even if the list has since
  // refetched a different status for this row (code review).
  const runToggle = (workplaceId: string, action: 'delist' | 'relist'): void => {
    resetAll();
    toggle.mutate({ workplaceId, action }, { onError: hold('toggle', () => runToggle(workplaceId, action)) });
  };

  const writeError = [add.error, rename.error, toggle.error].find((e) => e && !needsStepUp(e));
  const saved = !writeError && (add.isSuccess || rename.isSuccess || toggle.isSuccess);

  return (
    <div className="flex flex-col gap-4" data-testid="workplaces-page">
      <h2 className="text-lg font-semibold">{t.heading}</h2>
      <p className="text-sm">{t.intro}</p>
      <p className="text-sm font-medium">{t.neverDeleted}</p>

      <div className="flex flex-wrap items-end gap-3" data-testid="workplaces-filters">
        <label className="flex flex-col text-xs">
          {t.filters.district}
          <input className="rounded border px-2 py-1 text-sm" value={filters.district} onChange={(e) => setFilter('district', e.target.value)} data-testid="filter-district" />
        </label>
        <label className="flex flex-col text-xs">
          {t.filters.kind}
          <select className="rounded border px-2 py-1 text-sm" value={filters.kind} onChange={(e) => setFilter('kind', e.target.value as Filters['kind'])} data-testid="filter-kind">
            <option value="">{t.filters.any}</option>
            <option value="school">{t.kind.school}</option>
            <option value="office">{t.kind.office}</option>
          </select>
        </label>
        <label className="flex flex-col text-xs">
          {t.filters.status}
          <select className="rounded border px-2 py-1 text-sm" value={filters.status} onChange={(e) => setFilter('status', e.target.value as Filters['status'])} data-testid="filter-status">
            <option value="listed">{t.status.listed}</option>
            <option value="delisted">{t.status.delisted}</option>
          </select>
        </label>
        <label className="flex flex-col text-xs">
          {t.filters.search}
          <input className="rounded border px-2 py-1 text-sm" value={filters.q} onChange={(e) => setFilter('q', e.target.value)} data-testid="filter-q" />
        </label>
      </div>

      {list.isLoading ? <p role="status">{t.loading}</p> : null}
      {list.isError && !list.data ? (
        <p role="alert" data-testid="workplaces-load-error">
          {list.error instanceof ApiError && list.error.isForbidden ? t.forbidden : t.loadError}
        </p>
      ) : null}
      {list.data ? (
        list.data.items.length === 0 ? (
          <p className="text-sm opacity-70">{t.empty}</p>
        ) : (
          <table className="w-full text-sm" data-testid="workplaces-table">
            <thead>
              <tr className="text-left text-xs">
                <th className="p-2">{t.columns.name}</th>
                <th className="p-2">{t.columns.kind}</th>
                <th className="p-2">{t.columns.district}</th>
                <th className="p-2">{t.columns.source}</th>
                <th className="p-2">{t.columns.status}</th>
                <th className="p-2">{t.columns.actions}</th>
              </tr>
            </thead>
            <tbody>
              {list.data.items.map((w) => (
                <Row
                  key={w.workplaceId}
                  w={w}
                  busy={rename.isPending || toggle.isPending}
                  onRename={(name) => runRename(w.workplaceId, name)}
                  onToggle={() => runToggle(w.workplaceId, w.status === 'listed' ? 'delist' : 'relist')}
                />
              ))}
            </tbody>
          </table>
        )
      ) : null}
      <div className="flex gap-3">
        {cursor !== undefined ? (
          <button type="button" className="text-sm underline" onClick={() => setCursor(undefined)}>
            {t.first}
          </button>
        ) : null}
        {list.data?.hasMore && list.data.nextCursor ? (
          <button type="button" className="text-sm underline" onClick={() => setCursor(list.data!.nextCursor!)} data-testid="workplaces-next">
            {t.next}
          </button>
        ) : null}
      </div>

      {/* `onEdit` clears a pending step-up ONLY when this control (the add form) is the one holding it — editing a
          field here must not silently drop an unrelated held rename/toggle retry (code review). */}
      <AddForm key={addFormKey} processing={add.isPending} onSubmit={runAdd} onEdit={() => setPending((p) => (p?.owner === 'add' ? null : p))} />

      {/* Rendered ONLY while a retry is held — unmounting it between retries resets its internal OTP + mutation
          state instead of carrying it stale into the next one (code review). */}
      {pending ? <StepUpPanel context={WORKPLACE_MANAGE_STEP_UP_CONTEXT} pending={pending} onDone={() => setPending(null)} testId="workplaces-step-up" /> : null}
      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="workplaces-write-error">
          {errorText(writeError, t.errors, t)}
        </p>
      ) : null}
      <p role="status" className="text-sm" data-testid="workplaces-saved">
        {saved ? t.saved : ''}
      </p>
    </div>
  );
}
