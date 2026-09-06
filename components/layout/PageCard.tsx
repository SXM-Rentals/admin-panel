'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The large panel that every screen puts its content
// inside, and the heading that sits above it.
//
// WHY IT IS A SHARED PIECE RATHER THAN COPIED ONTO EACH SCREEN: sixteen screens
// all want the same thing — a title, a line saying what the screen is for, a
// search box for the list inside, and a couple of buttons. Writing that out
// sixteen times guarantees sixteen slightly different versions of it, and the
// drift shows: one screen with the search 4px lower than the next is exactly the
// sort of thing that makes an internal tool feel unfinished.

import React from 'react';
import { cx } from '@/lib/utils';
import { Icon, Text } from '@/components/ui';
import styles from './shell.module.css';

// ---- THE HEADING ABOVE THE CARD ----
// What this screen is, and in one sentence what it is for. The sentence is not
// decoration: this panel has sixteen sections and several of them do things that
// are not obvious from a one-word name.
export function PageHead({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className={styles.pageHead}>
      <div className={styles.pageHeadText}>
        <Text variant="h1" as="h1">
          {title}
        </Text>
        {description ? (
          <Text variant="body" tone="ink2" as="p" raw>
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className={styles.pageHeadActions}>{actions}</div> : null}
    </div>
  );
}

// ---- THE CARD ITSELF ----
export function PageCard({
  title,
  subtitle,
  search,
  onSearchChange,
  searchPlaceholder = 'Search',
  actions,
  flush = false,
  children,
}: {
  title?: string;
  subtitle?: string;
  // Passing a string here turns the search box on. Leaving it undefined leaves
  // it off — several screens are not lists and have nothing to search.
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  actions?: React.ReactNode;
  // Set on a card whose body is a table, so the table's dividing lines can reach
  // the edges of the card instead of stopping short of them.
  flush?: boolean;
  children: React.ReactNode;
}) {
  const hasHead = Boolean(title || onSearchChange || actions);

  return (
    <section className={styles.card} data-print="keep">
      {hasHead ? (
        <div className={styles.cardHead}>
          {title ? (
            <div className={styles.cardTitle}>
              <Text variant="h3" as="h2">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="small" tone="ink3" as="p" raw>
                  {subtitle}
                </Text>
              ) : null}
            </div>
          ) : null}

          {onSearchChange ? (
            <div className={styles.cardSearch}>
              <div className={styles.searchBox}>
                <Icon name="search" size={16} color="var(--ink3)" />
                <input
                  className={styles.searchInput}
                  type="search"
                  value={search ?? ''}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchPlaceholder}
                />
              </div>
            </div>
          ) : null}

          {actions ? <div className={styles.cardActions}>{actions}</div> : null}
        </div>
      ) : null}

      {/* With no header above it, the body supplies its own top padding —
          otherwise the content sits against the edge of the card. */}
      <div
        className={cx(
          styles.cardBody,
          flush && styles.cardBodyFlush,
          !hasHead && styles.cardBodyOnly,
        )}
      >
        {children}
      </div>
    </section>
  );
}

export default PageCard;
