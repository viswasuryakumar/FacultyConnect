# Meeting notes and automatic summaries

## Implemented frontend behavior

The Notes menu lists the current student's or professor's meeting threads. Each meeting has Details, Notes and Conversation record tabs, and the same thread opens at `/meetings/:bookingId?tab=notes`. Shared notes keep an author, creation time and optional edit time. Both participants can send messages only during the meeting window and return later to read the history.

A draft belongs to one user and one booking. Typing saves the draft in the browser; it becomes shared only when Send note is clicked. Sending clears that draft and creates a local notification for the other participant. The notification opens the correct meeting's Notes tab. Only the original author can edit or delete their message, and only while chat is open.

Chat opens only for a confirmed booking at its scheduled start and closes at its scheduled end (`start <= now < end`). Upcoming bookings show the opening time. Completed, ended, cancelled and declined threads are read-only; pending requests cannot send messages. A timer refreshes the UI, and every adapter mutation independently checks the clock to reject stale actions without creating notifications. Existing history and private drafts are preserved; no unsent draft is published when the window closes. Administrators and unrelated preview identities do not get the participant notes interface.

Preview storage remains a version 3 envelope with additive `notes`, `noteDrafts` and `conversationRecords` defaults, so existing bookings and profile edits are retained. Drafts use a user-and-booking key. Note submission has its own persisted idempotency records. Reset demo clears notes and drafts together with other sample records.

This is local frontend behavior: shared state works when switching test identities in this browser. It is not cross-device messaging, Zoom audio capture, automatic summarization or email delivery. Preview identity switching and hidden UI controls are not production authorization.

## Can notes be generated without anyone typing?

Yes. A future integration can capture an authorized transcript and summarize it, or receive Zoom's own completed AI summary. Zoom documents automatic summary startup, configurable sharing, and eligible account requirements. Those provider capabilities do not mean FacultyConnect is already connected. [Zoom meeting-summary settings](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0057960).

Zoom exposes a `meeting.summary_completed` webhook after a summary is available, with meeting identity and summary content. The host needs an eligible account, the summary feature enabled, and the application's event subscription configured. Receiving `meeting.ended` alone does not provide a summary. [Zoom meeting-summary webhook](https://developers.zoom.us/docs/api/meetings/events/#meeting-summary-completed).

The proposed workflow is:

`Consented Zoom meeting -> transcript/recap becomes available -> save to the exact appointment -> Conversation record tab`

The user asked for this automatic record to be separate from human Notes, with its UI visible for a professor demonstration. The Conversation record tab supports stored processing/ready/failed states and includes a local View example format control. Its example is explicitly fictional, is not saved as a recording, and is never added to the Notes thread. The real publication/access policy remains a backend decision; no choice silently authorizes recording, provider connections or external messages.

## Future backend contract

- Authenticate each request and verify the viewer is the booking's student or professor before returning any thread. Administrative support access requires a separately approved policy.
- Provide list/create/update/delete note endpoints scoped to a booking, with server timestamps, author ownership, maximum lengths, revision checks and idempotent creation. Validate on the server as well as in the frontend.
- Store shared notes durably and deliver participant updates through authenticated subscriptions or polling. Publish notifications after the note transaction commits. Email delivery is a separate queued integration, not a property of a local Send note button.
- Keep provider tokens server-side. Verify incoming provider webhooks, acknowledge them promptly, and enqueue processing. Match summaries to the exact provider meeting instance and owning FacultyConnect booking, not its title alone.
- Deduplicate provider events and summary revisions. Preserve summary source metadata and distinguish pending, processing, ready and failed states. Retries must not post duplicate summaries.
- Maintain separate draft/review/publication states for automatic summaries. Editing a draft must not expose it to the student. Only the approved publication action or an explicitly selected automatic-sharing policy may publish the separate conversation record; it must not impersonate a participant message in Notes.
- Obtain and record the required participant permissions for capture; expose capture/sharing controls and agree retention and deletion behavior before enabling the integration. In production, use authoritative meeting-start/end events and server time to enforce the chat window, including closing early when Zoom reports that the call ended. The frontend preview currently knows the scheduled window only. Account ownership, backend stack, provider eligibility and publication policy remain decisions.

No live audio, transcript, recording, provider token or real external message is created by this frontend implementation.
