'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The booking-volume chart on the dashboard — how many
// bookings were made in each of the last twelve weeks.
//
// IT SHOWS COUNTS, NOT MONEY, AND THAT IS A DECISION. The week's revenue is
// there too, but in the hover box rather than as a second line. Two measures on
// one picture need two different scales up the two sides, and lines drawn
// against different scales cross wherever the scales happen to make them cross —
// which looks like a finding and is nothing at all. The money has its own chart
// on the analytics screen, at its own scale, where it can be read properly.
//
// Built on the shapes in Chart.tsx; see the notes at the top of that file.

import React from 'react';
import { money } from '@/lib/format';
import { BarChart, ChartFrame } from './Chart';
import type { PlatformSummary } from '@/types';

export function RevenueChart({ trend }: { trend: PlatformSummary['bookingTrend'] }) {
  const points = trend.map((week) => ({ label: week.label, value: week.bookings }));

  return (
    <ChartFrame
      title="Booking volume"
      subtitle="Bookings made each week over the last twelve weeks"
      valueColumn="Bookings"
      points={points}
      format={(value) => value.toLocaleString()}
    >
      <BarChart
        points={points}
        color="var(--chart-2)"
        format={(value) => value.toLocaleString()}
        // The money behind the count, as context in the hover box. Context, not
        // a second axis — see the note above.
        secondary={(index) => ({
          label: 'Gross value',
          value: money(trend[index]?.gmv ?? 0),
        })}
      />
    </ChartFrame>
  );
}

export default RevenueChart;
