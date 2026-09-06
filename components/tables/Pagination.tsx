'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The bar along the bottom of every list — how many rows to
// show at a time, which rows you are looking at, and the two arrows.
//
// IT SAYS "1-10 OF 30" RATHER THAN "PAGE 1 OF 3", which is the more useful of
// the two: somebody working through a verification queue cares how many are
// left, not how many pages they are spread across. The page count is arithmetic
// they should not have to do.
//
// THE ARROWS GREY OUT RATHER THAN DISAPPEARING at the ends of the list. An arrow
// that vanishes makes the whole row shift sideways, and a control that moves as
// you use it is a control you stop trusting.

import React from 'react';
import { Icon, Text } from '@/components/ui';
import styles from './table.module.css';

const PAGE_SIZES = [10, 25, 50, 100];

export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  // Zero-based inside the code, one-based in what it says on screen.
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : page * pageSize + 1;
  const lastRow = Math.min(total, (page + 1) * pageSize);

  return (
    <div className={styles.pagination} data-print="hide">
      <div className={styles.perPage}>
        <Text variant="small" tone="ink3" as="label" htmlFor="per-page" raw>
          Items per page
        </Text>
        <select
          id="per-page"
          className={styles.perPageSelect}
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
        >
          {PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.pageInfo}>
        <Text variant="small" tone="ink2" as="span" raw className="tabular">
          {firstRow}–{lastRow} of {total.toLocaleString()}
        </Text>

        <div className={styles.pageArrows}>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 0}
            aria-label="Previous page"
          >
            <Icon name="chevron-back" size={16} />
          </button>
          <button
            type="button"
            className={styles.arrow}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount - 1}
            aria-label="Next page"
          >
            <Icon name="chevron-forward" size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default Pagination;
