import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, GraduationCap, Video } from 'lucide-react';
import { service } from '../../services/preview';
import type { Role } from '../../domain/types';
import { useApp } from '../../app/context';
import { Button, Field, Notice, PageHeader } from '../../components/ui';
import { errorMessage, TIME_ZONES, zoneLabel } from '../../lib/format';

export function SignIn() {
  const [role, setRole] = useState<Role>('student');
  const { explain } = useApp();
  const navigate = useNavigate();
  return (
    <div className="auth-page">
      <Link to="/signin" className="brand">
        <span className="brand-icon">
          <GraduationCap size={23} />
        </span>
        Faculty<span>Connect</span>
      </Link>
      <div className="auth-layout">
        <section className="auth-story">
          <h1>A conversation can move your work forward.</h1>
          <p>Find professors, explore their expertise, and make time to discuss your ideas.</p>
          <div className="auth-meeting">
            <Video size={19} />
            30-minute conversations. Meaningful next steps.
          </div>
        </section>
        <section className="auth-form">
          <div>
            <h2>Welcome back</h2>
            <p className="muted" style={{ marginTop: 10 }}>
              Your next conversation starts here.
            </p>
          </div>
          <div className="role-picker" aria-label="Preview identity">
            {(['student', 'professor'] as const).map((item) => (
              <button
                key={item}
                className={role === item ? 'active' : ''}
                aria-pressed={role === item}
                onClick={() => setRole(item)}
              >
                {item === 'student' ? 'Student' : 'Professor'}
              </button>
            ))}
          </div>
          <Button
            onClick={() => {
              service.switchRole(role);
              navigate('/');
            }}
          >
            Explore {role} preview <ArrowRight size={17} />
          </Button>
          <Notice>
            This is an interactive preview. No account or credentials are needed. Faculty access
            will be verified in the real application.
          </Notice>
          <p className="small">
            New student? <Link to="/onboarding">Set up a preview profile</Link>
          </p>
          <button
            className="text-link"
            onClick={() =>
              explain(
                'About sign-in',
                'Authentication is planned for a future phase. Okta ownership and account verification are still being decided. This preview only selects a sample identity; it does not sign in through Okta or grant faculty access.',
              )
            }
          >
            About sign-in and account access
          </button>
        </section>
      </div>
      <p className="auth-footnote">
        Frontend preview · Sample profiles and appointments · No accounts are connected
      </p>
    </div>
  );
}
export function Onboarding() {
  const { state, notify } = useApp();
  const [profile, setProfile] = useState({ ...state.profiles['student-viswa'] });
  const [interests, setInterests] = useState(profile.interests.join(', '));
  const [error, setError] = useState('');
  const navigate = useNavigate();
  return (
    <main className="onboarding-page">
      <Link to="/signin" className="brand">
        <span className="brand-icon">
          <GraduationCap />
        </span>
        Faculty<span>Connect</span>
      </Link>
      <PageHeader
        title="A little about you"
        description="Personalize professor suggestions and see meeting times in your time zone."
      />
      <form
        className="panel panel-pad stack"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            service.switchRole('student');
            service.saveProfile({
              ...profile,
              interests: interests
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            });
            notify('Your preview profile is ready');
            navigate('/');
          } catch (e) {
            setError(errorMessage(e));
          }
        }}
      >
        <Notice>
          Use sample details only. This form creates a profile in your browser, not a real account.
        </Notice>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="form-grid">
          <Field label="Full name">
            <input
              required
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
            />
          </Field>
          <Field label="Student email" hint="Shown to the professor with your meeting request.">
            <input
              type="email"
              required
              autoComplete="email"
              maxLength={254}
              value={profile.email ?? ''}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              placeholder="you@university.edu"
            />
          </Field>
          <Field label="University">
            <input
              required
              value={profile.university}
              onChange={(e) => setProfile({ ...profile, university: e.target.value })}
            />
          </Field>
          <Field label="Program or department">
            <input
              required
              value={profile.department}
              onChange={(e) => setProfile({ ...profile, department: e.target.value })}
            />
          </Field>
          <Field label="Time zone">
            <select
              value={profile.timeZone}
              onChange={(e) => setProfile({ ...profile, timeZone: e.target.value })}
            >
              {TIME_ZONES.map((z) => (
                <option key={z} value={z}>
                  {zoneLabel(z)}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Your interests" hint="Separate interests with a comma.">
          <input required value={interests} onChange={(e) => setInterests(e.target.value)} />
        </Field>
        <Button type="submit">
          Finish setup <ArrowRight size={16} />
        </Button>
        <p className="muted small">You can update these details in My Profile.</p>
      </form>
    </main>
  );
}
