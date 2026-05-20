'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { clearToken, getUserRole, getUserEmail, getUserDisplayName } from '../../lib/auth';

// ── Icons ─────────────────────────────────────────────────────────────────────

function Icon({ d, d2 }: { d: string; d2?: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />{d2 && <path d={d2} />}
    </svg>
  );
}

function IconDashboard()   { return <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" />; }
function IconRestaurant()  { return <Icon d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" d2="M9 22V12h6v10" />; }
function IconPayments()    { return <Icon d="M1 4h22v16H1zM1 10h22" />; }
function IconUsers()       { return <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.74" />; }
function IconDelivery()    { return <Icon d="M1 3h15v13H1zM16 8h4l3 5v3h-7V8z" d2="M5.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5zM18.5 21a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />; }
function IconRider()       { return <Icon d="M12 3a2 2 0 100 4 2 2 0 000-4zM12 7v6l4 2M5 16a7 7 0 0114 0" />; }
function IconTracking()    { return <Icon d="M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3" />; }
function IconSupport()     { return <Icon d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" d2="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />; }
function IconPayout()      { return <Icon d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />; }
function IconAnalytics()   { return <Icon d="M18 20V10M12 20V4M6 20v-6" />; }
function IconLogout()      { return <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />; }
function IconCustomers()   { return <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" />; }
function IconOrders()      { return <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />; }
function IconTickets()     { return <Icon d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />; }

// ── Nav config ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  restaurant_owner:   'Restaurant Owner',
  restaurant_admin:   'Restaurant Admin',
  restaurant_manager: 'Restaurant Manager',
  restaurant_staff:   'Restaurant Staff',
  sales_operator:     'Sales Operator',
  super_admin:        'Super Admin',
};

type NavLink = { label: string; href: string; icon: React.FC; role?: string };

const navSections: { title: string; links: NavLink[] }[] = [
  {
    title: 'Overview',
    links: [
      { label: 'Dashboard',  href: '/dashboard',  icon: IconDashboard },
    ],
  },
  {
    title: 'Manage',
    links: [
      { label: 'Restaurants', href: '/restaurants', icon: IconRestaurant },
      { label: 'Payments',    href: '/payments',    icon: IconPayments,  role: 'super_admin' },
      { label: 'Users',       href: '/users',       icon: IconUsers,     role: 'super_admin' },
    ],
  },
  {
    title: 'Customers',
    links: [
      { label: 'Customers', href: '/admin/customers', icon: IconCustomers, role: 'super_admin' },
      { label: 'Orders',    href: '/admin/orders',    icon: IconOrders,    role: 'super_admin' },
      { label: 'Tickets',   href: '/admin/tickets',   icon: IconTickets,   role: 'super_admin' },
    ],
  },
  {
    title: 'Delivery',
    links: [
      { label: 'Analytics',     href: '/delivery/analytics',   icon: IconAnalytics, role: 'super_admin' },
      { label: 'Partners',      href: '/delivery/partners',    icon: IconRider,     role: 'super_admin' },
      { label: 'Assignments',   href: '/delivery/assignments', icon: IconDelivery,  role: 'super_admin' },
      { label: 'Live Tracking', href: '/delivery/tracking',    icon: IconTracking,  role: 'super_admin' },
      { label: 'Support',       href: '/delivery/support',     icon: IconSupport,   role: 'super_admin' },
      { label: 'Payouts',       href: '/delivery/payouts',     icon: IconPayout,    role: 'super_admin' },
    ],
  },
];

// ── Inner ─────────────────────────────────────────────────────────────────────

interface SidebarInnerProps {
  userRole: string | null; roleLabel: string; email: string | null;
  displayName: string | null; initials: string; pathname: string;
  onLogout: () => void; onLinkClick?: () => void;
}

function SidebarInner({ userRole, roleLabel, email, displayName, initials, pathname, onLogout, onLinkClick }: SidebarInnerProps) {
  return (
    <div className="flex h-full flex-col">

      {/* Logo */}
      <div className="mb-1 px-2 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#1E1710] border border-[var(--sb-bdr)] p-1.5">
            <Image src="/foodeez-sidebar-logo.png" alt="Foodeez" width={28} height={28} className="h-full w-full object-contain" />
          </div>
          <div>
            <p className="text-[14px] font-bold leading-none tracking-tight text-[var(--sb-tx)]">Foodeez</p>
            <p className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-[var(--sb-tx2)]">Admin Console</p>
          </div>
        </div>
        {/* Gold accent line */}
        <div className="mt-4 h-px bg-gradient-to-r from-[var(--accent)] via-[var(--accent-bright)] to-transparent opacity-40" />
      </div>

      {/* Nav */}
      <nav className="flex-1 min-h-0 overflow-y-auto space-y-5 px-2 py-2 pr-1" style={{ scrollbarWidth: 'none' }}>
        {navSections.map((section) => (
          <div key={section.title}>
            <p className="mb-1.5 px-2 text-[9px] font-bold uppercase tracking-[0.22em] text-[var(--sb-tx2)]">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.links
                .filter((item) => !item.role || item.role === userRole)
                .map((item) => {
                  const Ico = item.icon;
                  const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href + '/'));
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onLinkClick}
                      className={`group flex items-center justify-between rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all no-underline ${
                        isActive
                          ? 'bg-[var(--sb-active)] text-[var(--accent)]'
                          : 'text-[var(--sb-tx2)] hover:bg-[var(--sb-hover)] hover:text-[var(--sb-tx)]'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <span className={`transition-colors ${isActive ? 'text-[var(--accent)]' : 'text-[var(--sb-tx2)] group-hover:text-[var(--sb-tx)]'}`}>
                          <Ico />
                        </span>
                        {item.label}
                      </span>
                      {isActive && <span className="h-1 w-1 rounded-full bg-[var(--accent)]" />}
                    </Link>
                  );
                })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom separator */}
      <div className="mx-2 my-2 h-px bg-[var(--sb-bdr)]" />

      {/* User */}
      <div className="px-2 pb-2">
        <div className="flex items-center gap-2.5 rounded-lg bg-[var(--sb-2)] px-2.5 py-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-semibold text-[var(--sb-tx)]">{displayName || roleLabel}</p>
            <p className="truncate text-[10px] text-[var(--sb-tx2)]">{email ?? roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium text-[var(--sb-tx2)] transition hover:bg-rose-500/10 hover:text-rose-400"
        >
          <IconLogout />
          Sign out
        </button>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface SideBarProps { mobileOpen?: boolean; onClose?: () => void; }

export default function SideBar({ mobileOpen = false, onClose }: SideBarProps) {
  const pathname = usePathname() ?? '/dashboard';
  const router   = useRouter();
  const [userRole,     setUserRole]     = useState<string | null>(null);
  const [email,        setEmail]        = useState<string | null>(null);
  const [displayName,  setDisplayName]  = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
    setEmail(getUserEmail());
    setDisplayName(getUserDisplayName());
  }, [pathname]);

  const roleLabel = ROLE_LABELS[userRole ?? 'super_admin'] ?? 'Admin';
  const name      = displayName || roleLabel;
  const initials  = name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  const handleLogout = () => { clearToken(); router.push('/auth/login'); };

  const innerProps: SidebarInnerProps = { userRole, roleLabel, email, displayName, initials, pathname, onLogout: handleLogout };

  return (
    <>
      {/* Desktop */}
      <aside className="hidden h-full min-h-0 w-56 shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--sb-bdr)] bg-[var(--sb-bg)] shadow-card lg:flex lg:sticky lg:top-0 lg:self-start">
        <SidebarInner {...innerProps} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/60 lg:hidden" onClick={onClose} aria-hidden="true" />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-56 flex-col overflow-hidden bg-[var(--sb-bg)] shadow-xl lg:hidden">
            <SidebarInner {...innerProps} onLinkClick={onClose} />
          </aside>
        </>
      )}
    </>
  );
}