import { DomainError, type Booking, type BookingStatus } from './types';

const allowed: Record<BookingStatus, BookingStatus[]> = {
  pending: ['confirmed', 'declined', 'cancelled'],
  confirmed: ['cancelled', 'completed'],
  declined: [],
  cancelled: [],
  completed: [],
};

export function transitionBooking(booking: Booking, status: BookingStatus): Booking {
  if (!allowed[booking.status].includes(status)) {
    throw new DomainError(
      `A ${booking.status} meeting cannot become ${status}.`,
      'invalid_transition',
    );
  }
  return {
    ...booking,
    status,
    linkState: status === 'confirmed' ? 'preparing' : 'not_requested',
    reschedule: undefined,
  };
}

export const overlaps = (
  start: string,
  end: string,
  otherStart: string,
  otherEnd: string,
): boolean => Date.parse(start) < Date.parse(otherEnd) && Date.parse(otherStart) < Date.parse(end);

export function upcomingBookings(bookings: Booking[], at: Date): Booking[] {
  return bookings
    .filter(
      (booking) =>
        (booking.status === 'pending' || booking.status === 'confirmed') &&
        Date.parse(booking.end) > at.getTime(),
    )
    .sort((a, b) => Date.parse(a.start) - Date.parse(b.start));
}

export function requireText(value: string, field: string, max = 2000): string {
  const trimmed = value.trim();
  if (!trimmed) throw new DomainError(`${field} is required.`);
  if (trimmed.length > max) throw new DomainError(`${field} must be ${max} characters or fewer.`);
  return trimmed;
}
