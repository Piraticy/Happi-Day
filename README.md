# Happi-Day · Little moments

A mood journal for small daily check-ins, private cloud history, and gentle wellbeing activities on phone and desktop.

**[Open the live app](https://happi-day-little-moments.vercel.app/)**

## Features

- Five labeled moods: Low, Down, Okay, Good, and Great.
- Optional suggested reasons and a custom note of up to 500 characters.
- Three daily check-in times by default: 09:00, 14:00, and 20:00. Edit these, add more times, or record an extra moment whenever you want.
- Saved history with mood filtering, confirmed deletion, and undo.
- A window-sized phone and PC interface with reasons, saved moments, account options and schedule editing in pop-up panels.
- A wider desktop workspace with a persistent navigation rail and side-by-side check-in and daily rhythm. History pages through two moments; long notes open in a detail panel.
- An installable web app with its own window and app icon. The install button hides after confirmed installation, across reloads in the same browser profile, and inside standalone app windows.
- New-release prompts on open phone, PC and installed-app sessions, with **Update now** and **Later**.
- Touch swipes between Today, Little lifts and History outside forms and controls. Drag a panel header down, press Escape, or use its close button. Arrow keys move focus through navigation.
- **Little lifts:** 31 original wellbeing suggestions that rotate daily. Start with one activity, increase to two and at most three across distinct check-in days, and optionally try other ideas. View one daily activity at a time with Previous/Next controls. Activities are always optional; the library eventually repeats.
- Username sessions backed by Supabase, with private cloud saves and remembered browser sessions.
- Connect an existing phone journal to a PC using a private, one-use code; no email or password required. Requires the additional device-connection migration.
- Optional verified email recovery and explicit import of browser-local demo entries.

## Username sessions and recovery

With Supabase configured, enter a username and choose **Start my journal**. No password or email is required to start. Supabase creates a private anonymous identity; the browser remembers its session, and each submitted check-in saves to the cloud. Returning to that browser restores the session and retrieves its history.

**A username is a display label, not a login credential.** Entering the same username in another browser creates a different private journal. Signing out or clearing browser data can remove access to an anonymous journal. The app warns before anonymous sign-out.

To access your open phone journal on a PC without email, follow [Connect your devices](docs/connect-devices.md). On the phone, choose **Journal options → Connect another device → Generate connection code**. On the PC welcome screen, choose **Connect existing journal** and enter that code. The phone stays signed in, and both devices read and save the same cloud history. Codes expire after ten minutes and work once. Apply the additional SQL migration below before pairing.

Optional email recovery remains available: open **Journal options → Keep this journal accessible**, add an email, and confirm its link before leaving the original session. Then use **Use an email link instead** on the other device. Sending a recovery link does not mean the email has been verified.

History refreshes when the window regains focus or you choose **Refresh history**. There is no offline write queue or realtime subscription. Failed saves preserve the current check-in draft for retry.

## Install on a PC

Open the [live app](https://happi-day-little-moments.vercel.app/) in a regular **Chrome or Edge** window, then choose **Install app** in the upper-right corner. If the native prompt is not available, the button shows instructions: use the browser’s address-bar install icon or menu install option. The app opens in its own window and uses the same online backend. Installation support and prompts depend on the browser; Guest/private windows may not allow installation. See [MDN’s installation guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

Installation is remembered only after `appinstalled`, standalone launch or a positive browser installation check. A newly available native install offer clears the remembered flag, so reinstalling remains possible. Supporting browsers can also find an older installation through the manifest’s self-reference and `getInstalledRelatedApps()`; other browsers may not expose an installation made elsewhere. See [Chrome’s detection guide](https://developer.chrome.com/docs/capabilities/get-installed-related-apps). Safari’s installed window hides the button, but a regular Safari tab cannot reliably enumerate its Dock apps.

On supported Macs, Safari also offers **File → Add to Dock**. Safari’s installed app has separate local storage: keep the original journal open, then use a connection code to open it in the installed app, or confirm a recovery email and use email login. A username alone cannot recover it. See [WebKit’s storage explanation](https://webkit.org/blog/14787/webkit-features-in-safari-17-2/).

Cloud saves and history require an internet connection. There is no service worker, offline cache or offline sync queue; this avoids caching private API responses or serving stale app versions. This is a browser-installed app, not a Windows `.exe` package. Updates arrive from the live site when the app reloads online.

The 192px and 512px app icons in `public/icons/` are rasterizations of the project’s authored `public/favicon.svg`, rendered at 1024px with macOS `sips`, then downsampled. Their background fills the square for maskable icon support. They contain no third-party or generated imagery.

## App updates on all devices

Open the live app online and reload it once to receive the update checker. After that, the app checks its public release version every minute while visible, and when you return to it or reconnect. A new release opens **An update is ready** with **Update now** and **Later**. The same postponed release leaves an **Update available** reminder without repeatedly opening its panel; a different release can prompt again.

Choose **Later** to finish a check-in. **Update now** reloads the app without clearing saved journal data or the remembered sign-in. Save unfinished check-ins and schedule changes first: they are not saved automatically by an update. Reload is blocked while a save, sign-in or other marked account operation is running.

The build emits `version.json` with the same release ID embedded in its JavaScript. Vercel serves that file and the entry HTML with `no-store` headers; hashed assets keep normal caching. Failed, invalid or timed-out checks retry quietly. No service worker, notification permission or push subscription is used, and version checks send no journal or account data.

A device running code from before this feature needs the initial manual reload. Closed, offline or suspended apps cannot be prompted until they open or resume online. This is an in-app update prompt, not a background system notification.

## Using the fitted interface

**Journal options** is the profile/settings control at the top-right. It contains device connections, recovery, optional demo import, and sign-out. Reasons and Today’s moments open over the check-in without expanding the page; closing the reason panel retains the draft. Switching sections also keeps the unfinished check-in. Save still submits the entry explicitly.

The shell fills the available viewport. Long lists and details scroll inside their own content area or panel when needed, including short landscape windows, enlarged text and soft keyboards. Content is not clipped merely to eliminate scrolling. The everyday check-in was visually checked at 375×667 and on a laptop-sized desktop window.

## Run locally

Use **Node.js 22.x, version 22.12.0 or later**, and npm.

```sh
git clone https://github.com/Piraticy/Happi-Day.git
cd Happi-Day
npm ci
npm run dev
```

Open the URL printed by Vite, normally [http://127.0.0.1:5173/](http://127.0.0.1:5173/).

Without Supabase environment variables, the app opens a clearly labeled local demo. Enter a first name and choose **Enter demo** to try the journal without any backend setup.

## Configure Supabase

Follow the [Supabase setup guide](docs/supabase-setup.md) for the full procedure.

1. Create a Supabase project and run [the database migration](supabase/migrations/202611100001_cloud_journal.sql) once. It creates profiles, mood entries, validation rules, and row-level security policies restricting records to their owner's `auth.uid()`. Then run [the device-connection migration](supabase/migrations/202611120001_device_connections.sql) once to allow explicitly connected devices to access that same owner's journal. This keeps existing identities and data in place; it does not copy rows or open public access.
2. Enable **Allow new users to sign up**, **Allow anonymous sign-ins**, and **Allow manual linking** in Authentication → Sign In / Providers. Keep **Confirm email** enabled.
3. Copy `.env.example` to `.env.local` and set the public connection values:

   ```dotenv
   VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
   ```

4. Restart the development server. For email recovery, allow your exact callback URL in Authentication → URL Configuration. Production uses `https://happi-day-little-moments.vercel.app/`; local development can use `http://127.0.0.1:5173/`.

Only the project URL and publishable key belong in `VITE_` variables. Never add a secret/service-role key, database password, or SMTP credential: Vite exposes these variables to the browser. `.env.local` is ignored by Git.

Username sessions do not require SMTP. Supabase's built-in email sender supports only organization-member recipients and has development rate limits. Configure custom SMTP for recovery emails to general recipients. Anonymous sign-ins currently use Supabase's IP rate limits; add CAPTCHA before broader public use. See the [official anonymous-auth](https://supabase.com/docs/guides/auth/auth-anonymous) and [SMTP](https://supabase.com/docs/guides/auth/auth-smtp) documentation.

## Local demo and data boundaries

The local demo stores entries and preferences in localStorage under `happi-day:v1`; its active demo state uses sessionStorage. Everyone using that browser and origin shares this demo journal. Leaving the demo keeps entries; clearing site data removes them.

Cloud journals use separate Supabase identities and owner-based access rules. Demo entries are never uploaded automatically. **Import local entries** is an explicit choice, preserves the local original, and skips existing entry IDs. Localhost and the hosted site are separate browser origins.

Deleting a cloud entry creates a tombstone; undo restores it. Unreadable local data blocks writes rather than silently replacing the journal. Calendar days follow the device's local time zone.

## Development and checks

```sh
npm test        # model, UI, SDK integration, and PostgreSQL policy tests
npm run build  # TypeScript checks and Vite production build
npm run preview
```

Tests use the real Supabase SDK against a controlled HTTP boundary and PGlite's PostgreSQL engine for database validation and ownership policies. They do not send live authentication emails. Update tests cover multiple open clients, matching/new versions, postpone/reopen, unchanged storage/drafts, busy operations even after their panel closes, focus/visibility/reconnection, failed checks, timeout and unmount cleanup. Device tests cover independent phone/PC sessions, shared reads and writes, lost-response recovery, owner changes, one-use/expired codes, rate limits, existing-data protection, private membership tables and revocation. The device migration and physical phone-to-PC pairing have not yet been verified against the live backend.

Real username entry, a cloud mood save, and history retrieval after a full browser reload have been verified against the live backend. Recovery-email delivery and cross-device email confirmation have not been live-tested; physical mobile devices have not been tested. Installation lifecycle tests cover the prompt, cancellation, storage failures, persisted/standalone/related-app detection, reinstall offers and stale-query races. Panel tests cover nested Escape dismissal, focus, drafts, visible save failures and Undo; gesture tests cover horizontal, vertical, cancelled and form gestures. Chrome’s manifest inspector recognizes the app metadata and icons, but actual Windows installation has not been tested; the available Chrome Guest window blocks native installation.

## Deployment

The live frontend runs on Vercel. [`vercel.json`](vercel.json) specifies the Vite framework, `npm run build`, and the `dist` output directory. Use Node.js 22.x and set the two public Supabase environment variables in Vercel before building. Changes to those values require a new deployment.

The existing Vercel project `happi-day-little-moments` is connected to `Piraticy/Happi-Day` on GitHub. Every push to `main` automatically starts a production build and updates the live URL after that build succeeds. Other branches use Vercel preview deployments. The Supabase configuration stays in the Vercel project’s environment variables; it is not committed to GitHub.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/CloudAccount.tsx`, `src/SessionRecovery.tsx` | Username sessions, optional email login/recovery, and account lifecycle |
| `src/ConnectJournal.tsx`, `src/DeviceConnections.tsx` | Code-based connection, owner device controls, and independent device sessions |
| `src/cloud.ts` | Supabase configuration, granular cloud changes, and journal persistence |
| `src/AppUpdate.tsx`, `vite.config.ts` | Release detection, optional reload prompt, and build-version artifact |
| `src/InstallApp.tsx`, `public/manifest.webmanifest` | Browser installation prompt, fallback instructions, and standalone app metadata |
| `src/Panel.tsx`, `src/useSectionSwipe.ts` | Native pop-up panels and guarded touch navigation |
| `src/JournalApp.tsx` | Shared journal interface and local demo |
| `src/CheckIn.tsx`, `src/History.tsx`, `src/Schedule.tsx` | Mood entry, history, and daily times |
| `src/LittleLifts.tsx`, `src/lifts.ts` | Daily wellbeing activities and rotation |
| `src/model.ts` | Journal types, validation, local dates, and demo storage |
| `src/Icons.tsx`, `src/styles.css` | Authored mood faces and responsive visual design |
| `supabase/migrations/` | Database schema and access policies |
| `PRODUCT.md`, `DESIGN.md` | Product scope and the Little moments design system |

## Current limits

Scheduled times are a personal plan; notifications are not enabled. Little lifts offers general wellbeing suggestions and does not provide diagnosis, treatment, or a guaranteed mood improvement. Fonts are bundled locally.

Free Supabase projects can pause after a week of inactivity and require resuming in the dashboard. Cloud storage is not a guarantee of uninterrupted availability or a substitute for backups. See [Supabase's plan limits](https://supabase.com/pricing).

## License

[MIT](LICENSE) · Copyright 2026 Piraticy.
