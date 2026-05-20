'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { getUserRole } from '../../../lib/auth';
import AuthGuard from '../../components/AuthGuard';

// ─── Types ────────────────────────────────────────────────────────────────────

type FormFields = {
  name: string; ownerName: string; email: string; phone: string;
  address: string; city: string; state: string; zipCode: string;
  latitude: string; longitude: string; gstNumber: string; fssaiNumber: string;
  gstExpiryDate: string; fssaiExpiryDate: string;
  bankName: string; bankAccountNumber: string; ifscCode: string;
  leadSource: string; brandDescription: string; cuisineTags: string;
  serviceRadiusKm: string; temporaryClosure: string; holidayMode: string;
};
type FormErrors = Partial<Record<keyof FormFields, string>>;

const EMPTY_FORM: FormFields = {
  name: '', ownerName: '', email: '', phone: '', address: '', city: '',
  state: '', zipCode: '', latitude: '', longitude: '', gstNumber: '',
  fssaiNumber: '', gstExpiryDate: '', fssaiExpiryDate: '',
  bankName: '', bankAccountNumber: '', ifscCode: '',
  leadSource: '', brandDescription: '', cuisineTags: '', serviceRadiusKm: '',
  temporaryClosure: '', holidayMode: '',
};

const BRAND_DESC_MAX = 500;

// ─── Validation ───────────────────────────────────────────────────────────────

function validate(form: FormFields): FormErrors {
  const errors: FormErrors = {};

  if (!form.name.trim()) errors.name = 'Required.';
  else if (form.name.trim().length < 2) errors.name = 'Minimum 2 characters.';

  if (!form.ownerName.trim()) errors.ownerName = 'Required.';
  else if (form.ownerName.trim().length < 2) errors.ownerName = 'Minimum 2 characters.';

  if (!form.email.trim()) errors.email = 'Required.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Invalid email address.';

  if (!form.phone.trim()) errors.phone = 'Required.';
  else if (!/^[6-9]\d{9}$/.test(form.phone)) errors.phone = 'Must be a valid 10-digit mobile number starting with 6–9.';

  if (!form.address.trim()) errors.address = 'Required.';
  if (!form.city.trim()) errors.city = 'Required.';
  if (!form.state.trim()) errors.state = 'Required.';

  if (!form.zipCode.trim()) errors.zipCode = 'Required.';
  else if (!/^\d{6}$/.test(form.zipCode)) errors.zipCode = 'Must be exactly 6 digits.';

  if (form.gstNumber && !/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(form.gstNumber))
    errors.gstNumber = 'Invalid GSTIN format.';

  if (form.fssaiNumber && !/^\d{14}$/.test(form.fssaiNumber))
    errors.fssaiNumber = 'Must be exactly 14 digits.';

  if (form.bankAccountNumber && !/^\d{9,18}$/.test(form.bankAccountNumber))
    errors.bankAccountNumber = 'Must be 9–18 digits.';

  if (form.ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifscCode))
    errors.ifscCode = 'Format: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234).';

  if (form.serviceRadiusKm) {
    const r = Number(form.serviceRadiusKm);
    if (isNaN(r) || r <= 0 || r > 500) errors.serviceRadiusKm = 'Must be between 0.1 and 500 km.';
  }

  return errors;
}

// ─── Key / paste helpers ──────────────────────────────────────────────────────

const PASS_THROUGH = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];

function allowDigitsOnly(e: React.KeyboardEvent<HTMLInputElement>) {
  if (PASS_THROUGH.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^\d$/.test(e.key)) e.preventDefault();
}

function allowLettersSpaces(e: React.KeyboardEvent<HTMLInputElement>) {
  if (PASS_THROUGH.includes(e.key) || e.ctrlKey || e.metaKey) return;
  if (!/^[a-zA-Z\s]$/.test(e.key)) e.preventDefault();
}

function blockNumberExtras(e: React.KeyboardEvent<HTMLInputElement>) {
  // Prevent e, +, - in numeric inputs
  if (['-', '+', 'e', 'E'].includes(e.key)) e.preventDefault();
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BASE = 'mt-2 w-full rounded-2xl border px-4 py-3 outline-none transition focus:border-slate-900 text-sm bg-[var(--surface)] text-[var(--tx)] border-[var(--border)]';
const OK   = `${BASE} `;
const ERR  = `${BASE} border-rose-400`;

// ─── Field wrapper ────────────────────────────────────────────────────────────

function Field({ label, required, error, hint, children }: {
  label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">
        {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
      </span>
      {hint && <span className="ml-2 text-xs text-slate-400">{hint}</span>}
      {children}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </label>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RestaurantRegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormFields>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Partial<Record<keyof FormFields, boolean>>>({});
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [serverError, setServerError] = useState('');

  useEffect(() => { getUserRole(); }, []);

  // Change + live validation for touched fields
  const set = (field: keyof FormFields, value: string) => {
    const next = { ...form, [field]: value };
    setForm(next);
    if (touched[field]) {
      const e = validate(next);
      setErrors((prev) => ({ ...prev, [field]: e[field] }));
    }
  };

  const blur = (field: keyof FormFields) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    const e = validate(form);
    setErrors((prev) => ({ ...prev, [field]: e[field] }));
  };

  // Generic base props
  const p = (field: keyof FormFields) => ({
    value: form[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(field, e.target.value),
    onBlur: () => blur(field),
    className: errors[field] ? ERR : OK,
  });

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    const allTouched = Object.keys(EMPTY_FORM).reduce(
      (a, k) => ({ ...a, [k]: true }), {} as Record<keyof FormFields, boolean>,
    );
    setTouched(allTouched);
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSubmitStatus('loading');
    try {
      const res = await api.post('/restaurants', {
        ...form,
        latitude: form.latitude ? Number(form.latitude) : undefined,
        longitude: form.longitude ? Number(form.longitude) : undefined,
        serviceRadiusKm: form.serviceRadiusKm ? Number(form.serviceRadiusKm) : undefined,
        temporaryClosure: form.temporaryClosure === 'true',
        holidayMode: form.holidayMode === 'true',
        cuisineTags: form.cuisineTags ? form.cuisineTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        ifscCode: form.ifscCode || undefined,
        gstExpiryDate: form.gstExpiryDate || undefined,
        fssaiExpiryDate: form.fssaiExpiryDate || undefined,
      });
      setSubmitStatus('success');
      setTimeout(() => router.push(`/restaurants/${res.data.id}`), 1500);
    } catch (err: any) {
      setSubmitStatus('error');
      const code = err?.response?.status;
      const msg  = err?.response?.data?.message;
      if (code === 400 && msg) setServerError(Array.isArray(msg) ? msg.join(' ') : msg);
      else if (code === 409) setServerError('A restaurant with this email, phone, or address already exists.');
      else setServerError('Could not register restaurant. Please check your inputs and try again.');
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) { setServerError('Geolocation not supported.'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => { set('latitude', String(pos.coords.latitude)); set('longitude', String(pos.coords.longitude)); },
      () => setServerError('Could not capture location. Enter coordinates manually.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  // Paste: strip non-digits, apply maxLength
  const pasteDigits = (field: keyof FormFields, max: number) => (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const cleaned = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, max);
    set(field, cleaned);
  };

  return (
    <AuthGuard requiredRoles={['super_admin', 'sales_operator']}>
      <div className="flex justify-center">
        <div className="w-full max-w-3xl rounded-3xl bg-[var(--surface)] p-8 shadow-lg">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-3xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-200/70">
              <img
                src="/foodeez-sidebar-logo.png"
                alt="FooDeeZ logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-[var(--tx)]">Register Restaurant</h1>
              <p className="mt-1 text-slate-500">Create a new restaurant partner. Login credentials are sent automatically.</p>
            </div>
          </div>
          <p className="mt-4 text-xs text-slate-400">Fields marked <span className="text-rose-500">*</span> are required.</p>

          {submitStatus === 'success' && (
            <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
              Restaurant registered successfully! Redirecting…
            </div>
          )}
          {serverError && (
            <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {serverError}
            </div>
          )}

          <form className="mt-8 space-y-6" onSubmit={handleSubmit} noValidate>

            {/* ── Basic info ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Restaurant name" required error={errors.name}>
                <input {...p('name')} maxLength={100} autoComplete="organization" />
              </Field>
              <Field label="Owner name" required error={errors.ownerName}>
                <input
                  {...p('ownerName')}
                  maxLength={100}
                  onKeyDown={allowLettersSpaces}
                  onPaste={(e) => {
                    e.preventDefault();
                    const cleaned = e.clipboardData.getData('text').replace(/[^a-zA-Z\s]/g, '').slice(0, 100);
                    set('ownerName', cleaned);
                  }}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Email" required error={errors.email}>
                <input
                  type="email"
                  {...p('email')}
                  maxLength={254}
                  autoComplete="email"
                  inputMode="email"
                />
              </Field>
              <Field label="Phone" required error={errors.phone} hint="10 digits">
                <input
                  type="tel"
                  {...p('phone')}
                  maxLength={10}
                  inputMode="numeric"
                  placeholder="e.g. 9876543210"
                  onKeyDown={allowDigitsOnly}
                  onPaste={pasteDigits('phone', 10)}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                />
              </Field>
            </div>

            {/* ── Address ── */}
            <Field label="Address" required error={errors.address}>
              <input {...p('address')} maxLength={255} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="City" required error={errors.city}>
                <input
                  {...p('city')}
                  maxLength={100}
                  onKeyDown={allowLettersSpaces}
                  onPaste={(e) => {
                    e.preventDefault();
                    set('city', e.clipboardData.getData('text').replace(/[^a-zA-Z\s]/g, '').slice(0, 100));
                  }}
                />
              </Field>
              <Field label="State" required error={errors.state}>
                <input
                  {...p('state')}
                  maxLength={100}
                  onKeyDown={allowLettersSpaces}
                  onPaste={(e) => {
                    e.preventDefault();
                    set('state', e.clipboardData.getData('text').replace(/[^a-zA-Z\s]/g, '').slice(0, 100));
                  }}
                />
              </Field>
              <Field label="PIN code" required error={errors.zipCode} hint="6 digits">
                <input
                  {...p('zipCode')}
                  type="tel"
                  maxLength={6}
                  inputMode="numeric"
                  placeholder="110001"
                  onKeyDown={allowDigitsOnly}
                  onPaste={pasteDigits('zipCode', 6)}
                  onChange={(e) => set('zipCode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                />
              </Field>
            </div>

            {/* ── Location ── */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Location coordinates</p>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 space-y-3">
                <button type="button" onClick={captureLocation}
                  className="rounded-2xl bg-[var(--accent)] px-5 py-2.5 text-sm text-white hover:bg-[var(--accent-2)] transition">
                  Auto-capture from browser
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Latitude" error={errors.latitude}>
                    <input
                      type="number" step="any" min={-90} max={90}
                      {...p('latitude')}
                      placeholder="e.g. 28.6139"
                      onKeyDown={blockNumberExtras}
                    />
                  </Field>
                  <Field label="Longitude" error={errors.longitude}>
                    <input
                      type="number" step="any" min={-180} max={180}
                      {...p('longitude')}
                      placeholder="e.g. 77.2090"
                      onKeyDown={blockNumberExtras}
                    />
                  </Field>
                </div>
              </div>
            </div>

            {/* ── Compliance ── */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="GSTIN" error={errors.gstNumber} hint="optional · 15 chars">
                <input
                  {...p('gstNumber')}
                  maxLength={15}
                  placeholder="22AAAAA0000A1Z5"
                  onChange={(e) => set('gstNumber', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15))}
                />
              </Field>
              <Field label="GST Expiry Date" error={errors.gstExpiryDate} hint="optional">
                <input type="date" {...p('gstExpiryDate')} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="FSSAI number" error={errors.fssaiNumber} hint="optional · 14 digits">
                <input
                  {...p('fssaiNumber')}
                  type="tel"
                  maxLength={14}
                  inputMode="numeric"
                  placeholder="12345678901234"
                  onKeyDown={allowDigitsOnly}
                  onPaste={pasteDigits('fssaiNumber', 14)}
                  onChange={(e) => set('fssaiNumber', e.target.value.replace(/\D/g, '').slice(0, 14))}
                />
              </Field>
              <Field label="FSSAI Expiry Date" error={errors.fssaiExpiryDate} hint="optional">
                <input type="date" {...p('fssaiExpiryDate')} />
              </Field>
            </div>

            {/* ── Banking ── */}
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Bank name" error={errors.bankName}>
                <input {...p('bankName')} maxLength={100} />
              </Field>
              <Field label="Account number" error={errors.bankAccountNumber} hint="9–18 digits">
                <input
                  {...p('bankAccountNumber')}
                  type="tel"
                  maxLength={18}
                  inputMode="numeric"
                  onKeyDown={allowDigitsOnly}
                  onPaste={pasteDigits('bankAccountNumber', 18)}
                  onChange={(e) => set('bankAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 18))}
                />
              </Field>
              <Field label="IFSC code" error={errors.ifscCode} hint="11 chars">
                <input
                  {...p('ifscCode')}
                  maxLength={11}
                  placeholder="SBIN0001234"
                  onChange={(e) => set('ifscCode', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11))}
                />
              </Field>
            </div>

            {/* ── Business details ── */}
            <Field label="Lead source" error={errors.leadSource}>
              <input {...p('leadSource')} maxLength={200} placeholder="Referral, marketing, sales lead…" />
            </Field>

            <Field label="Brand description" error={errors.brandDescription}>
              <div className="relative">
                <textarea
                  value={form.brandDescription}
                  onChange={(e) => set('brandDescription', e.target.value.slice(0, BRAND_DESC_MAX))}
                  onBlur={() => blur('brandDescription')}
                  className={`${errors.brandDescription ? ERR : OK} resize-none`}
                  rows={3}
                  maxLength={BRAND_DESC_MAX}
                  placeholder="Concept, service model, target customers…"
                />
                <span className={`absolute bottom-3 right-4 text-xs ${form.brandDescription.length >= BRAND_DESC_MAX ? 'text-rose-500' : 'text-slate-400'}`}>
                  {form.brandDescription.length}/{BRAND_DESC_MAX}
                </span>
              </div>
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cuisine tags" error={errors.cuisineTags}>
                <input {...p('cuisineTags')} maxLength={200} placeholder="North Indian, Chinese (comma-separated)" />
              </Field>
              <Field label="Service radius (km)" error={errors.serviceRadiusKm} hint="max 500">
                <input
                  type="number" min={0.1} max={500} step={0.1}
                  {...p('serviceRadiusKm')}
                  placeholder="e.g. 5"
                  onKeyDown={blockNumberExtras}
                />
              </Field>
            </div>

            {/* ── Status toggles ── */}
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Status flags</p>
              <div className="flex flex-wrap gap-3">
                <button type="button"
                  onClick={() => set('temporaryClosure', form.temporaryClosure === 'true' ? '' : 'true')}
                  className={`rounded-2xl px-4 py-2.5 text-sm transition ${form.temporaryClosure === 'true' ? 'bg-[#B88A2E] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {form.temporaryClosure === 'true' ? 'Temporary closure: ON' : 'Temporary closure: OFF'}
                </button>
                <button type="button"
                  onClick={() => set('holidayMode', form.holidayMode === 'true' ? '' : 'true')}
                  className={`rounded-2xl px-4 py-2.5 text-sm transition ${form.holidayMode === 'true' ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {form.holidayMode === 'true' ? 'Holiday mode: ON' : 'Holiday mode: OFF'}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitStatus === 'loading' || submitStatus === 'success'}
              className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3 text-white transition hover:bg-[var(--accent-2)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitStatus === 'loading' ? 'Registering…' : 'Register Restaurant'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  );
}