# Little moments Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved mobile-friendly Happi-Day local demo.

**Architecture:** A React application with a small validated data module, browser-local persistence, and three views: Today, History, and Your rhythm. A separate welcome view explicitly enters a demo rather than authenticating an identity. Save data before updating UI state, and preserve unreadable storage.

**Tech Stack:** React, TypeScript, Vite, CSS, Lucide icons, self-hosted fonts, Vitest, Testing Library.

**Spec:** docs/superpowers/specs/2026-11-10-mood-tracker-design.md

## Global Constraints

- Local-only work; do not deploy or push.
- Little moments: peach ground, plum ink, coral actions, labeled mood faces.
- Three daily times default to 09:00, 14:00, 20:00; edit times and add slots.
- Reasons are optional; preset reasons and custom text both work.
- Clearly labeled demo; no real auth, cloud sync, or notifications.
- Never overwrite unreadable stored data silently.

## Review Focus

- Storage denied or full: keep unsaved form text and report the error.
- Midnight and time zones: group entries by the device's local date.
- Double saves or missed slots: permit extra entries without claiming missed reminders were delivered.
- Invalid storage and unsupported versions: preserve the existing value and block writes until recovered.
- Mobile keyboard, long text, focus, and empty history: preserve usable controls and readable layout.

### Task 1: Data and project setup

**Files:** package.json, index.html, tsconfig.json, vite.config.ts, src/model.ts, src/model.test.ts, .gitignore.

**Interfaces:** Mood enum, ScheduleSlot, Entry, Journal; freshJournal(), localDay(), validateSchedule(), readJournal(), writeJournal(), makeEntry().

- [x] Install the minimal React toolchain and local fonts.
- [x] Write failing tests for defaults, local dates, input validation, corrupt data, and failed writes; run `npm test` and confirm failure.
- [x] Implement the data module; run `npm test` and confirm passing results.

### Task 2: Full interface

**Files:** src/App.tsx, src/CheckIn.tsx, src/History.tsx, src/Schedule.tsx, src/Icons.tsx, src/main.tsx, src/styles.css, src/App.test.tsx.

**Interfaces:** Components consume the Journal and persist changes through the app's save function. Today shows immediate check-in controls and today's entries. Schedule saves a validated draft. History groups the same persisted entries.

- [x] Write failing UI tests for welcome entry, mood/custom reason save, additional entry, schedule edit/add, history and deletion; run and confirm failure.
- [x] Implement the approved layout at mobile and desktop widths with accessible native controls.
- [x] Implement confirmation, undo deletion, empty state, storage error recovery, and leave-demo behavior.
- [x] Run tests and `npm run build`; verify passing outputs.

### Task 3: Browser verification and handoff

**Files:** README.md, DESIGN.md, .impeccable/design.json, .impeccable/surfaces/today.md.

- [x] Launch local Vite preview and inspect welcome, Today, history, schedule, focus, and phone/desktop layouts.
- [x] Run the design detector once and obtain an independent final review; resolve material findings.
- [x] Document the visual system and local run commands.
- [x] Re-run tests and production build; leave the local preview available.

## Execution record

- User explicitly requested building after selecting Little moments. Proceed inline without another approval round.
- This is a dedicated fresh clone for this task. Use feature branch codex/little-moments here rather than copying it into a second checkout.
- No existing app code, dependencies, tests, or user data to migrate.
- Data tests: 7 passed. UI tests: 7 passed, including persistence failure, schedule remount, fourth entry, leave demo, deletion confirmation/focus/undo, and corrupt-data protection.
- Independent review identified keyboard focus loss on deletion confirmation; a reproducing test failed before the fix and the full suite passed after. Follow-up review scored both that fix and first-viewport phone spacing resolved, scoped disposition ship.
- Mechanical design detector returned an empty findings list. Native browser inspection used Safari desktop and Chrome device preview at 390×844; no live screen reader or physical phone keyboard was available.
- The documentation helper wrote DESIGN.md before stopping because its workspace credit budget was exhausted. The primary agent completed and structurally checked .impeccable/design.json from the shipped stylesheet and document.
