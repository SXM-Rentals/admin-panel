// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Three small building blocks used on nearly every page —
// the white panel that holds content (Card), the small heading that sits above a
// group of them (SectionHeader), and the thin line that separates one row from
// the next (Divider).

import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';
import { titleCase } from '@/lib/format';
import { Text } from './Text';
import styles from './Card.module.css';

export type CardProps = {
  children?: React.ReactNode;
  // Roomier inside, for a card that is the main thing on a page.
  padded?: boolean;
  // No padding at all, for a card holding a photo or a list that should reach
  // its own edges.
  flush?: boolean;
  // Makes the whole card clickable. Give it either a destination or an action —
  // a destination becomes a real link so it can be opened in a new tab.
  href?: string;
  onClick?: () => void;
  className?: string;
  style?: React.CSSProperties;
  as?: React.ElementType;
  id?: string;
};

export function Card({
  children,
  padded = false,
  flush = false,
  href,
  onClick,
  className,
  style,
  as,
  id,
}: CardProps) {
  const classes = cx(
    styles.card,
    padded && styles.padded,
    flush && styles.flush,
    (href || onClick) && styles.interactive,
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes} style={style} id={id}>
        {children}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" className={classes} style={style} onClick={onClick} id={id}>
        {children}
      </button>
    );
  }

  // A plain card is not interactive, so it is an ordinary block of the page.
  const Tag = as ?? 'div';
  return (
    <Tag className={classes} style={style} id={id}>
      {children}
    </Tag>
  );
}

export type SectionHeaderProps = {
  title: string;
  // A quieter line underneath explaining the group.
  subtitle?: string;
  // The "See All" link on the right. Give it a destination or an action.
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  // Which heading level this is in the page's structure. Getting this right
  // matters for anyone navigating by headings with a screen reader.
  as?: 'h1' | 'h2' | 'h3';
  className?: string;
};

export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionHref,
  onAction,
  as = 'h2',
  className,
}: SectionHeaderProps) {
  return (
    <div className={cx(styles.sectionHeader, className)}>
      <div className={styles.sectionHeaderText}>
        <Text variant="h3" as={as}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="ink2">
            {subtitle}
          </Text>
        ) : null}
      </div>

      {actionLabel && actionHref ? (
        <Link href={actionHref} className={styles.sectionAction}>
          {titleCase(actionLabel)}
        </Link>
      ) : actionLabel && onAction ? (
        <button type="button" className={styles.sectionAction} onClick={onAction}>
          {titleCase(actionLabel)}
        </button>
      ) : null}
    </div>
  );
}

// A thin line between rows. Written as a real <hr> so that software reading the
// page aloud understands it as a break rather than announcing a stray box.
export function Divider({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return <hr className={cx(styles.divider, className)} style={style} />;
}

export default Card;
