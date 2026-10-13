import { AlertCircle, Ban, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { translateMealLabel } from '../lib/translations.js';

export default function OrderCard({ item, onOrder, disabled, loading, isActiveWindow }) {
  const { t, language } = useLanguage();

  const isSoldOut = Boolean(
    item?.is_sold_out ||
      (item?.max_servings &&
        item?.orders_count !== undefined &&
        Number(item.orders_count) >= Number(item.max_servings))
  );

  const remaining =
    item?.max_servings && item?.orders_count !== undefined
      ? Math.max(0, Number(item.max_servings) - Number(item.orders_count))
      : null;

  const isEffectivelyDisabled = disabled || loading || isSoldOut || !isActiveWindow;

  return (
    <button
      type="button"
      onClick={() => onOrder(item)}
      disabled={isEffectivelyDisabled}
      className={`panel group relative flex h-full w-full flex-col justify-between px-5 py-6 text-left transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:hover:translate-y-0 md:p-5 ${
        isSoldOut
          ? 'border-rose-200/80 bg-slate-50/70 opacity-70 cursor-not-allowed hover:border-rose-200'
          : !isActiveWindow
            ? 'border-slate-200 bg-slate-50/60 opacity-75 cursor-not-allowed'
            : disabled
              ? 'border-emerald-200 bg-emerald-50/40 opacity-80 cursor-not-allowed'
              : 'border-emerald-400 shadow-[0_18px_60px_-24px_rgba(5,150,105,0.42)] hover:border-emerald-500'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.14em] text-slate-500">
            {translateMealLabel(t, item.meal_type)}
          </p>
          {isSoldOut ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
              <Ban className="h-3 w-3" />
              {t.soldOut || 'Sold Out'}
            </span>
          ) : remaining !== null && remaining <= 10 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
              <AlertCircle className="h-3 w-3 text-amber-700" />
              {language === 'am' ? `${remaining} ብቻ ቀርቷል!` : `Only ${remaining} left!`}
            </span>
          ) : item.max_servings ? (
            <span className="text-[11px] font-medium text-slate-400">
              {item.max_servings} {language === 'am' ? 'ገደብ' : 'max'}
            </span>
          ) : null}
        </div>

        <h3 className={`mt-2 text-xl font-semibold ${isSoldOut ? 'text-slate-500 line-through' : 'text-slate-950'}`}>
          {item.name}
        </h3>
      </div>

      <div className="mt-5 flex items-center justify-between text-sm">
        {isSoldOut ? (
          <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {t.soldOut || 'Sold Out'}
          </span>
        ) : !isActiveWindow ? (
          <span className="rounded-full bg-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600">
            {language === 'am' ? 'ሰዓት ዝግ ነው' : 'Window Closed'}
          </span>
        ) : disabled ? (
          <span className="rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            {language === 'am' ? 'ቀድመው አዘዋል' : 'Already Ordered'}
          </span>
        ) : (
          <span
            className="rounded-full px-3 py-2 font-semibold animate-soft-bounce bg-emerald-700 text-white shadow-[0_10px_20px_-12px_rgba(5,150,105,0.75)]"
          >
            {t.tapToConfirm}
          </span>
        )}

        {loading ? (
          <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
        ) : isSoldOut ? (
          <Ban className="h-5 w-5 text-rose-400" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-emerald-700 transition group-hover:scale-110" />
        )}
      </div>
    </button>
  );
}
