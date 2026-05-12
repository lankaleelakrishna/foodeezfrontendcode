'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getUserRole, getUserDisplayName } from '../../lib/auth';
import { useTheme } from '../providers';

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner:   'Restaurant Owner',
  restaurant_admin:   'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager',
  restaurant_staff:   'Restaurant Staff',
  sales_operator:     'Sales Operator',
  super_admin:        'Super Admin',
};

interface TopHeaderProps { onMenuClick?: () => void; }

export default function TopHeader({ onMenuClick }: TopHeaderProps) {
  const pathname = usePathname() ?? '';
  const { theme, toggleTheme } = useTheme();
  const [roleLabel, setRoleLabel] = useState('Super Admin');
  const [name, setName]           = useState('Admin');
  const [initials, setInitials]   = useState('SA');

  useEffect(() => {
    const role        = getUserRole();
    const displayName = getUserDisplayName();
    const label       = ROLE_LABELS[role ?? 'super_admin'] ?? 'Admin';
    setRoleLabel(label);
    const resolved = displayName || label;
    setName(resolved.split(' ')[0]);
    setInitials(
      resolved.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
    );
  }, [pathname]);

  if (pathname.startsWith('/auth')) return null;

  return (
    <header className="z-30 flex shrink-0 h-12 items-center justify-between border-b border-[var(--hdr-bdr)] bg-[var(--hdr-bg)] px-4 transition-colors duration-200">

      {/* Mobile hamburger */}
      <button
        onClick={onMenuClick}
        className="mr-3 flex h-7 w-7 items-center justify-center rounded-md text-[var(--tx-2)] transition hover:text-[var(--tx)] lg:hidden"
        aria-label="Open menu"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Brand */}
      <div className="mr-4 flex items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--sb-bg)] p-1">
          <img src="/foodeez-sidebar-logo.png" alt="Foodeez" className="h-full w-full object-contain" />
        </div>
        <div className="hidden sm:block">
          <p className="text-[13px] font-bold leading-none text-[var(--tx)] tracking-tight">Foodeez</p>
          <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-[var(--tx-3)]">Console</p>
        </div>
      </div>

      <div className="hidden h-4 w-px bg-[var(--border)] sm:block mr-4" />

      {/* Search */}
      <div className="flex flex-1 items-center">
        <label className="relative w-full max-w-[260px]">
          <span className="sr-only">Search</span>
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--tx-3)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            placeholder="Search…"
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] py-1.5 pl-8 pr-3 text-[13px] text-[var(--tx)] placeholder:text-[var(--tx-3)] outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)]"
          />
        </label>
      </div>

      {/* Right */}
      <div className="ml-3 flex items-center gap-1.5">

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          {theme === 'dark' ? (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>

        {/* Bell */}
        <button className="relative flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] text-[var(--tx-2)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
          </svg>
          <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
        </button>

        {/* User */}
        <div className="flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2 py-1 ml-1">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-[#1A110A]">
            {initials}
          </div>
          <div className="hidden sm:block">
            <p className="text-[12px] font-semibold leading-none text-[var(--tx)]">{name}</p>
            <p className="mt-0.5 text-[9px] leading-none text-[var(--tx-3)]">{roleLabel}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
