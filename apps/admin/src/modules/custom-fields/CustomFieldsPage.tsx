// Per-Pariwar custom-fields console (Story 10.12, Task 7; AC8/AC9) — the pariwar-scoped admin surface.
//
// MINIMAL by design, and the minimalism is a POSITION, not a shortcut. The UX specification contains
// NO form-builder, NO field-definition grammar and NO per-Pariwar settings pattern anywhere;
// §11 confines per-Pariwar variation to the token / surface-label / copy layers and calls component
// grammar "tenant-invariant" (ux-design-specification.md:2254-2262, :2465). Building a richer surface
// here would mean INVENTING UX, so this page is exactly three things: the in-force list, a publish
// form over the FIXED type allowlist, and a per-definition Retire action. Nothing more.
// (ESCALATION 5 records that the UX pass is owed if a richer surface is ever wanted.)
//
// ⛔ AND THERE IS NO MEMBER-FACING DYNAMIC FORM RENDERER. Custom-field VALUES are written through the
// API only in v1. That is a recorded, gated deferral — not an omission to be helpfully filled in.
//
// `pariwarId` is a PROP (from the route), so the page is testable without a router — the
// FeatureFlagsPage / NewsPage precedent.
//
// ── The real boundary is the server ────────────────────────────────────────────────────────────────
// [adminSession, scope, requirePermission]. `pariwar.view_custom_fields` gates the read and the
// NARROWER `pariwar.manage_custom_fields` gates the write, so an `auditor` sees the full definition
// list and gets a 403 on submit — surfaced as an error, NOT hidden. No client-side capability hiding
// (the 10.8 doctrine): hiding the form would be a UI courtesy that misrepresents what exists.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReactElement } from 'react';
import { useRef, useState } from 'react';

import type { CustomFieldDefinitionBody, CustomFieldVersion } from '../../api/client.js';
import {
  ApiError,
  listCustomFieldDefinitions,
  publishCustomFieldDefinition,
} from '../../api/client.js';

/**
 * The FIXED type allowlist, mirrored from the domain's `CUSTOM_FIELD_TYPES`.
 *
 * ⚠ A FIXED LIST, NOT A FREE-TEXT BOX. This is what keeps a custom field a bounded declarative form
 * rather than an expression language — the same discipline the feature-flag cohort dimensions carry,
 * and with more force here, because the author is a TENANT rather than a trustee. A request for an
 * eighth type is a code change and a review; the form must not be able to construct one.
 */
const FIELD_TYPES: ReadonlyArray<{ value: CustomFieldDefinitionBody['field_type']; help: string }> = [
  { value: 'string', help: 'Short text, up to the length you set.' },
  { value: 'integer', help: 'A whole number.' },
  { value: 'decimal', help: 'A number with decimals. Not for money — amounts have their own fields.' },
  { value: 'boolean', help: 'Yes or no.' },
  { value: 'date', help: 'A calendar date (YYYY-MM-DD).' },
  { value: 'enum', help: 'One choice from a list you define below.' },
  { value: 'string_array', help: 'A short list of text values.' },
];

/** The v1 host. A fixed single-option select rather than a hidden field, so the surface is honest
 *  about the axis existing and about claims/pools being a deferral rather than an impossibility. */
const HOST_ENTITY = 'member';

/**
 * Turn a server rejection into something a Pariwar admin can act on.
 *
 * ⚠ THE TWO GOVERNANCE REFUSALS ARE NOT VALIDATION ERRORS, and must not read like them. A field key
 * that collides with a frozen control, or a PII tier that has no substrate, is a decision the system
 * has already made — and an operator told only "invalid" will try variations until something sticks,
 * which is precisely how a fence gets walked around. So both pass the server's message through
 * verbatim: it names the control, or names the missing substrate.
 */
function describePublishError(err: unknown): string {
  const code = err instanceof ApiError ? err.code : undefined;
  const serverMessage = err instanceof Error ? err.message : '';
  switch (code) {
    case 'custom_field.frozen_governance_key':
    case 'custom_field.naked_pii_key':
    case 'custom_field.pii_tier_unsupported':
      // Verbatim — see the note above.
      return serverMessage;
    case 'custom_field.label_parity_required':
      return 'Both the English and the Hindi label are needed before this field can be published.';
    case 'custom_field.definition_invalid':
      return serverMessage || 'Some details of this field need changing before it can be published.';
    case 'custom_field.incompatible_redefinition':
      return `${serverMessage} To change what this field means, retire it and publish a new one under a different key.`;
    case 'custom_field.cardinality_exceeded':
      return serverMessage || 'This Pariwar has as many custom fields as it can hold. Retire one to make room.';
    case 'custom_field.definition_conflict':
      return 'Another admin published a version of this field while your form was open. Re-open it, re-read the current version, and decide again.';
    case 'custom_field.effective_at_out_of_order':
      return 'This field already has a newer version. A new version has to take effect after the last one.';
    case 'custom_field.definition_not_found':
      return 'There is no live definition for this field to retire. Refresh the list and try again.';
    case 'custom_field.idempotency_in_progress':
      return 'An identical change is already in progress. Wait a moment and refresh the list before retrying.';
    case 'admin.display_name_missing':
      return 'Your admin account has no display name recorded, and every published field is permanently attributed. Set a display name first.';
    default:
      if (err instanceof ApiError && err.status === 403) {
        return 'You do not have permission to change custom fields in this Pariwar (pariwar.manage_custom_fields is required).';
      }
      return serverMessage || 'Could not save this field.';
  }
}

/**
 * The Hindi-parity note, in the TONE-GUIDE REGISTER (AC9).
 *
 * ⚠ Not a validation scold. The requirement exists because members read Hindi first — that is a
 * commitment the system made, not a form rule — and because a label authored in one language today
 * cannot be backfilled once values exist under it. Saying WHY, before the operator hits the error,
 * is what makes the rule feel like a shared standard rather than an obstacle.
 */
const HINDI_NOTE =
  'Both labels are needed. Members read Hindi first, so a field without a Hindi name cannot be shown ' +
  'to them — and once members have filled a field in, its name cannot be changed. It is easier to ' +
  'write both now than to correct it later.';

/** Is this version the live one for its key? */
function isInForce(v: CustomFieldVersion, inForceIds: ReadonlySet<string>): boolean {
  return inForceIds.has(v.id);
}

export function CustomFieldsPage({ pariwarId }: { pariwarId: string }): ReactElement {
  const queryClient = useQueryClient();

  const [fieldKey, setFieldKey] = useState('');
  const [labelEn, setLabelEn] = useState('');
  const [labelHi, setLabelHi] = useState('');
  const [fieldType, setFieldType] = useState<CustomFieldDefinitionBody['field_type']>('string');
  const [enumValues, setEnumValues] = useState('');
  const [required, setRequired] = useState(false);
  const [indexed, setIndexed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  /** The field key awaiting retirement confirmation. Confirm-and-submit, never a one-click destroy. */
  const [retiring, setRetiring] = useState<string | null>(null);

  // One key per operator DECISION, held until that decision resolves — so a retried submit of the
  // same decision reuses it and is idempotent, rather than claiming a second version. The
  // `flipFeatureFlag` precedent.
  const publishKeyRef = useRef<string | null>(null);
  const retireKeyRef = useRef<string | null>(null);

  const definitions = useQuery({
    queryKey: ['custom-fields', pariwarId],
    queryFn: () => listCustomFieldDefinitions(pariwarId),
  });

  const inForce = definitions.data?.in_force ?? [];
  const history = definitions.data?.history ?? [];
  const inForceIds = new Set(inForce.map((d) => d.id));

  function resetForm(): void {
    setFieldKey('');
    setLabelEn('');
    setLabelHi('');
    setFieldType('string');
    setEnumValues('');
    setRequired(false);
    setIndexed(false);
    publishKeyRef.current = null;
  }

  const publish = useMutation({
    mutationFn: () => {
      const definition: CustomFieldDefinitionBody = {
        field_key: fieldKey.trim(),
        label_en: labelEn.trim(),
        label_hi: labelHi.trim(),
        field_type: fieldType,
        // v1 accepts tier 3 only, and the form does not offer a picker: offering a control whose
        // other options are always rejected would be a trap. The server's typed refusal explains the
        // deferral if a definition somehow arrives declaring another tier.
        pii_tier: 3,
        required,
        indexed,
        ...(fieldType === 'enum'
          ? {
              enum_values: enumValues
                .split(',')
                .map((v) => v.trim())
                .filter((v) => v.length > 0),
            }
          : {}),
      };
      publishKeyRef.current ??= crypto.randomUUID();
      return publishCustomFieldDefinition(
        pariwarId,
        HOST_ENTITY,
        definition.field_key,
        { definition },
        publishKeyRef.current,
      );
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['custom-fields', pariwarId] });
      setError(null);
      setSaved(`${res.version.field_key} published (version ${String(res.version.version)})`);
      resetForm();
    },
    onError: (err: unknown) => {
      // A failed publish wrote nothing, but the list may be stale relative to whatever caused the
      // failure (a concurrent publish), so refresh anyway.
      void queryClient.invalidateQueries({ queryKey: ['custom-fields', pariwarId] });
      setSaved(null);
      setError(describePublishError(err));
    },
  });

  const retire = useMutation({
    mutationFn: (definition: CustomFieldVersion) => {
      retireKeyRef.current ??= crypto.randomUUID();
      return publishCustomFieldDefinition(
        pariwarId,
        definition.host_entity,
        definition.field_key,
        // ⚠ The SAME endpoint, with `retired_at` set. Retirement IS a version: the server republishes
        // the current body unchanged with the column populated, so the retired version's shape stays
        // identical to the shape any stored values were written under.
        { definition: definition.definition, retired_at: new Date().toISOString() },
        retireKeyRef.current,
      );
    },
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['custom-fields', pariwarId] });
      setError(null);
      setSaved(`${res.version.field_key} retired`);
      setRetiring(null);
      retireKeyRef.current = null;
    },
    onError: (err: unknown) => {
      void queryClient.invalidateQueries({ queryKey: ['custom-fields', pariwarId] });
      setSaved(null);
      setError(describePublishError(err));
      setRetiring(null);
      // ⭐ [Review][Patch] Do NOT reset `retireKeyRef.current` here — mirrors `publish`'s onError. The
      // comment above (line 133-135) promises "a retried submit of the same decision reuses [the key]
      // and is idempotent"; clearing it on error broke that promise for exactly the destructive
      // action: a retry after a lost response (the original may have committed server-side) would mint
      // a NEW key and risk a second retirement version instead of replaying the first.
    },
  });

  return (
    <section aria-labelledby="custom-fields-heading">
      <h1 id="custom-fields-heading">Custom fields</h1>
      <p>
        Extra details this Pariwar records about its members, beyond what the system collects for
        everyone. Every field is versioned: publishing a change adds a new version and keeps the old
        one, so information already recorded stays readable. Fields are never deleted — they are
        retired, which stops new entries while keeping what members have already given.
      </p>

      {definitions.isLoading ? <p>Loading custom fields…</p> : null}
      {definitions.isError ? (
        <p role="alert">
          {/* A 403 on the READ must be distinguishable from an outage — an auditor who lacks the view
              key should be told so, not shown a generic failure. */}
          {definitions.error instanceof ApiError && definitions.error.status === 403
            ? 'You do not have permission to view custom fields in this Pariwar (pariwar.view_custom_fields is required).'
            : 'Could not load the custom fields.'}
        </p>
      ) : null}
      {saved ? <p role="status">{saved}</p> : null}
      {error ? <p role="alert">{error}</p> : null}

      {/* ── The in-force list ───────────────────────────────────────────────────────────────────── */}
      {inForce.length > 0 ? (
        <table>
          <caption>Live fields ({inForce.length})</caption>
          <thead>
            <tr>
              <th scope="col">Field</th>
              <th scope="col">Type</th>
              <th scope="col">Required</th>
              <th scope="col">Version</th>
              <th scope="col">Published by</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {inForce.map((d) => (
              <tr key={d.id}>
                <th scope="row">
                  {d.definition.label_en}
                  <br />
                  <small lang="hi">{d.definition.label_hi}</small>
                  <br />
                  <small>{d.field_key}</small>
                </th>
                <td>
                  {d.definition.field_type}
                  {d.definition.enum_values ? <small> ({d.definition.enum_values.join(', ')})</small> : null}
                </td>
                <td>{d.definition.required ? 'Yes' : 'No'}</td>
                <td>v{d.version}</td>
                <td>{d.actor_display ?? 'not recorded'}</td>
                <td>
                  {retiring === d.field_key ? (
                    <>
                      <span role="status">
                        Retire {d.definition.label_en}? Members keep what they have already entered; no
                        new entries will be accepted.
                      </span>{' '}
                      <button
                        type="button"
                        onClick={() => {
                          retire.mutate(d);
                        }}
                        disabled={retire.isPending}
                      >
                        Confirm retire
                      </button>{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setRetiring(null);
                          retireKeyRef.current = null;
                        }}
                      >
                        Keep it
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setRetiring(d.field_key);
                      }}
                    >
                      Retire
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : definitions.isSuccess ? (
        <p>This Pariwar has no custom fields yet.</p>
      ) : null}

      {/* ── The publish form ────────────────────────────────────────────────────────────────────── */}
      <h2>Add a field</h2>
      <p>{HINDI_NOTE}</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          publish.mutate();
        }}
      >
        <p>
          <label htmlFor="cf-field-key">Field key</label>
          <br />
          <input
            id="cf-field-key"
            value={fieldKey}
            onChange={(e) => {
              setFieldKey(e.target.value);
            }}
            required
          />
          <br />
          <small>
            A short name for the system, in lowercase with underscores — for example{' '}
            <code>school_block_code</code>. It cannot be changed after publishing.
          </small>
        </p>

        <p>
          <label htmlFor="cf-label-en">Label (English)</label>
          <br />
          <input
            id="cf-label-en"
            value={labelEn}
            onChange={(e) => {
              setLabelEn(e.target.value);
            }}
            required
          />
        </p>

        <p>
          <label htmlFor="cf-label-hi">Label (Hindi)</label>
          <br />
          <input
            id="cf-label-hi"
            lang="hi"
            value={labelHi}
            onChange={(e) => {
              setLabelHi(e.target.value);
            }}
            required
          />
        </p>

        <p>
          <label htmlFor="cf-field-type">Type</label>
          <br />
          <select
            id="cf-field-type"
            value={fieldType}
            onChange={(e) => {
              setFieldType(e.target.value as CustomFieldDefinitionBody['field_type']);
            }}
          >
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.value}
              </option>
            ))}
          </select>
          <br />
          <small>{FIELD_TYPES.find((t) => t.value === fieldType)?.help}</small>
        </p>

        {fieldType === 'enum' ? (
          <p>
            <label htmlFor="cf-enum-values">Choices</label>
            <br />
            <input
              id="cf-enum-values"
              value={enumValues}
              onChange={(e) => {
                setEnumValues(e.target.value);
              }}
            />
            <br />
            <small>
              Separated by commas. Choices can be added later, but never removed — entries already
              recorded under a removed choice would stop making sense.
            </small>
          </p>
        ) : null}

        <p>
          <label>
            <input
              type="checkbox"
              checked={required}
              onChange={(e) => {
                setRequired(e.target.checked);
              }}
            />{' '}
            Required
          </label>
        </p>

        <p>
          <label>
            <input
              type="checkbox"
              checked={indexed}
              onChange={(e) => {
                setIndexed(e.target.checked);
              }}
            />{' '}
            Often searched
          </label>
          <br />
          {/* ⚠ D5, said plainly to the operator: this records a REQUEST. Nothing in the database
              changes when it is ticked. Letting an admin believe otherwise would be worse than not
              offering the control. */}
          <small>
            This notes that the field will be searched often, so the team can speed it up later. It
            does not change anything by itself.
          </small>
        </p>

        <button type="submit" disabled={publish.isPending}>
          {publish.isPending ? 'Publishing…' : 'Publish field'}
        </button>
      </form>

      {/* ── History ─────────────────────────────────────────────────────────────────────────────── */}
      {history.length > 0 ? (
        <>
          <h2>History</h2>
          <p>
            Every version ever published, including retired fields. This is the record of what this
            Pariwar has recorded about its members and when.
          </p>
          {definitions.data?.has_more ? (
            <p role="status">
              Only the most recent versions are shown — this Pariwar has more history than fits here.
            </p>
          ) : null}
          <table>
            <caption>All versions ({history.length})</caption>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Version</th>
                <th scope="col">Effective</th>
                <th scope="col">Retired</th>
                <th scope="col">Published by</th>
              </tr>
            </thead>
            <tbody>
              {history.map((v) => (
                <tr key={v.id}>
                  <th scope="row">
                    {v.field_key}
                    {isInForce(v, inForceIds) ? <small> (live)</small> : null}
                  </th>
                  <td>v{v.version}</td>
                  <td>{v.effective_at.slice(0, 10)}</td>
                  <td>{v.retired_at ? v.retired_at.slice(0, 10) : '—'}</td>
                  <td>{v.actor_display ?? 'not recorded'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </section>
  );
}
