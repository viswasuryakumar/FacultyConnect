import { describe, expect, it } from 'vitest';
import {
  calculateSlots,
  localDate,
  localToUtc,
  validateAvailability,
  validateIntervals,
} from './availability';
import type { Availability } from './types';

const schedule = (zone = 'America/Los_Angeles'): Availability => ({
  professorId: 'professor',
  timeZone: zone,
  weekly: {
    0: [{ start: '00:00', end: '04:00' }],
    1: [{ start: '09:00', end: '12:00' }],
    2: [],
    3: [],
    4: [],
    5: [],
    6: [],
  },
  overrides: [],
  exceptions: [],
  rules: {
    approval: 'manual',
    windowDays: 365,
    noticeHours: 0,
    dailyCap: null,
    holdPending: false,
  },
});

describe('availability and time zones', () => {
  it('rejects overlaps and overnight ranges but allows touching intervals', () => {
    expect(() =>
      validateIntervals([
        { start: '09:00', end: '10:30' },
        { start: '10:00', end: '11:00' },
      ]),
    ).toThrow(/overlap/);
    expect(() => validateIntervals([{ start: '23:00', end: '01:00' }])).toThrow(/after start/);
    expect(() =>
      validateIntervals([
        { start: '09:00', end: '10:00' },
        { start: '10:00', end: '11:00' },
      ]),
    ).not.toThrow();
  });

  it('suppresses DST gap and repeated wall times without selecting an arbitrary offset', () => {
    expect(localToUtc('2026-03-08', '02:30', 'America/Los_Angeles')).toBeNull();
    expect(localToUtc('2026-11-01', '01:30', 'America/Los_Angeles')).toBeNull();
    expect(localToUtc('2026-03-08', '03:00', 'America/Los_Angeles')).toBe(
      '2026-03-08T10:00:00.000Z',
    );
    expect(localToUtc('2026-11-01', '02:00', 'America/Los_Angeles')).toBe(
      '2026-11-01T10:00:00.000Z',
    );
  });

  it('interprets the selected calendar date in the viewer zone across midnight', () => {
    const availability = schedule('Asia/Tokyo');
    const slots = calculateSlots(
      availability,
      [],
      '2026-11-08',
      'America/Los_Angeles',
      new Date('2026-11-07T00:00:00Z'),
    );
    expect(slots).toHaveLength(6);
    expect(slots[0].start).toBe('2026-11-09T00:00:00.000Z');
    expect(
      slots.every((slot) => localDate(slot.start, 'America/Los_Angeles') === '2026-11-08'),
    ).toBe(true);
  });

  it('date overrides replace weekly hours and unavailable overrides remove all slots', () => {
    const availability = schedule();
    availability.overrides = [
      { id: 'override', startDate: '2026-11-09', endDate: '2026-11-09', intervals: [] },
    ];
    expect(
      calculateSlots(
        availability,
        [],
        '2026-11-09',
        'America/Los_Angeles',
        new Date('2026-11-07T00:00:00Z'),
      ),
    ).toEqual([]);
    availability.overrides[0].intervals = [{ start: '14:00', end: '15:00' }];
    const slots = calculateSlots(
      availability,
      [],
      '2026-11-09',
      'America/Los_Angeles',
      new Date('2026-11-07T00:00:00Z'),
    );
    expect(slots.map((slot) => slot.label)).toEqual(['2:00 PM', '2:30 PM']);
  });

  it('rejects overlapping date override ranges', () => {
    const availability = schedule();
    availability.overrides = [
      { id: 'one', startDate: '2026-11-09', endDate: '2026-11-11', intervals: [] },
      { id: 'two', startDate: '2026-11-11', endDate: '2026-11-13', intervals: [] },
    ];
    expect(() => validateAvailability(availability)).toThrow(/cannot overlap/);
  });

  it('returns no slots when no hours are configured', () => {
    const availability = schedule();
    availability.weekly = {};
    expect(
      calculateSlots(
        availability,
        [],
        '2026-11-09',
        'America/Los_Angeles',
        new Date('2026-11-07T00:00:00Z'),
      ),
    ).toEqual([]);
  });
});
