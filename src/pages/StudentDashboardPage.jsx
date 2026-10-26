import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  Copy,
  CreditCard,
  Fingerprint,
  Heart,
  Home,
  Image as ImageIcon,
  Landmark,
  LoaderCircle,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  ShoppingBag,
  Smartphone,
  Sparkles,
  Truck,
  Upload,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { playNotificationChime } from '../lib/sound.js';
import { supabase } from '../lib/supabase.js';
import {
  getSubscriptionDaysRemaining,
  getEffectiveSubscriptionStatus,
  isSubscriptionCurrentlyActive,
} from '../lib/subscription.js';
import {
  DEV_MODE_ALWAYS_OPEN,
  getMealWindowState,
  resetClosedMealSoldOutState,
} from '../lib/time.js';
import { formatMenuTitle, translateMealLabel } from '../lib/translations.js';
import EmptyState from '../components/EmptyState.jsx';
import MealStatusCard from '../components/MealStatusCard.jsx';
import OrderCard from '../components/OrderCard.jsx';

const DISMISSED_ARRIVED_ORDER_ID_KEY = 'dismissed_arrived_order_id';

async function compressReceiptImage(file, maxWidth = 1200, quality = 0.8) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve(file);
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            resolve(blob || file);
          },
          'image/jpeg',
          quality,
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => resolve(file);
  });
}

export default function StudentDashboardPage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { t, language } = useLanguage();
  const isAmharic = language === 'am';

  // Active Tab: 'home' | 'favorites' | 'orders' | 'profile'
  const [activeTab, setActiveTab] = useState('home');

  // Favorites state persisted per student in localStorage
  const favoritesStorageKey = `cf_favorites_${profile?.id || 'guest'}`;
  const [favorites, setFavorites] = useState(() => {
    try {
      const stored = localStorage.getItem(favoritesStorageKey);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (item) => {
    setFavorites((prev) => {
      const next = prev.includes(item.id)
        ? prev.filter((id) => id !== item.id)
        : [...prev, item.id];
      try {
        localStorage.setItem(favoritesStorageKey, JSON.stringify(next));
      } catch {
        // ignore localStorage error
      }
      return next;
    });
  };

  const [mealContext, setMealContext] = useState(() => getMealWindowState());
  const [menuItems, setMenuItems] = useState([]);
  const [existingOrder, setExistingOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState(null);
  const [paymentReference, setPaymentReference] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('3meals');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [copiedBank, setCopiedBank] = useState('');
  const fileInputRef = useRef(null);

  const handleReceiptChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      const previewUrl = URL.createObjectURL(file);
      setReceiptPreview(previewUrl);
    }
  };

  const handleRemoveReceipt = () => {
    setReceiptFile(null);
    if (receiptPreview) {
      URL.revokeObjectURL(receiptPreview);
      setReceiptPreview('');
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyAccount = (text, bank) => {
    navigator.clipboard?.writeText(text);
    setCopiedBank(bank);
    setTimeout(() => setCopiedBank(''), 2000);
  };

  const [error, setError] = useState('');
  const [selectedFood, setSelectedFood] = useState(null);
  const [arrivalNotice, setArrivalNotice] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  const focusedMeal = mealContext.focusMeal;
  const effectiveSubscriptionStatus = useMemo(
    () => getEffectiveSubscriptionStatus(profile),
    [profile],
  );
  const isSubscriptionActive = useMemo(
    () => isSubscriptionCurrentlyActive(profile),
    [profile],
  );
  const daysRemaining = useMemo(
    () => getSubscriptionDaysRemaining(profile?.subscription_end_date),
    [profile?.subscription_end_date],
  );

  const maybeShowArrivalNotice = useCallback(
    (order) => {
      if (!order || order.status !== 'Arrived') {
        return;
      }

      const dismissedOrderId = window.localStorage.getItem(DISMISSED_ARRIVED_ORDER_ID_KEY);

      if (dismissedOrderId === order.id) {
        return;
      }

      setArrivalNotice({
        orderId: order.id,
        foodName: order.menu?.name ?? 'meal',
        pickupPoint: profile?.pickup_point ?? 'your campus pickup point',
      });
      playNotificationChime();
    },
    [profile?.pickup_point],
  );

  const loadDashboard = useCallback(async () => {
    if (!profile?.id || !isSubscriptionCurrentlyActive(profile)) {
      setMenuItems([]);
      setExistingOrder(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');

      let menuData = [];
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('get_menu_with_counts', {
          p_meal_type: focusedMeal,
          p_order_date: mealContext.focusDate,
        });

        if (!rpcError && rpcData) {
          menuData = rpcData;
        } else {
          const { data: directMenu, error: directError } = await supabase
            .from('menu')
            .select('*')
            .eq('meal_type', focusedMeal)
            .order('name');
          if (directError) throw directError;
          menuData = directMenu ?? [];
        }
      } catch {
        const { data: fallbackMenu } = await supabase
          .from('menu')
          .select('*')
          .eq('meal_type', focusedMeal)
          .order('name');
        menuData = fallbackMenu ?? [];
      }

      // Check if student has already placed an order for this focused meal today
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select('id, status, menu_id, meal_type, order_date, menu:menu_id(name)')
        .eq('user_id', profile.id)
        .eq('meal_type', focusedMeal)
        .eq('order_date', mealContext.focusDate)
        .maybeSingle();

      if (orderError) {
        throw orderError;
      }

      setMenuItems(menuData);
      setExistingOrder(orderData);
      maybeShowArrivalNotice(orderData);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load your dashboard.');
    } finally {
      setLoading(false);
    }
  }, [focusedMeal, mealContext.focusDate, maybeShowArrivalNotice, profile]);

  useEffect(() => {
    const syncMealContext = () => {
      setMealContext(getMealWindowState());
      void resetClosedMealSoldOutState(supabase);
    };
    syncMealContext();
    const timer = window.setInterval(syncMealContext, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!supabase || !profile?.id) {
      return undefined;
    }

    const channel = supabase
      .channel(`student-order-status-${profile.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `user_id=eq.${profile.id}`,
        },
        async (payload) => {
          if (payload.new.status === 'Arrived') {
            const { data, error: orderError } = await supabase
              .from('orders')
              .select('id, status, menu:menu_id(name)')
              .eq('id', payload.new.id)
              .maybeSingle();

            if (orderError) {
              setError(orderError.message || 'Unable to load updated delivery status.');
              return;
            }

            if (data) {
              setExistingOrder(data);
              maybeShowArrivalNotice(data);
            }
          } else {
            void loadDashboard();
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard, maybeShowArrivalNotice, profile?.id]);

  useEffect(() => {
    maybeShowArrivalNotice(existingOrder);
  }, [existingOrder, maybeShowArrivalNotice]);

  useEffect(() => {
    if (!profile?.id || !existingOrder?.id || !supabase) {
      return undefined;
    }

    const pollTimer = window.setInterval(async () => {
      try {
        const { data, error: pollError } = await supabase
          .from('orders')
          .select('id, status, menu_id, meal_type, order_date, menu:menu_id(name)')
          .eq('id', existingOrder.id)
          .maybeSingle();

        if (!pollError && data && data.status !== existingOrder.status) {
          setExistingOrder(data);
          if (data.status === 'Arrived') {
            maybeShowArrivalNotice(data);
          }
        }
      } catch {
        // silent fallback
      }
    }, 8000);

    return () => window.clearInterval(pollTimer);
  }, [existingOrder?.id, existingOrder?.status, maybeShowArrivalNotice, profile?.id]);

  useEffect(() => {
    if (!toastMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setToastMessage('');
    }, 3000);

    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const placeOrder = async (item) => {
    try {
      setSubmittingId(item.id);
      setError('');

      const latestProfile = await refreshProfile();

      if (!isSubscriptionCurrentlyActive(latestProfile ?? profile)) {
        throw new Error('Your subscription is not active. Renew your monthly meal plan before ordering.');
      }

      const { data: insertedOrder, error: insertError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          menu_id: item.id,
          meal_type: item.meal_type,
          order_date: mealContext.focusDate,
          status: 'Pending',
        })
        .select('id, status, menu:menu_id(name)')
        .single();

      if (insertError) {
        if (insertError.code === '23505') {
          await loadDashboard();
          setToastMessage(`You already placed your ${item.meal_type.toLowerCase()} order.`);
          setActiveTab('orders');
          return;
        }

        const refreshedProfile = await refreshProfile();

        if (!isSubscriptionCurrentlyActive(refreshedProfile ?? profile)) {
          throw new Error('Action blocked. Your subscription has expired on the server.');
        }

        if (insertError.code === '42501' || insertError.message?.toLowerCase().includes('row-level security')) {
          throw new Error('Action blocked. The server rejected this order outside the allowed meal window.');
        }

        throw insertError;
      }

      const confirmedOrder = insertedOrder || {
        id: 'new',
        status: 'Pending',
        meal_type: item.meal_type,
        menu: { name: item.name },
      };
      if (!confirmedOrder.menu?.name) {
        confirmedOrder.menu = { name: item.name };
      }
      setExistingOrder(confirmedOrder);
      setToastMessage(`${item.meal_type} order confirmed!`);
      await loadDashboard();
      // Automatically switch to orders tracking tab
      setActiveTab('orders');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit order.');
    } finally {
      setSubmittingId(null);
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();

    if (!paymentReference.trim()) {
      setError('Transaction reference number is required.');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      setError('');

      const planPrefix = selectedPlan === '2meals' ? '[2 Meals - 4,500 Birr]' : '[3 Meals - 6,700 Birr]';
      const formattedRef = `${planPrefix} ${paymentReference.trim()}`;

      let uploadedReceiptUrl = null;

      if (receiptFile && supabase) {
        try {
          const compressed = await compressReceiptImage(receiptFile);
          const fileExt = 'jpg';
          const fileName = `${profile.id}-${Date.now()}.${fileExt}`;

          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('receipts')
            .upload(fileName, compressed, {
              cacheControl: '3600',
              upsert: true,
              contentType: 'image/jpeg',
            });

          if (!uploadError && uploadData?.path) {
            const { data: publicUrlData } = supabase.storage
              .from('receipts')
              .getPublicUrl(uploadData.path);
            uploadedReceiptUrl = publicUrlData?.publicUrl || null;
          } else if (uploadError) {
            console.warn('Storage receipt upload warning:', uploadError.message);
          }
        } catch (uploadErr) {
          console.warn('Storage upload encountered an error:', uploadErr);
        }
      }

      const updatePayload = {
        subscription_status: 'pending',
        subscription_end_date: null,
        last_transaction_ref: formattedRef,
        payment_rejection_reason: null,
      };

      if (uploadedReceiptUrl) {
        updatePayload.receipt_url = uploadedReceiptUrl;
      }

      const { error: updateError } = await supabase
        .from('users')
        .update(updatePayload)
        .eq('id', profile.id);

      if (updateError) {
        throw updateError;
      }

      setPaymentReference('');
      handleRemoveReceipt();
      await refreshProfile();
      setToastMessage(isAmharic ? 'የክፍያ ማረጋገጫ ተልኳል። ማኔጀሩ እስኪያረጋግጥ ይጠብቁ።' : 'Payment submitted for manager verification.');
    } catch (submitError) {
      setError(submitError.message || 'Unable to submit payment reference.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleOrderClick = (item) => {
    const isSoldOut = Boolean(
      item?.is_sold_out ||
        (item?.max_servings &&
          item?.orders_count !== undefined &&
          Number(item.orders_count) >= Number(item.max_servings))
    );

    if (isSoldOut) {
      setToastMessage(
        isAmharic
          ? 'ይህ ምግብ ለዛሬ አልቋል። እባክዎ ሌላ ምግብ ይምረጡ።'
          : 'This meal is currently sold out. Please choose another option.'
      );
      return;
    }

    if (!DEV_MODE_ALWAYS_OPEN && mealContext.activeMeal !== item.meal_type) {
      const nextOpenTime = mealContext.nextMealStartsAt ?? 'the next local meal window';
      const mealLabel = translateMealLabel(t, item.meal_type);
      setToastMessage(
        isAmharic
          ? `ትዕዛዝ ዝግ ነው። የ${mealLabel} ሰዓት ${nextOpenTime} ይከፈታል።`
          : `Ordering closed. The ${mealLabel} window opens at ${nextOpenTime}.`,
      );
      return;
    }

    setSelectedFood(item);
  };

  const handleRefresh = async () => {
    setError('');
    await refreshProfile();
    await loadDashboard();
    setToastMessage(isAmharic ? 'መረጃዎች ታድሰዋል' : 'Dashboard refreshed');
  };

  const handleConfirmOrder = async () => {
    if (!selectedFood) {
      return;
    }

    const foodToOrder = selectedFood;
    setSelectedFood(null);
    await placeOrder(foodToOrder);
  };

  const handleDismissArrivalNotice = () => {
    if (arrivalNotice?.orderId) {
      window.localStorage.setItem(DISMISSED_ARRIVED_ORDER_ID_KEY, arrivalNotice.orderId);
    }

    setArrivalNotice(null);
  };

  // Filter eligible favorite dishes for the current meal window
  const eligibleFavoriteDishes = useMemo(() => {
    return menuItems.filter((item) => favorites.includes(item.id));
  }, [menuItems, favorites]);

  return (
    <div className="min-h-screen bg-[#f8f9fa] md:bg-[#f2f2f4] font-campus text-slate-900">
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR NAVIGATION (Hidden on mobile, md:flex)   */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:bg-white md:border-r md:border-slate-200/80 md:z-30 p-5 shadow-xs">
        {/* Brand Wordmark */}
        <div className="flex items-center gap-1.5 px-2 py-2 mb-8">
          <span className="text-2xl font-extrabold text-[#08795d] tracking-tight">Campus</span>
          <span className="text-2xl font-extrabold text-[#d48431] tracking-tight">Food</span>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1.5 flex-1" aria-label="Desktop Navigation">
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'home'
                ? 'bg-emerald-50 text-[#08795d] border-l-4 border-[#08795d]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Home className="w-5 h-5 shrink-0" />
            <span>{t.home || 'Home'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('favorites')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'favorites'
                ? 'bg-emerald-50 text-[#08795d] border-l-4 border-[#08795d]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Heart
              className={`w-5 h-5 shrink-0 ${
                favorites.length > 0 ? 'text-rose-500 fill-rose-500' : ''
              }`}
            />
            <span>{t.favorites || 'Favorites'}</span>
            {favorites.length > 0 && (
              <span className="ml-auto bg-rose-100 text-rose-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                {favorites.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'orders'
                ? 'bg-emerald-50 text-[#08795d] border-l-4 border-[#08795d]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Package className="w-5 h-5 shrink-0" />
            <span>{t.orders || 'Orders'}</span>
            {existingOrder && (
              <span className="ml-auto w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              activeTab === 'profile'
                ? 'bg-emerald-50 text-[#08795d] border-l-4 border-[#08795d]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <UserRound className="w-5 h-5 shrink-0" />
            <span>{t.profile || 'Profile'}</span>
          </button>
        </nav>

        {/* Sidebar Footer: Mini User Pill */}
        <div className="pt-4 border-t border-slate-100 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-full bg-emerald-100 text-[#08795d] font-bold flex items-center justify-center shrink-0">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{profile?.name || 'Student'}</p>
              <p className="text-[10px] text-slate-500 truncate">Station: Building {profile?.pickup_point || 'T22'}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>{t.signOut}</span>
          </button>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* MAIN CONTENT REGION (Offset by sidebar on desktop)      */}
      {/* ======================================================== */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* COMPACT TOP HEADER */}
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200/70 px-4 py-3 sm:px-6">
          <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Mobile Wordmark & Student Greeting */}
            <div>
              <div className="flex items-center gap-1.5 md:hidden mb-0.5">
                <span className="text-lg font-extrabold text-[#08795d] tracking-tight">Campus</span>
                <span className="text-lg font-extrabold text-[#d48431] tracking-tight">Food</span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
                <span>{t.hello}</span>
                <span className="text-[#08795d]">{profile?.name || 'Student'}</span>
                <span className="inline-block text-base">👋</span>
              </h1>
            </div>

            {/* Right: Station Badge & Order Quick Pill */}
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#08795d] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
                <MapPin className="w-3 h-3 text-[#08795d]" />
                <span>Station: {profile?.pickup_point || 'T22'}</span>
              </span>

              {isSubscriptionActive && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-full">
                  <CreditCard className="w-3 h-3 text-slate-500" />
                  <span>{daysRemaining} {t.remaining}</span>
                </span>
              )}
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT WRAPPER */}
        <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6 pb-28 md:pb-12 space-y-4">
          {/* Error Banner */}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm text-rose-700 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">{error}</div>
              <button
                type="button"
                onClick={() => setError('')}
                className="text-rose-400 hover:text-rose-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 1: HOME (Current Meal Window & Available Menu)       */}
          {/* ======================================================== */}
          {activeTab === 'home' && (
            <div className="space-y-4">
              {/* Unsubscribed / Expired Alert if not active */}
              {!isSubscriptionActive && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-200/70 text-amber-900 shrink-0 mt-0.5">
                      <CreditCard className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-amber-900">{t.subRequired}</h3>
                      <p className="text-xs text-amber-800 mt-0.5">
                        {effectiveSubscriptionStatus === 'pending'
                          ? isAmharic
                            ? 'የክፍያ ማረጋገጫዎ በመጣራት ላይ ነው።'
                            : 'Payment submitted and awaiting manager verification.'
                          : t.subExpiredMsg}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="self-start sm:self-center px-4 py-2 bg-amber-800 text-white rounded-xl text-xs font-bold hover:bg-amber-900 transition-colors shadow-xs"
                  >
                    {effectiveSubscriptionStatus === 'pending'
                      ? isAmharic
                        ? 'ሁኔታ እይ'
                        : 'View Status'
                      : isAmharic
                        ? 'እቅድ ምረጥ'
                        : 'Renew Subscription'}
                  </button>
                </div>
              )}

              {/* Meal Status Banner (Consolidated, no nested cards) */}
              <MealStatusCard mealContext={mealContext} pickupPoint={profile?.pickup_point} />

              {/* If Order Already Placed Today: Quick Locked Banner with Link to Orders */}
              {isSubscriptionActive && existingOrder && (
                <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-[#08795d] shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-[#08795d] uppercase tracking-wider">
                          {translateMealLabel(t, focusedMeal)} {t.orderLocked || 'Order Locked'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          ({t.oneMealPerWindow || '1 meal per window'})
                        </span>
                      </div>
                      <p className="text-sm font-extrabold text-slate-900 mt-0.5">
                        {existingOrder.menu?.name || 'Your selected dish'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f] transition-all shadow-xs"
                  >
                    <span>{isAmharic ? 'የጉዞ ሁኔታ እይ' : 'Track Delivery'}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Menu Section Heading */}
              <div className="flex items-center justify-between pt-1">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#101426] tracking-tight">
                    {formatMenuTitle(t, focusedMeal)}
                  </h2>
                  <p className="text-xs text-slate-500 font-normal">
                    {isAmharic
                      ? 'ለአሁኑ የምግብ ሰዓት ከተዘጋጁት ምግቦች አንዱን ይምረጡ'
                      : 'Choose your single dish for the current meal window'}
                  </p>
                </div>
              </div>

              {/* Menu Grid / Empty States */}
              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  <LoaderCircle className="w-6 h-6 animate-spin text-[#08795d] mx-auto mb-2" />
                  <span>Loading meal options...</span>
                </div>
              ) : isSubscriptionActive && !existingOrder && !DEV_MODE_ALWAYS_OPEN && mealContext.activeMeal !== focusedMeal ? (
                <EmptyState
                  title={`${translateMealLabel(t, focusedMeal)} ordering is currently closed.`}
                  description={
                    focusedMeal === 'Breakfast'
                      ? 'Breakfast window is 1:00 - 2:00 Local Time (7:00 - 8:00 AM).'
                      : focusedMeal === 'Lunch'
                        ? 'Lunch window is 5:00 - 7:00 Local Time (11:00 AM - 1:00 PM).'
                        : 'Dinner window is 11:00 - 1:00 Local Time (5:00 - 7:00 PM).'
                  }
                />
              ) : menuItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {menuItems.map((item) => (
                    <OrderCard
                      key={item.id}
                      item={item}
                      onOrder={handleOrderClick}
                      loading={submittingId === item.id}
                      isActiveWindow={true}
                      disabled={Boolean(existingOrder)}
                      isFavorite={favorites.includes(item.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  title={isAmharic ? 'ምንም ሜኑ አልተጨመረም' : 'No menu items yet'}
                  description={
                    isAmharic
                      ? 'ማኔጀሩ ለአሁኑ ሰዓት ምግብ እስካሁን አላስገባም።'
                      : `The cafeteria manager has not added any ${focusedMeal.toLowerCase()} items yet.`
                  }
                />
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FAVORITES (Eligible favorites for current window) */}
          {/* ======================================================== */}
          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[#101426] tracking-tight">
                    {t.yourFavorites || 'Your Favorites'}
                  </h2>
                  <p className="text-xs text-slate-500 font-normal">
                    {translateMealLabel(t, focusedMeal)} {t.menuTitle}
                  </p>
                </div>
              </div>

              {eligibleFavoriteDishes.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {eligibleFavoriteDishes.map((item) => (
                    <OrderCard
                      key={item.id}
                      item={item}
                      onOrder={handleOrderClick}
                      loading={submittingId === item.id}
                      isActiveWindow={true}
                      disabled={Boolean(existingOrder)}
                      isFavorite={true}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto">
                    <Heart className="w-6 h-6 stroke-rose-400" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.noFavorites || 'No favorite dishes for this meal yet.'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {t.addFavoritesFromHome || 'Tap the heart on any dish from the menu to save it here.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f] transition-all shadow-xs"
                  >
                    <span>{t.browseMenu || "Browse Today's Menu"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: ORDERS (Dedicated 3-Stage Order Progress Tracker)  */}
          {/* ======================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-[#101426] tracking-tight">
                    {isAmharic ? 'የትዕዛዝ ሁኔታ' : 'Active Order Status'}
                  </h2>
                  <p className="text-xs text-slate-500 font-normal">
                    {translateMealLabel(t, focusedMeal)} • {mealContext.currentDateLabel}
                  </p>
                </div>
              </div>

              {existingOrder ? (
                <div className="rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xs space-y-6">
                  {/* Dish Summary Header */}
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#08795d] uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-full">
                        {translateMealLabel(t, focusedMeal)}
                      </span>
                      <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">
                        {existingOrder.menu?.name || 'Selected Dish'}
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {isAmharic
                          ? 'ትዕዛዝዎ ተቀብለናል ወደ ማብሰያ ክፍል ተልኳል።'
                          : 'Your dish selection is locked in and dispatched with the campus batch.'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                        {t.status}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold mt-1 bg-emerald-100 text-emerald-800">
                        {existingOrder.status === 'Arrived'
                          ? t.arrived || 'Arrived'
                          : existingOrder.status === 'Packed'
                            ? t.packed || 'Packed'
                            : t.cookingInKitchen || 'Cooking'}
                      </span>
                    </div>
                  </div>

                  {/* 3-STAGE PROGRESS TIMELINE */}
                  <div className="py-2">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                      {isAmharic ? 'የእድገት ደረጃ' : 'Delivery Progress'}
                    </p>

                    <div className="grid grid-cols-3 gap-2 relative">
                      {/* Stage 1: Cooking in Kitchen */}
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all ${
                            existingOrder.status === 'Packed' || existingOrder.status === 'Arrived'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : 'bg-emerald-500 text-white ring-4 ring-emerald-100 animate-pulse'
                          }`}
                        >
                          {existingOrder.status === 'Packed' || existingOrder.status === 'Arrived' ? (
                            <Check className="w-5 h-5 stroke-[3]" />
                          ) : (
                            <ChefHat className="w-5 h-5" />
                          )}
                        </div>
                        <span className="text-xs font-bold text-slate-900 mt-2">
                          {t.cookingInKitchen || 'Cooking'}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight">
                          {isAmharic ? 'ካፊቴሪያ ማብሰያ' : 'Central Kitchen'}
                        </span>
                      </div>

                      {/* Stage 2: Packed */}
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all ${
                            existingOrder.status === 'Arrived'
                              ? 'bg-emerald-600 text-white shadow-sm'
                              : existingOrder.status === 'Packed'
                                ? 'bg-sky-600 text-white ring-4 ring-sky-100 animate-pulse'
                                : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          {existingOrder.status === 'Arrived' ? (
                            <Check className="w-5 h-5 stroke-[3]" />
                          ) : (
                            <Package className="w-5 h-5" />
                          )}
                        </div>
                        <span
                          className={`text-xs font-bold mt-2 ${
                            existingOrder.status === 'Packed' || existingOrder.status === 'Arrived'
                              ? 'text-slate-900'
                              : 'text-slate-400'
                          }`}
                        >
                          {t.packed || 'Packed'}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight">
                          {isAmharic ? 'በሚኒባስ ጉዞ ላይ' : 'En Route Minibus'}
                        </span>
                      </div>

                      {/* Stage 3: Arrived */}
                      <div className="flex flex-col items-center text-center">
                        <div
                          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all ${
                            existingOrder.status === 'Arrived'
                              ? 'bg-[#08795d] text-white ring-4 ring-emerald-200 shadow-md'
                              : 'bg-slate-100 text-slate-400'
                          }`}
                        >
                          <Truck className="w-5 h-5" />
                        </div>
                        <span
                          className={`text-xs font-bold mt-2 ${
                            existingOrder.status === 'Arrived' ? 'text-emerald-800' : 'text-slate-400'
                          }`}
                        >
                          {t.arrived || 'Arrived'}
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight">
                          Station {profile?.pickup_point || 'T22/T34'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stage Details Callout */}
                  <div
                    className={`rounded-xl p-3.5 text-xs ${
                      existingOrder.status === 'Arrived'
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 font-medium'
                        : existingOrder.status === 'Packed'
                          ? 'bg-sky-50 border border-sky-200 text-sky-900 font-medium'
                          : 'bg-amber-50/70 border border-amber-200/80 text-amber-900'
                    }`}
                  >
                    {existingOrder.status === 'Arrived'
                      ? t.arrivedDesc || 'Your food has arrived! Bring your Student ID to collect it from the minibus.'
                      : existingOrder.status === 'Packed'
                        ? t.packedDesc || 'Your meal is prepared, boxed into the delivery vehicle, and en route to campus.'
                        : t.cookingDesc || 'All cafeteria orders are cooked together before departure. When all meals are loaded into the minibus, this will change to Packed.'}
                  </div>

                  {/* Read-Only Pickup Station & Student ID Metadata */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {t.assignedPickupStation || 'Pickup Station'}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#08795d]" />
                        Building {profile?.pickup_point || 'T22 / T34'}
                      </span>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                        {t.studentId || 'Student ID'}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 flex items-center gap-1 mt-0.5">
                        <Fingerprint className="w-3.5 h-3.5 text-[#08795d]" />
                        {profile?.identity_number || 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <Package className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    {t.noActiveOrder || 'No active order'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    {t.noActiveOrderDesc || 'Your confirmed meal order and live delivery progress will appear here.'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('home')}
                    className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f] transition-all shadow-xs"
                  >
                    <span>{t.browseMenu || "Browse Today's Menu"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: PROFILE (Account, Subscription & Renewal Flow)    */}
          {/* ======================================================== */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-extrabold text-[#101426] tracking-tight">
                {t.profile || 'Student Profile'}
              </h2>

              {/* Student Identity Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-amber-100 text-[#08795d] font-black text-xl flex items-center justify-center shrink-0 shadow-xs">
                    {profile?.name ? profile.name.charAt(0).toUpperCase() : 'S'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-bold text-slate-900 truncate">
                      {profile?.name || 'Student Name'}
                    </h3>
                    <p className="text-xs text-slate-500">{profile?.phone || 'Phone number'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        ID: {profile?.identity_number || 'N/A'}
                      </span>
                      <span className="text-[11px] font-semibold text-[#08795d] bg-emerald-50 px-2 py-0.5 rounded-md">
                        Dorm: Building {profile?.pickup_point || 'T22'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subscription Summary Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">
                    {t.subscriptionDetails || 'Subscription Details'}
                  </h3>
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                      isSubscriptionActive
                        ? 'bg-emerald-100 text-emerald-800'
                        : effectiveSubscriptionStatus === 'pending'
                          ? 'bg-sky-100 text-sky-800'
                          : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isSubscriptionActive
                      ? 'Active'
                      : effectiveSubscriptionStatus === 'pending'
                        ? 'Pending'
                        : 'Expired'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">
                      {t.mealCredits}
                    </span>
                    <span className="text-xl font-black text-[#08795d]">
                      {daysRemaining} {t.remaining}
                    </span>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {t.daysRemainingLabel || 'Status'}
                    </span>
                    <span className="text-sm font-bold text-slate-800">
                      {isSubscriptionActive
                        ? '30-Day Plan Active'
                        : effectiveSubscriptionStatus === 'pending'
                          ? 'Verification in Progress'
                          : 'Renewal Required'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Pending Verification Notice */}
              {effectiveSubscriptionStatus === 'pending' && (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 flex items-start gap-3">
                  <LoaderCircle className="w-5 h-5 text-sky-700 animate-spin shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-sky-900">{t.pendingVer}</h4>
                    <p className="text-xs text-sky-800 mt-1 leading-relaxed">
                      Payment Submitted. We are verifying your transaction reference (
                      <strong>{profile?.last_transaction_ref}</strong>). Your dashboard will unlock once
                      the cafeteria manager approves it.
                    </p>
                  </div>
                </div>
              )}

              {/* Four-Step Renewal Process (When expired or unsubscribed) */}
              {!isSubscriptionActive && effectiveSubscriptionStatus !== 'pending' && (
                <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-xs space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="text-base font-bold text-slate-900">
                      {isAmharic ? 'የወር የምግብ እቅድ መሙያ' : 'Renew Monthly Meal Subscription'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isAmharic
                        ? 'እቅድ ይምረጡ፣ በCBE ወይም Telebirr ይክፈሉ እና ደረሰኝ ያስገቡ'
                        : 'Choose plan, transfer via CBE/Telebirr, and submit reference proof'}
                    </p>
                  </div>

                  {/* Step 1: Choose Plan */}
                  <div className="space-y-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Step 1: Choose Meal Plan
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedPlan('2meals')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedPlan === '2meals'
                            ? 'border-[#08795d] bg-emerald-50/70 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 block">2 Meals / Day</span>
                        <span className="text-sm font-black text-[#08795d] block mt-0.5">4,500 Birr</span>
                        <span className="text-[10px] text-slate-500">Lunch & Dinner (30 Days)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedPlan('3meals')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          selectedPlan === '3meals'
                            ? 'border-[#08795d] bg-emerald-50/70 ring-2 ring-emerald-500/20'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <span className="text-xs font-bold text-slate-900 block">3 Meals / Day</span>
                        <span className="text-sm font-black text-[#08795d] block mt-0.5">6,700 Birr</span>
                        <span className="text-[10px] text-slate-500">Breakfast, Lunch & Dinner</span>
                      </button>
                    </div>
                  </div>

                  {/* Step 2: Transfer Details */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                      Step 2: Transfer to Cafeteria Account
                    </span>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {/* CBE */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">CBE Account</span>
                          <span className="text-xs font-bold text-slate-900 block select-all">1000690418917</span>
                          <span className="text-[10px] text-slate-500 truncate block">Biniyam Yimen Tilahun</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount('1000690418917', 'cbe')}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          {copiedBank === 'cbe' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      {/* Telebirr */}
                      <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">Telebirr Phone</span>
                          <span className="text-xs font-bold text-slate-900 block select-all">0950271983</span>
                          <span className="text-[10px] text-slate-500 truncate block">Biniam</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopyAccount('0950271983', 'telebirr')}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                        >
                          {copiedBank === 'telebirr' ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rejection Warning if applicable */}
                  {profile?.payment_rejection_reason && (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                      <strong>Payment Rejected:</strong> {profile.payment_rejection_reason}
                    </div>
                  )}

                  {/* Step 3 & 4: Form Submission */}
                  <form onSubmit={handlePaymentSubmit} className="space-y-3 pt-2 border-t border-slate-100">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Step 3: {t.enterRef}
                      </label>
                      <input
                        className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-[#f5f5f7] focus:outline-none focus:border-[#08795d]"
                        value={paymentReference}
                        onChange={(e) => setPaymentReference(e.target.value)}
                        placeholder="Example: CBE123456789 or Telebirr Txn ID"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                        Step 4: Attach Receipt Screenshot
                      </label>
                      {!receiptPreview ? (
                        <label className="flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100 cursor-pointer transition">
                          <Upload className="w-5 h-5 text-[#08795d] mb-1" />
                          <span className="text-xs font-bold text-slate-800">
                            Upload Telebirr / CBE Screenshot
                          </span>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleReceiptChange}
                          />
                        </label>
                      ) : (
                        <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center justify-between gap-3 shadow-xs">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img
                              src={receiptPreview}
                              alt="Receipt"
                              className="h-10 w-10 object-cover rounded-lg border border-slate-200"
                            />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 truncate">
                                {receiptFile?.name || 'screenshot.jpg'}
                              </p>
                              <p className="text-[10px] text-emerald-700 font-semibold">
                                ✓ Ready to verify
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveReceipt}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingPayment}
                      className="w-full h-12 rounded-xl bg-[#08795d] text-white font-bold text-xs sm:text-sm hover:bg-[#07684f] shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isSubmittingPayment ? (
                        <>
                          <LoaderCircle className="w-4 h-4 animate-spin text-white" />
                          <span>Submitting payment proof...</span>
                        </>
                      ) : (
                        <span>{t.submit}</span>
                      )}
                    </button>
                  </form>
                </div>
              )}

              {/* Language Switcher in Profile */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{t.languageSetting || 'Language / ቋንቋ'}</h4>
                  <p className="text-xs text-slate-500">
                    {language === 'en' ? 'English is active' : 'አማርኛ ቋንቋ በርቷል'}
                  </p>
                </div>
                <LanguageToggle />
              </div>

              {/* Account Actions: Refresh & Sign Out */}
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {t.accountActions || 'Account Actions'}
                </h4>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 text-slate-700 text-xs font-semibold transition"
                >
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#08795d]" />
                    {t.refresh}
                  </span>
                  <span className="text-[10px] text-slate-400">Sync latest</span>
                </button>

                <button
                  type="button"
                  onClick={signOut}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-rose-50 text-rose-600 text-xs font-semibold transition"
                >
                  <span className="flex items-center gap-2">
                    <LogOut className="w-4 h-4" />
                    {t.signOut}
                  </span>
                  <span className="text-[10px] text-rose-400">Exit account</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ======================================================== */}
      {/* MOBILE FIXED BOTTOM NAVIGATION BAR (md:hidden)           */}
      {/* ======================================================== */}
      <nav
        className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200/80 shadow-lg px-2 py-1.5 flex items-center justify-around md:hidden pb-[max(8px,env(safe-area-inset-bottom))]"
        aria-label="Mobile Bottom Navigation"
      >
        {/* Home */}
        <button
          type="button"
          onClick={() => setActiveTab('home')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] transition-colors ${
            activeTab === 'home' ? 'text-[#08795d]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Home className={`w-5 h-5 ${activeTab === 'home' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'home' ? 'font-bold' : 'font-medium'}`}>
            {t.home || 'Home'}
          </span>
        </button>

        {/* Favorites */}
        <button
          type="button"
          onClick={() => setActiveTab('favorites')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] relative transition-colors ${
            activeTab === 'favorites' ? 'text-[#08795d]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Heart
            className={`w-5 h-5 ${
              activeTab === 'favorites'
                ? 'stroke-[2.5]'
                : favorites.length > 0
                  ? 'text-rose-500 fill-rose-500 stroke-[1.8]'
                  : 'stroke-[1.8]'
            }`}
          />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'favorites' ? 'font-bold' : 'font-medium'}`}>
            {t.favorites || 'Favorites'}
          </span>
          {favorites.length > 0 && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-rose-500" />
          )}
        </button>

        {/* Orders */}
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] relative transition-colors ${
            activeTab === 'orders' ? 'text-[#08795d]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Package className={`w-5 h-5 ${activeTab === 'orders' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'orders' ? 'font-bold' : 'font-medium'}`}>
            {t.orders || 'Orders'}
          </span>
          {existingOrder && (
            <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
          )}
        </button>

        {/* Profile */}
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] transition-colors ${
            activeTab === 'profile' ? 'text-[#08795d]' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <UserRound className={`w-5 h-5 ${activeTab === 'profile' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          <span className={`text-[10px] mt-0.5 ${activeTab === 'profile' ? 'font-bold' : 'font-medium'}`}>
            {t.profile || 'Profile'}
          </span>
        </button>
      </nav>

      {/* ======================================================== */}
      {/* ORDER CONFIRMATION MODAL                                  */}
      {/* ======================================================== */}
      {selectedFood && isSubscriptionActive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 font-campus animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-[#08795d] flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {t.confirmOrder || 'Confirm Order'}
                </h3>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#08795d]">
                  {translateMealLabel(t, selectedFood.meal_type)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <p className="text-sm font-bold text-slate-900">{selectedFood.name}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {isAmharic
                  ? `የመቀበያ ቦታዎ፡ ህንፃ ${profile?.pickup_point || 'T22'}`
                  : `Delivering to Station: Building ${profile?.pickup_point || 'T22'}`}
              </p>
            </div>

            <p className="mt-3 text-xs text-slate-500 leading-relaxed">
              {isAmharic
                ? 'አንዴ ካረጋገጡ በኋላ ለዚህ የምግብ ሰዓት ሌላ ማዘዝ አይቻልም።'
                : 'Confirming locks your selection for this active meal window. Each student is allowed 1 meal portion.'}
            </p>

            <div className="mt-5 flex items-center gap-2.5">
              <button
                type="button"
                className="flex-1 h-11 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                onClick={() => setSelectedFood(null)}
                disabled={submittingId === selectedFood.id}
              >
                {t.cancel || 'Cancel'}
              </button>
              <button
                type="button"
                className="flex-1 h-11 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f] shadow-sm transition disabled:opacity-50"
                onClick={handleConfirmOrder}
                disabled={submittingId === selectedFood.id}
              >
                {submittingId === selectedFood.id ? 'Submitting...' : t.confirmOrder || 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ARRIVAL NOTIFICATION MODAL (Preserved with sound chime)   */}
      {/* ======================================================== */}
      {arrivalNotice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 backdrop-blur-xs px-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl font-campus text-center animate-fadeIn border border-emerald-200">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-[#08795d] flex items-center justify-center mx-auto mb-3 shadow-sm">
              <BellRing className="w-7 h-7 text-[#08795d]" />
            </div>

            <span className="text-xs font-bold uppercase tracking-widest text-[#08795d]">
              {isAmharic ? 'ምግብዎ ደርሷል!' : 'Food Is Here!'}
            </span>

            <h2 className="text-xl font-extrabold text-slate-900 mt-1">
              {isAmharic ? 'ምግብዎ ለመቀበል ዝግጁ ነው' : 'Your meal is ready for pickup'}
            </h2>

            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              {isAmharic ? (
                <>
                  እባክዎ የተማሪ መታወቂያዎን ይዘው ወደ{' '}
                  <strong>ህንፃ {arrivalNotice.pickupPoint}</strong> ሚኒባስ በመሄድ{' '}
                  <strong>{arrivalNotice.foodName}</strong> ይረከቡ።
                </>
              ) : (
                <>
                  Your food has arrived! Please head outside to the{' '}
                  <strong>Building {arrivalNotice.pickupPoint}</strong> Minibus with your Student ID
                  to collect your <strong>{arrivalNotice.foodName}</strong>.
                </>
              )}
            </p>

            <button
              type="button"
              className="mt-6 w-full h-11 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f] shadow-md transition"
              onClick={handleDismissArrivalNotice}
            >
              {isAmharic ? 'ተረድቻለሁ!' : 'Got it!'}
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* FLOATING TOAST NOTIFICATION                             */}
      {/* ======================================================== */}
      {toastMessage && (
        <div className="pointer-events-none fixed inset-x-0 bottom-20 md:bottom-8 z-[70] flex justify-center px-4">
          <div className="max-w-md rounded-2xl bg-slate-900/90 backdrop-blur px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xl animate-fadeIn">
            {toastMessage}
          </div>
        </div>
      )}
    </div>
  );
}
