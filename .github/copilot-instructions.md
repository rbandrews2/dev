<!-- Copilot instructions for AI coding agents working on Work Zone OS -->

# Work Zone OS — Quick AI Agent Guide

Purpose: help an AI agent be productive immediately in this repo by surfacing the project architecture, common patterns, run/build commands, and key files to consult.

- Project type: Vite + React + TypeScript + Tailwind. Dev server: `npm run dev` (Vite, localhost:5173).
- Build: `npm run build` and preview with `npm run preview`.
- Lint: `npm run lint`.

Key locations (start here):
- `src/` — main app source. Pages under `src/pages/`, global components under `src/components/`.
- `src/components/ui/` — UI primitives and shared wrappers (e.g. `button.tsx`, `input.tsx`). Prefer reusing these when adding UI.
- `src/components/modals/`, `src/components/dashboard/`, `src/components/training/` — feature-local components follow the same naming and export patterns.
- `src/contexts/` — global contexts (e.g. `AppContext.tsx`, `AuthContext.tsx`) that manage app-level state and should be used instead of adding new global singletons.
- `src/lib/supabase.ts` — Supabase client; server/data access is centralized here. Use `@tanstack/react-query` for server-state and caching.
- `nextjs-components/` — Next.js-targeted variants; consult for component patterns but prefer `src/components/` for the app itself.
- `tailwind.config.ts`, `vite.config.ts` — build/utility config. Update cautiously; small changes affect all components.

Architectural patterns and conventions
- UI primitives: components in `src/components/ui/` wrap Radix primitives and use `class-variance-authority` + `tailwind-merge` for variants. Follow existing props/variant shapes.
- Component naming: PascalCase filenames and default named exports for React components (e.g. `TeamMemberCard.tsx` exports `TeamMemberCard`).
- State & data flow: feature components use local state + `contexts` for shared info; remote data uses the Supabase client + React Query hooks for fetching/mutations.
- Routing: `react-router-dom` is used; pages live in `src/pages/` (see `src/pages/Index.tsx`).
- Modals and panels: controlled via local state or context provider; look at `src/components/modals/*` for patterns (composition via children and Radix dialogs).

Examples to consult when implementing features
- Add a button variant: see `src/components/ui/button.tsx` for `cva` usage and variant props.
- Add a data-backed panel: see `src/components/time/TimeTrackingPanel.tsx` for usage of `react-query` + Supabase client.
- Certificate generation: `src/components/certificates/CertificateTemplate.tsx` and `jspdf` usage.

Developer workflows
- Install & run dev:
```
npm install
npm run dev
```
- Build for production:
```
npm run build
npm run preview
```
- Linting:
```
npm run lint
```

What NOT to assume
- There are no tests in the repo; do not attempt to run `npm test` (none present).
- `nextjs-components/` is a separate reference package — do not duplicate changes across both unless explicitly packaging for Next.js.

Notes for AI code edits
- Preserve public APIs and file exports. Keep changes minimal and focused.
- When changing UI primitives in `src/components/ui/`, run a quick visual smoke check locally — these changes ripple across the app.
- If you modify `tailwind.config.ts` or `vite.config.ts`, document the reason in the PR and search the repo for uses of any new utilities.

If any of these paths are unclear or you need more examples, ask for the specific feature to modify and I will point to concrete files.

**PR & CI Guidance**
- Common PR titles (keep it short; use conventional commits where possible):
	- `feat: add <feature>`
	- `fix: resolve <bug>`
	- `docs: update <docs>`
	- `chore: update deps` 
	- `style: formatting/typo` 
	- `refactor: <area> cleanup`
	- `test: add/update tests`
	- `ci: update workflow`
- Minimal PR checklist to include in body:
	- `Builds locally: yes` (run `npm run dev` or `npm run build`)
	- `Lint: yes` (run `npm run lint`)
	- `Manual smoke tested:` list pages/components checked (e.g. `Index`, `TimeTrackingPanel`)
	- `Notes for reviewer:` short context + any risky areas (UI primitives, global contexts, tailwind)
- CI notes:
	- This repo does not include a CI workflow file by default. Recommended GitHub Actions steps for PRs:
		- Install dependencies (`npm ci`) and run `npm run lint`.
		- Run `npm run build` to ensure the project compiles.
		- Optionally run lightweight smoke checks (lint + build) rather than full E2E.
- Example PR body snippet:
```
Summary: "feat: add X"

Checklist:
- Builds locally: yes
- Lint: yes
- Manual smoke tested: Index page, training flow

Notes for reviewer:
- Adds UI variant in `src/components/ui/button.tsx` — visual change may affect many pages.
```
