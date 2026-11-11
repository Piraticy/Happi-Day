# Desktop layout and installation

Goal: Make Little moments comfortable on a PC and installable as a web app.

Approach: Keep the shared React application and Supabase sessions. Expand desktop content into the available width, retain the plum navigation rail, and place the check-in beside daily rhythm and visible saved moments. Keep phone behavior at 760px and below. Use a standard web app manifest with authored brand icons and a browser-native installation prompt, with clear manual instructions when the prompt is unavailable. Cloud history requires an internet connection; no offline queue or native Windows package is introduced.

- [x] Add focused tests for installation availability, dismissal, errors and installed state, plus desktop/mobile disclosure behavior.
- [x] Implement one installation control mounted throughout the app, manifest metadata and 192/512px PNG icons derived from the existing SVG.
- [x] Expand desktop layout and secondary pages, retaining readable prose and mobile controls.
- [x] Run all tests and production build; inspect desktop, intermediate and phone layouts; verify native manifest/install recognition where available.
- [x] Update README/design notes. Release through main and verify automatic Vercel deployment after pushing.

Review focus: Never claim installation completed before the browser confirms it. A dismissed or failed prompt must leave the journal usable. Keep session-bearing URLs and private API responses out of caches. Narrow windows must retain usable controls. Installation must not imply username-only recovery on a new browser profile.

Verification: 49 tests across seven files and the production build pass. Native Chrome inspection covered the laptop workspace, a wider viewport at 90% browser zoom, and iPhone SE emulation at 375×667. Manifest identity, start URL, standalone display and PNG sizes were recognized. Guest mode blocked native installation, so Windows install/launch remains a hardware/browser verification gap. Optional richer-install screenshots are omitted. Review removed the unnecessary viewport-fit=cover setting to retain Safari safe-area protection. No offline caching or separate executable was added.
