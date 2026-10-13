import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import { BadgeCheck, Ban, CheckCircle2, ChefHat, ExternalLink, Eye, LogOut, Package, Plus, RefreshCw, Trash2, Truck, Wallet, X } from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getSubscriptionDaysRemaining } from '../lib/subscription.js';
import { supabase } from '../lib/supabase.js';
import { getMealWindowState } from '../lib/time.js';
import { formatTotalsTitle } from '../lib/translations.js';
import EmptyState from '../components/EmptyState.jsx';
import MealStatusCard from '../components/MealStatusCard.jsx';

const REJECTION_REASON_OPTIONS = [
  'Invalid reference number',
  'Payment not found',
  'Insufficient payment amount',
];

const TABS = [
  { id: 'kitchen', label: 'Kitchen View', icon: ChefHat },
  { id: 'packing', label: 'Packing / Dispatch', icon: Package },
  { id: 'menu', label: 'Menu Management', icon: Truck },
  { id: 'subscriptions', label: 'Subscriptions', icon: Wallet },
];

const PICKUP_LABELS = {
  T22: 'T22 - Female Building',
  T34: 'T34 - Male Building',
};

export default function ManagerDashboardPage() {
  const { profile, signOut } = useAuth();
  const { t, language } = useLanguage();
  const [mealContext, setMealContext] = useState(() => getMealWindowState());
  const [activeTab, setActiveTab] = useState('kitchen');
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState([]);
  const [activeSubscriptions, setActiveSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [menuName, setMenuName] = useState('');
  const [menuMealType, setMenuMealType] = useState('Breakfast');
  const [menuMaxServings, setMenuMaxServings] = useState('');
  const [menuFilter, setMenuFilter] = useState('All');
  const [savingMenu, setSavingMenu] = useState(false);
  const [togglingMenuId, setTogglingMenuId] = useState(null);
  const [subscriptionActionId, setSubscriptionActionId] = useState(null);
  const [dispatchingPickup, setDispatchingPickup] = useState(null);
  const [packingAllOrders, setPackingAllOrders] = useState(false);
  const [rejectingStudent, setRejectingStudent] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewingReceiptStudent, setViewingReceiptStudent] = useState(null);

  const focusedMeal = mealContext.focusMeal;

  const loadDashboard = useCallback(
    async (silent = false) => {
      try {
        if (!silent) setLoading(true);
        setError('');

        const [ordersResult, menuResult, pendingSubscriptionsResult, activeSubscriptionsResult] =
          await Promise.all([
            focusedMeal
              ? supabase
                  .from('orders')
                  .select(
                    'id, status, meal_type, order_date, created_at, menu:menu_id(id, name), user:user_id(id, name, phone, identity_number, pickup_point)',
                  )
                  .eq('meal_type', focusedMeal)
                  .eq('order_date', mealContext.focusDate)
                  .order('created_at', { ascending: true })
              : Promise.resolve({ data: [], error: null }),
            supabase.from('menu').select('*').order('meal_type').order('name'),
            supabase
              .from('users')
              .select('id, name, phone, last_transaction_ref, receipt_url, updated_at')
              .eq('is_manager', false)
              .eq('subscription_status', 'pending')
              .order('updated_at', { ascending: false }),
            supabase
              .from('users')
              .select('id, name, subscription_end_date')
              .eq('is_manager', false)
              .eq('subscription_status', 'active')
              .order('subscription_end_date', { ascending: true }),
          ]);

        if (ordersResult.error) {
          throw ordersResult.error;
        }

        if (menuResult.error) {
          throw menuResult.error;
        }

        if (pendingSubscriptionsResult.error) {
          throw pendingSubscriptionsResult.error;
        }

        if (activeSubscriptionsResult.error) {
          throw activeSubscriptionsResult.error;
        }

        setOrders(ordersResult.data ?? []);
        setMenuItems(menuResult.data ?? []);
        setPendingSubscriptions(pendingSubscriptionsResult.data ?? []);
        setActiveSubscriptions(activeSubscriptionsResult.data ?? []);
      } catch (loadError) {
        setError(loadError.message || 'Unable to load manager dashboard.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [focusedMeal, mealContext.focusDate],
  );

  useEffect(() => {
    const syncMealContext = () => setMealContext(getMealWindowState());
    syncMealContext();
    const timer = window.setInterval(syncMealContext, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  // Realtime Supabase channel + polling fallback for manager
  useEffect(() => {
    if (!supabase) return undefined;

    const channel = supabase
      .channel('manager-dashboard-live-channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        void loadDashboard(true);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
        void loadDashboard(true);
      })
      .subscribe();

    const intervalTimer = window.setInterval(() => {
      void loadDashboard(true);
    }, 10000);

    return () => {
      window.clearInterval(intervalTimer);
      void supabase.removeChannel(channel);
    };
  }, [loadDashboard]);

  const kitchenTotals = useMemo(() => {
    return orders.reduce((accumulator, order) => {
      const itemName = order.menu?.name ?? 'Unknown item';
      accumulator[itemName] = (accumulator[itemName] ?? 0) + 1;
      return accumulator;
    }, {});
  }, [orders]);

  const groupedOrders = useMemo(
    () => ({
      T22: orders.filter((order) => order.user?.pickup_point === 'T22'),
      T34: orders.filter((order) => order.user?.pickup_point === 'T34'),
    }),
    [orders],
  );

  const pendingOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status === 'Pending').length;
  }, [orders]);

  const t22PendingArrivalCount = useMemo(() => {
    return (groupedOrders['T22'] || []).filter((o) => o.status !== 'Arrived').length;
  }, [groupedOrders]);

  const t34PendingArrivalCount = useMemo(() => {
    return (groupedOrders['T34'] || []).filter((o) => o.status !== 'Arrived').length;
  }, [groupedOrders]);



  const handleMarkAllPacked = async () => {
    const pendingOrderIds = orders
      .filter((order) => order.status === 'Pending')
      .map((order) => order.id);

    if (!pendingOrderIds.length) {
      return;
    }

    try {
      setPackingAllOrders(true);
      setError('');

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Packed' })
        .in('id', pendingOrderIds);

      if (updateError) {
        throw updateError;
      }

      await loadDashboard(true);
    } catch (err) {
      setError(err.message || 'Unable to mark all orders as packed.');
    } finally {
      setPackingAllOrders(false);
    }
  };

  const handlePickupArrival = async (pickupKey) => {
    const targetOrders = (groupedOrders[pickupKey] || []).filter((order) => order.status !== 'Arrived');
    const orderIds = targetOrders.map((order) => order.id);

    if (!orderIds.length) {
      return;
    }

    try {
      setDispatchingPickup(pickupKey);
      setError('');

      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Arrived' })
        .in('id', orderIds);

      if (updateError) {
        throw updateError;
      }

      await loadDashboard(true);
    } catch (updateFailure) {
      setError(updateFailure.message || `Unable to mark ${pickupKey} as arrived.`);
    } finally {
      setDispatchingPickup(null);
    }
  };

  const handleMenuSubmit = async (event) => {
    event.preventDefault();

    if (!menuName.trim()) {
      setError('Menu item name is required.');
      return;
    }

    try {
      setSavingMenu(true);
      setError('');

      const parsedLimit = menuMaxServings.trim() ? parseInt(menuMaxServings.trim(), 10) : null;
      const maxServingsVal = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : null;

      const { error: insertError } = await supabase.from('menu').insert({
        name: menuName.trim(),
        meal_type: menuMealType,
        max_servings: maxServingsVal,
        is_sold_out: false,
      });

      if (insertError) {
        throw insertError;
      }

      setMenuName('');
      setMenuMaxServings('');
      await loadDashboard();
    } catch (submitError) {
      setError(submitError.message || 'Unable to add menu item.');
    } finally {
      setSavingMenu(false);
    }
  };

  const handleToggleSoldOut = async (menuItem) => {
    try {
      setTogglingMenuId(menuItem.id);
      setError('');

      const nextStatus = !menuItem.is_sold_out;
      const { error: updateError } = await supabase
        .from('menu')
        .update({ is_sold_out: nextStatus })
        .eq('id', menuItem.id);

      if (updateError) {
        throw updateError;
      }

      await loadDashboard();
    } catch (toggleFailure) {
      setError(toggleFailure.message || 'Unable to update item sold-out status.');
    } finally {
      setTogglingMenuId(null);
    }
  };

  const handleDeleteMenu = async (id) => {
    try {
      const { error: deleteError } = await supabase.from('menu').delete().eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await loadDashboard();
    } catch (deleteFailure) {
      setError(deleteFailure.message || 'Unable to delete menu item.');
    }
  };

  const handleApproveSubscription = async (userId) => {
    try {
      setSubscriptionActionId(userId);
      setError('');

      const subscriptionEndDate = addDays(new Date(), 30).toISOString();
      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_end_date: subscriptionEndDate,
          payment_rejection_reason: null,
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      await loadDashboard();
    } catch (updateFailure) {
      setError(updateFailure.message || 'Unable to approve subscription.');
    } finally {
      setSubscriptionActionId(null);
    }
  };

  const openRejectModal = (student) => {
    setError('');
    setRejectingStudent(student);
    setRejectionReason('');
  };

  const closeRejectModal = () => {
    setRejectingStudent(null);
    setRejectionReason('');
  };

  const handleRejectSubscription = async () => {
    if (!rejectingStudent?.id) {
      return;
    }

    if (!rejectionReason.trim()) {
      setError('A rejection reason is required before rejecting a payment.');
      return;
    }

    try {
      setSubscriptionActionId(rejectingStudent.id);
      setError('');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'expired',
          subscription_end_date: null,
          last_transaction_ref: null,
          payment_rejection_reason: rejectionReason.trim(),
        })
        .eq('id', rejectingStudent.id);

      if (updateError) {
        throw updateError;
      }

      closeRejectModal();
      await loadDashboard();
    } catch (updateFailure) {
      setError(updateFailure.message || 'Unable to reject subscription.');
    } finally {
      setSubscriptionActionId(null);
    }
  };

  const handleRevokeSubscription = async (userId) => {
    try {
      setSubscriptionActionId(userId);
      setError('');

      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'expired',
          subscription_end_date: null,
          payment_rejection_reason: null,
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      await loadDashboard();
    } catch (updateFailure) {
      setError(updateFailure.message || 'Unable to revoke subscription.');
    } finally {
      setSubscriptionActionId(null);
    }
  };

  return (
    <div className="min-h-screen px-2 py-2 pb-28 md:px-6 md:py-8 lg:px-10">
      <div className="mx-auto max-w-7xl space-y-2 md:space-y-6">
        <header className="panel w-full px-5 py-6 md:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-2xl bg-gradient-to-br from-emerald-100 via-white to-amber-100 p-3 text-emerald-800 shadow-sm">
                  <ChefHat className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="text-4xl font-extrabold tracking-tight text-slate-950">
                    {profile?.name ? `${t.managerDash} | ${profile.name}` : t.managerDash}
                  </h1>
                  <p className="mt-2 text-sm text-slate-600">
                    {t.managerDesc}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className="btn-secondary" onClick={() => loadDashboard(false)}>
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

        <MealStatusCard mealContext={mealContext} />

        <div className="flex flex-wrap gap-3 px-5 md:px-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex items-center rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  activeTab === tab.id
                    ? 'bg-emerald-700 text-white shadow-sm'
                    : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700'
                }`}
              >
                <Icon className="mr-2 h-4 w-4" />
                {{
                  kitchen: t.kitchenView,
                  packing: t.dispatchView,
                  menu: t.menuMan,
                  subscriptions: t.subs,
                }[tab.id] ?? tab.label}
              </button>
            );
          })}
        </div>

        {error ? (
          <div className="w-full rounded-3xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 md:rounded-2xl md:px-4 md:py-3">
            {error}
          </div>
        ) : null}

        {activeTab === 'kitchen' ? (
          <section className="panel w-full px-5 py-6 md:p-6">
            <div className="mb-6">
              <h2 className="text-2xl font-bold">
                {focusedMeal ? formatTotalsTitle(language, t, focusedMeal) : t.kitchenView}
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                {t.kitchenTotalsDesc}
              </p>
            </div>

            {loading ? (
              <p className="text-sm text-slate-600">Loading kitchen totals...</p>
            ) : Object.keys(kitchenTotals).length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {Object.entries(kitchenTotals).map(([itemName, count]) => {
                  const matchingMenuItem = menuItems.find(
                    (m) => m.name === itemName && m.meal_type === focusedMeal
                  );
                  const maxServings = matchingMenuItem?.max_servings;
                  const isSoldOut = Boolean(
                    matchingMenuItem?.is_sold_out || (maxServings && count >= maxServings)
                  );
                  const percentage = maxServings ? Math.min(100, Math.round((count / maxServings) * 100)) : null;

                  return (
                    <div key={itemName} className="soft-panel p-5 relative overflow-hidden flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-[0.14em] text-slate-500">Order count</p>
                            <p className="mt-2 text-3xl font-extrabold text-slate-950">
                              {count}x
                              {maxServings ? (
                                <span className="text-sm font-normal text-slate-400"> / {maxServings} max</span>
                              ) : null}
                            </p>
                          </div>

                          {isSoldOut ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-bold text-rose-700">
                              <Ban className="h-3 w-3" />
                              Sold Out
                            </span>
                          ) : maxServings && count >= maxServings * 0.8 ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Near Limit
                            </span>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                              Available
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-base font-semibold text-slate-800">{itemName}</p>

                        {maxServings ? (
                          <div className="mt-3">
                            <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isSoldOut ? 'bg-rose-600' : count >= maxServings * 0.8 ? 'bg-amber-500' : 'bg-emerald-600'
                                }`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <p className="mt-1 text-right text-[11px] font-medium text-slate-500">
                              {percentage}% of batch limit ({Math.max(0, maxServings - count)} left)
                            </p>
                          </div>
                        ) : null}
                      </div>

                      {matchingMenuItem ? (
                        <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                          <button
                            type="button"
                            className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition ${
                              matchingMenuItem.is_sold_out
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                            }`}
                            onClick={() => handleToggleSoldOut(matchingMenuItem)}
                            disabled={togglingMenuId === matchingMenuItem.id}
                          >
                            {matchingMenuItem.is_sold_out ? '✓ Mark Available' : '✕ Mark Sold Out'}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                title={t.noOrdersYet}
                description={t.totalsAppearHere}
              />
            )}
          </section>
        ) : null}

        {activeTab === 'packing' ? (
          <div className="space-y-6">
            {/* Global Dispatch & Packing Action Bar */}
            <div className="panel w-full p-5 md:p-6 border-slate-200 shadow-sm bg-gradient-to-r from-slate-50 via-white to-emerald-50/40">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                {/* 1. One Mark All as Packed button */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
                      1
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {language === 'am' ? 'የማሸጊያ እና ጉዞ ቁጥጥር' : 'Minibus Departure (All Orders)'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    {language === 'am'
                      ? 'ምግቦች በሙሉ ተዘጋጅተው ሚኒባሱ ላይ ሲጫኑ "ሁሉንም ታሽጓል በል" የሚለውን ይጫኑ::'
                      : 'When all meals are cooked and boxed into the delivery vehicle, dispatch them at once.'}
                  </p>
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleMarkAllPacked}
                      disabled={pendingOrdersCount === 0 || packingAllOrders}
                      className={`inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-bold shadow-md transition ${
                        pendingOrdersCount === 0
                          ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                          : 'bg-sky-600 text-white hover:bg-sky-700 active:scale-98 shadow-sky-600/20'
                      }`}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      {packingAllOrders
                        ? language === 'am' ? 'በማሸግ ላይ...' : 'Packing All Orders...'
                        : pendingOrdersCount === 0
                        ? language === 'am' ? 'ሁሉም ታሽጓል ✓' : 'All Orders Packed ✓'
                        : `${t.markAllPacked || 'Mark All as Packed'} (${pendingOrdersCount})`}
                    </button>
                  </div>
                </div>

                <div className="hidden lg:block h-20 w-px bg-slate-200" />

                {/* 2. Two Mark as Arrived buttons for each pickup point */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800">
                      2
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      {language === 'am' ? 'የመድረሻ ማሳወቂያ በህንፃ' : 'Arrival Notice by Station'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600">
                    {language === 'am'
                      ? 'ሚኒባሱ እያንዳንዱ ህንፃ ሲደርስ "ደርሷል" የሚለውን ይጫኑ፤ ተማሪዎች ወዲያውኑ ማሳወቂያ ይደርሳቸዋል::'
                      : 'When reaching each building, click to trigger the in-app arrival alert for those students.'}
                  </p>
                  <div className="flex flex-wrap gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handlePickupArrival('T22')}
                      disabled={!t22PendingArrivalCount || dispatchingPickup === 'T22'}
                      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition shadow-sm ${
                        !t22PendingArrivalCount
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-98 shadow-emerald-700/20'
                      }`}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {dispatchingPickup === 'T22'
                        ? 'T22...'
                        : !t22PendingArrivalCount && (groupedOrders['T22']?.length > 0)
                        ? 'T22 Arrived ✓'
                        : `${t.markT22Arrived || 'Mark T22 as Arrived'} (${t22PendingArrivalCount})`}
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePickupArrival('T34')}
                      disabled={!t34PendingArrivalCount || dispatchingPickup === 'T34'}
                      className={`inline-flex items-center justify-center rounded-2xl px-4 py-3 text-sm font-bold transition shadow-sm ${
                        !t34PendingArrivalCount
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                          : 'bg-emerald-700 text-white hover:bg-emerald-800 active:scale-98 shadow-emerald-700/20'
                      }`}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      {dispatchingPickup === 'T34'
                        ? 'T34...'
                        : !t34PendingArrivalCount && (groupedOrders['T34']?.length > 0)
                        ? 'T34 Arrived ✓'
                        : `${t.markT34Arrived || 'Mark T34 as Arrived'} (${t34PendingArrivalCount})`}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Grouped by Pickup Point */}
            <div className="grid gap-3 md:gap-6 xl:grid-cols-2">
              {(['T22', 'T34']).map((pickupKey) => {
                const list = groupedOrders[pickupKey] || [];
                const arrivedCount = list.filter((o) => o.status === 'Arrived').length;
                return (
                  <div key={pickupKey} className="panel w-full px-5 py-6 md:p-6">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <h2 className="text-xl font-bold text-slate-900">{PICKUP_LABELS[pickupKey]}</h2>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {list.length} orders total • {arrivedCount} arrived
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          arrivedCount === list.length && list.length > 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {arrivedCount === list.length && list.length > 0
                          ? 'All Arrived ✓'
                          : `${list.length - arrivedCount} In Transit`}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {list.length ? (
                        list.map((order) => (
                          <div
                            key={order.id}
                            className="soft-panel p-4 flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="space-y-0.5">
                              <p className="text-sm font-bold text-slate-900">{order.user?.name}</p>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                                <span>
                                  ID: <strong className="font-mono text-slate-800">{order.user?.identity_number}</strong>
                                </span>
                                <span>•</span>
                                <span>Phone: {order.user?.phone}</span>
                              </div>
                              <p className="pt-1 text-xs font-semibold text-emerald-800">
                                🍲 {order.menu?.name}
                              </p>
                            </div>
                            <div>
                              {order.status === 'Arrived' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                  {t.arrived || 'Arrived'}
                                </span>
                              ) : order.status === 'Packed' ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-sky-600 animate-pulse" />
                                  {t.packed || 'Packed'}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                  {t.pending || 'In Kitchen'}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <EmptyState
                          title={`No ${pickupKey} orders`}
                          description="Orders for this pickup point will appear here once students place them."
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {activeTab === 'menu' ? (
          <section className="grid gap-3 md:gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="panel w-full px-5 py-6 md:p-6">
              <h2 className="text-2xl font-bold">Add menu item</h2>
              <p className="mt-1 text-sm text-slate-600">
                Create breakfast, lunch, or dinner options for students.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleMenuSubmit}>
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Meal Name</span>
                  <input
                    className="input"
                    placeholder="Example: Shiro with injera"
                    value={menuName}
                    onChange={(event) => setMenuName(event.target.value)}
                  />
                </label>

                <label className="block space-y-2">
                  <span className="text-sm font-medium text-slate-700">Meal Type</span>
                  <select
                    className="input"
                    value={menuMealType}
                    onChange={(event) => setMenuMealType(event.target.value)}
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                  </select>
                </label>

                <label className="block space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">Portion Limit (Max Servings)</span>
                    <span className="text-xs text-slate-400">Optional</span>
                  </div>
                  <input
                    className="input"
                    type="number"
                    min="1"
                    placeholder="e.g. 50 (leave blank for unlimited)"
                    value={menuMaxServings}
                    onChange={(event) => setMenuMaxServings(event.target.value)}
                  />
                  <p className="text-[11px] text-slate-500">
                    Once orders reach this number, the dish automatically switches to Sold Out.
                  </p>
                </label>

                <button type="submit" className="btn-primary w-full" disabled={savingMenu}>
                  <Plus className="mr-2 h-4 w-4" />
                  {savingMenu ? 'Saving...' : 'Add menu item'}
                </button>
              </form>
            </div>

            <div className="panel w-full px-5 py-6 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                <div>
                  <h2 className="text-2xl font-bold">Current menu</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Filter by meal type, manage portion limits, and toggle sold-out status.
                  </p>
                </div>

                {/* Meal Filter Tabs */}
                <div className="inline-flex flex-wrap p-1 rounded-2xl bg-slate-100 border border-slate-200/80 gap-1 self-start sm:self-auto">
                  {[
                    { id: 'All', label: 'All', count: menuItems.length },
                    { id: 'Breakfast', label: '🍳 Breakfast', count: menuItems.filter((i) => i.meal_type === 'Breakfast').length },
                    { id: 'Lunch', label: '🍲 Lunch', count: menuItems.filter((i) => i.meal_type === 'Lunch').length },
                    { id: 'Dinner', label: '🍽️ Dinner', count: menuItems.filter((i) => i.meal_type === 'Dinner').length },
                  ].map((filterTab) => (
                    <button
                      key={filterTab.id}
                      type="button"
                      onClick={() => setMenuFilter(filterTab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                        menuFilter === filterTab.id
                          ? 'bg-white text-emerald-800 shadow-sm'
                          : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                      }`}
                    >
                      {filterTab.label} <span className="opacity-70 text-[11px]">({filterTab.count})</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                {menuItems.length ? (
                  ['Breakfast', 'Lunch', 'Dinner']
                    .filter((mealType) => menuFilter === 'All' || menuFilter === mealType)
                    .map((mealType) => {
                      const itemsInMeal = menuItems.filter((item) => item.meal_type === mealType);

                      if (!itemsInMeal.length) {
                        return menuFilter === mealType ? (
                          <div key={mealType} className="py-8 text-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-200/60">
                            No {mealType.toLowerCase()} items added yet.
                          </div>
                        ) : null;
                      }

                      return (
                        <div key={mealType} className="space-y-3">
                          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                            <span
                              className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                                mealType === 'Breakfast'
                                  ? 'bg-amber-100 text-amber-800'
                                  : mealType === 'Lunch'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-indigo-100 text-indigo-800'
                              }`}
                            >
                              {mealType === 'Breakfast' ? '🍳 Breakfast' : mealType === 'Lunch' ? '🍲 Lunch' : '🍽️ Dinner'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              ({itemsInMeal.length} {itemsInMeal.length === 1 ? 'dish' : 'dishes'})
                            </span>
                          </div>

                          <div className="space-y-3">
                            {itemsInMeal.map((item) => (
                              <div
                                key={item.id}
                                className={`soft-panel flex flex-wrap items-center justify-between gap-4 p-4 transition ${
                                  item.is_sold_out ? 'bg-slate-100/70 opacity-80' : 'bg-white'
                                }`}
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`text-base font-semibold ${
                                        item.is_sold_out ? 'text-slate-500 line-through' : 'text-slate-900'
                                      }`}
                                    >
                                      {item.name}
                                    </p>
                                    {item.is_sold_out ? (
                                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-700">
                                        Sold Out
                                      </span>
                                    ) : (
                                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                                        Available
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    {item.meal_type} • {item.max_servings ? `Portion limit: ${item.max_servings} max` : 'Unlimited portions'}
                                  </p>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                  <button
                                    type="button"
                                    className={`btn-secondary py-2 px-3 text-xs inline-flex items-center gap-1.5 transition ${
                                      item.is_sold_out
                                        ? 'border-emerald-300 text-emerald-800 hover:bg-emerald-50'
                                        : 'border-rose-200 text-rose-700 hover:bg-rose-50'
                                    }`}
                                    onClick={() => handleToggleSoldOut(item)}
                                    disabled={togglingMenuId === item.id}
                                  >
                                    {item.is_sold_out ? (
                                      <>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
                                        Mark Available
                                      </>
                                    ) : (
                                      <>
                                        <Ban className="h-3.5 w-3.5 text-rose-600" />
                                        Mark Sold Out
                                      </>
                                    )}
                                  </button>

                                  <button
                                    type="button"
                                    className="btn-secondary py-2 px-3 text-xs text-slate-400 hover:text-rose-600 hover:border-rose-200"
                                    onClick={() => handleDeleteMenu(item.id)}
                                    title="Delete menu item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                ) : (
                  <EmptyState
                    title="No menu items"
                    description="Start by adding breakfast, lunch, or dinner entries."
                  />
                )}
              </div>
            </div>
          </section>
        ) : null}

        {activeTab === 'subscriptions' ? (
          <section className="space-y-2 md:space-y-6">
            <div className="grid gap-3 md:gap-6 xl:grid-cols-[1.05fr_0.95fr]">
              <div className="panel w-full px-5 py-6 md:p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">{t.pendingApprovals}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Review submitted payment references before unlocking meal access.
                  </p>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-slate-600">Loading payment approvals...</p>
                  ) : pendingSubscriptions.length ? (
                    pendingSubscriptions.map((student) => (
                      <div key={student.id} className="soft-panel flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="space-y-1">
                          <p className="text-base font-semibold text-slate-900">{student.name || 'Unnamed student'}</p>
                          <p className="text-sm text-slate-600">Phone: {student.phone || 'Not provided'}</p>
                          <p className="text-sm text-slate-600">
                            Ref: <strong>{student.last_transaction_ref || 'Missing reference'}</strong>
                          </p>
                          <div className="pt-1">
                            {student.receipt_url ? (
                              <button
                                type="button"
                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition hover:bg-emerald-100"
                                onClick={() => setViewingReceiptStudent(student)}
                              >
                                <Eye className="h-3.5 w-3.5 text-emerald-700" />
                                View Receipt Screenshot
                              </button>
                            ) : (
                              <span className="text-xs italic text-slate-400">No screenshot attached</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={() => handleApproveSubscription(student.id)}
                            disabled={subscriptionActionId === student.id}
                          >
                            {t.approve}
                          </button>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => openRejectModal(student)}
                            disabled={subscriptionActionId === student.id}
                          >
                            {t.reject}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No pending payments"
                      description="Submitted payment references will appear here for approval."
                    />
                  )}
                </div>
              </div>

              <div className="panel w-full px-5 py-6 md:p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold">{t.activeStudents}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Monitor the remaining days on each approved 30-day subscription.
                  </p>
                </div>

                <div className="space-y-4">
                  {loading ? (
                    <p className="text-sm text-slate-600">Loading active subscriptions...</p>
                  ) : activeSubscriptions.length ? (
                    activeSubscriptions.map((student) => {
                      const daysRemaining = getSubscriptionDaysRemaining(student.subscription_end_date);

                      return (
                        <div key={student.id} className="soft-panel flex flex-wrap items-center justify-between gap-4 p-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <BadgeCheck className="h-5 w-5 text-emerald-700" />
                              <p className="text-base font-semibold text-slate-900">{student.name || 'Unnamed student'}</p>
                            </div>
                            <p className="text-sm text-slate-600">
                              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} left
                            </p>
                          </div>
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => handleRevokeSubscription(student.id)}
                            disabled={subscriptionActionId === student.id}
                          >
                            {t.revoke}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      title="No active subscriptions"
                      description="Approved subscriptions will appear here once payment is verified."
                    />
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      {rejectingStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-6">
          <div className="panel w-full max-w-lg p-6">
            <h2 className="text-2xl font-bold">Reject payment submission</h2>
            <p className="mt-2 text-sm text-slate-600">
              Reason for rejection? (e.g., Invalid reference, Payment not received)
            </p>

            <div className="mt-4 rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <p className="font-semibold text-slate-900">
                {rejectingStudent.name || 'Unnamed student'}
              </p>
              <p className="mt-1">Phone: {rejectingStudent.phone || 'Not provided'}</p>
              <p className="mt-1">
                Reference: <strong>{rejectingStudent.last_transaction_ref || 'Missing reference'}</strong>
              </p>
            </div>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Quick-select reason</span>
              <div className="flex flex-wrap gap-2">
                {REJECTION_REASON_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                      rejectionReason === option
                        ? 'bg-emerald-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:text-emerald-700'
                    }`}
                    onClick={() => setRejectionReason(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </label>

            <label className="mt-5 block space-y-2">
              <span className="text-sm font-medium text-slate-700">Rejection reason</span>
              <textarea
                className="input min-h-28 resize-none"
                value={rejectionReason}
                onChange={(event) => setRejectionReason(event.target.value)}
                placeholder="Invalid reference, payment not found, duplicate transaction..."
              />
            </label>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="btn-secondary flex-1"
                onClick={closeRejectModal}
                disabled={subscriptionActionId === rejectingStudent.id}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary flex-1"
                onClick={handleRejectSubscription}
                disabled={subscriptionActionId === rejectingStudent.id}
              >
                Reject payment
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {viewingReceiptStudent ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="panel max-w-lg w-full p-5 max-h-[92vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Payment Verification Slip</h3>
                <p className="text-xs text-slate-600">
                  {viewingReceiptStudent.name || 'Student'} • {viewingReceiptStudent.phone}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptStudent(null)}
                className="rounded-xl p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-950/5 rounded-2xl p-2 flex items-center justify-center min-h-[260px] border border-slate-200">
              <img
                src={viewingReceiptStudent.receipt_url}
                alt="Payment Receipt"
                className="max-h-[55vh] max-w-full object-contain rounded-xl shadow-sm"
              />
            </div>

            <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
              <p><strong>Submitted Reference:</strong> {viewingReceiptStudent.last_transaction_ref || 'None'}</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 justify-between items-center">
              <a
                href={viewingReceiptStudent.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-secondary py-2 px-3 text-xs inline-flex items-center gap-1.5"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open Full Image
              </a>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary py-2 px-3 text-xs"
                  onClick={() => setViewingReceiptStudent(null)}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="btn-primary py-2 px-3 text-xs"
                  onClick={() => {
                    const studentId = viewingReceiptStudent.id;
                    setViewingReceiptStudent(null);
                    handleApproveSubscription(studentId);
                  }}
                  disabled={subscriptionActionId === viewingReceiptStudent.id}
                >
                  Approve Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
