import { describe, expect, it } from 'vitest';
import { transitionBooking, upcomingBookings } from './booking';
import type { Booking } from './types';

const booking = (status: Booking['status'], start = '2026-11-09T18:00:00.000Z'): Booking => ({
  id: 'test',
  studentId: 'student',
  professorId: 'professor',
  start,
  end: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
  status,
  meetingType: 'Research guidance',
  topic: 'Research',
  context: 'A question',
  linkState: 'not_requested',
});

describe('booking lifecycle', () => {
  it('keeps confirmation separate from link readiness', () => {
    const confirmed = transitionBooking(booking('pending'), 'confirmed');
    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.linkState).toBe('preparing');
  });

  it.each(['declined', 'cancelled', 'completed'] as const)(
    'cannot accept a %s booking',
    (status) => {
      expect(() => transitionBooking(booking(status), 'confirmed')).toThrow(/cannot become/);
    },
  );

  it('sorts actual full instants and omits past or terminal records', () => {
    const records = [
      booking('pending', '2026-11-10T08:00:00Z'),
      booking('confirmed', '2026-11-09T23:30:00-08:00'),
      booking('confirmed', '2026-11-09T23:00:00Z'),
      booking('cancelled', '2026-11-09T20:00:00Z'),
      booking('confirmed', '2026-11-08T20:00:00Z'),
    ];
    expect(
      upcomingBookings(records, new Date('2026-11-09T18:00:00Z')).map((record) => record.start),
    ).toEqual(['2026-11-09T23:00:00Z', '2026-11-09T23:30:00-08:00', '2026-11-10T08:00:00Z']);
  });
});
