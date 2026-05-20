'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { clearCustomerTokens, getCustomerName } from '../../lib/customer-auth';
import { customerAuthApi } from '../../lib/api';

const navLinks = [
  { href: '/customer/discovery', label: 'Explore' },
  { href: '/customer/cart', label: 'Cart' },
  { href: '/customer/orders', label: 'Orders' },
  { href: '/customer/payments', label: 'Wallet' },
  { href: '/customer/profile', label: 'Profile' },
  { href: '/customer/support', label: 'Support' },
];

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const router = useRouter();

  const isAuthPage = pathname.startsWith('/customer/auth');

  const handleLogout = async () => {
    try { await customerAuthApi.logout(); } catch { /* ignore */ }
    clearCustomerTokens();
    router.push('/customer/auth/login');
  };

  if (isAuthPage) return <>{children}</>;

  const name = getCustomerName();

  return (
    <div className="flex min-h-screen flex-col bg-[#f7f2ea]">
      {/* Top nav */}
      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link href="/customer/discovery" className="flex items-center gap-2">
            <img src="/foodeez-sidebar-logo.png" alt="FooDeeZ" className="h-8 w-auto object-contain" />
          </Link>

          <nav className="hidden items-center gap-1 sm:flex">
            {navLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-2xl px-3 py-1.5 text-sm font-medium transition ${
                  pathname.startsWith(l.href)
                    ? 'bg-[#B88A2E] text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {name && <span className="hidden text-sm font-medium text-slate-700 sm:block">{name}</span>}
            <button
              onClick={handleLogout}
              className="rounded-2xl border border-slate-300 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Mobile bottom nav */}
        <nav className="flex sm:hidden border-t border-slate-100 bg-white">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-1 flex-col items-center py-2 text-[10px] font-medium transition ${
                pathname.startsWith(l.href) ? 'text-[#B88A2E]' : 'text-slate-500'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
        {children}
      </main>
    </div>
  );
}