import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Camera, Check, Eye, Plus, Save, Trash2, UserRound } from 'lucide-react';
import { useApp } from '../../app/context';
import { Avatar, Button, Field, Notice, PageHeader, Modal } from '../../components/ui';
import type { Profile } from '../../domain/types';
import { service } from '../../services/preview';

const timeZones = [
  ['America/Los_Angeles', 'Pacific time (America/Los_Angeles)'],
  ['America/Denver', 'Mountain time (America/Denver)'],
  ['America/Chicago', 'Central time (America/Chicago)'],
  ['America/New_York', 'Eastern time (America/New_York)'],
  ['Europe/London', 'London (Europe/London)'],
  ['Europe/Paris', 'Paris (Europe/Paris)'],
  ['Asia/Kolkata', 'India (Asia/Kolkata)'],
  ['Asia/Singapore', 'Singapore (Asia/Singapore)'],
  ['Australia/Sydney', 'Sydney (Australia/Sydney)'],
  ['UTC', 'Coordinated Universal Time (UTC)'],
];

function normalizeProfile(profile: Profile): Profile {
  return {
    ...profile,
    notificationPreferences: profile.notificationPreferences ?? {
      meetingReminders: true,
      bookingUpdates: true,
    },
  };
}

export function ProfileEditor() {
  const { user, notify } = useApp();
  const [draft, setDraft] = useState<Profile>(() => normalizeProfile(structuredClone(user)));
  const [error, setError] = useState('');
  const [photoBusy, setPhotoBusy] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const photoInput = useRef<HTMLInputElement>(null);
  const professor = user.role === 'professor';
  const dirty = JSON.stringify(draft) !== JSON.stringify(normalizeProfile(user));

  useEffect(() => {
    if (!dirty) return;
    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = '';
    }
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      for (const link of draft.professionalLinks ?? []) {
        const parsed = new URL(link.url);
        if (!['https:', 'http:'].includes(parsed.protocol) || !link.label.trim()) {
          throw new Error('Give each professional link a label and a valid HTTPS or HTTP address.');
        }
      }
      const clean = {
        ...draft,
        name: draft.name.trim(),
        university: draft.university.trim(),
        department: draft.department.trim(),
        interests: draft.interests.map((item) => item.trim()).filter(Boolean),
        expertise: draft.expertise?.map((item) => item.trim()).filter(Boolean),
        languages: draft.languages?.map((item) => item.trim()).filter(Boolean),
        email: draft.email?.trim(),
        subjects: draft.subjects?.map((item) => item.trim()).filter(Boolean),
      };
      service.saveProfile(clean);
      setDraft(clean);
      notify(
        professor
          ? 'Your public profile has been updated.'
          : 'Your profile and preferences have been saved.',
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save your profile. Please try again.',
      );
    }
  }

  function choosePhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('Choose a JPG, PNG, or WebP image.');
      return;
    }
    if (file.size > 220 * 1024) {
      setError('Choose a photo smaller than 220 KB so the preview can save it locally.');
      return;
    }
    setPhotoBusy(true);
    const reader = new FileReader();
    reader.onload = () => {
      update('photo', String(reader.result));
      setPhotoBusy(false);
    };
    reader.onerror = () => {
      setError('This photo could not be read. Please choose another image.');
      setPhotoBusy(false);
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  return (
    <>
      <PageHeader
        title={professor ? 'Public profile' : 'My Profile & Settings'}
        description={
          professor
            ? 'Help students understand your expertise before they request a meeting.'
            : 'Manage the details you shared when you joined.'
        }
      />
      <form className="profile-form" onSubmit={save}>
        {error && <Notice tone="error">{error}</Notice>}
        <section className="profile-photo-row">
          <Avatar profile={draft} size="lg" />
          <div className="stack compact">
            <h2 className="section-title">{draft.name || 'Your profile'}</h2>
            <p className="muted">
              {professor
                ? `${draft.academicRole || 'Professor'} · ${draft.department || 'Department'}`
                : draft.university}
            </p>
            <div className="row wrap">
              <Button
                type="button"
                variant="ghost"
                disabled={photoBusy}
                onClick={() => photoInput.current?.click()}
              >
                <Camera size={16} /> {photoBusy ? 'Reading photo…' : 'Change photo'}
              </Button>
              {draft.photo && (
                <Button type="button" variant="ghost" onClick={() => update('photo', undefined)}>
                  Remove photo
                </Button>
              )}
            </div>
          </div>
          <input
            className="visually-hidden"
            ref={photoInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={choosePhoto}
            tabIndex={-1}
            aria-label="Choose a profile photo"
          />
        </section>
        <section className="panel panel-pad stack">
          <div className="row">
            <UserRound size={19} />
            <h2 className="section-title">{professor ? 'Academic details' : 'Personal details'}</h2>
          </div>
          <div className="form-grid">
            <Field label={professor ? 'Full name and title' : 'Full name'}>
              <input
                required
                autoComplete="name"
                maxLength={100}
                value={draft.name}
                onChange={(event) => update('name', event.target.value)}
              />
            </Field>
            {user.role === 'student' && (
              <Field
                label="Student email"
                hint="Professors can use this address to contact you about your meetings."
              >
                <input
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  value={draft.email ?? ''}
                  onChange={(event) => update('email', event.target.value)}
                  placeholder="you@university.edu"
                />
              </Field>
            )}
            <Field label="University">
              <input
                required
                maxLength={120}
                autoComplete="organization"
                value={draft.university}
                onChange={(event) => update('university', event.target.value)}
              />
            </Field>
            <Field label={professor ? 'Department' : 'Program or department'}>
              <input
                required
                maxLength={120}
                value={draft.department}
                onChange={(event) => update('department', event.target.value)}
              />
            </Field>
            {professor && (
              <Field label="Academic position">
                <input
                  required
                  maxLength={100}
                  value={draft.academicRole ?? ''}
                  onChange={(event) => update('academicRole', event.target.value)}
                  placeholder="Associate Professor"
                />
              </Field>
            )}
            <Field label="Time zone">
              <select
                value={draft.timeZone}
                onChange={(event) => update('timeZone', event.target.value)}
              >
                {!timeZones.some(([value]) => value === draft.timeZone) && (
                  <option value={draft.timeZone}>{draft.timeZone}</option>
                )}
                {timeZones.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </Field>
            {!professor && (
              <Field label="Interests" hint="Separate interests with commas.">
                <input
                  value={draft.interests.join(',')}
                  onChange={(event) => update('interests', event.target.value.split(','))}
                  placeholder="Machine learning, Research"
                  maxLength={400}
                />
              </Field>
            )}
          </div>
        </section>
        {professor && (
          <section className="panel panel-pad stack">
            <h2 className="section-title">Expertise & advising</h2>
            <Field label="Expertise" hint="Separate areas with commas.">
              <input
                required
                value={(draft.expertise ?? []).join(',')}
                onChange={(event) => update('expertise', event.target.value.split(','))}
                placeholder="Machine learning, Python, Research"
                maxLength={500}
              />
            </Field>
            <Field label="About" hint="Tell students how you can help them.">
              <textarea
                required
                rows={5}
                maxLength={2000}
                value={draft.bio ?? ''}
                onChange={(event) => update('bio', event.target.value)}
              />
            </Field>
            <Field label="Education">
              <textarea
                rows={2}
                maxLength={600}
                value={draft.education ?? ''}
                onChange={(event) => update('education', event.target.value)}
                placeholder="Ph.D. in Computer Science"
              />
            </Field>
            <div className="form-grid">
              <Field
                label="Subjects taught"
                hint="Separate subjects with commas. These appear on your public profile."
              >
                <input
                  value={(draft.subjects ?? []).join(',')}
                  onChange={(event) => update('subjects', event.target.value.split(','))}
                  placeholder="Machine learning, Python programming"
                  maxLength={500}
                />
              </Field>
              <Field label="Languages" hint="Separate languages with commas.">
                <input
                  value={(draft.languages ?? []).join(',')}
                  onChange={(event) => update('languages', event.target.value.split(','))}
                  maxLength={200}
                />
              </Field>
            </div>
            <div className="stack compact">
              <h3>Professional links</h3>
              <p className="small muted">
                Share your university page, research profile, or personal website.
              </p>
              {(draft.professionalLinks ?? []).map((link, index) => (
                <div className="professional-link-row" key={index}>
                  <Field label={`Link label ${index + 1}`}>
                    <input
                      required
                      maxLength={80}
                      value={link.label}
                      placeholder="University profile"
                      onChange={(event) =>
                        update(
                          'professionalLinks',
                          draft.professionalLinks?.map((item, i) =>
                            i === index ? { ...item, label: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Field label={`Website address ${index + 1}`}>
                    <input
                      type="url"
                      required
                      maxLength={400}
                      value={link.url}
                      placeholder="https://"
                      onChange={(event) =>
                        update(
                          'professionalLinks',
                          draft.professionalLinks?.map((item, i) =>
                            i === index ? { ...item, url: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove professional link ${index + 1}`}
                    onClick={() =>
                      update(
                        'professionalLinks',
                        draft.professionalLinks?.filter((_, i) => i !== index),
                      )
                    }
                  >
                    <Trash2 size={17} />
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() =>
                    update('professionalLinks', [
                      ...(draft.professionalLinks ?? []),
                      { label: '', url: '' },
                    ])
                  }
                >
                  <Plus size={16} /> Add professional link
                </Button>
              </div>
            </div>
          </section>
        )}
        <section className="panel panel-pad stack">
          <h2 className="section-title">Notification preferences</h2>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.notificationPreferences?.meetingReminders ?? true}
              onChange={(event) =>
                update('notificationPreferences', {
                  meetingReminders: event.target.checked,
                  bookingUpdates: draft.notificationPreferences?.bookingUpdates ?? true,
                })
              }
            />
            <span>
              Meeting reminders
              <span className="muted small">
                Save your preference for reminders before a meeting.
              </span>
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={draft.notificationPreferences?.bookingUpdates ?? true}
              onChange={(event) =>
                update('notificationPreferences', {
                  bookingUpdates: event.target.checked,
                  meetingReminders: draft.notificationPreferences?.meetingReminders ?? true,
                })
              }
            />
            <span>
              Booking updates
              <span className="muted small">
                Save your preference for request and schedule updates.
              </span>
            </span>
          </label>
          <p className="small muted">
            Preferences are saved in this preview. No emails or reminders are sent.
          </p>
        </section>
        <div className="row wrap management-actions">
          <Button type="submit" disabled={photoBusy}>
            <Save size={17} />
            {professor ? 'Save profile' : 'Save changes'}
          </Button>
          {professor && (
            <Link to={`/professors/${user.id}`} className="button button-secondary">
              <Eye size={17} /> Preview saved profile
            </Link>
          )}
          {dirty ? (
            <>
              <span className="small muted">Unsaved changes</span>
              <Button type="button" variant="ghost" onClick={() => setDiscardOpen(true)}>
                Discard
              </Button>
            </>
          ) : (
            <span className="row small muted">
              <Check size={16} />
              All changes saved
            </span>
          )}
        </div>
        {professor && dirty && (
          <p className="small muted">Save your changes before previewing the public page.</p>
        )}
      </form>
      {discardOpen && (
        <Modal title="Discard profile changes?" onClose={() => setDiscardOpen(false)}>
          <div className="stack">
            <p>Your last saved profile will be restored.</p>
            <div className="row wrap">
              <Button
                variant="danger"
                onClick={() => {
                  setDraft(normalizeProfile(structuredClone(user)));
                  setError('');
                  setDiscardOpen(false);
                }}
              >
                Discard changes
              </Button>
              <Button variant="secondary" onClick={() => setDiscardOpen(false)}>
                Keep editing
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
