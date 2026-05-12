'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import SideBar from './SideBar';
import TopHeader from './TopHeader';

export default function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? '';
  const isAuthRoute = pathname.startsWith('/auth');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <TopHeader onMenuClick={() => setMobileMenuOpen(true)} />
      <div className="mx-auto flex w-full max-w-[1600px] min-h-0 flex-1 gap-2.5 px-2.5 py-2.5">
        <SideBar mobileOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />
        <main className="min-w-0 flex-1 overflow-y-auto pb-4">
          {children}
        </main>
      </div>
    </div>
  );
}
