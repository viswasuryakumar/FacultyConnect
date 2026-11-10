import { beforeEach, describe, expect, it } from 'vitest';
import type { ConversationRecord } from '../domain/types';
import { PreviewService } from './preview';

let current = new Date('2026-11-06T18:00:00Z');
const clock = () => current;
const options = { clock, autoPrepareLinks: false };
const create = () => new PreviewService({ ...options, storage: null });
const record: ConversationRecord = {
  bookingId: 'meeting-next',
  status: 'ready',
  source: 'sample',
  createdAt: '2026-11-06T18:00:00Z',
  summary: 'Sample format only: compare the two evaluation approaches.',
  transcript: [
    { speakerId: 'student-viswa', text: 'Sample question about evaluation.', offsetSeconds: 0 },
    {
      speakerId: 'prof-sarah',
      text: 'Sample response about comparing metrics.',
      offsetSeconds: 12,
    },
  ],
};
function restore(conversationRecords: Record<string, ConversationRecord>) {
  const state = create().getSnapshot();
  const raw = JSON.stringify({ version: 3, state: { ...state, conversationRecords } });
  return new PreviewService({
    ...options,
    storage: { getItem: () => raw, setItem: () => {}, removeItem: () => {} },
  });
}

beforeEach(() => {
  current = new Date('2026-11-06T18:00:00Z');
});

describe('conversation record read model', () => {
  it('does not create or infer a conversation record from human notes', () => {
    const service = create();
    expect(Object.values(service.getSnapshot().conversationRecords)).toEqual([
      expect.objectContaining({ bookingId: 'meeting-sarah-viswa-past', source: 'sample' }),
    ]);
    expect(service.getConversationRecord('meeting-next')).toBeUndefined();
    current = new Date(
      Date.parse(service.getSnapshot().bookings['meeting-next'].start) + 5 * 60_000,
    );
    service.sendNote('meeting-next', 'A human-written follow-up note.', 'not-a-transcript');
    expect(service.getConversationRecord('meeting-next')).toBeUndefined();
    service.reset();
    expect(Object.values(service.getSnapshot().conversationRecords)).toEqual([
      expect.objectContaining({ bookingId: 'meeting-sarah-viswa-past', source: 'sample' }),
    ]);
  });

  it('returns an explicitly supplied record only for its meeting and participants', () => {
    const service = restore({ 'meeting-next': record });
    expect(service.getConversationRecord('meeting-next')).toEqual(record);
    expect(service.getConversationRecord('meeting-alex')).toBeUndefined();
    service.switchRole('professor');
    expect(service.getConversationRecord('meeting-next')).toEqual(record);
    service.switchRole('student');
    expect(() => service.getConversationRecord('meeting-amina')).toThrow(
      /another preview identity/,
    );
    service.switchRole('admin');
    expect(() => service.getConversationRecord('meeting-next')).toThrow(
      /only to the student and professor/,
    );
  });

  it('preserves processing/failed states and allows participant read access to archived records', () => {
    const service = restore({
      'meeting-next': { bookingId: 'meeting-next', source: 'sample', status: 'processing' },
      'meeting-completed': {
        bookingId: 'meeting-completed',
        source: 'sample',
        status: 'failed',
        error: 'Sample transcript is unavailable.',
      },
    });
    expect(service.getConversationRecord('meeting-next')?.status).toBe('processing');
    service.cancelBooking('meeting-next', 'The appointment was cancelled.');
    expect(service.getConversationRecord('meeting-next')?.status).toBe('processing');
    expect(service.getConversationRecord('meeting-completed')).toMatchObject({
      status: 'failed',
      error: 'Sample transcript is unavailable.',
    });
  });

  it('adds an empty record collection to legacy v3 data without resetting notes, drafts or bookings', () => {
    const original = create();
    current = new Date(
      Date.parse(original.getSnapshot().bookings['meeting-next'].start) + 5 * 60_000,
    );
    original.saveNoteDraft('meeting-next', 'A private draft to preserve.');
    original.sendNote('meeting-next', 'A shared note to preserve.', 'preserved-note');
    original.saveNoteDraft('meeting-next', 'A second private draft.');
    const state = original.getSnapshot();
    const { conversationRecords: _records, ...legacy } = state;
    expect(Object.keys(_records)).toEqual(['meeting-sarah-viswa-past']);
    const raw = JSON.stringify({ version: 3, state: legacy });
    const restored = new PreviewService({
      ...options,
      storage: { getItem: () => raw, setItem: () => {}, removeItem: () => {} },
    }).getSnapshot();
    expect(restored.conversationRecords).toEqual({});
    expect(restored.notes).toEqual(state.notes);
    expect(restored.noteDrafts).toEqual(state.noteDrafts);
    expect(restored.bookings).toEqual(state.bookings);
    expect(restored.profiles).toEqual(state.profiles);
  });
});
