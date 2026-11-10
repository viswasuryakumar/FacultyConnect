import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Download,
  Mail,
  RefreshCw,
  Video,
  X,
} from 'lucide-react';
import { useApp } from '../../app/context';
import { service } from '../../services/preview';
import { now } from '../../domain/clock';
import { MeetingNotes } from '../notes/MeetingNotes';
import { ConversationRecordPanel } from '../notes/ConversationRecord';
import type { Booking } from '../../domain/types';
import {
  Avatar,
  Badge,
  Button,
  EmptyState,
  Field,
  Modal,
  Notice,
  PageHeader,
} from '../../components/ui';
import { dateKey, dateLabel, errorMessage, timeLabel, zoneLabel } from '../../lib/format';

function BookingRow({ booking, request = false }: { booking: Booking; request?: boolean }) {
  const { state, user } = useApp();
  const professor = state.session?.role === 'professor';
  const person = state.profiles[professor ? booking.studentId : booking.professorId];
  return (
    <Link
      className="meeting-row"
      aria-label={`${request ? 'Review request' : 'View details'}: ${booking.topic}`}
      to={`/meetings/${booking.id}`}
    >
      <Avatar profile={person} />
      <div className="meeting-person">
        <h3>{person.name}</h3>
        <p>
          {booking.meetingType}
          {request ? ` · ${booking.topic}` : ''}
        </p>
      </div>
      <div className="meeting-row-date">
        {dateLabel(booking.start, user.timeZone)}
        <br />
        <small>
          {timeLabel(booking.start, user.timeZone)}–{timeLabel(booking.end, user.timeZone)} ·{' '}
          {zoneLabel(user.timeZone)}
        </small>
      </div>
      <Badge status={booking.status} />
      <span className="text-link">
        {request ? 'Review request' : 'View details'}
        <ArrowRight size={15} />
      </span>
    </Link>
  );
}
export function Meetings() {
  const { state, user } = useApp();
  const [tab, setTab] = useState('Upcoming');
  const [date, setDate] = useState('');
  const professor = state.session?.role === 'professor';
  const all = Object.values(state.bookings)
    .filter((b) => (professor ? b.professorId === user.id : b.studentId === user.id))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const meetings = all.filter(
    (b) =>
      (tab === 'All' ||
        (tab === 'Upcoming' &&
          ['pending', 'confirmed'].includes(b.status) &&
          Date.parse(b.end) > now().getTime()) ||
        tab.toLowerCase() === b.status) &&
      (!date || dateKey(b.start, user.timeZone) === date),
  );
  return (
    <>
      <PageHeader
        title="My meetings"
        description="Your conversations, from the first request to the next step."
        actions={
          !professor ? (
            <Link className="button button-secondary" to="/professors">
              Find professors
              <ArrowRight size={15} />
            </Link>
          ) : undefined
        }
      />
      <div className="tabs" role="tablist" aria-label="Meeting status">
        {['Upcoming', 'Pending', 'Confirmed', 'Declined', 'Cancelled', 'Completed', 'All'].map(
          (t) => (
            <button
              key={t}
              role="tab"
              aria-selected={tab === t}
              className={`tab ${tab === t ? 'active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t}
              {t === 'Pending' ? ` · ${all.filter((b) => b.status === 'pending').length}` : ''}
            </button>
          ),
        )}
      </div>
      <div className="list-tools">
        <span className="muted small">
          {meetings.length} {meetings.length === 1 ? 'appointment' : 'appointments'} ·{' '}
          {zoneLabel(user.timeZone)} · Earliest first
        </span>
        <div className="row compact">
          <input
            aria-label="Filter meetings by date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {date && (
            <button
              className="text-link"
              aria-label="Clear date filter"
              onClick={() => setDate('')}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      {meetings.length ? (
        <div className="meeting-list">
          {meetings.map((b) => (
            <BookingRow booking={b} key={b.id} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={
            date
              ? 'No meetings on this date'
              : `No ${tab === 'All' ? '' : tab.toLowerCase() + ' '}meetings`
          }
          description="Your requests and appointments will appear here. Try another filter or find a professor to meet."
          action={
            <Button
              variant="secondary"
              onClick={() => {
                setTab('All');
                setDate('');
              }}
            >
              Show all meetings
            </Button>
          }
        />
      )}
    </>
  );
}
export function Requests() {
  const { state, user } = useApp();
  const [tab, setTab] = useState('Pending');
  const all = Object.values(state.bookings)
    .filter((b) => b.professorId === user.id)
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const status = tab === 'Accepted' ? 'confirmed' : tab.toLowerCase();
  const items = all.filter((b) => b.status === status);
  return (
    <>
      <PageHeader
        title="Meeting requests"
        description="A little context makes a better conversation. Review each student’s topic before responding."
      />
      <div className="tabs" role="tablist" aria-label="Request status">
        {['Pending', 'Accepted', 'Declined'].map((t) => (
          <button
            className={`tab ${tab === t ? 'active' : ''}`}
            role="tab"
            aria-selected={tab === t}
            key={t}
            onClick={() => setTab(t)}
          >
            {t}
            {t === 'Pending' ? ` · ${all.filter((b) => b.status === 'pending').length}` : ''}
          </button>
        ))}
      </div>
      <div className="request-heading">
        <span>STUDENT / TOPIC</span>
        <span>REQUESTED TIME</span>
      </div>
      {items.length ? (
        <div className="meeting-list">
          {items.map((b) => (
            <BookingRow key={b.id} booking={b} request />
          ))}
        </div>
      ) : (
        <EmptyState
          title={`No ${tab.toLowerCase()} requests`}
          description={
            tab === 'Pending'
              ? 'You’re up to date. New student requests will appear here.'
              : 'Requests you respond to will appear in the appropriate tab.'
          }
        />
      )}
      <p className="muted small" style={{ marginTop: 22 }}>
        Times shown in {zoneLabel(user.timeZone)} · Ordered by requested meeting time
      </p>
    </>
  );
}
function downloadCalendar(booking: Booking, professorName: string) {
  const stamp = (value: string) =>
    new Date(value)
      .toISOString()
      .replaceAll('-', '')
      .replaceAll(':', '')
      .replace(/\.\d{3}/, '');
  const safe = (value: string) =>
    value
      .replaceAll('\\', '\\\\')
      .replaceAll('\n', '\\n')
      .replaceAll(',', '\\,')
      .replaceAll(';', '\\;');
  const text = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//FacultyConnect//Preview//EN',
    'BEGIN:VEVENT',
    `UID:${booking.id}@facultyconnect.preview`,
    `DTSTAMP:${stamp(now().toISOString())}`,
    `DTSTART:${stamp(booking.start)}`,
    `DTEND:${stamp(booking.end)}`,
    `SUMMARY:${safe(`${booking.meetingType} with ${professorName}`)}`,
    `DESCRIPTION:${safe('Sample appointment from FacultyConnect frontend preview. ' + booking.topic)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'facultyconnect-preview.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function MeetingDetails() {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { state, user, notify, explain } = useApp();
  const booking = state.bookings[id ?? ''];
  const [error, setError] = useState('');
  const [decision, setDecision] = useState<'decline' | 'cancel' | null>(null);
  const [reason, setReason] = useState('');
  if (!booking)
    return (
      <EmptyState
        title="Meeting not found"
        description="This appointment may have been removed when the demo was reset."
        action={<Link to="/meetings">Back to meetings</Link>}
      />
    );
  const isProfessor = state.session?.role === 'professor';
  const isAdmin = state.session?.role === 'admin';
  const notesSelected = !isAdmin && searchParams.get('tab') === 'notes';
  const conversationSelected = !isAdmin && searchParams.get('tab') === 'conversation';
  const meetingTabs = ['details', 'notes', 'conversation'] as const;
  const selectedTab = notesSelected ? 'notes' : conversationSelected ? 'conversation' : 'details';
  if (!isAdmin && booking.studentId !== user.id && booking.professorId !== user.id)
    return (
      <EmptyState
        title="This meeting belongs to another preview identity"
        action={<Link to="/meetings">Back to your meetings</Link>}
      />
    );
  const person = state.profiles[isProfessor || isAdmin ? booking.studentId : booking.professorId];
  const professor = state.profiles[booking.professorId];
  const student = state.profiles[booking.studentId];
  const active = ['pending', 'confirmed'].includes(booking.status);
  const future = Date.parse(booking.end) > now().getTime();
  const noteCount = isAdmin
    ? 0
    : Object.values(state.notes ?? {}).filter((note) => note.bookingId === booking.id).length;
  function selectMeetingTab(tab: 'details' | 'notes' | 'conversation') {
    const next = new URLSearchParams(searchParams);
    if (tab === 'details') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next);
  }

  function act(callback: () => void, message: string) {
    setError('');
    try {
      callback();
      notify(message);
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  return (
    <>
      <Link
        className="back-link"
        to={
          isProfessor && booking.status === 'pending'
            ? '/requests'
            : isAdmin
              ? '/admin/bookings'
              : '/meetings'
        }
      >
        <ArrowLeft size={15} />
        {isProfessor && booking.status === 'pending' ? 'Back to requests' : 'Back to all meetings'}
      </Link>
      <PageHeader
        title={
          conversationSelected
            ? 'Conversation record'
            : notesSelected
              ? 'Meeting notes'
              : isProfessor && booking.status === 'pending'
                ? `Request from ${person.name}`
                : 'Meeting details'
        }
        description={
          notesSelected || conversationSelected
            ? `${person.name} · ${dateLabel(booking.start, user.timeZone)} · ${timeLabel(booking.start, user.timeZone)} · ${zoneLabel(user.timeZone)}`
            : undefined
        }
        actions={<Badge status={booking.status} />}
      />
      {error && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      {!isAdmin && (
        <div
          className="tabs"
          role="tablist"
          aria-label="Meeting information"
          onKeyDown={(event) => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const selectedIndex = meetingTabs.indexOf(selectedTab);
            const nextIndex =
              event.key === 'Home'
                ? 0
                : event.key === 'End'
                  ? 2
                  : (selectedIndex + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
            const nextTab = meetingTabs[nextIndex];
            selectMeetingTab(nextTab);
            document.getElementById(`meeting-tab-${nextTab}`)?.focus();
          }}
        >
          <button
            id="meeting-tab-details"
            className={`tab ${selectedTab === 'details' ? 'active' : ''}`}
            role="tab"
            aria-selected={selectedTab === 'details'}
            aria-controls="meeting-panel-details"
            tabIndex={selectedTab === 'details' ? 0 : -1}
            onClick={() => selectMeetingTab('details')}
          >
            Details
          </button>
          <button
            id="meeting-tab-notes"
            className={`tab ${notesSelected ? 'active' : ''}`}
            role="tab"
            aria-selected={notesSelected}
            aria-controls="meeting-panel-notes"
            tabIndex={notesSelected ? 0 : -1}
            onClick={() => selectMeetingTab('notes')}
          >
            Notes{noteCount ? ` · ${noteCount}` : ''}
          </button>
          <button
            id="meeting-tab-conversation"
            className={`tab ${conversationSelected ? 'active' : ''}`}
            role="tab"
            aria-selected={conversationSelected}
            aria-controls="meeting-panel-conversation"
            tabIndex={conversationSelected ? 0 : -1}
            onClick={() => selectMeetingTab('conversation')}
          >
            Conversation record
          </button>
        </div>
      )}
      {notesSelected ? (
        <section id="meeting-panel-notes" role="tabpanel" aria-labelledby="meeting-tab-notes">
          <MeetingNotes key={`${booking.id}:${user.id}`} bookingId={booking.id} />
        </section>
      ) : conversationSelected ? (
        <section
          id="meeting-panel-conversation"
          role="tabpanel"
          aria-labelledby="meeting-tab-conversation"
        >
          <ConversationRecordPanel key={`${booking.id}:${user.id}`} bookingId={booking.id} />
        </section>
      ) : (
        <div
          className="detail-grid"
          id="meeting-panel-details"
          role={!isAdmin ? 'tabpanel' : undefined}
          aria-labelledby={!isAdmin ? 'meeting-tab-details' : undefined}
        >
          <article className="panel detail-panel">
            <div className="profile-heading">
              <Avatar profile={person} size="lg" />
              <div>
                <h2>{person.name}</h2>
                <p className="muted">{person.university}</p>
                <p className="muted">{person.department}</p>
              </div>
            </div>
            <div className="summary-line">
              <CalendarDays size={19} />
              <span>
                {dateLabel(booking.start, user.timeZone, true)}
                <br />
                {timeLabel(booking.start, user.timeZone)}–{timeLabel(booking.end, user.timeZone)}
                <br />
                <small className="muted">{zoneLabel(user.timeZone)} · 30 minutes</small>
              </span>
            </div>
            {(isProfessor || isAdmin) && (
              <div className="detail-section student-contact">
                <h3>Student email</h3>
                {student.email ? (
                  <a
                    className="student-email"
                    href={`mailto:${encodeURIComponent(student.email).replace('%40', '@')}`}
                  >
                    <Mail size={16} />
                    {student.email}
                  </a>
                ) : (
                  <p className="muted">No student email provided.</p>
                )}
              </div>
            )}
            <div className="detail-section">
              <h3>Meeting type</h3>
              <p>{booking.meetingType}</p>
            </div>
            <div className="detail-section">
              <h3>Discussion topic</h3>
              <p>
                <strong>{booking.topic}</strong>
              </p>
            </div>
            <div className="detail-section">
              <h3>
                {isProfessor || isAdmin ? 'Student message' : 'Your message to the professor'}
              </h3>
              <p style={{ whiteSpace: 'pre-wrap' }}>{booking.context}</p>
            </div>
            {booking.reason && (
              <div className="detail-section">
                <h3>
                  {booking.status === 'declined' ? 'Reason for declining' : 'Cancellation reason'}
                </h3>
                <p>{booking.reason}</p>
              </div>
            )}
            {booking.reschedule && (
              <div className="detail-section">
                <Notice>
                  <strong>New time proposed</strong>
                  <p>
                    {dateLabel(booking.reschedule.start, user.timeZone, true)} ·{' '}
                    {timeLabel(booking.reschedule.start, user.timeZone)}–
                    {timeLabel(booking.reschedule.end, user.timeZone)}
                  </p>
                  <p>Your original appointment remains confirmed until this change is agreed.</p>
                </Notice>
                {booking.reschedule.proposedBy !== user.id && !isAdmin ? (
                  <div className="row" style={{ marginTop: 13 }}>
                    <Button
                      onClick={() =>
                        act(
                          () => service.respondReschedule(booking.id, true),
                          'New meeting time agreed',
                        )
                      }
                    >
                      <Check size={16} />
                      Accept new time
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() =>
                        act(
                          () => service.respondReschedule(booking.id, false),
                          'Proposal declined. Original time kept.',
                        )
                      }
                    >
                      Keep original time
                    </Button>
                  </div>
                ) : (
                  <p className="muted small" style={{ marginTop: 12 }}>
                    Waiting for the other participant to respond.
                  </p>
                )}
              </div>
            )}
            {active && future && !isAdmin && (
              <div className="detail-actions">
                {isProfessor && booking.status === 'pending' ? (
                  <>
                    <Button
                      onClick={() =>
                        act(
                          () => service.acceptBooking(booking.id),
                          'Request accepted. The meeting is confirmed.',
                        )
                      }
                    >
                      <Check size={16} />
                      Accept request
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setReason('');
                        setDecision('decline');
                      }}
                    >
                      Decline request
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      className="button button-secondary"
                      aria-disabled={!!booking.reschedule}
                      to={booking.reschedule ? '#' : `/meetings/${booking.id}/reschedule`}
                      onClick={(e) => {
                        if (booking.reschedule) e.preventDefault();
                      }}
                    >
                      <RefreshCw size={15} />
                      {booking.status === 'pending'
                        ? 'Change requested time'
                        : isProfessor
                          ? 'Propose reschedule'
                          : 'Reschedule'}
                    </Link>
                    <Button
                      variant="danger"
                      onClick={() => {
                        setReason('');
                        setDecision('cancel');
                      }}
                    >
                      {booking.status === 'pending' ? 'Cancel request' : 'Cancel meeting'}
                    </Button>
                  </>
                )}
              </div>
            )}
          </article>
          <aside className="zoom-panel">
            <span className="zoom-icon">
              <Video size={24} />
            </span>
            {booking.status === 'pending' ? (
              <>
                <h2>
                  {isProfessor
                    ? 'Your response is needed'
                    : isAdmin
                      ? 'Awaiting professor response'
                      : 'Waiting for acceptance'}
                </h2>
                <p>
                  {isProfessor
                    ? "Review the student's request, then accept or decline it below."
                    : isAdmin
                      ? 'This request is waiting for the professor to accept or decline it.'
                      : "Your professor is reviewing the request. You'll see an update here when they respond."}
                </p>
                <div className="divider" style={{ margin: '5px 0' }} />
                <p className="muted">
                  The Zoom link appears after acceptance and successful meeting setup.
                </p>
              </>
            ) : booking.status === 'confirmed' ? (
              <>
                <Badge status={booking.linkState} />
                <h2>
                  {booking.linkState === 'ready'
                    ? 'You’re ready to meet'
                    : booking.linkState === 'failed'
                      ? 'Meeting link needs attention'
                      : 'Your meeting is reserved'}
                </h2>
                <p>
                  {booking.linkState === 'ready'
                    ? 'Open your confirmed meeting in Zoom when it’s time to join.'
                    : booking.linkState === 'failed'
                      ? 'Your appointment remains confirmed. Retry the simulated meeting setup below.'
                      : 'We’re preparing the simulated meeting link. The appointment is already confirmed.'}
                </p>
                {booking.linkState === 'ready' && (
                  <Button
                    variant="zoom"
                    onClick={() =>
                      explain(
                        'Join Zoom — preview',
                        `This action belongs to your ${dateLabel(booking.start, user.timeZone)} appointment with ${person.name}. In production the backend will supply this meeting’s Zoom URL. No external meeting opens in this frontend preview.`,
                      )
                    }
                  >
                    <Video size={16} />
                    Join Zoom
                  </Button>
                )}
                {booking.linkState === 'failed' && (
                  <Button
                    onClick={() =>
                      act(() => service.retryLink(booking.id), 'Meeting setup is being retried')
                    }
                  >
                    <RefreshCw size={16} />
                    Retry link setup
                  </Button>
                )}
                <Button
                  variant="secondary"
                  onClick={() => {
                    downloadCalendar(booking, professor.name);
                    notify('Sample calendar file downloaded');
                  }}
                >
                  <Download size={16} />
                  Add to calendar
                </Button>
                <p className="muted small">
                  Downloads a preview .ics file. Google Calendar is not connected.
                </p>
              </>
            ) : (
              <>
                <Badge status={booking.status} />
                <h2>
                  {booking.status === 'completed'
                    ? 'Conversation complete'
                    : booking.status === 'declined'
                      ? 'Request declined'
                      : 'Meeting cancelled'}
                </h2>
                <p>
                  {booking.status === 'completed'
                    ? 'Keep the conversation going with another question or a new idea.'
                    : 'This appointment no longer has a bookable reservation or active meeting link.'}
                </p>
                {!isProfessor && !isAdmin && (
                  <Link className="button button-secondary" to={`/professors/${professor.id}`}>
                    Find another time <ArrowRight size={16} />
                  </Link>
                )}
              </>
            )}
            <div className="row muted small">
              <Clock3 size={14} />
              30-minute appointment
            </div>
          </aside>
        </div>
      )}
      {decision && (
        <Modal
          title={
            decision === 'decline'
              ? 'Decline this request?'
              : booking.status === 'pending'
                ? 'Cancel this request?'
                : 'Cancel this meeting?'
          }
          onClose={() => setDecision(null)}
        >
          <p>
            {decision === 'decline'
              ? 'Give the student a brief reason so they understand your decision.'
              : 'The other participant will receive a local notification. You can request another time later.'}
          </p>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              try {
                if (decision === 'decline') service.declineBooking(booking.id, reason);
                else service.cancelBooking(booking.id, reason);
                setDecision(null);
                notify(decision === 'decline' ? 'Request declined' : 'Appointment cancelled');
              } catch (e) {
                setError(errorMessage(e));
                setDecision(null);
              }
            }}
          >
            <Field
              label={decision === 'decline' ? 'Reason for declining' : 'Reason for cancellation'}
            >
              <textarea
                autoFocus
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="A short explanation for the other participant…"
              />
            </Field>
            <div className="row">
              <Button variant="secondary" type="button" onClick={() => setDecision(null)}>
                Keep appointment
              </Button>
              <Button type="submit" variant="danger">
                {decision === 'decline' ? 'Confirm decline' : 'Confirm cancellation'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
