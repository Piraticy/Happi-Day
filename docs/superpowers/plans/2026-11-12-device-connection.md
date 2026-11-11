# Connect an existing cloud journal to another device

The user has an existing cloud journal still open on their phone and wants its history on PC. Keep the phone's Supabase identity and rows; do not copy or share its auth tokens. A fresh PC anonymous session redeems a one-use, 80-bit code generated on the phone, valid for ten minutes. Server-side membership policies give that independently authenticated device access to the same owner rows. Owners can revoke devices. Devices with existing journal records cannot be silently switched or merged.

- [x] Add a migration with private hashed codes, atomic redemption, per-device attempt limits, owner-only issuance/revocation, revoked-device denial, and updated RLS using an effective journal owner.
- [x] Test SQL ownership isolation, both-device writes, code expiry/reuse/rate limits, ownership reassignment, revocation and existing-data protection using PostgreSQL/PGlite.
- [x] Resolve the effective owner on every repository operation. Reject writes against a changed owner; retain legacy self-only access only when the migration's context function is missing.
- [x] Add an isolated in-memory PC signup/connection flow so a failed code never installs a new blank journal session. Install only the PC's own verified session after redemption. Keep username creation separate and label it new journal.
- [x] Add phone-side code generation, expiry, copy control, connected-device list and removal in Journal options. Keep optional email recovery.
- [x] Verify real SDK integration with two isolated clients and review. Full suite: 81 tests passed, including PostgreSQL access policies and lost-response recovery. Setup docs updated.
- [ ] Verify production build/diff and deploy the frontend to main/Vercel; provide the tested SQL as the final administrator action.
- [ ] Apply the migration to live Supabase and verify physical phone-to-PC pairing (administrator action pending).

No SMTP, paid service, service-role browser key, shared refresh token, or automatic journal import. Existing phone data remains in place. Native Supabase admin access is currently unavailable; the migration must be applied before device pairing is enabled. Legacy journal reads/writes must keep working in the meantime.
