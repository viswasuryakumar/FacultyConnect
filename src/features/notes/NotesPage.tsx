import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MessageSquareText, Search } from 'lucide-react';
import { useApp } from '../../app/context';
import { Avatar, Badge, Button, EmptyState, Notice, PageHeader } from '../../components/ui';
import { now } from '../../domain/clock';
import { noteWindowStatus } from '../../domain/notes';
import { dateLabel, timeLabel, zoneLabel } from '../../lib/format';

export function NotesPage() {
  const { state, user } = useApp();
  const [search, setSearch] = useState('');
  const [at, setAt] = useState(() => now());
  useEffect(() => {
    // Re-check so a meeting appears here as soon as it starts.
    const timer = setInterval(() => setAt(now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  if (user.role === 'admin')
    return (
      <>
        <PageHeader
          title="Meeting notes"
          description="Shared conversations stay with the people taking part."
        />
        <Notice>
          Meeting notes are available only to the student and professor in each appointment.
        </Notice>
      </>
    );
  const query = search.trim().toLowerCase();
  const meetings = Object.values(state.bookings)
    .filter((booking) => booking.studentId === user.id || booking.professorId === user.id)
    .map((booking) => {
      const notes = Object.values(state.notes)
        .filter((note) => note.bookingId === booking.id)
        .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
      const person =
        state.profiles[user.role === 'professor' ? booking.studentId : booking.professorId];
      const updatedAt = notes.reduce(
        (latest, note) => Math.max(latest, Date.parse(note.editedAt ?? note.createdAt)),
        0,
      );
      const live = noteWindowStatus(booking, at) === 'open';
      return { booking, notes, person, updatedAt, live };
    })
    // Only meetings in progress or already held; future meetings cannot have notes yet.
    .filter(
      ({ booking, notes, live }) =>
        live ||
        booking.status === 'completed' ||
        noteWindowStatus(booking, at) === 'ended' ||
        notes.length > 0,
    )
    .filter(
      ({ booking, notes, person }) =>
        !query ||
        `${person.name} ${booking.topic} ${booking.meetingType} ${notes.map((note) => note.body).join(' ')}`
          .toLowerCase()
          .includes(query),
    )
    .sort(
      (a, b) =>
        Number(b.live) - Number(a.live) ||
        Math.max(b.updatedAt, Date.parse(b.booking.start)) -
          Math.max(a.updatedAt, Date.parse(a.booking.start)),
    );

  return (
    <>
      <PageHeader
        title="Meeting notes"
        description="Chat during a meeting and revisit the shared messages afterward."
      />
      <div className="search-row notes-search">
        <div className="search-input">
          <Search size={19} />
          <input
            aria-label="Search meeting notes"
            placeholder="Search by participant, meeting topic, or note"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        {search && (
          <Button variant="secondary" onClick={() => setSearch('')}>
            Clear search
          </Button>
        )}
      </div>
      <div className="notes-list-heading">
        <span className="muted">
          {meetings.length} {meetings.length === 1 ? 'meeting' : 'meetings'}
        </span>
        <span className="muted">Ongoing and past meetings, most recent first</span>
      </div>
      {meetings.length ? (
        <div className="meeting-notebooks">
          {meetings.map(({ booking, person, notes, updatedAt, live }) => {
            const last = notes.at(-1);
            return (
              <Link
                className="meeting-notebook"
                key={booking.id}
                to={`/meetings/${booking.id}?tab=notes`}
                aria-label={`Open notes: ${booking.topic}`}
              >
                <div className="notebook-heading">
                  <Avatar profile={person} />
                  <div className="notebook-person">
                    <h2>{person.name}</h2>
                    <p className="muted">{booking.topic}</p>
                  </div>
                  <Badge status={live ? 'In progress' : booking.status} />
                  <ArrowRight className="notebook-arrow" size={18} />
                </div>
                <p className={`notebook-excerpt ${last ? '' : 'muted'}`}>
                  {last
                    ? `${last.authorId === user.id ? 'You' : (state.profiles[last.authorId]?.name ?? 'Participant')}: ${last.body}`
                    : live
                      ? 'Meeting in progress. Chat is open now.'
                      : 'No notes were shared in this meeting.'}
                </p>
                <div className="notebook-meta">
                  <span>
                    <MessageSquareText size={14} />
                    {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                  </span>
                  <span>
                    {updatedAt
                      ? `Updated ${dateLabel(new Date(updatedAt), user.timeZone)} at ${timeLabel(new Date(updatedAt), user.timeZone)}`
                      : `${dateLabel(booking.start, user.timeZone)} at ${timeLabel(booking.start, user.timeZone)}`}
                    <span className="notebook-zone"> · {zoneLabel(user.timeZone)}</span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={query ? 'No matching meeting notes' : 'Your meeting notes will live here'}
          description={
            query
              ? 'Try a participant name, a different topic, or a word from a note.'
              : 'Notes appear here once a meeting starts. Upcoming meetings are listed in My Meetings.'
          }
          action={
            query ? (
              <Button onClick={() => setSearch('')}>Clear search</Button>
            ) : (
              <Link className="button button-primary" to="/meetings">
                View my meetings
              </Link>
            )
          }
        />
      )}
      <p className="notes-page-caption muted">
        Only meetings that are in progress or already held are listed. Chat is open only during the
        scheduled time; messages stay available to read afterward.
      </p>
    </>
  );
}
