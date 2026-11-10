---
name: FacultyConnect
description: A restrained purple and white faculty meeting application.
colors:
  ink: '#23243a'
  muted: '#6c6c80'
  purple: '#6046d8'
  purple-hover: '#5137c4'
  soft: '#f0ecfc'
  border: '#e5e3ec'
  background: '#f6f5f9'
  surface: '#ffffff'
  green: '#13745a'
  green-soft: '#e8f4ee'
  pending: '#946015'
  pending-soft: '#fff3df'
  danger: '#a43a3a'
  danger-soft: '#fbecec'
  zoom: '#2563eb'
  zoom-hover: '#1d4ed8'
typography:
  display:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '50px'
    fontWeight: 700
    lineHeight: 1.16
    letterSpacing: '-0.035em'
  headline:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '32px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  headline-mobile:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '27px'
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: '-0.025em'
  title:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '21px'
    fontWeight: 700
    lineHeight: 1.35
    letterSpacing: '-0.015em'
  body:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '14px'
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '14px'
    fontWeight: 600
    lineHeight: 1.3
  navigation:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '13px'
    fontWeight: 500
  small:
    fontFamily: "Aptos, 'Segoe UI', sans-serif"
    fontSize: '12px'
rounded:
  badge: '5px'
  chip: '6px'
  navigation: '7px'
  control: '8px'
  card: '12px'
  panel: '14px'
  dialog: '16px'
  circle: '50%'
spacing:
  compact: '8px'
  small: '12px'
  mobile-gap: '18px'
  medium: '20px'
  card: '24px'
  layout-gap: '26px'
  panel: '28px'
  container: '30px'
components:
  button-primary:
    backgroundColor: '{colors.purple}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '11px 20px'
  button-primary-hover:
    backgroundColor: '{colors.purple-hover}'
  button-secondary:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.purple}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '11px 20px'
  button-ghost:
    textColor: '{colors.purple}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '9px 10px'
  button-danger:
    backgroundColor: '#fff0f0'
    textColor: '#ad3434'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '11px 20px'
  button-zoom:
    backgroundColor: '{colors.zoom}'
    textColor: '{colors.surface}'
    typography: '{typography.label}'
    rounded: '{rounded.control}'
    padding: '11px 20px'
  button-zoom-hover:
    backgroundColor: '{colors.zoom-hover}'
  input:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.ink}'
    rounded: '{rounded.control}'
    padding: '11px 13px'
    width: '100%'
  navigation-active:
    backgroundColor: '{colors.soft}'
    textColor: '{colors.purple}'
    rounded: '{rounded.navigation}'
    padding: '12px 14px'
  interest-chip:
    backgroundColor: '{colors.soft}'
    textColor: '#6551a9'
    rounded: '{rounded.chip}'
    padding: '7px 12px'
  professor-card:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.card}'
    padding: '24px'
  next-meeting:
    backgroundColor: '{colors.soft}'
    rounded: '{rounded.panel}'
    padding: '28px'
  time-slot:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.purple}'
    rounded: '{rounded.navigation}'
  time-slot-selected:
    backgroundColor: '{colors.purple}'
    textColor: '{colors.surface}'
---

# Design System: FacultyConnect

## Overview

**Creative North Star: "The FacultyConnect application"**

Preserve the supplied presentation's application area: white navigation, a pale neutral page, purple actions, initial avatars and clear meeting statuses. The visual character is restrained and spacious. Meeting details and the next action lead the page.

This document records the implemented frontend from [PRODUCT.md](PRODUCT.md), [global styles](src/styles.css), [management styles](src/features/management.css), the application components and the desktop/mobile captures in [.impeccable/review](.impeccable/review). It is a source-derived manual record. The Impeccable context engine and detector were unavailable; no engine extraction or detector verdict is claimed. Token values in the frontmatter are normative; the sidecar extends them with interaction and layout metadata. Its synthesized tonal ramps are display metadata rather than additional application colors.

**Key Characteristics:**

- Purple and white surfaces with quiet borders.
- Horizontal desktop navigation with a compact mobile menu.
- Rounded cards, initial avatars and concise status labels.
- Clear 30-minute booking choices and visible time zones.
- Explicit local preview identity and provider explanations.

## Colors

A single purple accent anchors actions and selected states. Green, amber and red describe status; provider blue identifies Zoom actions.

### Primary

- **Faculty purple**: primary buttons, active navigation, links, selected dates and selected time slots.
- **Soft purple**: the next-meeting surface, active navigation, interest chips and contextual meeting panels.
- **Deep purple**: primary button hover.

### Secondary

- **Zoom blue**: the meeting-specific Join Zoom action and Zoom service icon. Keep it associated with the provider.
- **Status green**: confirmed, ready, approved and active labels.
- **Status amber**: pending and preparing labels.
- **Status red**: declined, failed and cancelled labels.

### Neutral

- **Ink**: headings and essential content.
- **Muted**: supporting copy, unselected navigation and secondary labels.
- **White surface**: navigation, panels, cards and form controls.
- **Page background**: the open page field behind surfaces.
- **Border**: card outlines, dividers and input strokes.

**The Status Text Rule.** Pair status color with a written label; booking status, link preparation and provider connection remain distinct.

## Typography

**Display and body font:** Aptos, with Segoe UI and sans-serif fallbacks. Aptos is requested through a local font face; the application does not download or bundle it.

The shared family keeps headings, labels and forms close to the presentation. Weight and size establish hierarchy. Labels use sentence case; only the weekly-hours table heading uses small uppercase text.

### Hierarchy

- **Display**: sign-in story heading only; it steps down at the observed responsive breakpoints.
- **Headline**: page headings use the headline token, switching to headline-mobile at the mobile breakpoint.
- **Title**: section headings use the title token. Smaller component headings range from 17px to 20px; the next-meeting heading uses 23px on desktop.
- **Body**: typical panel copy uses the body token. Page introductions use 15px on desktop and 14px on mobile. Unstyled paragraphs inherit the browser's base size.
- **Label**: standard action labels use the label token; navigation and field labels use smaller contextual sizes.
- **Small**: metadata and supporting labels use the small token. Preview controls and status badges use 11px.

Profile prose is constrained to 70ch. Dates, time slots, meeting times and numeric count labels use tabular numerals.

## Layout

The desktop shell uses a centered navigation container (1240px maximum) and main content container (1180px maximum). Navigation is 72px tall above the content; the separate preview strip has a minimum height of 34px. Main content has 30px side padding and 32px top padding.

The student dashboard places the next meeting beside two count cards in a 1.85:1 grid with a 26px gap. Discovery controls follow below. The approved dashboard contains the meeting, counts and discovery actions; additional recommendation cards do not belong to this composition. The directory uses three equal card columns and the supplied three professor fixtures: Sarah Chen, Alex Patel and Maya Rivera.

Profiles pair content with a booking panel; the panel is sticky on larger screens. Booking uses a two-part calendar and time-slot surface. General forms use two columns. Management follows the same containers with a full-width weekly-hours editor, optional one-off schedule changes and two service connection cards.

Responsive changes follow the implementation:

- At 1450px and wider, main top padding and selected card padding increase.
- At 1100px and below, shell spacing becomes more compact and time slots use two columns.
- At 1000px and below, management hours and availability columns narrow.
- At 850px and below, navigation becomes a toggle-controlled vertical menu; the header height is 78px.
- At 720px and below, availability, connections and professional-link editing stack.
- At 640px and below, main padding becomes 30px 18px 45px; dashboard, professor directory, detail, form and calendar layouts stack. Count cards remain side by side. Time slots return to three compact columns. Page heading actions and footer content wrap or stack.

The narrower shell preserves preview identity selection, notifications, account access and the menu button. Keep text wrapping and the observed space around cards when adapting layouts.

## Elevation & Depth

Most surfaces are flat: white cards and soft purple panels sit on the neutral background with fine borders. Card hover changes a border rather than raising the card. Shadows identify overlays, menus and transient messages.

### Shadow Vocabulary

- **Account menu**: 0 12px 30px #24203b16.
- **Dialog**: 0 20px 80px #15102e35; the backdrop uses #23243a65 with 3px blur.
- **Toast**: 0 8px 24px #23243a25.
- **Mobile navigation**: 0 10px 20px #23243a0a.
- **Selected sign-in role**: 0 2px 5px #2d1c5510.

**The Quiet Surface Rule.** Use border and tone for persistent content; reserve shadows for overlays and the existing selected-role treatment.

## Shapes

Controls have gently curved corners. Cards use the card radius, larger panels use the panel radius and dialogs use the dialog radius. Tabs are text controls with a purple underline. Status labels are compact rounded rectangles; account avatars are circles and larger profile avatars are rounded squares.

Initial avatars are the default identity treatment. The source also supports a profile image. Fine one-pixel borders separate cards, inputs, table rows and sections.

## Components

### Buttons

Standard actions use 14px semibold text, at least 44px height and control-radius corners. Primary is purple with white text; secondary is white with a quiet border and purple text; ghost removes the surface. Destructive actions use pale red, and Zoom uses provider blue.

Hover changes the surface color. Pressed buttons move down by 1px. Most button transitions last 150ms. Disabled buttons lower opacity and change the cursor. The shared keyboard focus outline is 3px with a 4px offset; forms use their more compact focus treatment. Compact table and calendar controls have explicit smaller sizes in the source.

### Chips and statuses

Interest chips use the soft purple surface and compact padding. Status badges combine a status word, a small dot and a tinted background. Selected approval options show a purple border and a lightly tinted surface. A completed status uses a muted purple treatment.

### Cards and containers

Professor cards contain an initial avatar, save control, name, institution, expertise, action and rating. A one-pixel border defines the white surface. The main action sits at the bottom to align cards with different copy lengths. On mobile, cards stack.

The next-meeting card is a soft purple panel with a status, title, date, time, duration, time zone and meeting action. Its main surface links to meeting details; the action remains separately operable. Count cards emphasize the number with quieter labels.

### Inputs and fields

Inputs, selects and textareas use white, one-pixel borders, control-radius corners and a 44px minimum height. Textareas resize vertically. Labels stay visible above fields. Focus uses a 2px pale-purple outline with 2px offset and a purple border. Field errors and notices explain the action needed.

### Navigation and preview identity

The desktop header places the brand, horizontal navigation, notifications and account controls in one row. The current page uses a soft purple background and purple text. Hover uses a lighter tint. Mobile navigation opens below the header and preserves the same labels.

The slim preview strip exposes the local role selector and reset action. Keep this preview identity visible; switching the view does not imply real authentication.

### Calendar and 30-minute booking

Available days have a pale purple surface; a selected date becomes purple with white text. Disabled dates reduce opacity. Time slots use bordered white buttons and selected purple buttons. The selection summary retains the date, time and viewer's time zone. Every meeting is 30 minutes.

The slot grid has a 280px maximum height and scrolls within its surface. Smaller layouts stack the calendar and slots without removing the time zone. Join Zoom and connection actions show explicit preview explanations.

### Availability and connections

Weekly-hours rows align the day with its intervals. Editing controls wrap at intermediate widths and stack on small screens. The weekly editor is full width; one-off schedule exceptions sit inside a collapsed optional section. Public profiles show a grouped day/time summary instead of a dense paragraph. Conflicts receive a review dialog that protects confirmed appointments.

Connection cards use provider-specific icon colors, a written connection status and a clear action. Their explanatory dialogs and local preview labels belong to the implemented experience.

### Feedback and motion

Notices use tinted surfaces with written messages. Empty states combine a light outline, purple icon and relevant action. Dialogs dim the application; toasts appear near the bottom center. Toast entry takes 200ms and small hover changes generally take 150ms. Reduced-motion preferences disable animation and transitions.

## Do's and Don'ts

### Do:

- Do preserve the supplied presentation's purple and white application area.
- Do keep the next action, meeting status and time zone easy to find.
- Do retain visible keyboard focus, written statuses and responsive wrapping.
- Do use the local Aptos font when available and preserve the fallback stack.
- Do label identity and provider behavior as preview behavior.

### Don't:

- Don't bring the slide title bar, design-note rail or slide numbers into the application.
- Don't add decorative elevation to the existing flat content surfaces.
- Don't use provider blue as the general application accent.
- Don't hide a status or selection meaning in color alone.
- Don't invent real authentication, provider connection or external meeting behavior in a preview.

## Approved content and flow refinements

Professor profiles use a simple 30-minute scheduling panel instead of predefined meeting-type choices. Students describe their own meeting type, discussion topic and message in the request form. Subjects taught replaces Current research and has its own professor-editable field. Student email is editable in profile settings and visible to the professor on the meeting record as a mailto action. The student meeting view omits this contact row. Pending copy addresses the current role, and the professor dashboard places later meetings before pending requests. These content changes preserve the existing palette, typography, components and responsive behavior.

## Meeting collaboration surfaces

Reuse the existing navigation, panels and tabs for Details, Notes and Conversation record. Notes uses author names, role labels, timestamps and a restrained conversation layout; private drafts are labeled separately from sent messages. Write controls appear only during the confirmed meeting window. History remains readable and downloadable after closure. The Notes index keeps each conversation attached to a particular appointment.

Automatic transcript/recap content belongs to Conversation record, visually separate from human-written messages. The current example format is conspicuously labeled fictional and never presented as a recording. Keep its Not connected, processing, failed and ready states distinct from meeting confirmation and chat status. Use the existing palette and typography, and retain keyboard navigation across all three tabs.
