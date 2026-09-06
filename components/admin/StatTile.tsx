'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The tiles of headline figures across the top of the
// dashboard and several other screens — a label, a large number, and a line of
// context under it.
//
// THE CONTEXT LINE IS THE POINT. "1,284 users" on its own is a number nobody can
// do anything with. "1,284 users · 1,190 verified, 94 waiting" tells somebody
// whether their morning has a job in it. Every tile in this panel is expected to
// carry that second line, which is why it is a required part of the shape rather
// than an optional extra.
//
// THE "held" VARIANT IS FOR DEPOSITS, and it deliberately looks different from
// the others: dashed border, amber figure. A security deposit is the customer's
// money being held, not the platform's being earned, and the tile showing it
// should not sit in a row of revenue tiles looking like one of them. See the
// note on PlatformSummary in types/admin.ts.

import React from 'react';
import { cx } from '@/lib/utils';
import { Icon, Text } from '@/components/ui';
import type { IconName } from '@/components/ui';
import styles from './admin.module.css';

export function StatTile({
  label,
  value,
  detail,
  icon,
  variant = 'normal',
}: {
  label: string;
  // Already formatted — "$84,320", "1,284". The tile does not do arithmetic or
  // decide how money should look; lib/format does that.
  value: string;
  detail?: React.ReactNode;
  icon?: IconName;
  // "held" is the deposits tile. See above.
  variant?: 'normal' | 'held';
}) {
  return (
    <div className={cx(styles.stat, variant === 'held' && styles.statHeld)}>
      <div className={styles.pillRow}>
        {icon ? <Icon name={icon} size={15} color="var(--ink3)" /> : null}
        <Text variant="caption" tone="ink3" as="p" raw>
          {label}
        </Text>
      </div>

      <p className={styles.statValue}>{value}</p>

      {detail ? (
        <Text variant="small" tone="ink2" as="p" raw>
          {detail}
        </Text>
      ) : null}
    </div>
  );
}

export function StatGrid({
  columns = 4,
  children,
}: {
  columns?: 3 | 4;
  children: React.ReactNode;
}) {
  return (
    <div className={cx(styles.statGrid, columns === 3 && styles.statGrid3)}>{children}</div>
  );
}

export default StatTile;
