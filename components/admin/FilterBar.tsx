'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The row of filters above a list — status chips, a date
// range, a business to narrow to.
//
// THE FILTERS ARE CHIPS, NOT A DROPDOWN, wherever there are only a handful of
// options. A dropdown hides what the choices are and hides which one is
// currently on; a row of chips shows both without being opened. That matters
// most on the screens somebody uses all day, where "why is this list short" is
// almost always a filter they forgot was set.
//
// The one place a dropdown wins is a long list — every rental business, every
// member of staff — where twelve chips would be a wall. Both are here.

import React from 'react';
import { cx } from '@/lib/utils';
import { Chip, Text } from '@/components/ui';
import styles from './admin.module.css';

export type FilterOption<T extends string> = { value: T; label: string; count?: number };

// A row of chips: one label, then the choices, with the current one filled in.
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div className={styles.filterGroup}>
      <Text variant="caption" tone="ink3" as="span" className={styles.filterLabel} raw>
        {label}
      </Text>
      {options.map((option) => (
        <Chip
          key={option.value}
          label={option.count === undefined ? option.label : `${option.label} (${option.count})`}
          selected={value === option.value}
          onClick={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}

// A dropdown, for when there are too many choices to be chips.
export function FilterSelect<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className={styles.filterGroup}>
      <Text variant="caption" tone="ink3" as="label" htmlFor={id} className={styles.filterLabel} raw>
        {label}
      </Text>
      <select
        id={id}
        className={styles.select}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// The bar the filters sit in. Anything passed as "trailing" is pushed to the far
// end — usually a count of what the filters left, or an export button.
export function FilterBar({
  children,
  trailing,
  className,
}: {
  children: React.ReactNode;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx(styles.filterBar, className)} data-print="hide">
      {children}
      {trailing ? <div className={styles.filterSpacer}>{trailing}</div> : null}
    </div>
  );
}

export default FilterBar;
