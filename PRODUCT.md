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

Three scheduled check-ins per day by default. Users can select their check-in times and increase the number of daily inputs.

## Capabilities and Constraints

- Select a mood type.
- Select suggested reasons or enter a custom reason.
- Three daily check-ins with an option to increase input.
- Passwordless login page. The user explicitly chose a clearly labeled local demo login for this first version.
- The user requested real passwordless sign-in and cross-device history, and selected Supabase. The live Supabase project and Vercel frontend are configured. The user subsequently chose username sessions without passwords.
- Preserve the separate browser-local demo. Cloud journals use remembered Supabase anonymous sessions with a username display label and owner-based row-level access rules. Optional verified email linking provides recovery and access from another device; username alone cannot recover an existing identity. Import local entries only after an explicit choice; never upload them automatically.
- Default labels: Morning, Afternoon, Evening, with editable 09:00, 14:00, and 20:00 times. Extra daily times and unscheduled check-ins are supported. This initial local preview does not deliver notifications.

## Brand Commitments

Happi-Day. The user asked for a simple, unique interface and explicitly selected Little moments: warm peach, plum, coral, and expressive labeled mood faces.

## Evidence on Hand

The initial repository contains README.md and an MIT LICENSE. There is no existing UI, artwork, or user data. Example data must be labeled as examples and must never be confused with a person's saved entries.

## Product Principles

- Keep a check-in brief and easy to complete.
- Let people express their own reason.
- Make three check-ins a starting rhythm, with room for more.
- Keep the interface mobile-friendly.
- Be explicit about the local demo's limitations.
