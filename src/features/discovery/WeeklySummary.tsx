import type { Availability, Interval } from '../../domain/types';
import { zoneLabel } from '../../lib/format';

const days = [
  { id: 1, label: 'Monday' },
  { id: 2, label: 'Tuesday' },
  { id: 3, label: 'Wednesday' },
  { id: 4, label: 'Thursday' },
  { id: 5, label: 'Friday' },
  { id: 6, label: 'Saturday' },
  { id: 0, label: 'Sunday' },
];

function localTime(value: string) {
  const [hour, minute] = value.split(':');
  const numericHour = Number(hour);
  return `${numericHour % 12 || 12}:${minute} ${numericHour >= 12 ? 'PM' : 'AM'}`;
}

export function WeeklySummary({ availability }: { availability?: Availability }) {
  if (!availability || !Object.values(availability.weekly).some((intervals) => intervals.length)) {
    return (
      <p className="muted">
        No regular weekly hours have been added. Check the calendar for any one-off openings.
      </p>
    );
  }
  const groups: { first: string; last: string; intervals: Interval[]; key: string }[] = [];
  for (const day of days) {
    const intervals = [...(availability.weekly[day.id] ?? [])].sort((a, b) =>
      a.start.localeCompare(b.start),
    );
    const key = JSON.stringify(intervals);
    const previous = groups.at(-1);
    if (previous?.key === key) previous.last = day.label;
    else groups.push({ first: day.label, last: day.label, intervals, key });
  }
  return (
    <div className="weekly-summary-wrap">
      <p className="muted small">Weekly hours in {zoneLabel(availability.timeZone)}</p>
      <dl className="weekly-summary">
        {groups.map((group) => (
          <div className="weekly-summary-row" key={group.first}>
            <dt>
              {group.first}
              {group.first !== group.last ? ` – ${group.last}` : ''}
            </dt>
            <dd>
              {group.intervals.length ? (
                group.intervals.map((interval) => (
                  <span key={interval.start}>
                    {localTime(interval.start)} – {localTime(interval.end)}
                  </span>
                ))
              ) : (
                <span className="muted">Unavailable</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <p className="muted small">
        Choose a date to see the available 30-minute times. Booked times and one-off schedule
        changes are reflected in the calendar.
      </p>
    </div>
  );
}
