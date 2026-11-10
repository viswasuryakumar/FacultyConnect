export type Role = 'student' | 'professor' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'declined' | 'cancelled' | 'completed';
export type LinkState = 'not_requested' | 'preparing' | 'ready' | 'failed';
export type ConnectionState = 'not_connected' | 'connected' | 'reconnect_required';
export interface Interval {
  start: string;
  end: string;
}
export interface Profile {
  id: string;
  name: string;
  email?: string;
  role: Role;
  university: string;
  department: string;
  timeZone: string;
  interests: string[];
  bio?: string;
  education?: string;
  academicRole?: string;
  languages?: string[];
  expertise?: string[];
  subjects?: string[];
  /** Legacy preview data; new meeting types are written by students. */
  topics?: string[];
  rating?: number;
  reviewCount?: number;
  photo?: string;
  /** Legacy preview field, no longer collected or shown. */
  researchInterests?: string[];
  professionalLinks?: { label: string; url: string }[];
  emailNotifications?: boolean;
  notificationPreferences?: { meetingReminders: boolean; bookingUpdates: boolean };
}
export interface Booking {
  id: string;
  studentId: string;
  professorId: string;
  start: string;
  end: string;
  status: BookingStatus;
  meetingType: string;
  topic: string;
  context: string;
  linkState: LinkState;
  reason?: string;
  bookedTimeZone?: string;
  reschedule?: { start: string; end: string; proposedBy: string };
}
export interface Availability {
  professorId: string;
  timeZone: string;
  weekly: Record<number, Interval[]>;
  overrides: { id: string; startDate: string; endDate: string; intervals: Interval[] }[];
  rules: {
    approval: 'manual' | 'automatic';
    windowDays: number;
    noticeHours: number;
    dailyCap: number | null;
    holdPending: boolean;
  };
  exceptions: string[];
}
export interface ConversationRecord {
  bookingId: string;
  status: 'processing' | 'ready' | 'failed';
  source: 'zoom' | 'sample';
  createdAt?: string;
  summary?: string;
  transcript?: { speakerId: string; text: string; offsetSeconds: number }[];
  error?: string;
}
export interface MeetingNote {
  id: string;
  bookingId: string;
  authorId: string;
  body: string;
  createdAt: string;
  editedAt?: string;
}
export interface Notification {
  id: string;
  userId: string;
  bookingId: string;
  target?: 'meeting' | 'notes';
  title: string;
  read: boolean;
  createdAt: string;
}
export interface AppState {
  profiles: Record<string, Profile>;
  bookings: Record<string, Booking>;
  availability: Record<string, Availability>;
  notifications: Notification[];
  notes: Record<string, MeetingNote>;
  noteDrafts: Record<string, string>;
  conversationRecords: Record<string, ConversationRecord>;
  saved: string[];
  session: { role: Role; userId: string } | null;
  facultyAccess: Record<string, 'pending' | 'approved' | 'declined'>;
}
export interface Slot {
  start: string;
  end: string;
  label: string;
}
export interface SubmitBookingInput {
  professorId: string;
  start: string;
  meetingType: string;
  topic: string;
  context: string;
  idempotencyKey: string;
}
export type Clock = () => Date;

export class DomainError extends Error {
  constructor(
    message: string,
    public readonly code = 'validation',
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
