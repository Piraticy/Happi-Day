# Mobile Little Lifts Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task by task.

**Goal:** Shorten phone check-ins, add progressive daily wellbeing activities, verify and publish to Vercel.
**Architecture:** Reuse journal entries for activity progression; deterministic local-calendar selection needs no new storage. Keep optional content collapsed and add one navigation destination.
**Tech Stack:** Existing React/TypeScript/Vite, Vitest, Supabase SDK, Vercel.
**Spec:** ../specs/2026-11-10-mobile-lifts-design.md

## Global constraints
Preserve existing journal storage and auth isolation. Increase activity count 1→2→3 across distinct check-in days; never require completion. No new dependencies. Never upload secrets or user data.

## Review focus
- Duplicate/future dates must not increase activity count.
- Local midnight/DST must refresh activities without requiring a reload.
- Alternate suggestions must remain unique and refresh when the calendar changes.
- Expanded notes must preserve save/retry behavior and keyboard access.
- Phone bottom navigation must not obscure Save, errors or confirmations.

### Task 1: Daily lifts
Files: src/lifts.ts, src/LittleLifts.tsx, src/lifts.test.ts, src/App.test.tsx.
- [x] Write and run failing tests for stable daily selection, different adjacent days, 1/2/3 progression, duplicate/future exclusion, alternate uniqueness and midnight update.
- [x] Implement curated suggestions and date-based rotation; render short readable activities and optional alternatives.
- [x] Run targeted tests.

### Task 2: Compact mobile UI
Files: src/JournalApp.tsx, src/CheckIn.tsx, src/styles.css, affected App/CloudAccount tests, DESIGN.md and Today surface brief.
- [x] Write and run failing test for optional reason disclosure; adapt save tests to open it explicitly.
- [x] Add Little lifts navigation; compact mobile rhythm link, collapsed saved moments, optional reason control and compact login.
- [x] Test input persistence, saves and all previous journal/cloud/database behavior.
- [x] Inspect phone and desktop renders, including small screens and expanded content.

### Task 3: Publish verified build
Files: deployment configuration and README.
- [x] Run full test suite, production build, diff check and dependency audit; independent review required.
- [x] Publish only intended public application source/static assets to a new Happi-Day Vercel project in piraticy's projects.
- [x] Verify remote READY state, HTTP/assets and browser check-in flow.
- [x] Record deployed URL and explicitly distinguish demo from pending live Supabase.

## Execution record

- Ruling: cap the requested gradual increase at three optional activities, based on distinct check-in days including today. This keeps daily effort small; deleting old entries can reduce the count. No new completion records or backend tables.
- Before implementation, optional-reason and Little lifts navigation tests failed for missing behavior; the lifts test failed because the module did not exist. Implemented rotation/count logic, then retained all prior storage/cloud/database tests.
- Verification: 36 tests across 6 files pass; TypeScript and Vite production build pass; git diff --check clean; npm audit reports 0 vulnerabilities (including dev dependencies).
- Phone: native Chrome DevTools emulation inspected at 390×844 and iPhone SE375×667. Core mood/Save visible above navigation; local and live check-in saves verified; alternate activity replaced successfully. Mobile welcome fits375×667. Expanded optional content retains natural scrolling.
- Desktop: live production rendered in Safari; brand, rail, check-in, collapsed reasons and side rhythm intact.
- Independent read-only review found tablet grid row overlap at761–1000px; fixed the invitation to row4 after its base rule. Reviewer verified21 targeted tests and reported no remaining important issues. No physical phone or native screen-reader testing was available.
- Final production deployment: dpl_GMXdfc9DdU8d1fhnn1Vh5X4yAnqS, READY, project prj_6FMyW1xnbAmLq1X284wKM9mrKfi3, team piraticys-projects. Production URL https://happi-day-little-moments.vercel.app/ . Build duration about9seconds.
- Anonymous HTTP200; fetched JS/CSS/favicon match tested local dist byte-for-byte. No matching production error/fatal runtime logs in the post-launch window; static browser exceptions are not covered by that log query.
- Only21 allowlisted app/config source files uploaded; .env, demo data, tests and SQL were excluded. No GitHub push/commit or automatic Git deployments configured.
- Supabase tool connection/config remains unavailable. Read-only native dashboard inspection showed no Happi-Day project. Real email delivery, callback configuration and cross-device cloud storage remain pending; hosted mode is explicitly labeled local demo.
