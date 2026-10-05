// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: "Today", "this month", "between these two dates" — the
// stretch of time a screen is showing, worked out in one place so that the
// Activity feed, the Action Queue and the Analytics charts all mean the same
// thing by the same words.
//
// DAYS, NOT MOMENTS, AND LOCAL DAYS AT THAT. Somebody asking for "today" means
// the day they are having on this island, not the twenty-four hours since this
// time yesterday and not a day that starts at 20:00 because the server keeps its
// times in UTC. So a period is two plain dates — "2026-10-05" — and anything
// stamped within those days, inclusive of both ends, is in it.
//
// WHY THE COMPARISON IS DONE ON THE LOCAL DATE RATHER THAN ON THE TIMESTAMP.
// A booking made at 21:30 on the 4th here is stamped 01:30 on the 5th in UTC.
// Comparing the raw timestamp would put it in the wrong day on every screen, and
// put it there silently.

export type PeriodId = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

export type Period = {
  id: PeriodId;
  // Plain dates. Both absent means everything there is.
  from?: string;
  to?: string;
};

// What the local calendar day is for a moment, as "2026-10-05".
export function localDay(when: Date | string): string {
  const date = typeof when === 'string' ? new Date(when) : when;
  if (Number.isNaN(date.getTime())) return '';
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function shiftDays(from: Date, days: number): Date {
  const out = new Date(from);
  out.setDate(out.getDate() + days);
  return out;
}

// The dates a named period covers, worked out from today.
export function periodFor(id: Exclude<PeriodId, 'custom'>, today = new Date()): Period {
  const to = localDay(today);
  switch (id) {
    case 'today':
      return { id, from: to, to };
    // Seven days INCLUDING today, which is what somebody means by "this week" on
    // a Thursday — not "since Monday", which would be two days on a Tuesday.
    case 'week':
      return { id, from: localDay(shiftDays(today, -6)), to };
    case 'month':
      return { id, from: localDay(shiftDays(today, -29)), to };
    case 'year':
      return { id, from: localDay(shiftDays(today, -364)), to };
    case 'all':
    default:
      return { id: 'all' };
  }
}

// Whether something that happened at this moment falls inside the period.
export function isWithin(period: Period, when: string | null | undefined): boolean {
  if (period.id === 'all' || (!period.from && !period.to)) return true;
  if (!when) return false;
  const day = localDay(when);
  if (!day) return false;
  if (period.from && day < period.from) return false;
  if (period.to && day > period.to) return false;
  return true;
}

// What to call it on screen. A custom range reads as its two dates, because
// "Custom" tells somebody nothing about what they are looking at.
export function periodLabel(period: Period): string {
  switch (period.id) {
    case 'today':
      return 'today';
    case 'week':
      return 'the last 7 days';
    case 'month':
      return 'the last 30 days';
    case 'year':
      return 'the last year';
    case 'all':
      return 'all time';
    default:
      return period.from && period.to
        ? `${period.from} to ${period.to}`
        : period.from
          ? `since ${period.from}`
          : period.to
            ? `up to ${period.to}`
            : 'all time';
  }
}
