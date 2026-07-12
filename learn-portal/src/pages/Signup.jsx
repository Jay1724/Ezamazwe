import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function Signup() {
  const { signUp, user } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('learner');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  useEffect(() => {
    if (user) navigate('/learn', { replace: true });
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const { data, error: signUpError } = await signUp({ email, password, fullName, role });
    setSubmitting(false);
    if (signUpError) {
      setError(signUpError.message);
      return;
    }
    if (!data.session) {
      setConfirmSent(true);
      return;
    }
    navigate(role === 'parent' ? '/learn/learners' : '/learn', { replace: true });
  };

  if (confirmSent) {
    return (
      <div className="auth-page">
        <div className="auth-card card">
          <Link to="/learn" className="auth-brand">Ezamazwe Learn</Link>
          <h1>Check your email</h1>
          <p className="text-soft">We've sent a confirmation link to {email}. Confirm your address to finish signing up.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card card">
        <Link to="/learn" className="auth-brand">Ezamazwe Learn</Link>
        <h1>Create your account</h1>
        <p className="text-soft">Sign up to start learning.</p>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label>I'm signing up…</label>
            <div className="role-choice">
              <label className={`role-choice__option ${role === 'learner' ? 'is-selected' : ''}`}>
                <input type="radio" name="role" value="learner" checked={role === 'learner'} onChange={() => setRole('learner')} />
                <span>
                  <strong>For myself</strong>
                  <span className="text-soft">I'll take courses under my own account.</span>
                </span>
              </label>
              <label className={`role-choice__option ${role === 'parent' ? 'is-selected' : ''}`}>
                <input type="radio" name="role" value="parent" checked={role === 'parent'} onChange={() => setRole('parent')} />
                <span>
                  <strong>For my child/children</strong>
                  <span className="text-soft">I'll manage one or more learner profiles.</span>
                </span>
              </label>
            </div>
          </div>
          <div className="field">
            <label htmlFor="fullName">Full name</label>
            <input
              id="fullName"
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>
          <button type="submit" className="btn btn--primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Creating account…' : 'Sign up'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/learn/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}
