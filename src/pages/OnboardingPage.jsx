import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IdCard, MapPin, UserRound } from 'lucide-react';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const PICKUP_OPTIONS = [
  { value: 'T22', label: 'T22 - Female Building' },
  { value: 'T34', label: 'T34 - Male Building' },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { completeOnboarding, profile, signOut } = useAuth();
  const { t } = useLanguage();
  const [name, setName] = useState(profile?.name ?? '');
  const [identityNumber, setIdentityNumber] = useState(profile?.identity_number ?? '');
  const [pickupPoint, setPickupPoint] = useState(profile?.pickup_point ?? 'T22');
  const [error, setError] = useState('');
  const [identityError, setIdentityError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIdentityError('');

    if (!name.trim() || !identityNumber.trim() || !pickupPoint) {
      setError('All onboarding fields are required.');
      return;
    }

    try {
      setSaving(true);
      await completeOnboarding({
        name: name.trim(),
        identityNumber: identityNumber.trim(),
        pickupPoint,
      });
      navigate('/dashboard', { replace: true });
    } catch (submitError) {
      if (submitError.code === '23505') {
        setIdentityError(
          'This ID number is already registered to another student. Please use your correct unique ID.',
        );
        return;
      }
      setError(submitError.message || 'Unable to complete onboarding.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-2 py-2 md:flex md:items-center md:justify-center md:px-6 md:py-8">
      <div className="panel w-full md:max-w-3xl md:overflow-hidden">
        <div className="grid gap-0 md:grid-cols-[0.95fr_1.05fr]">
          <div className="bg-emerald-950 px-5 py-6 text-white md:p-8">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
              Mandatory setup
            </span>
            <h1 className="mt-5 text-4xl font-extrabold text-white">{t.completeProfile}</h1>
            <p className="mt-4 text-sm leading-6 text-emerald-100">
              Before you can place an order, the cafeteria manager needs verified identity details
              and your pickup point for dispatch grouping.
            </p>

            <div className="mt-8 space-y-4">
              <div className="rounded-2xl bg-white/10 p-4">
                <UserRound className="h-5 w-5" />
                <p className="mt-2 text-sm font-semibold">Full name</p>
                <p className="mt-1 text-sm text-emerald-100">Shown in packing and delivery lists.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <IdCard className="h-5 w-5" />
                <p className="mt-2 text-sm font-semibold">Identity number</p>
                <p className="mt-1 text-sm text-emerald-100">Used by the manager to verify the correct student at pickup.</p>
              </div>
              <div className="rounded-2xl bg-white/10 p-4">
                <MapPin className="h-5 w-5" />
                <p className="mt-2 text-sm font-semibold">Pickup point</p>
                <p className="mt-1 text-sm text-emerald-100">Dispatch is grouped strictly by T22 and T34.</p>
              </div>
            </div>
          </div>

          <div className="bg-white px-5 py-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">{t.completeProfile}</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Finish this once. After saving, you will be redirected to your meal dashboard.
                </p>
              </div>
              <button type="button" onClick={signOut} className="btn-secondary">
                Sign out
              </button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">{t.fullName}</span>
                <input
                  className="input"
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">{t.idNumber}</span>
                <input
                  className="input"
                  placeholder="Enter your identity number"
                  value={identityNumber}
                  onChange={(event) => {
                    setIdentityNumber(event.target.value);
                    setIdentityError('');
                  }}
                />
                {identityError ? (
                  <p className="text-sm text-rose-700">{identityError}</p>
                ) : null}
              </label>

              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">{t.pickupPoint}</span>
                <select
                  className="input"
                  value={pickupPoint}
                  onChange={(event) => setPickupPoint(event.target.value)}
                >
                  {PICKUP_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : null}

              <button className="btn-primary w-full" type="submit" disabled={saving}>
                {saving ? `${t.completeBtn}...` : t.completeBtn}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
