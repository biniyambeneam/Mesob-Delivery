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
