---
name: Happi-Day
description: Little moments for daily mood check-ins.
colors:
  ground: "#fff6ed"
  ink: "#3e2248"
  muted: "#7a626d"
  coral: "#b94131"
  coral-hover: "#a53529"
  surface: "#fbe9dc"
  line: "#dfcbbf"
  action-text: "#fff8ef"
  field: "#fff9f2"
  field-border: "#cbb4aa"
  rail-hover: "#523159"
  rail-active: "#60416a"
  mood-low: "#c9c5e6"
  mood-down: "#bed9df"
  mood-okay: "#efcf75"
  mood-good: "#c2d7ad"
  mood-great: "#f4ad94"
typography:
  display:
    fontFamily: "Bricolage Grotesque Variable, sans-serif"
    fontSize: "clamp(2.5rem, 4vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.03
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque Variable, sans-serif"
    fontSize: "43px"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "DM Sans Variable, sans-serif"
    fontSize: "12px"
    fontWeight: 600
rounded:
  icon: "10px"
  field: "12px"
  action: "13px"
  panel: "22px"
  chip: "24px"
spacing:
  compact: "8px"
  small: "12px"
  field-inline: "16px"
  panel-inline: "24px"
  section: "28px"
components:
  button-primary:
    backgroundColor: "{colors.coral}"
    textColor: "{colors.action-text}"
    rounded: "{rounded.action}"
    padding: "17px 22px"
  button-primary-hover:
    backgroundColor: "{colors.coral-hover}"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.icon}"
    padding: "10px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.coral}"
    typography: "{typography.label}"
    padding: "8px 0"
  reason-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.chip}"
    padding: "9px 16px"
  reason-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.ground}"
  reason-field:
    backgroundColor: "{colors.field}"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "14px 16px"
  daily-panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.panel}"
    padding: "21px 24px 28px"
  nav-item:
    backgroundColor: "transparent"
    rounded: "{rounded.field}"
    padding: "15px 18px"
  nav-item-active:
    backgroundColor: "{colors.rail-active}"
    textColor: "{colors.ground}"
---

# Design System: Happi-Day

## Overview

**Creative North Star: "Little moments"**

Warm peach ground, plum ink and navigation, coral actions, and five expressive mood faces make daily check-ins approachable. Bricolage Grotesque gives the headings a distinct voice; DM Sans keeps forms, labels, and saved entries clear.

The interface uses soft edges and crisp, flat color fields. Faces carry the expression, with a short settling motion when selected. Desktop has a persistent plum rail; mobile brings the same destinations into a fixed bottom navigation.

**Key Characteristics:**

- Warm peach ground with plum text and desktop navigation.
- Coral primary actions and visible keyboard focus.
- Five colored faces paired with written mood labels.
- Rounded fields, pill reasons, and flat tonal panels.
- Responsive navigation and reduced-motion support.

## Colors

The palette combines warm surfaces with a dark plum structure and five distinct mood colors. Frontmatter contains the normative values extracted from the implementation.

### Primary

- **Coral:** primary buttons, text actions, links, carets, and keyboard focus. Coral hover darkens the filled action without changing its geometry.

### Secondary

- **Lavender / Low, Blue / Down, Yellow / Okay, Green / Good, Peach / Great:** circular mood faces, repeated in saved entries and the welcome screen. These colors identify feelings, not action priority.

### Neutral

- **Warm peach ground:** the page and mobile navigation background; reversed text on plum surfaces.
- **Plum ink:** primary text, desktop rail, selected reason chips, selected mood outlines, and confirmation notices.
- **Muted plum:** dates, secondary copy, labels, and supporting notes.
- **Peach surface:** daily rhythm panel and subtle hover/selected areas.
- **Warm line / field border:** dividers and form boundaries. Fields are a paler peach than the panel.
- **Rail hover / rail active:** two lighter plum fields distinguish navigation state from the rail itself.

**The Labeled Feeling Rule.** Always pair an interactive mood face with its written label; color and facial expression do not carry the selection alone.

## Typography

**Display Font:** Bricolage Grotesque Variable, with sans-serif fallback.

**Body Font:** DM Sans Variable, with sans-serif fallback. Both are imported locally through Fontsource in the app entry point.

Bricolage's rounded forms give large questions and the wordmark their character. DM Sans carries compact controls and supporting information. Large headings use tight tracking; labels remain sentence case.

- **Display:** page headings use the frontmatter display role, becoming a fixed size (36px) at the mobile breakpoint. The welcome story uses a larger responsive heading (`clamp(44px, 5vw, 76px)`), with a mobile size (38px).
- **Headline:** the welcome form heading uses the headline role, reducing on mobile (31px).
- **Title:** section headings use the title role; entry titles are slightly larger (16px). The reason field legend is stronger (17px).
- **Body:** default text uses the body family. Supporting prose typically ranges from 12–14px; paragraph line height is generous (1.65). The welcome introduction is larger (18px).
- **Label:** action labels use medium emphasis (600); compact metadata ranges from 10–13px. Times and counts use tabular numerals where implemented.

## Layout

The desktop app uses a fixed rail (232px) and an offset workspace with horizontal padding (58px) and a maximum width (1580px). Today places the flexible check-in beside a rhythm panel (286px), separated by a column gap (60px). History and Your rhythm use narrower content (maximum 850px); the schedule form narrows further (670px).

At widths up to 1200px, the rail narrows (205px), workspace padding reduces (34px), and the side panel narrows (255px). From 761px through 1000px, the rail narrows again (180px) and the daily panel moves below the form as two columns. At 1600px and above, workspace padding grows (85px) and the Today column gap grows (100px).

At 760px and below, the rail becomes a fixed bottom navigation with safe-area padding. The workspace has side gutters (24px), a compact brand header, and a single content column. Today prioritizes the heading, a compact planned-check-in count linking to times, and the check-in form. Desktop rhythm tiles are hidden on phone; Your rhythm retains all editable times. Optional reasons expand on demand and close after a successful save. Saved moments sit behind a native disclosure. A separate Little lifts destination holds daily wellbeing activities, keeping the check-in short. The five mood choices remain in one row. The app reserves bottom space (84px) for navigation, and notices sit above it.

The welcome screen changes from two columns (1.12fr / 1fr) to a compact wordmark, short headline and form at the same mobile breakpoint; decorative faces and supporting story copy are hidden on phone. The body supports a minimum width (320px). Spacing is component-specific rather than governed by an invented global grid; frontmatter records recurring steps only.

## Elevation & Depth

Most surfaces are flat. Color fields, thin borders, and spacing establish hierarchy: plum rail, peach canvas, peach panel, and pale fields. Ordinary cards, buttons, and navigation do not cast shadows. The fixed confirmation notice is the exception, using a soft plum shadow (`0 8px 28px #3e224825`) to separate it from content.

**The Flat Surface Rule.** Keep the existing flat treatment for forms, navigation, and panels; reserve the implemented shadow for the floating notice.

## Shapes

The system uses gently rounded rectangles, pill reasons, and circular faces and markers. Fields and desktop navigation items use the field radius; primary actions are slightly rounder; the daily panel uses the largest standard corner. Mood selection frames have arched upper corners (`52px 52px 17px 17px`), reducing on mobile (`40px 40px 15px 15px`). The wordmark uses a smiling radial emblem and a peach dot. Existing emblem and mood SVGs remain the visual source for these shapes.

## Components

### Buttons

Filled coral primary actions have pale text, a modest radius, and space for a trailing arrow. They have a desktop minimum height (54px), reducing to 52px on mobile. Hover uses the darker coral. Disabled primary actions use muted peach and brown, with a disabled cursor.

Icon actions are transparent, rounded, and normally at least 44px square; compact saved-entry and schedule controls have their existing smaller sizes. Text actions use coral, with an underline on hover. Standard button state transitions last 150ms with ease timing.

### Chips

Reason chips are bordered pills with a minimum height (40px), reducing to 36px on mobile. Hover adds the peach surface. Selection fills the chip with plum and reverses its text; the source uses `aria-pressed` to expose that state.

### Cards / Containers

The desktop daily panel groups rhythm and saved moments in one flat peach container with the frontmatter panel padding. At narrower desktop widths padding reduces; on mobile the outer container dissolves into the ordered page flow. Saved entries are divided rows with a face, heading, time, reasons, optional note, and delete action rather than individually elevated cards.

### Inputs / Fields

The reason textarea and schedule inputs have pale peach fills, warm borders, and rounded corners. The textarea resizes vertically on desktop with a height range (92–280px); mobile starts at 72px and uses a larger font (16px). The welcome name field uses a near-white peach fill and a slightly different warm border. Selects remain native controls with compact surrounding styling.

All buttons, links, inputs, selects, and textareas receive a visible outline (3px) with an offset (4px). Plum rail and notice controls use peach focus outlines; mobile rail controls return to coral. Errors remain visible in darker coral text or a bordered pale-coral alert.

### Navigation

Desktop navigation stacks outlined icons and written labels within the plum rail. Transparent items gain a lighter plum field on hover and a distinct active field; the current destination also exposes `aria-current="page"`. Mobile moves the same destinations to the bottom, stacks each icon above its label, and uses a peach active field with plum text. The leave-demo action remains separate, becoming a compact header action on mobile. A keyboard-visible skip link reaches main content.

### Mood selector

Five inline SVG faces preserve the order Low, Down, Okay, Good, Great. Each is a real radio choice with a visible label. Selection adds a peach field, plum border, and plum circular check marker; focus outlines the entire choice. The face settles once (240ms, `cubic-bezier(.16, 1, .3, 1)`) from a small upward shift, rotation, and scale to rest. The mobile choices are tighter, with faces up to 54px wide.

**The Reduced Motion Rule.** Under `prefers-reduced-motion: reduce`, remove animations and transitions and use automatic scroll behavior, as the current stylesheet does.

### Notices

Saved and deleted confirmations use a fixed plum notice with pale text, an icon, a dismiss action, and an optional underlined peach undo action. It centers within the desktop workspace and spans between mobile side gutters above bottom navigation. It is the sole shadowed component.

## Do's and Don'ts

### Do:

- **Do** keep peach surfaces, plum structure, and coral actions in their established roles.
- **Do** retain a written label and a non-color selected indicator for every mood choice.
- **Do** reuse the existing SVG faces and emblem, locally loaded typefaces, and outlined icon style.
- **Do** preserve visible keyboard focus and reduced-motion behavior across new components.
- **Do** adapt navigation and content order at the existing mobile breakpoint.

### Don't:

- **Don't** replace mood labels or selected check markers with color alone.
- **Don't** add shadows to ordinary fields, panels, or navigation when extending the flat system.
- **Don't** animate the selected face continuously or retain its settling animation under reduced motion.
- **Don't** let fixed mobile navigation or notices cover the last actionable content.

## Daily little lifts

A separate Operate surface presents one to three short, optional activities as divided rows. The list grows across distinct check-in days, capped at three, and the 31-idea calendar rotation stays stable across reloads. Alternatives replace the visible ideas. All moods are welcome; the copy promises no particular outcome. Sources and context sit behind an About these ideas disclosure. No new colors, fonts, shadows or raster assets are introduced.

## Username session entry

The cloud welcome defaults to Username and Start my journal, with the remembered-browser and recovery limits explained before entry. Existing email login remains an alternate text action. The journal shows a Session label rather than a blank email address. Optional recovery and local import controls sit after the primary page content so Save remains visible on375×667. Recovery uses a native disclosure and the existing pale fields, coral text actions and visible focus treatment. Anonymous sign-out asks for confirmation because clearing that session can remove access.

## Desktop workspace and installation

Above 1000px, the workspace uses fluid horizontal padding and up to 1500px of content, with a flexible check-in column and a 280–360px daily panel. The desktop header is 88px tall, and spacing keeps the main save action visible on a short laptop window with reasons collapsed. Today’s moments opens on desktop and collapses when crossing to a phone/tablet width; people can still toggle it. History lays out entries in two columns per day. Above 1200px, Your rhythm and Little lifts put their introduction beside the working content. Prose retains a readable measure; phone navigation and check-in order stay intact.

An outlined Install app control sits in the upper-right header area, becoming a labeled icon on phone. It captures a native browser installation offer when available, gives inline manual instructions otherwise, and disappears in a standalone app window. The help panel uses the existing ground, borders, text and focus treatments. It states online requirements and Safari’s separate-session behavior. The manifest’s 192/512px PNG icons reuse the authored smiling emblem on a fully opaque peach background, with the mark inside the maskable safe area.
