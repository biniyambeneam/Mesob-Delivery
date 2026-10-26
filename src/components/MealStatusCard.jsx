import { Clock3, MapPin, Sparkles, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatMealWindow } from '../lib/time.js';
import { translateMealLabel } from '../lib/translations.js';

export default function MealStatusCard({ mealContext, pickupPoint }) {
  const { t } = useLanguage();
  const mealLabel =
    translateMealLabel(t, mealContext.focusMeal) || mealContext.focusMeal || 'Meal';
  const isOrderingOpen = mealContext.isOrderingOpen;
  const isUpcoming = !isOrderingOpen && mealContext.upcomingMeal;

  return (
    <div
      className={`rounded-2xl p-4 md:p-5 transition-all font-campus border ${
        isOrderingOpen
          ? 'bg-gradient-to-br from-[#f7f6ea] via-white to-[#edf6ee] border-emerald-300/80 shadow-[0_8px_24px_rgba(8,121,93,0.1)]'
          : isUpcoming
            ? 'bg-gradient-to-br from-amber-50/60 via-white to-amber-50/30 border-amber-200/80 shadow-sm'
            : 'bg-slate-50/80 border-slate-200/80'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Meal Title & Status */}
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                isOrderingOpen
                  ? 'bg-[#08795d] text-white shadow-sm'
                  : isUpcoming
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-slate-200 text-slate-700'
              }`}
            >
              {isOrderingOpen && (
                <span className="h-2 w-2 rounded-full bg-white animate-pulse" aria-hidden="true" />
              )}
              {isOrderingOpen
                ? t.orderingOpen || 'ORDERING OPEN'
                : isUpcoming
                  ? t.upcomingMeal || 'UPCOMING MEAL'
                  : 'ORDERING CLOSED'}
            </span>

            {/* Window Time */}
            <span className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <Clock3 className="w-3.5 h-3.5 text-slate-400" />
              {mealContext.focusMeal ? formatMealWindow(mealContext.focusMeal) : ''}
            </span>
          </div>

          <h2 className="text-2xl sm:text-[28px] font-extrabold text-[#101426] tracking-tight mt-1">
            {mealLabel}
          </h2>

          <p className="text-xs sm:text-[13px] text-slate-600 font-normal">
            {mealContext.windowLabel}
          </p>
        </div>

        {/* Right: Consolidated Local Time & Pickup Station Pill */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
          <div className="text-left sm:text-right">
            <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">
              {t.localTime}
            </span>
            <span className="text-sm sm:text-base font-bold text-slate-900">
              {mealContext.currentTimeLabel}
            </span>
          </div>

          {pickupPoint && (
            <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#08795d] bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200/60">
              <MapPin className="w-3 h-3 text-[#08795d]" />
              <span>{t.assignedPickupStation || 'Pickup'}: Building {pickupPoint}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
