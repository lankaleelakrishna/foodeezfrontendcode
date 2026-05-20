'use client';

import { useEffect, useState } from 'react';
import { customerPaymentsApi, PaymentGateway } from '../../../lib/api';
import { getCustomerToken } from '../../../lib/customer-auth';

type Wallet = { balance: number; currency: string };
type Transaction = { id: string; type: string; amount: number; description?: string; createdAt: string; status?: string };

export default function PaymentsPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState('');
  const [topupAmount, setTopupAmount] = useState('');
  const [gateway, setGateway] = useState<PaymentGateway>('razorpay');
  const [initiating, setInitiating] = useState(false);
  const [topupMsg, setTopupMsg] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await customerPaymentsApi.wallet();
      const raw = res.data?.wallet ?? res.data;
      setWallet(raw ? { ...raw, balance: Number(raw.balance ?? 0) } : null);
    } catch { setError('Failed to load wallet.'); }
    finally { setLoading(false); }
  };

  const fetchTransactions = async (p: number) => {
    setTxLoading(true);
    try {
      const res = await customerPaymentsApi.transactions(p, 20);
      const rawData = res.data?.transactions ?? res.data;
      const data: Transaction[] = Array.isArray(rawData) ? rawData : [];

      if (!Array.isArray(rawData)) {
        console.warn('Unexpected transactions response:', rawData);
      }

      setTransactions((prev) => (p === 1 ? data : [...prev, ...data]));
      setHasMore(data.length === 20);
    } catch { /* ignore */ }
    finally { setTxLoading(false); }
  };

  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      setLoading(false);
      setError('Please sign in to view wallet and transactions.');
      return;
    }
    fetchWallet();
    fetchTransactions(1);
  }, []);

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(topupAmount);
    if (!amount || amount < 10) { setTopupMsg('Minimum top-up is ₹10.'); return; }
    setInitiating(true);
    setTopupMsg('');
    try {
      const res = await customerPaymentsApi.topupInitiate(amount, gateway);
      // In a real integration you'd open Razorpay/Stripe checkout here
      setTopupMsg(`Top-up initiated. Order ID: ${res.data?.orderId ?? res.data?.id ?? 'pending'}`);
      setTopupAmount('');
      await fetchWallet();
    } catch (err: any) {
      setTopupMsg(err?.response?.data?.message ?? 'Top-up failed.');
    } finally {
      setInitiating(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTransactions(next);
  };

  const txTypeColor: Record<string, string> = {
    CREDIT: 'text-green-600',
    DEBIT: 'text-red-600',
    REFUND: 'text-blue-600',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-950">Wallet</h1>

      {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      {/* Balance card */}
      {loading ? (
        <div className="h-32 animate-pulse rounded-[2rem] bg-slate-200" />
      ) : wallet ? (
        <div className="rounded-[2rem] bg-gradient-to-br from-[#B88A2E] to-[#8a6520] p-6 text-white shadow-xl">
          <p className="text-sm font-medium opacity-80">Available balance</p>
          <p className="mt-2 text-4xl font-bold">₹{wallet.balance.toFixed(2)}</p>
          <p className="mt-1 text-xs opacity-60">{wallet.currency}</p>
        </div>
      ) : null}

      {/* Top-up form */}
      <div className="rounded-[1.5rem] border border-slate-200/60 bg-white p-5">
        <p className="mb-4 font-bold text-slate-900">Add money to wallet</p>
        <form onSubmit={handleTopup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Amount (₹)</label>
            <input type="number" min={10} value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              placeholder="Enter amount (min ₹10)"
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-200" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Payment gateway</label>
            <div className="mt-2 flex gap-3">
              {(['razorpay', 'stripe'] as PaymentGateway[]).map((g) => (
                <label key={g}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium capitalize transition ${gateway === g ? 'border-[#B88A2E] bg-amber-50 text-slate-900' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
                  <input type="radio" name="gateway" value={g} checked={gateway === g}
                    onChange={() => setGateway(g)} className="sr-only" />
                  {g}
                </label>
              ))}
            </div>
          </div>
          {topupMsg && (
            <p className={`text-sm ${topupMsg.includes('failed') || topupMsg.includes('Minimum') ? 'text-red-500' : 'text-green-600'}`}>
              {topupMsg}
            </p>
          )}
          <button type="submit" disabled={initiating}
            className="w-full rounded-2xl bg-[#B88A2E] py-3 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60">
            {initiating ? 'Initiating…' : 'Add money'}
          </button>
        </form>
      </div>

      {/* Transaction history */}
      <div>
        <h2 className="mb-3 font-bold text-slate-900">Transaction history</h2>
        {transactions.length === 0 && !txLoading ? (
          <p className="text-sm text-slate-400">No transactions yet.</p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div key={tx.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/60 bg-white p-4">
                <div>
                  <p className="font-medium text-slate-900">{tx.description ?? tx.type}</p>
                  <p className="text-xs text-slate-400">{new Date(tx.createdAt).toLocaleString()}</p>
                </div>
                <p className={`shrink-0 font-bold ${txTypeColor[tx.type] ?? 'text-slate-700'}`}>
                  {['CREDIT', 'REFUND'].includes(tx.type) ? '+' : '−'}₹{Math.abs(tx.amount)}
                </p>
              </div>
            ))}
            {hasMore && (
              <button onClick={loadMore} disabled={txLoading}
                className="w-full rounded-2xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                {txLoading ? 'Loading…' : 'Load more'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}