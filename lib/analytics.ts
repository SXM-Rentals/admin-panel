// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Works out how the analytics chart has grouped its bars —
// one per day, week, month, quarter or year — so the screen can say so
// underneath in plain words.
//
// THE SERVER DECIDES, AND THIS FILE ONLY REPEATS ITS WORKING. The SXM Rentals
// server does the grouping when it adds up the figures, and it does not say in
// its answer which grouping it chose — only the labels on each bar. So the panel
// works it out again from the same two dates, by exactly the same rule, to put
// "one bar per week" under the chart.
//
// That makes this a copy, and a copy is only worth having if it cannot drift. So
// the numbers below are the server's own, taken from
// sxm-rentals-backend/src/services/admin/analytics.ts. If the server ever
// changes how it groups, this must change with it — otherwise the chart will say
// "one bar per quarter" under bars that are years. That is the mistake an older
// version of this file made: it stopped at quarter, and the server goes on to
// year for anything longer than about ten years.
//
// WHY THIS IS NOT IN THE SAMPLE DATA ANY MORE: it used to live beside the
// made-up figures, and the analytics screen reached into that folder for it. It
// is not made-up anything — it is a rule about presentation — and it has to
// outlive the sample data, which is gone.

export type Bucket = 'day' | 'week' | 'month' | 'quarter' | 'year';

// How wide each bar is, in days. The server's own figures.
const BUCKET_DAYS: Record<Bucket, number> = {
  day: 1,
  week: 7,
  month: 30.44,
  quarter: 91.3,
  year: 365.25,
};

// ABOVE ABOUT FORTY BARS A CHART STOPS BEING READABLE — the marks get thinner
// than the gaps between them and the labels collide. The grouping is chosen by
// the answer rather than by fixed thresholds, so fifty days, eighteen months and
// five years all come out readable without anybody choosing by hand.
const MAX_BARS = 40;

export function bucketFor(startISO: string, endISO: string): Bucket {
  const days = Math.max(1, (Date.parse(endISO) - Date.parse(startISO)) / 86_400_000);

  // The narrowest grouping that keeps the bar count under the ceiling, so a
  // short range still gets all the detail it can support.
  for (const bucket of ['day', 'week', 'month', 'quarter', 'year'] as Bucket[]) {
    if (days / BUCKET_DAYS[bucket] <= MAX_BARS) return bucket;
  }

  // Longer than about forty years. A year is as coarse as the server goes.
  return 'year';
}

// What to call each grouping on screen: "one bar per week".
export const bucketNames: Record<Bucket, string> = {
  day: 'day',
  week: 'week',
  month: 'month',
  quarter: 'quarter',
  year: 'year',
};
