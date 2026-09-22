// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Small helpers that turn raw values into the tidy text a
// person actually reads on screen — turning 45 into "$45", turning two dates
// into "18 – 23 Sep", working out how many days a rental lasts, and so on.
// Keeping these in one place means prices and dates look the same everywhere.

import dayjs from 'dayjs';

// ---- MONEY ----
// The island uses US dollars for tourism pricing, so that is the default.
//
// CENTS ARE SHOWN WHENEVER THERE ARE ANY. This used to round every figure to the
// whole dollar, which looked tidy while the sample data was all whole dollars
// and quietly breaks against real bookings. Three days at $45 is $135, split
// $94.50 to the business and $40.50 kept — which, rounded, reads "$95 + $41 =
// $135". On the screen whose whole job is to show the split visibly adding up,
// that is a sum that visibly does not. So a whole amount still reads "$45", and
// anything with cents reads "$94.50".
//
// Rounded to the cent first, because to a computer 0.1 + 0.2 is
// 0.30000000000000004, and a figure like that must never decide whether cents
// appear.

export function money(amount: number, options?: { decimals?: boolean }): string {
  const cents = Math.round(amount * 100);
  const showDecimals = options?.decimals ?? cents % 100 !== 0;
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  })}`;
}

// "$45/day" as shown on a car card.
export function perDay(amount: number): string {
  return `${money(amount)}/day`;
}

// ---- DATES ----

// "18 Sep 2026"
export function longDate(date: string | Date): string {
  return dayjs(date).format('D MMM YYYY');
}

// "18 Sep"
export function shortDate(date: string | Date): string {
  return dayjs(date).format('D MMM');
}

// "Thu 18 Sep"
export function dayAndDate(date: string | Date): string {
  return dayjs(date).format('ddd D MMM');
}

// Turns a start and end date into one readable range, e.g. "18 – 23 Sep" when
// both fall in the same month, or "28 Sep – 3 Oct" when they don't.
export function dateRange(start: string | Date, end: string | Date): string {
  const from = dayjs(start);
  const to = dayjs(end);
  if (!from.isValid() || !to.isValid()) return '';
  if (from.isSame(to, 'month')) {
    return `${from.format('D')} – ${to.format('D MMM')}`;
  }
  return `${from.format('D MMM')} – ${to.format('D MMM')}`;
}

// How many days a rental covers. A car picked up Monday and returned Thursday
// counts as 3 days.
export function daysBetween(start: string | Date, end: string | Date): number {
  const days = dayjs(end).diff(dayjs(start), 'day');
  return days > 0 ? days : 1;
}

// "in 3 days", "today", "2 weeks ago" — used on rental cards and reviews.
export function relativeDay(date: string | Date): string {
  const target = dayjs(date).startOf('day');
  const today = dayjs().startOf('day');
  const diff = target.diff(today, 'day');

  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `In ${diff} days`;
  if (diff < -1 && diff > -7) return `${Math.abs(diff)} days ago`;
  if (diff <= -7 && diff > -30) {
    const weeks = Math.round(Math.abs(diff) / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  return longDate(date);
}

// "09:20" from a full timestamp — used in the chat and notification lists.
export function clockTime(timestamp: string | Date): string {
  return dayjs(timestamp).format('HH:mm');
}

// ---- WORDS ----

// Turns our internal codes into something readable. For example the code
// "fourByFour" becomes "4x4" and "petrol" becomes "Petrol".
export const vehicleClassLabels: Record<string, string> = {
  economy: 'Economy',
  compact: 'Compact',
  suv: 'SUV',
  van: 'Van',
  fourByFour: '4x4',
  luxury: 'Luxury',
};

export const fuelLabels: Record<string, string> = {
  petrol: 'Petrol',
  diesel: 'Diesel',
  hybrid: 'Hybrid',
  electric: 'Electric',
};

export const transmissionLabels: Record<string, string> = {
  automatic: 'Automatic',
  manual: 'Manual',
};

// Which side of the island — useful because SXM Rentals covers both.
export const sideLabels: Record<string, string> = {
  dutch: 'Dutch side',
  french: 'French side',
};

// Makes a first letter capital, for anything not covered above.
export function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Turns a name into the one or two letters shown inside a round avatar, since
// the app does not ship photographs of people.
export function initials(firstName: string, lastName?: string): string {
  const a = firstName?.trim()?.charAt(0) ?? '';
  const b = lastName?.trim()?.charAt(0) ?? '';
  return (a + b).toUpperCase() || '?';
}

// ---- TITLE CASE ----
// Turns a heading into the form used across the app: every important word
// starts with a capital letter, e.g. "Your Business Profile".
//
// The small joining words stay lowercase — "Terms of Service", not "Terms Of
// Service" — because capitalising those looks wrong to a reader even though it
// is technically "every first letter". The first and last word are always
// capitalised whatever they are.
//
// Words that are already in capitals, like SXM, ATV or ID, are left alone.

const SMALL_WORDS = new Set([
  'a', 'an', 'the',
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so',
  'as', 'at', 'by', 'in', 'of', 'off', 'on', 'per', 'to', 'up', 'via', 'with',
  'from', 'into', 'onto', 'over', 'than', 'that', 'vs',
]);

export function titleCase(input: string): string {
  if (!input) return input;

  // Split on spaces but keep any punctuation attached to its word.
  const words = input.split(/(\s+)/);
  const realWordIndexes = words
    .map((w, i) => (w.trim() ? i : -1))
    .filter((i) => i !== -1);

  const firstIndex = realWordIndexes[0];
  const lastIndex = realWordIndexes[realWordIndexes.length - 1];

  return words
    .map((word, index) => {
      if (!word.trim()) return word; // keep the spacing as it was

      // Leave acronyms and anything already shouting in capitals alone.
      if (word === word.toUpperCase() && /[A-Z]/.test(word)) return word;

      const bare = word.toLowerCase();
      const isEdgeWord = index === firstIndex || index === lastIndex;

      // Small joining words stay lowercase unless they open or close the title.
      if (!isEdgeWord && SMALL_WORDS.has(bare.replace(/[^a-z]/g, ''))) {
        return bare;
      }

      // Capitalise the first letter, leaving the rest of the word as it was so
      // names like "McKenzie" or "iPhone" are not mangled.
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join('');
}

// A date AND a time together, for the audit log and the payment ledger, where
// "which day" is not enough — two admins can touch the same account an hour
// apart and the log has to show which came first.
export function stamp(date: string | Date): string {
  const d = dayjs(date);
  return `${d.format('MMM D, YYYY')} · ${d.format('h:mm A')}`;
}
