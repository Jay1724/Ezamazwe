import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLearnerProfiles } from '../contexts/LearnerProfileContext';
import type { AgeGroup } from '../types/database';

type Step = 'choose' | 'self' | 'child';

export function SignupPage() {
  const { session, signUp } = useAuth();
  const { createSelfProfile, createChildProfile } = useLearnerProfiles();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('choose');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [ageGroup, setAgeGroup] = useState<AgeGroup>('adult');
  const [childName, setChildName] = useState('');
  const [childAgeGroup, setChildAgeGroup] = useState<AgeGroup>('kids');

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [pendingProfile, setPendingProfile] = useState<{ kind: Step; displayName: string; ageGroup: AgeGroup } | null>(
    null
  );

  // Runs once a session exists after signUp — handles both the "instant
  // session" case (email confirmation disabled) and, if a user later
  // returns already-confirmed, would be a no-op since pendingProfile is
  // only set right after this page's own submit.
  useEffect(() => {
    if (!session || !pendingProfile) return;
    (async () => {
      const result =
        pendingProfile.kind === 'child'
          ? await createChildProfile({ displayName: pendingProfile.displayName, ageGroup: pendingProfile.ageGroup })
          : await createSelfProfile({ displayName: pendingProfile.displayName, ageGroup: pendingProfile.ageGroup });
      setPendingProfile(null);
      if (!result.error) navigate('/dashboard');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pendingProfile]);

  async function handleSelfSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signUp({ email, password, fullName, role: 'learner' });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setPendingProfile({ kind: 'self', displayName: fullName, ageGroup });
    setAwaitingConfirmation(true);
  }

  async function handleChildSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await signUp({ email, password, fullName, role: 'parent' });
    setSubmitting(false);
    if (error) {
      setError(error);
      return;
    }
    setPendingProfile({ kind: 'child', displayName: childName, ageGroup: childAgeGroup });
    setAwaitingConfirmation(true);
  }

  if (awaitingConfirmation && !session) {
    return (
      <div className="auth-shell">
        <div className="card auth-card" style={{ textAlign: 'center' }}>
          <h1>Check your email</h1>
          <p className="auth-card__sub">
            We've sent a confirmation link to <strong>{email}</strong>. Once confirmed, log in to finish
            setting up {step === 'child' ? "your child's" : 'your'} profile.
          </p>
          <Link to="/login" className="btn btn--primary btn--block">
            Go to log in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-shell">
      <div className="card auth-card">
        <h1>Create your account</h1>
        <p className="auth-card__sub">Join Ezamazwe Learn — courses from Ezamazwe Education instructors.</p>

        {step === 'choose' && (
          <>
            <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
              Are you creating an account for yourself or for your child?
            </p>
            <div className="role-choice">
              <button className="role-choice__option" onClick={() => setStep('self')}>
                Myself
                <br />
                <span className="text-soft" style={{ fontWeight: 400, fontSize: 12 }}>
                  Teen or adult learner
                </span>
              </button>
              <button className="role-choice__option" onClick={() => setStep('child')}>
                My child
                <br />
                <span className="text-soft" style={{ fontWeight: 400, fontSize: 12 }}>
                  You stay signed in as the parent
                </span>
              </button>
            </div>
            <p className="text-soft" style={{ fontSize: 13 }}>
              Already have an account? <Link to="/login">Log in</Link>
            </p>
          </>
        )}

        {step === 'self' && (
          <form onSubmit={handleSelfSubmit}>
            {error && <div className="form-error">{error}</div>}
            <div className="field">
              <label>Full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label>I am a...</label>
              <select value={ageGroup} onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}>
                <option value="teens">Teen (13-17)</option>
                <option value="adult">Adult</option>
              </select>
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" className="btn btn--secondary btn--block" style={{ marginTop: 10 }} onClick={() => setStep('choose')}>
              Back
            </button>
          </form>
        )}

        {step === 'child' && (
          <form onSubmit={handleChildSubmit}>
            {error && <div className="form-error">{error}</div>}
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Your details (the parent/guardian account)</p>
            <div className="field">
              <label>Your full name</label>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Your email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="field">
              <label>Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
            </div>

            <p style={{ fontSize: 13, fontWeight: 600, margin: '20px 0 4px' }}>Your child's profile</p>
            <p className="field-hint" style={{ marginBottom: 12 }}>
              Your child won't have their own login — you'll select "learning as [name]" from your account.
              We only need a first name/nickname, nothing else.
            </p>
            <div className="field">
              <label>Child's first name or nickname</label>
              <input value={childName} onChange={(e) => setChildName(e.target.value)} required />
            </div>
            <div className="field">
              <label>Age group</label>
              <select value={childAgeGroup} onChange={(e) => setChildAgeGroup(e.target.value as AgeGroup)}>
                <option value="kids">Kids</option>
                <option value="teens">Teens</option>
              </select>
            </div>
            <button type="submit" className="btn btn--primary btn--block" disabled={submitting}>
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
            <button type="button" className="btn btn--secondary btn--block" style={{ marginTop: 10 }} onClick={() => setStep('choose')}>
              Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
