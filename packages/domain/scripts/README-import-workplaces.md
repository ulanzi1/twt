# `workplaces:import` — a Pariwar's school list, and its district spellings

Story 6.36a, Task 3 (`2026-10-14-330` SW3, Task 1.1b). The code is `src/member/workplace-import.ts`; the CLI is
`scripts/import-workplaces.ts`.

Each member picks their school (or office) from their Pariwar's list at signup and at every transfer. This tool fills the
SCHOOL half of that list from a CSV file. Offices — and any school the file misses — are added by the Super Admin
(Story 6.36c); this tool never touches those rows, except when it renames a district.

## Import a list

```sh
pnpm --filter @twt/domain workplaces:import -- \
  --pariwar <pariwar uuid> --state 10 \
  --file <the IDP CSV> --district-map <map CSV> \
  --source "UDISE – Basic Details of Schools (India Data Portal)" \
  --url https://ckan.indiadataportal.com/dataset/udise --retrieved YYYY-MM-DD \
  --licence ODC-BY-1.0 \
  --attribution "Contains information from UDISE – Basic Details of Schools (India Data Portal, ISB Bharti Institute), made available under the ODC Attribution License." \
  [--relist-district "<spelling>"]... [--dry-run]
```

- **The file** is the India Data Portal's *"UDISE – Basic Details of Schools"* CSV (the columns the tool reads:
  `udise_school_code`, `school_name`, `district_name`, `cluster_name`, `village_name`, `pincode`). It is about 400 MB for
  all of India; the tool streams it and keeps only the rows of `--state` (the first two digits of the 11-digit UDISE
  code — Bihar is `10`). ⚠ Never commit the file, and never download it in a test or in CI.
- **The district map** is REQUIRED: a two-column CSV with the header `file_district,pariwar_district`, one row per
  district name in the file, giving the spelling the Pariwar uses. ⚠ That spelling becomes every posting's `district`,
  which is compared **byte-for-byte** by the District Admins' permissions. Check every spelling against the District
  Admins' grants before a Pariwar goes live (go-live Row 31 (h)).
- **The arguments are checked first**, before the file is read: `--retrieved` must be a real calendar date, `--source`
  1–200 characters and not the reserved word `rename`, and `--url`, `--licence`, `--attribution` not blank. A bad value
  exits 1 with the reason.
- **Exit codes:** 2 = an argument / usage error (a missing or unknown flag, a flag without its value, a malformed
  `--pariwar`); 1 = a refused value (checked before the file is read) or a refused / failed run; 0 = done (also under
  `--dry-run`).
- **The file is read before anything opens.** The whole file is read and filtered first (no database transaction is held
  while it streams); only then does ONE transaction write. A district in the file with no row in the map refuses the WHOLE
  run — nothing is written. So does a file from which NO school of `--state` was read (a header-only file, or the wrong
  state code — every row "another state"): such a run would list every spelling in the map with no school behind it and
  switch the Pariwar's signup step to a list that holds nothing. So does a map that names a spelling retired by an earlier
  rename (see below), unless `--relist-district "<that spelling>"` is passed.
- **What a run does:** lists every spelling in the map; inserts new schools; updates a school whose details (or mapped
  district) changed; DELISTS a listed imported school missing from the file — only within the districts the file
  contains, so a one-district file never touches the others; re-lists a delisted school that is back. Nothing is ever
  deleted: a delisted school is hidden from the picker and kept for every posting that names it. A row without an 11-digit
  code or a name, whose cluster or village name is over 200 characters, whose name, cluster or village carries a line
  break, a tab or any other control character (inside a quoted cell), or any of whose cells carries a NUL byte, is refused, and a code repeated in the
  file keeps its first row — both are counted, neither stops the run. A row counts as "another state" only on evidence: a VALID
  code decides by its first two digits (the `state_code` column is then ignored); for a malformed code the `state_code` column
  speaks — naming another state counts it "another state", blank or absent refuses it. A
  school added by the Super Admin with the same code is kept and counted ("kept staff rows"). Line endings may be CRLF,
  LF or a lone CR.
- **`--dry-run`** does all of the above and rolls it back: the same counts, nothing written. A refused run is refused under
  `--dry-run` too.
- **A second identical run** changes nothing (it still records a batch row).

The batch row (`workplace_import_batches`) records the source, its URL, the retrieval date, the licence, the attribution
text and every count.

## Who ran it — attribution

This tool runs as a command under the operator's database login. There is no HTTP actor and no audit line: **the batch
row is the record** of every run — the source, its URL, the retrieval date, the licence, the attribution text, the state
code and the counts; a rename writes a `source_name = 'rename'` row. The login the operator used is the only attribution
of a run (the batch row has no actor column — Task 1.2 did not define one).

Story 6.36c re-examined this (Decision `2026-10-16-342` call 3), and it departs from what was first written here (that its
route must carry the actor and the audit line in the same transaction, and that an actor column on the batch row would
land with migration 0164):

1. **No actor column on the batch row.** The staff screens never run the import or the rename and never write a batch row,
   and this tool still has no HTTP actor — the column would always be empty.
2. **The staff actor is stored in the row it changes** — the staff member who adds an office or school
   (`workplaces.created_by_actor_id`) and the one who suggests a workplace for a request
   (`workplace_requests.suggested_by_actor_id`), in the same transaction as the change.
3. **The audit line is written after the commit, not in the same transaction**, and no event is written — the same as
   every other admin screen. A rename, delist, relist or close by staff records who did it only in that audit line.

This tool's own attribution is unchanged. The full record is in the module header of `src/member/workplace-import.ts`.

## Rename a district spelling

```sh
pnpm --filter @twt/domain workplaces:import -- --pariwar <uuid> --rename-district "<old>" "<new>" [--dry-run]
```

In one transaction: retires `<old>` first (so no member's posting can land on it while the move runs), lists `<new>`, moves
EVERY workplace (imported and staff-added) and every OPEN *"isn't listed"* request from `<old>` to `<new>`, and records a
batch row (`source_name = 'rename'`). Closed and confirmed requests keep `<old>`, and so does every posting — a posting is
never rewritten.

⚠ **After a rename, the tool prints how many postings still carry `<old>`.** Until those members post again, a District
Admin's grant must cover BOTH spellings, or that admin can no longer reach those members' claims. Before go-live, Row 31
(h) checks this; after go-live, this warning and this README are the check.

A later import whose map still names `<old>` is refused (a stale map must never undo a rename) unless
`--relist-district "<old>"` is passed.

## Dev and staging: never without a list

```sh
pnpm --filter @twt/domain workplaces:seed-fixture -- --pariwar <pariwar uuid>
```

imports the committed fixture (`tests/fixtures/workplaces-fixture.csv` — 31 made-up schools in two districts, `Patna` and
`Gaya`; NOT real data) with its map. A Pariwar with no list at all keeps the old free-text district box at signup.

## Before go-live (Row 31)

- (c) The PRODUCTION list's source and permission: an official list or written permission (the Ministry of Education's
  UDISE+ team, or Bihar's education department), and the app's attribution notice.
- (h) Every live Pariwar's list imported, its district map matched to the District Admins' grants.
