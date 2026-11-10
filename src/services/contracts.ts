import type {
  AppState,
  Availability,
  Booking,
  ConversationRecord,
  MeetingNote,
  Profile,
  Role,
  Slot,
  SubmitBookingInput,
} from '../domain/types';

export interface IdentityService {
  switchRole(role: Role): void;
  signOut(): void;
}
export interface ProfileService {
  saveProfile(profile: Profile): void;
  toggleSaved(id: string): void;
}
export interface BookingService {
  submitBooking(input: SubmitBookingInput): Booking;
  acceptBooking(id: string): void;
  declineBooking(id: string, reason: string): void;
  cancelBooking(id: string, reason: string): void;
  changePendingTime(id: string, start: string): void;
  proposeReschedule(id: string, start: string): void;
  respondReschedule(id: string, accept: boolean): void;
  retryLink(id: string): void;
  hasOverlap(id: string): boolean;
}
export interface AvailabilityService {
  getSlots(
    professorId: string,
    date: string,
    viewerTimeZone: string,
    excludeBookingId?: string,
  ): Slot[];
  saveAvailability(availability: Availability, keepConfirmed?: boolean): Booking[];
}
export interface NotesService {
  saveNoteDraft(bookingId: string, body: string): void;
  getNoteDraft(bookingId: string): string;
  sendNote(bookingId: string, body: string, idempotencyKey: string): MeetingNote;
  editNote(noteId: string, body: string): void;
  deleteNote(noteId: string): void;
}
export interface ConversationRecordService {
  getConversationRecord(bookingId: string): ConversationRecord | undefined;
}
export interface NotificationService {
  readNotification(id: string): void;
  markAllRead(userId: string): void;
}
export interface AdminPreviewService {
  setFacultyAccess(id: string, status: 'pending' | 'approved' | 'declined'): void;
}
/** Synchronous local adapter contract. A future HTTP adapter can populate this observable cache. */
export interface FacultyConnectServices
  extends
    IdentityService,
    ProfileService,
    BookingService,
    AvailabilityService,
    NotificationService,
    NotesService,
    ConversationRecordService,
    AdminPreviewService {
  getSnapshot(): AppState;
  subscribe(listener: () => void): () => void;
  reset(): void;
  readonly persistenceAvailable: boolean;
}
