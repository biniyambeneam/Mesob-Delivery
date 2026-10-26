import { useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, Sparkles } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import OnboardingTour from '../components/OnboardingTour.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const TOUR_STORAGE_KEY = 'cf_has_seen_tour_v1';

export default function AuthPage() {
  const { signIn, signUp, isSupabaseConfigured } = useAuth();
  const { t, language } = useLanguage();
  const isAmharic = language === 'am';

  // Check if user has already seen onboarding tour
  const [showTour, setShowTour] = useState(() => {
    try {
      return localStorage.getItem(TOUR_STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  });

  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef(null);

  const isSignup = mode === 'signup';

  const handleFinishTour = () => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // Ignore localStorage errors
    }
    setShowTour(false);
  };

  const handleOpenTour = () => {
    setShowTour(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    // Phone cleanup & validation
    const trimmedPhone = phone.trim();
    const digitsOnly = trimmedPhone.replace(/\D/g, '');

    if (!trimmedPhone || !password.trim()) {
      setError(isAmharic ? 'እባክዎ ስልክ ቁጥር እና የይለፍ ቃል ያስገቡ።' : 'Phone number and password are required.');
      return;
    }

    if (digitsOnly.length < 9) {
      setError(
        isAmharic
          ? 'እባክዎ ትክክለኛ ስልክ ቁጥር ያስገቡ (ቢያንስ 9 ድጂት)።'
          : 'Please enter a valid phone number (at least 9 digits).',
      );
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError(isAmharic ? 'የይለፍ ቃሎች አይመሳሰሉም።' : 'Passwords do not match.');
      return;
    }

    try {
      setLoading(true);

      if (isSignup) {
        await signUp({ phone: trimmedPhone, password });
      } else {
        await signIn({ phone: trimmedPhone, password });
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

  // If tour is active, show the 3-slide visual onboarding carousel
  if (showTour) {
    return <OnboardingTour onFinish={handleFinishTour} />;
  }

  const isFormValid = phone.trim().length >= 9 && password.trim().length > 0;

  return (
    <div className="cf-shell-wrapper">
      <div
        className="cf-phone-shell font-campus"
        style={{
          background: 'linear-gradient(180deg, #f7f6ea 0%, #ffffff 31%)',
        }}
      >
        {/* Top Bar with Brand and Language Toggle */}
        <div className="flex items-center justify-between px-6 pt-5 pb-2 z-10">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={handleOpenTour} title="View Tour">
            <span className="text-2xl font-extrabold text-[#08795d] tracking-tight">Campus</span>
            <span className="text-2xl font-extrabold text-[#d48431] tracking-tight">Food</span>
          </div>

          <div className="flex items-center gap-2">
            <LanguageToggle className="static" />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col justify-start px-6 pt-6 sm:pt-10">
          {/* Welcome Header */}
          <div className="mb-6">
            <h1 className="text-[32px] sm:text-[35px] font-bold text-[#101426] leading-tight tracking-[-1.5px]">
              {isSignup
                ? isAmharic
                  ? 'የተማሪ አካውንት ይፍጠሩ'
                  : 'Create student account'
                : isAmharic
                  ? 'እንኳን ደህና መጡ'
                  : 'Welcome back'}
            </h1>
            <p className="mt-2 text-[15px] sm:text-[17px] text-[#596571] leading-relaxed">
              {isSignup
                ? isAmharic
                  ? 'የካምፓስፉድ ተጠቃሚ በመሆን ምግብዎን በቀላሉ ወደ ዶርምዎ ያዘዙ።'
                  : 'Join CampusFood to order scheduled meals directly to your campus pickup point.'
                : isAmharic
                  ? 'በምዝገባ ወቅት በተጠቀሙበት ስልክ ቁጥር እና የይለፍ ቃል ይግቡ።'
                  : 'Login with the same phone number and password you used at signup.'}
            </p>
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={handleSubmit}>
            {/* Phone Number Field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">
                {isAmharic ? 'ስልክ ቁጥር' : 'Phone Number'}
              </label>
              <div className="cf-input-field flex items-center px-3.5">
                {/* Green ET badge */}
                <span className="bg-[#08795d] text-white text-[11px] font-bold px-2 py-0.5 rounded-[5px] tracking-wide select-none">
                  ET
                </span>
                <span className="text-slate-800 font-semibold text-[15px] ml-2 mr-2 select-none">
                  +251
                </span>
                <input
                  className="w-full bg-transparent text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none tracking-wide"
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
                  autoComplete="tel"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">
                {isAmharic ? 'የይለፍ ቃል' : 'Password'}
              </label>
              <div className="cf-input-field flex items-center px-3.5 gap-2.5">
                <KeyRound className="w-5 h-5 text-[#08795d] shrink-0" />
                <input
                  ref={passwordInputRef}
                  className="w-full bg-transparent text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={isAmharic ? 'የይለፍ ቃልዎን ያስገቡ' : 'Enter your password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 hover:text-slate-600 focus:outline-none p-1"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (for signup mode) */}
            {isSignup ? (
              <div>
                <label className="block text-[13px] font-semibold text-slate-800 mb-1.5">
                  {isAmharic ? 'የይለፍ ቃል ያረጋግጡ' : 'Confirm Password'}
                </label>
                <div className="cf-input-field flex items-center px-3.5 gap-2.5">
                  <KeyRound className="w-5 h-5 text-[#08795d] shrink-0" />
                  <input
                    className="w-full bg-transparent text-[16px] text-slate-900 placeholder:text-slate-400 focus:outline-none"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={isAmharic ? 'የይለፍ ቃልዎን በድጋሚ ያስገቡ' : 'Confirm your password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    required
                  />
                </div>
              </div>
            ) : null}

            {/* Error Message */}
            {error ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm text-rose-700 animate-fadeIn">
                {error}
              </div>
            ) : null}

            {/* Supabase Notice if not configured */}
            {!isSupabaseConfigured ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                Notice: Supabase environment variables are missing. Please configure them in your environment.
              </div>
            ) : null}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                className="cf-primary-btn"
                type="submit"
                disabled={loading || !isSupabaseConfigured || !isFormValid}
              >
                {loading ? (
                  <span>{isAmharic ? 'እባክዎ ይጠብቁ...' : 'Please wait...'}</span>
                ) : (
                  <span>
                    {isSignup
                      ? isAmharic
                        ? 'ይመዝገቡ'
                        : 'Sign Up'
                      : isAmharic
                        ? 'ግባ'
                        : 'Login'}
                  </span>
                )}
              </button>
            </div>

            {/* Switch Mode Prompt */}
            <div className="pt-2 text-center text-[13px] text-[#596571]">
              <span>
                {isSignup
                  ? isAmharic
                    ? 'አካውንት አለዎት? '
                    : 'Already have an account? '
                  : isAmharic
                    ? 'አዲስ ተጠቃሚ ነዎት? '
                    : 'New to CampusFood? '}
              </span>
              <button
                type="button"
                className="font-bold text-[#08795d] hover:underline focus:outline-none"
                onClick={() => {
                  setMode(isSignup ? 'login' : 'signup');
                  setError('');
                }}
              >
                {isSignup
                  ? isAmharic
                    ? 'እዚህ ይግቡ'
                    : 'Log in here'
                  : isAmharic
                    ? 'እዚህ ይመዝገቡ'
                    : 'Sign up here'}
              </button>
            </div>
          </form>
        </div>

        {/* Footer Area with Tour Link */}
        <div className="mt-auto px-6 py-6 text-center border-t border-slate-100/60">
          <button
            type="button"
            onClick={handleOpenTour}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#08795d] transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#d48431]" />
            <span>{isAmharic ? 'የመተግበሪያውን ጉብኝት ይመልከቱ' : 'View app introduction tour'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
