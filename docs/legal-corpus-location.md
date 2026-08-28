# Where the Trust's legal instruments live

**Short answer: ⛔ not in this repository, and that is deliberate.**

The Trust Deed, *Niyamavali*, Terms & Conditions, privacy policy and consent-gate copy are
version-controlled in a **separate private repository** — **`ulanzi1/twt-legal`** — which is their
**canonical home**.

Established 2026-08-28 by [Decision `2026-08-28-167`](../.decision-log.md#decision-2026-08-28-167),
as the mechanism satisfying the version-control requirement in
[`2026-08-21-144` cl.7(a)](../.decision-log.md#decision-2026-08-21-144).

---

## Why the split

| | `ulanzi1/twt` (this repo) | `ulanzi1/twt-legal` |
|---|---|---|
| Visibility | **PUBLIC** | **PRIVATE** |
| Holds the legal corpus? | ⛔ **No — excluded via `.gitignore`** | ✅ **Yes — canonical** |

⭐ **The instruments are UNEXECUTED, agent-drafted and unratified.** `trust-deed.md:7` says so on its
own face: *"**⚠️ DRAFT — NOT YET EXECUTED. NOT LEGAL ADVICE.** … It **must** be reviewed, corrected,
and settled by qualified Indian legal counsel and a chartered accountant."* The Deed was **prepared by
an agent, ⛔ not by counsel** (`2026-08-28-164` cl.1).

⇒ publishing them under the Trust's name on a **public** repo would invite a reader to take a **draft**
for the **operative instrument**. ⇒ they are excluded here and tracked there.

## ⛔ Two things not to do

1. ⛔ **Do not remove `docs/legal/` from `.gitignore`.** The absence **is** the control. A missing
   `docs/legal/` in this repo is ⛔ not a bug and ⛔ not an oversight.
2. ⛔ **Do not cite any of it as binding authority.** It is a **design reference** recording the
   Trust's intended operating model — ⛔ not an operative instrument.
   ⚠ A 2026-08-28 sweep found **348 citations across 54 files** in this repo, several treating the
   draft as **operative**, and **six in shipped code** (all comments). See
   `_bmad-output/planning-artifacts/deed-citation-alignment-sweep-2026-08-28.md`.
   ⭐ Citing the draft is legitimate; citing it **as though it binds**, with no qualifier, is not.

## Which record is which

- **Governance** — decisions, rulings, routing notes — lives **here**, in `.decision-log.md` and
  `_bmad-output/planning-artifacts/`.
- **Text** — the instruments themselves — lives in **`twt-legal`**.
- ⚠ **Amendments are drafting decisions:** routed and recorded **here** *before* the wording changes
  **there**. ⛔ The act of tracking never changes wording.

## Access

Counsel and trustees may be granted access to `twt-legal` as appropriate.
