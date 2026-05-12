'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, getUserRole } from '../../lib/auth';

interface Props {
  children: React.ReactNode;
  requiredRoles?: string[];
}

export default function AuthGuard({ children, requiredRoles }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace('/auth/login');
      return;
    }
    if (requiredRoles) {
      const role = getUserRole();
      if (!role || !requiredRoles.includes(role)) {
        router.replace('/dashboard');
        return;
      }
    }
    setReady(true);
  }, [router, requiredRoles]);

  if (!ready) return null;
  return <>{children}</>;
}
