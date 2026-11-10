import type { Booking } from './types';

export type NoteWindowStatus = 'pending' | 'upcoming' | 'open' | 'ended' | 'closed';

/** The preview uses the scheduled interval; real Zoom lifecycle events need a backend. */
export function noteWindowStatus(booking: Booking, at: Date): NoteWindowStatus {
  if (booking.status === 'pending') return 'pending';
  if (booking.status === 'completed') return 'ended';
  if (booking.status !== 'confirmed') return 'closed';
  const start = Date.parse(booking.start);
  const end = Date.parse(booking.end);
  const current = at.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(current) || end <= start)
    return 'closed';
  if (current < start) return 'upcoming';
  return current < end ? 'open' : 'ended';
}
