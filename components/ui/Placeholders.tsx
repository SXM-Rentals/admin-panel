// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The stand-in blocks used wherever a real photograph will
// eventually go, and the round initials shown in place of a profile picture.
//
// WHY THERE ARE NO PHOTOGRAPHS: none have been supplied yet. Rather than leave
// gaps or show broken-image icons, every car draws a deliberate grey block of
// exactly the right proportions. That way the page already has its final shape,
// and adding real photographs later changes what is inside the block without
// moving anything else around it.

import React from 'react';
import { cx } from '@/lib/utils';
import { Icon, type IconName } from './Icon';
import { initials as toInitials } from '@/lib/format';
import styles from './Placeholders.module.css';

export function PhotoPlaceholder({
  // The shape of the block. Cars use "wide" in lists and the default 4:3 on
  // their own page.
  shape = 'default',
  icon = 'car-outline',
  // A short caption inside the block, e.g. the car's name.
  label,
  iconSize = 34,
  className,
  style,
}: {
  shape?: 'default' | 'wide' | 'square' | 'tall' | 'fill';
  icon?: IconName;
  label?: string;
  iconSize?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cx(styles.photo, shape !== 'default' && styles[shape], className)}
      style={style}
      // Decorative. There is no photograph here to describe, and announcing
      // "placeholder" on every car in a list would be pure noise.
      aria-hidden="true"
    >
      <div className={styles.photoInner}>
        <Icon name={icon} size={iconSize} />
        {label ? <span className="t-caption">{label}</span> : null}
      </div>
    </div>
  );
}

// ---- AVATAR ----
// A circle holding someone's initials.
export function Avatar({
  firstName,
  lastName,
  // Use this instead when all that is available is a display name such as
  // "Benjamin J." — which is all a rental business is ever given.
  name,
  size = 40,
  tone = 'default',
  className,
}: {
  firstName?: string;
  lastName?: string;
  name?: string;
  size?: number;
  tone?: 'default' | 'brand' | 'primary';
  className?: string;
}) {
  const letters = name
    ? toInitials(...(name.split(' ') as [string, string?]))
    : toInitials(firstName ?? '', lastName);

  return (
    <span
      className={cx(
        styles.avatar,
        tone === 'brand' && styles.avatarBrand,
        tone === 'primary' && styles.avatarPrimary,
        className,
      )}
      style={{
        width: size,
        height: size,
        // Initials scale with the circle so a large avatar is not left with
        // tiny letters floating in the middle of it.
        fontSize: Math.round(size * 0.38),
      }}
      aria-hidden="true"
    >
      {letters}
    </span>
  );
}
