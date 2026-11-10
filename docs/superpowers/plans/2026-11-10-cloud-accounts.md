# Cloud accounts implementation plan

> Use superpowers:executing-plans inline; this is a continuation of the user's authorized build.

Spec: docs/superpowers/specs/2026-11-10-cloud-accounts.md

- [x] Add a Supabase client and granular cloud repository. Write and run failing tests before implementation.
- [x] Add a versioned SQL migration and real PostgreSQL policy tests with PGlite: two-user isolation, invalid rows, ownership changes, tombstones, and duplicate imports.
- [x] Convert check-in, schedule, deletion, and undo to awaitable saves while preserving the synchronous local-demo path.
- [x] Add the cloud session boundary, email magic-link welcome form, loading/error states, explicit local import, sign-out, focus refresh, and per-user data isolation tests.
- [ ] Apply/configure the connected Supabase project when available; verify actual email and two-user backend isolation without exposing credentials.
- [x] Verify the available browser flows, run the full suite/build, obtain an independent review, and update setup documentation.

Constraints: preserve existing user work and the approved visual system. Public publishable key only in Vite. No implicit upload of existing mood data. Provider connection and frontend hosting are external dependencies; report their actual state.

## Execution evidence

The 29 tests cover the existing local demo, actual Supabase SDK with controlled HTTP, and the SQL migration executed under PostgreSQL roles. No live project credentials were available. The plugin directory still reports Supabase installed=false, and no Supabase tools or project environment configuration are present. No live migration, SMTP setup, real login email, or hosting deployment has been claimed.

Independent review found two P2 retry bugs: a refreshed auto-selected slot could change a retry ID, and failed writes could strand refresh loading. Added reproducing tests, observed both fail, fixed both, and reran the green full suite/build. Auth changes also clear previous cloud data from memory.

Safari visual inspection confirmed the passwordless welcome, honest missing-configuration state, disabled send button, and available local-demo route. In-app automation was unavailable. The design detector reports advisory pre-existing gaps between DESIGN.md's abbreviated tokens and the full stylesheet; no unrelated design-system cleanup was performed.
