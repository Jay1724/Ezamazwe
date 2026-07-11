import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function NavBar() {
  const { session, appUser, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <nav className="site-nav">
      <div className="wrap site-nav__inner">
        <Link to="/" className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <span>Ezamazwe Learn</span>
        </Link>

        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Browse
          </NavLink>

          {session && (
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              My Learning
            </NavLink>
          )}

          {appUser?.role === 'admin' && (
            <NavLink to="/admin" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              Admin
            </NavLink>
          )}

          {session ? (
            <button className="btn btn--secondary btn--sm" onClick={handleSignOut}>
              Sign out
            </button>
          ) : (
            <>
              <Link to="/login">Log in</Link>
              <Link to="/signup" className="btn btn--primary btn--sm">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
