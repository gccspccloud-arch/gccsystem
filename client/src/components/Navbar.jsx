import { useState, useRef, useEffect } from 'react';
import { Link, NavLink } from 'react-router-dom';
import logo from '@/assets/logo.jpg';
import { useAuth } from '@/context/AuthContext';
import { ROLE_LABELS } from '@/utils/constants';

const Navbar = () => {
  const { user, logout, hasRole } = useAuth();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const navLinks = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/announcements', label: 'Announcements' },
    { to: '/calendar', label: 'Calendar' },
    { to: '/meetings', label: 'Meetings' },
    { to: '/outreach', label: 'Outreach' },
    { to: '/members', label: 'Members' },
    ...(hasRole('super_admin', 'admin') ? [{ to: '/reports', label: 'Reports' }] : []),
    ...(hasRole('super_admin', 'admin') ? [{ to: '/users', label: 'Users' }] : []),
  ];

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const linkClass = ({ isActive }) =>
    `text-sm font-medium transition-colors px-3 py-2 rounded-md ${
      isActive ? 'text-primary-700 bg-primary-50' : 'text-gray-600 hover:text-primary-600'
    }`;

  return (
    <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <img src={logo} alt="GCC Logo" className="h-10 w-auto" />
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-primary-700 leading-tight">Gospel Coalition Church</p>
            <p className="text-xs text-gray-400 leading-tight">Attendance System</p>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.end} className={linkClass}>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden md:block relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center text-sm font-semibold">
              {user?.firstName?.[0] || 'U'}
            </div>
            <div className="text-left">
              <p className="text-xs font-semibold text-gray-700 leading-tight">{user?.fullName}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{ROLE_LABELS[user?.role]}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs font-semibold text-gray-700 truncate">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-3 py-2 text-sm text-accent-red hover:bg-red-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          )}
        </div>

        <button
          className="md:hidden text-gray-600 p-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? (
              <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round" />
            ) : (
              <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
            )}
          </svg>
        </button>
      </div>

      {open && (
        <nav className="md:hidden border-t border-gray-100 bg-white px-4 py-2 flex flex-col gap-1">
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </NavLink>
          ))}
          <div className="border-t border-gray-100 mt-2 pt-2">
            <p className="px-3 text-xs text-gray-400">
              Signed in as <span className="font-semibold text-gray-700">{user?.fullName}</span> ({ROLE_LABELS[user?.role]})
            </p>
            <button onClick={logout} className="w-full text-left px-3 py-2 text-sm text-accent-red">
              Sign out
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Navbar;
