import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, CalendarDays, GraduationCap, Video } from 'lucide-react';
import { useApp } from '../../app/context';
import { Avatar, Badge, Button, EmptyState, PageHeader } from '../../components/ui';
import { dateLabel, timeLabel, zoneLabel, dateKey } from '../../lib/format';
import { now } from '../../domain/clock';
export function Dashboard() {
  const { state, user, explain } = useApp();
  const isProfessor = state.session?.role === 'professor';
  const meetings = Object.values(state.bookings)
    .filter((b) => (isProfessor ? b.professorId === user.id : b.studentId === user.id))
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
  const upcoming = meetings.filter(
    (b) => Date.parse(b.start) > now().getTime() && ['pending', 'confirmed'].includes(b.status),
  );
  const pending = meetings.filter((b) => b.status === 'pending');
  const next = upcoming.find((b) => b.status === 'confirmed');
  const person = next ? state.profiles[isProfessor ? next.studentId : next.professorId] : null;
  const later = upcoming.filter((b) => b.status === 'confirmed' && b.id !== next?.id);
  const name = isProfessor ? `Dr. ${user.name.split(' ').at(-1)}` : user.name.split(' ')[0];
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: user.timeZone,
      hour: 'numeric',
      hourCycle: 'h23',
    }).format(now()),
  );
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return (
    <>
      <PageHeader
        title={`${greeting}, ${name}`}
        description={
          isProfessor
            ? `${dateLabel(now(), user.timeZone, true)} · ${zoneLabel(user.timeZone)}`
            : 'Your next conversation starts here.'
        }
        actions={
          <span className="muted small row">
            <CalendarDays size={15} />
            {dateLabel(now(), user.timeZone)}
          </span>
        }
      />
      <div className="dashboard-grid">
        {next && person ? (
          <section className="next-meeting">
            <Link
              className="meeting-card-link"
              to={`/meetings/${next.id}`}
              aria-label={`Open meeting: ${next.topic}`}
            >
              <span className="visually-hidden">Open meeting details</span>
            </Link>
            <div className="row-between">
              <Badge status={next.status} />
              <span className="meeting-caption">Your next meeting</span>
            </div>
            {isProfessor ? (
              <div className="row">
                <Avatar profile={person} />
                <div>
                  <h2>{person.name}</h2>
                  <p className="small muted">
                    {next.meetingType} · {next.topic}
                  </p>
                </div>
              </div>
            ) : (
              <h2>
                {next.meetingType} with {person.name}
              </h2>
            )}
            <div className="row-between">
              <div className="stack compact">
                <span className="meeting-time">
                  <CalendarDays size={16} />
                  {dateKey(next.start, user.timeZone) === dateKey(now(), user.timeZone)
                    ? 'Today'
                    : dateLabel(next.start, user.timeZone)}{' '}
                  · {timeLabel(next.start, user.timeZone)}–{timeLabel(next.end, user.timeZone)}
                </span>
                <span className="muted small">30 minutes · {zoneLabel(user.timeZone)}</span>
              </div>
              {next.linkState === 'ready' ? (
                <Button
                  variant="zoom"
                  onClick={() =>
                    explain(
                      'Join Zoom — preview',
                      `This is the meeting-specific action for ${next.meetingType} with ${person.name}. No external meeting opens in this preview. In production the backend will provide this appointment’s Zoom link.`,
                    )
                  }
                >
                  <Video size={17} />
                  Join Zoom
                </Button>
              ) : (
                <Link className="button button-secondary" to={`/meetings/${next.id}`}>
                  View meeting <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </section>
        ) : (
          <EmptyState
            title="Make room for your next conversation"
            description={
              isProfessor
                ? 'Your confirmed appointments will appear here.'
                : 'Find a professor and choose a time that works for you.'
            }
            action={
              <Link
                className="button button-primary"
                to={isProfessor ? '/availability' : '/professors'}
              >
                {isProfessor ? 'Set availability' : 'Find professors'}
              </Link>
            }
          />
        )}
        <aside>
          <div className="stats-grid">
            <div className="stat">
              <strong>{upcoming.filter((b) => b.status === 'confirmed').length}</strong>
              <span>Upcoming meetings</span>
            </div>
            <div className="stat">
              <strong>{pending.length}</strong>
              <span>Pending {pending.length === 1 ? 'request' : 'requests'}</span>
            </div>
          </div>
          <Link className="text-link stats-link" to="/meetings">
            View all meetings <ArrowRight size={16} />
          </Link>
          {isProfessor && (
            <Link className="text-link stats-link" to="/requests">
              Review requests <ArrowRight size={16} />
            </Link>
          )}
        </aside>
      </div>
      {isProfessor ? (
        <>
          {later.length > 0 && (
            <>
              <div className="section-heading">
                <h2>Next after this</h2>
              </div>
              <div className="panel panel-pad stack">
                {later.slice(0, 3).map((b) => (
                  <Link className="row-between" key={b.id} to={`/meetings/${b.id}`}>
                    <span className="small">
                      {dateLabel(b.start, user.timeZone)} · {timeLabel(b.start, user.timeZone)} ·{' '}
                      {state.profiles[b.studentId].name}
                    </span>
                    <ArrowRight size={16} />
                  </Link>
                ))}
              </div>
            </>
          )}
          <div className="section-heading">
            <h2>Needs your response</h2>
            <Link className="text-link" to="/requests">
              See all {pending.length} requests <ArrowRight size={15} />
            </Link>
          </div>
          {pending.length ? (
            <div className="panel panel-pad">
              {pending.slice(0, 2).map((b) => (
                <div className="settings-row" key={b.id}>
                  <div className="row">
                    <Avatar profile={state.profiles[b.studentId]} size="sm" />
                    <div>
                      <h3>{state.profiles[b.studentId].name}</h3>
                      <p className="muted small">
                        {dateLabel(b.start, user.timeZone)} · {timeLabel(b.start, user.timeZone)} ·{' '}
                        {b.meetingType}
                      </p>
                    </div>
                  </div>
                  <Link className="text-link" to={`/meetings/${b.id}`}>
                    Review request <ArrowRight size={16} />
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No requests waiting"
              description="New student requests will appear here."
            />
          )}
        </>
      ) : (
        <>
          <section className="discovery-section">
            <h2>Find your next professor</h2>
            <p className="muted">
              A fresh perspective is closer than you think. Explore by subject or university.
            </p>
            <div className="discovery-actions">
              <Link className="button button-primary" to="/professors?subject=Machine+learning">
                <BookOpen size={16} />
                Browse by subject
              </Link>
              <Link
                className="button button-secondary"
                to={`/professors?university=${encodeURIComponent(user.university)}`}
              >
                <GraduationCap size={17} />
                Browse by university
              </Link>
              <Link className="interest-chip" to="/professors?subject=Machine+learning">
                Machine learning
              </Link>
              <Link className="interest-chip" to="/professors?q=Research">
                Research methods
              </Link>
            </div>
          </section>
        </>
      )}
    </>
  );
}
