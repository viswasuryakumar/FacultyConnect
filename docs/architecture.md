# FacultyConnect architecture and service contracts

The implemented frontend uses React, Vite and strict TypeScript, selected by the user. Domain logic and service contracts remain independent of React. Backend, database, hosting, authentication and provider integration choices remain open. The larger transport-oriented schema below is a proposed backend contract, not a claim that a server exists.

## Implemented local adapter

[src/domain/types.ts](../src/domain/types.ts) is the authority for implemented types. [src/services/contracts.ts](../src/services/contracts.ts) defines small identity, profile, booking, availability, notification and admin interfaces composed into `FacultyConnectServices`. UI imports the typed `service` singleton; `PreviewService` in [src/services/preview.ts](../src/services/preview.ts) implements it. Commands are synchronous for this local phase, and `getSnapshot` / `subscribe` expose its observable state. A future server adapter will need asynchronous command state or an observable cache; the current interface does not conceal that integration work. The model and Promise-based services sketched below are proposals rather than the implemented contract.

The implemented booking fields are `start`/`end` UTC instants, `bookedTimeZone`, a separate `linkState`, and an optional `reschedule` proposal. Profile `interests` and `expertise` are separate. Students also have a validated `email`; professors have `subjects` for Subjects taught. The request form collects free-text `meetingType`, `topic` and `context`; public profiles no longer define meeting types. Legacy optional topics/research fields are retained only for stored-data compatibility. Availability uses `rules.approval`, `windowDays`, `noticeHours`, `dailyCap`, `holdPending`, and `exceptions`. Pending request expiry is deliberately not implemented until its lifecycle policy is agreed.

| Contract           | Implemented operations                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Observable preview | `getSnapshot`, `subscribe`, `reset`, `persistenceAvailable`                                                                                                   |
| Identity           | `switchRole`, `signOut`                                                                                                                                       |
| Profiles           | `saveProfile`, `toggleSaved`                                                                                                                                  |
| Booking            | `submitBooking`, `acceptBooking`, `declineBooking`, `cancelBooking`, `changePendingTime`, `proposeReschedule`, `respondReschedule`, `retryLink`, `hasOverlap` |
| Availability       | `getSlots`, `saveAvailability`                                                                                                                                |
| Notifications      | `readNotification`, `markAllRead`                                                                                                                             |
| Admin review       | `setFacultyAccess`                                                                                                                                            |

`getSlots` returns `{start, end, label}` entries for the requested viewer-local date and zone. `saveAvailability` returns affected confirmed bookings without mutating state unless there are no conflicts or `keepConfirmed` is explicitly true. `changePendingTime` lets only the requesting student move a pending request; confirmed appointments require the separate proposal workflow. `respondReschedule` takes the original booking ID and the response.

The adapter persists only preview data under `facultyconnect.preview.v1`, currently using envelope schema version 3. Incompatible envelopes reset to relative fixtures. Additive email/subjects hydration fills missing sample fields while preserving existing edits, bookings and preferences in compatible version 3 envelopes. Storage failure leaves the in-memory session usable and exposes `persistenceAvailable=false`. Preparing link simulations resume after reload. There is no external meeting URL, provider request or real connection mutation.

The clock is injectable through `setClock` or the adapter constructor. Slot caching is bounded, invalidates on state changes and clock minute, and still checks the notice deadline at the exact current instant. Local wall-time conversions are cached separately because their results depend only on date, time and zone.

## Boundaries

- **UI:** application shell and reusable buttons, cards, fields, dialogs, status badges and empty states. Components display values and dispatch commands.
- **Features:** discovery, bookings, availability, profiles, connections, notifications and the limited admin preview.
- **Domain:** pure availability calculations, field validation, booking transitions and time conversion. No framework or browser storage dependency.
- **Services:** small interfaces for identity, profiles, availability, bookings and notifications. A local preview adapter owns fixtures, shared state and optional persistence. Future HTTP adapters implement the same responsibilities.

Keep one normalized store. Student and professor views select the same booking record, rather than maintaining copies of appointments. Counts, dashboards and notification links derive from this store. A successful command updates its booking and its generated notifications together before publishing a new snapshot.

## Domain outline

The following is a contract sketch, not an additional implementation or a requirement to use a particular library. IDs are opaque strings; use entity-specific aliases or branded IDs in a typed implementation. UTC instants are full ISO 8601 strings ending in `Z`. Local dates use `YYYY-MM-DD`, and wall-clock times use `HH:mm`.

```ts
type Role = 'student' | 'professor' | 'admin';
type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
type ApprovalMode = 'manual' | 'automatic';
type LinkState = 'not_requested' | 'preparing' | 'ready' | 'failed';
type ConnectionState = 'not_connected' | 'connected' | 'reconnect_required';
type Interval = { start: string; end: string }; // local HH:mm, same local day
type Clock = { now(): Date };

interface Booking {
  id: string;
  studentId: string;
  professorId: string;
  startsAt: string; // UTC
  endsAt: string; // UTC, exactly 30 minutes later
  bookedTimeZone: string; // IANA zone retained for provenance
  topic: string;
  context: string;
  status: BookingStatus;
  linkState: LinkState;
  revision: number;
  createdAt: string;
  updatedAt: string;
  declineReason?: string;
  cancellationReason?: string;
}

interface RescheduleProposal {
  id: string;
  bookingId: string;
  proposedBy: string;
  startsAt: string;
  endsAt: string;
  status: 'pending' | 'accepted' | 'declined' | 'withdrawn';
}

interface Availability {
  professorId: string;
  timeZone: string;
  weekly: Record<number, Interval[]>; // 0 Sunday through 6 Saturday
  overrides: Array<{
    id: string;
    fromDate: string;
    toDate: string; // inclusive
    intervals: Interval[]; // empty means unavailable
  }>;
  rules: {
    approvalMode: ApprovalMode;
    durationMinutes: 30;
    minimumNoticeMinutes: number;
    bookingWindowDays: number;
    dailyCap: number | null;
    pendingHoldsSlot: boolean;
    requestExpiryMinutes: number | null;
  };
  retainedBookingIds: string[]; // explicitly preserved confirmed exceptions
  revision: number;
}
```

Keep student and professor profiles keyed by ID. Student fields include name, email, university, program, interests, IANA time zone and notification preferences. Professor fields include name, institution, department, academic role, expertise, biography, education, subjects taught, languages and professional links. Bookmarks reference professor IDs. Integration connections belong to a professor and provider, separately from any booking's link preparation state.

Notifications carry an ID, recipient identity ID, creation instant, read state and a typed target such as `{ kind: 'booking', id: bookingId }`. Store target IDs rather than display copy as navigation state. Faculty-access review records and booking-support records are separate admin preview entities; marking a review complete does not grant a production role.

## Suggested service interfaces

Use Promise-based command/read methods so a future HTTP adapter can replace local work without rewriting feature components. A common `subscribe(listener)` plus `getSnapshot()` can support reactive local reads; transport-specific caching belongs outside the domain.

| Service          | Responsibilities and suggested operations                                                                                                                                                                                                               |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity         | `getSession()`, `switchPreviewIdentity(identityId)`, `completePreviewSetup(input)`, `endPreviewSession()`                                                                                                                                               |
| Profiles         | `getStudent(id)`, `getProfessor(id)`, `findProfessors(filters)`, `saveStudent(input)`, `saveProfessor(input)`, `listSaved(studentId)`, `setSaved(studentId, professorId, saved)`                                                                        |
| Availability     | `get(professorId)`, `listSlots(professorId, viewerDate, viewerTimeZone)`, `validateDraft(draft)`, `reviewConflicts(draft)`, `save(draft, conflictResolution, expectedRevision)`                                                                         |
| Bookings         | `list(query)`, `get(id)`, `submit(input, idempotencyKey)`, `accept(id, expectedRevision)`, `decline(id, reason, expectedRevision)`, `cancel(id, reason, expectedRevision)`, `proposeReschedule(id, input)`, `respondToReschedule(proposalId, response)` |
| Notifications    | `list(recipientId)`, `markRead(id)`, `markAllRead(recipientId)`                                                                                                                                                                                         |
| Connections      | `list(professorId)`; preview connection attempts explain the future integration and do not mutate connection status                                                                                                                                     |
| Preview controls | `reset()`, optional explicit integration scenario selection and retry demonstration                                                                                                                                                                     |

Define validation failures explicitly: field errors, unavailable slot, invalid transition, revision conflict and missing record. UI shows actionable errors and preserves form input. Reads can expose loading and retry states without implying network calls exist in the preview.

## Booking transitions

| Command                  | Required state                 | Result                              |
| ------------------------ | ------------------------------ | ----------------------------------- |
| Submit in manual mode    | Eligible new request           | `pending`, link `not_requested`     |
| Submit in automatic mode | Eligible new booking           | `confirmed`, link `preparing`       |
| Accept                   | `pending`, slot still eligible | `confirmed`, link `preparing`       |
| Decline                  | `pending`, reason validated    | `declined`, link `not_requested`    |
| Cancel                   | `pending` or `confirmed`       | `cancelled`; joining unavailable    |
| Complete                 | `confirmed`, end time reached  | `completed`                         |
| Retry link preparation   | `confirmed`, link `failed`     | link `preparing`; booking unchanged |

Declined, cancelled and completed records cannot be accepted. Changing a professor's approval mode affects subsequent submissions only. UI wording “Accepted” selects confirmed bookings; it is not another lifecycle value.

Submission uses a stable idempotency key for one form attempt. Reusing a key with the same payload returns the original result; a different payload is an error. Disable repeat clicks while a command is pending, but enforce deduplication in the adapter as well. On confirmation, validate professor and student overlaps against the current shared store.

A reschedule proposal references the original confirmed booking. Until the other participant agrees, the original date, occupied slot and meeting remain intact. Acceptance revalidates the replacement slot and atomically updates the appointment. It never creates two confirmed appointments. Declining or withdrawing the proposal leaves the original unchanged.

## Time and availability

Inject a `Clock` into fixtures, selectors and command validation. Generate fixture dates relative to that clock; reset creates a fresh coherent scenario. Sort by parsed full instants, earliest first. Upcoming means future pending or confirmed records, including an in-progress confirmed meeting if its end is still ahead.

Interpret recurring intervals in the professor's IANA time zone. Convert candidate local starts to UTC before comparing reservations. The viewer's selected date is a date in the viewer's time zone: expand enough professor-local dates to cover that entire viewer-local day, then filter converted instants back to it. Label all time selections and summaries with the viewer's time zone.

The implementation uses `date-fns-tz` and never parses meeting wall times in the host machine's zone. It rejects nonexistent times in a daylight-saving gap and deliberately suppresses repeated local times instead of guessing an offset. Tests cover both US DST transitions and viewer/professor date boundaries. For a 30-minute meeting, the end is 30 elapsed minutes after the start and must remain within the applicable working interval. Overnight working intervals are rejected; split them across adjacent local days.

Availability is the intersection of configured hours, overriding date intervals, booking window, notice and optional daily cap, less overlapping reservations and configured pending holds. Empty recurring hours mean no bookable slots. Reject overlapping intervals and ambiguous overlapping date overrides. Use half-open ranges `[start, end)` so adjacent appointments are valid. Count daily limits in the professor's local date.

Before saving availability, compare existing future confirmed bookings with the proposed schedule and return affected booking IDs. The user can preserve those appointments as exceptions and save the remaining changes, or return without saving. Never cancel or move a booking as a side effect of editing hours.

## Preview persistence and integrations

If persistence is enabled, keep it entirely inside the preview adapter, use a versioned storage envelope, and recover safely from malformed or obsolete data. Store only nonsensitive example data. Reset clears the preview envelope and reconstructs fixtures; it does not clear unrelated browser storage.

Zoom link preparation can be simulated through explicit states. Even a ready preview opens an explanatory dialog; it has no fabricated provider URL. Connect Zoom and Connect Google Calendar open closable explanatory dialogs and stay not connected. Identity switching is a demonstration tool, not authorization.

## Future backend requirements

The backend must enforce authenticated roles and record ownership, validate input again, reserve slots atomically, and use revision checks and idempotency keys. Concurrent requests from different devices cannot be secured by frontend checks. Provider credentials and tokens belong server-side. Confirming a reservation and creating a video meeting are distinct operations; retryable integration jobs must not duplicate provider meetings. Notifications and external side effects should follow durable state changes. Real account lifecycle, email delivery, review eligibility, retention and provider OAuth flows require separate approved designs.

## Behavioral validation

Prioritize transition guards; duplicate submissions; actual timestamp sorting; shared state across role changes; timezone midnight and DST boundaries; interval overlap checks; confirmed-meeting protection; and original-booking preservation during rescheduling. Browser walkthroughs should cover manual submission → professor acceptance → student confirmation, plus automatic booking. Layout checks should cover desktop, mobile, keyboard navigation and dialog focus. Report executed checks separately from planned checks.

## Meeting collaboration extension

`MeetingNote`, `ConversationRecord`, `notes`, `noteDrafts` and `conversationRecords` are implemented in the domain types. `NotesService` and `ConversationRecordService` are composed into the frontend service contract. Shared chat writes use the common `noteWindowStatus` rule and recheck the injected clock in the adapter for draft updates, sends, edits and deletion. Read access is restricted to the booking's participants. A sent message creates a local notification whose `target: notes` opens that appointment's Notes tab.

`getConversationRecord(bookingId)` is read-only. It cannot generate content from shared messages or start audio capture. The UI supports provider record states and a separately labeled local example; the real integration contract is described in [meeting-notes.md](meeting-notes.md).
