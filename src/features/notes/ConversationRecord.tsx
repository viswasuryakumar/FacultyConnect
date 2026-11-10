import { useState } from 'react';
import { FileText, Info, Mic2 } from 'lucide-react';
import { useApp } from '../../app/context';
import { Badge, Button, Notice } from '../../components/ui';
import { service } from '../../services/preview';
import { dateLabel, timeLabel } from '../../lib/format';

function elapsedTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(safeSeconds / 60)).padStart(2, '0')}:${String(safeSeconds % 60).padStart(2, '0')}`;
}

export function ConversationRecordPanel({ bookingId }: { bookingId: string }) {
  const { state, user, explain } = useApp();
  const [showExample, setShowExample] = useState(false);
  const booking = state.bookings[bookingId];
  if (!booking) return <Notice tone="warning">This meeting is no longer available.</Notice>;
  if (user.role === 'admin' || (booking.studentId !== user.id && booking.professorId !== user.id)) {
    return (
      <Notice>
        The conversation record is available only to the student and professor in this meeting.
      </Notice>
    );
  }
  const record = service.getConversationRecord(bookingId);
  const sample = record?.source === 'sample';

  return (
    <section className="conversation-record" aria-label="Automatic conversation record">
      <div className="conversation-record-header">
        <div>
          <h2>Automatic conversation record</h2>
          <p className="muted">A separate transcript and recap for this appointment.</p>
        </div>
        <Badge status={record ? (sample ? 'Sample' : record.status) : 'Not connected'} />
      </div>
      {!record && (
        <div className="conversation-record-empty">
          <span className="conversation-record-icon">
            <Mic2 size={25} />
          </span>
          <h3>Keep the conversation, as well as your notes</h3>
          <p>
            This is separate from shared Notes. Once Zoom is connected, the conversation transcript
            and recap can appear here automatically after the meeting.
          </p>
          <p className="muted">This preview does not record or listen to calls.</p>
        </div>
      )}
      {sample && (
        <Notice tone="warning">
          <strong>Illustrative example — not recorded from this meeting</strong>
          <p>This stored sample demonstrates the format of a conversation record.</p>
        </Notice>
      )}
      {record?.status === 'processing' && (
        <Notice>
          <strong>Conversation record processing</strong>
          <p>
            {sample
              ? 'The sample record shows the processing state. No live meeting is being captured.'
              : 'The meeting transcript and recap are being prepared. They will appear here when processing is complete.'}
          </p>
        </Notice>
      )}
      {record?.status === 'failed' && (
        <Notice tone="error">
          <strong>The conversation record could not be prepared.</strong>
          <p>
            {record.error ||
              'The transcript or recap is unavailable. Shared Notes are still available separately.'}
          </p>
        </Notice>
      )}
      {record?.status === 'ready' && (
        <div className="conversation-record-content">
          {record.createdAt && (
            <p className="muted small">
              Prepared {dateLabel(record.createdAt, user.timeZone)} at{' '}
              {timeLabel(record.createdAt, user.timeZone)} · Source:{' '}
              {sample ? 'Illustrative sample' : 'Zoom'}
            </p>
          )}
          <section className="conversation-record-section">
            <h3>
              <FileText size={18} />
              Meeting recap
            </h3>
            {record.summary ? (
              <p className="conversation-record-summary">{record.summary}</p>
            ) : (
              <p className="muted">No recap is available for this record yet.</p>
            )}
          </section>
          <section className="conversation-record-section">
            <h3>
              <Mic2 size={18} />
              Conversation transcript
            </h3>
            {record.transcript?.length ? (
              <ol className="conversation-transcript">
                {record.transcript.map((segment, index) => (
                  <li key={`${segment.offsetSeconds}-${index}`}>
                    <span className="conversation-offset">
                      {elapsedTime(segment.offsetSeconds)}
                    </span>
                    <div>
                      <strong>
                        {segment.speakerId === user.id
                          ? 'You'
                          : state.profiles[segment.speakerId]?.name || 'Participant'}
                      </strong>
                      <p>{segment.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">No transcript is available for this record yet.</p>
            )}
          </section>
        </div>
      )}
      <div className="conversation-record-actions">
        <Button
          variant="secondary"
          onClick={() =>
            explain(
              'About automatic capture',
              'Automatic conversation records need a connected meeting provider and backend processing to retrieve the transcript and recap after the meeting. Participant consent, account permissions, and sharing settings must be configured for the real integration. This preview does not listen to calls or create a transcript from shared Notes.',
            )
          }
        >
          <Info size={16} />
          About automatic capture
        </Button>
        {!record && (
          <Button
            variant="ghost"
            onClick={() => setShowExample(!showExample)}
            aria-expanded={showExample}
          >
            {showExample ? 'Hide example' : 'View example format'}
          </Button>
        )}
      </div>
      {!record && showExample && (
        <div className="conversation-format-example">
          <Notice tone="warning">
            <strong>Illustrative example — not recorded from this meeting</strong>
            <p>
              Fictional content showing the format only. This example is not saved or shared as
              meeting notes.
            </p>
          </Notice>
          <section className="conversation-record-section">
            <h3>Example recap</h3>
            <p className="conversation-record-summary">
              The student and professor clarified the project goal and agreed to start with one
              focused question. The next step is to bring a short project outline to their next
              discussion.
            </p>
          </section>
          <section className="conversation-record-section">
            <h3>Example transcript</h3>
            <ol className="conversation-transcript">
              <li>
                <span className="conversation-offset">00:12</span>
                <div>
                  <strong>Student</strong>
                  <p>Could we review my project plan and decide where to start?</p>
                </div>
              </li>
              <li>
                <span className="conversation-offset">00:27</span>
                <div>
                  <strong>Professor</strong>
                  <p>
                    Start with one clear question, then put together a short outline we can discuss.
                  </p>
                </div>
              </li>
            </ol>
          </section>
        </div>
      )}
    </section>
  );
}
