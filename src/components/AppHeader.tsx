import { Link, useLocation } from 'react-router-dom';
import { usePlatform } from '@/services/PlatformProvider';
import { ConnectionStatus } from '@/components/ConnectionStatus';
import './AppHeader.css';

/** Top navigation bar with brand, links, role toggle and connection status. */
export function AppHeader() {
  const { connectionState, role, setRole } = usePlatform();
  const { pathname } = useLocation();

  const isActive = (path: string) =>
    path === '/' ? pathname === '/' : pathname.startsWith(path);

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <Link to="/" className="app-header__brand" aria-label="ReHabKnee home">
          <span className="app-header__logo" aria-hidden="true">
            🦿
          </span>
          <span className="app-header__title">ReHabKnee</span>
        </Link>

        <nav className="app-header__nav" aria-label="Main navigation">
          <Link to="/" className={isActive('/') ? 'is-active' : ''}>
            Dashboard
          </Link>
          <Link to="/calendar" className={isActive('/calendar') ? 'is-active' : ''}>
            Schedule
          </Link>
          <Link to="/exercises" className={isActive('/exercises') ? 'is-active' : ''}>
            Exercises
          </Link>
          <Link to="/resistance" className={isActive('/resistance') ? 'is-active' : ''}>
            Resistance
          </Link>
          <Link to="/weekly" className={isActive('/weekly') ? 'is-active' : ''}>
            Weekly
          </Link>
          <Link to="/ai-ran" className={isActive('/ai-ran') ? 'is-active' : ''}>
            AI-RAN
          </Link>
        </nav>

        <div className="app-header__status">
          <button
            className="role-toggle"
            onClick={() => setRole(role === 'patient' ? 'clinician' : 'patient')}
            title="Toggle role (prototype access control)"
          >
            {role === 'clinician' ? '👩‍⚕️ Clinician' : '🧑 Patient'}
          </button>
          <Link to="/connect" className="app-header__connect">
            <ConnectionStatus state={connectionState} />
          </Link>
        </div>
      </div>
    </header>
  );
}
