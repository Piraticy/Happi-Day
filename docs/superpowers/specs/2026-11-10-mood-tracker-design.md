# Happi-Day first local version

Status: approved. The user selected Little moments and requested implementation with demo login and all discussed mood tracking features.

## Purpose

A simple mobile-friendly mood tracker: choose how you feel, optionally give a reason, and keep a record throughout the day. Three check-ins are the default rhythm, never a limit on expressing a mood.

## Experience

- A password-free welcome screen with a name field and an explicitly labeled **Enter demo** action. Explain that no account is created and entries stay in this browser. Do not simulate sending an email or verifying an identity.
- **Today** is the default screen. Show today's date, three check-in times, and an immediately usable mood picker.
- Five labeled moods: Low, Down, Okay, Good, Great. Friendly, consistently drawn faces accompany the words. Color supports the labels.
- After selecting a mood, offer selectable reasons such as Work, Friends, Family, Sleep, Health, and Me time. Reasons are optional. Include a text field for a person's own reason.
- Save the check-in, show a clear confirmation, and add it to today's list. A person may add an unscheduled check-in at any time.
- A schedule editor starts with 09:00, 14:00, and 20:00. The user can edit the times and add daily slots. Keep at least three scheduled slots. Clarify that scheduled times are a personal plan; this version does not deliver notifications.
- A simple history view shows saved entries by local calendar date. Include an empty state rather than fictional personal history. Let a person delete a mistaken entry with a confirmation.
- Browser-local persistence for preferences and entries. Report failed saves instead of claiming success. No multi-user separation or identity security is implied by the demo welcome screen.
- A sign-out/leave-demo action returns to the welcome screen without deleting entries. Explicitly state that entries remain on this browser.

## Approaches

The user delegated the technical stack and chose a local demo. React + TypeScript with Vite provides a small application with a local dev server and static build. A server framework would add setup before this version needs a server; plain HTML could work, but would make the related check-in, schedule, history, and persistence states harder to maintain.

Visual choices are presented as mobile sketches:

1. **Little moments:** a warm peach ground, plum navigation and ink, coral actions, and a five-face mood palette. Everyday fruit-market color and friendly rounded lettering provide the visual voice; familiar app navigation and form controls organize the screen. A selected mood gets a distinct solid color and a gentle settling motion. The timeline, mood choices, and saved entries remain practical and readable.
2. **Quiet journal:** warm paper, forest green, gentle lavender and olive mood tones, and restrained editorial lettering. Same task and controls, with a calmer vertical composition. Familiar and easy to use, but less distinctive.
3. **Classic app:** conventional white-and-blue mobile application, offered as a familiar alternative.

The user's chosen sketch will set the visual direction for both Today and the welcome screen. No images, external account, payment, or deployment is needed for this version.

## Layout and accessibility

Design for a narrow phone first, then expand to a desktop shell with a slim navigation rail, central check-in area, and today's rhythm alongside it. Mobile uses straightforward bottom navigation. Use visible labels, keyboard-operable controls, persistent focus outlines, comfortable tap targets, readable contrast, reduced-motion support, and live save/error status. Never rely on face expressions or color alone.

## Data and validation

Persist a versioned record containing a display name, schedule slots with stable IDs and valid HH:mm times, and entries with stable IDs, a mood enum, optional selected reasons/custom reason, and an ISO timestamp. Validate loaded data and user input. Group days using the device's local calendar, not a UTC date slice. Do not overwrite unreadable saved data silently. Bound user-written text and render it as text.

## Verification

Test the nontrivial data behavior: local dates, schedule validation, entry creation, and persistence failure handling. Run TypeScript and the production build. In the browser, verify the demo welcome, mood + preset/custom reason save, reload persistence, additional check-in, time changes, history, deletion, keyboard focus, and mobile/desktop layouts.

## Deliberately outside this version

Real authentication, cloud storage, email/SMS delivery, push reminders, medical interpretation, analytics dashboards, and deployment. The demo must be usable without any credentials.
