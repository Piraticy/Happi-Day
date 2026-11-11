# Username sessions and cloud storage

Production: https://happi-day-little-moments.vercel.app/

The live Supabase project `zwlaxqoyskjznycgcukm` (Happi-Day) is connected to Vercel. The owner applied the [database migration](../supabase/migrations/202611100001_cloud_journal.sql) successfully. Do not rerun it blindly or drop existing tables.

## Default entry

Enter a username and choose **Start my journal**. Supabase creates a private anonymous identity and persists its session in this browser. No email, password or SMTP is required. Each submitted mood saves to Supabase. Returning to the same browser restores the identity and loads history; Refresh history or refocusing the window reloads cloud changes. There is no offline write queue or realtime subscription.

A username is only a display label. Another browser entering the same name creates a separate private identity. Clearing site storage, using a private browser that discards its storage, or ending the session can remove access. Sign-out requires confirmation for anonymous identities. Connect the open original journal to another device with a one-use code (see below), or use an optional verified recovery email. There is no global one-user cap; do not disable all sign-ups while the username-entry flow is needed.

The client checks browser storage before creating the SDK client and before starting a session. It explicitly binds the SDK to localStorage so a cached memory-storage fallback cannot silently create an unrecoverable account. If storage was blocked at startup, allow it and reload.

## Provider configuration

In Authentication → Sign In / Providers:

- Allow new users to sign up: on (needed for new username sessions).
- Allow anonymous sign-ins: on.
- Allow manual linking: on (for optional recovery).
- Confirm email: on.

These settings were applied in the intended project. The public Auth settings endpoint confirms anonymous and email auth are enabled. Owner-based RLS applies to anonymous identities because they carry the authenticated role and their own auth.uid(). Unauthenticated requests to both tables return permission denied; never grant public anonymous reads to fix that response.

No CAPTCHA is configured for this personal preview. Supabase's default anonymous signup IP rate limits remain in place. Add CAPTCHA before broader public use; anonymous account creation can otherwise be abused to consume project resources. Never automatically delete old anonymous accounts: they may own a real journal.

## Connect an existing phone journal to PC

Apply [202611120001_device_connections.sql](../supabase/migrations/202611120001_device_connections.sql) once in the project SQL editor, after the original migration. This adds private code/membership tables and security-definer functions, then changes the existing six RLS policies to use the authenticated device’s effective journal owner. Original phone identities keep their rows. Direct access to device tables remains revoked; only authenticated RPCs can issue, redeem, list or revoke connections. Do not rerun the original migration or drop tables.

Follow [Connect your devices](connect-devices.md) for the phone and PC steps. Until the new migration is applied, original journals keep their existing self-only access and device controls show setup pending. The frontend falls back only for a missing owner function, not for other database errors. No SMTP or payment is needed for device codes.

The PC creates its own anonymous identity in memory. A failed code never installs a blank journal in its browser storage. Successful redemption connects that identity to the phone journal, then persists only the PC’s own authentication session. Phone authentication tokens are never transferred. The original phone can remove connected devices; their future database reads/writes are then denied. A device that already owns journal records cannot silently connect or merge them.

## Optional email recovery

Inside an anonymous journal, open **Journal options → Keep this journal accessible** and enter a recovery email. The app calls updateUser on the current identity, preserving its user ID and rows. Check the inbox and confirm the link before signing out or changing devices. A successfully requested email is not proof of verification. An email belonging to another account will not silently merge or switch journals.

After confirmation, use **Use an email link instead** on another device with the same verified address. The SDK uses implicit-flow callback detection and refreshes persisted sessions. This email route remains optional; starting a username session never sends an email.

The built-in email sender is limited to Supabase organization-member recipients, currently two authentication emails per hour. Custom SMTP is needed for general recipients. Enter SMTP credentials only in Supabase; never expose them as VITE_ variables.

## URLs and frontend configuration

Site URL and allowed production Redirect URL:

```text
https://happi-day-little-moments.vercel.app/
```

For local email recovery/testing, also allow the exact local root callbacks you use:

- `http://127.0.0.1:5173/`
- `http://localhost:5173/`

The app derives callbacks from the current origin, not redirect query parameters. Keep the default magic-link/confirmation templates appropriate for implicit flow.

Production Vercel environment variables and ignored local `.env.local` use:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

These are public browser values. Never put service-role keys, secret keys, database passwords or management tokens into VITE_ variables. Vite requires a rebuild when these values change. Deployment uses the existing happi-day-little-moments project in piraticys-projects; source uploads exclude all .env files and user data.

## Data and verification

Cloud entries remain separate from the browser-local demo. Import is always explicit and names the destination identity. The local original remains unchanged. RLS limits profiles/entries to the current identity’s effective owner: its own auth.uid() before connection, or the original journal owner after verified code redemption. Revoked devices have no effective owner. Rows are tombstoned rather than physically deleted.

81 tests pass, including SDK HTTP-boundary tests for signup, remembered session reopening, failure/retry, duplicate-submit prevention, duplicate-name separation, sign-out protection, recovery-email request/error handling, and PostgreSQL ownership rules. Device-specific checks cover two independent SDK clients, shared saves/refreshes, invalid and expired codes, response loss after redemption, attempt limits, protected existing journals, private device tables and revoked-device denial. The storage-blocked-startup regression was observed failing before the fix. Production build and diff checks pass.

A real username session was created in the local phone-preview browser against live Supabase, a test mood was saved, and full browser reload restored that session and its cloud history. Phone entry and Save were inspected at375×667. Real recovery-email delivery and confirmation have not been verified. The additional device migration is prepared and PostgreSQL-tested, but has not yet been applied to the live project. Physical phone-to-PC pairing and the new connection UI’s rendered layout have not been verified; browser automation was unavailable.

Free projects can pause after a week of inactivity and may require resuming in the dashboard. Free cloud storage is not an uninterrupted-availability or backup guarantee.

References: [anonymous identities](https://supabase.com/docs/guides/auth/auth-anonymous), [email links](https://supabase.com/docs/guides/auth/auth-email-passwordless), [SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
