# Happi-Day · Little moments

A mobile-friendly mood journal for small daily check-ins, private cloud history, and gentle wellbeing activities.

**[Open the live app](https://happi-day-little-moments.vercel.app/)**

## Features

- Five labeled moods: Low, Down, Okay, Good, and Great.
- Optional suggested reasons and a custom note of up to 500 characters.
- Three daily check-in times by default: 09:00, 14:00, and 20:00. Edit these, add more times, or record an extra moment whenever you want.
- Saved history with mood filtering, confirmed deletion, and undo.
- A compact phone interface with optional reasons and saved moments collapsed.
- **Little lifts:** 31 original wellbeing suggestions that rotate daily. Start with one activity, increase to two and at most three across distinct check-in days, and optionally try other ideas. Activities are always optional; the library eventually repeats.
- Username sessions backed by Supabase, with private cloud saves and remembered browser sessions.
- Optional verified email recovery and explicit import of browser-local demo entries.

## Username sessions and recovery

With Supabase configured, enter a username and choose **Start my journal**. No password or email is required to start. Supabase creates a private anonymous identity; the browser remembers its session, and each submitted check-in saves to the cloud. Returning to that browser restores the session and retrieves its history.

**A username is a display label, not a login credential.** Entering the same username in another browser creates a different private journal. Signing out or clearing browser data can remove access to an anonymous journal. The app warns before anonymous sign-out.

To access the same journal on another device, open **Keep this journal accessible**, add a recovery email, and confirm its link before leaving the original session. Then use **Use an email link instead** on the other device. Sending a recovery link does not mean the email has been verified.

History refreshes when the window regains focus or you choose **Refresh history**. There is no offline write queue or realtime subscription. Failed saves preserve the current check-in draft for retry.

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

1. Create a Supabase project and run [the database migration](supabase/migrations/202611100001_cloud_journal.sql) once. It creates profiles, mood entries, validation rules, and row-level security policies restricting records to their owner's `auth.uid()`.
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

Tests use the real Supabase SDK against a controlled HTTP boundary and PGlite's PostgreSQL engine for database validation and ownership policies. They do not send live authentication emails.

Real username entry, a cloud mood save, and history retrieval after a full browser reload have been verified against the live backend. Recovery-email delivery and cross-device email confirmation have not been live-tested; physical mobile devices have not been tested.

## Deployment

The live frontend runs on Vercel. [`vercel.json`](vercel.json) specifies the Vite framework, `npm run build`, and the `dist` output directory. Use Node.js 22.x and set the two public Supabase environment variables in Vercel before building. Changes to those values require a new deployment.

The existing Vercel project `happi-day-little-moments` is connected to `Piraticy/Happi-Day` on GitHub. Every push to `main` automatically starts a production build and updates the live URL after that build succeeds. Other branches use Vercel preview deployments. The Supabase configuration stays in the Vercel project’s environment variables; it is not committed to GitHub.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/CloudAccount.tsx`, `src/SessionRecovery.tsx` | Username sessions, optional email login/recovery, and account lifecycle |
| `src/cloud.ts` | Supabase configuration, granular cloud changes, and journal persistence |
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
