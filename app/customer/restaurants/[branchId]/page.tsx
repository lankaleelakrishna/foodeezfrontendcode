'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { customerDiscoveryApi, customerCartApi, AddToCartPayload } from '../../../../lib/api';
import { getCustomerToken } from '../../../../lib/customer-auth';

type Addon = { id: string; name: string; price: number; isRequired: boolean };
type PricingRule = {
  id: string;
  ruleType: 'DISCOUNT' | 'PRICE_OVERRIDE' | 'TIME_BASED';
  valueType: 'PERCENTAGE' | 'FLAT';
  value: number;
  title?: string;
  startsAt?: string;
  endsAt?: string;
};

type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price: number;
  isVeg?: boolean;
  imageUrl?: string;
  addons?: Addon[];
  pricingRules?: PricingRule[];
  pricingRule?: PricingRule;
  pricing_rules?: PricingRule[];
  pricing_rule?: PricingRule;
  discount?: {
    valueType: 'PERCENTAGE' | 'FLAT';
    value: number;
    title?: string;
    startsAt?: string;
    endsAt?: string;
  };
};
type Category = { id: string; name: string; displayName: string; items: MenuItem[] };
type RestaurantInfo = { name: string; cuisine?: string; rating?: number; deliveryTime?: number; deliveryFee?: number; imageUrl?: string };

export default function RestaurantMenuPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<RestaurantInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addingItem, setAddingItem] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    // Only validate if branchId is available (not during initial render)
    if (!branchId) {
      setLoading(false);
      return;
    }

    // If branchId is 'undefined' string, show error
    if (branchId === 'undefined') {
      setError('Invalid restaurant ID. Please select a restaurant from the discovery page.');
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const [detailRes, menuRes] = await Promise.all([
          customerDiscoveryApi.restaurantDetails(branchId),
          customerDiscoveryApi.menu(branchId),
        ]);
        
        // Normalize the response
        const restaurantInfo = detailRes.data;
        const menuData = menuRes.data;
        const rawCategories = Array.isArray(menuData?.categories) ? menuData.categories : Array.isArray(menuData) ? menuData : [];
        const normalizedCategories = rawCategories.map((cat: any) => ({
          ...cat,
          items: (Array.isArray(cat.items) ? cat.items : []).map((item: any) => ({
            ...item,
            pricingRules: item.pricingRules ?? item.pricing_rules ?? [],
            pricing_rules: item.pricingRules ?? item.pricing_rules ?? [],
            discount: item.discount,
            price: Number(item.price),
          })),
        }));
        setInfo(restaurantInfo);
        setCategories(normalizedCategories);
        setError('');
      } catch (err: any) {
        const errorMsg = err?.response?.data?.message || 'Failed to load restaurant details. Please try again.';
        setError(errorMsg);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [branchId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const normalizeDiscountRule = (raw: any): PricingRule => ({
    id: raw.id ?? raw.ruleId ?? raw.rule_id ?? `${raw.value}-${raw.valueType}`,
    ruleType: (String(raw.ruleType ?? raw.rule_type ?? raw.type ?? 'DISCOUNT')).toUpperCase() as PricingRule['ruleType'],
    valueType: (String(raw.valueType ?? raw.value_type ?? raw.valueType ?? 'PERCENTAGE')).toUpperCase() as PricingRule['valueType'],
    value: Number(raw.value ?? raw.amount ?? 0),
    title: raw.title ?? raw.name,
    startsAt: raw.startsAt ?? raw.starts_at,
    endsAt: raw.endsAt ?? raw.ends_at,
  });

  const getItemPricingRules = (item: MenuItem) => {
    const rules = [] as any[];
    if (item.pricingRules) rules.push(...(Array.isArray(item.pricingRules) ? item.pricingRules : [item.pricingRules]));
    if (item.pricing_rules) rules.push(...(Array.isArray(item.pricing_rules) ? item.pricing_rules : [item.pricing_rules]));
    if (item.pricingRule) rules.push(item.pricingRule);
    if (item.pricing_rule) rules.push(item.pricing_rule);
    if (item.discount && Number(item.discount.value) > 0) {
      rules.push({
        ruleType: 'DISCOUNT',
        valueType: item.discount.valueType,
        value: item.discount.value,
        title: item.discount.title,
        startsAt: item.discount.startsAt,
        endsAt: item.discount.endsAt,
      });
    }
    return rules.map(normalizeDiscountRule);
  };

  const isRuleActive = (rule: PricingRule) => {
    const now = new Date();
    if (rule.startsAt && new Date(rule.startsAt) > now) return false;
    if (rule.endsAt && new Date(rule.endsAt) < now) return false;
    return true;
  };

  const getActiveDiscountRule = (item: MenuItem) => {
    return getItemPricingRules(item)
      .filter((rule) => rule.ruleType === 'DISCOUNT' && isRuleActive(rule))
      .sort((a, b) => {
        const discountA = a.valueType === 'PERCENTAGE' ? a.value : Math.min(a.value, item.price);
        const discountB = b.valueType === 'PERCENTAGE' ? b.value : Math.min(b.value, item.price);
        return discountB - discountA;
      })[0];
  };

  const getDiscountedPrice = (item: MenuItem) => {
    const rule = getActiveDiscountRule(item);
    if (!rule) return item.price;
    if (rule.valueType === 'PERCENTAGE') {
      return Math.max(0, Number((item.price * (1 - rule.value / 100)).toFixed(2)));
    }
    return Math.max(0, Number((item.price - rule.value).toFixed(2)));
  };

  const getDiscountLabel = (item: MenuItem) => {
    const rule = getActiveDiscountRule(item);
    if (!rule) return null;
    if (rule.valueType === 'PERCENTAGE') {
      return `${rule.value}% OFF`;
    }
    return `₹${rule.value} OFF`;
  };

  const handleAddToCart = async (item: MenuItem) => {
    if (!getCustomerToken()) {
      router.push('/customer/auth/login');
      return;
    }
    setAddingItem(item.id);
    const payload: AddToCartPayload = {
      menuItemId: String(item.id),
      branchId: branchId ? String(branchId) : undefined,
      quantity: 1,
    };
    try {
      await customerCartApi.addItem(payload);
      showToast(`${item.name} added to cart`);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Failed to add item';
      showToast(msg);
    } finally {
      setAddingItem(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-40 animate-pulse rounded-[2rem] bg-slate-200" />
        {[...Array(3)].map((_, i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-200" />)}
      </div>
    );
  }

  if (error) {
    return <p className="py-16 text-center text-sm text-red-500">{error}</p>;
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Restaurant hero */}
      {info && (
        <div className="mb-6 overflow-hidden rounded-[2rem] border border-slate-200/60 bg-white shadow-sm">
          {info.imageUrl && (
            <img src={info.imageUrl} alt={info.name} className="h-44 w-full object-cover" />
          )}
          <div className="p-5">
            <h1 className="text-2xl font-bold text-slate-950">{info.name}</h1>
            {info.cuisine && <p className="mt-1 text-sm text-slate-500">{info.cuisine}</p>}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-600">
              {info.rating != null && (
                <span className="flex items-center gap-1 rounded-full bg-green-50 px-3 py-1 font-semibold text-green-700">
                  ★ {info.rating.toFixed(1)}
                </span>
              )}
              {info.deliveryTime != null && <span className="rounded-full bg-slate-100 px-3 py-1">{info.deliveryTime} min</span>}
              {info.deliveryFee != null && (
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {info.deliveryFee === 0 ? 'Free delivery' : `₹${info.deliveryFee} delivery`}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      {categories.length === 0 ? (
        <p className="py-12 text-center text-sm text-slate-400">Menu not available.</p>
      ) : (
        <div className="space-y-8">
          {categories.map((cat) => (
            <section key={cat.id}>
              <h2 className="mb-3 text-base font-bold uppercase tracking-wide text-slate-700">{cat.displayName || cat.name}</h2>
              <div className="space-y-3">
                {cat.items.map((item) => (
                  <div key={item.id}
                    className="flex items-center gap-4 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm">
                    {item.imageUrl && (
                      <img src={item.imageUrl} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.isVeg != null && (
                          <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 text-[8px] ${item.isVeg ? 'border-green-600 text-green-600' : 'border-red-600 text-red-600'}`}>
                            {item.isVeg ? '●' : '●'}
                          </span>
                        )}
                        <p className="font-semibold text-slate-900">{item.name}</p>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{item.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3">
                        <p className="font-bold text-[#B88A2E]">₹{getDiscountedPrice(item)}</p>
                        {getActiveDiscountRule(item) && (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {getDiscountLabel(item)}
                          </span>
                        )}
                      </div>
                      {getActiveDiscountRule(item) && (
                        <p className="mt-1 text-xs text-slate-400 line-through">₹{item.price}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={addingItem === item.id}
                      className="shrink-0 rounded-xl bg-[#B88A2E] px-4 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110 disabled:opacity-60"
                    >
                      {addingItem === item.id ? '…' : '+ Add'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}