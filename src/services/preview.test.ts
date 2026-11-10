import { describe, expect, it } from 'vitest';
import { localDate } from '../domain/availability';
import { vi } from 'vitest';
import { PreviewService } from './preview';

const clock = () => new Date('2026-11-06T18:00:00Z');
const create = () => new PreviewService({ clock, storage: null, autoPrepareLinks: false });
const input = (start: string, idempotencyKey = 'submit-once', professorId = 'prof-sarah') => ({
  professorId,
  start,
  idempotencyKey,
  meetingType: 'Research guidance',
  topic: 'Research pathways',
  context: 'I would like to learn about undergraduate research.',
});
const firstSlot = (service: PreviewService, professorId = 'prof-sarah') =>
  service.getSlots(professorId, '2026-11-09', 'America/Los_Angeles')[0].start;

describe('shared preview service', () => {
  it('requires a valid student email and persists the trimmed contact address', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const service = new PreviewService({ clock, storage, autoPrepareLinks: false });
    const profile = service.getSnapshot().profiles['student-viswa'];
    for (const email of ['', 'not-an-email', 'student@', 'student @example.edu']) {
      expect(() => service.saveProfile({ ...profile, email })).toThrow(/valid student email/);
    }
    service.saveProfile({ ...profile, email: '  viswa.contact@example.edu  ' });
    const restored = new PreviewService({ clock, storage, autoPrepareLinks: false });
    expect(restored.getSnapshot().profiles['student-viswa'].email).toBe(
      'viswa.contact@example.edu',
    );
  });

  it('saves subjects taught separately from the professor expertise and student interests', () => {
    const service = create();
    const studentInterests = [...service.getSnapshot().profiles['student-viswa'].interests];
    service.switchRole('professor');
    const profile = service.getSnapshot().profiles['prof-sarah'];
    service.saveProfile({
      ...profile,
      subjects: ['  Statistical learning  ', '', 'Python programming'],
    });
    const saved = service.getSnapshot().profiles['prof-sarah'];
    expect(saved.subjects).toEqual(['Statistical learning', 'Python programming']);
    expect(saved.expertise).toEqual(profile.expertise);
    expect(service.getSnapshot().profiles['student-viswa'].interests).toEqual(studentInterests);
  });

  it('adds new sample contact and subject fields to existing v3 data without resetting edits or bookings', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const service = new PreviewService({ clock, storage, autoPrepareLinks: false });
    const request = service.submitBooking(input(firstSlot(service), 'legacy-contact-migration'));
    const legacy = structuredClone(service.getSnapshot());
    legacy.profiles['student-viswa'].name = 'Previously saved student';
    legacy.profiles['student-viswa'].interests = ['Previously saved interest'];
    delete legacy.profiles['student-viswa'].email;
    delete legacy.profiles['prof-sarah'].subjects;
    legacy.profiles['student-amina'].email = 'amina.custom@example.edu';
    legacy.profiles['prof-maya'].subjects = ['Previously saved subject'];
    storage.setItem(
      'facultyconnect.preview.v1',
      JSON.stringify({ version: 3, state: legacy, submissions: {} }),
    );
    const restored = new PreviewService({ clock, storage, autoPrepareLinks: false }).getSnapshot();
    expect(restored.profiles['student-viswa'].email).toBe('viswa.surya@example.edu');
    expect(restored.profiles['student-viswa'].name).toBe('Previously saved student');
    expect(restored.profiles['student-viswa'].interests).toEqual(['Previously saved interest']);
    expect(restored.profiles['prof-sarah'].subjects).toContain('Machine learning');
    expect(restored.profiles['student-amina'].email).toBe('amina.custom@example.edu');
    expect(restored.profiles['prof-maya'].subjects).toEqual(['Previously saved subject']);
    expect(restored.bookings[request.id]).toEqual(request);
    expect(restored.saved).toEqual(legacy.saved);
  });

  it('changes a requested time while preserving pending state and notifying the professor', () => {
    const service = create();
    const replacement = firstSlot(service);
    service.changePendingTime('meeting-pending', replacement);
    const booking = service.getSnapshot().bookings['meeting-pending'];
    expect(booking.start).toBe(replacement);
    expect(booking.status).toBe('pending');
    expect(booking.linkState).toBe('not_requested');
    expect(
      service
        .getSnapshot()
        .notifications.some(
          (notification) =>
            notification.bookingId === booking.id &&
            notification.userId === booking.professorId &&
            /changed/.test(notification.title),
        ),
    ).toBe(true);
    expect(() => service.changePendingTime('meeting-next', replacement)).toThrow(/Only pending/);
  });

  it('invalidates cached slots when a booking changes shared state', () => {
    const service = create();
    const start = firstSlot(service, 'prof-alex');
    service.submitBooking(input(start, 'cache-change', 'prof-alex'));
    expect(
      service
        .getSlots('prof-alex', '2026-11-09', 'America/Los_Angeles')
        .some((slot) => slot.start === start),
    ).toBe(false);
  });

  it('resumes preparing links when loading persisted bookings', () => {
    vi.useFakeTimers();
    try {
      const values = new Map<string, string>();
      const storage = {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => {
          values.set(key, value);
        },
        removeItem: (key: string) => {
          values.delete(key);
        },
      };
      const initial = new PreviewService({ clock, storage, autoPrepareLinks: false });
      const booking = initial.submitBooking(
        input(firstSlot(initial, 'prof-alex'), 'resume', 'prof-alex'),
      );
      const reloaded = new PreviewService({ clock, storage });
      expect(reloaded.getSnapshot().bookings[booking.id].linkState).toBe('preparing');
      vi.advanceTimersByTime(2000);
      expect(reloaded.getSnapshot().bookings[booking.id].linkState).toBe('ready');
    } finally {
      vi.useRealTimers();
    }
  });

  it('completes manual request and professor acceptance across role changes', () => {
    const service = create();
    const created = service.submitBooking(input(firstSlot(service)));
    expect(created.status).toBe('pending');
    expect(created.linkState).toBe('not_requested');
    service.switchRole('professor');
    service.acceptBooking(created.id);
    service.switchRole('student');
    expect(service.getSnapshot().bookings[created.id].status).toBe('confirmed');
    expect(service.getSnapshot().bookings[created.id].linkState).toBe('preparing');
    expect(
      service
        .getSnapshot()
        .notifications.some(
          (notification) =>
            notification.userId === 'student-viswa' &&
            notification.bookingId === created.id &&
            /accepted/.test(notification.title),
        ),
    ).toBe(true);
  });

  it('automatic booking confirms immediately without requiring a link to be ready', () => {
    const service = create();
    const created = service.submitBooking(
      input(firstSlot(service, 'prof-alex'), 'automatic', 'prof-alex'),
    );
    expect(created.status).toBe('confirmed');
    expect(created.linkState).toBe('preparing');
  });

  it('deduplicates retries and rejects a reused key with a different payload', () => {
    const service = create();
    const request = input(firstSlot(service));
    const first = service.submitBooking(request);
    expect(service.submitBooking(request).id).toBe(first.id);
    expect(() => service.submitBooking({ ...request, topic: 'Changed payload' })).toThrow(
      /identifier was already used/,
    );
    expect(() => service.submitBooking({ ...request, idempotencyKey: 'second-key' })).toThrow(
      /already have a request/,
    );
  });

  it('does not silently accept existing requests after switching approval mode', () => {
    const service = create();
    const created = service.submitBooking(input(firstSlot(service)));
    service.switchRole('professor');
    const availability = structuredClone(service.getSnapshot().availability['prof-sarah']);
    availability.rules.approval = 'automatic';
    service.saveAvailability(availability);
    expect(service.getSnapshot().bookings[created.id].status).toBe('pending');
  });

  it('reviews conflicts before changing availability and preserves confirmed bookings on explicit save', () => {
    const service = create();
    service.switchRole('professor');
    const original = structuredClone(service.getSnapshot().bookings['meeting-next']);
    const availability = structuredClone(service.getSnapshot().availability['prof-sarah']);
    const date = localDate(original.start, availability.timeZone);
    availability.overrides.push({ id: 'holiday', startDate: date, endDate: date, intervals: [] });
    const conflicts = service.saveAvailability(availability);
    expect(conflicts.map((booking) => booking.id)).toContain(original.id);
    expect(service.getSnapshot().availability['prof-sarah'].overrides).toHaveLength(0);
    service.saveAvailability(availability, true);
    expect(service.getSnapshot().availability['prof-sarah'].exceptions).toContain(original.id);
    expect(service.getSnapshot().bookings[original.id]).toEqual(original);
    expect(service.getSlots('prof-sarah', date, availability.timeZone)).toEqual([]);
  });

  it('keeps the original reservation while a reschedule awaits the other participant', () => {
    const service = create();
    const before = structuredClone(service.getSnapshot().bookings['meeting-next']);
    const replacement = firstSlot(service);
    service.proposeReschedule(before.id, replacement);
    expect(service.getSnapshot().bookings[before.id].start).toBe(before.start);
    expect(service.getSnapshot().bookings[before.id].reschedule?.start).toBe(replacement);
    expect(() => service.respondReschedule(before.id, true)).toThrow(/other participant/);
    service.switchRole('professor');
    service.respondReschedule(before.id, true);
    expect(service.getSnapshot().bookings[before.id].start).toBe(replacement);
    expect(service.getSnapshot().bookings[before.id].reschedule).toBeUndefined();
  });

  it('revalidates a nonholding pending request when another booking takes the slot', () => {
    const service = create();
    const pending = service.getSnapshot().bookings['meeting-amina'];
    const booked = service.submitBooking(input(pending.start));
    service.switchRole('professor');
    service.acceptBooking(booked.id);
    expect(() => service.acceptBooking(pending.id)).toThrow(/no longer available/);
    expect(service.getSnapshot().bookings[pending.id].status).toBe('pending');
  });

  it('configurable pending holds remove requested slots', () => {
    const service = create();
    const pending = service.getSnapshot().bookings['meeting-amina'];
    const date = localDate(pending.start, 'America/Los_Angeles');
    expect(
      service
        .getSlots('prof-sarah', date, 'America/Los_Angeles')
        .some((slot) => slot.start === pending.start),
    ).toBe(true);
    service.switchRole('professor');
    const availability = structuredClone(service.getSnapshot().availability['prof-sarah']);
    availability.rules.holdPending = true;
    service.saveAvailability(availability);
    expect(
      service
        .getSlots('prof-sarah', date, 'America/Los_Angeles')
        .some((slot) => slot.start === pending.start),
    ).toBe(false);
  });

  it('cancelled requests cannot later be accepted', () => {
    const service = create();
    service.cancelBooking('meeting-pending', 'My plans changed.');
    service.switchRole('professor');
    expect(() => service.acceptBooking('meeting-pending')).toThrow(/cannot become confirmed/);
  });

  it('persisted state is shared after reload and reset reconstructs relative fixtures', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const service = new PreviewService({ clock, storage, autoPrepareLinks: false });
    const created = service.submitBooking(input(firstSlot(service)));
    const reloaded = new PreviewService({ clock, storage, autoPrepareLinks: false });
    expect(reloaded.getSnapshot().bookings[created.id].status).toBe('pending');
    expect(reloaded.submitBooking(input(created.start)).id).toBe(created.id);
    reloaded.reset();
    expect(reloaded.getSnapshot().bookings[created.id]).toBeUndefined();
    expect(Date.parse(reloaded.getSnapshot().bookings['meeting-next'].start)).toBeGreaterThan(
      clock().getTime(),
    );
  });

  it('recovers from corrupt browser storage without crashing', () => {
    const service = new PreviewService({
      clock,
      autoPrepareLinks: false,
      storage: { getItem: () => '{invalid', setItem: () => {}, removeItem: () => {} },
    });
    expect(service.getSnapshot().profiles['prof-sarah'].name).toBe('Dr. Sarah Chen');
    expect(service.persistenceAvailable).toBe(false);
  });
});
