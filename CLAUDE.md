# Invoice Generator — Project Context

## Project Brief
See [PROJECT_BRIEF.md](./PROJECT_BRIEF.md) for full details.

## Directory Structure
```
src/
  domain/    — pure TypeScript: schema, types, money math, numbering
  storage/   — localStorage repository (only folder that touches localStorage)
  state/     — app store: React context + reducer
  features/  — feature UI: invoice-form, yaml-panel, preview, invoices, settings
  ui/        — shared primitives: Button, Field, Select, Dialog, Toast
  App.tsx    — app shell, routing, store provider
  main.tsx   — entry point
```

## Key Rules
- Money in YAML = decimal numbers. All math = integer minor units (cents/sen). Round half-up per line, then sum.
- Dates = ISO `YYYY-MM-DD` strings.
- Every input needs a label, keyboard reachability, visible focus, aria-live for errors.
- Run `npm run typecheck`, `npm run lint`, `npm test` before finishing any stage.
- Work only in your stage's folders. Minimal changes to shared files.

## Stages
1. **Scaffold** — Vite + React + TS, build/lint/test pass, directory structure
2. **Domain** — Zod schema, types, money math, numbering
3. **Storage** — localStorage repository with prefix scheme
4. **State** — React context + reducer
5. **Invoice Form** — form UI with validation
6. **YAML Panel** — live YAML preview
7. **Invoices List** — index management, CRUD
8. **Settings** — seller profile, numbering config
9. **Polish** — print CSS, toasts, accessibility audit
