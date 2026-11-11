# Open your phone journal on a PC

Keep the phone’s existing **Cloud journal** signed in. A username alone creates a new journal; use the connection flow below to open the existing one.

## One-time project setup

In your Happi-Day Supabase project, open **SQL Editor → New query**. Paste the complete contents of [202611120001_device_connections.sql](../supabase/migrations/202611120001_device_connections.sql) and run it once. The original cloud-journal migration must already be present. Do not rerun the original migration or delete existing tables.

This migration keeps the phone’s identity and records in place. It adds explicit device access without SMTP, email or a paid service. It has been tested locally with PostgreSQL. A new project needs this migration applied once by its administrator; existing configured projects should not rerun it.

## Connect the PC

1. On the phone, reload the [live app](https://happi-day-little-moments.vercel.app/) to receive the update, keeping the same browser or installed app where your journal is open. Do not sign out or clear its storage. Choose **Refresh history**.
2. Open **Journal options → Connect another device → Generate connection code**.
3. On the PC welcome screen, choose **Connect existing journal**, enter the code and a device name, then choose **Connect my journal**. Do not choose Start my journal for this existing history.
4. Your phone history appears on the PC. Both devices save to the same journal. Saved changes are retrieved every 15 seconds while the app is visible and online, and when returning to the app or reconnecting. **Refresh history** also checks immediately.

A code works once and expires in ten minutes. Generating another code replaces the previous one. Keep it private: it grants journal access. Enter it directly into your PC app; do not send it in chat. Five redemption attempts are allowed per device identity in a fifteen-minute window. A failed or expired code does not replace your PC’s saved session.

If the PC already has a different cloud journal, use a fresh browser profile to connect without losing that journal’s remembered session. Connection does not merge journals. If the PC reports it connected but sign-in could not finish, keep that page open and choose **Finish connecting**.

## Manage access

On the original phone, open **Connect another device → Refresh devices**. Up to ten connected devices are supported. **Remove** ends that device’s future cloud access without deleting the phone’s history. Data already displayed on a removed device can remain visible until it refreshes or closes.

Each device has its own remembered authentication session. Connected devices can read and save, but only the original journal session can generate codes or remove devices. Keep that original session available, or add and verify an optional recovery email before losing it. Clearing browser storage can remove access; a username cannot recover a lost session.

Cloud saves and retrieval need an internet connection. There is no offline queue or instant realtime sync. Unfinished check-ins stay on the device where you are writing; only saved changes sync. Concurrent schedule edits use the last successful save. The feature uses the existing Supabase project and remains subject to its free-plan quotas and availability.

## Lost the original session?

See the [README recovery guide](../README.md#recovery-quick-guide). An administrator-issued code restores access through a connected device, not the original session. That connected device cannot generate further codes or remove devices from the dashboard. Keep it signed in; an administrator can issue another code for an additional device. Always copy all 20 characters from the SQL result cell, not the SQL itself.
