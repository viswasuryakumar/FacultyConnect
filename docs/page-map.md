# Presentation-to-application page map

The supplied presentation contains 34 slides. Slides 3–28 describe application screens; slides 1–2 introduce the product and page map, while slides 29–34 explain integrations, architecture and open decisions. The application follows the app area of each screen, excluding slide titles, numbering and the design-note rail. The user-approved refinements recorded in PRODUCT.md supersede the original meeting-type selector, research section and availability preview.

## Shared entry

| Slide | Destination      | Navigation and behavior                                                                                       |
| ----- | ---------------- | ------------------------------------------------------------------------------------------------------------- |
| 3     | Sign-in preview  | Choose a test identity and enter its dashboard. Explain that no real sign-in or faculty authorization occurs. |
| 4     | Complete profile | Collect student name, university, program, interests and time zone; finish on Dashboard.                      |
| 28    | Notifications    | Filter unread updates and open the particular request or meeting referenced by each notification.             |

## Student

Desktop navigation: **Dashboard · Find Professors · My Meetings · Saved Professors**, followed by notifications and an account avatar. Profile/settings and sign-out are account actions. Mobile uses a compact navigation menu.

| Slide | Destination                 | Navigation and behavior                                                                                                                                       |
| ----- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 5     | Dashboard                   | Next meeting with its own Join Zoom action; upcoming and pending counts; subject/university links into discovery.                                             |
| 6     | Find Professors             | Search plus horizontal subject, university, date and time filters; cards open individual profiles.                                                            |
| 7     | Professor Profile           | Academic details, expertise, biography and illustrative feedback; subjects taught, readable weekly hours and a 30-minute scheduling action.                   |
| 8     | Choose Date & Time          | Calendar with real month navigation, eligible dates and selectable 30-minute slots; continue with the selected professor and time.                            |
| 9     | Meeting Request             | Free-text meeting type, discussion topic and message alongside appointment summary; manual request or automatic booking according to the professor's setting. |
| 10    | My Meetings                 | Upcoming by default, ordered by timestamp; status filters and record-specific detail navigation.                                                              |
| 11    | Meeting Details — pending   | Requested appointment and topic; pending explanation, time-change action and cancellation. No Zoom link.                                                      |
| 12    | Meeting Details — confirmed | Appointment, integration status, contextual reschedule/cancel and meeting-specific Join Zoom preview.                                                         |
| 13    | Reschedule or Cancel        | Choose an eligible replacement time or confirm cancellation. A pending proposal preserves the original appointment.                                           |
| 14    | Saved Professors            | Saved cards with removal, profile navigation and illustrative rating/review count beneath View Profile.                                                       |
| 15    | My Profile & Settings       | Edit identity details, student email, interests, time zone and preferences; save locally.                                                                     |

## Professor

Desktop navigation: **Dashboard · Requests · My Meetings · Availability · Connections**, followed by notifications and the account avatar. The public profile editor is an account destination.

| Slide | Destination                    | Navigation and behavior                                                                                                        |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 16    | Dashboard                      | Next meeting in one outlined card with student, status, topic, time and actions; pending requests and subsequent appointments. |
| 17    | Requests                       | Pending, Accepted and Declined views; each row opens its own request. Accepted corresponds to the confirmed booking state.     |
| 18    | Request Details                | Student affiliation, topic, context and requested time; accept or decline that record, with reason/confirmation.               |
| 19    | Availability — Weekly hours    | Edit multiple intervals per day or mark a day unavailable; show the professor's time zone. One-off changes are optional.       |
| 20    | Availability — One-off changes | Collapsed optional section under Weekly hours: date/range exceptions with custom hours or all-day unavailability.              |
| 21    | Availability — Booking rules   | Manual or automatic booking for 30-minute appointments; advanced notice, booking window and daily-cap settings.                |
| 22    | Availability — Conflict review | List affected confirmed appointments; explicitly retain them and save other changes, or return without saving.                 |
| 23    | My Meetings                    | Upcoming by default, earliest first; status/date filtering and record-specific navigation.                                     |
| 24    | Meeting Details                | Selected student's appointment, topic and integration state; contextual joining, rescheduling and cancellation.                |
| 25    | Public Profile Editor          | Structured academic and advising details, photo preview, validation, unsaved state, save and student-view preview.             |
| 26    | Connections                    | Separate Zoom and Google Calendar cards. Connect opens an explanation and remains Not connected.                               |

## Admin preview

| Reference | Destination     | Navigation and behavior                                                                                                                        |
| --------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 27        | Faculty access  | Awaiting review/active faculty examples; local review decisions with no production role grants.                                                |
| 2 and 27  | Booking support | Selected appointments needing help and local support actions. The deck names this destination but does not provide a separate detailed screen. |

## Visual rules from the deck

- Main surfaces are white with thin `#E5E3EC` outlines on `#F6F5F9`; primary actions and selected navigation use `#6046D8`.
- Text uses `#23243A` with quieter `#737487` supporting copy. Green marks confirmation; amber marks pending; the Zoom action uses blue.
- The source font is Aptos. Use an available compatible sans serif rather than requiring Microsoft Office fonts.
- Directory and saved pages use a three-column desktop card grid. Each card includes an initials avatar, bookmark action, institution, specialty, View Profile, then sample review information.
- Profile, request and appointment selection screens use a wide content panel with a narrower contextual appointment panel. Stack these on small screens.
- Professor weekly availability uses a full-width day/hour editor. A collapsed optional section holds one-off changes. Public profiles show grouped day ranges and readable 12-hour intervals.
- Preserve generous spacing, readable form labels and restrained border treatments. Real controls and local navigation replace slide illustrations.
- The fixed dates in the slides illustrate layout. The running demo uses coherent relative dates and visible time-zone labels.

## Added meeting collaboration

The Notes navigation destination (`/notes`) lists only the current participant's meeting threads. A meeting opens Details, Notes and Conversation record tabs. Notes is shared chat during its scheduled time and a read-only history afterward. Conversation record is the separate automatic transcript/recap surface, with an explicitly fictional example for demonstrations while the real provider integration is pending. New-note notifications deep-link to the specific meeting's Notes tab.
