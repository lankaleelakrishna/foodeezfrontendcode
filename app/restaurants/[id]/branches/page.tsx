'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../../lib/api';
import { getUserRole } from '../../../../lib/auth';
import AuthGuard from '../../../components/AuthGuard';

type Branch = {
  id: string; name: string; address: string; city: string;
  isOnline: boolean; busyMode: boolean; temporaryClosure: boolean;
};

function SkeletonCard() {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 rounded-full bg-slate-200" />
          <div className="h-4 w-56 rounded-full bg-slate-100" />
        </div>
        <div className="h-8 w-20 rounded-2xl bg-slate-200" />
      </div>
    </div>
  );
}

import { useParams } from 'next/navigation';

export default function BranchesPage() {
  const router = useRouter();
  const params = useParams();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setUserRole(getUserRole());
    api.get(`/restaurants/${params.id}/branches`)
      .then((r) => setBranches(r.data))
      .catch(() => setError('Unable to load branches.'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const canWrite = userRole === 'restaurant_admin' || userRole === 'restaurant_owner' ||
    userRole === 'restaurant_manager' || userRole === 'sales_operator' || userRole === 'super_admin';

  return (
    <AuthGuard>
      <div className="space-y-6">

          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Branches</h1>
                <p className="mt-2 text-slate-600">Manage outlets for this restaurant.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => router.back()}
                  className="rounded-2xl border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition">
                  Back
                </button>
                {canWrite && (
                  <button
                    onClick={() => router.push(`/restaurants/${params.id}/branches/new`)}
                    className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 transition">
                    Add branch
                  </button>
                )}
              </div>
            </div>
          </div>

          {error && <div className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</div>}

          <div className="grid gap-4">
            {loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : branches.length === 0 ? (
              <div className="rounded-3xl bg-white p-10 text-center shadow-sm">
                <p className="text-slate-500">No branches configured yet.</p>
                {canWrite && (
                  <button
                    onClick={() => router.push(`/restaurants/${params.id}/branches/new`)}
                    className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white hover:bg-slate-700 transition">
                    Add first branch
                  </button>
                )}
              </div>
            ) : (
              branches.map((branch) => (
                <div key={branch.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold">{branch.name}</h2>
                      <p className="mt-1 text-sm text-slate-500">{branch.address}, {branch.city}</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className={`rounded-full px-3 py-0.5 text-xs font-medium ${branch.isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                          {branch.isOnline ? 'Online' : 'Offline'}
                        </span>
                        {branch.busyMode && (
                          <span className="rounded-full bg-[#B88A2E]/10 px-3 py-0.5 text-xs font-medium text-[#B88A2E]">Busy mode</span>
                        )}
                        {branch.temporaryClosure && (
                          <span className="rounded-full bg-rose-100 px-3 py-0.5 text-xs font-medium text-rose-700">Temporarily closed</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/restaurants/${params.id}/branches/${branch.id}/menu`)}
                      className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
                      Manage menu
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

      </div>
    </AuthGuard>
  );
}
