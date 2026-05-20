'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, menuApi, MenuPricingRuleType, MenuPricingValueType } from '../../../../../../lib/api';
import { getUserRole } from '../../../../../../lib/auth';
import AuthGuard from '../../../../../components/AuthGuard';

// ── Types ─────────────────────────────────────────────────────────────────────

type Category = { id: string; name: string; displayName: string };

type MenuItem = {
  id: string; name: string; description?: string;
  price: number; currency: string; isVisible: boolean; isInStock: boolean;
  category: Category;
  pricingRules?: PricingRule[];
};

type ScanItem = { 
  name: string; 
  description?: string; 
  price: string; 
  currency: string; 
  discount?: {
    valueType: MenuPricingValueType;
    value: string;
    title?: string;
    startsAt?: string;
    endsAt?: string;
  };
};
type ScanCategory = { name: string; displayName: string; items: ScanItem[] };

type Addon = {
  id: string; name: string; description?: string;
  price: number; currency: string;
  isRequired: boolean; minSelections: number; maxSelections: number;
  sortOrder: number; isVisible: boolean;
};

type PricingRule = {
  id: string; ruleType: MenuPricingRuleType; valueType: MenuPricingValueType;
  value: number; title?: string; isActive: boolean;
  startsAt?: string; endsAt?: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const INPUT = 'w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:border-slate-400 focus:outline-none';

function compressAndEncode(file: File, maxPx = 1600, quality = 0.82): Promise<{ b64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxPx || height > maxPx) {
        const ratio = Math.min(maxPx / width, maxPx / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
      const mime = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      resolve({ b64: dataUrl.split(',')[1], mime });
    };
    img.onerror = reject;
    img.src = url;
  });
}

// ── Item Detail Panel (Addons + Pricing Rules) ────────────────────────────────

function ItemDetailPanel({ itemId, itemName, canWrite }: { itemId: string; itemName: string; canWrite: boolean }) {
  const [tab, setTab] = useState<'addons' | 'pricing'>('addons');
  const [addons, setAddons] = useState<Addon[]>([]);
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(false);

  const [addonForm, setAddonForm] = useState({
    name: '', description: '', price: '', currency: 'INR',
    isRequired: false, minSelections: '1', maxSelections: '1', isVisible: true,
  });
  const [ruleForm, setRuleForm] = useState({
    ruleType: 'DISCOUNT' as MenuPricingRuleType,
    valueType: 'PERCENTAGE' as MenuPricingValueType,
    value: '', title: '', startsAt: '', endsAt: '',
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      menuApi.listAddons(itemId),
      menuApi.listPricingRules(itemId),
    ]).then(([a, r]) => {
      const normalise = (raw: any) => Array.isArray(raw) ? raw : (raw?.items ?? raw?.data ?? []);
      setAddons(normalise(a.data));
      setRules(normalise(r.data));
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [itemId]);

  const createAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await menuApi.createAddon(itemId, {
        name: addonForm.name, description: addonForm.description || undefined,
        price: parseFloat(addonForm.price) || 0, currency: addonForm.currency,
        isRequired: addonForm.isRequired,
        minSelections: parseInt(addonForm.minSelections) || 1,
        maxSelections: parseInt(addonForm.maxSelections) || 1,
        isVisible: addonForm.isVisible,
      });
      setAddonForm({ name: '', description: '', price: '', currency: 'INR', isRequired: false, minSelections: '1', maxSelections: '1', isVisible: true });
      setMsg('Addon added.');
      load();
    } catch { setMsg('Failed to add addon.'); }
    setSaving(false);
  };

  const toggleAddon = async (addon: Addon, field: 'isVisible' | 'isRequired') => {
    try {
      await menuApi.updateAddon(addon.id, { [field]: !addon[field] });
      load();
    } catch {}
  };

  const createRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await menuApi.createPricingRule(itemId, {
        ruleType: ruleForm.ruleType, valueType: ruleForm.valueType,
        value: parseFloat(ruleForm.value) || 0,
        title: ruleForm.title || undefined,
        startsAt: ruleForm.startsAt || undefined,
        endsAt: ruleForm.endsAt || undefined,
      });
      setRuleForm({ ruleType: 'DISCOUNT', valueType: 'PERCENTAGE', value: '', title: '', startsAt: '', endsAt: '' });
      setMsg('Rule added.');
      load();
    } catch { setMsg('Failed to add rule.'); }
    setSaving(false);
  };

  const toggleRule = async (rule: PricingRule) => {
    try {
      await menuApi.updatePricingRule(rule.id, { isActive: !rule.isActive });
      load();
    } catch {}
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-4 space-y-4">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{itemName} — Details</p>

      <div className="flex gap-2">
        {(['addons', 'pricing'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${tab === t ? 'bg-slate-800 text-white' : 'border border-slate-200 text-slate-600 hover:bg-white'}`}>
            {t === 'addons' ? `Addons (${addons.length})` : `Pricing Rules (${rules.length})`}
          </button>
        ))}
      </div>

      {msg && <p className="text-xs text-emerald-600">{msg}</p>}

      {/* ── Addons tab ── */}
      {tab === 'addons' && (
        <div className="space-y-3">
          {loading ? <div className="h-10 animate-pulse rounded-xl bg-slate-200" /> : addons.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No addons yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="pb-2 pr-3 font-medium">Name</th>
                    <th className="pb-2 pr-3 font-medium">Price</th>
                    <th className="pb-2 pr-3 font-medium">Required</th>
                    <th className="pb-2 pr-3 font-medium">Sel.</th>
                    <th className="pb-2 font-medium">Visible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {addons.map((a) => (
                    <tr key={a.id} className="hover:bg-white transition">
                      <td className="py-2 pr-3 font-medium text-slate-700">{a.name}{a.description && <span className="ml-1 text-slate-400 font-normal">({a.description})</span>}</td>
                      <td className="py-2 pr-3 text-slate-600">{a.currency} {Number(a.price).toFixed(2)}</td>
                      <td className="py-2 pr-3">
                        {canWrite ? (
                          <button onClick={() => toggleAddon(a, 'isRequired')}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isRequired ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.isRequired ? 'Yes' : 'No'}
                          </button>
                        ) : <span>{a.isRequired ? 'Yes' : 'No'}</span>}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">{a.minSelections}–{a.maxSelections}</td>
                      <td className="py-2">
                        {canWrite ? (
                          <button onClick={() => toggleAddon(a, 'isVisible')}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.isVisible ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
                            {a.isVisible ? 'Visible' : 'Hidden'}
                          </button>
                        ) : <span>{a.isVisible ? 'Visible' : 'Hidden'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canWrite && (
            <form onSubmit={createAddon} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 items-end pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Name *</label>
                <input required value={addonForm.name} onChange={(e) => setAddonForm((f) => ({ ...f, name: e.target.value }))} className={INPUT} placeholder="Extra cheese" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Price</label>
                <input type="number" min="0" step="0.01" value={addonForm.price} onChange={(e) => setAddonForm((f) => ({ ...f, price: e.target.value }))} className={INPUT} placeholder="0.00" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Min / Max selections</label>
                <div className="flex gap-1">
                  <input type="number" min="0" value={addonForm.minSelections} onChange={(e) => setAddonForm((f) => ({ ...f, minSelections: e.target.value }))} className={INPUT} />
                  <input type="number" min="0" value={addonForm.maxSelections} onChange={(e) => setAddonForm((f) => ({ ...f, maxSelections: e.target.value }))} className={INPUT} />
                </div>
              </div>
              <div className="flex items-center gap-3 pt-4">
                <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={addonForm.isRequired} onChange={(e) => setAddonForm((f) => ({ ...f, isRequired: e.target.checked }))} /> Required
                </label>
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60">
                  {saving ? '…' : '+ Add'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* ── Pricing Rules tab ── */}
      {tab === 'pricing' && (
        <div className="space-y-3">
          {loading ? <div className="h-10 animate-pulse rounded-xl bg-slate-200" /> : rules.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No pricing rules yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 uppercase tracking-wide border-b border-slate-200">
                    <th className="pb-2 pr-3 font-medium">Title</th>
                    <th className="pb-2 pr-3 font-medium">Type</th>
                    <th className="pb-2 pr-3 font-medium">Value</th>
                    <th className="pb-2 pr-3 font-medium">Active</th>
                    <th className="pb-2 font-medium">Period</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((r) => (
                    <tr key={r.id} className="hover:bg-white transition">
                      <td className="py-2 pr-3 font-medium text-slate-700">{r.title || r.ruleType}</td>
                      <td className="py-2 pr-3 text-slate-500">{r.ruleType} / {r.valueType}</td>
                      <td className="py-2 pr-3 text-slate-700">{r.valueType === 'PERCENTAGE' ? `${r.value}%` : `₹${r.value}`}</td>
                      <td className="py-2 pr-3">
                        {canWrite ? (
                          <button onClick={() => toggleRule(r)}
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {r.isActive ? 'Active' : 'Inactive'}
                          </button>
                        ) : <span>{r.isActive ? 'Active' : 'Inactive'}</span>}
                      </td>
                      <td className="py-2 text-slate-400">
                        {r.startsAt ? `${new Date(r.startsAt).toLocaleDateString('en-IN')} → ${r.endsAt ? new Date(r.endsAt).toLocaleDateString('en-IN') : '∞'}` : 'Always'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {canWrite && (
            <form onSubmit={createRule} className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 items-end pt-2 border-t border-slate-200">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Rule Type</label>
                <select value={ruleForm.ruleType} onChange={(e) => setRuleForm((f) => ({ ...f, ruleType: e.target.value as MenuPricingRuleType }))} className={INPUT}>
                  <option value="DISCOUNT">Discount</option>
                  <option value="PRICE_OVERRIDE">Price Override</option>
                  <option value="TIME_BASED">Time Based</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Value Type + Amount</label>
                <div className="flex gap-1">
                  <select value={ruleForm.valueType} onChange={(e) => setRuleForm((f) => ({ ...f, valueType: e.target.value as MenuPricingValueType }))} className={INPUT}>
                    <option value="PERCENTAGE">%</option>
                    <option value="FLAT">₹ Flat</option>
                  </select>
                  <input required type="number" min="0" step="0.01" value={ruleForm.value} onChange={(e) => setRuleForm((f) => ({ ...f, value: e.target.value }))} className={INPUT} placeholder="10" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Title</label>
                <input value={ruleForm.title} onChange={(e) => setRuleForm((f) => ({ ...f, title: e.target.value }))} className={INPUT} placeholder="Happy hours (optional)" />
              </div>
              <div className="flex gap-1 items-end">
                <button type="submit" disabled={saving}
                  className="rounded-xl bg-slate-800 px-3 py-2 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-60 whitespace-nowrap">
                  {saving ? '…' : '+ Add Rule'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ── Scan Panel ────────────────────────────────────────────────────────────────

function ScanPanel({ branchId, onImported }: { branchId: string; onImported: () => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [scanError, setScanError] = useState('');
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState('');
  const [extracted, setExtracted] = useState<ScanCategory[] | null>(null);

  const handleFile = (f: File) => {
    if (f.size > 10 * 1024 * 1024) { setScanError('Image must be under 10 MB.'); return; }
    setFile(f);
    setScanError('');
    setImportError('');
    setImportSuccess('');
    setExtracted(null);
    const url = URL.createObjectURL(f);
    setPreview(url);
  };

  const handleScan = async () => {
    if (!file) return;
    setScanning(true);
    setScanError('');
    setExtracted(null);
    try {
      const { b64, mime: mimeType } = await compressAndEncode(file);
      const res = await api.post(`/branches/${branchId}/menu-scan`, { imageBase64: b64, mimeType });
      const cats: ScanCategory[] = (res.data.categories ?? []).map((c: any) => ({
        name: c.name ?? '',
        displayName: c.displayName ?? '',
        items: (c.items ?? []).map((i: any) => ({
          name: i.name ?? '',
          description: i.description ?? '',
          price: String(i.price ?? 0),
          currency: i.currency ?? 'INR',
        })),
      }));
      setExtracted(cats);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setScanError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Scan failed. Try a clearer photo.'));
    } finally {
      setScanning(false);
    }
  };

  const updateCategory = (ci: number, field: keyof ScanCategory, value: string) =>
    setExtracted((prev) => prev ? prev.map((c, i) => i === ci ? { ...c, [field]: value } : c) : prev);

  const updateItem = (ci: number, ii: number, field: keyof ScanItem, value: string) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? { ...c, items: c.items.map((it, j) => j === ii ? { ...it, [field]: value } : it) }
          : c)
      : prev);

  const updateItemDiscount = (ci: number, ii: number, field: keyof NonNullable<ScanItem['discount']>, value: string) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? {
            ...c,
            items: c.items.map((it, j) => j === ii ? {
              ...it,
              discount: {
                ...(it.discount ?? { valueType: 'PERCENTAGE', value: '', title: '', startsAt: '', endsAt: '' }),
                [field]: value,
              },
            } : it),
          }
          : c)
      : prev);

  const toggleItemDiscount = (ci: number, ii: number) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? {
            ...c,
            items: c.items.map((it, j) => j === ii ? {
              ...it,
              discount: it.discount ? undefined : { valueType: 'PERCENTAGE', value: '', title: '', startsAt: '', endsAt: '' },
            } : it),
          }
          : c)
      : prev);

  const addItem = (ci: number) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci
          ? { ...c, items: [...c.items, { name: '', description: '', price: '0', currency: 'INR' }] }
          : c)
      : prev);

  const removeItem = (ci: number, ii: number) =>
    setExtracted((prev) => prev
      ? prev.map((c, i) => i === ci ? { ...c, items: c.items.filter((_, j) => j !== ii) } : c)
      : prev);

  const addCategory = () =>
    setExtracted((prev) => (prev ?? []).concat({ name: '', displayName: '', items: [] }));

  const removeCategory = (ci: number) =>
    setExtracted((prev) => prev ? prev.filter((_, i) => i !== ci) : prev);

  const handleImport = async () => {
    if (!extracted) return;
    setImporting(true);
    setImportError('');
    setImportSuccess('');
    try {
      const payload = {
        categories: extracted.map((c) => ({
          name: c.name.trim() || c.displayName.toLowerCase().replace(/\s+/g, '-'),
          displayName: c.displayName.trim() || c.name,
          items: c.items
            .filter((it) => it.name.trim())
            .map((it) => {
          const item: any = {
            name: it.name.trim(),
            description: it.description?.trim() || undefined,
            price: Number(it.price) || 0,
            currency: it.currency || 'INR',
          };
          if (it.discount && Number(it.discount.value) > 0) {
            item.discount = {
              valueType: it.discount.valueType,
              value: Number(it.discount.value) || 0,
              title: it.discount.title?.trim() || undefined,
              startsAt: it.discount.startsAt || undefined,
              endsAt: it.discount.endsAt || undefined,
            };
          }
          return item;
        }).filter((it) => it.name),
        })).filter((c) => c.name && c.displayName),
      };
      await api.post(`/branches/${branchId}/menu-bulk-upload`, payload);
      setImportSuccess(`Imported ${payload.categories.length} categories successfully.`);
      setExtracted(null);
      setPreview(null);
      setFile(null);
      onImported();
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setImportError(Array.isArray(msg) ? msg.join(' ') : (msg ?? 'Import failed.'));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Scan menu</h2>
          <p className="mt-1 text-sm text-slate-500">Upload a photo of a printed menu — Claude reads and structures it automatically.</p>
        </div>
      </div>

      {/* Upload area */}
      <div
        className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 p-8 transition hover:border-slate-500 hover:bg-slate-50"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      >
        <svg className="h-10 w-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M12 12V4m0 0L8 8m4-4l4 4" />
        </svg>
        <p className="mt-2 text-sm font-medium text-slate-700">Drop image here or click to browse</p>
        <p className="mt-1 text-xs text-slate-400">JPEG, PNG, WebP — max 10 MB</p>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          className="rounded-2xl border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
        >
          Use camera
        </button>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <span className="text-xs text-slate-400">Opens device camera directly</span>
      </div>

      {/* Preview */}
      {preview && (
        <div className="space-y-3">
          <img src={preview} alt="menu preview" className="max-h-72 w-full rounded-2xl object-contain border border-slate-200 bg-slate-100" />
          <button
            type="button"
            onClick={handleScan}
            disabled={scanning}
            className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {scanning ? 'Scanning with AI…' : 'Extract menu'}
          </button>
        </div>
      )}

      {scanError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{scanError}</p>}
      {importSuccess && <p className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{importSuccess}</p>}
      {importError && <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{importError}</p>}

      {/* Editable extracted menu */}
      {extracted && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-700">Review and edit before importing</p>
            <button type="button" onClick={addCategory}
              className="rounded-xl border border-slate-300 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 transition">
              + Add category
            </button>
          </div>

          {extracted.map((cat, ci) => (
            <div key={ci} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Category slug</label>
                    <input className={INPUT} value={cat.name}
                      onChange={(e) => updateCategory(ci, 'name', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Display name</label>
                    <input className={INPUT} value={cat.displayName}
                      onChange={(e) => updateCategory(ci, 'displayName', e.target.value)} />
                  </div>
                </div>
                <button type="button" onClick={() => removeCategory(ci)}
                  className="mt-5 rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {cat.items.map((item, ii) => (
                <div key={ii} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 grid gap-2 sm:grid-cols-[1fr_1fr_80px_60px]">
                      <input className={INPUT} placeholder="Item name" value={item.name}
                        onChange={(e) => updateItem(ci, ii, 'name', e.target.value)} />
                      <input className={INPUT} placeholder="Description (optional)" value={item.description}
                        onChange={(e) => updateItem(ci, ii, 'description', e.target.value)} />
                      <input className={INPUT} placeholder="Price" type="number" min="0" step="0.01" value={item.price}
                        onChange={(e) => updateItem(ci, ii, 'price', e.target.value)} />
                      <input className={INPUT} placeholder="INR" value={item.currency}
                        onChange={(e) => updateItem(ci, ii, 'currency', e.target.value.toUpperCase())} />
                    </div>
                    <div className="flex flex-col gap-2">
                      <button type="button" onClick={() => toggleItemDiscount(ci, ii)}
                        className="rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 hover:bg-white transition">
                        {item.discount ? 'Remove discount' : '+ Add discount'}
                      </button>
                      <button type="button" onClick={() => removeItem(ci, ii)}
                        className="mt-0.5 rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  {item.discount && (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 grid gap-3 sm:grid-cols-2">
                      <label className="block space-y-2">
                        <span className="text-xs font-medium text-slate-600">Discount type</span>
                        <select value={item.discount.valueType} onChange={(e) => updateItemDiscount(ci, ii, 'valueType', e.target.value)} className={INPUT}>
                          <option value="PERCENTAGE">Percentage</option>
                          <option value="FLAT">Flat amount</option>
                        </select>
                      </label>
                      <label className="block space-y-2">
                        <span className="text-xs font-medium text-slate-600">Amount</span>
                        <input className={INPUT} type="number" step="0.01" min="0" value={item.discount.value}
                          onChange={(e) => updateItemDiscount(ci, ii, 'value', e.target.value)} />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-xs font-medium text-slate-600">Title</span>
                        <input className={INPUT} value={item.discount.title || ''}
                          onChange={(e) => updateItemDiscount(ci, ii, 'title', e.target.value)} />
                      </label>
                      <label className="block space-y-2">
                        <span className="text-xs font-medium text-slate-600">Ends at</span>
                        <input className={INPUT} type="date" value={item.discount.endsAt || ''}
                          onChange={(e) => updateItemDiscount(ci, ii, 'endsAt', e.target.value)} />
                      </label>
                      <label className="block space-y-2 sm:col-span-2">
                        <span className="text-xs font-medium text-slate-600">Starts at</span>
                        <input className={INPUT} type="date" value={item.discount.startsAt || ''}
                          onChange={(e) => updateItemDiscount(ci, ii, 'startsAt', e.target.value)} />
                      </label>
                    </div>
                  )}
                </div>
              ))}

              <button type="button" onClick={() => addItem(ci)}
                className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-500 hover:bg-white transition w-full">
                + Add item to {cat.displayName || cat.name}
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleImport}
            disabled={importing}
            className="w-full rounded-2xl bg-emerald-600 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {importing ? 'Importing…' : `Import ${extracted.length} categories to menu`}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BranchMenuPage() {
  const router = useRouter();
  const params = useParams();
  const restaurantId = params.id as string;
  const branchId = params.branchId as string;

  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDisplay, setCategoryDisplay] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemCurrency, setItemCurrency] = useState('INR');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [isVisible, setIsVisible] = useState(true);
  const [isInStock, setIsInStock] = useState(true);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountValueType, setDiscountValueType] = useState<MenuPricingValueType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState('');
  const [discountTitle, setDiscountTitle] = useState('');
  const [discountStartsAt, setDiscountStartsAt] = useState('');
  const [discountEndsAt, setDiscountEndsAt] = useState('');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editItemDescription, setEditItemDescription] = useState('');
  const [editItemPrice, setEditItemPrice] = useState('');
  const [editItemCurrency, setEditItemCurrency] = useState('INR');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showScan, setShowScan] = useState(false);
  const [menuLoading, setMenuLoading] = useState(true);

  const canWrite = ['restaurant_admin', 'sales_operator', 'super_admin'].includes(userRole ?? '');

  const fetchMenu = async (showLoader = false) => {
    if (showLoader) setMenuLoading(true);
    try {
      const [catRes, itemRes] = await Promise.all([
        api.get(`/branches/${branchId}/menu-categories`),
        api.get(`/branches/${branchId}/menu-items`),
      ]);
      setCategories(catRes.data);
      setItems(itemRes.data);
      if (catRes.data.length && !selectedCategoryId) setSelectedCategoryId(catRes.data[0].id);
      setError('');
    } catch {
      setError('Unable to load menu content.');
    } finally {
      setMenuLoading(false);
    }
  };

  useEffect(() => {
    setUserRole(getUserRole());
    fetchMenu(true);
  }, [branchId]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post(`/branches/${branchId}/menu-categories`, { name: categoryName, displayName: categoryDisplay });
      setCategoryName(''); setCategoryDisplay('');
      setMessage('Category added.'); setError('');
      fetchMenu();
    } catch { setError('Unable to create category.'); }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) { setError('Please select a category first.'); return; }
    try {
      const payload: any = {
        categoryId: selectedCategoryId, name: itemName, description: itemDescription,
        price: Number(itemPrice), currency: itemCurrency, isVisible, isInStock,
      };
      if (discountEnabled && Number(discountValue) > 0) {
        payload.discount = {
          valueType: discountValueType,
          value: Number(discountValue),
          title: discountTitle || undefined,
          startsAt: discountStartsAt || undefined,
          endsAt: discountEndsAt || undefined,
        };
      }
      await api.post(`/branches/${branchId}/menu-items`, payload);
      setItemName(''); setItemDescription(''); setItemPrice(''); setItemCurrency('INR');
      setIsVisible(true); setIsInStock(true);
      setDiscountEnabled(false); setDiscountValueType('PERCENTAGE'); setDiscountValue('');
      setDiscountTitle(''); setDiscountStartsAt(''); setDiscountEndsAt('');
      setMessage('Item added.'); setError('');
      fetchMenu();
    } catch { setError('Unable to create item.'); setMessage(''); }
  };

  const startEditItem = (item: MenuItem) => {
    setEditingItemId(item.id);
    setEditItemName(item.name); setEditItemDescription(item.description ?? '');
    setEditItemPrice(String(item.price)); setEditItemCurrency(item.currency);
    
    // Populate discount fields if item has a discount pricing rule
    const discountRule = item.pricingRules?.find((rule) => rule.ruleType === 'DISCOUNT');
    if (discountRule) {
      setDiscountEnabled(true);
      setDiscountValueType(discountRule.valueType);
      setDiscountValue(String(discountRule.value));
      setDiscountTitle(discountRule.title ?? '');
      setDiscountStartsAt(discountRule.startsAt ?? '');
      setDiscountEndsAt(discountRule.endsAt ?? '');
    } else {
      setDiscountEnabled(false);
      setDiscountValueType('PERCENTAGE');
      setDiscountValue('');
      setDiscountTitle('');
      setDiscountStartsAt('');
      setDiscountEndsAt('');
    }
    
    setError(''); setMessage('');
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId) return;
    try {
      // Update basic item fields
      await api.patch(`/menu-items/${editingItemId}`, {
        name: editItemName, description: editItemDescription,
        price: Number(editItemPrice), currency: editItemCurrency,
      });

      // Handle discount pricing rule
      const existingDiscountRule = items.find(item => item.id === editingItemId)?.pricingRules?.find(rule => rule.ruleType === 'DISCOUNT');
      
      if (discountEnabled && Number(discountValue) > 0) {
        const discountData = {
          ruleType: 'DISCOUNT' as MenuPricingRuleType,
          valueType: discountValueType,
          value: Number(discountValue),
          title: discountTitle || undefined,
          startsAt: discountStartsAt || undefined,
          endsAt: discountEndsAt || undefined,
        };

        if (existingDiscountRule) {
          // Update existing discount rule
          await menuApi.updatePricingRule(existingDiscountRule.id, discountData);
        } else {
          // Create new discount rule
          await menuApi.createPricingRule(editingItemId, discountData);
        }
      } else if (existingDiscountRule) {
        // Disable discount by setting it inactive
        await menuApi.updatePricingRule(existingDiscountRule.id, { isActive: false });
      }

      setEditingItemId(null);
      setDiscountEnabled(false);
      setDiscountValueType('PERCENTAGE');
      setDiscountValue('');
      setDiscountTitle('');
      setDiscountStartsAt('');
      setDiscountEndsAt('');
      setMessage('Item updated.'); setError('');
      fetchMenu();
    } catch { setError('Unable to update item.'); setMessage(''); }
  };

  const toggleItemState = async (item: MenuItem, field: 'isVisible' | 'isInStock') => {
    try {
      await api.patch(`/menu-items/${item.id}`, { [field]: !item[field] });
      setMessage('Item updated.'); setError('');
      fetchMenu();
    } catch { setError('Unable to update item status.'); setMessage(''); }
  };

  return (
    <AuthGuard>
      <div className="space-y-6">

          {/* Header */}
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-semibold">Branch Menu</h1>
                <p className="mt-2 text-slate-600">Manage categories and items for branch {branchId}.</p>
              </div>
              <div className="flex flex-wrap gap-3">
                {canWrite && (
                  <button
                    type="button"
                    onClick={() => setShowScan((s) => !s)}
                    className={`rounded-2xl px-4 py-2.5 text-sm font-medium transition ${showScan ? 'bg-slate-200 text-slate-900' : 'border border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                  >
                    {showScan ? 'Hide scanner' : 'Scan menu'}
                  </button>
                )}
                <button onClick={() => router.back()} className="rounded-2xl border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
                  Back
                </button>
                <button onClick={() => router.push(`/restaurants/${restaurantId}/branches`)} className="rounded-2xl bg-slate-900 px-4 py-2 text-white hover:bg-slate-700">
                  Branches
                </button>
              </div>
            </div>
          </div>

          {(message || error) && (
            <div className={`rounded-3xl p-4 ${error ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
              {error || message}
            </div>
          )}

          {/* Scan panel */}
          {showScan && canWrite && (
            <ScanPanel branchId={branchId} onImported={() => { setShowScan(false); fetchMenu(); }} />
          )}

          {/* Create forms — only write roles */}
          {canWrite && (
            <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Create category</h2>
                <form className="mt-4 space-y-4" onSubmit={handleCreateCategory}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Internal name</span>
                    <input value={categoryName} onChange={(e) => setCategoryName(e.target.value)}
                      className={INPUT} placeholder="e.g. appetizers" required />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Display name</span>
                    <input value={categoryDisplay} onChange={(e) => setCategoryDisplay(e.target.value)}
                      className={INPUT} placeholder="e.g. Appetizers" required />
                  </label>
                  <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white hover:bg-slate-700">
                    Add category
                  </button>
                </form>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-sm">
                <h2 className="text-xl font-semibold">Create item</h2>
                <form className="mt-4 space-y-4" onSubmit={handleCreateItem}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Category</span>
                    <select value={selectedCategoryId} onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className={INPUT} required>
                      <option value="">Select a category</option>
                      {categories.map((c) => <option key={c.id} value={c.id}>{c.displayName}</option>)}
                    </select>
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Name</span>
                    <input value={itemName} onChange={(e) => setItemName(e.target.value)}
                      className={INPUT} placeholder="e.g. Chicken Biryani" required />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Description</span>
                    <textarea value={itemDescription} onChange={(e) => setItemDescription(e.target.value)}
                      className={INPUT} rows={2} placeholder="Optional" />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700">Price</span>
                      <input value={itemPrice} onChange={(e) => setItemPrice(e.target.value)}
                        type="number" step="0.01" min="0" className={INPUT} placeholder="100.00" required />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700">Currency</span>
                      <input value={itemCurrency} onChange={(e) => setItemCurrency(e.target.value)}
                        className={INPUT} required />
                    </label>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={isVisible} onChange={(e) => setIsVisible(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300" /> Visible
                      </label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input type="checkbox" checked={isInStock} onChange={(e) => setIsInStock(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300" /> In stock
                      </label>
                      <button type="button" onClick={() => setDiscountEnabled((prev) => !prev)}
                        className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-white transition">
                        {discountEnabled ? 'Remove discount' : 'Add discount'}
                      </button>
                    </div>
                    {discountEnabled && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Discount type</span>
                            <select value={discountValueType} onChange={(e) => setDiscountValueType(e.target.value as MenuPricingValueType)}
                              className={INPUT}>
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="FLAT">Flat amount</option>
                            </select>
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Discount amount</span>
                            <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                              type="number" step="0.01" min="0" className={INPUT} placeholder="10" />
                          </label>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Title</span>
                            <input value={discountTitle} onChange={(e) => setDiscountTitle(e.target.value)} className={INPUT} placeholder="Weekend sale" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Valid until</span>
                            <input value={discountEndsAt} onChange={(e) => setDiscountEndsAt(e.target.value)} type="date" className={INPUT} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white hover:bg-slate-700">
                    Add item
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Edit item */}
          {canWrite && (
            <div className="rounded-3xl bg-white p-6 shadow-sm">
              <h2 className="text-xl font-semibold">Edit menu item</h2>
              {editingItemId ? (
                <form className="mt-4 space-y-4" onSubmit={handleUpdateItem}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Name</span>
                    <input value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className={INPUT} required />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">Description</span>
                    <textarea value={editItemDescription} onChange={(e) => setEditItemDescription(e.target.value)} className={INPUT} rows={3} />
                  </label>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700">Price</span>
                      <input value={editItemPrice} onChange={(e) => setEditItemPrice(e.target.value)}
                        type="number" step="0.01" min="0" className={INPUT} required />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-sm font-medium text-slate-700">Currency</span>
                      <input value={editItemCurrency} onChange={(e) => setEditItemCurrency(e.target.value)} className={INPUT} required />
                    </label>
                  </div>
                  <div className="space-y-3">
                    <button type="button" onClick={() => setDiscountEnabled((prev) => !prev)}
                      className="rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 hover:bg-white transition">
                      {discountEnabled ? 'Remove discount' : 'Add discount'}
                    </button>
                    {discountEnabled && (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Discount type</span>
                            <select value={discountValueType} onChange={(e) => setDiscountValueType(e.target.value as MenuPricingValueType)}
                              className={INPUT}>
                              <option value="PERCENTAGE">Percentage</option>
                              <option value="FLAT">Flat amount</option>
                            </select>
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Discount amount</span>
                            <input value={discountValue} onChange={(e) => setDiscountValue(e.target.value)}
                              type="number" step="0.01" min="0" className={INPUT} placeholder="10" />
                          </label>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Title</span>
                            <input value={discountTitle} onChange={(e) => setDiscountTitle(e.target.value)} className={INPUT} placeholder="Weekend sale" />
                          </label>
                          <label className="block space-y-2">
                            <span className="text-sm font-medium text-slate-700">Valid until</span>
                            <input value={discountEndsAt} onChange={(e) => setDiscountEndsAt(e.target.value)} type="date" className={INPUT} />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button type="submit" className="rounded-2xl bg-slate-900 px-5 py-3 text-sm text-white hover:bg-slate-700">Save changes</button>
                    <button type="button" onClick={() => {
                      setEditingItemId(null);
                      setDiscountEnabled(false);
                      setDiscountValueType('PERCENTAGE');
                      setDiscountValue('');
                      setDiscountTitle('');
                      setDiscountStartsAt('');
                      setDiscountEndsAt('');
                    }}
                      className="rounded-2xl border border-slate-300 px-5 py-3 text-sm text-slate-700 hover:bg-slate-50">Cancel</button>
                  </div>
                </form>
              ) : (
                <p className="mt-4 text-slate-500 text-sm">Select an item below to edit it.</p>
              )}
            </div>
          )}

          {/* Menu overview */}
          <div className="rounded-3xl bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xl font-semibold">Menu overview</h2>
              {!menuLoading && categories.length > 0 && (
                <span className="text-xs text-slate-400">
                  {categories.length} categories · {items.length} items
                </span>
              )}
            </div>

            {menuLoading ? (
              <div className="mt-4 space-y-4 animate-pulse">
                {[1, 2].map((n) => (
                  <div key={n} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="h-5 w-32 rounded-full bg-slate-200" />
                    <div className="mt-3 h-24 rounded-xl bg-slate-200" />
                  </div>
                ))}
              </div>
            ) : categories.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">
                No categories yet.{canWrite ? ' Create one above or scan a menu.' : ''}
              </p>
            ) : (
              <div className="mt-4 space-y-6">
                {categories.map((category) => {
                  const catItems = items.filter((it) => it.category.id === category.id);
                  return (
                    <div key={category.id} className="overflow-hidden rounded-2xl border border-slate-200">
                      {/* Category header */}
                      <div className="flex items-center justify-between bg-slate-800 px-5 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-semibold text-white">{category.displayName}</span>
                          <span className="rounded-full bg-slate-600 px-2 py-0.5 text-xs text-slate-300">{catItems.length} items</span>
                        </div>
                        <span className="text-xs text-slate-400">{category.name}</span>
                      </div>

                      {catItems.length === 0 ? (
                        <p className="px-5 py-4 text-sm text-slate-400 italic">No items in this category yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                                <th className="px-5 py-3">Item</th>
                                <th className="px-5 py-3">Description</th>
                                <th className="px-5 py-3 text-right">Price</th>
                                <th className="px-5 py-3 text-center">Stock</th>
                                <th className="px-5 py-3 text-center">Visible</th>
                                {canWrite && <th className="px-5 py-3 text-right">Actions</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {catItems.map((item, idx) => {
                                const discount = item.pricingRules?.find((rule) => rule.ruleType === 'DISCOUNT');
                                const discountLabel = discount
                                  ? discount.valueType === 'PERCENTAGE'
                                    ? `${discount.value}% off`
                                    : `₹${discount.value} off`
                                  : null;
                                const itemDescription = item.description ? (
                                  item.description
                                ) : (
                                  <span className="italic text-slate-300">—</span>
                                );

                                return (
                                  <React.Fragment key={item.id}>
                                    <tr className={`transition hover:bg-slate-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                      <td className="px-5 py-3.5 font-medium text-slate-900 whitespace-nowrap">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <span>{item.name}</span>
                                          {discountLabel && (
                                            <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-emerald-700">
                                              {discountLabel}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-5 py-3.5 text-slate-500 max-w-xs">
                                        <span className="line-clamp-2">{itemDescription}</span>
                                      </td>
                                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800 whitespace-nowrap">
                                        {item.currency} {Number(item.price).toFixed(2)}
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                          item.isInStock ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
                                        }`}>
                                          {item.isInStock ? 'In stock' : 'Out of stock'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3.5 text-center">
                                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                                          item.isVisible ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {item.isVisible ? 'Visible' : 'Hidden'}
                                        </span>
                                      </td>
                                      <td className="px-5 py-3.5 text-right">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {canWrite && (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => startEditItem(item)}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition"
                                              >
                                                Edit
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => toggleItemState(item, 'isInStock')}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition"
                                              >
                                                {item.isInStock ? 'Out of stock' : 'Restock'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => toggleItemState(item, 'isVisible')}
                                                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 transition"
                                              >
                                                {item.isVisible ? 'Hide' : 'Show'}
                                              </button>
                                            </>
                                          )}
                                          <button
                                            type="button"
                                            onClick={() => setExpandedItemId((prev) => prev === item.id ? null : item.id)}
                                            className={`rounded-lg border px-2.5 py-1 text-xs transition ${expandedItemId === item.id ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                                          >
                                            {expandedItemId === item.id ? 'Close' : 'Addons / Rules'}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                    {expandedItemId === item.id && (
                                      <tr>
                                        <td colSpan={6} className="p-0">
                                          <ItemDetailPanel itemId={item.id} itemName={item.name} canWrite={canWrite} />
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

      </div>
    </AuthGuard>
  );
}