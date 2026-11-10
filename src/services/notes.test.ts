import { describe, expect, it } from 'vitest';
import { noteWindowStatus } from '../domain/notes';
import { PreviewService } from './preview';

const initialTime = new Date('2026-11-06T18:00:00Z');
function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
    removeItem: (key: string) => {
      values.delete(key);
    },
  };
}
function setup(storage: ReturnType<typeof memoryStorage> | null = null) {
  let current = initialTime;
  const clock = () => current;
  const service = new PreviewService({ clock, storage, autoPrepareLinks: false });
  const setTime = (time: Date | string | number) => {
    current = new Date(time);
  };
  const open = (bookingId = 'meeting-next') =>
    setTime(Date.parse(service.getSnapshot().bookings[bookingId].start) + 5 * 60_000);
  return { service, clock, setTime, open };
}

describe('meeting notes adapter', () => {
  it('shares live chat with the other participant and clears only the sender draft', () => {
    const { service, clock, open } = setup();
    open();
    service.saveNoteDraft('meeting-next', '  Can we review the evaluation metrics?  ');
    service.switchRole('professor');
    service.saveNoteDraft('meeting-next', 'Bring the comparison table.');
    service.switchRole('student');
    const note = service.sendNote(
      'meeting-next',
      '  Can we review the evaluation metrics?  ',
      'student-note',
    );
    expect(note).toMatchObject({
      bookingId: 'meeting-next',
      authorId: 'student-viswa',
      body: 'Can we review the evaluation metrics?',
      createdAt: clock().toISOString(),
    });
    expect(service.getNoteDraft('meeting-next')).toBe('');
    expect(service.getSnapshot().noteDrafts['prof-sarah:meeting-next']).toBe(
      'Bring the comparison table.',
    );
    expect(
      service.getSnapshot().notifications.find((item) => item.target === 'notes'),
    ).toMatchObject({
      bookingId: 'meeting-next',
      userId: 'prof-sarah',
      target: 'notes',
      read: false,
    });
    expect(
      service
        .getSnapshot()
        .notifications.filter((item) => item.target === 'notes' && item.userId === 'student-viswa'),
    ).toHaveLength(0);
  });

  it('keeps shared chat and private drafts across identity changes and reload', () => {
    const storage = memoryStorage();
    const { service, clock, open } = setup(storage);
    open();
    const note = service.sendNote('meeting-next', 'I will prepare a short outline.', 'reload-note');
    service.saveNoteDraft('meeting-next', 'A private student draft');
    service.switchRole('professor');
    expect(service.getNoteDraft('meeting-next')).toBe('');
    service.saveNoteDraft('meeting-next', 'A private professor draft');
    const restored = new PreviewService({ clock, storage, autoPrepareLinks: false });
    expect(restored.getSnapshot().notes[note.id]).toEqual(note);
    expect(restored.getNoteDraft('meeting-next')).toBe('A private professor draft');
    restored.switchRole('student');
    expect(restored.getNoteDraft('meeting-next')).toBe('A private student draft');
  });

  it('rejects nonparticipants and admin access even during the scheduled window', () => {
    const { service, open } = setup();
    open();
    expect(() => service.sendNote('meeting-amina', 'Should not post here.', 'foreign')).toThrow(
      /another preview identity/,
    );
    expect(() => service.getNoteDraft('meeting-amina')).toThrow(/another preview identity/);
    expect(() => service.saveNoteDraft('meeting-amina', 'Private')).toThrow(
      /another preview identity/,
    );
    service.switchRole('admin');
    expect(() =>
      service.sendNote('meeting-next', 'Support should not write here.', 'admin'),
    ).toThrow(/only to the student and professor/);
    expect(() => service.getNoteDraft('meeting-next')).toThrow(/only to the student and professor/);
  });

  it('allows only the author to edit or delete while live and preserves the creation time', () => {
    const { service, clock, setTime, open } = setup();
    open();
    const note = service.sendNote('meeting-next', 'My initial question.', 'author-note');
    service.switchRole('professor');
    expect(() => service.editNote(note.id, 'Other author')).toThrow(/only your own notes/);
    expect(() => service.deleteNote(note.id)).toThrow(/only your own notes/);
    service.switchRole('student');
    setTime(clock().getTime() + 5 * 60_000);
    service.editNote(note.id, 'My clarified question.');
    expect(service.getSnapshot().notes[note.id]).toMatchObject({
      body: 'My clarified question.',
      createdAt: note.createdAt,
      editedAt: clock().toISOString(),
    });
    service.deleteNote(note.id);
    expect(service.getSnapshot().notes[note.id]).toBeUndefined();
    expect(service.getSnapshot().notes['note-completed-example']).toBeDefined();
    expect(() => service.sendNote('meeting-next', 'My initial question.', 'author-note')).toThrow(
      /was deleted/,
    );
  });

  it('deduplicates sends and persisted retries without duplicate notifications', () => {
    const storage = memoryStorage();
    const { service, clock, open } = setup(storage);
    open();
    const first = service.sendNote('meeting-next', 'Stable shared note.', 'send-once');
    expect(service.sendNote('meeting-next', 'Stable shared note.', 'send-once').id).toBe(first.id);
    expect(
      service.getSnapshot().notifications.filter((item) => item.target === 'notes'),
    ).toHaveLength(1);
    const restored = new PreviewService({ clock, storage, autoPrepareLinks: false });
    expect(restored.sendNote('meeting-next', 'Stable shared note.', 'send-once').id).toBe(first.id);
    expect(() => restored.sendNote('meeting-next', 'Different payload.', 'send-once')).toThrow(
      /identifier was already used/,
    );
    open('meeting-alex');
    expect(() => restored.sendNote('meeting-alex', 'Stable shared note.', 'send-once')).toThrow(
      /identifier was already used/,
    );
  });

  it('validates chat text and draft limits without publishing private drafts', () => {
    const { service, open } = setup();
    open();
    for (const body of ['', '   ', 'x'.repeat(4001)])
      expect(() => service.sendNote('meeting-next', body, 'invalid-note')).toThrow();
    expect(() => service.saveNoteDraft('meeting-next', 'x'.repeat(4001))).toThrow(/4000/);
    expect(() => service.sendNote('meeting-next', 'A note', '')).toThrow(/identifier is required/);
    const before = Object.keys(service.getSnapshot().notes).length;
    const notifications = service.getSnapshot().notifications.length;
    service.saveNoteDraft('meeting-next', 'A draft only');
    expect(Object.keys(service.getSnapshot().notes)).toHaveLength(before);
    expect(service.getSnapshot().notifications).toHaveLength(notifications);
    service.saveNoteDraft('meeting-next', ' ');
    expect(service.getNoteDraft('meeting-next')).toBe('');
  });

  it('keeps completed, cancelled and declined histories read-only', () => {
    const { service, open } = setup();
    open();
    expect(service.getSnapshot().notes['note-completed-example']).toBeDefined();
    expect(() =>
      service.sendNote('meeting-completed', 'No post-meeting disturbance.', 'completed'),
    ).toThrow(/only during/);
    expect(() => service.sendNote('meeting-pending', 'Please accept.', 'pending')).toThrow(
      /only during/,
    );
    const note = service.sendNote('meeting-next', 'Keep this conversation history.', 'history');
    service.cancelBooking('meeting-next', 'Our plans changed.');
    expect(service.getSnapshot().notes[note.id].body).toBe('Keep this conversation history.');
    expect(service.getNoteDraft('meeting-next')).toBe('');
    expect(() => service.sendNote('meeting-next', 'No more messages.', 'cancelled')).toThrow(
      /only during/,
    );
    expect(() => service.editNote(note.id, 'Cannot edit after cancellation.')).toThrow(
      /only during/,
    );
    expect(() => service.deleteNote(note.id)).toThrow(/only during/);
    expect(() => service.sendNote('meeting-declined', 'Not available.', 'declined')).toThrow(
      /only during/,
    );
  });

  it('isolates chat/drafts by meeting and reset clears new records', () => {
    const { service, open } = setup();
    open();
    const first = service.sendNote('meeting-next', 'About my AI project.', 'ai-note');
    service.saveNoteDraft('meeting-next', 'AI draft');
    open('meeting-alex');
    const second = service.sendNote('meeting-alex', 'About my statistics question.', 'stats-note');
    service.saveNoteDraft('meeting-alex', 'Statistics draft');
    expect(service.getNoteDraft('meeting-next')).toBe('AI draft');
    expect(service.getNoteDraft('meeting-alex')).toBe('Statistics draft');
    expect(
      Object.values(service.getSnapshot().notes)
        .filter((note) => note.bookingId === 'meeting-next')
        .some((note) => note.id === second.id),
    ).toBe(false);
    service.reset();
    expect(service.getSnapshot().notes[first.id]).toBeUndefined();
    expect(service.getSnapshot().notes[second.id]).toBeUndefined();
    expect(service.getSnapshot().noteDrafts).toEqual({});
    expect(service.getSnapshot().notes['note-completed-example']).toBeDefined();
    expect(service.getSnapshot().notes['note-next-example']).toBeUndefined();
  });

  it('migrates legacy version3 data without replacing bookings or edits', () => {
    const storage = memoryStorage();
    const { service } = setup(storage);
    const legacy = structuredClone(service.getSnapshot());
    legacy.profiles['student-viswa'].name = 'Previously edited student';
    legacy.bookings['meeting-next'].topic = 'A previously edited meeting topic';
    const { notes: _notes, noteDrafts: _drafts, ...oldState } = legacy;
    expect(Object.keys(_notes)).not.toHaveLength(0);
    expect(_drafts).toEqual({});
    storage.setItem(
      'facultyconnect.preview.v1',
      JSON.stringify({ version: 3, state: oldState, submissions: {} }),
    );
    const restored = new PreviewService({
      clock: () => initialTime,
      storage,
      autoPrepareLinks: false,
    }).getSnapshot();
    expect(restored.notes).toEqual({});
    expect(restored.noteDrafts).toEqual({});
    expect(restored.bookings).toEqual(legacy.bookings);
    expect(restored.profiles['student-viswa'].name).toBe('Previously edited student');
  });

  it('opens at the exact start and closes at the exact end even while still confirmed', () => {
    const { service, setTime } = setup();
    const booking = service.getSnapshot().bookings['meeting-next'];
    setTime(Date.parse(booking.start) - 1);
    expect(() => service.sendNote(booking.id, 'Too early.', 'early')).toThrow(/only during/);
    setTime(booking.start);
    expect(service.sendNote(booking.id, 'Exactly at start.', 'start').body).toBe(
      'Exactly at start.',
    );
    setTime(Date.parse(booking.end) - 1);
    expect(service.sendNote(booking.id, 'Last moment.', 'last').body).toBe('Last moment.');
    setTime(booking.end);
    const notesBefore = structuredClone(service.getSnapshot().notes);
    const notificationsBefore = service.getSnapshot().notifications.length;
    expect(() => service.sendNote(booking.id, 'At the end is too late.', 'end')).toThrow(
      /only during/,
    );
    expect(service.getSnapshot().bookings[booking.id].status).toBe('confirmed');
    expect(service.getSnapshot().notes).toEqual(notesBefore);
    expect(service.getSnapshot().notifications).toHaveLength(notificationsBefore);
  });

  it('rechecks a stale composer clock for draft/send/edit/delete and retains readable history', () => {
    const { service, open, setTime } = setup();
    open();
    const note = service.sendNote('meeting-next', 'A live message.', 'live');
    service.saveNoteDraft('meeting-next', 'An unfinished private message');
    setTime(service.getSnapshot().bookings['meeting-next'].end);
    const before = structuredClone(service.getSnapshot());
    expect(() => service.saveNoteDraft('meeting-next', 'A late draft update')).toThrow(
      /only during/,
    );
    expect(() => service.sendNote('meeting-next', 'A late message', 'late')).toThrow(/only during/);
    expect(() => service.editNote(note.id, 'A late edit')).toThrow(/only during/);
    expect(() => service.deleteNote(note.id)).toThrow(/only during/);
    expect(service.getNoteDraft('meeting-next')).toBe('An unfinished private message');
    expect(service.getSnapshot().notes).toEqual(before.notes);
    expect(service.getSnapshot().notifications).toEqual(before.notifications);
    expect(service.getSnapshot().noteDrafts).toEqual(before.noteDrafts);
  });

  it('classifies request, scheduled, live, ended and closed windows deliberately', () => {
    const { service } = setup();
    const booking = service.getSnapshot().bookings['meeting-next'];
    expect(noteWindowStatus(booking, initialTime)).toBe('upcoming');
    expect(noteWindowStatus(booking, new Date(booking.start))).toBe('open');
    expect(noteWindowStatus(booking, new Date(booking.end))).toBe('ended');
    expect(noteWindowStatus({ ...booking, status: 'pending' }, initialTime)).toBe('pending');
    expect(noteWindowStatus({ ...booking, status: 'completed' }, initialTime)).toBe('ended');
    expect(noteWindowStatus({ ...booking, status: 'cancelled' }, initialTime)).toBe('closed');
    expect(noteWindowStatus({ ...booking, status: 'declined' }, initialTime)).toBe('closed');
  });
});
