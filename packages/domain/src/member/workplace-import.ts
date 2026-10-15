// The workplace-list IMPORT and the district RENAME — the core behind `scripts/import-workplaces.ts` (Story 6.36a, Task 3;
// AC2; `2026-10-14-330` SW3, Task 1.1b).
//
// ⭐ THE PROFILE: the India Data Portal's *"UDISE – Basic Details of Schools"* CSV (SF1 — its verified columns). Kept: the
// rows of ONE UDISE state (the code's first two digits; Bihar `10`). A row without an 11-digit code or a name, a name /
// cluster / village carrying ANY control character (a line break, a tab, a NUL, U+0001…), or ANY cell carrying a NUL, is REFUSED; a code repeated in the file
// keeps its FIRST row (both counted, ⛔ fatal). `block_code` = the code's first six digits (the file has ⛔ no block NAME —
// SF2).
// ⭐ THE DISTRICT MAP (SF13): EVERY file district maps to the Pariwar's spelling through a required two-column CSV; ONE
// unmapped district REFUSES the whole run. Every mapped spelling is listed in `workplace_districts`; ⛔ an import never
// retires one — and a map naming a RETIRED spelling REFUSES the run unless `--relist-district` names it (a stale map must
// ⛔ never undo a rename).
// ⭐ ONE TRANSACTION, the batch row FIRST (`running`): the spellings; the upsert by `(pariwar_id, udise_school_code)` — 1,000
// rows per statement, ⛔ ever over a `source = 'staff'` row (`ON CONFLICT … DO UPDATE … WHERE workplaces.source =
// 'import'` — a staff row sharing a code is KEPT and counted); a corrected map MOVES a school's district; the DELISTING of a
// listed imported school absent from the file — ONLY within the districts the file contains (a one-district file ⛔ never
// delists the rest); the RE-LISTING of a delisted one present in it; the batch finished with its counts. ⛔ Never deletes.
// An UNCHANGED row is ⛔ written (a second identical run changes 0 rows).
// ⭐ THE RENAME (`--rename-district "<old>" "<new>"`, Task 1.1b): retires `<old>` FIRST (every writer reads its district
// `FOR SHARE`, so ⛔ no write lands on `<old>` during the move), lists `<new>`, moves EVERY workplace (import AND staff) and
// every OPEN request, keeps closed / confirmed requests and every posting on `<old>` (I2), and reports how many postings
// still carry `<old>` — a District Admin's grant must cover BOTH spellings until those members post again (SF13).
//
// The file is read and filtered BEFORE the transaction opens (`readWorkplaceImportFile` — every file-level refusal fires
// there, with ⛔ no connection held); the writes run on the caller's scoped transaction (`writeWorkplaceImport` under
// `withPariwarScope`), the batch row FIRST; the CLI rolls the transaction back for `--dry-run`.
//
// ⚠ DELIBERATE — NO HTTP ACTOR, NO AUDIT LINE, NO EVENT (review 2026-10-15, checklist 8 + 9). The import and
// `--rename-district` are PRIVILEGED list mutations (a rename moves EVERY workplace and open request of a district) run as a
// CLI under the operator's database login: ⛔ no HTTP actor exists to attribute them to, and ⛔ no audit / event pair is
// written. The `workplace_import_batches` row IS the record of each run — the source, its URL, the retrieval date, the
// licence, the attribution text, the state code and every count; a rename writes a `source_name = 'rename'` row. The
// only attribution is the database login the operator used. RATIONALE: Story 6.36a Task 3 specified the CLI and Task 1.2
// defined the batch row WITHOUT an actor column; 0161 is applied on both shared databases, so ⛔ no column is added here.
// RE-EXAMINATION TRIGGER: Story 6.36c's staff list / suggestion route — the FIRST HTTP caller of a list mutation — MUST
// carry the actor and the audit pair in the SAME transaction, and an actor column on the batch row lands with 6.36c's
// migration (0164). ⛔ An HTTP caller of `writeWorkplaceImport` / `renameWorkplaceDistrict` must never reuse this bypass.

import { and, eq, inArray, sql } from 'drizzle-orm';

import type { Db } from '../db.js';
import type { PariwarId, WorkplaceId, WorkplaceImportBatchId } from '../ids/index.js';
import { memberPostings } from '../schema/member_postings.js';
import { WORKPLACE_RENAME_SOURCE_NAME, workplaceImportBatches } from '../schema/workplace_import_batches.js';
import { workplaceDistricts } from '../schema/workplace_districts.js';
import { workplaceRequests } from '../schema/workplace_requests.js';
import { workplaces } from '../schema/workplaces.js';

/** The attribution ODC-BY §4.3 asks for, for the India Data Portal file (SW3). */
export const IDP_UDISE_ATTRIBUTION =
  'Contains information from UDISE – Basic Details of Schools (India Data Portal, ISB Bharti Institute), made available under the ODC Attribution License.';

/** The IDP profile's columns the import reads (SF1). */
export const IDP_REQUIRED_COLUMNS = ['district_name', 'school_name', 'udise_school_code', 'cluster_name', 'village_name', 'pincode'] as const;

/** Rows per upsert / update statement. */
const BATCH_SIZE = 1000;

/** A refusal of the WHOLE run (⛔ any write) — the CLI prints it and exits non-zero. */
export class WorkplaceImportRefusedError extends Error {
  public constructor(message: string) {
    super(`[workplaces:import] refused — ${message}`);
    this.name = 'WorkplaceImportRefusedError';
  }
}

// ── CSV ────────────────────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * A streaming RFC 4180 CSV reader: quoted fields (with `""` escapes, commas and line breaks inside), CRLF, LF or a lone CR
 * (classic-Mac endings) as the record end, a leading BOM dropped. Yields one record (an array of raw field strings) at a
 * time — the 400 MB IDP file is ⛔ never held.
 */
export async function* parseCsv(chunks: AsyncIterable<string | Buffer>): AsyncGenerator<string[]> {
  let field = '';
  let record: string[] = [];
  let inQuotes = false;
  let quotePending = false; // saw a `"` inside quotes — either an escape or the closing quote
  let afterCr = false; // an unquoted CR ended a record — a following LF belongs to it (CRLF), ⛔ a second record end
  let first = true;
  let sawAny = false;
  // A STREAMING decoder: a multi-byte character (Devanagari is 3 bytes) split across two Buffer chunks is reassembled,
  // ⛔ turned into two replacement characters.
  const decoder = new TextDecoder('utf-8');
  for await (const raw of chunks) {
    let chunk = typeof raw === 'string' ? raw : decoder.decode(raw, { stream: true });
    if (first) {
      if (chunk.charCodeAt(0) === 0xfeff) chunk = chunk.slice(1);
      first = false;
    }
    for (let i = 0; i < chunk.length; i += 1) {
      const c = chunk[i]!;
      sawAny = true;
      if (afterCr) {
        afterCr = false;
        if (c === '\n') continue; // the LF of a CRLF (possibly across a chunk boundary)
      }
      if (inQuotes) {
        if (quotePending) {
          quotePending = false;
          if (c === '"') {
            field += '"';
            continue;
          }
          inQuotes = false;
          // fall through to the unquoted handling of `c`
        } else if (c === '"') {
          quotePending = true;
          continue;
        } else {
          field += c;
          continue;
        }
      }
      if (c === '"' && field === '') {
        inQuotes = true;
      } else if (c === ',') {
        record.push(field);
        field = '';
      } else if (c === '\n' || c === '\r') {
        // LF, or a CR — a lone CR is a record end too (classic-Mac endings); the LF of a CRLF is swallowed above.
        record.push(field);
        yield record;
        record = [];
        field = '';
        afterCr = c === '\r';
      } else {
        field += c;
      }
    }
  }
  if (inQuotes && !quotePending) throw new WorkplaceImportRefusedError('the CSV ends inside a quoted field');
  if (sawAny && (field !== '' || record.length > 0)) {
    record.push(field);
    yield record;
  }
}

/** Header-keyed rows. The header must carry every name in `required`. */
export async function* csvObjects(records: AsyncIterable<string[]>, required: readonly string[]): AsyncGenerator<Record<string, string>> {
  let header: string[] | null = null;
  for await (const rec of records) {
    if (header === null) {
      header = rec.map((h) => h.trim());
      const missing = required.filter((r) => !header!.includes(r));
      if (missing.length > 0) throw new WorkplaceImportRefusedError(`the file has no column ${missing.map((m) => `"${m}"`).join(', ')}`);
      continue;
    }
    if (rec.length === 1 && rec[0] === '') continue; // a blank line
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = rec[i] ?? '';
    });
    yield row;
  }
  if (header === null) throw new WorkplaceImportRefusedError('the file is empty');
}

/**
 * The district map: a two-column CSV with the header `file_district,pariwar_district`. Each file district (trimmed) maps to
 * ONE Pariwar spelling (trimmed, 1–200 characters); a file district mapped twice to different spellings refuses the run.
 */
export async function readDistrictMap(records: AsyncIterable<string[]>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for await (const row of csvObjects(records, ['file_district', 'pariwar_district'])) {
    const from = (row['file_district'] ?? '').trim();
    const to = (row['pariwar_district'] ?? '').trim();
    if (from === '' && to === '') continue;
    if (from === '' || to === '' || [...to].length > 200) {
      throw new WorkplaceImportRefusedError(`the district map has an incomplete row ("${from}" → "${to}")`);
    }
    const prior = map.get(from);
    if (prior !== undefined && prior !== to) {
      throw new WorkplaceImportRefusedError(`the district map maps "${from}" twice ("${prior}", "${to}")`);
    }
    map.set(from, to);
  }
  if (map.size === 0) throw new WorkplaceImportRefusedError('the district map is empty');
  return map;
}

// ── The import ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface WorkplaceImportSource {
  readonly name: string;
  readonly url: string;
  /** `YYYY-MM-DD` */
  readonly retrievedOn: string;
  readonly licence: string;
  readonly attribution: string;
}

export interface WorkplaceImportInput {
  readonly pariwarId: PariwarId;
  /** The UDISE state code kept (two digits; Bihar `10`). */
  readonly stateCode: string;
  /** The IDP file's rows, header-keyed (`csvObjects`). */
  readonly rows: AsyncIterable<Record<string, string>>;
  /** file district → the Pariwar's spelling (`readDistrictMap`). */
  readonly districtMap: ReadonlyMap<string, string>;
  /** Retired spellings this run may list again (`--relist-district`). */
  readonly relistDistricts?: readonly string[];
  readonly source: WorkplaceImportSource;
}

export interface WorkplaceImportCounts {
  readonly batchId: WorkplaceImportBatchId;
  readonly rowsRead: number;
  /** Rows of another state — ignored (⛔ a column on the batch; printed). */
  readonly rowsOtherState: number;
  readonly rowsInserted: number;
  readonly rowsUpdated: number;
  readonly rowsDelisted: number;
  readonly rowsRelisted: number;
  readonly rowsRefused: number;
  readonly rowsDuplicate: number;
  readonly rowsSkippedStaff: number;
  readonly districtsRetired: number;
  /** Spellings this run listed for the first time / listed again (printed). */
  readonly districtsAdded: number;
  readonly districtsRelisted: number;
}

interface FileSchool {
  readonly code: string;
  readonly name: string;
  readonly district: string;
  readonly blockCode: string;
  readonly clusterName: string | null;
  readonly villageName: string | null;
  readonly pincode: string | null;
}

interface ExistingWorkplace {
  readonly workplaceId: WorkplaceId;
  readonly code: string;
  readonly source: string;
  readonly status: string;
  readonly name: string;
  readonly district: string;
  readonly blockCode: string | null;
  readonly clusterName: string | null;
  readonly villageName: string | null;
  readonly pincode: string | null;
}

const CODE_RE = /^[0-9]{11}$/;
const PIN_RE = /^[0-9]{6}$/;
/** A control character inside a NAME cell (RFC 4180 lets a quoted cell carry a line break — it would render as a multi-line row). */
// EVERY control character (`\p{Cc}` — C0 and C1, so a line break, a tab, a NUL, U+0001…): a name carrying one renders
// wrong, and a C0 control JSON-escapes to six bytes in the search cursor (the contract's bound assumes a clean name).
const LINE_CONTROL_RE = /\p{Cc}/u;
/** A NUL byte in ANY cell — Postgres refuses it as 22021 in the write phase, AFTER the batch row; refused here instead. */
const NUL = '\u0000';

function optionalText(v: string | undefined): string | null {
  const t = (v ?? '').trim();
  return t === '' ? null : t;
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Serialise imports and renames of ONE Pariwar (a transaction-scoped advisory lock). */
async function lockPariwarImports(db: Db, pariwarId: PariwarId): Promise<void> {
  await db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`workplace_import:${pariwarId}`}))`);
}

/** The optional text columns' bound (`cluster_name` / `village_name` have ⛔ a CHECK in 0161 — the reader is the bound). */
const OPTIONAL_TEXT_MAX = 200;

/** The file, read and filtered — the input of the write phase. */
export interface WorkplaceImportFile {
  readonly rowsRead: number;
  readonly rowsOtherState: number;
  readonly rowsRefused: number;
  readonly rowsDuplicate: number;
  /** The schools of the state kept, by code (the FIRST row of a repeated code). */
  readonly schools: ReadonlyMap<string, FileSchool>;
  /** Every well-formed code the file carries (a refused-but-present row is ⛔ delisted). */
  readonly presentCodes: ReadonlySet<string>;
}

/**
 * Phase ONE — read and validate the WHOLE file, ⛔ a connection held (the CLI calls it BEFORE `withPariwarScope`): the
 * state code, `--relist-district` against the map, every row; an unmapped district or a file with ⛔ no school of the state
 * REFUSES the run. Throws `WorkplaceImportRefusedError`; ⛔ a write.
 */
export async function readWorkplaceImportFile(
  input: Pick<WorkplaceImportInput, 'stateCode' | 'rows' | 'districtMap' | 'relistDistricts'>,
): Promise<WorkplaceImportFile> {
  if (!/^[0-9]{2}$/.test(input.stateCode)) throw new WorkplaceImportRefusedError(`"${input.stateCode}" is not a two-digit UDISE state code`);
  const mapTargets = new Set(input.districtMap.values());
  for (const d of input.relistDistricts ?? []) {
    if (!mapTargets.has(d)) throw new WorkplaceImportRefusedError(`--relist-district "${d}" is not a spelling in the district map`);
  }

  let rowsRead = 0;
  let rowsOtherState = 0;
  let rowsRefused = 0;
  let rowsDuplicate = 0;
  const unmapped = new Set<string>();
  const presentCodes = new Set<string>();
  const schools = new Map<string, FileSchool>();
  for await (const row of input.rows) {
    rowsRead += 1;
    const code = (row['udise_school_code'] ?? '').trim();
    const validCode = CODE_RE.test(code);
    // "Another state" ONLY on evidence: a valid code of another state, or a `state_code` column that NAMES another state. A
    // malformed code with ⛔ `state_code` column (⛔ in `IDP_REQUIRED_COLUMNS`) or a blank one is REFUSED, as the README says
    // (review 2026-10-15 R2-2 (a) — it was counted "other state" because `'' === stateCode` fell false).
    const fileStateCode = (row['state_code'] ?? '').trim();
    const otherState = validCode ? !code.startsWith(input.stateCode) : fileStateCode !== '' && fileStateCode !== input.stateCode;
    if (otherState) {
      rowsOtherState += 1;
      continue;
    }
    const name = (row['school_name'] ?? '').trim();
    const fileDistrict = (row['district_name'] ?? '').trim();
    const clusterName = optionalText(row['cluster_name']);
    const villageName = optionalText(row['village_name']);
    if (
      !validCode ||
      name === '' ||
      LINE_CONTROL_RE.test(name) ||
      (clusterName !== null && LINE_CONTROL_RE.test(clusterName)) ||
      (villageName !== null && LINE_CONTROL_RE.test(villageName)) ||
      Object.values(row).some((cell) => cell.includes(NUL)) ||
      [...name].length > 200 ||
      fileDistrict === '' ||
      (clusterName !== null && [...clusterName].length > OPTIONAL_TEXT_MAX) ||
      (villageName !== null && [...villageName].length > OPTIONAL_TEXT_MAX)
    ) {
      rowsRefused += 1;
      if (validCode) presentCodes.add(code);
      continue;
    }
    presentCodes.add(code);
    if (schools.has(code)) {
      rowsDuplicate += 1;
      continue;
    }
    const district = input.districtMap.get(fileDistrict);
    if (district === undefined) {
      unmapped.add(fileDistrict);
      continue;
    }
    const pin = (row['pincode'] ?? '').trim();
    schools.set(code, {
      code,
      name,
      district,
      blockCode: code.slice(0, 6),
      clusterName,
      villageName,
      pincode: PIN_RE.test(pin) ? pin : null,
    });
  }
  if (unmapped.size > 0) {
    throw new WorkplaceImportRefusedError(
      `the district map has no spelling for ${[...unmapped].sort().map((d) => `"${d}"`).join(', ')} — nothing was written`,
    );
  }
  // ⛔ A run that read NO school of the state (a header-only file; a wrong `--state`) — it would list every map spelling
  // with ⛔ a school behind it and flip the Pariwar to "has a list".
  if (schools.size === 0) {
    throw new WorkplaceImportRefusedError(
      `no school of state "${input.stateCode}" was read (rows read ${rowsRead}, other state ${rowsOtherState}, refused ${rowsRefused}) — nothing was written`,
    );
  }
  return { rowsRead, rowsOtherState, rowsRefused, rowsDuplicate, schools, presentCodes };
}

/**
 * Run ONE import inside the caller's scoped transaction: the read phase, then the write phase. ⚠ The read runs INSIDE the
 * open transaction here — the CLI calls the two phases separately (the file read BEFORE `withPariwarScope`); this form is
 * for a caller that already holds the transaction (the tests). Throws `WorkplaceImportRefusedError` (⛔ any write).
 */
export async function runWorkplaceImport(db: Db, input: WorkplaceImportInput): Promise<WorkplaceImportCounts> {
  return writeWorkplaceImport(db, input, await readWorkplaceImportFile(input));
}

/**
 * Phase TWO — the writes, inside the caller's scoped transaction: the stale-map check, the batch row FIRST (`running`), the
 * spellings, the schools, the delistings, the batch finished with its counts (AC2 — ONE transaction). Throws
 * `WorkplaceImportRefusedError` on a stale map (⛔ a write — the check precedes the batch row).
 */
export async function writeWorkplaceImport(
  db: Db,
  input: Pick<WorkplaceImportInput, 'pariwarId' | 'stateCode' | 'districtMap' | 'relistDistricts' | 'source'>,
  file: WorkplaceImportFile,
): Promise<WorkplaceImportCounts> {
  const relist = new Set(input.relistDistricts ?? []);
  const mapTargets = new Set(input.districtMap.values());
  const { rowsRead, rowsOtherState, rowsRefused, rowsDuplicate, schools: school, presentCodes } = file;

  await lockPariwarImports(db, input.pariwarId);

  // (2) The stale-map check — a RETIRED spelling in the map refuses the run unless `--relist-district` names it.
  const known = await db
    .select({ district: workplaceDistricts.district, status: workplaceDistricts.status })
    .from(workplaceDistricts)
    .where(eq(workplaceDistricts.pariwarId, input.pariwarId));
  const statusOf = new Map(known.map((k) => [k.district, k.status]));
  const stale = [...mapTargets].filter((d) => statusOf.get(d) === 'retired' && !relist.has(d));
  if (stale.length > 0) {
    throw new WorkplaceImportRefusedError(
      `the district map names the RETIRED spelling ${stale.sort().map((d) => `"${d}"`).join(', ')} (renamed earlier) — pass --relist-district to list it again; nothing was written`,
    );
  }

  // (3) The batch row FIRST.
  const [batch] = await db
    .insert(workplaceImportBatches)
    .values({
      pariwarId: input.pariwarId,
      sourceName: input.source.name,
      sourceUrl: input.source.url,
      retrievedOn: input.source.retrievedOn,
      licence: input.source.licence,
      attribution: input.source.attribution,
      stateCode: input.stateCode,
    })
    .returning({ batchId: workplaceImportBatches.batchId });
  const batchId = batch!.batchId;

  // (4) The spellings: every map target listed (a new one inserted; a retired one named by `--relist-district` listed again).
  const added = [...mapTargets].filter((d) => !statusOf.has(d)).sort();
  for (const part of chunks(added, BATCH_SIZE)) {
    await db
      .insert(workplaceDistricts)
      .values(part.map((district) => ({ pariwarId: input.pariwarId, district, sourceBatchId: batchId })))
      .onConflictDoNothing();
  }
  const relisted = [...relist].filter((d) => statusOf.get(d) === 'retired');
  if (relisted.length > 0) {
    await db
      .update(workplaceDistricts)
      .set({ status: 'listed', sourceBatchId: batchId, updatedAt: sql`now()` })
      .where(and(eq(workplaceDistricts.pariwarId, input.pariwarId), inArray(workplaceDistricts.district, relisted), eq(workplaceDistricts.status, 'retired')));
  }

  // (5) Classify against what the Pariwar already holds (by code).
  const existingRows = await db
    .select({
      workplaceId: workplaces.workplaceId,
      code: workplaces.udiseSchoolCode,
      source: workplaces.source,
      status: workplaces.status,
      name: workplaces.name,
      district: workplaces.district,
      blockCode: workplaces.blockCode,
      clusterName: workplaces.clusterName,
      villageName: workplaces.villageName,
      pincode: workplaces.pincode,
    })
    .from(workplaces)
    .where(and(eq(workplaces.pariwarId, input.pariwarId), sql`${workplaces.udiseSchoolCode} IS NOT NULL`));
  const existing = new Map<string, ExistingWorkplace>();
  for (const e of existingRows) if (e.code !== null) existing.set(e.code, e as ExistingWorkplace);

  const toWrite: FileSchool[] = [];
  let rowsInserted = 0;
  let rowsUpdated = 0;
  let rowsRelisted = 0;
  let rowsSkippedStaff = 0;
  for (const s of school.values()) {
    const e = existing.get(s.code);
    if (!e) {
      toWrite.push(s);
      rowsInserted += 1;
      continue;
    }
    if (e.source !== 'import') {
      rowsSkippedStaff += 1;
      continue;
    }
    const changed =
      e.name !== s.name ||
      e.district !== s.district ||
      e.blockCode !== s.blockCode ||
      e.clusterName !== s.clusterName ||
      e.villageName !== s.villageName ||
      e.pincode !== s.pincode;
    if (e.status === 'delisted') {
      rowsRelisted += 1;
      toWrite.push(s);
    } else if (changed) {
      rowsUpdated += 1;
      toWrite.push(s);
    }
  }

  // (6) The upsert — ⛔ ever over a staff row (the WHERE). A row a concurrent staff add took between (5) and here is ⛔
  // returned: it is counted as skipped AND taken back out of the bucket (5) put it in, so the finished counts still SUM
  // (review 2026-10-15 R2-2 (b)).
  const writtenCodes = new Set<string>();
  for (const part of chunks(toWrite, BATCH_SIZE)) {
    const back = await db
      .insert(workplaces)
      .values(
        part.map((s) => ({
          pariwarId: input.pariwarId,
          kind: 'school' as const,
          name: s.name,
          district: s.district,
          blockCode: s.blockCode,
          clusterName: s.clusterName,
          villageName: s.villageName,
          pincode: s.pincode,
          udiseSchoolCode: s.code,
          source: 'import' as const,
          importBatchId: batchId,
        })),
      )
      .onConflictDoUpdate({
        target: [workplaces.pariwarId, workplaces.udiseSchoolCode],
        set: {
          name: sql`excluded.name`,
          district: sql`excluded.district`,
          blockCode: sql`excluded.block_code`,
          clusterName: sql`excluded.cluster_name`,
          villageName: sql`excluded.village_name`,
          pincode: sql`excluded.pincode`,
          status: 'listed',
          importBatchId: sql`excluded.import_batch_id`,
          updatedAt: sql`now()`,
        },
        setWhere: sql`${workplaces.source} = 'import'`,
      })
      .returning({ code: workplaces.udiseSchoolCode });
    for (const b of back) if (b.code !== null) writtenCodes.add(b.code);
  }
  for (const s of toWrite) {
    if (writtenCodes.has(s.code)) continue;
    // A staff row with the same code appeared between the read and the write (6.36c's staff add) — it is KEPT.
    rowsSkippedStaff += 1;
    const e = existing.get(s.code);
    if (!e) rowsInserted -= 1;
    else if (e.status === 'delisted') rowsRelisted -= 1;
    else rowsUpdated -= 1;
  }

  // (7) The delisting — a LISTED imported school absent from the file, ONLY within the districts the file contains.
  const fileDistricts = new Set([...school.values()].map((s) => s.district));
  const toDelist = [...existing.values()]
    .filter((e) => e.source === 'import' && e.status === 'listed' && fileDistricts.has(e.district) && !presentCodes.has(e.code))
    .map((e) => e.workplaceId);
  let rowsDelisted = 0;
  for (const part of chunks(toDelist, BATCH_SIZE)) {
    const back = await db
      .update(workplaces)
      .set({ status: 'delisted', importBatchId: batchId, updatedAt: sql`now()` })
      .where(and(eq(workplaces.pariwarId, input.pariwarId), inArray(workplaces.workplaceId, part), eq(workplaces.source, 'import'), eq(workplaces.status, 'listed')))
      .returning({ workplaceId: workplaces.workplaceId });
    rowsDelisted += back.length;
  }

  const counts: WorkplaceImportCounts = {
    batchId,
    rowsRead,
    rowsOtherState,
    rowsInserted,
    rowsUpdated,
    rowsDelisted,
    rowsRelisted,
    rowsRefused,
    rowsDuplicate,
    rowsSkippedStaff,
    districtsRetired: 0,
    districtsAdded: added.length,
    districtsRelisted: relisted.length,
  };
  await finishBatch(db, input.pariwarId, batchId, counts);
  return counts;
}

async function finishBatch(db: Db, pariwarId: PariwarId, batchId: WorkplaceImportBatchId, c: WorkplaceImportCounts): Promise<void> {
  await db
    .update(workplaceImportBatches)
    .set({
      status: 'finished',
      finishedAt: sql`clock_timestamp()`,
      rowsRead: c.rowsRead,
      rowsInserted: c.rowsInserted,
      rowsUpdated: c.rowsUpdated,
      rowsDelisted: c.rowsDelisted,
      rowsRelisted: c.rowsRelisted,
      rowsRefused: c.rowsRefused,
      rowsDuplicate: c.rowsDuplicate,
      rowsSkippedStaff: c.rowsSkippedStaff,
      districtsRetired: c.districtsRetired,
    })
    .where(and(eq(workplaceImportBatches.pariwarId, pariwarId), eq(workplaceImportBatches.batchId, batchId)));
}

// ── The rename ─────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface DistrictRenameResult {
  readonly batchId: WorkplaceImportBatchId;
  /** Workplaces (import AND staff) moved to `<new>`. */
  readonly workplacesMoved: number;
  /** OPEN requests moved to `<new>`. */
  readonly requestsMoved: number;
  /** Postings that still carry `<old>` (⛔ ever rewritten — I2). A District Admin's grant must cover BOTH spellings. */
  readonly postingsOnOld: number;
}

/**
 * `--rename-district "<old>" "<new>"` in the caller's scoped transaction (Task 1.1b): the batch row (`rename`, ⛔ source
 * fields); `<old>` RETIRED FIRST; `<new>` listed; every workplace and every OPEN request moved; the batch finished
 * (`districts_retired = 1`, `rows_updated` = the workplaces moved). Refused when `<old>` is ⛔ a listed spelling or equals
 * `<new>`.
 */
export async function renameWorkplaceDistrict(
  db: Db,
  input: { readonly pariwarId: PariwarId; readonly from: string; readonly to: string },
): Promise<DistrictRenameResult> {
  const from = input.from.trim();
  const to = input.to.trim();
  if (from === '' || to === '' || [...to].length > 200) throw new WorkplaceImportRefusedError('--rename-district needs two non-empty spellings');
  if (from === to) throw new WorkplaceImportRefusedError(`"${from}" and "${to}" are the same spelling`);
  await lockPariwarImports(db, input.pariwarId);

  const [batch] = await db
    .insert(workplaceImportBatches)
    .values({ pariwarId: input.pariwarId, sourceName: WORKPLACE_RENAME_SOURCE_NAME })
    .returning({ batchId: workplaceImportBatches.batchId });
  const batchId = batch!.batchId;

  // RETIRE `<old>` FIRST — writers that check a district hold it `FOR SHARE`, so this waits for them, and they wait for us.
  const retired = await db
    .update(workplaceDistricts)
    .set({ status: 'retired', sourceBatchId: batchId, updatedAt: sql`now()` })
    .where(and(eq(workplaceDistricts.pariwarId, input.pariwarId), eq(workplaceDistricts.district, from), eq(workplaceDistricts.status, 'listed')))
    .returning({ district: workplaceDistricts.district });
  if (retired.length !== 1) throw new WorkplaceImportRefusedError(`"${from}" is not a listed district spelling of this Pariwar`);

  await db
    .insert(workplaceDistricts)
    .values({ pariwarId: input.pariwarId, district: to, sourceBatchId: batchId })
    .onConflictDoUpdate({
      target: [workplaceDistricts.pariwarId, workplaceDistricts.district],
      set: { status: 'listed', sourceBatchId: batchId, updatedAt: sql`now()` },
    });

  const moved = await db
    .update(workplaces)
    .set({ district: to, updatedAt: sql`now()` })
    .where(and(eq(workplaces.pariwarId, input.pariwarId), eq(workplaces.district, from)))
    .returning({ workplaceId: workplaces.workplaceId });
  const requests = await db
    .update(workplaceRequests)
    .set({ district: to })
    .where(
      and(
        eq(workplaceRequests.pariwarId, input.pariwarId),
        eq(workplaceRequests.district, from),
        inArray(workplaceRequests.state, ['pending', 'suggested']),
      ),
    )
    .returning({ requestId: workplaceRequests.requestId });
  const [postings] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(memberPostings)
    .where(and(eq(memberPostings.pariwarId, input.pariwarId), eq(memberPostings.district, from)));

  await finishBatch(db, input.pariwarId, batchId, {
    batchId,
    rowsRead: 0,
    rowsOtherState: 0,
    rowsInserted: 0,
    rowsUpdated: moved.length,
    rowsDelisted: 0,
    rowsRelisted: 0,
    rowsRefused: 0,
    rowsDuplicate: 0,
    rowsSkippedStaff: 0,
    districtsRetired: 1,
    districtsAdded: 0,
    districtsRelisted: 0,
  });
  return { batchId, workplacesMoved: moved.length, requestsMoved: requests.length, postingsOnOld: postings?.n ?? 0 };
}
