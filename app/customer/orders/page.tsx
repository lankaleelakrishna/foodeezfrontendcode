'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { customerOrdersApi } from '../../../lib/api';
import { getCustomerToken } from '../../../lib/customer-auth';

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  grandTotal: number;
  createdAt: string;
  itemCount?: number;
  restaurantName?: string;
};

const STATUS_COLOR: Record<string, string> = {
  PLACED: 'bg-blue-50 text-blue-700',
  CONFIRMED: 'bg-indigo-50 text-indigo-700',
  PREPARING: 'bg-amber-50 text-amber-700',
  READY: 'bg-yellow-50 text-yellow-700',
  PICKED_UP: 'bg-orange-50 text-orange-700',
  ON_THE_WAY: 'bg-orange-50 text-orange-700',
  DELIVERED: 'bg-green-50 text-green-700',
  CANCELLED: 'bg-red-50 text-red-600',
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const normalizeOrders = (rawData: any): Order[] => {
    if (Array.isArray(rawData)) return rawData;
    if (Array.isArray(rawData?.orders)) return rawData.orders;
    if (Array.isArray(rawData?.data?.orders)) return rawData.data.orders;
    if (Array.isArray(rawData?.data)) return rawData.data;
    return [];
  };

  const fetchOrders = async (p: number) => {
    setLoading(true);
    try {
      const res = await customerOrdersApi.history(p, 10);
      const data = normalizeOrders(res.data);

      if (res.data && !data.length) {
        console.warn('Unexpected orders response:', res.data);
      }

      setOrders((prev) => (p === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === 10);
    } catch {
      setError('Failed to load orders.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      setLoading(false);
      setError('Please sign in to view orders.');
      return;
    }
    fetchOrders(1);
  }, []);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchOrders(next);
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-slate-950">Your orders</h1>

      {error && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {loading && orders.length === 0 ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}
        </div>
      ) : orders.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-5xl">📦</p>
          <p className="mt-4 text-lg font-semibold text-slate-700">No orders yet</p>
          <Link href="/customer/discovery"
            className="mt-6 inline-block rounded-2xl bg-[#B88A2E] px-6 py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110">
            Start ordering
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <Link key={order.id} href={`/customer/orders/${order.id}`}
              className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm transition hover:shadow-md">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">#{order.orderNumber}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLOR[order.status] ?? 'bg-slate-100 text-slate-600'}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {order.restaurantName && <p className="mt-0.5 truncate text-sm text-slate-500">{order.restaurantName}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{new Date(order.createdAt).toLocaleString()}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-bold text-[#B88A2E]">₹{order.grandTotal}</p>
                {order.itemCount != null && <p className="text-xs text-slate-400">{order.itemCount} items</p>}
              </div>
            </Link>
          ))}

          {hasMore && (
            <button onClick={loadMore} disabled={loading}
              className="w-full rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
              {loading ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}