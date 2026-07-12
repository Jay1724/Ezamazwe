import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';

export default function NavBar() {
  const { user, profile, isAdmin, isParent, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/learn/login');
  };

  return (
    <nav className="portal-nav">
      <div className="wrap portal-nav__inner">
        <NavLink to="/learn" className="portal-nav__brand">Ezamazwe Learn</NavLink>
        <div className="portal-nav__links">
          <NavLink to="/learn/courses" className={({ isActive }) => (isActive ? 'is-active' : '')}>
            Catalog
          </NavLink>
          {user && (
            <NavLink to="/learn" end className={({ isActive }) => (isActive ? 'is-active' : '')}>
              Dashboard
            </NavLink>
          )}
          {isParent && (
            <NavLink to="/learn/learners" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              My learners
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/learn/admin" className={({ isActive }) => (isActive ? 'is-active' : '')}>
              Admin
            </NavLink>
          )}
          {user ? (
            <>
              <span className="text-soft">{profile?.full_name || user.email}</span>
              <button type="button" onClick={handleLogout}>Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/learn/login">Log in</NavLink>
              <NavLink to="/learn/signup" className="btn btn--primary btn--sm">Sign up</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
