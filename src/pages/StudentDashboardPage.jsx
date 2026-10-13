import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, CheckCircle2, ChefHat, Clock3, CreditCard, Fingerprint, Image as ImageIcon, Landmark, LoaderCircle, LogOut, Package, RefreshCw, Smartphone, Sparkles, Truck, Upload, UserRound, X } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { playNotificationChime } from '../lib/sound.js';
import { supabase } from '../lib/supabase.js';
import { getSubscriptionDaysRemaining, getEffectiveSubscriptionStatus, isSubscriptionCurrentlyActive } from '../lib/subscription.js';
import { DEV_MODE_ALWAYS_OPEN, getMealWindowState } from '../lib/time.js';
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
    const syncMealContext = () => setMealContext(getMealWindowState());
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
        language === 'am'
          ? 'ይህ ምግብ ለዛሬ አልቋል። እባክዎ ሌላ ምግብ ይምረጡ።'
          : 'This meal is currently sold out. Please choose another option.'
      );
      return;
    }

    if (!DEV_MODE_ALWAYS_OPEN && mealContext.activeMeal !== item.meal_type) {
      const nextOpenTime = mealContext.nextMealStartsAt ?? 'the next local meal window';
      const mealLabel = translateMealLabel(t, item.meal_type);
      setToastMessage(
        language === 'am'
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

  return (
    <div className="min-h-screen px-2 py-2 md:px-6 md:py-8 lg:px-10">
      <div className="mx-auto max-w-6xl space-y-2 pb-24 md:space-y-6">
        <header className="panel w-full px-5 py-6 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-100 via-white to-amber-100 p-3 text-emerald-800 shadow-sm">
                  <UserRound className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    {t.welcomeBack}
                  </p>
                  <h1 className="mt-1 bg-gradient-to-r from-slate-950 via-emerald-800 to-amber-700 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
                    {profile?.name ? `${t.hello} ${profile.name}` : t.mealCredits}
                  </h1>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-secondary" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t.refresh}
              </button>
              <button type="button" className="btn-secondary" onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {t.signOut}
              </button>
              <LanguageToggle />
            </div>
          </div>
        </header>

        {isSubscriptionActive ? (
          <div className="w-full rounded-3xl border border-emerald-200 bg-emerald-50 px-5 py-4 md:rounded-2xl md:px-4 md:py-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex rounded-full bg-emerald-700 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white">
                {t.mealCredits}
              </span>
              <p className="text-sm text-emerald-900">
                {daysRemaining} {t.remaining}
              </p>
            </div>
          </div>
        ) : null}

        {isSubscriptionActive ? (
          <MealStatusCard mealContext={mealContext} pickupPoint={profile?.pickup_point} />
        ) : null}


        {error ? (
          <div className="w-full rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 md:rounded-2xl md:px-4 md:py-3">
            {error}
          </div>
        ) : null}

        {!isSubscriptionActive && effectiveSubscriptionStatus !== 'pending' ? (
          <section className="panel w-full px-5 py-6 md:p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-amber-100 p-3">
                <CreditCard className="h-6 w-6 text-amber-800" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{t.subRequired}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">{t.subExpiredMsg}</p>

                <div className="mt-5 space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Step 1: Choose Your Monthly Meal Plan
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('2meals')}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition ${
                        selectedPlan === '2meals'
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-900">2 Meals / Day</span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          4,500 Birr
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Lunch & Dinner (30 Days)</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedPlan('3meals')}
                      className={`flex flex-col text-left p-4 rounded-2xl border transition ${
                        selectedPlan === '3meals'
                          ? 'border-emerald-600 bg-emerald-50/80 ring-2 ring-emerald-600/20'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="font-bold text-slate-900">3 Meals / Day</span>
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                          6,700 Birr
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-slate-600">Breakfast, Lunch & Dinner (30 Days)</p>
                    </button>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-emerald-100 bg-gradient-to-r from-slate-50 via-white to-emerald-50 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                    Step 2: Transfer to Cafeteria Account
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-emerald-100 p-2.5">
                          <Landmark className="h-5 w-5 text-emerald-800" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">CBE Account</p>
                          <p className="text-base font-bold text-slate-950 select-all">1000690418917</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Holder: <strong className="text-slate-800">Biniyam Yimen Tilahun</strong>
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex items-center gap-3">
                        <div className="rounded-xl bg-sky-100 p-2.5">
                          <Smartphone className="h-5 w-5 text-sky-800" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Telebirr Phone</p>
                          <p className="text-base font-bold text-slate-950 select-all">0950271983</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Name: <strong className="text-slate-800">Biniam</strong>
                      </p>
                    </div>
                  </div>
                </div>

                {profile?.payment_rejection_reason ? (
                  <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    <strong>Payment Rejected:</strong> {profile.payment_rejection_reason}
                  </div>
                ) : null}

                <form className="mt-6 space-y-4" onSubmit={handlePaymentSubmit}>
                  <label className="block space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Step 3: {t.enterRef}
                    </span>
                    <input
                      className="input"
                      value={paymentReference}
                      onChange={(event) => setPaymentReference(event.target.value)}
                      placeholder="Example: CBE123456789 or Telebirr Txn ID"
                    />
                  </label>

                  <div className="space-y-2">
                    <span className="text-sm font-medium text-slate-700">
                      Step 4: Attach Receipt / Screenshot (Recommended)
                    </span>

                    {!receiptPreview ? (
                      <label className="flex flex-col items-center justify-center p-4 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50/70 hover:bg-slate-100/80 hover:border-emerald-500 cursor-pointer transition">
                        <Upload className="h-6 w-6 text-emerald-700 mb-1" />
                        <span className="text-sm font-semibold text-slate-800">
                          Click to upload receipt or snap photo
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Upload your Telebirr / CBE transaction screenshot
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
                      <div className="rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-3 shadow-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={receiptPreview}
                            alt="Receipt Preview"
                            className="h-14 w-14 object-cover rounded-xl border border-slate-200"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {receiptFile?.name || 'receipt-screenshot.jpg'}
                            </p>
                            <p className="text-xs text-emerald-700 font-medium">
                              ✓ Ready to upload with verification
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleRemoveReceipt}
                          className="rounded-xl p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                          title="Remove screenshot"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn-primary w-full"
                    disabled={isSubmittingPayment}
                  >
                    {isSubmittingPayment ? (
                      <>
                        <LoaderCircle className="mr-2 h-4 w-4 animate-spin" />
                        Submitting payment for verification...
                      </>
                    ) : (
                      t.submit
                    )}
                  </button>
                </form>
              </div>
            </div>
          </section>
        ) : null}

        {!isSubscriptionActive && effectiveSubscriptionStatus === 'pending' ? (
          <section className="panel w-full px-5 py-6 md:p-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-sky-100 p-3">
                <LoaderCircle className="h-6 w-6 animate-spin text-sky-800" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t.pendingVer}</h2>
                <p className="mt-2 max-w-2xl text-sm text-slate-600">
                  Payment Submitted. We are verifying your transaction reference (
                  <strong>{profile?.last_transaction_ref}</strong>). Your dashboard will unlock once
                  the manager approves it.
                </p>
              </div>
            </div>
          </section>
        ) : null}

        {isSubscriptionActive && existingOrder ? (
          <div className="panel w-full px-5 py-6 md:p-8 border-emerald-400 shadow-[0_20px_60px_-25px_rgba(5,150,105,0.35)]">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="flex items-start gap-4">
                <div className="rounded-2xl bg-emerald-100 p-3.5 text-emerald-800">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800 uppercase tracking-wide">
                      {translateMealLabel(t, focusedMeal)} Order Locked
                    </span>
                    <span className="text-xs text-slate-400 font-medium">1 of 1 Meal</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                    {existingOrder.menu?.name || 'Your Selected Dish'}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1">
                    Your {translateMealLabel(t, focusedMeal)?.toLowerCase()} selection has been placed and confirmed. The menu is closed for this meal.
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 px-4 py-3 self-start sm:self-auto text-right">
                <p className="text-xs uppercase tracking-wider text-slate-500 font-semibold">{t.status}</p>
                <div className="mt-1">
                  {existingOrder.status === 'Arrived' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                      {t.arrived || 'Arrived'}
                    </span>
                  ) : existingOrder.status === 'Packed' ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                      <span className="h-2 w-2 rounded-full bg-sky-600 animate-pulse" />
                      {t.packed || 'Packed'}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                      <span className="h-2 w-2 rounded-full bg-amber-600" />
                      {t.cookingInKitchen || 'Cooking in Kitchen'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Real-time Order Status (Packed & Arrived) */}
            <div className="mt-6">
              {existingOrder.status === 'Arrived' ? (
                <div className="rounded-2xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-50 via-white to-emerald-50 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-md">
                      <Truck className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-800">
                          <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                          {t.arrived || 'Arrived at Campus'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          Station: Building {profile?.pickup_point || 'T22 / T34'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                        {t.arrivedTitle || 'Food Arrived at Pickup Station!'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {t.arrivedDesc ||
                          'Your food has arrived! Bring your Student ID to collect it from the minibus.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : existingOrder.status === 'Packed' ? (
                <div className="rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-50 via-white to-sky-50 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
                      <Package className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-sky-800">
                          <span className="h-2 w-2 rounded-full bg-sky-600 animate-ping" />
                          {t.packed || 'Packed'}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          En Route to Campus
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-extrabold text-slate-900">
                        {t.packedOnWay || 'Packed & On The Way'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {t.packedDesc ||
                          'Your meal is prepared, boxed into the delivery vehicle, and en route to campus.'}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/70 via-white to-amber-50/50 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-sm">
                      <ChefHat className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800">
                          {t.cookingInKitchen || 'Cooking in Kitchen'}
                        </span>
                      </div>
                      <h3 className="mt-2 text-xl font-bold text-slate-900">
                        {t.cookingInKitchen || 'Cooking in Kitchen'}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600">
                        {t.cookingDesc ||
                          'All cafeteria orders are cooked together before departure. When all meals are loaded into the minibus, this will change to Packed.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pickup Location Reminder */}
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-slate-50 border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-200 text-emerald-700">
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Pickup Station</p>
                  <p className="text-sm font-bold text-slate-900">
                    Building {profile?.pickup_point || 'T22 / T34'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-white shadow-sm border border-slate-200 text-emerald-700">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Student ID</p>
                  <p className="text-sm font-bold text-slate-900">
                    {profile?.identity_number || 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {!isSubscriptionActive ? (
          <section className="panel w-full overflow-hidden p-0">
            <div className="bg-gradient-to-r from-amber-100 via-white to-emerald-100 px-5 py-6 md:px-6 lg:px-8">
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-700">
                How CampusFood Works
              </p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-950">
                Built for fast campus pickup, not cafeteria queues.
              </h2>
              <p className="mt-3 max-w-2xl text-sm text-slate-600">
                Once your monthly plan is approved, ordering opens instantly and your meal is routed
                to the correct pickup point for the current service window.
              </p>
            </div>

            <div className="grid gap-3 bg-slate-50 px-5 py-6 md:grid-cols-3 md:gap-4 md:p-6">
              <article className="soft-panel border border-amber-100 bg-amber-50/70 p-5">
                <div className="inline-flex rounded-2xl bg-amber-200 p-3 text-amber-900">
                  <Clock3 className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-950">Strict Meal Windows.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  We operate on Ethiopian Local Time. Breakfast is 1:00 - 2:00 Local Time, Lunch
                  is 5:00 - 7:00 Local Time, and Dinner is 11:00 - 1:00 Local Time. Order before
                  the cutoff!
                </p>
              </article>

              <article className="soft-panel border border-sky-100 bg-sky-50/70 p-5">
                <div className="inline-flex rounded-2xl bg-sky-200 p-3 text-sky-900">
                  <Truck className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-950">Direct Minibus Delivery.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  All orders are freshly prepared in our city cafeteria and delivered directly to your
                  campus pickup points at T22 (Female Building) and T34 (Male Building).
                </p>
              </article>

              <article className="soft-panel border border-emerald-100 bg-emerald-50/70 p-5">
                <div className="inline-flex rounded-2xl bg-emerald-200 p-3 text-emerald-900">
                  <Fingerprint className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-slate-950">Your Unique ID.</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Always remember your Permanent Identity Number. You will use this number to quickly
                  claim your specific meal box from the delivery driver.
                </p>
              </article>
            </div>
          </section>
        ) : null}

        {isSubscriptionActive && !existingOrder && !DEV_MODE_ALWAYS_OPEN && mealContext.activeMeal !== focusedMeal ? (
          <EmptyState
            title={`${translateMealLabel(t, focusedMeal)} ordering is currently closed.`}
            description={
              focusedMeal === 'Breakfast'
                ? 'Breakfast window is 1:00 - 2:00 Local Time (7:00 - 8:00 AM). Ordering will open automatically during this window.'
                : focusedMeal === 'Lunch'
                ? 'Lunch window is 5:00 - 7:00 Local Time (11:00 AM - 1:00 PM). Ordering will open automatically during this window.'
                : 'Dinner window is 11:00 - 1:00 Local Time (5:00 - 7:00 PM). Ordering will open automatically during this window.'
            }
          />
        ) : null}

        {isSubscriptionActive && !existingOrder && (DEV_MODE_ALWAYS_OPEN || mealContext.activeMeal === focusedMeal) ? (
          <section className="space-y-4">
            <div className="px-5 md:px-0">
              <h2 className="text-2xl font-bold">
                {formatMenuTitle(t, focusedMeal)}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Choose one item for the current active meal window. Once confirmed, your selection will be locked in.
              </p>
            </div>

            {loading ? (
              <div className="panel w-full px-5 py-8 text-center text-sm text-slate-600 md:px-8">
                Loading meal options...
              </div>
            ) : menuItems.length ? (
              <div className="grid gap-3 md:grid-cols-2 md:gap-4 xl:grid-cols-3">
                {menuItems.map((item) => (
                  <OrderCard
                    key={item.id}
                    item={item}
                    onOrder={handleOrderClick}
                    loading={submittingId === item.id}
                    isActiveWindow={true}
                    disabled={Boolean(existingOrder)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="No menu items yet"
                description={`The manager has not added any ${focusedMeal.toLowerCase()} items yet.`}
              />
            )}
          </section>
        ) : null}
      </div>

      {selectedFood && isSubscriptionActive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-6">
          <div className="panel w-full max-w-md p-6">
            <h3 className="text-2xl font-bold">Confirm order</h3>
            <p className="mt-3 text-sm text-slate-600">
              Confirm your order: <strong>{selectedFood.name}</strong> for{' '}
              <strong>{selectedFood.meal_type}</strong>
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={() => setSelectedFood(null)}
                disabled={submittingId === selectedFood.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleConfirmOrder}
                disabled={submittingId === selectedFood.id}
              >
                {submittingId === selectedFood.id ? 'Submitting...' : 'Confirm Order'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {arrivalNotice ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/70 px-6">
          <div className="panel w-full max-w-lg p-6 sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-3xl bg-emerald-100 p-4">
                <BellRing className="h-7 w-7 text-emerald-800" />
              </div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
                  Food Is Here!
                </p>
                <h2 className="mt-2 text-3xl font-extrabold tracking-tight">
                  Your meal is ready for pickup.
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Your food has arrived! Please head outside to the{' '}
                  <strong>{arrivalNotice.pickupPoint}</strong> Minibus to pick up your{' '}
                  <strong>{arrivalNotice.foodName}</strong>.
                </p>
              </div>
            </div>

            <button
              type="button"
              className="btn-primary mt-8 w-full"
              onClick={handleDismissArrivalNotice}
            >
              Got it!
            </button>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[70] flex justify-center px-4">
          <div className="max-w-md rounded-2xl bg-slate-800 px-5 py-3 text-center text-sm font-medium text-white shadow-xl">
            {toastMessage}
          </div>
        </div>
      ) : null}
    </div>
  );
}
