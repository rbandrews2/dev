````instructions
<!-- Proposed updated Copilot instructions for AI coding agents working on Work Zone OS -->

# Work Zone OS — Quick AI Agent Guide (Proposed)

Purpose: provide a focused, actionable guide for AI coding agents working in this repo — includes commands, architecture, file examples, and project-specific conventions.

- Quick start (dev):
  - `npm install`
  - `npm run dev` (Vite dev server, default: http://localhost:5173)
  - `npm run build` and `npm run preview` for production preview
  - `npm run lint` to run ESLint

- High-level architecture:
  - Vite + React (TypeScript) single-page app using `react-router-dom` for routing (`src/pages/`, `src/routes/`).
  - UI primitives live in `src/components/ui/` and commonly wrap Radix components.
  - Styling patterns use Tailwind + `class-variance-authority` (cva) and `tailwind-merge`.
  - Remote data via Supabase client at `src/lib/supabase.ts` and cached via `@tanstack/react-query` (see `src/App.tsx` for provider setup).
  - Global state is managed via React Contexts in `src/contexts/` (e.g. `AuthContext.tsx`).
  - `nextjs-components/` contains Next.js-targeted variants — reference only, do not change unless packaging.

- Key files and concrete examples:
  - `src/components/ui/button.tsx` — canonical `cva` pattern and exported `buttonVariants` used across the app.
  - `src/lib/utils.ts` — `cn(...args)` helper which composes `clsx` + `twMerge`.
  - `src/lib/supabase.ts` — Supabase client creation, respects `import.meta.env` variables.
  - `src/hooks/useOrgMessages.ts` — good example of `useQuery`/`useMutation` with Supabase and local caching/unread-count logic.
  - `src/App.tsx` — where `QueryClientProvider` and app-level providers are wired.

- Project-specific conventions (follow exactly):
  - File/Component naming: PascalCase files, React components exported with a displayName matching filename.
  - Reuse primitives in `src/components/ui/` rather than duplicating variants.
  - Use `cn()` for merging class names; avoid manual concatenation.
  - Data hooks should use stable `queryKey` shapes (e.g. `['messages', orgId]`) and invalidate on mutation success.
  - Use contexts in `src/contexts/` for cross-cutting app state rather than adding global singletons.

- Non-obvious details / gotchas:
  - There are no unit tests configured in this repo — `npm test` is not available.
  - `nextjs-components/` is a reference bundle — it is not the source-of-truth for the Vite app.
  - Many UI changes are global — editing `src/components/ui/*` or `tailwind.config.ts` can affect many pages; include a visual smoke test note in PRs.
  - Supabase credentials may be read from `VITE_SUPABASE_*` env vars; code includes fallbacks — prefer using env vars.

- PR checklist and reviewer guidance:
  - Use short conventional commit-style title (e.g. `feat:`, `fix:`).
  - Include in PR body:
    - `Builds locally: yes` (commands used)
    - `Lint: yes` (`npm run lint`)
    - `Manual smoke tested:` list of pages/components
    - `Notes for reviewer:` mention risky files (UI primitives, contexts, tailwind changes)
  - Recommended CI steps for PRs: install (`npm ci`), `npm run lint`, `npm run build`.

- Quick copyable patterns:
  - Button variant helper: `src/components/ui/button.tsx` — follow its `cva` signature and defaultVariants.
  - Class merging: `import { cn } from '@/lib/utils'` then `className={cn(buttonVariants({ variant, size, className }))}`
  - Data hook pattern: see `src/hooks/useOrgMessages.ts` for `useQuery` + `useMutation` + `queryClient.invalidateQueries` usage.

If you want this proposed file applied over `.github/copilot-instructions.md`, say so and I will replace the original. Otherwise tell me any sections to change or trim.

````