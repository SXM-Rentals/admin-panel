// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Checks that the analytics screen describes the chart's
// bars the same way the server actually grouped them.
//
// WHY THIS NEEDS GUARDING: the server groups the figures into days, weeks,
// months, quarters or years, but does not say in its answer which it chose. The
// panel works it out again from the same two dates to write "one bar per week"
// under the chart. Two copies of one rule are exactly the kind of thing that
// drift apart — and an earlier copy here did, stopping at quarter while the
// server went on to year. The chart then said "quarter" under bars that were
// years. These cases pin the panel's copy to the server's behaviour.

import { describe, it, expect } from 'vitest';
import { bucketFor } from '@/lib/analytics';

describe('the chart names the grouping the server used', () => {
  it('counts a fortnight by the day', () => {
    expect(bucketFor('2026-09-01', '2026-09-14')).toBe('day');
  });

  it('counts fifty days by the week, because fifty daily bars is too many to read', () => {
    expect(bucketFor('2026-07-01', '2026-08-20')).toBe('week');
  });

  it('counts a year by the month', () => {
    expect(bucketFor('2025-09-01', '2026-08-31')).toBe('month');
  });

  it('counts five years by the quarter', () => {
    expect(bucketFor('2021-09-01', '2026-08-31')).toBe('quarter');
  });

  it('counts fifteen years by the year, as the server does, rather than stopping at quarter', () => {
    expect(bucketFor('2011-09-01', '2026-08-31')).toBe('year');
  });
});
