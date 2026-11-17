import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { BookOpen, Menu, User, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { to: '/', label: 'Beranda', end: true },
  { to: '/search', label: 'Pencarian', end: false },
  { to: '/bookmarks', label: 'Bookmark', end: false },
  { to: '/history', label: 'Riwayat', end: false },
];

export function Navbar() {
  const { user, profile, authLoading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const displayName =
    profile?.full_name?.trim() ||
    (typeof user?.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    user?.email?.split('@')[0] ||
    'Profil';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2.5 text-lg font-bold tracking-tight text-[#0F172A] whitespace-nowrap"
          onClick={() => setMobileOpen(false)}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#2563EB] text-white">
            <BookOpen className="h-4 w-4" aria-hidden="true" />
          </span>
          <span>ScholarFind</span>
        </Link>

        {/* Zone 2: Primary Text Navigation */}
        <nav
          aria-label="Navigasi utama"
          className="hidden items-center gap-7 md:flex"
        >
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap shrink-0 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-[#2563EB]'
                    : 'text-[#64748B] hover:text-[#0F172A]'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Zone 3: Single Primary Account Action */}
        <div className="hidden shrink-0 items-center md:flex">
          {authLoading ? (
            <div
              className="h-9 w-24 animate-pulse rounded-lg bg-slate-100"
              aria-label="Memuat sesi"
            />
          ) : user ? (
            <Link
              to="/profile"
              className="inline-flex h-10 max-w-[180px] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 text-sm font-medium text-[#0F172A] transition-colors hover:border-slate-300 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <User className="h-4 w-4 shrink-0 text-[#2563EB]" aria-hidden="true" />
              <span className="truncate">{displayName}</span>
            </Link>
          ) : (
            <Link
              to="/login"
              state={{ from: location.pathname + location.search }}
              className="inline-flex h-10 items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white transition-colors hover:bg-[#1D4ED8] whitespace-nowrap shrink-0"
            >
              Masuk
            </Link>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-drawer"
          aria-label={mobileOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
          className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-[#0F172A] hover:bg-slate-50 md:hidden"
        >
          {mobileOpen ? (
            <X className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Menu className="h-5 w-5" aria-hidden="true" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          id="mobile-nav-drawer"
          className="border-t border-slate-200 bg-white px-4 py-4 md:hidden"
        >
          <nav aria-label="Navigasi seluler" className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex h-11 items-center rounded-lg px-3 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-[#2563EB]'
                      : 'text-[#0F172A] hover:bg-slate-50'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}

            <div className="mt-3 border-t border-slate-200 pt-3">
              {user ? (
                <Link
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
                >
                  <User className="h-4 w-4 text-[#2563EB]" aria-hidden="true" />
                  <span className="truncate">Profil ({displayName})</span>
                </Link>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-11 items-center justify-center rounded-lg bg-[#2563EB] px-4 text-sm font-medium text-white hover:bg-[#1D4ED8]"
                  >
                    Masuk
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileOpen(false)}
                    className="flex h-11 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-medium text-[#0F172A] hover:bg-slate-50"
                  >
                    Daftar Akun
                  </Link>
                </div>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
