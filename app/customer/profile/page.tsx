'use client';

import { useEffect, useState } from 'react';
import { customerProfileApi, CreateAddressPayload } from '../../../lib/api';

type Profile = { name?: string; email?: string; phone?: string; dateOfBirth?: string; gender?: string };
type Address = { id: string; label: string; addressLine1: string; addressLine2?: string; city: string; state: string; pincode: string; isDefault?: boolean };
type Tab = 'profile' | 'addresses' | 'favorites';

const EMPTY_ADDR: CreateAddressPayload = {
  label: '', addressLine1: '', city: '', state: '', pincode: '', latitude: 0, longitude: 0, isDefault: false,
};

export default function ProfilePage() {
  const [tab, setTab] = useState<Tab>('profile');
  const [profile, setProfile] = useState<Profile>({});
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [favRestaurants, setFavRestaurants] = useState<any[]>([]);
  const [favItems, setFavItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddAddr, setShowAddAddr] = useState(false);
  const [newAddr, setNewAddr] = useState<CreateAddressPayload>(EMPTY_ADDR);
  const [addingAddr, setAddingAddr] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [profileRes, addrRes, favRestRes, favItemRes] = await Promise.allSettled([
          customerProfileApi.get(),
          customerProfileApi.getAddresses(),
          customerProfileApi.getFavRestaurants(),
          customerProfileApi.getFavItems(),
        ]);
        if (profileRes.status === 'fulfilled') setProfile(profileRes.value.data?.customer ?? profileRes.value.data ?? {});
        if (addrRes.status === 'fulfilled') setAddresses(addrRes.value.data?.addresses ?? addrRes.value.data ?? []);
        if (favRestRes.status === 'fulfilled') setFavRestaurants(favRestRes.value.data?.restaurants ?? favRestRes.value.data ?? []);
        if (favItemRes.status === 'fulfilled') setFavItems(favItemRes.value.data?.items ?? favItemRes.value.data ?? []);
      } catch { /* handled per-request */ } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await customerProfileApi.update({ name: profile.name, email: profile.email, dateOfBirth: profile.dateOfBirth, gender: profile.gender as any });
      setSuccess('Profile updated.');
    } catch {
      setError('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAddr(true);
    setError('');
    try {
      const res = await customerProfileApi.addAddress(newAddr);
      setAddresses((prev) => [...prev, res.data?.address ?? res.data]);
      setShowAddAddr(false);
      setNewAddr(EMPTY_ADDR);
    } catch {
      setError('Failed to add address.');
    } finally {
      setAddingAddr(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await customerProfileApi.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch { setError('Failed to delete address.'); }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await customerProfileApi.setDefaultAddress(id);
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === id })));
    } catch { setError('Failed to set default.'); }
  };

  const handleRemoveFavRestaurant = async (restaurantId: string) => {
    try {
      await customerProfileApi.removeFavRestaurant(restaurantId);
      setFavRestaurants((prev) => prev.filter((r) => (r.id ?? r.restaurantId) !== restaurantId));
    } catch { setError('Failed to remove favourite.'); }
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: 'profile', label: 'Profile' },
    { key: 'addresses', label: 'Addresses' },
    { key: 'favorites', label: 'Favourites' },
  ];

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading…</div>;

  return (
    <div>
      <h1 className="mb-5 text-2xl font-bold text-slate-950">My account</h1>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-2xl border border-slate-200/60 bg-white p-1.5 shadow-sm">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${tab === t.key ? 'bg-[#B88A2E] text-slate-950' : 'text-slate-600 hover:bg-slate-100'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      {success && <div className="mb-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">{success}</div>}

      {/* Profile tab */}
      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-4 rounded-[1.5rem] border border-slate-200/60 bg-white p-6">
          {(['name', 'email'] as const).map((field) => (
            <div key={field}>
              <label className="block text-sm font-medium capitalize text-slate-700">{field}</label>
              <input type={field === 'email' ? 'email' : 'text'} value={(profile as any)[field] ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, [field]: e.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium text-slate-700">Date of birth</label>
            <input type="date" value={profile.dateOfBirth ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Gender</label>
            <select value={profile.gender ?? ''}
              onChange={(e) => setProfile((p) => ({ ...p, gender: e.target.value }))}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200">
              <option value="">Prefer not to say</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="O">Other</option>
            </select>
          </div>
          <button type="submit" disabled={saving}
            className="w-full rounded-2xl bg-[#B88A2E] py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </form>
      )}

      {/* Addresses tab */}
      {tab === 'addresses' && (
        <div className="space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className={`flex items-start justify-between gap-4 rounded-2xl border p-4 ${addr.isDefault ? 'border-[#B88A2E] bg-amber-50' : 'border-slate-200/60 bg-white'}`}>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{addr.label}</p>
                  {addr.isDefault && <span className="rounded-full bg-[#B88A2E]/20 px-2 py-0.5 text-xs font-semibold text-[#B88A2E]">Default</span>}
                </div>
                <p className="mt-0.5 text-sm text-slate-500">{addr.addressLine1}, {addr.city}, {addr.state} — {addr.pincode}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {!addr.isDefault && (
                  <button onClick={() => handleSetDefault(addr.id)}
                    className="rounded-xl border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50">
                    Set default
                  </button>
                )}
                <button onClick={() => handleDeleteAddress(addr.id)}
                  className="rounded-xl border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100">
                  Delete
                </button>
              </div>
            </div>
          ))}

          {showAddAddr ? (
            <form onSubmit={handleAddAddress} className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5 space-y-3">
              <p className="font-bold text-slate-900">New address</p>
              {(['label', 'addressLine1', 'addressLine2', 'city', 'state', 'pincode', 'landmark'] as const).map((f) => (
                <div key={f}>
                  <label className="block text-xs font-medium capitalize text-slate-600">{f.replace(/([A-Z])/g, ' $1')}</label>
                  <input type="text" value={(newAddr as any)[f] ?? ''}
                    required={!['addressLine2', 'landmark'].includes(f)}
                    onChange={(e) => setNewAddr((a) => ({ ...a, [f]: e.target.value }))}
                    className="mt-1 w-full rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-amber-400" />
                </div>
              ))}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={newAddr.isDefault ?? false}
                  onChange={(e) => setNewAddr((a) => ({ ...a, isDefault: e.target.checked }))} />
                Set as default
              </label>
              <div className="flex gap-3">
                <button type="submit" disabled={addingAddr}
                  className="rounded-2xl bg-[#B88A2E] px-5 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60">
                  {addingAddr ? 'Saving…' : 'Save address'}
                </button>
                <button type="button" onClick={() => { setShowAddAddr(false); setNewAddr(EMPTY_ADDR); }}
                  className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button onClick={() => setShowAddAddr(true)}
              className="w-full rounded-2xl border-2 border-dashed border-slate-300 py-4 text-sm font-semibold text-slate-500 transition hover:border-[#B88A2E] hover:text-[#B88A2E]">
              + Add new address
            </button>
          )}
        </div>
      )}

      {/* Favourites tab */}
      {tab === 'favorites' && (
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-bold text-slate-900">Favourite restaurants</h2>
            {favRestaurants.length === 0 ? (
              <p className="text-sm text-slate-400">No favourite restaurants yet.</p>
            ) : (
              <div className="space-y-3">
                {favRestaurants.map((r) => (
                  <div key={r.id ?? r.restaurantId}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white p-4">
                    <p className="font-medium text-slate-900">{r.name}</p>
                    <button onClick={() => handleRemoveFavRestaurant(r.id ?? r.restaurantId)}
                      className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100">
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-bold text-slate-900">Favourite dishes</h2>
            {favItems.length === 0 ? (
              <p className="text-sm text-slate-400">No favourite dishes yet.</p>
            ) : (
              <div className="space-y-3">
                {favItems.map((item) => (
                  <div key={item.id ?? item.menuItemId}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white p-4">
                    <div>
                      <p className="font-medium text-slate-900">{item.name}</p>
                      {item.price != null && <p className="text-sm text-slate-500">₹{item.price}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
