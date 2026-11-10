import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useApp } from '../../app/context';
import { Avatar, Badge, Button, EmptyState, Modal, Notice, PageHeader } from '../../components/ui';
import { service } from '../../services/preview';

export function FacultyAccessPage() {
  const { state, notify } = useApp();
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState('');
  const entries = Object.entries(state.facultyAccess).filter(([, status]) => status === tab);
  const profile = selected ? state.profiles[selected] : null;
  const pendingCount = Object.values(state.facultyAccess).filter(
    (status) => status === 'pending',
  ).length;

  function decide(status: 'approved' | 'declined') {
    if (!selected) return;
    setError('');
    try {
      service.setFacultyAccess(selected, status);
      setSelected(null);
      notify(`Faculty access ${status} in the local preview.`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save this decision. Please try again.',
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Faculty access"
        description="Review a professor’s details before approving their access."
      />
      <div className="tabs" role="tablist" aria-label="Faculty access status">
        {[
          ['pending', `Awaiting review · ${pendingCount}`],
          ['approved', 'Active'],
          ['declined', 'Declined'],
        ].map(([value, label]) => (
          <button
            role="tab"
            aria-selected={tab === value}
            className={`tab ${tab === value ? 'active' : ''}`}
            onClick={() => setTab(value)}
            key={value}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="split-layout management-content">
        <section className="stack">
          {!entries.length && (
            <EmptyState
              title={
                tab === 'pending'
                  ? 'All reviews are up to date'
                  : `No ${tab === 'approved' ? 'active' : 'declined'} faculty`
              }
              description={
                tab === 'pending'
                  ? 'New faculty applications will appear here.'
                  : 'Decisions you make in this preview will appear here.'
              }
            />
          )}
          {entries.map(([id, status]) => {
            const person = state.profiles[id];
            if (!person) return null;
            return (
              <article className="panel panel-pad faculty-access-card" key={id}>
                <div className="row">
                  <Avatar profile={person} />
                  <div>
                    <h2 className="section-title">{person.name}</h2>
                    <p className="muted">
                      {person.university} · {person.department}
                    </p>
                  </div>
                </div>
                <p>
                  {status === 'pending'
                    ? 'Profile and affiliation details submitted for review.'
                    : `Access ${status} in this preview.`}
                </p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSelected(id);
                    setError('');
                  }}
                >
                  {status === 'pending' ? 'Review faculty access' : 'View access decision'}
                  <ArrowRight size={16} />
                </Button>
              </article>
            );
          })}
        </section>
        <aside className="availability-preview">
          <ShieldCheck size={25} />
          <h2 className="section-title">Access decision</h2>
          <p>
            Approval is an authorized action. Choosing “Professor” at sign-in does not grant real
            faculty access.
          </p>
          <p className="muted small">
            These local review actions demonstrate the workflow. Affiliation verification and actual
            role grants require a backend.
          </p>
        </aside>
      </div>
      {profile && selected && (
        <Modal title={`Review ${profile.name}’s access`} onClose={() => setSelected(null)}>
          <div className="stack">
            {error && <Notice tone="error">{error}</Notice>}
            <div className="row">
              <Avatar profile={profile} />
              <div>
                <strong>{profile.name}</strong>
                <p className="muted">
                  {profile.academicRole} · {profile.department}
                </p>
              </div>
            </div>
            <dl className="access-details">
              <div>
                <dt>Institution</dt>
                <dd>{profile.university}</dd>
              </div>
              <div>
                <dt>Education</dt>
                <dd>{profile.education || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Expertise</dt>
                <dd>{profile.expertise?.join(', ') || 'Not provided'}</dd>
              </div>
              <div>
                <dt>Review status</dt>
                <dd>{state.facultyAccess[selected]}</dd>
              </div>
            </dl>
            <Notice>
              No documents or affiliations have been verified. This decision only updates the local
              preview.
            </Notice>
            {state.facultyAccess[selected] === 'pending' ? (
              <div className="row wrap">
                <Button onClick={() => decide('approved')}>
                  <Check size={17} /> Approve access
                </Button>
                <Button variant="danger" onClick={() => decide('declined')}>
                  <X size={17} /> Decline access
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={() => setSelected(null)}>
                Close review
              </Button>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}

export function BookingSupportPage() {
  const { state, user, notify } = useApp();
  const [filter, setFilter] = useState('attention');
  const [error, setError] = useState('');
  const bookings = Object.values(state.bookings)
    .filter(
      (booking) =>
        filter === 'all' ||
        (booking.status === 'confirmed' && ['failed', 'preparing'].includes(booking.linkState)) ||
        !!booking.reschedule,
    )
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  function retry(id: string) {
    setError('');
    try {
      service.retryLink(id);
      notify('Meeting link preparation restarted in the preview.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not retry preparation. Please try again.',
      );
    }
  }

  return (
    <>
      <PageHeader
        title="Booking support"
        description="Find the appointment that needs attention and review its current status."
      />
      <div className="tabs" role="tablist" aria-label="Booking support filters">
        {[
          ['attention', 'Needs attention'],
          ['all', 'All appointments'],
        ].map(([value, label]) => (
          <button
            key={value}
            role="tab"
            aria-selected={filter === value}
            className={`tab ${filter === value ? 'active' : ''}`}
            onClick={() => setFilter(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="stack management-content">
        {!bookings.length && (
          <EmptyState
            title="No appointments need attention"
            description="Link setup failures and reschedule proposals appear here."
          />
        )}
        {bookings.map((booking) => (
          <article className="panel panel-pad support-row" key={booking.id}>
            <div className="support-copy">
              <h2 className="section-title">
                {state.profiles[booking.studentId]?.name} <span className="muted">with</span>{' '}
                {state.profiles[booking.professorId]?.name}
              </h2>
              <p className="muted">
                {new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                  timeZone: user.timeZone,
                }).format(new Date(booking.start))}{' '}
                · {booking.meetingType}
              </p>
              <div className="row wrap">
                <Badge status={booking.status} />
                <span className="small muted">
                  {booking.linkState === 'failed'
                    ? 'Meeting link needs attention'
                    : booking.linkState === 'preparing'
                      ? 'Meeting link preparing'
                      : booking.reschedule
                        ? 'Reschedule proposal awaiting agreement'
                        : `Link: ${booking.linkState.replaceAll('_', ' ')}`}
                </span>
              </div>
            </div>
            <div className="row wrap">
              {booking.status === 'confirmed' && booking.linkState === 'failed' && (
                <Button variant="secondary" onClick={() => retry(booking.id)}>
                  <RefreshCw size={16} /> Retry link
                </Button>
              )}
              <Link className="button button-secondary" to={`/meetings/${booking.id}`}>
                View details <ArrowRight size={16} />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <p className="muted small management-actions">
        Preview support actions affect local data only. A confirmed reservation stays booked if
        meeting-link preparation fails.
      </p>
    </>
  );
}
