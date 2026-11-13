# Happi-Day

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Delegated: the user requested our recommendation for a simple React + TypeScript app. Use Vite for local development and a static production build.

## Users

People tracking how they feel throughout the day. The interface must work comfortably on mobile as well as desktop.

## Product Purpose

Make regular mood check-ins quick and simple. A person selects a mood and can explain it with a suggested reason or their own words.

## Operating Context

Users can check in whenever they want. Saving records the time automatically; there is no fixed daily schedule.

## Capabilities and Constraints

- Select a mood type.
- Select suggested reasons or enter a custom reason.
- Any number of spontaneous daily check-ins, each with an automatic timestamp.
- Passwordless login page. The user explicitly chose a clearly labeled local demo login for this first version.
- The user requested real passwordless sign-in and cross-device history, and selected Supabase. The live Supabase project and Vercel frontend are configured. The user subsequently chose username sessions without passwords.
- Preserve the separate browser-local demo. Cloud journals use remembered Supabase anonymous sessions with a username display label and owner-based row-level access rules. Optional verified email linking provides recovery and access from another device; username alone cannot recover an existing identity. Import local entries only after an explicit choice; never upload them automatically.
- Older scheduled entries remain in history. New entries are free check-ins. No notifications are sent.

## Brand Commitments

Happi-Day. The user asked for a simple, unique interface and explicitly selected Little moments: warm peach, plum, coral, and expressive labeled mood faces.

## Evidence on Hand

The initial repository contains README.md and an MIT LICENSE. There is no existing UI, artwork, or user data. Example data must be labeled as examples and must never be confused with a person's saved entries.

## Product Principles

- Keep a check-in brief and easy to complete.
- Let people express their own reason.
- Let people save a moment whenever they choose, with no daily target.
- Keep the interface mobile-friendly.
- Be explicit about the local demo's limitations.
