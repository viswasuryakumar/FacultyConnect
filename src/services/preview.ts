import { now } from '../domain/clock';
import { noteWindowStatus } from '../domain/notes';
import {
  availabilityConflicts,
  calculateSlots,
  localDate,
  validTimeZone,
  validateAvailability,
} from '../domain/availability';
import { overlaps, requireText, transitionBooking } from '../domain/booking';
import {
  DomainError,
  type AppState,
  type Availability,
  type Booking,
  type Clock,
  type ConversationRecord,
  type MeetingNote,
  type Profile,
  type Role,
  type Slot,
  type SubmitBookingInput,
} from '../domain/types';
import { createFixtures, PREVIEW_IDENTITIES } from './fixtures';
import type { FacultyConnectServices } from './contracts';

export { now, setClock } from '../domain/clock';
const STORAGE_KEY = 'facultyconnect.preview.v1';
const VERSION = 3;
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
interface Options {
  clock?: Clock;
  storage?: StoragePort | null;
  autoPrepareLinks?: boolean;
}
interface NoteSubmission {
  fingerprint: string;
  noteId: string;
}
interface Submission {
  fingerprint: string;
  bookingId: string;
}

function objectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function restoreNotes(value: unknown): Record<string, MeetingNote> {
  if (!objectRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([id, note]) =>
        objectRecord(note) &&
        note.id === id &&
        typeof note.bookingId === 'string' &&
        typeof note.authorId === 'string' &&
        typeof note.body === 'string' &&
        note.body.length <= 4000 &&
        typeof note.createdAt === 'string' &&
        Number.isFinite(Date.parse(note.createdAt)) &&
        (note.editedAt === undefined ||
          (typeof note.editedAt === 'string' && Number.isFinite(Date.parse(note.editedAt)))),
    ),
  ) as Record<string, MeetingNote>;
}

function restoreConversationRecords(value: unknown): Record<string, ConversationRecord> {
  if (!objectRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([bookingId, record]) =>
        objectRecord(record) &&
        record.bookingId === bookingId &&
        typeof record.status === 'string' &&
        ['processing', 'ready', 'failed'].includes(record.status) &&
        typeof record.source === 'string' &&
        ['zoom', 'sample'].includes(record.source) &&
        (record.createdAt === undefined ||
          (typeof record.createdAt === 'string' &&
            Number.isFinite(Date.parse(record.createdAt)))) &&
        (record.summary === undefined || typeof record.summary === 'string') &&
        (record.error === undefined || typeof record.error === 'string') &&
        (record.transcript === undefined ||
          (Array.isArray(record.transcript) &&
            record.transcript.every(
              (segment) =>
                objectRecord(segment) &&
                typeof segment.speakerId === 'string' &&
                typeof segment.text === 'string' &&
                typeof segment.offsetSeconds === 'number' &&
                Number.isFinite(segment.offsetSeconds) &&
                segment.offsetSeconds >= 0,
            ))),
    ),
  ) as Record<string, ConversationRecord>;
}

function restoreDrafts(value: unknown): Record<string, string> {
  if (!objectRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length <= 4000,
    ),
  );
}

function restoreNoteSubmissions(value: unknown): Record<string, NoteSubmission> {
  if (!objectRecord(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) =>
        objectRecord(item) &&
        typeof item.fingerprint === 'string' &&
        typeof item.noteId === 'string',
    ),
  ) as Record<string, NoteSubmission>;
}

function browserStorage(): StoragePort | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function isState(value: unknown): value is AppState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<AppState>;
  return Boolean(
    state.profiles &&
    state.profiles['student-viswa'] &&
    state.profiles['prof-sarah'] &&
    state.bookings &&
    state.availability &&
    Array.isArray(state.notifications) &&
    Array.isArray(state.saved) &&
    state.facultyAccess &&
    (state.session === null || (state.session && state.profiles[state.session.userId])),
  );
}

/** All simulated persistence and mutations live here; components never import fixtures. */
export class PreviewService implements FacultyConnectServices {
  private state: AppState;
  private readonly clock: Clock;
  private readonly storage: StoragePort | null;
  private readonly autoPrepareLinks: boolean;
  private readonly listeners = new Set<() => void>();
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();
  private submissions: Record<string, Submission> = {};
  private noteSubmissions: Record<string, NoteSubmission> = {};
  private readonly slotCache = new Map<string, Slot[]>();
  private slotCacheMinute = -1;
  persistenceAvailable = true;

  constructor(options: Options = {}) {
    this.clock = options.clock ?? now;
    this.storage = options.storage === undefined ? browserStorage() : options.storage;
    this.autoPrepareLinks = options.autoPrepareLinks ?? true;
    this.state = createFixtures(this.clock());
    try {
      const raw = this.storage?.getItem(STORAGE_KEY);
      if (raw) {
        const persisted: unknown = JSON.parse(raw);
        if (
          persisted &&
          typeof persisted === 'object' &&
          'version' in persisted &&
          persisted.version === VERSION &&
          'state' in persisted &&
          isState(persisted.state)
        ) {
          const sampleProfiles = this.state.profiles;
          this.state = {
            ...persisted.state,
            notes: restoreNotes(persisted.state.notes),
            noteDrafts: restoreDrafts(persisted.state.noteDrafts),
            conversationRecords: restoreConversationRecords(persisted.state.conversationRecords),
            profiles: Object.fromEntries(
              Object.entries(persisted.state.profiles).map(([id, profile]) => {
                const sample = sampleProfiles[id];
                return [
                  id,
                  {
                    ...profile,
                    ...(profile.email === undefined && sample?.email
                      ? { email: sample.email }
                      : {}),
                    ...(profile.subjects === undefined && sample?.subjects
                      ? { subjects: [...sample.subjects] }
                      : {}),
                  },
                ];
              }),
            ),
          };
          if ('noteSubmissions' in persisted) {
            this.noteSubmissions = restoreNoteSubmissions(persisted.noteSubmissions);
          }
          if (
            'submissions' in persisted &&
            persisted.submissions &&
            typeof persisted.submissions === 'object'
          ) {
            this.submissions = persisted.submissions as Record<string, Submission>;
          }
        }
      }
    } catch {
      this.persistenceAvailable = false;
    }
    this.resumePreparingLinks();
  }

  getSnapshot = (): AppState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private id(prefix: string): string {
    return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${this.clock().getTime()}-${Math.random().toString(36).slice(2)}`}`;
  }

  private commit(change: (draft: AppState) => void): void {
    const draft = structuredClone(this.state);
    change(draft);
    this.state = draft;
    this.slotCache.clear();
    try {
      this.storage?.setItem(
        STORAGE_KEY,
        JSON.stringify({
          version: VERSION,
          state: this.state,
          submissions: this.submissions,
          noteSubmissions: this.noteSubmissions,
        }),
      );
    } catch {
      this.persistenceAvailable = false;
    }
    this.listeners.forEach((listener) => listener());
  }

  private identity(role?: Role): NonNullable<AppState['session']> {
    const session = this.state.session;
    if (!session)
      throw new DomainError('Choose a preview identity to continue.', 'identity_required');
    if (role && session.role !== role && session.role !== 'admin')
      throw new DomainError(`Switch to the ${role} preview to perform this action.`, 'role');
    return session;
  }

  private booking(id: string): Booking {
    const booking = this.state.bookings[id];
    if (!booking) throw new DomainError('This meeting could not be found.', 'not_found');
    const session = this.identity();
    if (
      session.role !== 'admin' &&
      session.userId !== booking.studentId &&
      session.userId !== booking.professorId
    ) {
      throw new DomainError('This meeting belongs to another preview identity.', 'role');
    }
    return booking;
  }

  private notify(draft: AppState, booking: Booking, userId: string, title: string): void {
    draft.notifications.unshift({
      id: this.id('notification'),
      userId,
      bookingId: booking.id,
      title,
      read: false,
      createdAt: this.clock().toISOString(),
    });
  }

  private assertEligible(
    professorId: string,
    studentId: string,
    start: string,
    excludeBookingId?: string,
  ): void {
    const schedule = this.state.availability[professorId];
    if (!schedule)
      throw new DomainError('This professor has not set availability yet.', 'unavailable');
    if (!Number.isFinite(Date.parse(start))) throw new DomainError('Choose a valid meeting time.');
    const canonicalStart = new Date(start).toISOString();
    const slots = calculateSlots(
      schedule,
      Object.values(this.state.bookings),
      localDate(canonicalStart, schedule.timeZone),
      schedule.timeZone,
      this.clock(),
      excludeBookingId,
      studentId,
    );
    if (!slots.some((slot) => slot.start === canonicalStart))
      throw new DomainError(
        'That time is no longer available. Please choose another slot.',
        'unavailable',
      );
  }

  private prepareLink(bookingId: string): void {
    if (!this.autoPrepareLinks) return;
    const originalStart = this.state.bookings[bookingId]?.start;
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      const booking = this.state.bookings[bookingId];
      if (
        booking?.status === 'confirmed' &&
        booking.linkState === 'preparing' &&
        booking.start === originalStart
      ) {
        this.commit((draft) => {
          draft.bookings[bookingId].linkState = 'ready';
        });
      }
    }, 1800);
    this.timers.add(timer);
  }

  private resumePreparingLinks(): void {
    Object.values(this.state.bookings).forEach((booking) => {
      if (booking.status === 'confirmed' && booking.linkState === 'preparing')
        this.prepareLink(booking.id);
    });
  }

  reset = (): void => {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
    this.submissions = {};
    this.noteSubmissions = {};
    this.state = createFixtures(this.clock());
    this.commit(() => {});
    this.resumePreparingLinks();
  };

  switchRole = (role: Role): void => {
    if (!PREVIEW_IDENTITIES[role]) throw new DomainError('Choose a valid preview role.');
    this.commit((draft) => {
      draft.session = { role, userId: PREVIEW_IDENTITIES[role] };
    });
  };

  signOut = (): void => {
    this.commit((draft) => {
      draft.session = null;
    });
  };

  saveProfile = (profile: Profile): void => {
    const session = this.identity();
    if (session.userId !== profile.id && session.role !== 'admin')
      throw new DomainError('You can edit only the current preview profile.', 'role');
    const existing = this.state.profiles[profile.id];
    if (!existing || profile.role !== existing.role)
      throw new DomainError('Profile roles cannot be changed from settings.');
    const name = requireText(profile.name, 'Name', 100);
    const university = requireText(profile.university, 'University', 160);
    const department = requireText(profile.department, 'Program or department', 160);
    const email = profile.email?.trim();
    if (
      profile.role === 'student' &&
      (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    ) {
      throw new DomainError('Enter a valid student email address.');
    }
    if (!validTimeZone(profile.timeZone)) throw new DomainError('Choose a valid time zone.');
    if (
      profile.photo &&
      (!/^data:image\/(png|jpeg|webp|gif);base64,/.test(profile.photo) ||
        profile.photo.length > 410_000)
    ) {
      throw new DomainError('Choose a PNG, JPG, WebP, or GIF image smaller than 300 KB.');
    }
    this.commit((draft) => {
      draft.profiles[profile.id] = {
        ...profile,
        name,
        email,
        university,
        department,
        subjects: profile.subjects?.map((value) => value.trim()).filter(Boolean),
        interests: profile.interests.map((value) => value.trim()).filter(Boolean),
      };
    });
  };

  toggleSaved = (id: string): void => {
    this.identity('student');
    if (this.state.profiles[id]?.role !== 'professor')
      throw new DomainError('Professor not found.');
    this.commit((draft) => {
      draft.saved = draft.saved.includes(id)
        ? draft.saved.filter((saved) => saved !== id)
        : [...draft.saved, id];
    });
  };

  readNotification = (id: string): void => {
    const session = this.identity();
    this.commit((draft) => {
      const notification = draft.notifications.find(
        (item) => item.id === id && item.userId === session.userId,
      );
      if (notification) notification.read = true;
    });
  };

  markAllRead = (userId: string): void => {
    if (this.identity().userId !== userId)
      throw new DomainError('Choose this preview identity first.');
    this.commit((draft) => {
      draft.notifications.forEach((notification) => {
        if (notification.userId === userId) notification.read = true;
      });
    });
  };

  private noteBooking(bookingId: string, writable = false): Booking {
    const booking = this.booking(bookingId);
    if (this.identity().role === 'admin') {
      throw new DomainError(
        'Meeting notes are available only to the student and professor in this meeting.',
        'role',
      );
    }
    if (writable && noteWindowStatus(booking, this.clock()) !== 'open') {
      throw new DomainError(
        'Meeting chat is open only during the scheduled meeting time. You can read the conversation afterward.',
        'notes_closed',
      );
    }
    return booking;
  }

  private ownNote(noteId: string): { note: MeetingNote; booking: Booking } {
    const note = this.state.notes[noteId];
    if (!note) throw new DomainError('This note could not be found.', 'not_found');
    const booking = this.noteBooking(note.bookingId, true);
    if (note.authorId !== this.identity().userId) {
      throw new DomainError('You can change only your own notes.', 'role');
    }
    return { note, booking };
  }

  getConversationRecord = (bookingId: string): ConversationRecord | undefined => {
    this.noteBooking(bookingId);
    return this.state.conversationRecords[bookingId];
  };

  getNoteDraft = (bookingId: string): string => {
    this.noteBooking(bookingId);
    return this.state.noteDrafts[`${this.identity().userId}:${bookingId}`] ?? '';
  };

  saveNoteDraft = (bookingId: string, body: string): void => {
    this.noteBooking(bookingId, true);
    if (body.length > 4000) throw new DomainError('Notes must be 4000 characters or fewer.');
    const key = `${this.identity().userId}:${bookingId}`;
    if ((this.state.noteDrafts[key] ?? '') === body) return;
    this.commit((draft) => {
      if (body.trim()) draft.noteDrafts[key] = body;
      else delete draft.noteDrafts[key];
    });
  };

  sendNote = (bookingId: string, body: string, idempotencyKey: string): MeetingNote => {
    const booking = this.noteBooking(bookingId, true);
    const authorId = this.identity().userId;
    const text = requireText(body, 'Note', 4000);
    const key = requireText(idempotencyKey, 'Note submission identifier', 200);
    const fingerprint = JSON.stringify({ bookingId, authorId, body: text });
    const previous = this.noteSubmissions[key];
    if (previous) {
      if (previous.fingerprint !== fingerprint) {
        throw new DomainError(
          'This note submission identifier was already used. Start a new note.',
          'duplicate',
        );
      }
      const original = this.state.notes[previous.noteId];
      if (!original)
        throw new DomainError(
          'This note was deleted. Write a new note to share it again.',
          'deleted',
        );
      return original;
    }
    const note: MeetingNote = {
      id: this.id('note'),
      bookingId,
      authorId,
      body: text,
      createdAt: this.clock().toISOString(),
    };
    this.noteSubmissions[key] = { fingerprint, noteId: note.id };
    this.commit((draft) => {
      draft.notes[note.id] = note;
      delete draft.noteDrafts[`${authorId}:${bookingId}`];
      const recipientId =
        authorId === booking.professorId ? booking.studentId : booking.professorId;
      draft.notifications.unshift({
        id: this.id('notification'),
        userId: recipientId,
        bookingId,
        target: 'notes',
        title: `${draft.profiles[authorId].name} shared a meeting note`,
        read: false,
        createdAt: note.createdAt,
      });
    });
    return this.state.notes[note.id];
  };

  editNote = (noteId: string, body: string): void => {
    const { note } = this.ownNote(noteId);
    const text = requireText(body, 'Note', 4000);
    if (text === note.body) return;
    this.commit((draft) => {
      draft.notes[noteId].body = text;
      draft.notes[noteId].editedAt = this.clock().toISOString();
    });
  };

  deleteNote = (noteId: string): void => {
    this.ownNote(noteId);
    this.commit((draft) => {
      delete draft.notes[noteId];
    });
  };

  getSlots = (
    professorId: string,
    date: string,
    viewerTimeZone: string,
    excludeBookingId?: string,
  ): Slot[] => {
    const schedule = this.state.availability[professorId];
    if (!schedule) return [];
    const existing = excludeBookingId ? this.state.bookings[excludeBookingId] : undefined;
    const studentId =
      existing?.studentId ??
      (this.state.session?.role === 'student' ? this.state.session.userId : undefined);
    const current = this.clock();
    const minute = Math.floor(current.getTime() / 60_000);
    if (minute !== this.slotCacheMinute) {
      this.slotCache.clear();
      this.slotCacheMinute = minute;
    }
    const key = JSON.stringify([professorId, date, viewerTimeZone, excludeBookingId, studentId]);
    let slots = this.slotCache.get(key);
    if (!slots) {
      slots = calculateSlots(
        schedule,
        Object.values(this.state.bookings),
        date,
        viewerTimeZone,
        current,
        excludeBookingId,
        studentId,
      );
      if (this.slotCache.size >= 256) this.slotCache.clear();
      this.slotCache.set(key, slots);
    }
    // Even within a cached minute, notice deadlines are evaluated at the current instant.
    return slots.filter(
      (slot) =>
        Date.parse(slot.start) >= current.getTime() + schedule.rules.noticeHours * 3_600_000 &&
        Date.parse(slot.start) > current.getTime(),
    );
  };

  submitBooking = (input: SubmitBookingInput): Booking => {
    const session = this.identity('student');
    if (session.role !== 'student')
      throw new DomainError('Switch to the student preview to request a meeting.');
    const topic = requireText(input.topic, 'Meeting topic', 180);
    const context = requireText(input.context, 'Meeting context', 3000);
    const meetingType = requireText(input.meetingType, 'Meeting type', 100);
    const key = requireText(input.idempotencyKey, 'Submission identifier', 200);
    const fingerprint = JSON.stringify({
      studentId: session.userId,
      professorId: input.professorId,
      start: input.start,
      topic,
      context,
      meetingType,
    });
    const prior = this.submissions[key];
    if (prior) {
      if (prior.fingerprint !== fingerprint)
        throw new DomainError(
          'This request identifier was already used. Start a new request.',
          'duplicate',
        );
      return this.state.bookings[prior.bookingId];
    }
    this.assertEligible(input.professorId, session.userId, input.start);
    const start = new Date(input.start).toISOString();
    const duplicate = Object.values(this.state.bookings).find(
      (booking) =>
        booking.studentId === session.userId &&
        booking.professorId === input.professorId &&
        booking.start === start &&
        (booking.status === 'pending' || booking.status === 'confirmed'),
    );
    if (duplicate)
      throw new DomainError('You already have a request or meeting at this time.', 'duplicate');
    const automatic = this.state.availability[input.professorId].rules.approval === 'automatic';
    const booking: Booking = {
      id: this.id('meeting'),
      studentId: session.userId,
      professorId: input.professorId,
      start,
      end: new Date(Date.parse(start) + 30 * 60_000).toISOString(),
      topic,
      context,
      meetingType,
      status: automatic ? 'confirmed' : 'pending',
      linkState: automatic ? 'preparing' : 'not_requested',
      bookedTimeZone: this.state.profiles[session.userId].timeZone,
    };
    this.submissions[key] = { fingerprint, bookingId: booking.id };
    this.commit((draft) => {
      draft.bookings[booking.id] = booking;
      this.notify(
        draft,
        booking,
        booking.professorId,
        `${draft.profiles[session.userId].name} ${automatic ? 'booked a meeting' : 'sent a meeting request'}`,
      );
      this.notify(
        draft,
        booking,
        booking.studentId,
        automatic ? 'Your meeting is confirmed' : 'Your meeting request was sent',
      );
    });
    if (automatic) this.prepareLink(booking.id);
    return this.state.bookings[booking.id];
  };

  acceptBooking = (id: string): void => {
    this.identity('professor');
    const booking = this.booking(id);
    const confirmed = transitionBooking(booking, 'confirmed');
    this.assertEligible(booking.professorId, booking.studentId, booking.start, id);
    this.commit((draft) => {
      draft.bookings[id] = confirmed;
      this.notify(
        draft,
        confirmed,
        booking.studentId,
        `${draft.profiles[booking.professorId].name} accepted your meeting request`,
      );
    });
    this.prepareLink(id);
  };

  declineBooking = (id: string, reason: string): void => {
    this.identity('professor');
    const booking = this.booking(id);
    const changed = {
      ...transitionBooking(booking, 'declined'),
      reason: requireText(reason, 'Reason', 1000),
    };
    this.commit((draft) => {
      draft.bookings[id] = changed;
      this.notify(draft, changed, booking.studentId, 'Your meeting request was declined');
    });
  };

  cancelBooking = (id: string, reason: string): void => {
    const booking = this.booking(id);
    const changed = {
      ...transitionBooking(booking, 'cancelled'),
      reason: requireText(reason, 'Cancellation reason', 1000),
    };
    this.commit((draft) => {
      draft.bookings[id] = changed;
      this.notify(draft, changed, booking.studentId, 'Your meeting was cancelled');
      this.notify(draft, changed, booking.professorId, 'A meeting was cancelled');
    });
  };

  changePendingTime = (id: string, start: string): void => {
    const session = this.identity('student');
    const booking = this.booking(id);
    if (session.userId !== booking.studentId)
      throw new DomainError('Only the requesting student can change a pending request.');
    if (booking.status !== 'pending')
      throw new DomainError('Only pending requests can change their requested time directly.');
    if (Date.parse(start) === Date.parse(booking.start))
      throw new DomainError('Choose a different meeting time.');
    this.assertEligible(booking.professorId, booking.studentId, start, id);
    const canonicalStart = new Date(start).toISOString();
    const duplicate = Object.values(this.state.bookings).some(
      (other) =>
        other.id !== id &&
        other.studentId === booking.studentId &&
        other.professorId === booking.professorId &&
        other.start === canonicalStart &&
        (other.status === 'pending' || other.status === 'confirmed'),
    );
    if (duplicate)
      throw new DomainError('You already have a request or meeting at this time.', 'duplicate');
    this.commit((draft) => {
      draft.bookings[id].start = canonicalStart;
      draft.bookings[id].end = new Date(Date.parse(canonicalStart) + 30 * 60_000).toISOString();
      this.notify(
        draft,
        booking,
        booking.professorId,
        `${draft.profiles[booking.studentId].name} changed a requested meeting time`,
      );
    });
  };

  proposeReschedule = (id: string, start: string): void => {
    const booking = this.booking(id);
    if (booking.status !== 'confirmed')
      throw new DomainError('Only confirmed meetings can be rescheduled.');
    if (booking.reschedule)
      throw new DomainError('A reschedule proposal is already waiting for a response.');
    if (Date.parse(start) === Date.parse(booking.start))
      throw new DomainError('Choose a different meeting time.');
    this.assertEligible(booking.professorId, booking.studentId, start, id);
    const canonicalStart = new Date(start).toISOString();
    const proposedBy = this.identity().userId;
    this.commit((draft) => {
      draft.bookings[id].reschedule = {
        start: canonicalStart,
        end: new Date(Date.parse(canonicalStart) + 30 * 60_000).toISOString(),
        proposedBy,
      };
      this.notify(
        draft,
        booking,
        proposedBy === booking.studentId ? booking.professorId : booking.studentId,
        'A new meeting time was proposed',
      );
    });
  };

  respondReschedule = (id: string, accept: boolean): void => {
    const booking = this.booking(id);
    const proposal = booking.reschedule;
    if (booking.status !== 'confirmed' || !proposal)
      throw new DomainError('There is no pending reschedule proposal.');
    if (proposal.proposedBy === this.identity().userId)
      throw new DomainError('The other participant needs to respond to this proposal.');
    if (accept) this.assertEligible(booking.professorId, booking.studentId, proposal.start, id);
    this.commit((draft) => {
      if (accept) {
        draft.bookings[id].start = proposal.start;
        draft.bookings[id].end = proposal.end;
        draft.bookings[id].linkState = 'preparing';
      }
      delete draft.bookings[id].reschedule;
      this.notify(
        draft,
        booking,
        proposal.proposedBy,
        accept ? 'Your reschedule proposal was accepted' : 'Your reschedule proposal was declined',
      );
    });
    if (accept) this.prepareLink(id);
  };

  retryLink = (id: string): void => {
    const booking = this.booking(id);
    if (booking.status !== 'confirmed' || booking.linkState !== 'failed')
      throw new DomainError('Only a failed link on a confirmed meeting can be retried.');
    this.commit((draft) => {
      draft.bookings[id].linkState = 'preparing';
    });
    this.prepareLink(id);
  };

  saveAvailability = (availability: Availability, keepConfirmed = false): Booking[] => {
    const session = this.identity('professor');
    if (session.role !== 'admin' && availability.professorId !== session.userId)
      throw new DomainError('You can edit only your own availability.');
    validateAvailability(availability);
    const conflicts = availabilityConflicts(
      availability,
      Object.values(this.state.bookings),
      this.clock(),
    );
    if (conflicts.length && !keepConfirmed) return conflicts;
    this.commit((draft) => {
      draft.availability[availability.professorId] = {
        ...structuredClone(availability),
        exceptions: [
          ...new Set([...availability.exceptions, ...conflicts.map((booking) => booking.id)]),
        ],
      };
    });
    return conflicts;
  };

  setFacultyAccess = (id: string, status: 'pending' | 'approved' | 'declined'): void => {
    this.identity('admin');
    if (
      !['pending', 'approved', 'declined'].includes(status) ||
      this.state.profiles[id]?.role !== 'professor'
    )
      throw new DomainError('Choose a valid faculty review.');
    this.commit((draft) => {
      draft.facultyAccess[id] = status;
    });
  };

  /** Local support diagnostic only; production authorization lives on the server. */
  hasOverlap = (bookingId: string): boolean => {
    const booking = this.state.bookings[bookingId];
    return Boolean(
      booking &&
      Object.values(this.state.bookings).some(
        (other) =>
          other.id !== bookingId &&
          other.status === 'confirmed' &&
          (other.professorId === booking.professorId || other.studentId === booking.studentId) &&
          overlaps(booking.start, booking.end, other.start, other.end),
      ),
    );
  };
}

export const service: FacultyConnectServices = new PreviewService();
