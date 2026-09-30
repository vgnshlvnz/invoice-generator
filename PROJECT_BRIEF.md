# Invoice Generator — Project Brief

## Goal
A browser-only invoice generator. Users fill in a friendly form. The app
generates a YAML document live. That YAML is the single source of truth and
is persisted in localStorage. No backend, no accounts, works offline.

## Stack (do not change without being asked)
- Vite + React 18 + TypeScript (strict)
- `yaml` (eemeli/yaml) for parse/stringify (keep key order, readable output)
- `zod` for schema validation
- Vitest + @testing-library/react for unit/component tests; Playwright for e2e
- Plain CSS modules + CSS custom properties (no UI framework); print CSS for PDF
- No other runtime dependencies unless a stage prompt allows it

## Architecture rules
- `src/domain/`   pure TS: schema, types, money math, numbering. No React, no DOM.
- `src/storage/`  localStorage repository. Only this folder touches localStorage.
- `src/state/`    app store (React context + reducer). Components never call storage directly.
- `src/features/<feature>/` UI per feature: form, yaml-panel, preview, invoices, settings.
- `src/ui/`       shared primitives (Button, Field, Select, Dialog, Toast).
- Money is stored in YAML as decimal numbers but ALL math uses integer minor
  units (cents/sen). Round half-up per line, then sum.
- Dates are ISO `YYYY-MM-DD` strings.

## Canonical YAML shape (schemaVersion 1)
```yaml
schemaVersion: 1
id: inv_01J...            # ULID-like, generated
number: INV-2026-0001
status: draft             # draft | sent | paid | void
currency: MYR
issueDate: 2026-10-01
dueDate: 2026-10-15
seller:
  name: ""
  email: ""
  phone: ""
  address: ""
  taxId: ""
  bank: { name: "", accountName: "", accountNumber: "" }
client:
  name: ""
  email: ""
  address: ""
  taxId: ""
items:
  - description: ""
    quantity: 1
    unitPrice: 0
    taxRate: 0            # percent, per line
discount: { type: none, value: 0 }   # none | percent | amount
notes: ""
terms: ""
# Computed totals are NEVER stored in YAML; they are derived at render time.
```

## localStorage keys (prefix everything)
- `invoicegen:v1:index`          JSON array of {id, number, client, total, status, updatedAt}
- `invoicegen:v1:invoice:<id>`   the invoice YAML string
- `invoicegen:v1:profile`        seller defaults + numbering settings (YAML)
- `invoicegen:v1:clients`        saved clients (YAML list)

## Quality bar
- `npm run typecheck`, `npm run lint`, `npm test` must pass before a stage is done.
- Every domain function has unit tests. Every feature has at least one component test.
- Accessible by default: labels on every input, keyboard reachable, visible focus,
  aria-live for errors and save status.
- Only touch the folders your stage owns. If you must change a shared file,
  keep the change minimal and mention it in your summary.
- End every stage with a short summary: what was built, files touched, how to verify.
