'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { customerDiscoveryApi, NearbyParams } from '../../../lib/api';

type Restaurant = {
  id?: string;
  branchId?: string;
  name: string;
  cuisine?: string;
  rating?: number;
  deliveryTime?: number;
  deliveryFee?: number;
  imageUrl?: string;
  isVeg?: boolean;
  distance?: number;
  isOnline?: boolean;
  status?: string;
  branchStatus?: string;
};

const isRestaurantOnline = (restaurant: any) => {
  if (typeof restaurant.isOnline === 'boolean') return restaurant.isOnline;
  if (typeof restaurant.is_online === 'boolean') return restaurant.is_online;

  const status = String(restaurant.status ?? restaurant.branchStatus ?? restaurant.branch_status ?? '')
    .trim()
    .toLowerCase();

  if (!status) return true;
  return ['online', 'open', 'active', 'available', 'serving'].includes(status);
};

export default function DiscoveryPage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser.');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocationError('Location access denied. Using default location.'),
    );
  }, []);

  const normalizeRestaurant = (item: any) => {
    // Ensure branchId is always set and is a valid string
    const id = item.id?.trim();
    const branchId = (item.branchId || item.id)?.trim();
    
    return {
      ...item,
      id: id,
      branchId: branchId,
      isOnline: item.isOnline ?? item.is_online,
      status: item.status ?? item.branchStatus ?? item.branch_status,
      branchStatus: item.branchStatus ?? item.branch_status,
    };
  };

  const fetchNearby = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError('');
    try {
      const params: NearbyParams = { lat, lng, radius: 10, limit: 20 };
      const res = await customerDiscoveryApi.nearby(params);
      let data: any = res.data?.data ?? res.data?.restaurants ?? res.data;
      if (!Array.isArray(data) && data?.data) data = data.data;
      
      // Filter and normalize the restaurants
      const validRestaurants = Array.isArray(data)
        ? data
            .map(normalizeRestaurant)
            .filter((r) =>
              r.branchId && r.branchId !== 'undefined' && r.branchId.length > 0 && isRestaurantOnline(r),
            )
        : [];
      
      setRestaurants(validRestaurants);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Failed to load nearby restaurants.';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (coords) fetchNearby(coords.lat, coords.lng);
    else if (locationError) {
      // fallback coords — Hyderabad city center
      fetchNearby(17.385, 78.4867);
    }
  }, [coords, locationError, fetchNearby]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.trim().length < 2) return;
    setSearching(true);
    setError('');
    const { lat, lng } = coords ?? { lat: 17.385, lng: 78.4867 };
    try {
      const res = await customerDiscoveryApi.search(query, lat, lng);
      let data: any = res.data?.data ?? res.data?.restaurants ?? res.data;
      if (!Array.isArray(data) && data?.data) data = data.data;
      
      const validRestaurants = Array.isArray(data)
        ? data
            .map(normalizeRestaurant)
            .filter((r) =>
              r.branchId && r.branchId !== 'undefined' && r.branchId.length > 0 && isRestaurantOnline(r),
            )
        : [];
      
      setRestaurants(validRestaurants);
    } catch (err: any) {
      const errorMsg = err?.response?.data?.message || 'Search failed.';
      setError(errorMsg);
    } finally {
      setSearching(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    if (coords) fetchNearby(coords.lat, coords.lng);
    else fetchNearby(17.385, 78.4867);
  };

  return (
    <div>
      {/* Search bar */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search restaurants or dishes…"
          className="flex-1 rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-200"
        />
        {query && (
          <button type="button" onClick={clearSearch}
            className="rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Clear
          </button>
        )}
        <button type="submit" disabled={searching}
          className="rounded-3xl bg-[#B88A2E] px-5 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60">
          {searching ? '…' : 'Search'}
        </button>
      </form>

      {locationError && (
        <p className="mb-4 text-xs text-slate-500">{locationError}</p>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <h2 className="mb-4 text-lg font-bold text-slate-900">
        {query ? `Results for "${query}"` : 'Nearby restaurants'}
      </h2>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-[1.5rem] bg-slate-200" />
          ))}
        </div>
      ) : restaurants.length === 0 ? (
        <p className="py-16 text-center text-sm text-slate-400">No restaurants found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {restaurants
            .filter((r) => r.branchId || r.id)
            .map((r) => {
              const restaurantId = r.branchId ?? r.id;
              return (
                <Link key={restaurantId} href={`/customer/restaurants/${restaurantId}`}
                  className="group flex gap-4 rounded-[1.5rem] border border-slate-200/60 bg-white p-4 shadow-sm transition hover:shadow-md">
                {r.imageUrl ? (
                  <img src={r.imageUrl} alt={r.name}
                    className="h-20 w-24 shrink-0 rounded-xl object-cover" />
                ) : (
                  <div className="flex h-20 w-24 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-2xl">
                    🍽️
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-900 group-hover:text-[#B88A2E]">{r.name}</p>
                  {r.cuisine && <p className="mt-0.5 truncate text-xs text-slate-500">{r.cuisine}</p>}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600">
                    {r.rating != null && (
                      <span className="flex items-center gap-0.5 rounded-full bg-green-50 px-2 py-0.5 font-medium text-green-700">
                        ★ {r.rating.toFixed(1)}
                      </span>
                    )}
                    {r.deliveryTime != null && <span>{r.deliveryTime} min</span>}
                    {r.deliveryFee != null && (
                      <span>{r.deliveryFee === 0 ? 'Free delivery' : `₹${r.deliveryFee} delivery`}</span>
                    )}
                    {r.distance != null && <span>{r.distance.toFixed(1)} km</span>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
