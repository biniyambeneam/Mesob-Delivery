import { AlertCircle, Ban, Check, CheckCircle2, Flame, Heart, LoaderCircle, Sparkles, Utensils } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { translateMealLabel } from '../lib/translations.js';

// Category-based, appetizing CSS food artwork helper
function FoodThumbnail({ name = '' }) {
  const lower = name.toLowerCase();

  let bgGradient = 'from-amber-100 to-orange-100';
  let iconColor = 'text-amber-700';
  let categoryTag = 'Dish';

  if (lower.includes('shiro') || lower.includes('wot') || lower.includes('misir') || lower.includes('stew')) {
    bgGradient = 'from-[#fae8d4] to-[#f4bd6a]/40';
    iconColor = 'text-[#d48431]';
    categoryTag = 'Stew';
  } else if (lower.includes('tibs') || lower.includes('meat') || lower.includes('beef')) {
    bgGradient = 'from-rose-100 to-amber-100';
    iconColor = 'text-rose-700';
    categoryTag = 'Sizzle';
  } else if (lower.includes('firfir') || lower.includes('egg') || lower.includes('breakfast') || lower.includes('bread')) {
    bgGradient = 'from-amber-100 to-yellow-100';
    iconColor = 'text-amber-800';
    categoryTag = 'Hot';
  } else if (lower.includes('rice') || lower.includes('pasta') || lower.includes('macaroni')) {
    bgGradient = 'from-emerald-50 to-teal-100';
    iconColor = 'text-emerald-700';
    categoryTag = 'Plate';
  } else if (lower.includes('salad') || lower.includes('gomen') || lower.includes('veg')) {
    bgGradient = 'from-emerald-100 to-green-100';
    iconColor = 'text-emerald-800';
    categoryTag = 'Fresh';
  }

  return (
    <div
      className={`w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-2xl bg-gradient-to-br ${bgGradient} shrink-0 flex flex-col items-center justify-center relative shadow-sm border border-black/5 overflow-hidden`}
      aria-hidden="true"
    >
      <div className="w-8 h-8 rounded-full bg-white/80 shadow-xs flex items-center justify-center">
        {categoryTag === 'Sizzle' ? (
          <Flame className={`w-4 h-4 ${iconColor}`} />
        ) : categoryTag === 'Fresh' ? (
          <Sparkles className={`w-4 h-4 ${iconColor}`} />
        ) : (
          <Utensils className={`w-4 h-4 ${iconColor}`} />
        )}
      </div>
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mt-1">
        {categoryTag}
      </span>
    </div>
  );
}

export default function OrderCard({
  item,
  onOrder,
  disabled,
  loading,
  isActiveWindow,
  isFavorite = false,
  onToggleFavorite,
}) {
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
    <div
      className={`rounded-2xl border p-3 sm:p-4 bg-white font-campus transition-all shadow-xs flex flex-col justify-between ${
        isSoldOut
          ? 'border-slate-200/80 bg-slate-50/70 opacity-75'
          : !isActiveWindow
            ? 'border-slate-200 bg-slate-50/60 opacity-80'
            : disabled
              ? 'border-emerald-200/80 bg-emerald-50/30'
              : 'border-slate-200/80 hover:border-emerald-300 hover:shadow-md'
      }`}
    >
      {/* Top/Main Row: Artwork on Left, Details in Middle, Favorite Heart on Right */}
      <div className="flex items-start gap-3 min-w-0">
        {/* Left: Food Artwork */}
        <FoodThumbnail name={item.name} mealType={item.meal_type} />

        {/* Middle: Dish Name & Availability Badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {translateMealLabel(t, item.meal_type)}
            </span>

            {isSoldOut ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                <Ban className="h-2.5 w-2.5" />
                {t.soldOut || 'Sold Out'}
              </span>
            ) : remaining !== null && remaining <= 10 ? (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <AlertCircle className="h-2.5 w-2.5 text-amber-700" />
                {language === 'am' ? `${remaining} ብቻ ቀርቷል!` : `Only ${remaining} left!`}
              </span>
            ) : item.max_servings ? (
              <span className="text-[10px] font-medium text-slate-400">
                {item.max_servings} {language === 'am' ? 'ገደብ' : 'max'}
              </span>
            ) : null}
          </div>

          <h3
            className={`text-base sm:text-[17px] font-bold leading-snug mt-0.5 line-clamp-2 ${
              isSoldOut ? 'text-slate-400 line-through' : 'text-slate-900'
            }`}
          >
            {item.name}
          </h3>

          <p className="text-[11px] text-slate-500 font-normal mt-0.5">
            {isSoldOut
              ? language === 'am'
                ? 'ለዛሬ አገልግሎት አልቋል'
                : 'Sold out for today'
              : !isActiveWindow
                ? language === 'am'
                  ? 'የትዕዛዝ ሰዓት ዝግ ነው'
                  : 'Window closed'
                : language === 'am'
                  ? 'ዛሬ ትኩስ የሚዘጋጅ'
                  : 'Prepared fresh today'}
          </p>
        </div>

        {/* Right: Favorite Heart Action (Visually and functionally separate) */}
        {onToggleFavorite && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(item);
            }}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center shrink-0 text-slate-400 hover:text-rose-500 transition-colors focus:outline-none hover:bg-rose-50/70"
          >
            <Heart
              className={`w-5 h-5 transition-transform active:scale-90 ${
                isFavorite
                  ? 'fill-rose-500 text-rose-500 stroke-rose-500'
                  : 'stroke-slate-400'
              }`}
            />
          </button>
        )}
      </div>

      {/* Bottom Action Area: Explicit Order Button */}
      <div className="mt-3 pt-2.5 border-t border-slate-100/80 flex items-center justify-between gap-3">
        <span className="text-[11px] text-slate-400 font-medium">
          {disabled
            ? language === 'am'
              ? 'ቀድመው አዘዋል'
              : 'Order Placed'
            : isSoldOut
              ? language === 'am'
                ? 'አልቋል'
                : 'Unavailable'
              : !isActiveWindow
                ? language === 'am'
                  ? 'ዝግ ነው'
                  : 'Closed'
                : language === 'am'
                  ? '1 ምግብ በሰዓቱ'
                  : '1 meal selection'}
        </span>

        <button
          type="button"
          onClick={() => onOrder(item)}
          disabled={isEffectivelyDisabled}
          className={`h-10 sm:h-11 px-4 rounded-xl text-xs sm:text-[13px] font-bold flex items-center justify-center gap-1.5 transition-all focus:outline-none min-w-[120px] ${
            isSoldOut
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/60'
              : !isActiveWindow
                ? 'bg-slate-100 text-slate-500 cursor-not-allowed border border-slate-200/60'
                : disabled
                  ? 'bg-emerald-100 text-emerald-800 cursor-not-allowed'
                  : 'bg-[#08795d] text-white hover:bg-[#07684f] shadow-sm hover:shadow active:scale-[0.98]'
          }`}
        >
          {loading ? (
            <LoaderCircle className="w-4 h-4 animate-spin text-white" />
          ) : isSoldOut ? (
            <span>{t.soldOut || 'Sold Out'}</span>
          ) : !isActiveWindow ? (
            <span>{language === 'am' ? 'ሰዓት ዝግ' : 'Closed'}</span>
          ) : disabled ? (
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              {language === 'am' ? 'ቀድመው አዘዋል' : 'Ordered'}
            </span>
          ) : (
            <span>{language === 'am' ? 'እዘዝ' : 'Order Meal'}</span>
          )}
        </button>
      </div>
    </div>
  );
}
