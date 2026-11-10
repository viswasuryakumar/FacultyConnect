import { useState } from 'react';
import { CalendarDays, Check, Clock3, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../app/context';
import { Button, PageHeader, Modal, Field, Notice, Badge } from '../../components/ui';
import type { Availability, Booking, Interval } from '../../domain/types';
import { service } from '../../services/preview';
import { now } from '../../domain/clock';
import { clockLabel, zoneLabel } from '../../lib/format';

const days = [
  { index: 1, name: 'Monday' },
  { index: 2, name: 'Tuesday' },
  { index: 3, name: 'Wednesday' },
  { index: 4, name: 'Thursday' },
  { index: 5, name: 'Friday' },
  { index: 6, name: 'Saturday' },
  { index: 0, name: 'Sunday' },
];

function localDate(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return ['year', 'month', 'day'].map((key) => parts.find((p) => p.type === key)?.value).join('-');
}

function dateLabel(date: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T12:00:00Z`));
}

function hoursLabel(intervals: Interval[]) {
  return intervals.length
    ? intervals
        .map((interval) => `${clockLabel(interval.start)} – ${clockLabel(interval.end)}`)
        .join(', ')
    : 'Unavailable all day';
}

type Override = Availability['overrides'][number];

export function AvailabilityPage() {
  const { state, user, notify } = useApp();
  const initial: Availability = state.availability[user.id] ?? {
    professorId: user.id,
    timeZone: user.timeZone,
    weekly: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    overrides: [],
    rules: {
      approval: 'manual',
      windowDays: 14,
      noticeHours: 12,
      dailyCap: null,
      holdPending: false,
    },
    exceptions: [],
  };
  const [draft, setDraft] = useState<Availability>(() => structuredClone(initial));
  const [tab, setTab] = useState('Weekly hours');
  const [error, setError] = useState('');
  const [conflicts, setConflicts] = useState<Booking[]>([]);
  const [override, setOverride] = useState<Override | null>(null);
  const [overrideError, setOverrideError] = useState('');
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

  function changeDay(day: number, intervals: Interval[]) {
    setDraft({ ...draft, weekly: { ...draft.weekly, [day]: intervals } });
  }

  function save(keepConfirmed = false) {
    setError('');
    try {
      const affected = service.saveAvailability(draft, keepConfirmed);
      if (affected.length && !keepConfirmed) {
        setConflicts(affected);
        return;
      }
      setConflicts([]);
      setDraft(structuredClone(service.getSnapshot().availability[user.id]));
      notify('Availability saved. Your confirmed appointments are protected.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save availability. Please try again.',
      );
    }
  }

  function applyOverride() {
    if (!override) return;
    setOverrideError('');
    if (!override.startDate || !override.endDate || override.endDate < override.startDate) {
      setOverrideError('Choose a valid start date and an end date on or after it.');
      return;
    }
    const ordered = [...override.intervals].sort((a, b) => a.start.localeCompare(b.start));
    if (
      ordered.some(
        (interval, index) =>
          !interval.start ||
          !interval.end ||
          interval.start >= interval.end ||
          (index > 0 && ordered[index - 1].end > interval.start),
      )
    ) {
      setOverrideError('Each time range must end after it starts. Time ranges cannot overlap.');
      return;
    }
    setDraft({
      ...draft,
      overrides: [
        ...draft.overrides.filter((item) => item.id !== override.id),
        { ...override, intervals: ordered },
      ].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    });
    setOverride(null);
  }

  const title = tab === 'Weekly hours' ? 'Availability' : tab;
  const description =
    tab === 'Weekly hours'
      ? `Set your regular hours. Times shown in ${zoneLabel(draft.timeZone)}.`
      : 'Choose how students book an available 30-minute appointment.';

  return (
    <>
      <PageHeader title={title} description={description} />
      <div className="tabs" role="tablist" aria-label="Availability settings">
        {['Weekly hours', 'Booking rules'].map((item) => (
          <button
            key={item}
            role="tab"
            aria-selected={tab === item}
            className={`tab ${tab === item ? 'active' : ''}`}
            onClick={() => {
              setTab(item);
              setError('');
            }}
          >
            {item}
          </button>
        ))}
      </div>
      {error && <Notice tone="error">{error}</Notice>}
      <div className="management-content" role="tabpanel" aria-label={tab}>
        {tab === 'Weekly hours' && (
          <div className="availability-editor stack">
            <section className="panel weekly-hours" aria-label="Weekly working hours">
              <div className="hours-heading">
                <span>Day</span>
                <span>Bookable hours</span>
              </div>
              {days.map(({ index, name }) => {
                const intervals = draft.weekly[index] ?? [];
                const expanded = editingDay === index;
                return (
                  <div className={`hours-row ${expanded ? 'editing' : ''}`} key={index}>
                    <span className={intervals.length ? 'day-name available-day' : 'day-name'}>
                      {name}
                    </span>
                    <div className="hours-values">
                      {expanded ? (
                        <div className="stack compact">
                          {intervals.map((interval, i) => (
                            <div className="time-interval" key={i}>
                              <input
                                aria-label={`${name} start time ${i + 1}`}
                                type="time"
                                required
                                value={interval.start}
                                onChange={(event) =>
                                  changeDay(
                                    index,
                                    intervals.map((value, j) =>
                                      i === j ? { ...value, start: event.target.value } : value,
                                    ),
                                  )
                                }
                              />
                              <span aria-hidden="true">–</span>
                              <input
                                aria-label={`${name} end time ${i + 1}`}
                                type="time"
                                required
                                value={interval.end}
                                onChange={(event) =>
                                  changeDay(
                                    index,
                                    intervals.map((value, j) =>
                                      i === j ? { ...value, end: event.target.value } : value,
                                    ),
                                  )
                                }
                              />
                              <Button
                                variant="ghost"
                                aria-label={`Remove ${name} time range ${i + 1}`}
                                onClick={() =>
                                  changeDay(
                                    index,
                                    intervals.filter((_, j) => j !== i),
                                  )
                                }
                              >
                                <X size={16} />
                              </Button>
                            </div>
                          ))}
                          {!intervals.length && <span className="muted">Unavailable</span>}
                          <div className="row wrap">
                            <Button
                              variant="ghost"
                              onClick={() =>
                                changeDay(index, [
                                  ...intervals,
                                  { start: intervals.at(-1)?.end ?? '09:00', end: '17:00' },
                                ])
                              }
                            >
                              <Plus size={15} /> Add hours
                            </Button>
                            <Button variant="ghost" onClick={() => setEditingDay(null)}>
                              <Check size={15} /> Done
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="row-between hours-display">
                          <span className={intervals.length ? 'available-hours' : 'muted'}>
                            {intervals.length ? hoursLabel(intervals) : 'Unavailable'}
                          </span>
                          <Button
                            variant="ghost"
                            aria-label={`${intervals.length ? 'Edit' : 'Add'} ${name} hours`}
                            onClick={() => {
                              if (!intervals.length)
                                changeDay(index, [{ start: '09:00', end: '17:00' }]);
                              setEditingDay(index);
                            }}
                          >
                            {intervals.length ? 'Edit' : 'Add'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
            <details className="panel one-off-schedule">
              <summary>One-off schedule changes (optional)</summary>
              <div className="one-off-schedule-body stack">
                <p className="muted small">
                  Use this only for a day off or different hours on specific dates. Your weekly
                  hours apply otherwise.
                </p>
                <section className="stack override-section">
                  {draft.overrides.length === 0 && (
                    <div className="empty-compact">
                      <CalendarDays size={28} />
                      <h2 className="section-title">Your regular hours apply</h2>
                      <p className="muted">
                        No one-off changes. Your weekly hours apply every week.
                      </p>
                    </div>
                  )}
                  {draft.overrides.map((item) => (
                    <div className="row-between override-row schedule-change-row" key={item.id}>
                      <div>
                        <h2 className="section-title">
                          {dateLabel(item.startDate)}
                          {item.endDate !== item.startDate ? ` – ${dateLabel(item.endDate)}` : ''}
                        </h2>
                        <p>{hoursLabel(item.intervals)}</p>
                        <span className="small muted">Replaces weekly hours for these dates</span>
                      </div>
                      <div className="row">
                        <Button
                          variant="ghost"
                          onClick={() => {
                            setOverride(structuredClone(item));
                            setOverrideError('');
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          aria-label={`Remove schedule change ${item.startDate}`}
                          onClick={() =>
                            setDraft({
                              ...draft,
                              overrides: draft.overrides.filter((value) => value.id !== item.id),
                            })
                          }
                        >
                          <Trash2 size={16} /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Button
                      variant="secondary"
                      onClick={() => {
                        const date = localDate(now(), user.timeZone);
                        setOverride({
                          id: crypto.randomUUID(),
                          startDate: date,
                          endDate: date,
                          intervals: [],
                        });
                        setOverrideError('');
                      }}
                    >
                      <Plus size={17} /> Add schedule change
                    </Button>
                  </div>
                  <Notice>
                    Save availability to apply these changes. Existing confirmed meetings remain
                    protected.
                  </Notice>
                </section>
              </div>
            </details>
          </div>
        )}

        {tab === 'Booking rules' && (
          <section className="booking-rules stack">
            <fieldset className="approval-options">
              <legend className="visually-hidden">Approval mode</legend>
              {(['manual', 'automatic'] as const).map((approval) => (
                <label
                  className={`approval-option ${draft.rules.approval === approval ? 'selected' : ''}`}
                  key={approval}
                >
                  <input
                    type="radio"
                    name="approval"
                    value={approval}
                    checked={draft.rules.approval === approval}
                    onChange={() => setDraft({ ...draft, rules: { ...draft.rules, approval } })}
                  />
                  <span>
                    <strong>
                      {approval === 'manual' ? 'Approval required' : 'Automatic booking'}
                    </strong>
                    <span className="muted">
                      {approval === 'manual'
                        ? 'Students send a request. You accept or decline before meeting setup begins.'
                        : 'An eligible slot is confirmed immediately. Meeting setup begins automatically.'}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="row muted small">
              <Clock3 size={17} /> All meetings are 30 minutes. Existing requests keep their current
              status.
            </div>
            <details className="panel advanced-rules">
              <summary>Advanced limits</summary>
              <div className="stack panel-pad">
                <div className="form-grid">
                  <Field label="Booking window">
                    <select
                      value={draft.rules.windowDays}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          rules: { ...draft.rules, windowDays: Number(event.target.value) },
                        })
                      }
                    >
                      {[7, 14, 30, 60].map((value) => (
                        <option value={value} key={value}>
                          Next {value} days
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Minimum notice">
                    <select
                      value={draft.rules.noticeHours}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          rules: { ...draft.rules, noticeHours: Number(event.target.value) },
                        })
                      }
                    >
                      {[0, 2, 6, 12, 24, 48].map((value) => (
                        <option value={value} key={value}>
                          {value === 0 ? 'No minimum' : `${value} hours`}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Daily meeting cap">
                    <select
                      value={draft.rules.dailyCap ?? ''}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          rules: {
                            ...draft.rules,
                            dailyCap: event.target.value ? Number(event.target.value) : null,
                          },
                        })
                      }
                    >
                      <option value="">No cap</option>
                      {[1, 2, 3, 4, 6, 8].map((value) => (
                        <option value={value} key={value}>
                          {value} meetings
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={draft.rules.holdPending}
                    onChange={(event) =>
                      setDraft({
                        ...draft,
                        rules: { ...draft.rules, holdPending: event.target.checked },
                      })
                    }
                  />
                  <span>
                    Hold slots while requests are pending
                    <span className="muted small">
                      Preview policy only. Request expiry is not configured.
                    </span>
                  </span>
                </label>
                <p className="small muted">
                  These are proposed scheduling policies. Final limits and pending holds need
                  professor approval before launch.
                </p>
              </div>
            </details>
          </section>
        )}
      </div>
      <div className="management-actions row wrap">
        <Button onClick={() => save()}>
          {tab === 'Weekly hours' ? 'Save availability' : 'Save booking rules'}
        </Button>
        {dirty && (
          <>
            <span className="muted small">Unsaved changes</span>
            <Button
              variant="ghost"
              onClick={() => {
                setDraft(structuredClone(initial));
                setError('');
              }}
            >
              Discard changes
            </Button>
          </>
        )}
      </div>

      {override && (
        <Modal
          title={
            draft.overrides.some((item) => item.id === override.id)
              ? 'Edit schedule change'
              : 'Add schedule change'
          }
          onClose={() => setOverride(null)}
        >
          <div className="stack">
            {overrideError && <Notice tone="error">{overrideError}</Notice>}
            <div className="form-grid">
              <Field label="Start date">
                <input
                  type="date"
                  required
                  value={override.startDate}
                  onChange={(event) =>
                    setOverride({
                      ...override,
                      startDate: event.target.value,
                      endDate:
                        override.endDate < event.target.value
                          ? event.target.value
                          : override.endDate,
                    })
                  }
                />
              </Field>
              <Field label="End date">
                <input
                  type="date"
                  required
                  min={override.startDate}
                  value={override.endDate}
                  onChange={(event) => setOverride({ ...override, endDate: event.target.value })}
                />
              </Field>
            </div>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={!override.intervals.length}
                onChange={(event) =>
                  setOverride({
                    ...override,
                    intervals: event.target.checked ? [] : [{ start: '09:00', end: '17:00' }],
                  })
                }
              />
              Unavailable all day
            </label>
            {override.intervals.map((interval, i) => (
              <div className="time-interval" key={i}>
                <Field label={`Start time ${i + 1}`}>
                  <input
                    type="time"
                    value={interval.start}
                    onChange={(event) =>
                      setOverride({
                        ...override,
                        intervals: override.intervals.map((value, j) =>
                          i === j ? { ...value, start: event.target.value } : value,
                        ),
                      })
                    }
                  />
                </Field>
                <span aria-hidden="true">–</span>
                <Field label={`End time ${i + 1}`}>
                  <input
                    type="time"
                    value={interval.end}
                    onChange={(event) =>
                      setOverride({
                        ...override,
                        intervals: override.intervals.map((value, j) =>
                          i === j ? { ...value, end: event.target.value } : value,
                        ),
                      })
                    }
                  />
                </Field>
                <Button
                  variant="ghost"
                  aria-label={`Remove override time range ${i + 1}`}
                  onClick={() =>
                    setOverride({
                      ...override,
                      intervals: override.intervals.filter((_, j) => j !== i),
                    })
                  }
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
            {!!override.intervals.length && (
              <Button
                variant="ghost"
                onClick={() =>
                  setOverride({
                    ...override,
                    intervals: [...override.intervals, { start: '17:00', end: '18:00' }],
                  })
                }
              >
                <Plus size={16} /> Add time range
              </Button>
            )}
            <p className="muted small">
              This change replaces recurring hours for the selected date or range.
            </p>
            <div className="row wrap">
              <Button onClick={applyOverride}>Apply schedule change</Button>
              <Button variant="secondary" onClick={() => setOverride(null)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {!!conflicts.length && (
        <Modal title="Review a schedule conflict" onClose={() => setConflicts([])}>
          <div className="stack">
            <Notice tone="warning">
              {conflicts.length} confirmed{' '}
              {conflicts.length === 1 ? 'meeting needs' : 'meetings need'} attention. These
              appointments will stay booked unless a separate reschedule or cancellation is agreed.
            </Notice>
            {conflicts.map((booking) => (
              <div className="conflict-item" key={booking.id}>
                <div className="row-between">
                  <strong>{state.profiles[booking.studentId]?.name}</strong>
                  <Badge status="confirmed" />
                </div>
                <p>{booking.meetingType}</p>
                <p className="muted">
                  {new Intl.DateTimeFormat('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                    timeZone: draft.timeZone,
                  }).format(new Date(booking.start))}
                </p>
              </div>
            ))}
            <Button onClick={() => save(true)}>Keep meetings & save other hours</Button>
            <Button variant="secondary" onClick={() => setConflicts([])}>
              Return to schedule
            </Button>
            <p className="muted small">
              Keeping appointments as exceptions is the preview policy. Final conflict handling
              remains subject to professor approval.
            </p>
          </div>
        </Modal>
      )}
    </>
  );
}
