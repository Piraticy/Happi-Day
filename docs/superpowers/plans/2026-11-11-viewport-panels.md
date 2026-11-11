# Fit the journal to the window

Goal: Keep everyday check-ins and navigation in the viewport on phone and PC, move optional depth into pop-up panels, add safe gestures, and suppress installation promotion after a verified install.

Approach: Keep React, Supabase and the existing Little moments visual language. Use one native dialog component with focus restoration, Escape/close/backdrop controls and a draggable header; it becomes a bottom sheet on phone and a centered panel on PC. Allow scrolling inside long history/detail panels and at enlarged text sizes rather than clipping content. History pages through two moments; Little lifts pages through the daily activities. Keep the check-in draft mounted when changing sections. Touch horizontal swipes only start outside interactive/form content; cancel vertical/multitouch gestures. Navigation buttons and keyboard support remain primary alternatives.

- [x] Installation: regression tests for remount after appinstalled, related-app detection, storage errors, and a fresh install offer after uninstall. Persist only verified completion/standalone detection; never merely an accepted prompt. Add a self-related manifest entry.
- [x] Panels: native dialog, accessible title/close, focus restoration, Escape/backdrop and deliberate header-drag dismissal; test draft preservation.
- [x] Journal: compact viewport shell; reasons, today’s moments, schedule and account options in panels; preserve privacy and save error/retry behavior. Add guarded section swipes and keyboard nav.
- [x] History/lifts: bounded pages with readable notes available in detail panels; test paging and mood filters.
- [x] Test the suite/build, visually inspect PC and phone, exercise pointer gestures where tools permit, review, update docs and deploy through GitHub main.

Constraints: no new dependency, no auto-submission from a gesture, no swipe deletion, no offline queue, no cross-browser promise of installation detection. Small windows, soft keyboards and zoom may need internal scrolling to keep all controls accessible. Safari external installation cannot be enumerated from a normal Safari tab; standalone windows still hide the control.

Verification: 65 tests across ten files pass, and TypeScript/Vite production build passes. Native Chrome inspection before the final review fixes confirmed full desktop Today layout, native modal focus/inertness/draft retention, desktop header-drag dismissal, phone375×667 Save/navigation visibility, and a touch-emulated horizontal section swipe. Review reproduced and fixed nested Escape bubbling and modal-hidden save errors, with regressions. Undo/focus also stay inside the active panel. The native browser connection subsequently failed on two reconnect attempts, so the last minor changes could not receive a fresh visual pass. Physical phones and Windows installation remain untested. Release through main and verify the deployed static build.
