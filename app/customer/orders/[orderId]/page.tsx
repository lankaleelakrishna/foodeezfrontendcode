'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { customerOrdersApi } from '../../../../lib/api';

type OrderItem = { name: string; quantity: number; price: number; subtotal: number };
type StatusHistory = { status: string; timestamp: string };
type Order = {
  id: string; orderNumber: string; status: string; grandTotal: number;
  subtotal: number; deliveryFee: number; taxAmount: number;
  specialInstructions?: string; createdAt: string;
  items: OrderItem[];
  statusHistory?: StatusHistory[];
  deliveryAddress?: { label: string; addressLine1: string; city: string };
  restaurantName?: string;
};

const STATUS_STEPS = ['PLACED', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'ON_THE_WAY', 'DELIVERED'];

export default function OrderDetailPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancel, setShowCancel] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await customerOrdersApi.get(orderId);
        setOrder(res.data);
      } catch {
        setError('Failed to load order details.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [orderId]);

  const handleReorder = async () => {
    try {
      await customerOrdersApi.reorder(orderId);
      router.push('/customer/cart');
    } catch { setError('Failed to reorder.'); }
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length < 5) { setError('Please provide a reason (min 5 chars).'); return; }
    setCancelling(true);
    try {
      await customerOrdersApi.cancel(orderId, { reason: cancelReason });
      const res = await customerOrdersApi.get(orderId);
      setOrder(res.data);
      setShowCancel(false);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Cannot cancel this order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <div className="py-16 text-center text-sm text-slate-400">Loading order…</div>;
  if (error && !order) return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  if (!order) return null;

  const currentStep = STATUS_STEPS.indexOf(order.status);
  const isCancellable = ['PLACED', 'CONFIRMED'].includes(order.status);
  const isDelivered = order.status === 'DELIVERED';

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">← Back</button>
        <h1 className="text-xl font-bold text-slate-950">Order #{order.orderNumber}</h1>
      </div>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Status tracker */}
      {order.status !== 'CANCELLED' && (
        <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
          <p className="mb-4 font-bold text-slate-900">Order status</p>
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {STATUS_STEPS.map((step, i) => (
              <div key={step} className="flex shrink-0 items-center">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i <= currentStep ? 'bg-[#B88A2E] text-slate-950' : 'bg-slate-200 text-slate-400'
                }`}>
                  {i < currentStep ? '✓' : i + 1}
                </div>
                {i < STATUS_STEPS.length - 1 && (
                  <div className={`h-0.5 w-6 ${i < currentStep ? 'bg-[#B88A2E]' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="mt-3 text-sm font-semibold text-slate-700">
            {order.status.replace(/_/g, ' ')}
          </p>
        </div>
      )}

      {/* Items */}
      <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
        <p className="mb-3 font-bold text-slate-900">
          {order.restaurantName ?? 'Order items'}
        </p>
        <div className="space-y-2">
          {order.items.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-slate-700">{item.name} × {item.quantity}</span>
              <span className="font-medium text-slate-900">₹{item.subtotal}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3 text-sm text-slate-600">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
          <div className="flex justify-between"><span>Delivery</span><span>{order.deliveryFee === 0 ? 'Free' : `₹${order.deliveryFee}`}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>₹{order.taxAmount}</span></div>
          <div className="flex justify-between font-bold text-slate-900 border-t border-slate-100 pt-2 mt-2">
            <span>Total</span><span>₹{order.grandTotal}</span>
          </div>
        </div>
      </div>

      {/* Delivery address */}
      {order.deliveryAddress && (
        <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
          <p className="mb-2 font-bold text-slate-900">Delivery to</p>
          <p className="text-sm font-medium text-slate-700">{order.deliveryAddress.label}</p>
          <p className="text-sm text-slate-500">{order.deliveryAddress.addressLine1}, {order.deliveryAddress.city}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {isDelivered && (
          <>
            <button onClick={handleReorder}
              className="rounded-2xl bg-[#B88A2E] px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:brightness-110">
              Reorder
            </button>
            <Link href={`/customer/reviews/new/${orderId}`}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Leave a review
            </Link>
          </>
        )}
        {isCancellable && !showCancel && (
          <button onClick={() => setShowCancel(true)}
            className="rounded-2xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100">
            Cancel order
          </button>
        )}
      </div>

      {/* Cancel form */}
      {showCancel && (
        <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5">
          <p className="mb-3 font-bold text-red-700">Cancel order</p>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation (min 5 characters)…"
            rows={3}
            className="w-full rounded-2xl border border-red-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
          />
          <div className="mt-3 flex gap-3">
            <button onClick={handleCancel} disabled={cancelling}
              className="rounded-2xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60">
              {cancelling ? 'Cancelling…' : 'Confirm cancel'}
            </button>
            <button onClick={() => setShowCancel(false)}
              className="rounded-2xl border border-slate-300 bg-white px-5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Go back
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
