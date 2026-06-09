# src/ids/

**Landing Story: 1.7+** — Branded ID types emerge with Pariwar-Passport
(architecture §1.7 line 936-985).

TypeScript branded-type wrappers (`type PariwarId = string & { readonly __brand: 'PariwarId' }`)
live here so domain IDs cannot be accidentally interchanged. Empty at Story 1.2.
