import { Clock3, MapPin, UtensilsCrossed } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { formatMealWindow } from '../lib/time.js';
import { translateMealLabel } from '../lib/translations.js';

export default function MealStatusCard({ mealContext, pickupPoint }) {
  const { t } = useLanguage();
  const mealLabel =
    translateMealLabel(t, mealContext.focusMeal) || mealContext.focusMeal || 'No active meal';
  const isOrderingOpen = mealContext.isOrderingOpen;
  const showPickupPoint = typeof pickupPoint !== 'undefined';

  return (
    <div
      className={`panel w-full px-5 py-6 md:p-6 ${
        isOrderingOpen ? 'border-emerald-500 shadow-[0_18px_60px_-24px_rgba(5,150,105,0.42)]' : ''
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <span
            className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              isOrderingOpen
                ? 'animate-soft-pulse-glow bg-emerald-600 text-white shadow-[0_0_15px_rgba(5,150,105,0.5)]'
                : 'bg-amber-100 text-amber-800'
            }`}
          >
            {isOrderingOpen ? (
              <span className="h-2.5 w-2.5 rounded-full bg-white animate-live-dot" aria-hidden="true" />
            ) : null}
            {isOrderingOpen ? t.orderingOpen : t.upcomingMeal}
          </span>
          <h2 className="text-3xl font-bold">{mealLabel}</h2>
          <p className="max-w-xl text-sm text-slate-600">{mealContext.windowLabel}</p>
        </div>
        <div className="rounded-2xl bg-emerald-950 px-4 py-3 text-right text-white">
          <p className="text-xs uppercase tracking-[0.18em] text-emerald-100">{t.localTime}</p>
          <p className="mt-1 text-lg font-semibold">{mealContext.currentTimeLabel}</p>
        </div>
      </div>

      <div className={`mt-6 grid gap-3 md:gap-4 ${showPickupPoint ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
        <div className="soft-panel flex items-center gap-3 p-4">
          <Clock3 className="h-5 w-5 text-emerald-700" />
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t.window}</p>
            <p className="text-sm font-semibold text-slate-900">
              {mealContext.focusMeal ? formatMealWindow(mealContext.focusMeal) : 'Closed'}
            </p>
          </div>
        </div>
        <div className="soft-panel flex items-center gap-3 p-4">
          <UtensilsCrossed className="h-5 w-5 text-emerald-700" />
          <div>
            <p className="text-xs uppercase tracking-[0.12em] text-slate-500">{t.serviceDate}</p>
            <p className="text-sm font-semibold text-slate-900">
              {mealContext.currentDateLabel}
              {mealContext.isNextDay ? ' (next day)' : ''}
            </p>
          </div>
        </div>
        {showPickupPoint ? (
          <div className="soft-panel flex items-center gap-3 p-4">
            <MapPin className="h-5 w-5 text-emerald-700" />
            <div>
              <p className="text-xs uppercase tracking-[0.12em] text-slate-500">Pickup Point</p>
              <p className="text-sm font-semibold text-slate-900">
                {pickupPoint || 'Set during onboarding'}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
