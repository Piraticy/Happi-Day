# Notify open devices about app releases

The app already loads new deployments on reload, without a service worker. Add a public build-version file and a matching version embedded in the frontend. Check once a minute while visible, and on focus, visibility return and reconnection. A different valid version opens the existing Panel with Update now / Later. Later leaves an accessible reminder; it suppresses repeat popups for that release for this page session. A newer release can prompt again.

Reuse the native Panel, current palette and browser fetch. Do not force reload, clear storage, change authentication, cache journal responses, add push permissions or install dependencies. Warn that unsaved changes must be saved first; block update while a tracked request or an operation marked aria-busy is running. Track account mutations through completion even when their panel unmounts. Invalid/unreachable version responses quietly retry. Version requests time out and are aborted on unmount. The deployment serves version.json and index.html with no-store headers. Each production build emits a fresh random release ID, including rebuilds with changed environment settings.

A service worker would introduce private-cache and stale-client concerns; push notifications would require permissions and infrastructure. Public version polling fits this online app. Existing pre-feature clients need one initial manual reload; closed/offline devices cannot be remotely reloaded.

- Write tests for prompt/Later/update, session/data preservation, ongoing operations, polling, retry, hidden/offline states, timeout and cleanup.
- Implement version emission, global prompt and busy semantics at existing async controls.
- Run full tests/build, inspect emitted artifact and deployment headers; update README/design and publish to main/Vercel.
- Verify current production release and an older client's response to it where browser access is available; disclose physical-device gaps.

Validation: 91 tests pass across 12 files, including the pending-account-request panel-unmount regression (observed failing before the fix). Production TypeScript/Vite build passes. Release artifact matches the embedded client ID. Review found no remaining blockers. The mechanical design scan reported advisories only. Browser automation is unavailable, so rendered prompt layout, actual browser reload and physical phone/PC installed clients are not verified. Production HTTP/header checks follow publishing.
