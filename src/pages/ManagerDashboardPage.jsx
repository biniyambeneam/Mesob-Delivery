import { useCallback, useEffect, useMemo, useState } from 'react';
import { addDays } from 'date-fns';
import {
  AlertCircle,
  BadgeCheck,
  Ban,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  ExternalLink,
  Eye,
  Filter,
  Flame,
  LogOut,
  MapPin,
  Package,
  Plus,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Trash2,
  Truck,
  Upload,
  UserCheck,
  UserRound,
  Utensils,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react';
import LanguageToggle from '../components/LanguageToggle.jsx';
import { useAuth } from '../context/useAuth.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getSubscriptionDaysRemaining } from '../lib/subscription.js';
import { supabase } from '../lib/supabase.js';
import { getMealWindowState, resetClosedMealSoldOutState } from '../lib/time.js';
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
  { id: 'menu', label: 'Menu Management', icon: UtensilsCrossed },
  { id: 'subscriptions', label: 'Subscriptions', icon: Wallet },
];

const PICKUP_LABELS = {
  T22: 'T22 - Female Building',
  T34: 'T34 - Male Building',
};

export default function ManagerDashboardPage() {
  const { profile, signOut } = useAuth();
  const { t, language } = useLanguage();
  const isAmharic = language === 'am';

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

        // Automatically reset sold-out status for meals whose ordering window has closed
        await resetClosedMealSoldOutState(supabase);

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
    <div className="min-h-screen bg-[#f8f9fa] md:bg-[#f2f2f4] font-campus text-slate-900">
      {/* ======================================================== */}
      {/* DESKTOP SIDEBAR NAVIGATION (Hidden on mobile, md:flex)   */}
      {/* ======================================================== */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:bg-white md:border-r md:border-slate-200/80 md:z-30 p-5 shadow-xs">
        {/* Brand Wordmark & Role Pill */}
        <div className="px-2 py-2 mb-6">
          <div className="flex items-center gap-1.5">
            <span className="text-2xl font-extrabold text-[#08795d] tracking-tight">Campus</span>
            <span className="text-2xl font-extrabold text-[#d48431] tracking-tight">Food</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
              <ChefHat className="w-3 h-3 text-[#08795d]" />
              Operations Manager
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="space-y-1.5 flex-1" aria-label="Manager Navigation">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-emerald-50 text-[#08795d] border-l-4 border-[#08795d]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span>
                  {{
                    kitchen: t.kitchenView || 'Kitchen View',
                    packing: t.dispatchView || 'Packing / Dispatch',
                    menu: t.menuMan || 'Menu Management',
                    subscriptions: t.subs || 'Subscriptions',
                  }[tab.id] ?? tab.label}
                </span>

                {/* Badge counters */}
                {tab.id === 'kitchen' && orders.length > 0 && (
                  <span className="ml-auto bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {orders.length}
                  </span>
                )}

                {tab.id === 'packing' && pendingOrdersCount > 0 && (
                  <span className="ml-auto bg-sky-100 text-sky-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {pendingOrdersCount}
                  </span>
                )}

                {tab.id === 'subscriptions' && pendingSubscriptions.length > 0 && (
                  <span className="ml-auto bg-amber-100 text-amber-800 text-[11px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                    {pendingSubscriptions.length}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Manager identity, language, logout */}
        <div className="pt-4 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-500 font-medium">Language</span>
            <LanguageToggle />
          </div>

          <div className="flex items-center gap-3 px-2 py-1 bg-slate-50 rounded-xl border border-slate-100">
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center shrink-0 text-xs">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">{profile?.name || 'Manager'}</p>
              <p className="text-[10px] text-slate-500 truncate">Kitchen Operations</p>
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
          <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
            {/* Left: Mobile Wordmark & Operations Greeting */}
            <div>
              <div className="flex items-center gap-1.5 md:hidden mb-0.5">
                <span className="text-lg font-extrabold text-[#08795d] tracking-tight">Campus</span>
                <span className="text-lg font-extrabold text-[#d48431] tracking-tight">Food</span>
                <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded ml-1">
                  Ops
                </span>
              </div>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>{t.managerDash || 'Cafeteria Manager'}</span>
                {profile?.name && (
                  <span className="text-slate-400 font-normal hidden sm:inline">• {profile.name}</span>
                )}
              </h1>
            </div>

            {/* Right: Quick Action Buttons & Status */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => loadDashboard(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-xs transition"
                title="Refresh dashboard data"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#08795d] ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{t.refresh}</span>
              </button>

              <div className="md:hidden">
                <LanguageToggle />
              </div>
            </div>
          </div>
        </header>

        {/* SCROLLABLE MAIN CONTENT WRAPPER */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-4 sm:py-6 pb-28 md:pb-12 space-y-5">
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

          {/* Quick Stats Overview Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Total Orders for Active Window */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                {focusedMeal} Orders
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">{orders.length}</p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">
                Active Meal Cycle
              </span>
            </div>

            {/* Pending Packing */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pending Packing
              </span>
              <p className="text-2xl font-black text-sky-700 mt-0.5">{pendingOrdersCount}</p>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                In Kitchen Prep
              </span>
            </div>

            {/* In-Transit to Stations */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                In Minibus Transit
              </span>
              <p className="text-2xl font-black text-emerald-800 mt-0.5">
                {t22PendingArrivalCount + t34PendingArrivalCount}
              </p>
              <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
                T22: {t22PendingArrivalCount} • T34: {t34PendingArrivalCount}
              </span>
            </div>

            {/* Pending Subscriptions */}
            <div className="rounded-2xl bg-white border border-slate-200/80 p-3.5 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Pending Proofs
              </span>
              <p className="text-2xl font-black text-amber-700 mt-0.5">
                {pendingSubscriptions.length}
              </p>
              <span className="text-[10px] text-amber-800 font-medium mt-0.5 block">
                Awaiting Verification
              </span>
            </div>
          </div>

          {/* Consolidated Meal Window Status Bar */}
          <MealStatusCard mealContext={mealContext} />

          {/* ======================================================== */}
          {/* TAB 1: KITCHEN VIEW (Order Quantities & Prep Limits)     */}
          {/* ======================================================== */}
          {activeTab === 'kitchen' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-[#101426] tracking-tight">
                    {focusedMeal ? formatTotalsTitle(language, t, focusedMeal) : t.kitchenView}
                  </h2>
                  <p className="text-xs text-slate-500 font-normal">
                    {t.kitchenTotalsDesc || 'Portion counts for cooks to prepare before minibus departure.'}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                  <LoaderCircle className="w-6 h-6 animate-spin text-[#08795d] mx-auto mb-2" />
                  <span>Loading kitchen totals...</span>
                </div>
              ) : Object.keys(kitchenTotals).length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {Object.entries(kitchenTotals).map(([itemName, count]) => {
                    const matchingMenuItem = menuItems.find(
                      (m) => m.name === itemName && m.meal_type === focusedMeal
                    );
                    const maxServings = matchingMenuItem?.max_servings;
                    const isSoldOut = Boolean(
                      matchingMenuItem?.is_sold_out || (maxServings && count >= maxServings)
                    );
                    const percentage = maxServings
                      ? Math.min(100, Math.round((count / maxServings) * 100))
                      : null;

                    return (
                      <div
                        key={itemName}
                        className={`rounded-2xl border p-4 bg-white shadow-xs transition flex flex-col justify-between ${
                          isSoldOut
                            ? 'border-rose-200 bg-rose-50/20'
                            : 'border-slate-200/80 hover:border-emerald-300'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                Required Portions
                              </span>
                              <div className="flex items-baseline gap-1 mt-0.5">
                                <span className="text-3xl font-black text-slate-900">{count}x</span>
                                {maxServings && (
                                  <span className="text-xs font-semibold text-slate-400">
                                    / {maxServings} max
                                  </span>
                                )}
                              </div>
                            </div>

                            {isSoldOut ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                                <Ban className="w-3 h-3" />
                                {t.soldOut || 'Sold Out'}
                              </span>
                            ) : maxServings && count >= maxServings * 0.8 ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                                Near Limit
                              </span>
                            ) : (
                              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                                Available
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-slate-900 mt-2">{itemName}</h3>

                          {maxServings ? (
                            <div className="mt-3">
                              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    isSoldOut
                                      ? 'bg-rose-600'
                                      : count >= maxServings * 0.8
                                        ? 'bg-amber-500'
                                        : 'bg-[#08795d]'
                                  }`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                              <p className="mt-1 text-right text-[10px] font-medium text-slate-500">
                                {percentage}% of limit ({Math.max(0, maxServings - count)} left)
                              </p>
                            </div>
                          ) : null}
                        </div>

                        {matchingMenuItem && (
                          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Toggle Status</span>
                            <button
                              type="button"
                              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition ${
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
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title={t.noOrdersYet || 'No orders placed yet'}
                  description={t.totalsAppearHere || 'Totals will appear here once students start ordering.'}
                />
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: PACKING / DISPATCH (Minibus Departure & Arrival)  */}
          {/* ======================================================== */}
          {activeTab === 'packing' && (
            <div className="space-y-5">
              {/* Central Dispatch Operational Controller */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Step 1: Mark All as Packed */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-800 text-xs font-extrabold flex items-center justify-center">
                        1
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {isAmharic ? 'የማሸጊያ እና ጉዞ ቁጥጥር' : 'Minibus Departure (All Orders)'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {isAmharic
                        ? 'ምግቦች በሙሉ ተዘጋጅተው በሚኒባሱ ሲጫኑ "ሁሉንም ታሽጓል በል" የሚለውን ይጫኑ።'
                        : 'Once all dishes are packed and loaded into the delivery minibus, mark all as packed.'}
                    </p>
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleMarkAllPacked}
                        disabled={pendingOrdersCount === 0 || packingAllOrders}
                        className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-xs transition-all ${
                          pendingOrdersCount === 0
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                            : 'bg-sky-600 text-white hover:bg-sky-700 active:scale-[0.98]'
                        }`}
                      >
                        <Package className="mr-2 h-4 w-4" />
                        {packingAllOrders
                          ? isAmharic
                            ? 'በማሸግ ላይ...'
                            : 'Packing All Orders...'
                          : pendingOrdersCount === 0
                            ? isAmharic
                              ? 'ሁሉም ታሽጓል ✓'
                              : 'All Orders Packed ✓'
                            : `${t.markAllPacked || 'Mark All as Packed'} (${pendingOrdersCount})`}
                      </button>
                    </div>
                  </div>

                  <div className="hidden lg:block h-16 w-px bg-slate-200" />

                  {/* Step 2: Mark Station Arrival */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-xs font-extrabold flex items-center justify-center">
                        2
                      </span>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900">
                        {isAmharic ? 'የመድረሻ ማሳወቂያ በህንፃ' : 'Arrival Notice by Station'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      {isAmharic
                        ? 'ሚኒባሱ እያንዳንዱ ህንፃ ሲደርስ "ደርሷል" ይጫኑ፤ ተማሪዎች ወዲያውኑ የድምፅ ማሳወቂያ ይደርሳቸዋል።'
                        : 'When reaching each building, click to trigger the in-app arrival alert and sound chime.'}
                    </p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handlePickupArrival('T22')}
                        disabled={!t22PendingArrivalCount || dispatchingPickup === 'T22'}
                        className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs ${
                          !t22PendingArrivalCount
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                            : 'bg-[#08795d] text-white hover:bg-[#07684f] active:scale-[0.98]'
                        }`}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        {dispatchingPickup === 'T22'
                          ? 'T22...'
                          : !t22PendingArrivalCount && groupedOrders['T22']?.length > 0
                            ? 'T22 Arrived ✓'
                            : `${t.markT22Arrived || 'Mark T22 as Arrived'} (${t22PendingArrivalCount})`}
                      </button>

                      <button
                        type="button"
                        onClick={() => handlePickupArrival('T34')}
                        disabled={!t34PendingArrivalCount || dispatchingPickup === 'T34'}
                        className={`inline-flex items-center justify-center rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all shadow-xs ${
                          !t34PendingArrivalCount
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-not-allowed'
                            : 'bg-[#08795d] text-white hover:bg-[#07684f] active:scale-[0.98]'
                        }`}
                      >
                        <Truck className="mr-2 h-4 w-4" />
                        {dispatchingPickup === 'T34'
                          ? 'T34...'
                          : !t34PendingArrivalCount && groupedOrders['T34']?.length > 0
                            ? 'T34 Arrived ✓'
                            : `${t.markT34Arrived || 'Mark T34 as Arrived'} (${t34PendingArrivalCount})`}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Orders Grouped by Station (T22 & T34) */}
              <div className="grid gap-4 lg:grid-cols-2">
                {['T22', 'T34'].map((pickupKey) => {
                  const list = groupedOrders[pickupKey] || [];
                  const arrivedCount = list.filter((o) => o.status === 'Arrived').length;

                  return (
                    <div
                      key={pickupKey}
                      className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <h3 className="text-base font-bold text-slate-900">
                            {PICKUP_LABELS[pickupKey]}
                          </h3>
                          <p className="text-xs text-slate-500">
                            {list.length} orders total • {arrivedCount} arrived
                          </p>
                        </div>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
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

                      <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                        {list.length ? (
                          list.map((order) => (
                            <div
                              key={order.id}
                              className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {order.user?.name || 'Student'}
                                </p>
                                <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                                  <span>ID: <strong className="font-mono text-slate-700">{order.user?.identity_number}</strong></span>
                                  <span>•</span>
                                  <span>{order.user?.phone}</span>
                                </div>
                                <p className="text-xs font-semibold text-[#08795d] mt-1 truncate">
                                  🍲 {order.menu?.name}
                                </p>
                              </div>

                              <div className="shrink-0">
                                {order.status === 'Arrived' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                                    {t.arrived || 'Arrived'}
                                  </span>
                                ) : order.status === 'Packed' ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-bold text-sky-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-sky-600 animate-pulse" />
                                    {t.packed || 'Packed'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-600" />
                                    {t.pending || 'In Kitchen'}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="py-8 text-center text-xs text-slate-400">
                            No orders for {pickupKey} yet.
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 3: MENU MANAGEMENT (Add Dish, Portions & Filters)    */}
          {/* ======================================================== */}
          {activeTab === 'menu' && (
            <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
              {/* Left Column: Add Dish Form */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Add Menu Item</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Create meal options with optional batch portion limits.
                  </p>
                </div>

                <form onSubmit={handleMenuSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Meal Name
                    </label>
                    <input
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-[#f5f5f7] focus:outline-none focus:border-[#08795d]"
                      placeholder="e.g. Shiro with Injera"
                      value={menuName}
                      onChange={(e) => setMenuName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Meal Type Window
                    </label>
                    <select
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-[#f5f5f7] focus:outline-none focus:border-[#08795d]"
                      value={menuMealType}
                      onChange={(e) => setMenuMealType(e.target.value)}
                    >
                      <option value="Breakfast">Breakfast (1:00 - 2:00 Local Time)</option>
                      <option value="Lunch">Lunch (5:00 - 7:00 Local Time)</option>
                      <option value="Dinner">Dinner (11:00 - 1:00 Local Time)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                        Portion Limit (Max Servings)
                      </label>
                      <span className="text-[10px] text-slate-400">Optional</span>
                    </div>
                    <input
                      className="w-full h-11 px-3 rounded-xl border border-slate-300 text-xs font-medium text-slate-900 bg-[#f5f5f7] focus:outline-none focus:border-[#08795d]"
                      type="number"
                      min="1"
                      placeholder="e.g. 50 (leave blank for unlimited)"
                      value={menuMaxServings}
                      onChange={(e) => setMenuMaxServings(e.target.value)}
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Dish automatically marks Sold Out when student orders reach this number.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={savingMenu}
                    className="w-full h-11 rounded-xl bg-[#08795d] text-white font-bold text-xs sm:text-sm hover:bg-[#07684f] shadow-sm transition flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{savingMenu ? 'Saving...' : 'Add to Menu'}</span>
                  </button>
                </form>
              </div>

              {/* Right Column: Current Menu by Meal Window */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">Current Dishes</h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Toggle sold-out states and manage portions.
                    </p>
                  </div>

                  {/* Filter Pills */}
                  <div className="inline-flex p-1 rounded-xl bg-slate-100 border border-slate-200 gap-1 self-start sm:self-auto">
                    {['All', 'Breakfast', 'Lunch', 'Dinner'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMenuFilter(type)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                          menuFilter === type
                            ? 'bg-white text-[#08795d] shadow-xs'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
                  {menuItems.length ? (
                    ['Breakfast', 'Lunch', 'Dinner']
                      .filter((type) => menuFilter === 'All' || menuFilter === type)
                      .map((mealType) => {
                        const items = menuItems.filter((i) => i.meal_type === mealType);
                        if (!items.length) return null;

                        return (
                          <div key={mealType} className="space-y-2">
                            <div className="flex items-center gap-2 border-b border-slate-100 pb-1 pt-1">
                              <span className="text-xs font-bold text-slate-700">{mealType}</span>
                              <span className="text-[10px] text-slate-400">({items.length} dishes)</span>
                            </div>

                            <div className="space-y-2">
                              {items.map((item) => (
                                <div
                                  key={item.id}
                                  className={`rounded-xl border p-3 flex items-center justify-between gap-3 transition ${
                                    item.is_sold_out
                                      ? 'border-slate-200 bg-slate-50/70 opacity-75'
                                      : 'border-slate-100 bg-white hover:border-slate-200'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p
                                        className={`text-sm font-bold truncate ${
                                          item.is_sold_out ? 'text-slate-400 line-through' : 'text-slate-900'
                                        }`}
                                      >
                                        {item.name}
                                      </p>
                                      {item.is_sold_out && (
                                        <span className="text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full shrink-0">
                                          Sold Out
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 mt-0.5">
                                      {item.max_servings ? `${item.max_servings} max servings` : 'Unlimited'}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSoldOut(item)}
                                      disabled={togglingMenuId === item.id}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                                        item.is_sold_out
                                          ? 'border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
                                          : 'border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100'
                                      }`}
                                    >
                                      {item.is_sold_out ? 'Mark Available' : 'Mark Sold Out'}
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleDeleteMenu(item.id)}
                                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                                      title="Delete dish"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No menu items added yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 4: SUBSCRIPTIONS (Payment Approvals & Active Roster)  */}
          {/* ======================================================== */}
          {activeTab === 'subscriptions' && (
            <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              {/* Left Column: Pending Approvals Queue */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {t.pendingApprovals || 'Pending Approvals'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Review submitted transaction proofs to unlock meal ordering.
                    </p>
                  </div>
                  <span className="bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {pendingSubscriptions.length} Pending
                  </span>
                </div>

                <div className="space-y-3">
                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading approvals...</div>
                  ) : pendingSubscriptions.length ? (
                    pendingSubscriptions.map((student) => (
                      <div
                        key={student.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-bold text-slate-900">
                              {student.name || 'Student Name'}
                            </h4>
                            <p className="text-xs text-slate-500">Phone: {student.phone}</p>
                            <p className="text-xs text-slate-800 mt-1">
                              Reference: <strong className="font-mono">{student.last_transaction_ref}</strong>
                            </p>
                          </div>

                          {student.receipt_url && (
                            <button
                              type="button"
                              onClick={() => setViewingReceiptStudent(student)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-white text-xs font-bold text-[#08795d] hover:bg-emerald-50 shadow-xs transition"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>View Receipt</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 justify-end">
                          <button
                            type="button"
                            onClick={() => openRejectModal(student)}
                            disabled={subscriptionActionId === student.id}
                            className="px-3.5 py-2 rounded-xl border border-rose-200 text-rose-700 text-xs font-bold hover:bg-rose-50 transition"
                          >
                            {t.reject || 'Reject'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveSubscription(student.id)}
                            disabled={subscriptionActionId === student.id}
                            className="px-4 py-2 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f] shadow-xs transition"
                          >
                            {t.approve || 'Approve (30 Days)'}
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No pending subscription payments to review.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Active Students Roster */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {t.activeStudents || 'Active Students'}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Students currently authorized to order meals.
                    </p>
                  </div>
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {activeSubscriptions.length} Active
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400">Loading active list...</div>
                  ) : activeSubscriptions.length ? (
                    activeSubscriptions.map((student) => {
                      const daysRemaining = getSubscriptionDaysRemaining(student.subscription_end_date);

                      return (
                        <div
                          key={student.id}
                          className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {student.name || 'Unnamed student'}
                            </p>
                            <p className="text-[11px] text-[#08795d] font-semibold">
                              {daysRemaining} {daysRemaining === 1 ? 'day' : 'days'} remaining
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRevokeSubscription(student.id)}
                            disabled={subscriptionActionId === student.id}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[11px] font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 transition"
                          >
                            {t.revoke || 'Revoke'}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="py-8 text-center text-xs text-slate-400">
                      No active student subscriptions found.
                    </div>
                  )}
                </div>
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
        aria-label="Manager Mobile Bottom Navigation"
      >
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[64px] min-h-[44px] relative transition-colors ${
                isActive ? 'text-[#08795d]' : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className={`text-[10px] mt-0.5 ${isActive ? 'font-bold' : 'font-medium'}`}>
                {tab.label.split(' ')[0]}
              </span>

              {tab.id === 'subscriptions' && pendingSubscriptions.length > 0 && (
                <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
              {tab.id === 'packing' && pendingOrdersCount > 0 && (
                <span className="absolute top-1 right-3 w-2 h-2 rounded-full bg-sky-500" />
              )}
            </button>
          );
        })}
      </nav>

      {/* ======================================================== */}
      {/* REJECTION REASON MODAL                                    */}
      {/* ======================================================== */}
      {rejectingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-slate-100 font-campus animate-fadeIn">
            <h3 className="text-lg font-bold text-slate-900">Reject Payment Submission</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or type the reason for rejecting this payment proof.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-700">
              <p className="font-bold text-slate-900">{rejectingStudent.name}</p>
              <p className="mt-0.5 text-slate-500">Ref: {rejectingStudent.last_transaction_ref}</p>
            </div>

            <div className="mt-3 space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Quick Select
              </span>
              <div className="flex flex-wrap gap-1.5">
                {REJECTION_REASON_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setRejectionReason(opt)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                      rejectionReason === opt
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <textarea
                className="w-full h-20 p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#08795d] resize-none"
                placeholder="Specific rejection explanation..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>

            <div className="mt-4 flex items-center gap-2.5">
              <button
                type="button"
                className="flex-1 h-10 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition"
                onClick={closeRejectModal}
              >
                Cancel
              </button>
              <button
                type="button"
                className="flex-1 h-10 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition"
                onClick={handleRejectSubscription}
              >
                Reject Payment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* RECEIPT LIGHTBOX MODAL                                    */}
      {/* ======================================================== */}
      {viewingReceiptStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl flex flex-col max-h-[90vh] font-campus">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <div>
                <h4 className="text-base font-bold text-slate-900">Payment Verification Slip</h4>
                <p className="text-xs text-slate-500">
                  {viewingReceiptStudent.name} • Ref: {viewingReceiptStudent.last_transaction_ref}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceiptStudent(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50 rounded-xl p-2 flex items-center justify-center border border-slate-200 min-h-[220px]">
              <img
                src={viewingReceiptStudent.receipt_url}
                alt="Receipt screenshot"
                className="max-h-[50vh] max-w-full object-contain rounded-lg"
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-2">
              <a
                href={viewingReceiptStudent.receipt_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-[#08795d]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Full Image</span>
              </a>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingReceiptStudent(null)}
                  className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const studentId = viewingReceiptStudent.id;
                    setViewingReceiptStudent(null);
                    handleApproveSubscription(studentId);
                  }}
                  className="px-4 py-2 rounded-xl bg-[#08795d] text-white text-xs font-bold hover:bg-[#07684f]"
                >
                  Approve (30 Days)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
