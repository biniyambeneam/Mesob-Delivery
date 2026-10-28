import { useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import OnboardingTour from '../components/OnboardingTour.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import './AuthPage.css';

const TOUR_STORAGE_KEY = 'cf_has_seen_tour_v1';
const BRAND_EMBLEM_SRC = '/mesob-symbol.svg';

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
  const [hasAcceptedPolicies, setHasAcceptedPolicies] = useState(false);
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

    if (isSignup && !hasAcceptedPolicies) {
      return;
    }

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

  const headingText = isSignup
    ? isAmharic
      ? 'የተማሪ አካውንት ይፍጠሩ'
      : 'Create student account'
    : isAmharic
      ? 'እንኳን ደህና መጡ'
      : 'Welcome 👋';

  const subtitleText = isSignup
    ? isAmharic
      ? 'የካምፓስፉድ ተጠቃሚ በመሆን ምግብዎን በቀላሉ ወደ ዶርምዎ ያዘዙ።'
      : 'Join CampusFood to order scheduled meals directly to your campus pickup point.'
    : isAmharic
      ? 'በምዝገባ ወቅት በተጠቀሙበት ስልክ ቁጥር እና የይለፍ ቃል ይግቡ።'
      : "Good food, great vibes. Let's get you in!";

  const submitLabel = isSignup
    ? isAmharic
      ? 'ይመዝገቡ'
      : 'Sign Up'
    : isAmharic
      ? 'ግባ'
      : 'Login';

  const isFormValid = phone.trim().length >= 9 && password.trim().length > 0;

  return (
    <div className="cf-shell-wrapper auth-page">
      {/* Decorative mesob emblem + arc, kept out of layout and tab order */}
      <div className="auth-decor" aria-hidden="true">
        <img className="auth-watermark" src={BRAND_EMBLEM_SRC} alt="" draggable="false" />
        <span className="auth-curve" />
      </div>

      <div className="cf-phone-shell font-campus auth-shell">
        {/* Brand and language selector */}
        <header className="auth-header">
          <button
            type="button"
            className="auth-brand"
            onClick={handleOpenTour}
            title="View app introduction tour"
            aria-label="Mesob Delivery — view app introduction tour"
          >
            <img className="auth-emblem" src={BRAND_EMBLEM_SRC} alt="" draggable="false" />
            <span className="auth-wordmark">
              <span className="auth-wordmark-name">MESOB</span>
              <span className="auth-wordmark-sub">Delivery</span>
            </span>
          </button>

          <LanguageToggle className="auth-lang" />
        </header>

        {/* Main content */}
        <main className="auth-main">
          <div className="auth-heading-block">
            <h1 className="auth-title">{headingText}</h1>
            <p className="auth-subtitle">{subtitleText}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Phone Number Field */}
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-phone">
                {isAmharic ? 'ስልክ ቁጥር' : 'Phone Number'}
              </label>
              <div className="auth-input-shell">
                <svg className="auth-country-flag" viewBox="0 0 24 16" aria-hidden="true">
                  <rect width="24" height="5.34" fill="#078930" />
                  <rect y="5.33" width="24" height="5.34" fill="#FCDD09" />
                  <rect y="10.66" width="24" height="5.34" fill="#DA121A" />
                  <circle cx="12" cy="8" r="3.3" fill="#0F47AF" />
                  <path
                    d="m12 5.85.53 1.55h1.63l-1.32.96.5 1.55L12 8.95l-1.34.96.5-1.55-1.32-.96h1.63L12 5.85Z"
                    fill="#FCDD09"
                  />
                </svg>
                <span className="auth-country-code">+251</span>
                <span className="auth-divider" aria-hidden="true" />
                <input
                  id="auth-phone"
                  className="auth-input"
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
            <div className="auth-field">
              <label className="auth-label" htmlFor="auth-password">
                {isAmharic ? 'የይለፍ ቃል' : 'Password'}
              </label>
              <div className="auth-input-shell">
                <KeyRound className="auth-field-icon" aria-hidden="true" />
                <input
                  id="auth-password"
                  ref={passwordInputRef}
                  className="auth-input"
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
                  className="auth-visibility"
                  aria-label="Toggle password visibility"
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </button>
              </div>
            </div>

            {/* Confirm Password Field (for signup mode) */}
            {isSignup ? (
              <div className="auth-field">
                <label className="auth-label" htmlFor="auth-confirm-password">
                  {isAmharic ? 'የይለፍ ቃል ያረጋግጡ' : 'Confirm Password'}
                </label>
                <div className="auth-input-shell">
                  <KeyRound className="auth-field-icon" aria-hidden="true" />
                  <input
                    id="auth-confirm-password"
                    className="auth-input"
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

            {isSignup ? (
              <div className="auth-consent">
                <input
                  id="auth-policy-consent"
                  className="auth-consent-checkbox"
                  type="checkbox"
                  checked={hasAcceptedPolicies}
                  onChange={(event) => setHasAcceptedPolicies(event.target.checked)}
                  aria-labelledby="auth-consent-intro auth-terms-link auth-consent-and auth-privacy-link"
                  required
                />
                <div className="auth-consent-copy">
                  <label id="auth-consent-intro" htmlFor="auth-policy-consent">
                    I agree to the
                  </label>
                  {' '}
                  <button id="auth-terms-link" className="auth-policy-link" type="button">
                    Terms of Use
                  </button>
                  <span id="auth-consent-and"> and </span>
                  <button id="auth-privacy-link" className="auth-policy-link" type="button">
                    Privacy Policy
                  </button>
                </div>
              </div>
            ) : null}

            {/* Error Message */}
            {error ? (
              <div className="auth-error" role="alert">
                {error}
              </div>
            ) : null}

            {/* Supabase Notice if not configured */}
            {!isSupabaseConfigured ? (
              <div className="auth-notice">
                Notice: Supabase environment variables are missing. Please configure them in your environment.
              </div>
            ) : null}

            {/* Primary Action Button */}
            <button
              className="auth-submit"
              type="submit"
              disabled={
                loading ||
                !isSupabaseConfigured ||
                (isSignup && (!isFormValid || !hasAcceptedPolicies))
              }
              aria-busy={loading}
            >
              <span className="auth-submit-label">
                {loading ? (isAmharic ? 'እባክዎ ይጠብቁ...' : 'Please wait...') : submitLabel}
              </span>
              <ArrowRight className="auth-submit-arrow" aria-hidden="true" />
            </button>

            {/* Switch Mode Prompt */}
            <div className="auth-switch">
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
                className="auth-switch-link"
                onClick={() => {
                  setMode(isSignup ? 'login' : 'signup');
                  setHasAcceptedPolicies(false);
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
        </main>

      </div>
    </div>
  );
}
