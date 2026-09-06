// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The small round buttons that hold a single picture and no
// words — the back arrow, the close cross, the heart on a car, the light/dark
// switch in the top bar.
//
// EVERY ONE OF THESE MUST HAVE A LABEL. A button showing only a picture is
// completely silent to anyone using a screen reader, and it is the single most
// common way a site becomes unusable without a mouse. The label is required
// rather than optional here so it cannot be forgotten, and it should describe
// what the button DOES ("Close this window"), not what it looks like ("cross").

import React from 'react';
import Link from 'next/link';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';
import styles from './IconButton.module.css';

export type IconButtonProps = {
  icon: IconName;
  // What this button does, in words. Not shown on screen — read aloud by screen
  // readers and shown as a tooltip on hover.
  label: string;
  onClick?: () => void;
  href?: string;
  variant?: 'default' | 'plain' | 'filled' | 'onPhoto';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  // Marks it as switched on — a saved car's heart, for example.
  active?: boolean;
  // Shows a small dot in the corner, for unread messages or notifications.
  badge?: boolean;
  iconSize?: number;
  className?: string;
  style?: React.CSSProperties;
  // Tells screen readers that this button opens or closes something, and which
  // state it is in right now. Used by the account and language menus.
  expanded?: boolean;
};

const ICON_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 17, md: 20, lg: 24 };

export function IconButton({
  icon,
  label,
  onClick,
  href,
  variant = 'default',
  size = 'md',
  disabled = false,
  active = false,
  badge = false,
  iconSize,
  className,
  style,
  expanded,
}: IconButtonProps) {
  const classes = cx(
    styles.iconButton,
    variant !== 'default' && styles[variant],
    size !== 'md' && styles[size],
    active && styles.active,
    className,
  );

  const graphic = <Icon name={icon} size={iconSize ?? ICON_SIZE[size]} />;

  const content = (
    <>
      {graphic}
      {badge ? <span className={styles.badge} aria-hidden="true" /> : null}
    </>
  );

  if (href && !disabled) {
    return (
      <span className={styles.wrapper} style={style}>
        <Link href={href} className={classes} aria-label={label} title={label}>
          {content}
        </Link>
      </span>
    );
  }

  return (
    <span className={styles.wrapper} style={style}>
      <button
        type="button"
        className={classes}
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        title={label}
        aria-pressed={active || undefined}
        aria-expanded={expanded}
      >
        {content}
      </button>
    </span>
  );
}

export default IconButton;
