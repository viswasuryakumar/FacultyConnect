# FacultyConnect

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React + Vite + TypeScript, explicitly chosen by the user on November 6, 2026. Backend, database, identity provider ownership, and hosting remain undecided.

## Users and purpose

Students discover faculty, request a 30-minute conversation, and manage meetings. Professors maintain their public profile, availability, and booking requests. Administrators demonstrate faculty access review and booking support.

## Scope

A responsive, clickable frontend matching the supplied FacultyConnect presentation. Shared simulated data must remain consistent when switching test identities. No real authentication, account creation, payments, Zoom, Google Calendar, or email integration. All demo identity and provider behavior must be identified honestly.

## Brand commitments

Preserve the supplied deck's restrained purple and white application layout, horizontal navigation, initial avatars, clear statuses, and generous spacing. Exclude the presentation's title bar, design-note rail, slide numbers, and explanatory slides from the application.

## Evidence

The supplied 34-slide PowerPoint contains the visual and navigation reference; application screens occupy slides 3–28. Extracted references are in `reference/`. The supplied pasted brief provides detailed acceptance criteria.

## Product principles

- One normalized booking record across student and professor views.
- Protect confirmed appointments when availability changes.
- Keep booking status, integration status, and connection status separate.
- Use accessible controls and responsive layouts.
- Record unresolved policies explicitly; do not imply production guarantees.

## Approved interface refinements (November 8, 2026)

- Students type a meeting type, a specific discussion topic and a message in the request form. Public professor profiles do not offer predefined meeting types; all appointments remain 30 minutes.
- Collect a student email in setup/settings and show it to the professor on the meeting record, with a mailto link. Hide this contact row in the student meeting view; the student can edit their email in profile settings. This opens the user's email application; the frontend sends no email itself.
- Collect and display Subjects taught for professors. Do not collect or infer a separate Current research section from legacy interests.
- Show public weekly availability as grouped day ranges and readable time intervals, with the professor's time zone.
- Place Next after this before Needs your response on the professor dashboard. Pending-request copy must address the current role.
- Keep Weekly hours and Booking rules as the main availability tabs. Remove the student booking preview; keep one-off days off or custom hours in a collapsed optional section under Weekly hours. Preserve conflict protection and advanced limits.

## Meeting notes and conversation record

The user requested two separate features. Notes is a meeting-specific shared chat. Participants may send, edit and delete their own messages only during the confirmed meeting's scheduled window; after it ends the history stays readable and the chat is closed. There is no post-meeting messaging. Drafts remain private until sent. Pending, upcoming, completed, cancelled and declined meetings cannot post messages. Actual Zoom start/end signals and server enforcement belong to the backend phase.

Conversation record is a separate meeting-details tab for an automatic Zoom transcript and recap. The user explicitly requested its UI for a professor demo now. It includes a clearly labeled fictional example; no real audio is captured, no transcript is generated from the human Notes thread, and no automatic provider connection is claimed. Real capture, persistence between devices and publication need backend/provider integration. Preserve these distinctions in future work.
