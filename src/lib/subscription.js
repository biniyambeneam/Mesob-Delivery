import { differenceInCalendarDays, endOfDay, isPast, parseISO, startOfDay } from 'date-fns';

function parseSubscriptionEndDate(subscriptionEndDate) {
  if (!subscriptionEndDate) {
    return null;
  }

  const parsedDate =
    subscriptionEndDate instanceof Date ? subscriptionEndDate : parseISO(subscriptionEndDate);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

export function getEffectiveSubscriptionStatus(profile) {
  const endDate = parseSubscriptionEndDate(profile?.subscription_end_date);

  if (endDate && isPast(endDate)) {
    return 'expired';
  }

  return profile?.subscription_status ?? 'expired';
}

export function isSubscriptionCurrentlyActive(profile) {
  const endDate = parseSubscriptionEndDate(profile?.subscription_end_date);

  return getEffectiveSubscriptionStatus(profile) === 'active' && Boolean(endDate) && !isPast(endDate);
}

export function getSubscriptionDaysRemaining(subscriptionEndDate, now = new Date()) {
  const endDate = parseSubscriptionEndDate(subscriptionEndDate);

  if (!endDate || isPast(endDate)) {
    return 0;
  }

  return Math.max(0, differenceInCalendarDays(endOfDay(endDate), startOfDay(now)));
}

export function getParsedSubscriptionEndDate(subscriptionEndDate) {
  return parseSubscriptionEndDate(subscriptionEndDate);
}
