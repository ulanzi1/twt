// The Super Admin's WORKPLACE LIST page — Story 6.36c (Task 5; AC2, AC8; `-330` SW9 A, `-342` call 4).
//
// The list with its filters (district, kind, status, a name search — every filter applied by the SERVER), an ADD form (an
// office, or a school the import missed), and per STAFF row: rename, delist / list again. An IMPORTED row is read-only and
// labelled by its source — the next import corrects it (RV3). ⛔ No delete control: there is ⛔ no such route.
// The server's key check (`workplace.manage`, super_admin ONLY) is the boundary; a step-up-required 403 holds the write and
// runs it after the code verifies (the `ApprovalWarningReasonsPage` pattern).
// Code review round 2: the write controls show ONLY on the session's national `workplace.manage` (the nav's source — a
// Pariwar Admin reading the list through `workplace.review` sees ⛔ controls that can only 403); a pending write is ⛔ ever
// reset, and EVERY write control is disabled while any write is in flight or a step-up retry is held.

import { WORKPLACE_MANAGE_STEP_UP_CONTEXT, WORKPLACE_SEARCH_TEXT_MAX_WIRE, type AdminWorkplaceAddRequest, type AdminWorkplaceWire } from '@twt/contracts';
import { useEffect, useRef, useState, type ReactElement } from 'react';

import { ApiError } from '../../api/client.js';
import { useAddAdminWorkplace, useAdminWorkplaces, useRenameAdminWorkplace, useSession, useSetAdminWorkplaceListed, useWorkplaceWriting } from '../../api/hooks.js';
import { errorText } from './error-text.js';
import { stepUpEn, workplacesEn as t } from './i18n-en.js';
import { WORKPLACE_BLOCK_CODE_INPUT_MAX, WORKPLACE_DISTRICT_INPUT_MAX, WORKPLACE_UDISE_INPUT_MAX } from './input-bounds.js';
import { holdKey, holdOnce, needsStepUp, StepUpPanel, useHoldGenerations, type HoldSnapshot, type PendingWrite } from './StepUpPanel.js';
import { useDebouncedValue } from './use-debounced-value.js';

/** The control that currently owns the held step-up retry (fix: a DIFFERENT control's edit must not clear it). */
type WorkplaceControl = 'add' | 'rename' | 'toggle';

interface Filters {
  district: string;
  kind: '' | 'school' | 'office';
  status: 'listed' | 'delisted';
  q: string;
}

function AddForm({
  processing,
  locked,
  onSubmit,
  onEdit,
}: {
  processing: boolean;
  /** Any write in flight or a step-up retry held (code review round 2). */
  locked: boolean;
  onSubmit: (body: AdminWorkplaceAddRequest) => void;
  onEdit: () => void;
}): ReactElement {
  const [kind, setKind] = useState<'office' | 'school'>('office');
  const [name, setName] = useState('');
  const [district, setDistrict] = useState('');
  const [village, setVillage] = useState('');
  const [blockCode, setBlockCode] = useState('');
  const [udise, setUdise] = useState('');
  const [missing, setMissing] = useState(false);
  const field = (label: string, value: string, set: (v: string) => void, testId: string, maxLength?: number) => (
    <label className="flex flex-col text-xs">
      {label}
      <input
        className="rounded border px-2 py-1 text-sm"
        value={value}
        {...(maxLength !== undefined ? { maxLength } : {})}
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
        {/* The Kind decides whether a UDISE code is sent — a change is an EDIT, so it clears a held add (code review round 2). */}
        <select
          className="rounded border px-2 py-1 text-sm"
          value={kind}
          onChange={(e) => {
            setKind(e.target.value as 'office' | 'school');
            setMissing(false);
            onEdit();
          }}
          data-testid="workplace-add-kind"
        >
          <option value="office">{t.kind.office}</option>
          <option value="school">{t.kind.school}</option>
        </select>
      </label>
      {field(t.addFields.name, name, setName, 'workplace-add-name')}
      {field(t.addFields.district, district, setDistrict, 'workplace-add-district', WORKPLACE_DISTRICT_INPUT_MAX)}
      {field(t.addFields.village, village, setVillage, 'workplace-add-village')}
      {field(t.addFields.blockCode, blockCode, setBlockCode, 'workplace-add-block', WORKPLACE_BLOCK_CODE_INPUT_MAX)}
      {kind === 'school' ? field(t.addFields.udise, udise, setUdise, 'workplace-add-udise', WORKPLACE_UDISE_INPUT_MAX) : null}
      {missing ? (
        <p role="alert" className="text-xs text-status-fail-fg">
          {t.required}
        </p>
      ) : null}
      <button type="submit" className="w-fit rounded bg-black px-3 py-1 text-sm text-white disabled:opacity-50" disabled={locked} data-testid="workplace-add-submit">
        {processing ? t.saving : t.addSubmit}
      </button>
    </form>
  );
}

function Row({
  w,
  canManage,
  onRename,
  onToggle,
  onAbandonRename,
  locked,
}: {
  w: AdminWorkplaceWire;
  /** The session's national `workplace.manage` — ⛔ it, ⛔ a control (code review round 2). */
  canManage: boolean;
  /** `onSaved` runs on SUCCESS only — a refused rename keeps the typed text and stays open (code review round 2). */
  onRename: (name: string, onSaved: () => void) => void;
  onToggle: () => void;
  /** An edit or a Cancel of THIS row's rename — drops a step-up retry still holding the old text (code review round 2). */
  onAbandonRename: () => void;
  /** Any write in flight or a step-up retry held (code review round 2). */
  locked: boolean;
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
              // ⛔ `setRenaming(false)` here (code review round 2): it ran BEFORE the answer, so a refused name lost the
              // text the admin typed. Edit mode ends on SUCCESS only (a held step-up retry carries `onSaved` too).
              onRename(name.trim(), () => setRenaming(false));
            }}
          >
            <input
              className="rounded border px-2 py-1 text-sm"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                onAbandonRename();
              }}
              aria-label={t.columns.name}
              data-testid={`workplace-rename-input-${w.workplaceId}`}
            />
            <button type="submit" className="text-xs underline disabled:opacity-50" disabled={locked} data-testid={`workplace-rename-save-${w.workplaceId}`}>
              {t.renameSave}
            </button>
            <button
              type="button"
              className="text-xs underline"
              onClick={() => {
                setRenaming(false);
                setName(w.name);
                onAbandonRename();
              }}
              data-testid={`workplace-rename-cancel-${w.workplaceId}`}
            >
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
          canManage ? (
            <div className="flex gap-2">
              {!renaming ? (
                <button type="button" className="text-xs underline disabled:opacity-50" disabled={locked} onClick={() => setRenaming(true)} data-testid={`workplace-rename-${w.workplaceId}`}>
                  {t.rename}
                </button>
              ) : null}
              <button type="button" className="text-xs underline disabled:opacity-50" disabled={locked} onClick={onToggle} data-testid={`workplace-toggle-${w.workplaceId}`}>
                {w.status === 'listed' ? t.delist : t.relist}
              </button>
            </div>
          ) : null
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
  const session = useSession();
  // The nav's source (RootLayout): the national grant. Advisory — the server's key check is the boundary.
  const canManage = session.data?.nationalGrants.includes('workplace.manage') ?? false;
  const [filters, setFilters] = useState<Filters>({ district: '', kind: '', status: 'listed', q: '' });
  // The two TYPED filters settle before they reach the server (code review round 2 — one GET, one audit line, per pause).
  const district = useDebouncedValue(filters.district);
  const q = useDebouncedValue(filters.q);
  // The cursor belongs to the SETTLED filter it was paged under (code review round 2): a filter change — once the typed
  // text has settled — reads as page 1 in the SAME render, ⛔ a reset on the raw keystroke (an extra GET and audit
  // line, and a stale "Next" for the old filter).
  const filterKey = JSON.stringify([filters.status, filters.kind, district.trim(), q.trim()]);
  const [page, setPage] = useState<{ filterKey: string; cursor: string | undefined }>({ filterKey, cursor: undefined });
  const cursor = page.filterKey === filterKey ? page.cursor : undefined;
  // FORGET the page once the settled filter moves (code review round 2): `page` was written only by paging, so going
  // back to an earlier filter or tab brought its old page back. The read above still says page 1 in the SAME render
  // (⛔ an extra GET); this drops the stale cursor for good.
  useEffect(() => setPage((p) => (p.filterKey === filterKey ? p : { filterKey, cursor: undefined })), [filterKey]);
  const list = useAdminWorkplaces(pariwarId, {
    status: filters.status,
    ...(district.trim() !== '' ? { district: district.trim() } : {}),
    ...(filters.kind !== '' ? { kind: filters.kind } : {}),
    ...(q.trim() !== '' ? { q: q.trim() } : {}),
    ...(cursor !== undefined ? { cursor } : {}),
  });
  const add = useAddAdminWorkplace(pariwarId);
  const rename = useRenameAdminWorkplace(pariwarId);
  const toggle = useSetAdminWorkplaceListed(pariwarId);
  const writing = useWorkplaceWriting(pariwarId) || add.isPending || rename.isPending || toggle.isPending;
  const [pending, setPending] = useState<PendingWrite<WorkplaceControl>>(null);
  const holdSeq = useRef(0);
  const gens = useHoldGenerations();
  const [addFormKey, setAddFormKey] = useState(0);
  // Every write control, while a write is in flight OR a step-up retry is held (code review round 2): a second Add
  // under an in-flight one was a duplicate staff row, and a write under a held retry was a second hold.
  const locked = writing || pending !== null;

  /**
   * ⛔ Never reset a PENDING mutation (code review round 2): `reset()` detaches its per-call `onSuccess` / `onError`
   * (a step-up `hold` was lost, "Saved." never showed) and turns `isPending` false (which let a second Add through).
   * Only a SETTLED write's leftover banner is cleared.
   */
  const resetSettled = (): void => {
    for (const m of [add, rename, toggle]) if (!m.isPending) m.reset();
  };
  /** Drop a held step-up retry (the `ApprovalWarningReasonsPage` `clearStepUp`; the panel unmounts, so its code goes too). */
  const clearStepUp = (): void => setPending(null);
  /**
   * An edit or a back-out of ONE control (and row): its held retry is dropped, and its generation moves so a write of it
   * still IN FLIGHT raises ⛔ panel when its 403 lands (code review round 2). Another control's hold is left alone.
   */
  const abandon = (owner: WorkplaceControl, target?: string): void => {
    gens.bump(owner, target);
    setPending((p) => (p !== null && p.owner === owner && p.target === target ? null : p));
  };
  const setFilter = <K extends keyof Filters>(k: K, v: Filters[K]): void => {
    setFilters((f) => ({ ...f, [k]: v }));
    // A previous write's "Saved." / error banner must not survive under a freshly filtered list (code review). ⛔ The
    // held retry is KEPT (code review round 2): a filter changes ⛔ what it would send, and the code already sent stays
    // usable — the panel names the write it holds.
    resetSettled();
  };
  /** Paging keeps a held retry too (code review round 2 — it changes ⛔ what the retry would send). */
  const goToPage = (next: string | undefined): void => setPage({ filterKey, cursor: next });
  /**
   * Hold a step-up-refused write — ONLY if nothing changed its payload or backed out of it since the click (`snap`, code
   * review round 2): a 403 that lands after an edit holds ⛔ the OLD body, and the refused write wrote nothing.
   */
  const hold = (owner: WorkplaceControl, label: string, retry: () => void, snap: HoldSnapshot, target?: string) => (err: unknown) => {
    if (!needsStepUp(err) || !gens.isCurrent(snap)) return;
    setPending(holdOnce({ owner, ...(target !== undefined ? { target } : {}), id: ++holdSeq.current, label, retry }));
  };
  const runAdd = (body: AdminWorkplaceAddRequest): void => {
    resetSettled();
    const snap = gens.snapshot('add');
    add.mutate(body, {
      // Remount the form EMPTY only when the admin has ⛔ typed into it since the click (code review round 2) — an edit
      // made while the add was in flight is the next entry, ⛔ to be wiped.
      onSuccess: () => {
        if (gens.isCurrent(snap)) setAddFormKey((k) => k + 1);
      },
      onError: hold('add', stepUpEn.held.add(body.name), () => runAdd(body), snap),
    });
  };
  const runRename = (workplaceId: string, name: string, onSaved: () => void): void => {
    resetSettled();
    const snap = gens.snapshot('rename', workplaceId);
    rename.mutate(
      { workplaceId, name },
      {
        // Edit mode ends only if the text was ⛔ changed while the rename was in flight (code review round 2).
        onSuccess: () => {
          if (gens.isCurrent(snap)) onSaved();
        },
        onError: hold('rename', stepUpEn.held.rename(name), () => runRename(workplaceId, name, onSaved), snap, workplaceId),
      },
    );
  };
  // `action` is CAPTURED at the moment the toggle was originally triggered (the call site below), not re-derived
  // from the row's status here — a retry must re-send the ORIGINALLY intended direction even if the list has since
  // refetched a different status for this row (code review).
  const runToggle = (workplaceId: string, action: 'delist' | 'relist', name: string): void => {
    resetSettled();
    const snap = gens.snapshot('toggle', workplaceId);
    toggle.mutate({ workplaceId, action }, { onError: hold('toggle', stepUpEn.held[action](name), () => runToggle(workplaceId, action, name), snap, workplaceId) });
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
          <input
            className="rounded border px-2 py-1 text-sm"
            value={filters.district}
            maxLength={WORKPLACE_DISTRICT_INPUT_MAX}
            onChange={(e) => setFilter('district', e.target.value)}
            data-testid="filter-district"
          />
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
          <input
            className="rounded border px-2 py-1 text-sm"
            value={filters.q}
            maxLength={WORKPLACE_SEARCH_TEXT_MAX_WIRE}
            onChange={(e) => setFilter('q', e.target.value)}
            data-testid="filter-q"
          />
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
                  canManage={canManage}
                  locked={locked}
                  onRename={(name, onSaved) => runRename(w.workplaceId, name, onSaved)}
                  onToggle={() => runToggle(w.workplaceId, w.status === 'listed' ? 'delist' : 'relist', w.name)}
                  onAbandonRename={() => abandon('rename', w.workplaceId)}
                />
              ))}
            </tbody>
          </table>
        )
      ) : null}
      <div className="flex gap-3">
        {cursor !== undefined ? (
          <button type="button" className="text-sm underline" onClick={() => goToPage(undefined)}>
            {t.first}
          </button>
        ) : null}
        {/* ⛔ While the PREVIOUS filter's rows are on screen (`keepPreviousData`): their cursor belongs to that filter. */}
        {list.data?.hasMore && list.data.nextCursor && !list.isPlaceholderData ? (
          <button type="button" className="text-sm underline" onClick={() => goToPage(list.data!.nextCursor!)} data-testid="workplaces-next">
            {t.next}
          </button>
        ) : null}
      </div>

      {/* `onEdit` clears a pending step-up ONLY when this control (the add form) is the one holding it — editing a
          field here must not silently drop an unrelated held rename/toggle retry (code review). ⛔ Without the national
          grant (code review round 2). */}
      {canManage ? <AddForm key={addFormKey} processing={add.isPending} locked={locked} onSubmit={runAdd} onEdit={() => abandon('add')} /> : null}

      {/* Rendered ONLY while a retry is held — unmounting it between retries resets its internal OTP + mutation
          state instead of carrying it stale into the next one (code review). Keyed by the hold (code review round 2). */}
      {pending ? (
        <StepUpPanel key={holdKey(pending)} context={WORKPLACE_MANAGE_STEP_UP_CONTEXT} pending={pending} onDone={clearStepUp} onCancel={clearStepUp} testId="workplaces-step-up" />
      ) : null}
      {writeError ? (
        <p role="alert" className="text-sm text-status-fail-fg" data-testid="workplaces-write-error">
          {/* A refused RELIST whose district left the list has ⛔ district field to fix (code review round 2) — its own
              line, ⛔ the add form's "use a district exactly as the list spells it". */}
          {writeError === toggle.error && toggle.variables?.action === 'relist' && writeError instanceof ApiError && writeError.code === 'workplace.district_not_found'
            ? t.relistDistrictGone
            : errorText(writeError, t.errors, t)}
        </p>
      ) : null}
      <p role="status" className="text-sm" data-testid="workplaces-saved">
        {saved ? t.saved : ''}
      </p>
    </div>
  );
}
