import { useRef, useState } from 'react';
import { Clock3, Flame, MapPin } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';

export default function AuthPage() {
  const { signIn, signUp, isSupabaseConfigured } = useAuth();
  const { t } = useLanguage();
  const [mode, setMode] = useState('login');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef(null);

  const isSignup = mode === 'signup';

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!phone.trim() || !password.trim()) {
      setError('Phone number and password are required.');
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      if (isSignup) {
        await signUp({ phone, password });
      } else {
        await signIn({ phone, password });
      }
    } catch (submitError) {
      const errorMessage = submitError?.message || 'Authentication failed.';
      const isNetworkError =
        errorMessage.includes('Failed to fetch') || errorMessage.includes('Network');

      setError(isNetworkError ? t.networkError : errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen px-2 py-2 pb-28 md:px-6 md:py-8 lg:px-10">
      <LanguageToggle className="absolute right-4 top-4 z-10 md:right-8 md:top-8" />
      <div className="mx-auto grid max-w-6xl gap-2 md:gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="panel w-full overflow-hidden px-6 py-8 md:p-8 lg:p-12">
          <div className="max-w-2xl">
            <span className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-800">
              Campus meal delivery
            </span>
            <h1 className="mt-5 text-5xl font-extrabold tracking-tight md:text-6xl">
              {t.heroTitle}
            </h1>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="soft-panel p-4">
              <Flame className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">{t.freshHot}</p>
              <p className="mt-1 text-sm text-slate-600">{t.freshHotDesc}</p>
            </div>
            <div className="soft-panel p-4">
              <MapPin className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">{t.fastPickup}</p>
              <p className="mt-1 text-sm text-slate-600">{t.fastPickupDesc}</p>
            </div>
            <div className="soft-panel p-4">
              <Clock3 className="h-5 w-5 text-emerald-700" />
              <p className="mt-3 text-sm font-semibold text-slate-900">{t.scheduledOrd}</p>
              <p className="mt-1 text-sm text-slate-600">{t.scheduledOrdDesc}</p>
            </div>
          </div>
        </section>

        <section className="panel w-full px-6 py-8 md:p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold">
              {isSignup ? t.signup : t.welcomeBack}
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {isSignup
                ? ''
                : 'Login with the same phone number and password you used at signup.'}
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t.phoneNum}</span>
              <input
                className="input"
                type="tel"
                placeholder="09-12-xx-xx-xx"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    passwordInputRef.current?.focus();
                  }
                }}
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-slate-700">{t.password}</span>
              <input
                ref={passwordInputRef}
                className="input"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            {isSignup ? (
              <label className="block space-y-2">
                <span className="text-sm font-medium text-slate-700">{t.password}</span>
                <input
                  className="input"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </label>
            ) : null}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {!isSupabaseConfigured ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> to a <code>.env</code> file before using auth.
              </div>
            ) : null}

            <button className="btn-primary w-full" type="submit" disabled={loading || !isSupabaseConfigured}>
              {loading ? `${isSignup ? t.signup : t.login}...` : isSignup ? t.signup : t.login}
            </button>

            <p className="pt-2 text-center text-sm text-slate-600">
              {isSignup ? t.alreadyHaveAccount : t.newToApp}
              <button
                type="button"
                className="font-semibold text-emerald-700 transition active:opacity-70"
                onClick={() => {
                  setMode(isSignup ? 'login' : 'signup');
                  setError('');
                }}
              >
                {isSignup ? t.logInHere : t.signUpHere}
              </button>
            </p>
          </form>
        </section>
      </div>
    </div>
  );
}
