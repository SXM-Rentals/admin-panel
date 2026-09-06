'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The list that nine screens in this panel are built from —
// customers, businesses, vehicles, bookings, payments, refunds, deposits,
// promotions and the audit log. Each screen hands it a set of columns and a set
// of rows and gets back a sortable, paged table.
//
// WHY ONE TABLE RATHER THAN NINE: they are the same thing. Nine hand-built
// tables would be nine sets of paging controls that behave almost the same, and
// the "almost" is where the bugs live — the one screen where the last page is
// empty, the one where sorting forgets which page you were on. Written once, it
// either works everywhere or is broken everywhere, and broken everywhere gets
// noticed and fixed.
//
// IT IS A REAL <table>. See the note in table.module.css: without proper
// mark-up, a screen reader reads out "Verified" with no idea which column it
// came from.

import React, { useMemo, useState } from 'react';
import { cx } from '@/lib/utils';
import { Icon, Text } from '@/components/ui';
import { Pagination } from './Pagination';
import styles from './table.module.css';

export type Column<Row> = {
  // Used as the React key and as the sort field name.
  id: string;
  header: string;
  // What to draw in the cell. Given the whole row, so a cell can show two things
  // — a name and the email under it — rather than one value.
  cell: (row: Row) => React.ReactNode;
  // What to sort by, when this column is sortable. Returning a number sorts
  // numerically; returning text sorts alphabetically.
  sortValue?: (row: Row) => string | number;
  // Right-aligned and tabular. For money and counts.
  numeric?: boolean;
  width?: string;
};

export type DataTableProps<Row> = {
  rows: Row[];
  columns: Column<Row>[];
  // How to identify a row. Used as its key and as its selection id.
  rowKey: (row: Row) => string;
  // Dims a row that is closed, cancelled or expired without hiding it.
  rowMuted?: (row: Row) => boolean;
  // The Modify / View buttons at the end of each row.
  rowActions?: (row: Row) => React.ReactNode;
  // Which column to sort by when the screen first opens.
  initialSort?: { columnId: string; direction: 'asc' | 'desc' };
  // What to say when there is nothing. Worth writing properly per screen: "No
  // refunds are waiting" is a good morning, and should read like one rather than
  // like a failure.
  emptyTitle?: string;
  emptyMessage?: string;
  loading?: boolean;
  pageSize?: number;
  // Off for short fixed lists — the four reward tiers do not need paging.
  paginate?: boolean;
};

export function DataTable<Row>({
  rows,
  columns,
  rowKey,
  rowMuted,
  rowActions,
  initialSort,
  emptyTitle = 'Nothing here',
  emptyMessage,
  loading = false,
  pageSize: initialPageSize = 10,
  paginate = true,
}: DataTableProps<Row>) {
  const [sort, setSort] = useState(initialSort);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(initialPageSize);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.id === sort.columnId);
    if (!column?.sortValue) return rows;

    // Copied before sorting. Sorting in place would reorder the array the screen
    // above still holds, which is the sort of thing that works until two screens
    // share a list.
    return [...rows].sort((a, b) => {
      const av = column.sortValue!(a);
      const bv = column.sortValue!(b);
      const result = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv));
      return sort.direction === 'asc' ? result : -result;
    });
  }, [rows, columns, sort]);

  // Paging. The page is clamped rather than trusted: filtering a list down from
  // thirty rows to four while sitting on page three would otherwise show an
  // empty table with no way to tell that anything matched.
  const pageCount = paginate ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visible = paginate
    ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize)
    : sorted;

  const toggleSort = (columnId: string) => {
    setPage(0);
    setSort((current) =>
      current?.columnId === columnId
        ? { columnId, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { columnId, direction: 'asc' },
    );
  };

  if (loading) {
    return (
      <div className={styles.loadingRows} aria-busy="true" aria-label="Loading">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className={styles.loadingRow} />
        ))}
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className={styles.empty}>
        {/* "raw" because these are sentences — "No refunds are waiting" — and
            the automatic Title Case applied to headings would render that as
            "No Refunds Are Waiting", which reads like a label rather than the
            good news it usually is. */}
        <Text variant="h3" as="p" tone="ink2" raw>
          {emptyTitle}
        </Text>
        {emptyMessage ? (
          <Text variant="small" tone="ink3" as="p" raw>
            {emptyMessage}
          </Text>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className={cx(styles.wrap, 'thinScroll')}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.columnId === column.id;
                return (
                  <th
                    key={column.id}
                    style={{ width: column.width, textAlign: column.numeric ? 'right' : undefined }}
                    // Tells a screen reader which way this column is currently
                    // sorted, rather than leaving the arrow as the only clue.
                    aria-sort={
                      active ? (sort!.direction === 'asc' ? 'ascending' : 'descending') : undefined
                    }
                  >
                    {column.sortValue ? (
                      <button
                        type="button"
                        className={cx(styles.sortButton, active && styles.sortActive)}
                        onClick={() => toggleSort(column.id)}
                      >
                        {column.header}
                        <Icon
                          name={active && sort!.direction === 'desc' ? 'chevron-down' : 'chevron-up'}
                          size={12}
                        />
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
              {rowActions ? (
                <th style={{ textAlign: 'right' }}>
                  {/* The actions column has no useful heading, but an empty one
                      would be announced as a blank column. */}
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>

          <tbody>
            {visible.map((row) => (
              <tr key={rowKey(row)} className={cx(rowMuted?.(row) && styles.rowMuted)}>
                {columns.map((column) => (
                  <td key={column.id} className={cx(column.numeric && styles.numeric)}>
                    {column.cell(row)}
                  </td>
                ))}
                {rowActions ? (
                  <td>
                    <div className={styles.rowActions}>{rowActions(row)}</div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {paginate ? (
        <Pagination
          page={safePage}
          pageSize={pageSize}
          total={sorted.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(0);
          }}
        />
      ) : null}
    </>
  );
}

// ---- A TWO-LINE CELL ----
// A main value with a quieter line under it. Used often enough across the nine
// screens to be worth naming rather than re-writing as a div with two spans.
export function CellStack({ title, detail }: { title: React.ReactNode; detail?: React.ReactNode }) {
  return (
    <span className={styles.stack}>
      <Text variant="label" as="span" raw>
        {title}
      </Text>
      {detail ? (
        <Text variant="small" tone="ink3" as="span" raw>
          {detail}
        </Text>
      ) : null}
    </span>
  );
}

export default DataTable;
