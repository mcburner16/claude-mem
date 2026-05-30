import { useState } from 'react';
import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/intake', label: 'Demo' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/audit-preview', label: 'Audit' },
  { to: '/settings', label: 'Settings' },
];

export default function NavBar() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="bg-surface border-b border-gray-700 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          <NavLink to="/" className="flex items-center gap-2 font-bold text-lg text-textPrimary">
            <span className="text-accent">▲</span>
            <span>TriageFlow AI</span>
          </NavLink>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-sm rounded transition-colors ${
                    isActive
                      ? 'text-accent border-b-2 border-accent font-medium'
                      : 'text-textSecondary hover:text-textPrimary'
                  }`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-textSecondary hover:text-textPrimary"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current mb-1" />
            <span className="block w-5 h-0.5 bg-current" />
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-surface border-t border-gray-700 px-4 pb-3">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 text-sm rounded transition-colors ${
                  isActive ? 'text-accent font-medium' : 'text-textSecondary hover:text-textPrimary'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
