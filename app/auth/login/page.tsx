'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { login } from '../../../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err) {
      setError('Invalid credentials or network error');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f7f2ea] px-4 text-slate-900">
      <div className="w-full max-w-sm rounded-[2rem] border border-slate-200/20 bg-white p-4 shadow-2xl shadow-black/20 flex flex-col justify-center">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-2 flex h-16 w-full max-w-[180px] items-center justify-center overflow-hidden rounded-xl shadow-sm shadow-black/10 bg-white border border-slate-200">
            <img
              src="/foodeez-sidebar-logo.png"
              alt="FooDeeZ logo"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="text-sm uppercase tracking-[0.28em] text-slate-500">Partner Portal</p>
          <p className="mt-2 text-sm text-slate-600">Sign in to your account</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="mt-3 w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-900 outline-none transition focus:border-[#B88A2E] focus:ring-2 focus:ring-[#B88A2E]/20"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button type="submit" className="w-full rounded-3xl bg-[#B88A2E] px-4 py-3 text-base font-semibold text-slate-950 shadow-lg shadow-slate-300/30 transition hover:brightness-110">
            Sign in
          </button>
        </form>

        <div className="mt-3 text-center text-sm text-slate-500">
          <Link href="/auth/request-reset" className="text-[#B88A2E] hover:text-[#B88A2E]/80 hover:underline">
            Forgot password?
          </Link>
        </div>
      </div>
    </main>
  );
}
