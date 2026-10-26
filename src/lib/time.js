import { addDays } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';

export const ETHIOPIA_TIMEZONE = 'Africa/Addis_Ababa';

export const MEAL_WINDOWS = [
  { mealType: 'Breakfast', startMinutes: 7 * 60, endMinutes: 8 * 60, label: 'Breakfast ordering window' },
  { mealType: 'Lunch', startMinutes: 11 * 60, endMinutes: 13 * 60, label: 'Lunch ordering window' },
  { mealType: 'Dinner', startMinutes: 17 * 60, endMinutes: 19 * 60, label: 'Dinner ordering window' },
];

const LOCAL_TIME_LABELS = {
  Breakfast: '1:00 - 2:00 Local Time',
  Lunch: '5:00 - 7:00 Local Time',
  Dinner: '11:00 - 1:00 Local Time',
};

const LOCAL_TIME_START_LABELS = {
  Breakfast: '1:00 Local Time',
  Lunch: '5:00 Local Time',
  Dinner: '11:00 Local Time',
};

function getMinutesInZone(date) {
  const hours = Number(formatInTimeZone(date, ETHIOPIA_TIMEZONE, 'H'));
  const minutes = Number(formatInTimeZone(date, ETHIOPIA_TIMEZONE, 'm'));
  return hours * 60 + minutes;
}

function formatLocalTimeFromMinutes(totalMinutes) {
  const normalizedMinutes = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
  const hours = Math.floor(normalizedMinutes / 60);
  const minutes = normalizedMinutes % 60;
  const twelveHour = hours % 12 || 12;

  return `${twelveHour}:${minutes.toString().padStart(2, '0')} Local Time`;
}

// Development flag: Keeps ordering windows open for testing at any hour
export const DEV_MODE_ALWAYS_OPEN = true;

export function getMealWindowState(now = new Date()) {
  const zonedMinutes = getMinutesInZone(now);
  const today = formatInTimeZone(now, ETHIOPIA_TIMEZONE, 'yyyy-MM-dd');
  const tomorrow = formatInTimeZone(addDays(now, 1), ETHIOPIA_TIMEZONE, 'yyyy-MM-dd');
  const currentDateLabel = formatInTimeZone(now, ETHIOPIA_TIMEZONE, 'EEEE, MMM d');
  const currentTimeLabel = formatLocalTimeFromMinutes(zonedMinutes - 6 * 60);

  const activeWindow =
    MEAL_WINDOWS.find(
      (window) => zonedMinutes >= window.startMinutes && zonedMinutes < window.endMinutes,
    ) ?? null;

  const upcomingWindow =
    MEAL_WINDOWS.find((window) => zonedMinutes < window.startMinutes) ??
    (activeWindow ? null : { ...MEAL_WINDOWS[0], date: tomorrow, nextDay: true });

  const focusWindow = activeWindow ?? upcomingWindow;
  const focusDate = activeWindow ? today : upcomingWindow?.nextDay ? tomorrow : today;

  return {
    activeMeal: DEV_MODE_ALWAYS_OPEN ? (activeWindow?.mealType || focusWindow?.mealType || 'Lunch') : (activeWindow?.mealType ?? null),
    upcomingMeal: upcomingWindow?.mealType ?? null,
    focusMeal: focusWindow?.mealType ?? 'Lunch',
    isOrderingOpen: DEV_MODE_ALWAYS_OPEN ? true : Boolean(activeWindow),
    today,
    focusDate: DEV_MODE_ALWAYS_OPEN ? today : focusDate,
    currentDateLabel,
    currentTimeLabel,
    windowLabel: DEV_MODE_ALWAYS_OPEN
      ? 'Ordering is open for development testing'
      : (focusWindow?.label ?? 'No meal window scheduled'),
    nextMealStartsAt: upcomingWindow ? LOCAL_TIME_START_LABELS[upcomingWindow.mealType] ?? null : null,
    isNextDay: DEV_MODE_ALWAYS_OPEN ? false : Boolean(upcomingWindow?.nextDay && !activeWindow),
    isDevMode: DEV_MODE_ALWAYS_OPEN,
  };
}

export function formatMealWindow(mealType) {
  return LOCAL_TIME_LABELS[mealType] ?? '';
}

const SOLD_OUT_RESET_STORAGE_KEY = 'campusfood_last_reset_meal_cycle';

/**
 * Checks if previous meal windows have closed and resets their sold-out dishes back to available.
 * E.g., once Lunch closes / Dinner begins, all lunch dishes that were marked sold out are reset.
 * Also at the end of each day or start of a new day, all sold out items from earlier meals are cleared.
 */
export async function resetClosedMealSoldOutState(supabaseClient) {
  if (!supabaseClient) return;

  try {
    const now = new Date();
    const zonedMinutes = getMinutesInZone(now);
    const today = formatInTimeZone(now, ETHIOPIA_TIMEZONE, 'yyyy-MM-dd');

    // Find which meal windows have strictly closed for today
    // Breakfast window closes at 8*60 (14:00/2:00 LT)
    // Lunch window closes at 13*60 (19:00/7:00 LT)
    // Dinner window closes at 19*60 (01:00/1:00 LT)
    const closedMealsToday = MEAL_WINDOWS.filter(
      (window) => zonedMinutes >= window.endMinutes,
    ).map((w) => w.mealType);

    // Compute a cycle key representing closed windows today: e.g. "2026-10-15:Breakfast,Lunch"
    const cycleKey = `${today}:${closedMealsToday.join(',')}`;
    const lastResetKey = window?.localStorage?.getItem(SOLD_OUT_RESET_STORAGE_KEY);

    // If meals closed today that haven't been reset yet
    if (closedMealsToday.length > 0 && lastResetKey !== cycleKey) {
      const { error: resetError } = await supabaseClient
        .from('menu')
        .update({ is_sold_out: false })
        .in('meal_type', closedMealsToday)
        .eq('is_sold_out', true);

      if (!resetError) {
        try {
          window?.localStorage?.setItem(SOLD_OUT_RESET_STORAGE_KEY, cycleKey);
        } catch {
          // ignore localStorage error
        }
      }
    }

    // Also: when day changes (e.g. overnight before breakfast starts, or before lunch),
    // ensure any leftover sold-out states from previous days are reset to available
    const lastResetDate = lastResetKey ? lastResetKey.split(':')[0] : null;
    if (lastResetDate && lastResetDate !== today) {
      await supabaseClient
        .from('menu')
        .update({ is_sold_out: false })
        .eq('is_sold_out', true);

      try {
        window?.localStorage?.setItem(SOLD_OUT_RESET_STORAGE_KEY, cycleKey);
      } catch {
        // ignore storage error
      }
    }
  } catch (err) {
    console.debug('Non-blocking sold-out reset check error:', err);
  }
}
