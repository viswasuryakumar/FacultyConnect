import { useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Video,
} from 'lucide-react';
import { useApp } from '../../app/context';
import { service } from '../../services/preview';
import { now } from '../../domain/clock';
import { Avatar, Badge, Button, EmptyState, Field, Notice, PageHeader } from '../../components/ui';
import {
  dateKey,
  dateLabel,
  dayOffset,
  errorMessage,
  timeLabel,
  TIME_ZONES,
  zoneLabel,
} from '../../lib/format';

export function ChooseTime({ reschedule = false }: { reschedule?: boolean }) {
  const { id } = useParams();
  const { state, user, notify } = useApp();
  const navigate = useNavigate();
  const booking = reschedule ? state.bookings[id ?? ''] : undefined;
  const professorId = reschedule ? booking?.professorId : id;
  const professor = state.profiles[professorId ?? ''];
  const [zone, setZone] = useState(user.timeZone);
  const today = dateKey(now(), zone);
  const [month, setMonth] = useState(() => {
    const first = professorId
      ? Array.from({ length: 30 }, (_, i) => dayOffset(today, i)).find(
          (d) => service.getSlots(professorId, d, zone, booking?.id).length,
        )
      : undefined;
    return (first ?? today).slice(0, 7);
  });
  const [selectedDate, setSelectedDate] = useState(() =>
    professorId
      ? (Array.from({ length: 30 }, (_, i) => dayOffset(today, i)).find(
          (d) => service.getSlots(professorId, d, zone, booking?.id).length,
        ) ?? today)
      : today,
  );
  const [slot, setSlot] = useState('');
  const [error, setError] = useState('');
  if (!professor || (reschedule && !booking))
    return (
      <EmptyState
        title="This appointment is unavailable"
        action={<Link to="/meetings">Back to meetings</Link>}
      />
    );
  const daysInMonth = new Date(`${month}-01T12:00:00Z`);
  daysInMonth.setUTCMonth(daysInMonth.getUTCMonth() + 1);
  daysInMonth.setUTCDate(0);
  const offset = (new Date(`${month}-01T12:00:00Z`).getUTCDay() + 6) % 7;
  const days = Array.from(
    { length: daysInMonth.getUTCDate() },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  );
  const slots = service
    .getSlots(professor.id, selectedDate, zone, booking?.id)
    .filter((s) => s.start !== booking?.start);
  const chosen = slots.find((s) => s.start === slot);
  const availableDays = new Set(
    days.filter((d) =>
      service.getSlots(professor.id, d, zone, booking?.id).some((s) => s.start !== booking?.start),
    ),
  );
  function moveMonth(delta: number) {
    const date = new Date(`${month}-01T12:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(date.toISOString().slice(0, 7));
  }
  function proceed() {
    if (!chosen) return;
    setError('');
    try {
      if (booking) {
        if (booking.status === 'pending') {
          service.changePendingTime(booking.id, chosen.start);
          notify('Requested time updated');
        } else {
          service.proposeReschedule(booking.id, chosen.start);
          notify('New time proposed. Your original meeting remains confirmed.');
        }
        navigate(`/meetings/${booking.id}`);
      } else {
        navigate(
          `/professors/${professor.id}/request?start=${encodeURIComponent(chosen.start)}&zone=${encodeURIComponent(zone)}`,
        );
      }
    } catch (e) {
      setError(errorMessage(e));
    }
  }
  const monthTitle = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${month}-01T12:00:00Z`));
  const dateTitle = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${selectedDate}T12:00:00Z`));
  return (
    <>
      <Link
        className="back-link"
        to={booking ? `/meetings/${booking.id}` : `/professors/${professor.id}`}
      >
        <ArrowLeft size={15} />
        {booking
          ? 'Back to meeting details'
          : `Back to ${professor.name.replace('Dr. ', '').split(' ')[0]}’s profile`}
      </Link>
      <PageHeader
        title={reschedule ? 'Request a new time' : 'Choose a time'}
        description={
          booking
            ? `Current appointment: ${dateLabel(booking.start, zone)} · ${timeLabel(booking.start, zone)}–${timeLabel(booking.end, zone)} · ${zoneLabel(zone)}`
            : `${professor.name} · 30-minute meeting`
        }
      />
      {error && (
        <div style={{ marginBottom: 20 }}>
          <Notice tone="error">{error}</Notice>
        </div>
      )}
      <div className="calendar-layout">
        <section className="calendar" aria-label="Choose a date">
          <div className="calendar-header">
            <h2>{monthTitle}</h2>
            <div className="row compact">
              <Button variant="ghost" aria-label="Previous month" onClick={() => moveMonth(-1)}>
                <ChevronLeft size={20} />
              </Button>
              <Button variant="ghost" aria-label="Next month" onClick={() => moveMonth(1)}>
                <ChevronRight size={20} />
              </Button>
            </div>
          </div>
          <div className="calendar-grid">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <span className="calendar-weekday" key={i}>
                {d}
              </span>
            ))}
            {Array.from({ length: offset }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {days.map((d) => (
              <button
                key={d}
                aria-label={new Intl.DateTimeFormat('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(`${d}T12:00:00Z`))}
                aria-pressed={selectedDate === d}
                disabled={!availableDays.has(d)}
                className={`calendar-day ${availableDays.has(d) ? 'available' : ''} ${selectedDate === d ? 'selected' : ''} ${today === d ? 'today' : ''}`}
                onClick={() => {
                  setSelectedDate(d);
                  setSlot('');
                  setError('');
                }}
              >
                {Number(d.slice(-2))}
              </button>
            ))}
          </div>
          <div className="calendar-note">
            <span />
            Purple dates have available times.
          </div>
          {!availableDays.size && (
            <p className="muted small" style={{ marginTop: 14 }}>
              No openings this month. Try another month or professor.
            </p>
          )}
        </section>
        <section className="slot-panel">
          <div>
            <h2>{dateTitle}</h2>
            <p className="muted small" style={{ marginTop: 7 }}>
              Choose an available 30-minute appointment.
            </p>
          </div>
          <Field label="Your time zone">
            <select
              value={zone}
              onChange={(e) => {
                setZone(e.target.value);
                setSlot('');
              }}
            >
              {TIME_ZONES.map((z) => (
                <option key={z} value={z}>
                  {zoneLabel(z)}
                </option>
              ))}
            </select>
          </Field>
          {slots.length ? (
            <div className="time-slots" aria-label="Available times">
              {slots.map((s) => (
                <button
                  className={`time-slot ${slot === s.start ? 'selected' : ''}`}
                  aria-pressed={slot === s.start}
                  key={s.start}
                  onClick={() => setSlot(s.start)}
                >
                  {timeLabel(s.start, zone)}
                </button>
              ))}
            </div>
          ) : (
            <Notice>No available slots on this date. Choose another purple date.</Notice>
          )}
          {chosen && (
            <div className="slot-summary">
              Selected: {timeLabel(chosen.start, zone)}–{timeLabel(chosen.end, zone)} ·{' '}
              {zoneLabel(zone)}
            </div>
          )}
          {booking?.status === 'confirmed' && (
            <Notice>
              Your current appointment stays confirmed until the other participant agrees to a new
              time.
            </Notice>
          )}
          <Button disabled={!chosen} onClick={proceed}>
            {booking
              ? booking.status === 'pending'
                ? 'Update requested time'
                : 'Send reschedule request'
              : 'Continue'}
            <ArrowRight size={16} />
          </Button>
          <p className="muted small">Times are checked again before your request is saved.</p>
        </section>
      </div>
    </>
  );
}

export function MeetingRequest() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state, user, notify } = useApp();
  const navigate = useNavigate();
  const professor = state.profiles[id ?? ''];
  const start = params.get('start') ?? '';
  const zone = params.get('zone') ?? user.timeZone;
  const [meetingType, setMeetingType] = useState('');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const key = useRef(crypto.randomUUID());
  if (!professor || !Number.isFinite(Date.parse(start)))
    return (
      <EmptyState
        title="Choose a meeting time first"
        action={
          <Link className="button button-primary" to={`/professors/${id ?? 'prof-sarah'}/book`}>
            Choose date & time
          </Link>
        }
      />
    );
  const end = new Date(Date.parse(start) + 30 * 60_000).toISOString();
  const automatic = state.availability[professor.id]?.rules.approval === 'automatic';
  async function submit() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      await Promise.resolve();
      const b = service.submitBooking({
        professorId: professor.id,
        start,
        meetingType: meetingType.trim(),
        topic,
        context,
        idempotencyKey: key.current,
      });
      notify(
        automatic
          ? 'Your meeting is confirmed'
          : 'Request sent. Your professor will review your appointment.',
      );
      navigate('/meetings', { state: { newBookingId: b.id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }
  return (
    <>
      <Link className="back-link" to={`/professors/${professor.id}/book`}>
        <ArrowLeft size={15} />
        Change date or time
      </Link>
      <PageHeader
        title="What would you like to discuss?"
        description="Give your professor a little context to prepare."
      />
      <div className="split-layout">
        <form
          className="panel panel-pad stack"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {error && <Notice tone="error">{error}</Notice>}
          <Field
            label="Meeting type"
            hint="What kind of conversation do you need? Use your own words."
          >
            <input
              autoFocus
              required
              minLength={3}
              maxLength={100}
              value={meetingType}
              onChange={(e) => setMeetingType(e.target.value)}
              placeholder="e.g. Exam preparation, thesis feedback, career advice"
            />
          </Field>
          <Field
            label="Discussion topic"
            hint="The specific question or subject you want to discuss."
          >
            <input
              required
              minLength={3}
              maxLength={180}
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Choosing evaluation metrics for my final-year project"
            />
          </Field>
          <Field
            label="Message to the professor"
            hint="Share your goals, what you’ve tried, and any questions."
          >
            <textarea
              required
              minLength={3}
              maxLength={3000}
              rows={6}
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder="I’d like to review precision and recall and decide which metric fits my project…"
            />
          </Field>
          <div className="divider" style={{ margin: '3px 0' }} />
          <Button disabled={submitting || state.session?.role !== 'student'} type="submit">
            {submitting ? 'Saving…' : automatic ? 'Book meeting' : 'Send meeting request'}
            <ArrowRight size={16} />
          </Button>
          <p className="muted small">
            {automatic
              ? 'Your available time will be reserved immediately.'
              : 'You’ll be notified when the professor responds.'}
          </p>
          {state.session?.role !== 'student' && (
            <Notice>Switch to the student preview to submit a request.</Notice>
          )}
        </form>
        <aside className="panel booking-summary">
          <div className="summary-profile">
            <Avatar profile={professor} />
            <div>
              <h3>{professor.name}</h3>
              <p className="muted small">{meetingType.trim() || '30-minute meeting'}</p>
            </div>
          </div>
          <div className="summary-line">
            <CalendarDays size={18} />
            <span>
              {dateLabel(start, zone, true)}
              <br />
              {timeLabel(start, zone)}–{timeLabel(end, zone)}
              <br />
              <small className="muted">{zoneLabel(zone)}</small>
            </span>
          </div>
          <div className="summary-line">
            <Clock3 size={18} />
            <span>30-minute appointment</span>
          </div>
          <div className="summary-line">
            <Video size={18} />
            <span>
              Meet on Zoom
              <br />
              <small className="muted">Link appears after confirmation and setup.</small>
            </span>
          </div>
          <div className="divider" />
          <Badge status={automatic ? 'Automatic booking' : 'Approval required'} />
        </aside>
      </div>
    </>
  );
}
