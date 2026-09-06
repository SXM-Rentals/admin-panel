// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Everything that tells someone the state of things — the
// small coloured status labels, the "Coming Soon" treatment, the grey blocks
// shown while information loads, the message shown when a list is empty, and
// the rating stars.

import React from 'react';
import { cx } from '@/lib/utils';
import { Text } from './Text';
import { Icon, type IconName } from './Icon';
import { Button } from './Button';
import styles from './Feedback.module.css';

// ---- MOCK BANNER ----
// Says plainly that the site is running on sample data. It stays on screen until
// there is a real backend, because a demo that looks live is how somebody ends
// up believing they have booked a car that does not exist.
export function MockBanner({ className }: { className?: string }) {
  return (
    <div className={cx(styles.mockBanner, className)} data-print="hide">
      <Icon name="information-circle-outline" size={16} />
      <Text variant="small" as="span" style={{ color: 'inherit' }}>
        Demo mode — sample data, not connected to a backend.
      </Text>
    </div>
  );
}

// ---- STATUS PILL ----
// The small coloured label saying "Upcoming", "Deposit Held", "Paid".
export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'brand';

export function StatusPill({
  label,
  tone = 'neutral',
  dot = true,
  className,
}: {
  // React.ReactNode so a server-built page can pass <T k="…" /> — see
  // components/i18n/T.tsx.
  label: React.ReactNode;
  tone?: StatusTone;
  dot?: boolean;
  className?: string;
}) {
  const toneClass = {
    neutral: styles.pillNeutral,
    success: styles.pillSuccess,
    warning: styles.pillWarning,
    danger: styles.pillDanger,
    brand: styles.pillBrand,
  }[tone];

  return (
    <span className={cx(styles.pill, toneClass, className)}>
      {dot ? <span className={styles.pillDot} aria-hidden="true" /> : null}
      {label}
    </span>
  );
}

// ---- COMING SOON ----
export function ComingSoonBadge({
  label = 'Coming soon',
  className,
}: {
  label?: string;
  className?: string;
}) {
  return <span className={cx(styles.comingSoonBadge, className)}>{label}</span>;
}

// The full block, used where a whole section is not built yet. It always
// explains what is coming rather than showing an empty space, because a blank
// area reads as something that failed to load.
export function ComingSoon({
  title,
  body,
  icon = 'construct-outline',
  className,
}: {
  title: string;
  body?: string;
  icon?: IconName;
  className?: string;
}) {
  return (
    <div className={cx(styles.comingSoon, className)}>
      <span className={styles.comingSoonIcon}>
        <Icon name={icon} size={26} />
      </span>

      <Text variant="h3">{title}</Text>

      {body ? (
        <Text variant="body" tone="ink2" className={styles.emptyBody}>
          {body}
        </Text>
      ) : null}

      <ComingSoonBadge />
    </div>
  );
}

// ---- EMPTY STATE ----
// Shown when a list has nothing in it. It always says what would appear here and
// how to make it appear — "No saved cars yet. Tap the heart on any car to save
// it" — rather than a bare "No results", which tells nobody anything.
export function EmptyState({
  title,
  body,
  icon = 'search',
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  // React.ReactNode rather than string, so a page built on the server can pass
  // <T k="…" /> here and have the words looked up in the reader's language.
  // See components/i18n/T.tsx for why that is necessary.
  title: React.ReactNode;
  body?: React.ReactNode;
  icon?: IconName;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={cx(styles.emptyState, className)}>
      <span className={styles.emptyIcon}>
        <Icon name={icon} size={28} />
      </span>

      <Text variant="h3">{title}</Text>

      {body ? (
        <Text variant="body" tone="ink2" className={styles.emptyBody}>
          {body}
        </Text>
      ) : null}

      {actionLabel && (actionHref || onAction) ? (
        <Button
          label={actionLabel}
          href={actionHref}
          onClick={onAction}
          variant="secondary"
          size="sm"
        />
      ) : null}
    </div>
  );
}

// ---- SKELETON ----
// A soft grey block in the shape of what is loading, so the page holds its final
// layout instead of jumping about as things arrive.
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  className,
  style,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cx(styles.skeleton, className)}
      style={{ width, height, borderRadius: radius, ...style }}
      // Hidden from screen readers: announcing "loading" five times over for
      // five grey blocks is noise. The page says it is loading once, elsewhere.
      aria-hidden="true"
    />
  );
}

// ---- STARS ----
// The row of stars next to a rating. The number is always written out beside
// them, because counting five small shapes is slower and less certain than
// reading "4.8".
export function Stars({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span className={styles.starRow} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((position) => {
        const name =
          rating >= position ? 'star' : rating >= position - 0.5 ? 'star-half' : 'star-outline';
        return <Icon key={position} name={name} size={size} />;
      })}
    </span>
  );
}

// The stars plus the number and, optionally, how many reviews it is based on.
export function StarRow({
  rating,
  reviewCount,
  size = 15,
  showStars = true,
  className,
}: {
  rating: number;
  reviewCount?: number;
  size?: number;
  showStars?: boolean;
  className?: string;
}) {
  return (
    <span className={cx(styles.ratingRow, className)}>
      {showStars ? (
        <Stars rating={rating} size={size} />
      ) : (
        <Icon name="star" size={size} color="var(--star)" />
      )}

      {/* Written out in full for anyone listening to the page, since a row of
          star shapes conveys nothing when read aloud. */}
      <span className="sr-only">
        {`Rated ${rating.toFixed(1)} out of 5`}
        {reviewCount != null ? ` from ${reviewCount} reviews` : ''}
      </span>

      <Text variant="small" as="span" aria-hidden="true">
        {rating.toFixed(1)}
      </Text>

      {reviewCount != null ? (
        <Text variant="small" tone="ink3" as="span" aria-hidden="true">
          {`(${reviewCount})`}
        </Text>
      ) : null}
    </span>
  );
}
