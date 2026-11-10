# Username Sessions Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement inline.

**Goal:** Username entry, remembered private cloud sessions, optional verified recovery, no passwords.
**Architecture:** Existing Supabase session subscription and RLS repository; anonymous signup carries display metadata. New SessionRecovery component links email to the existing identity.
**Tech Stack:** Existing React, Supabase SDK, Vitest, PostgreSQL policy tests, Vercel.
**Spec:** ../specs/2026-11-10-username-sessions.md

## Global constraints
Username is a display label, not authentication. Keep auth.uid ownership, cloud/local separation and errors. No token export or new dependencies. Disclose browser/session loss and confirm sign-out.

## Review focus
Duplicate names remain separate; storage failure does not create an unrecoverable account; repeated submit does not create duplicate identities; reload reuses the session; recovery failure preserves cloud data; linking a taken email never silently switches owners.

### Task 1: Session entry and recovery
Files: src/CloudAccount.tsx, src/SessionRecovery.tsx, src/JournalApp.tsx, src/CloudAccount.test.tsx.
- [x] Add and run failing SDK HTTP-boundary tests for username signup/save/reopen, storage failure, signup failure retry, sign-out protection, recovery update payload and owner continuity.
- [x] Implement username default entry, optional email route, saved-session handling, recovery UI and sign-out confirmation.
- [x] Adapt existing email tests to choose email route explicitly; run full tests/build.

### Task 2: Enable and publish
Files: docs/supabase-setup.md, README.md, PRODUCT.md and design surface brief.
- [x] Enable anonymous sign-ins and manual linking in the intended live Supabase project; verify public auth settings and owner isolation.
- [x] Independent security/correctness review; fix important findings with tests.
- [x] Publish tested source to existing Vercel project; inspect mobile username form and real cloud save/reopen.
- [x] Document real verification and limits without claiming anonymous username alone restores across devices.

## Execution record

- Implemented default username→anonymous Supabase signup with first_name display metadata; persisted private session remains the sole credential. No password, email or shared username access required for entry. Existing email login remains optional.
- Added optional recovery-email linking to the current anonymous user via updateUser. Sending success explicitly requires confirmation before recovery is ready. Kept email confirmation enabled and manual linking enabled. No live email sent by the agent.
- New SDK boundary tests first failed for missing Username/entry behavior; implemented and adapted older email tests.44 tests across6 files now pass, including storage rejection, signup retry, duplicate submit, duplicate name isolation, sign-out confirmation, recovery failure and existing database/account isolation.
- Independent reviewer found P2: SDK can cache memory storage if startup storage is blocked, then continue without persistence after permissions change. A regression failed with a non-null unpersisted client; fixed cloudSetup to probe before construction, return allow-storage/reload guidance and explicitly bind localStorage. Native full page reload subsequently retained the real live anonymous identity and loaded its saved cloud mood.
- Enabled anonymous sign-ins and manual linking in Happi-Day project zwlaxqoyskjznycgcukm. Retained email confirmation, owner-only RLS and provider rate limits. Public Auth settings confirm anonymous/email enabled. No schema changes or public table grants.
- Native Chrome Guest at375×667: entered Preview against live Supabase from localhost, saved a Good mood, fully reloaded and observed Session: Preview plus1 planned check-in restored from cloud. Recovery/import controls moved below page content to retain phone Save visibility. No actual user's entries were imported.
- Production deployment dpl_Ehi7PzgiPDHvgw5VsormqBLFfLt1 is READY at https://happi-day-little-moments.vercel.app/ . Uploaded22 allowlisted public source/config files, no .env or session data. Anonymous HTTP200; fetched JS/CSS/favicon bytes match current local production build. Build passes and diff check is clean.
- Ruling: this does not enforce a global single-user cap, because new independent username sessions require signup. Every auth.uid remains private. No private session tokens are exported or indexed by username.
- Ruling: anonymous personal preview retains Supabase IP signup rate limits and no CAPTCHA; add CAPTCHA before broader public use. Captcha, recovery-email delivery/confirmation on actual devices, and a physical phone are unverified. Free project inactivity pauses still apply.
