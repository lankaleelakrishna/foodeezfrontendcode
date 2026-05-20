'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { api } from '../../../../../lib/api';


export default function CreateBranchPage() {
  const router = useRouter();
  const params = useParams();
  const [form, setForm] = useState({ name: '', address: '', city: '', state: '', zipCode: '', latitude: '', longitude: '', openingTime: '', closingTime: '' });
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const handleChange = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setStatus('Saving branch...');
    try {
      await api.post(`/restaurants/${params.id}/branches`, {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        isOnline: false,
      });
      router.push(`/restaurants/${params.id}/branches`);
    } catch (err) {
      setStatus('');
      setError('Unable to create branch. Check inputs and try again.');
    }
  };

  return (
    <div>
      <div className="rounded-3xl bg-white p-8 shadow-lg">
        <h1 className="text-3xl font-semibold">Add Branch</h1>
        <p className="mt-2 text-slate-600">Create a new outlet for restaurant {params.id}.</p>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Branch name</span>
              <span className="ml-2 text-xs text-slate-400">As per FSSAI</span>
              <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">City</span>
              <input value={form.city} onChange={(e) => handleChange('city', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
          </div>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Address</span>
            <span className="ml-2 text-xs text-slate-400">As per FSSAI</span>
            <input value={form.address} onChange={(e) => handleChange('address', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">State</span>
              <input value={form.state} onChange={(e) => handleChange('state', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Zip code</span>
              <input value={form.zipCode} onChange={(e) => handleChange('zipCode', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Latitude</span>
              <input value={form.latitude} onChange={(e) => handleChange('latitude', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Longitude</span>
              <input value={form.longitude} onChange={(e) => handleChange('longitude', e.target.value)} required className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Opening time</span>
              <input value={form.openingTime} onChange={(e) => handleChange('openingTime', e.target.value)} placeholder="09:00" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Closing time</span>
              <input value={form.closingTime} onChange={(e) => handleChange('closingTime', e.target.value)} placeholder="21:00" className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-slate-900" />
            </label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {status && <p className="text-sm text-slate-600">{status}</p>}
          <button type="submit" className="w-full rounded-2xl bg-slate-900 px-4 py-3 text-white hover:bg-slate-700">
            Save branch
          </button>
        </form>
      </div>
    </div>
  );
}