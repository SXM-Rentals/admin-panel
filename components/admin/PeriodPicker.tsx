'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The row of "Today · 7 days · 30 days · Year · All" chips,
// with two date boxes behind "Custom", that says which stretch of time a screen is
// showing.
//
// ONE OF THESE RATHER THAN THREE. The Activity feed, the Action Queue and the
// Analytics charts each needed the same control, and three of them would have
// drifted into three slightly different ideas of what "this week" means — which is
// the kind of difference nobody notices until two screens disagree about the same
// day's takings. The arithmetic lives in lib/period.ts; this is only the control.
//
// CHOOSING A CHIP CLEARS THE DATES AND TYPING A DATE CLEARS THE CHIPS, so the
// screen never shows a chip lit up next to two dates that contradict it.

import React from 'react';
import { cx } from '@/lib/utils';
import { localDay, periodFor, type Period, type PeriodId } from '@/lib/period';
import { Text } from '@/components/ui';
import styles from './admin.module.css';

const CHIPS: { id: Exclude<PeriodId, 'custom'>; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 Days' },
  { id: 'month', label: '30 Days' },
  { id: 'year', label: 'Year' },
  { id: 'all', label: 'All' },
];

export function PeriodPicker({
  value,
  onChange,
  label = 'Period',
}: {
  value: Period;
  onChange: (period: Period) => void;
  label?: string;
}) {
  const today = localDay(new Date());

  const setCustom = (part: 'from' | 'to', day: string) => {
    const next: Period = { ...value, id: 'custom' };
    if (part === 'from') next.from = day || undefined;
    else next.to = day || undefined;
    onChange(next);
  };

  return (
    <div className={styles.periodRow}>
      <Text variant="caption" tone="ink3" as="span" className={styles.filterLabel} raw>
        {label.toUpperCase()}
      </Text>

      {CHIPS.map((chip) => (
        <button
          key={chip.id}
          type="button"
          className={cx(styles.rangeChip, value.id === chip.id && styles.rangeChipOn)}
          aria-pressed={value.id === chip.id}
          onClick={() => onChange(periodFor(chip.id))}
        >
          {chip.label}
        </button>
      ))}

      <span className={styles.periodDates}>
        <label className={styles.periodDate}>
          <Text variant="caption" tone="ink3" as="span" raw>
            From
          </Text>
          <input
            type="date"
            className={styles.dateInput}
            value={value.from ?? ''}
            max={value.to ?? today}
            onChange={(event) => setCustom('from', event.target.value)}
            aria-label="From date"
          />
        </label>
        <label className={styles.periodDate}>
          <Text variant="caption" tone="ink3" as="span" raw>
            To
          </Text>
          <input
            type="date"
            className={styles.dateInput}
            value={value.to ?? ''}
            min={value.from}
            max={today}
            onChange={(event) => setCustom('to', event.target.value)}
            aria-label="To date"
          />
        </label>
      </span>
    </div>
  );
}

export default PeriodPicker;
