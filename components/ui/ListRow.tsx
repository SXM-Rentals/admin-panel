// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The rows used in menus and settings lists — a small
// picture on the left, wording in the middle, and usually an arrow on the right
// showing that the row leads somewhere.
//
// A row that leads to another page is written out as a real link, so it can be
// opened in a new tab and its address copied, exactly like any other link on the
// web. A row that performs an action is a button. Nothing here fakes either.

import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import styles from './ListRow.module.css';

export type ListRowProps = {
  title: string;
  subtitle?: string;
  // The small picture on the left.
  icon?: IconName;
  // Anything to show on the right — a value, a switch, a status label. When
  // nothing is given and the row leads somewhere, an arrow appears instead.
  trailing?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  // Colours the icon red, for "Sign out" and "Delete account".
  danger?: boolean;
  // Hides the arrow on a row that leads somewhere but should read as plain
  // information rather than an invitation.
  hideChevron?: boolean;
  className?: string;
};

export function ListRow({
  title,
  subtitle,
  icon,
  trailing,
  href,
  onClick,
  disabled = false,
  danger = false,
  hideChevron = false,
  className,
}: ListRowProps) {
  const isInteractive = Boolean((href || onClick) && !disabled);

  const content = (
    <>
      {icon ? (
        <span className={cx(styles.leading, danger && styles.leadingDanger)}>
          <Icon name={icon} size={19} />
        </span>
      ) : null}

      <span className={styles.body}>
        <Text variant="label" as="span" tone={danger ? 'danger' : 'ink'} className={styles.title}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="small" tone="ink2" as="span" className={styles.subtitle}>
            {subtitle}
          </Text>
        ) : null}
      </span>

      <span className={styles.trailing}>
        {trailing}
        {isInteractive && !hideChevron && !trailing ? (
          <Icon name="chevron-forward" size={18} />
        ) : null}
      </span>
    </>
  );

  const classes = cx(
    styles.row,
    isInteractive && styles.interactive,
    disabled && styles.disabled,
    className,
  );

  if (href && !disabled) {
    return (
      <Link href={href} className={classes}>
        {content}
      </Link>
    );
  }

  if (onClick && !disabled) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    );
  }

  return <div className={classes}>{content}</div>;
}

// Several rows inside one card, with hairlines drawn between them.
export function ListGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.group, className)}>{children}</div>;
}

export default ListRow;
