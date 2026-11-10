import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Download, FileText, Info, Pencil, Send, Trash2 } from 'lucide-react';
import { useApp } from '../../app/context';
import { Avatar, Button, Field, Modal, Notice } from '../../components/ui';
import { service } from '../../services/preview';
import type { MeetingNote } from '../../domain/types';
import { now } from '../../domain/clock';
import { noteWindowStatus } from '../../domain/notes';
import { dateLabel, errorMessage, timeLabel, zoneLabel } from '../../lib/format';

export function MeetingNotes({ bookingId }: { bookingId: string }) {
  const { state, user } = useApp();
  const booking = state.bookings[bookingId];
  if (!booking) return <Notice tone="warning">This meeting is no longer available.</Notice>;
  if (user.role === 'admin' || (booking.studentId !== user.id && booking.professorId !== user.id)) {
    return (
      <Notice>
        Shared notes are available only to the student and professor taking part in this meeting.
      </Notice>
    );
  }
  return <NotesThread key={`${user.id}:${bookingId}`} bookingId={bookingId} />;
}

function NotesThread({ bookingId }: { bookingId: string }) {
  const { state, user, notify, explain } = useApp();
  const booking = state.bookings[bookingId];
  const notes = Object.values(state.notes)
    .filter((note) => note.bookingId === bookingId)
    .sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const [at, setAt] = useState(() => now());
  const windowStatus = noteWindowStatus(booking, at);
  const canWrite = windowStatus === 'open';
  const [draft, setDraft] = useState(() => service.getNoteDraft(bookingId));
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const [editError, setEditError] = useState('');
  const [deleting, setDeleting] = useState<MeetingNote | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const sendingRef = useRef(false);
  const submissionKey = useRef(crypto.randomUUID());
  const composer = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const timer = setInterval(() => setAt(now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!canWrite) {
      setEditingId(null);
      setDeleting(null);
    }
  }, [canWrite]);

  function changeDraft(body: string) {
    setDraft(body);
    setError('');
    submissionKey.current = crypto.randomUUID();
    try {
      service.saveNoteDraft(bookingId, body);
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function sendNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sendingRef.current || !canWrite || !draft.trim()) return;
    sendingRef.current = true;
    setSending(true);
    setError('');
    try {
      await Promise.resolve();
      service.sendNote(bookingId, draft, submissionKey.current);
      setDraft('');
      submissionKey.current = crypto.randomUUID();
      notify('Note shared with the other participant');
      composer.current?.focus();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }

  function saveEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingId || !canWrite) return;
    setEditError('');
    try {
      service.editNote(editingId, editBody);
      setEditingId(null);
      notify('Your note has been updated');
    } catch (err) {
      setEditError(errorMessage(err));
    }
  }

  function downloadNotes() {
    const student = state.profiles[booking.studentId];
    const professor = state.profiles[booking.professorId];
    const content = [
      'FacultyConnect - meeting notes (preview)',
      `${student.name} and ${professor.name}`,
      `${dateLabel(booking.start, user.timeZone, true)} at ${timeLabel(booking.start, user.timeZone)} (${zoneLabel(user.timeZone)})`,
      `Discussion topic: ${booking.topic}`,
      '',
      ...notes.flatMap((note) => [
        `${state.profiles[note.authorId]?.name ?? 'Participant'} - ${dateLabel(note.createdAt, user.timeZone)} at ${timeLabel(note.createdAt, user.timeZone)}${note.editedAt ? ' (edited)' : ''}`,
        note.body,
        '',
      ]),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `facultyconnect-notes-${new Date(booking.start).toISOString().slice(0, 10)}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('Meeting notes downloaded');
  }

  return (
    <section className="notes-thread" aria-label="Shared meeting notes">
      <div className="notes-thread-header">
        <div>
          <h2>Shared notes</h2>
          <p className="muted">
            Chat during the meeting, then return here to read the conversation.
          </p>
        </div>
        <Button variant="secondary" disabled={!notes.length} onClick={downloadNotes}>
          <Download size={16} />
          Download notes
        </Button>
      </div>
      <div className="notes-preview-label">
        <Info size={14} />
        <span>
          Shared in this browser preview. Both participants can see posted notes; drafts are only
          visible to their author.
        </span>
      </div>
      {windowStatus === 'pending' && (
        <Notice>
          Chat is available only during a confirmed meeting. This request is still pending.
        </Notice>
      )}
      {windowStatus === 'upcoming' && (
        <Notice>
          <strong>Chat opens when the meeting starts</strong>
          <p>
            {dateLabel(booking.start, user.timeZone, true)} -{' '}
            {timeLabel(booking.start, user.timeZone)} to {timeLabel(booking.end, user.timeZone)} (
            {zoneLabel(user.timeZone)})
          </p>
        </Notice>
      )}
      {windowStatus === 'ended' && <Notice>This meeting has ended. Messages are read-only.</Notice>}
      {windowStatus === 'closed' && (
        <Notice>This meeting is {booking.status}. Messages are read-only.</Notice>
      )}
      <div
        className="notes-posts"
        role="log"
        aria-live="polite"
        aria-relevant="additions text"
        aria-label="Meeting notes thread"
      >
        {notes.length ? (
          notes.map((note) => {
            const author = state.profiles[note.authorId];
            const own = note.authorId === user.id;
            return (
              <article
                className={`meeting-note ${own ? 'meeting-note-own' : ''}`}
                data-note-id={note.id}
                key={note.id}
              >
                <div className="note-author">
                  {author && <Avatar profile={author} size="sm" />}
                  <div>
                    <strong>{own ? 'You' : (author?.name ?? 'Participant')}</strong>
                    <p className="muted">
                      {!own && (
                        <>
                          <span className="note-role">{author?.role ?? 'Participant'}</span>
                          <span aria-hidden="true"> · </span>
                        </>
                      )}
                      <time dateTime={note.createdAt}>
                        {dateLabel(note.createdAt, user.timeZone)} at{' '}
                        {timeLabel(note.createdAt, user.timeZone)}
                      </time>
                      {note.editedAt && <span> · Edited</span>}
                    </p>
                  </div>
                </div>
                {editingId === note.id && canWrite ? (
                  <form className="note-edit-form" onSubmit={saveEdit}>
                    {editError && <Notice tone="error">{editError}</Notice>}
                    <Field label="Edit note">
                      <textarea
                        required
                        maxLength={4000}
                        rows={4}
                        value={editBody}
                        onChange={(event) => setEditBody(event.target.value)}
                        autoFocus
                      />
                    </Field>
                    <div className="row">
                      <Button type="submit" disabled={!editBody.trim()}>
                        Save changes
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setEditingId(null);
                          setEditError('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="note-body">{note.body}</p>
                )}
                {own && canWrite && editingId !== note.id && (
                  <div className="note-actions">
                    <Button
                      variant="ghost"
                      aria-label="Edit note"
                      onClick={() => {
                        setEditingId(note.id);
                        setEditBody(note.body);
                        setEditError('');
                      }}
                    >
                      <Pencil size={14} />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      aria-label="Delete note"
                      onClick={() => {
                        setDeleting(note);
                        setDeleteError('');
                      }}
                    >
                      <Trash2 size={14} />
                      Delete
                    </Button>
                  </div>
                )}
              </article>
            );
          })
        ) : (
          <div className="notes-empty">
            <FileText size={26} />
            <h3>
              {windowStatus === 'ended' || windowStatus === 'closed'
                ? 'No messages were shared'
                : 'No shared notes yet'}
            </h3>
            <p className="muted">
              {canWrite
                ? 'Share a question, useful link, or next step while the meeting is happening. Chat closes when the scheduled meeting ends.'
                : 'Messages shared during this meeting stay here so both participants can read them later.'}
            </p>
          </div>
        )}
      </div>
      {canWrite && (
        <form
          className="note-composer"
          onSubmit={(event) => {
            void sendNote(event);
          }}
        >
          {error && <Notice tone="error">{error}</Notice>}
          <Field
            label="Note to share"
            hint="Share during this meeting only. Your draft is private until you select Send note."
          >
            <textarea
              ref={composer}
              maxLength={4000}
              rows={4}
              value={draft}
              onChange={(event) => changeDraft(event.target.value)}
              placeholder="Write a question, meeting note, or next step for this conversation..."
            />
          </Field>
          <div className="note-composer-footer">
            <span className="muted" role="status">
              {draft ? 'Draft saved - only you' : 'Visible to both participants once shared'}
              <span className="note-character-count">{draft.length.toLocaleString()} / 4,000</span>
            </span>
            <Button type="submit" disabled={sending || !draft.trim()}>
              <Send size={16} />
              {sending ? 'Sharing...' : 'Send note'}
            </Button>
          </div>
        </form>
      )}
      <div className="notes-automation-help">
        <button
          className="text-link"
          onClick={() =>
            explain(
              'About automatic summaries',
              'Automatic meeting summaries need a transcript or provider summary, participant consent, and a backend integration. This preview does not listen to Zoom, record a call, or generate a real summary. Written notes you share here stay attached to this appointment.',
            )
          }
        >
          <Info size={14} />
          About automatic summaries
        </button>
      </div>
      {deleting && canWrite && (
        <Modal title="Delete this note?" onClose={() => setDeleting(null)}>
          <p>This removes your posted note from this meeting for both participants.</p>
          {deleteError && <Notice tone="error">{deleteError}</Notice>}
          <div className="row">
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Keep note
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                try {
                  service.deleteNote(deleting.id);
                  setDeleting(null);
                  notify('Your note has been deleted');
                } catch (err) {
                  setDeleteError(errorMessage(err));
                }
              }}
            >
              Delete note
            </Button>
          </div>
        </Modal>
      )}
    </section>
  );
}
