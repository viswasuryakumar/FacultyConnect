import { formatInTimeZone, fromZonedTime } from 'date-fns-tz';
import { overlaps } from './booking';
import { DomainError, type Availability, type Booking, type Interval, type Slot } from './types';

const MINUTE = 60_000;
const localTimeCache = new Map<string, string | null>();
export const MEETING_MINUTES = 30;
export const localDate = (instant: Date | string, zone: string): string =>
  formatInTimeZone(instant, zone, 'yyyy-MM-dd');

export function validTimeZone(zone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: zone }).format();
    return Boolean(zone);
  } catch {
    return false;
  }
}

export function addDateDays(date: string, days: number): string {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

export function validDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === date;
}

export function minutes(time: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time))
    throw new DomainError('Use a valid time in HH:mm format.');
  const [hours, mins] = time.split(':').map(Number);
  return hours * 60 + mins;
}

const timeAt = (value: number): string =>
  `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;

/** Suppress nonexistent and repeated wall times rather than guessing a DST offset. */
export function localToUtc(date: string, time: string, zone: string): string | null {
  const key = `${zone}|${date}|${time}`;
  if (localTimeCache.has(key)) return localTimeCache.get(key)!;
  const remember = (value: string | null): string | null => {
    if (localTimeCache.size >= 4096) localTimeCache.clear();
    localTimeCache.set(key, value);
    return value;
  };
  if (!validDate(date) || !validTimeZone(zone)) return null;
  minutes(time);
  const expected = `${date}T${time}`;
  const instant = fromZonedTime(`${expected}:00`, zone);
  if (
    !Number.isFinite(instant.getTime()) ||
    formatInTimeZone(instant, zone, "yyyy-MM-dd'T'HH:mm") !== expected
  )
    return remember(null);
  for (const delta of [-120, -90, -60, -30, 30, 60, 90, 120]) {
    if (
      formatInTimeZone(new Date(instant.getTime() + delta * MINUTE), zone, "yyyy-MM-dd'T'HH:mm") ===
      expected
    )
      return remember(null);
  }
  return remember(instant.toISOString());
}

export function validateIntervals(intervals: Interval[]): void {
  const sorted = intervals
    .map((interval) => ({ start: minutes(interval.start), end: minutes(interval.end) }))
    .sort((a, b) => a.start - b.start);
  for (let index = 0; index < sorted.length; index += 1) {
    const interval = sorted[index];
    if (interval.end <= interval.start)
      throw new DomainError(
        'End time must be after start time. Split overnight hours across two days.',
      );
    if (interval.end - interval.start < MEETING_MINUTES)
      throw new DomainError('Each interval must allow at least one 30-minute meeting.');
    if (index > 0 && interval.start < sorted[index - 1].end)
      throw new DomainError('Availability intervals cannot overlap.');
  }
}

export function validateAvailability(value: Availability): void {
  if (!validTimeZone(value.timeZone)) throw new DomainError('Choose a valid IANA time zone.');
  for (let day = 0; day < 7; day += 1) validateIntervals(value.weekly[day] ?? []);
  for (const override of value.overrides) {
    if (
      !validDate(override.startDate) ||
      !validDate(override.endDate) ||
      override.startDate > override.endDate
    ) {
      throw new DomainError('Date changes need a valid start date and an end date on or after it.');
    }
    validateIntervals(override.intervals);
  }
  const overrides = [...value.overrides].sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (let index = 1; index < overrides.length; index += 1) {
    if (overrides[index].startDate <= overrides[index - 1].endDate)
      throw new DomainError('Date changes cannot overlap. Edit the existing date change first.');
  }
  const rules = value.rules;
  if (!['manual', 'automatic'].includes(rules.approval))
    throw new DomainError('Choose a valid approval mode.');
  if (!Number.isInteger(rules.windowDays) || rules.windowDays < 1 || rules.windowDays > 365)
    throw new DomainError('Booking window must be between 1 and 365 days.');
  if (!Number.isFinite(rules.noticeHours) || rules.noticeHours < 0 || rules.noticeHours > 720)
    throw new DomainError('Minimum notice must be between 0 and 720 hours.');
  if (rules.dailyCap !== null && (!Number.isInteger(rules.dailyCap) || rules.dailyCap < 1))
    throw new DomainError('Daily limit must be a positive whole number or left empty.');
}

export function intervalsForDate(availability: Availability, date: string): Interval[] {
  const override = availability.overrides.find(
    (entry) => entry.startDate <= date && entry.endDate >= date,
  );
  if (override) return override.intervals;
  return availability.weekly[new Date(`${date}T12:00:00Z`).getUTCDay()] ?? [];
}

export function withinWorkingHours(
  availability: Availability,
  start: string,
  end: string,
): boolean {
  const date = localDate(start, availability.timeZone);
  if (localDate(end, availability.timeZone) !== date) return false;
  return intervalsForDate(availability, date).some((interval) => {
    const from = localToUtc(date, interval.start, availability.timeZone);
    const to = localToUtc(date, interval.end, availability.timeZone);
    return (
      from !== null &&
      to !== null &&
      Date.parse(start) >= Date.parse(from) &&
      Date.parse(end) <= Date.parse(to)
    );
  });
}

export function availabilityConflicts(
  availability: Availability,
  bookings: Booking[],
  at: Date,
): Booking[] {
  return bookings.filter(
    (booking) =>
      booking.professorId === availability.professorId &&
      booking.status === 'confirmed' &&
      Date.parse(booking.end) > at.getTime() &&
      !withinWorkingHours(availability, booking.start, booking.end),
  );
}

export function calculateSlots(
  availability: Availability,
  bookings: Booking[],
  viewerDate: string,
  viewerZone: string,
  at: Date,
  excludeBookingId?: string,
  studentId?: string,
): Slot[] {
  if (!validDate(viewerDate)) throw new DomainError('Choose a valid date.');
  if (!validTimeZone(viewerZone)) throw new DomainError('Choose a valid time zone.');
  const slots: Slot[] = [];
  const occupied = bookings.filter(
    (booking) =>
      booking.id !== excludeBookingId &&
      (booking.status === 'confirmed' ||
        (availability.rules.holdPending && booking.status === 'pending')),
  );
  const today = localDate(at, availability.timeZone);
  const latestDate = addDateDays(today, availability.rules.windowDays);
  for (let offset = -2; offset <= 2; offset += 1) {
    const professorDate = addDateDays(viewerDate, offset);
    if (professorDate < today || professorDate > latestDate) continue;
    const professorOccupied = occupied.filter(
      (booking) => booking.professorId === availability.professorId,
    );
    const count = professorOccupied.filter(
      (booking) => localDate(booking.start, availability.timeZone) === professorDate,
    ).length;
    if (availability.rules.dailyCap !== null && count >= availability.rules.dailyCap) continue;
    for (const interval of intervalsForDate(availability, professorDate)) {
      for (
        let localMinute = minutes(interval.start);
        localMinute + MEETING_MINUTES <= minutes(interval.end);
        localMinute += MEETING_MINUTES
      ) {
        const start = localToUtc(professorDate, timeAt(localMinute), availability.timeZone);
        if (!start || localDate(start, viewerZone) !== viewerDate) continue;
        const startMs = Date.parse(start);
        if (
          startMs < at.getTime() + availability.rules.noticeHours * 60 * MINUTE ||
          startMs <= at.getTime()
        )
          continue;
        const end = new Date(startMs + MEETING_MINUTES * MINUTE).toISOString();
        if (!withinWorkingHours(availability, start, end)) continue;
        if (
          occupied.some(
            (booking) =>
              (booking.professorId === availability.professorId ||
                booking.studentId === studentId) &&
              overlaps(start, end, booking.start, booking.end),
          )
        )
          continue;
        slots.push({ start, end, label: formatInTimeZone(start, viewerZone, 'h:mm a') });
      }
    }
  }
  return [...new Map(slots.map((slot) => [slot.start, slot])).values()].sort(
    (a, b) => Date.parse(a.start) - Date.parse(b.start),
  );
}
