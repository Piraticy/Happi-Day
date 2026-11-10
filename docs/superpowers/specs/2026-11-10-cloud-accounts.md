# Passwordless accounts and cloud history

The user requested real passwordless login and cloud history on any device, and selected Supabase. Preserve Little moments and the existing local demo while adding real email magic-link sign-in.

## Behavior

- Email sign-in/sign-up share one form, with honest sending, sent, error, retry, and expired-link states. Use Supabase's SDK for sessions and token refresh. No secret/service-role keys in browser code.
- Only authenticated accounts can access their cloud journal. A user's entries and settings never appear in another user's session. Clear in-memory cloud data on sign-out/account change; do not store cloud mood history in the demo's localStorage key.
- Store entries individually, and keep display name/schedule in a profile row. Use row-level security for select, insert, and update. Reject invalid moods, reason lists, note lengths, times, and user reassignment in the database.
- Confirm cloud writes before clearing a form or showing success. Disable duplicate submissions and preserve input on error. Stable entry IDs make retries idempotent.
- Refresh cloud history on window focus and provide an explicit refresh action. Avoid background reads overwriting an in-flight mutation. No whole-journal overwrites that can drop entries saved on a second device.
- Delete using a per-entry tombstone so undo and repeated local imports do not resurrect deleted data. Imported local IDs are scoped to the account. Existing records win duplicate imports.
- Import local entries only after the signed-in user chooses Import on this browser. Show the destination email and explain the shared-demo provenance. Keep the local original. Do not automatically assign local moods to whoever signs in first.
- A cloud load failure shows Retry, not an empty journal ready to overwrite real history. Missing configuration leaves the working local demo available and explains cloud sign-in is not configured.
- No offline write queue, notifications, account deletion flow, or new dashboard in this change.

## Provisioning and verification

The Supabase connection is pending. Prepare a versioned SQL migration, public environment-variable example, and setup instructions. Once connected, identify or create the user-approved project, apply migration, configure exact redirect URLs, and verify isolation. Custom SMTP is required for login emails to general users; Supabase's default sender is restricted to project-team addresses. A hosted frontend URL is needed to open the app directly on other devices. Do not claim production readiness until hosting and email delivery have been verified.

Test the SQL policies with two accounts and an unauthenticated role, plus client session isolation, delayed responses, failed writes, and explicit import. Keep the existing demo tests. Run the production build and browser-check login states and unchanged check-in layout.
