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
- **One transaction.** A district in the file with no row in the map refuses the WHOLE run — nothing is written. So does a
  map that names a spelling retired by an earlier rename (see below), unless `--relist-district "<that spelling>"` is
  passed.
- **What a run does:** lists every spelling in the map; inserts new schools; updates a school whose details (or mapped
  district) changed; DELISTS a listed imported school missing from the file — only within the districts the file
  contains, so a one-district file never touches the others; re-lists a delisted school that is back. Nothing is ever
  deleted: a delisted school is hidden from the picker and kept for every posting that names it. A row without an 11-digit
  code or a name is refused, and a code repeated in the file keeps its first row — both are counted, neither stops the
  run. A school added by the Super Admin with the same code is kept and counted ("kept staff rows").
- **`--dry-run`** does all of the above and rolls it back: the same counts, nothing written. A refused run is refused under
  `--dry-run` too.
- **A second identical run** changes nothing (it still records a batch row).

The batch row (`workplace_import_batches`) records the source, its URL, the retrieval date, the licence, the attribution
text and every count.

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
