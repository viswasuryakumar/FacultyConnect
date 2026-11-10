import { useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  CalendarDays,
  GraduationCap,
  Search,
  SlidersHorizontal,
  Star,
} from 'lucide-react';
import { useApp } from '../../app/context';
import { Avatar, Button, EmptyState, Field, Modal, PageHeader } from '../../components/ui';
import { service } from '../../services/preview';
import type { Profile } from '../../domain/types';
import { now } from '../../domain/clock';
import { WeeklySummary } from './WeeklySummary';
import { dateKey, dateLabel, dayOffset, timeLabel, zoneLabel } from '../../lib/format';

export function ProfessorCard({ profile }: { profile: Profile }) {
  const { state, explain } = useApp();
  const saved = state.saved.includes(profile.id);
  return (
    <article className="professor-card">
      <div className="row-between">
        <Avatar profile={profile} />
        <button
          className={`save-button ${saved ? 'is-saved' : ''}`}
          aria-label={`${saved ? 'Unsave' : 'Save'} ${profile.name}`}
          aria-pressed={saved}
          onClick={() =>
            state.session?.role === 'student'
              ? service.toggleSaved(profile.id)
              : explain(
                  'Save a professor',
                  'Use the View as control to switch to the student preview and build a shortlist.',
                )
          }
        >
          <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'Saved' : 'Save'}
        </button>
      </div>
      <h2>{profile.name}</h2>
      <p className="university">{profile.university}</p>
      <p className="expertise">
        {profile.expertise?.slice(0, 3).join(' · ') || profile.department}
      </p>
      <Link className="button button-primary full-width" to={`/professors/${profile.id}`}>
        View profile <ArrowRight size={15} />
      </Link>
      <div className="rating" title="Illustrative preview ratings">
        <Star size={13} />
        <strong>{profile.rating?.toFixed(1) ?? '4.9'} / 5</strong>
        <span>({profile.reviewCount ?? 24} reviews)</span>
      </div>
    </article>
  );
}
export function Directory({ saved = false }: { saved?: boolean }) {
  const { state, user } = useApp();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get('q') ?? '');
  const [more, setMore] = useState(false);
  const professors = Object.values(state.profiles).filter(
    (p) => p.role === 'professor' && (!saved || state.saved.includes(p.id)),
  );
  const subject = params.get('subject') ?? '';
  const university = params.get('university') ?? '';
  const date = params.get('date') ?? '';
  const time = params.get('time') ?? '';
  const query = params.get('q') ?? '';
  const language = params.get('language') ?? '';
  const rating = params.get('rating') ?? '';
  const sort = params.get('sort') ?? 'recommended';
  function filter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
  }
  const subjects = Array.from(
    new Set(
      Object.values(state.profiles)
        .filter((p) => p.role === 'professor')
        .flatMap((p) => [...(p.subjects ?? []), ...(p.expertise ?? [])]),
    ),
  );
  const universities = Array.from(
    new Set(
      Object.values(state.profiles)
        .filter((p) => p.role === 'professor')
        .map((p) => p.university),
    ),
  );
  const items = useMemo(
    () =>
      professors
        .filter((p) => {
          const haystack =
            `${p.name} ${p.department} ${[...(p.subjects ?? []), ...(p.expertise ?? [])].join(' ')} ${p.bio ?? ''}`.toLowerCase();
          if (query && !haystack.includes(query.toLowerCase())) return false;
          if (
            subject &&
            ![...(p.subjects ?? []), ...(p.expertise ?? [])].some((x) =>
              x.toLowerCase().includes(subject.toLowerCase()),
            )
          )
            return false;
          if (university && p.university !== university) return false;
          if (language && !(p.languages ?? []).includes(language)) return false;
          if (rating && (p.rating ?? 0) < Number(rating)) return false;
          if (date || time) {
            const dates = date
              ? [date]
              : Array.from({ length: 14 }, (_, i) => dayOffset(dateKey(now(), user.timeZone), i));
            return dates.some((d) =>
              service.getSlots(p.id, d, user.timeZone).some((slot) => {
                const hour = Number(
                  new Intl.DateTimeFormat('en-US', {
                    timeZone: user.timeZone,
                    hour: 'numeric',
                    hourCycle: 'h23',
                  }).format(new Date(slot.start)),
                );
                return (
                  !time ||
                  (time === 'morning' && hour < 12) ||
                  (time === 'afternoon' && hour >= 12 && hour < 17) ||
                  (time === 'evening' && hour >= 17)
                );
              }),
            );
          }
          return true;
        })
        .sort((a, b) =>
          sort === 'name'
            ? a.name.localeCompare(b.name)
            : sort === 'rating'
              ? (b.rating ?? 0) - (a.rating ?? 0)
              : 0,
        ),
    [professors, query, subject, university, language, rating, date, time, user.timeZone, sort],
  );
  return (
    <>
      <PageHeader
        title={saved ? 'Saved professors' : 'Find your professor'}
        description={
          saved
            ? 'Your shortlist, ready for your next conversation.'
            : 'The right conversation can make all the difference.'
        }
        actions={
          saved ? (
            <Link className="button button-secondary" to="/professors">
              Find more professors <ArrowRight size={15} />
            </Link>
          ) : undefined
        }
      />
      {!saved && (
        <>
          <form
            className="search-row"
            onSubmit={(e) => {
              e.preventDefault();
              filter('q', search);
            }}
          >
            <div className="search-input">
              <Search size={19} />
              <input
                aria-label="Search professors"
                placeholder="Search by name, expertise or keyword"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button type="submit">Search</Button>
          </form>
          <div className="filter-row">
            <Field label="Subject">
              <select value={subject} onChange={(e) => filter('subject', e.target.value)}>
                <option value="">All subjects</option>
                {subjects.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="University">
              <select value={university} onChange={(e) => filter('university', e.target.value)}>
                <option value="">All universities</option>
                {universities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Date">
              <input
                type="date"
                min={dateKey(now(), user.timeZone)}
                value={date}
                onChange={(e) => filter('date', e.target.value)}
              />
            </Field>
            <Field label="Preferred time">
              <select value={time} onChange={(e) => filter('time', e.target.value)}>
                <option value="">Any time</option>
                <option value="morning">Morning · before 12</option>
                <option value="afternoon">Afternoon · 12–5</option>
                <option value="evening">Evening · after 5</option>
              </select>
            </Field>
            <Button variant="secondary" onClick={() => setMore(true)}>
              <SlidersHorizontal size={15} />
              <span>More filters{language || rating ? ' · Active' : ''}</span>
            </Button>
          </div>
        </>
      )}
      <div className="results-row">
        <span className="muted">
          {items.length} {items.length === 1 ? 'professor' : 'professors'}
          {!saved ? ` · Times shown in ${zoneLabel(user.timeZone)}` : ''}
        </span>
        <div className="results-controls">
          <label className="muted">
            Sort:{' '}
            <select
              aria-label="Sort professors"
              value={sort}
              onChange={(e) => filter('sort', e.target.value)}
            >
              <option value="recommended">Recommended</option>
              <option value="name">Name</option>
              <option value="rating">Highest rated (sample)</option>
            </select>
          </label>
          {!saved && (
            <button
              className="text-link"
              onClick={() => {
                setParams({});
                setSearch('');
              }}
            >
              Clear filters
            </button>
          )}
        </div>
      </div>
      {items.length ? (
        <div className="professor-grid">
          {items.map((p) => (
            <ProfessorCard key={p.id} profile={p} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={saved ? 'Your shortlist starts here' : 'No professors match these filters'}
          description={
            saved
              ? 'Save a professor to make it easy to find them again.'
              : 'Try a different subject, date, or preferred time.'
          }
          action={
            saved ? (
              <Link className="button button-primary" to="/professors">
                Find professors
              </Link>
            ) : (
              <Button
                onClick={() => {
                  setParams({});
                  setSearch('');
                }}
              >
                Clear filters
              </Button>
            )
          }
        />
      )}
      <p className="muted small" style={{ marginTop: 22 }}>
        Profiles, ratings and review counts are illustrative preview data.
      </p>
      {more && (
        <Modal title="Refine your search" onClose={() => setMore(false)}>
          <Field label="Language">
            <select value={language} onChange={(e) => filter('language', e.target.value)}>
              <option value="">Any language</option>
              {['English', 'Spanish', 'Hindi', 'Mandarin'].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>
          <Field label="Minimum rating (sample)">
            <select value={rating} onChange={(e) => filter('rating', e.target.value)}>
              <option value="">Any rating</option>
              <option value="4.8">4.8 and above</option>
              <option value="4.9">4.9 and above</option>
              <option value="5">5.0</option>
            </select>
          </Field>
          <Button onClick={() => setMore(false)}>Show professors</Button>
        </Modal>
      )}
    </>
  );
}
export function ProfessorProfile() {
  const { id } = useParams();
  const { state, user, explain } = useApp();
  const p = state.profiles[id ?? ''];
  if (!p || p.role !== 'professor')
    return (
      <EmptyState
        title="Professor not found"
        action={<Link to="/professors">Back to professors</Link>}
      />
    );
  const availability = state.availability[p.id];
  let next: { start: string; end: string; label: string } | undefined;
  for (let i = 0; i < Math.min(availability?.rules.windowDays ?? 14, 60); i++) {
    next = service.getSlots(p.id, dayOffset(dateKey(now(), user.timeZone), i), user.timeZone)[0];
    if (next) break;
  }
  return (
    <>
      <Link className="back-link" to="/professors">
        <ArrowLeft size={15} />
        Back to professors
      </Link>
      <div className="split-layout">
        <article className="panel panel-pad">
          <div className="profile-heading">
            <Avatar profile={p} size="lg" />
            <div>
              <h1>{p.name}</h1>
              <p className="muted">
                {p.department} · {p.university}
              </p>
              <p className="muted">{p.academicRole || 'Associate Professor'}</p>
              <div className="rating">
                <Star size={13} />
                <strong>{p.rating ?? 4.9} / 5</strong>
                <span>({p.reviewCount ?? 24} sample reviews)</span>
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={() =>
              state.session?.role === 'student'
                ? service.toggleSaved(p.id)
                : explain(
                    'Save a professor',
                    'This is the student-facing public profile. Switch to the student preview to save professors or request a meeting.',
                  )
            }
          >
            <Bookmark size={16} fill={state.saved.includes(p.id) ? 'currentColor' : 'none'} />
            {state.saved.includes(p.id) ? 'Professor saved' : 'Save professor'}
          </Button>
          <section className="profile-section">
            <h2>About {p.name.replace('Dr. ', '').split(' ')[0]}</h2>
            <p>{p.bio}</p>
          </section>
          <section className="profile-section">
            <h2>Education</h2>
            <p className="profile-education">
              <GraduationCap size={18} aria-hidden="true" />
              <span>{p.education || 'Ph.D. in ' + p.department}</span>
            </p>
          </section>
          <section className="profile-section">
            <h2>Expertise</h2>
            <div className="row">
              {(p.expertise ?? p.interests).map((s) => (
                <span className="interest-chip" key={s}>
                  {s}
                </span>
              ))}
            </div>
          </section>
          <section className="profile-section">
            <h2>Languages</h2>
            <p>{p.languages?.join(', ') || 'English'}</p>
          </section>
          <section className="profile-section">
            <h2>Typical availability</h2>
            <WeeklySummary availability={availability} />
          </section>
          {p.subjects?.length ? (
            <section className="profile-section">
              <h2>Subjects taught</h2>
              <div className="row">
                {p.subjects.map((subject) => (
                  <span className="interest-chip" key={subject}>
                    {subject}
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          {p.professionalLinks?.length ? (
            <section className="profile-section">
              <h2>Professional links</h2>
              <div className="row">
                {p.professionalLinks.map((link) => (
                  <a
                    className="text-link"
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.label}
                    <ArrowRight size={14} />
                  </a>
                ))}
              </div>
            </section>
          ) : null}
          <section className="profile-section">
            <h2>Student feedback</h2>
            <p>“Clear explanations and useful next steps.”</p>
            <p className="muted small">Illustrative feedback for this preview.</p>
            <button
              className="text-link"
              style={{ marginTop: 12 }}
              onClick={() =>
                explain(
                  'Student feedback — preview',
                  'The rating and review count shown here are illustrative. Public review eligibility, moderation, and publication policy are still undecided; no genuine student review is claimed.',
                )
              }
            >
              About these sample reviews <ArrowRight size={14} />
            </button>
          </section>
        </article>
        <aside className="panel booking-panel">
          <h2>Schedule a conversation</h2>
          <p className="muted">30-minute meeting on Zoom.</p>
          <p className="muted small">
            Choose a time, then tell the professor what you would like to discuss.
          </p>
          <div className="next-available">
            <span className="muted small">Next available</span>
            {next ? (
              <strong className="row">
                <CalendarDays size={16} />
                {dateLabel(next.start, user.timeZone)} at {timeLabel(next.start, user.timeZone)}
              </strong>
            ) : (
              <p>No available times in the current booking window.</p>
            )}
            <Link
              className="button button-primary full-width"
              style={{ marginTop: 10 }}
              to={`/professors/${p.id}/book`}
            >
              Choose date & time <ArrowRight size={16} />
            </Link>
            <p className="muted small" style={{ textAlign: 'center', marginTop: 3 }}>
              {availability?.rules.approval === 'automatic'
                ? 'Available times are confirmed automatically.'
                : 'Professor approval required.'}
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
